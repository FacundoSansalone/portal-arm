from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models import RolUsuario, EstadoCertificacion, EstadoAcuerdo, ResultadoValidacion


# --------------------------------- Auth ---------------------------------

class RegistroRequest(BaseModel):
    email: EmailStr
    password: str
    rol: RolUsuario = RolUsuario.operador


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: RolUsuario
    email: str


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    rol: RolUsuario


# --------------------------------- Países / Operadores ---------------------------------

class PaisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    codigo_iso: str
    programa_oea: Optional[str] = None


class PaisCreate(BaseModel):
    nombre: str
    codigo_iso: str
    programa_oea: Optional[str] = None
    webhook_url: Optional[str] = None


class OperadorCreate(BaseModel):
    pais_id: int
    razon_social: str
    rut: str
    contacto_email: Optional[EmailStr] = None


class OperadorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    razon_social: str
    rut: str
    contacto_email: Optional[str] = None
    pais: PaisOut


# ------------------------------- Certificaciones -------------------------------

class CertificacionCreate(BaseModel):
    numero_oec: str
    fecha_vencimiento: Optional[datetime] = None


class CertificacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero_oec: str
    estado: EstadoCertificacion
    fecha_emision: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None


class CertificacionConOperador(CertificacionOut):
    operador: OperadorOut


class DashboardOut(BaseModel):
    operador: Optional[OperadorOut] = None
    certificacion: Optional[CertificacionOut] = None


# --------------------------------- Acuerdos ARM ---------------------------------

class AcuerdoARMCreate(BaseModel):
    pais_origen_id: int
    pais_destino_id: int
    fecha_firma: Optional[datetime] = None


class AcuerdoARMOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: EstadoAcuerdo
    fecha_firma: Optional[datetime] = None
    motivo_estado: Optional[str] = None
    pais_origen: PaisOut
    pais_destino: PaisOut


class AcuerdoEstadoUpdate(BaseModel):
    estado: EstadoAcuerdo
    motivo: Optional[str] = None


# --------------------------------- Validaciones ---------------------------------

class ValidacionRequest(BaseModel):
    numero_oec: str
    pais_solicitante: str


class ValidacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    resultado: ResultadoValidacion
    detalle: Optional[str] = None
    beneficios: Optional[str] = None
    numero_oec_consultado: Optional[str] = None
    pais_solicitante: Optional[str] = None
    created_at: datetime


class ValidacionListOut(BaseModel):
    total: int
    items: list[ValidacionOut]
