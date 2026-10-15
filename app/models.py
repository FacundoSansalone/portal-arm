from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class RolUsuario(str, enum.Enum):
    admin = "admin"
    operador = "operador"
    aduana = "aduana"


class EstadoCertificacion(str, enum.Enum):
    en_proceso = "en_proceso"
    vigente = "vigente"
    vencida = "vencida"
    rechazada = "rechazada"


class EstadoAcuerdo(str, enum.Enum):
    activo = "activo"
    suspendido = "suspendido"


class ResultadoValidacion(str, enum.Enum):
    APROBADA = "APROBADA"
    SIN_ACUERDO = "SIN_ACUERDO"
    CERTIFICACION_VENCIDA = "CERTIFICACION_VENCIDA"
    RECHAZADA = "RECHAZADA"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[RolUsuario] = mapped_column(SAEnum(RolUsuario), default=RolUsuario.operador)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    operador: Mapped["Operador"] = relationship("Operador", back_populates="usuario", uselist=False)


class Pais(Base):
    """País con el que la DNA mantiene (o no) un Acuerdo de Reconocimiento Mutuo.
    `webhook_url`, si está seteado, es el endpoint de la aduana extranjera al que
    el Consumer notifica los eventos relevantes (ver diagrama de arquitectura)."""
    __tablename__ = "paises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    codigo_iso: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    programa_oea: Mapped[str] = mapped_column(String(50), nullable=True)
    webhook_url: Mapped[str] = mapped_column(String(500), nullable=True)

    operadores: Mapped[list["Operador"]] = relationship("Operador", back_populates="pais")
    acuerdos_origen: Mapped[list["AcuerdoARM"]] = relationship("AcuerdoARM", foreign_keys="AcuerdoARM.pais_origen_id", back_populates="pais_origen")
    acuerdos_destino: Mapped[list["AcuerdoARM"]] = relationship("AcuerdoARM", foreign_keys="AcuerdoARM.pais_destino_id", back_populates="pais_destino")


class Operador(Base):
    __tablename__ = "operadores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=False)
    pais_id: Mapped[int] = mapped_column(Integer, ForeignKey("paises.id"), nullable=False)
    razon_social: Mapped[str] = mapped_column(String(255), nullable=False)
    rut: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    contacto_email: Mapped[str] = mapped_column(String(255), nullable=True)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="operador")
    pais: Mapped["Pais"] = relationship("Pais", back_populates="operadores")
    certificaciones: Mapped[list["Certificacion"]] = relationship("Certificacion", back_populates="operador")
    validaciones: Mapped[list["Validacion"]] = relationship("Validacion", back_populates="operador")


class Certificacion(Base):
    __tablename__ = "certificaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    operador_id: Mapped[int] = mapped_column(Integer, ForeignKey("operadores.id"), nullable=False)
    numero_oec: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    estado: Mapped[EstadoCertificacion] = mapped_column(SAEnum(EstadoCertificacion), default=EstadoCertificacion.en_proceso)
    fecha_emision: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    fecha_vencimiento: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    operador: Mapped["Operador"] = relationship("Operador", back_populates="certificaciones")


class AcuerdoARM(Base):
    __tablename__ = "acuerdos_arm"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pais_origen_id: Mapped[int] = mapped_column(Integer, ForeignKey("paises.id"), nullable=False)
    pais_destino_id: Mapped[int] = mapped_column(Integer, ForeignKey("paises.id"), nullable=False)
    fecha_firma: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    estado: Mapped[EstadoAcuerdo] = mapped_column(SAEnum(EstadoAcuerdo), default=EstadoAcuerdo.activo)
    motivo_estado: Mapped[str] = mapped_column(String(255), nullable=True)

    pais_origen: Mapped["Pais"] = relationship("Pais", foreign_keys=[pais_origen_id], back_populates="acuerdos_origen")
    pais_destino: Mapped["Pais"] = relationship("Pais", foreign_keys=[pais_destino_id], back_populates="acuerdos_destino")
    validaciones: Mapped[list["Validacion"]] = relationship("Validacion", back_populates="acuerdo")


class Validacion(Base):
    """Cada consulta de validación ARM recibida (de una aduana o del propio
    sistema). Es el registro que se persiste y se publica en RabbitMQ."""
    __tablename__ = "validaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    operador_id: Mapped[int] = mapped_column(Integer, ForeignKey("operadores.id"), nullable=True)
    acuerdo_id: Mapped[int] = mapped_column(Integer, ForeignKey("acuerdos_arm.id"), nullable=True)
    resultado: Mapped[ResultadoValidacion] = mapped_column(SAEnum(ResultadoValidacion), nullable=False)
    beneficios: Mapped[str] = mapped_column(Text, nullable=True)
    solicitado_por: Mapped[str] = mapped_column(String(100), nullable=True)
    numero_oec_consultado: Mapped[str] = mapped_column(String(50), nullable=True)
    pais_solicitante: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    operador: Mapped["Operador"] = relationship("Operador", back_populates="validaciones")
    acuerdo: Mapped["AcuerdoARM"] = relationship("AcuerdoARM", back_populates="validaciones")
