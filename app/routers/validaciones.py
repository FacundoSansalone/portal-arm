from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import (
    Certificacion, EstadoCertificacion, AcuerdoARM, EstadoAcuerdo,
    Validacion, ResultadoValidacion, Pais, Operador, RolUsuario, Usuario
)
from app.schemas import ValidacionRequest, ValidacionOut, ValidacionListOut
from app.auth import get_current_user, require_rol
from app.services import rabbitmq

router = APIRouter(prefix="/api/v1/validaciones", tags=["validaciones"])


async def _operador_id_de(db: AsyncSession, current_user: Usuario) -> Optional[int]:
    result = await db.execute(select(Operador.id).where(Operador.usuario_id == current_user.id))
    return result.scalar_one_or_none()


async def procesar_validacion(
    db: AsyncSession, numero_oec: str, pais_solicitante_iso: str, solicitado_por: str,
) -> Validacion:
    """Núcleo de la funcionalidad 'Validación ARM': dado un número OEC y el país
    que consulta, determina si corresponde reconocer la certificación, persiste
    el resultado y publica el evento en RabbitMQ para que el Consumer lo procese
    (y, si corresponde, lo reenvíe a la aduana externa)."""
    numero_oec = (numero_oec or "").strip()
    pais_solicitante_iso = (pais_solicitante_iso or "").strip().upper()
    if not numero_oec or not pais_solicitante_iso:
        raise HTTPException(status_code=422, detail="numero_oec y pais_solicitante son requeridos")

    certificacion = (await db.execute(
        select(Certificacion)
        .options(selectinload(Certificacion.operador).selectinload(Operador.pais))
        .where(Certificacion.numero_oec == numero_oec)
    )).scalar_one_or_none()

    operador_id = None
    acuerdo_id = None
    beneficios = None

    if not certificacion:
        resultado = ResultadoValidacion.RECHAZADA
        detalle = f"No existe ningún operador con la certificación OEC '{numero_oec}' en el sistema."
    else:
        operador = certificacion.operador
        operador_id = operador.id
        pais_solicitante = (await db.execute(
            select(Pais).where(Pais.codigo_iso == pais_solicitante_iso)
        )).scalar_one_or_none()

        if not pais_solicitante:
            resultado = ResultadoValidacion.SIN_ACUERDO
            detalle = (
                f"El país solicitante '{pais_solicitante_iso}' no está registrado en el sistema, "
                f"por lo que no existe ningún acuerdo asociado."
            )
        else:
            acuerdo = (await db.execute(
                select(AcuerdoARM).where(
                    AcuerdoARM.estado == EstadoAcuerdo.activo,
                    or_(
                        (AcuerdoARM.pais_origen_id == operador.pais_id) & (AcuerdoARM.pais_destino_id == pais_solicitante.id),
                        (AcuerdoARM.pais_origen_id == pais_solicitante.id) & (AcuerdoARM.pais_destino_id == operador.pais_id),
                    )
                )
            )).scalar_one_or_none()

            cert_vencida_por_fecha = (
                certificacion.fecha_vencimiento is not None
                and certificacion.fecha_vencimiento < datetime.utcnow()
            )

            if not acuerdo:
                resultado = ResultadoValidacion.SIN_ACUERDO
                detalle = (
                    f"No existe un Acuerdo de Reconocimiento Mutuo activo entre "
                    f"{operador.pais.nombre} (país del operador) y {pais_solicitante.nombre}."
                )
            elif certificacion.estado == EstadoCertificacion.vencida or cert_vencida_por_fecha:
                resultado = ResultadoValidacion.CERTIFICACION_VENCIDA
                acuerdo_id = acuerdo.id
                detalle = "La certificación OEC del operador está vencida."
            elif certificacion.estado == EstadoCertificacion.en_proceso:
                resultado = ResultadoValidacion.RECHAZADA
                acuerdo_id = acuerdo.id
                detalle = "La certificación OEC todavía está en proceso de aprobación."
            elif certificacion.estado == EstadoCertificacion.rechazada:
                resultado = ResultadoValidacion.RECHAZADA
                acuerdo_id = acuerdo.id
                detalle = "La certificación OEC del operador fue rechazada."
            else:
                resultado = ResultadoValidacion.APROBADA
                acuerdo_id = acuerdo.id
                detalle = "Certificación OEC vigente y acuerdo ARM activo entre los países."
                beneficios = "Acceso a carril prioritario, reducción de inspecciones físicas"

    val = Validacion(
        operador_id=operador_id,
        acuerdo_id=acuerdo_id,
        resultado=resultado,
        beneficios=beneficios,
        numero_oec_consultado=numero_oec,
        pais_solicitante=pais_solicitante_iso,
        solicitado_por=solicitado_por,
    )
    db.add(val)
    await db.commit()
    await db.refresh(val)

    # Comunicación asincrónica: se publica el evento en RabbitMQ (Topic Exchange)
    # en lugar de notificar directamente, para no acoplar la respuesta de la API
    # al tiempo que tarde el Consumer en avisar a la aduana externa.
    await rabbitmq.publish("validacion.registrada", {
        "validacion_id": val.id,
        "numero_oec": numero_oec,
        "pais_solicitante": pais_solicitante_iso,
        "resultado": resultado.value,
    })

    val.detalle = detalle
    return val


@router.post("/", response_model=ValidacionOut, status_code=201)
async def crear_validacion(
    body: ValidacionRequest,
    db: AsyncSession = Depends(get_db),
    # Validar es atribución de Aduana (o admin): un operador no debe poder
    # consultar el estado de certificación de OEC ajenos.
    current_user: Usuario = Depends(require_rol(RolUsuario.aduana, RolUsuario.admin)),
):
    return await procesar_validacion(db, body.numero_oec, body.pais_solicitante, current_user.email)


@router.get("/", response_model=ValidacionListOut)
async def listar_validaciones(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    resultado: Optional[ResultadoValidacion] = None,
):
    filtros = []
    # Un operador solo puede ver sus propias validaciones
    if current_user.rol == RolUsuario.operador:
        operador_id = await _operador_id_de(db, current_user)
        if operador_id is None:
            return ValidacionListOut(total=0, items=[])
        filtros.append(Validacion.operador_id == operador_id)

    if resultado is not None:
        filtros.append(Validacion.resultado == resultado)

    total_stmt = select(func.count(Validacion.id))
    if filtros:
        total_stmt = total_stmt.where(*filtros)
    total = (await db.execute(total_stmt)).scalar_one()

    stmt = select(Validacion).order_by(Validacion.created_at.desc()).limit(limit).offset(offset)
    if filtros:
        stmt = stmt.where(*filtros)
    items = (await db.execute(stmt)).scalars().all()

    return ValidacionListOut(total=total, items=items)
