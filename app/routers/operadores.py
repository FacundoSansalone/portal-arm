from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Operador, Certificacion, EstadoCertificacion, RolUsuario, Usuario, Pais
from app.schemas import OperadorCreate, OperadorOut, CertificacionCreate, CertificacionOut, DashboardOut
from app.auth import get_current_user, require_rol

router = APIRouter(prefix="/api/v1/operadores", tags=["operadores"])


@router.post("/", response_model=OperadorOut, status_code=201)
async def crear_operador(
    body: OperadorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    existing_for_user = await db.execute(select(Operador).where(Operador.usuario_id == current_user.id))
    if existing_for_user.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Tu usuario ya tiene un operador asociado")

    pais = await db.execute(select(Pais.id).where(Pais.id == body.pais_id))
    if pais.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail=f"No existe el país (id {body.pais_id})")

    result = await db.execute(select(Operador).where(Operador.rut == body.rut))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un operador con ese RUT")

    op = Operador(
        usuario_id=current_user.id,
        pais_id=body.pais_id,
        razon_social=body.razon_social,
        rut=body.rut,
        contacto_email=body.contacto_email,
    )
    db.add(op)
    await db.commit()
    await db.refresh(op)

    result = await db.execute(
        select(Operador).options(selectinload(Operador.pais)).where(Operador.id == op.id)
    )
    return result.scalar_one()


@router.get("/mi-dashboard", response_model=DashboardOut)
async def mi_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(Operador)
        .options(selectinload(Operador.pais), selectinload(Operador.certificaciones))
        .where(Operador.usuario_id == current_user.id)
    )
    operador = result.scalar_one_or_none()
    if not operador:
        return DashboardOut(operador=None, certificacion=None)

    ultima_cert = None
    if operador.certificaciones:
        ultima_cert = sorted(
            operador.certificaciones,
            key=lambda c: (c.fecha_emision or datetime.min, c.id),
            reverse=True,
        )[0]

    return DashboardOut(operador=operador, certificacion=ultima_cert)


@router.post("/{operador_id}/certificaciones", response_model=CertificacionOut, status_code=201)
async def crear_certificacion(
    operador_id: int,
    body: CertificacionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Operador).where(Operador.id == operador_id))
    operador = result.scalar_one_or_none()
    if not operador:
        raise HTTPException(status_code=404, detail="Operador no encontrado")

    if operador.usuario_id != current_user.id and current_user.rol != RolUsuario.admin:
        raise HTTPException(status_code=403, detail="No tenés permiso")

    numero_oec = (body.numero_oec or "").strip()
    if not numero_oec:
        raise HTTPException(status_code=422, detail="El número OEC es requerido")

    existing = await db.execute(select(Certificacion).where(Certificacion.numero_oec == numero_oec))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe una certificación con ese número OEC")

    cert = Certificacion(
        operador_id=operador_id,
        numero_oec=numero_oec,
        estado=EstadoCertificacion.en_proceso,
        fecha_vencimiento=body.fecha_vencimiento,
    )
    db.add(cert)
    await db.commit()
    await db.refresh(cert)
    return cert


@router.get("/", response_model=list[OperadorOut])
async def listar_operadores(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.admin)),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(Operador).options(selectinload(Operador.pais))
        .order_by(Operador.id).limit(limit).offset(offset)
    )
    return result.scalars().all()
