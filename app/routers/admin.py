from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import (
    Certificacion, EstadoCertificacion, Pais, AcuerdoARM, EstadoAcuerdo, RolUsuario, Operador, Usuario,
)
from app.schemas import (
    CertificacionConOperador, AcuerdoARMCreate, AcuerdoARMOut, PaisOut, PaisCreate, AcuerdoEstadoUpdate,
)
from app.auth import require_rol
from app.services import rabbitmq

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# --------------------------- Certificaciones (workflow) ---------------------------

@router.get("/certificaciones-pendientes", response_model=list[CertificacionConOperador])
async def listar_pendientes(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.admin)),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(Certificacion)
        .options(selectinload(Certificacion.operador).selectinload(Operador.pais))
        .where(Certificacion.estado == EstadoCertificacion.en_proceso)
        .order_by(Certificacion.id).limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post("/certificaciones/{cert_id}/aprobar", response_model=CertificacionConOperador)
async def aprobar_certificacion(
    cert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.admin)),
):
    result = await db.execute(
        select(Certificacion)
        .options(selectinload(Certificacion.operador).selectinload(Operador.pais))
        .where(Certificacion.id == cert_id)
    )
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificación no encontrada")
    if cert.estado != EstadoCertificacion.en_proceso:
        raise HTTPException(status_code=409, detail="Solo se pueden aprobar certificaciones en proceso")

    cert.estado = EstadoCertificacion.vigente
    cert.fecha_emision = datetime.utcnow()
    if not cert.fecha_vencimiento:
        cert.fecha_vencimiento = datetime.utcnow() + timedelta(days=365 * 3)
    await db.commit()
    await db.refresh(cert)

    await rabbitmq.publish("certificacion.aprobada", {
        "certificacion_id": cert.id,
        "numero_oec": cert.numero_oec,
        "razon_social": cert.operador.razon_social if cert.operador else "N/A",
    })
    return cert


@router.post("/certificaciones/{cert_id}/rechazar", response_model=CertificacionConOperador)
async def rechazar_certificacion(
    cert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.admin)),
):
    result = await db.execute(
        select(Certificacion)
        .options(selectinload(Certificacion.operador).selectinload(Operador.pais))
        .where(Certificacion.id == cert_id)
    )
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificación no encontrada")
    if cert.estado != EstadoCertificacion.en_proceso:
        raise HTTPException(status_code=409, detail="Solo se pueden rechazar certificaciones en proceso")

    cert.estado = EstadoCertificacion.rechazada
    await db.commit()
    await db.refresh(cert)

    await rabbitmq.publish("certificacion.rechazada", {
        "certificacion_id": cert.id,
        "numero_oec": cert.numero_oec,
        "razon_social": cert.operador.razon_social if cert.operador else "N/A",
    })
    return cert


# --------------------------------- Países ---------------------------------

@router.get("/paises", response_model=list[PaisOut])
async def listar_paises(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pais).order_by(Pais.nombre))
    return result.scalars().all()


@router.post("/paises", response_model=PaisOut, status_code=201)
async def crear_pais(
    body: PaisCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.admin)),
):
    existing = await db.execute(select(Pais).where(Pais.codigo_iso == body.codigo_iso.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un país con ese código ISO")
    pais = Pais(
        nombre=body.nombre, codigo_iso=body.codigo_iso.upper(),
        programa_oea=body.programa_oea, webhook_url=body.webhook_url,
    )
    db.add(pais)
    await db.commit()
    await db.refresh(pais)
    return pais


# ------------------------------ Acuerdos ARM ------------------------------

@router.get("/acuerdos-arm", response_model=list[AcuerdoARMOut])
async def listar_acuerdos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AcuerdoARM).options(
            selectinload(AcuerdoARM.pais_origen), selectinload(AcuerdoARM.pais_destino),
        ).order_by(AcuerdoARM.id)
    )
    return result.scalars().all()


@router.post("/acuerdos-arm", response_model=AcuerdoARMOut, status_code=201)
async def crear_acuerdo(
    body: AcuerdoARMCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.admin)),
):
    acuerdo = AcuerdoARM(
        pais_origen_id=body.pais_origen_id, pais_destino_id=body.pais_destino_id,
        fecha_firma=body.fecha_firma, estado=EstadoAcuerdo.activo,
    )
    db.add(acuerdo)
    await db.commit()
    await db.refresh(acuerdo)
    result = await db.execute(
        select(AcuerdoARM).options(
            selectinload(AcuerdoARM.pais_origen), selectinload(AcuerdoARM.pais_destino),
        ).where(AcuerdoARM.id == acuerdo.id)
    )
    return result.scalar_one()


@router.patch("/acuerdos-arm/{acuerdo_id}/estado", response_model=AcuerdoARMOut)
async def cambiar_estado_acuerdo(
    acuerdo_id: int,
    body: AcuerdoEstadoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_rol(RolUsuario.admin)),
):
    result = await db.execute(
        select(AcuerdoARM).options(
            selectinload(AcuerdoARM.pais_origen), selectinload(AcuerdoARM.pais_destino),
        ).where(AcuerdoARM.id == acuerdo_id)
    )
    acuerdo = result.scalar_one_or_none()
    if not acuerdo:
        raise HTTPException(status_code=404, detail="Acuerdo no encontrado")
    acuerdo.estado = body.estado
    acuerdo.motivo_estado = body.motivo
    await db.commit()
    await db.refresh(acuerdo)

    await rabbitmq.publish("acuerdo.suspendido" if body.estado == EstadoAcuerdo.suspendido else "acuerdo.reactivado", {
        "acuerdo_id": acuerdo.id, "motivo": body.motivo,
    })
    return acuerdo
