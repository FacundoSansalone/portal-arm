"""Fixtures de pytest y helpers compartidos por toda la suite.

Cada test corre contra una base SQLite en memoria fresca (creada y destruida por
el fixture `db_session`), por lo que los tests están aislados entre sí y los IDs
autoincrementales arrancan siempre en 1.
"""
from datetime import datetime, timedelta

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import (
    Pais, AcuerdoARM, EstadoAcuerdo, Operador, Certificacion,
    EstadoCertificacion, Usuario, RolUsuario,
)
from app.auth import hash_password

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    from app.services import rabbitmq
    original_publish = rabbitmq.publish

    async def mock_publish(routing_key, payload):
        pass

    rabbitmq.publish = mock_publish

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    rabbitmq.publish = original_publish


# --- Helpers compartidos -----------------------------------------------------
def auth(token: str) -> dict:
    """Header de autorización Bearer."""
    return {"Authorization": f"Bearer {token}"}


async def register_and_login(client: AsyncClient, email: str, password: str, rol: str = "aduana") -> str:
    await client.post("/api/v1/auth/registro", json={"email": email, "password": password, "rol": rol})
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]


async def admin_token(client: AsyncClient, db_session) -> str:
    """Crea un admin directamente en DB (no se puede por el endpoint público) y loguea."""
    admin = Usuario(
        email="admin@test.com", password_hash=hash_password("Admin123!"), rol=RolUsuario.admin
    )
    db_session.add(admin)
    await db_session.commit()
    resp = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "Admin123!"})
    return resp.json()["access_token"]


async def create_paises_y_acuerdo(db_session):
    """Crea UY, BR, AR y un acuerdo ARM activo UY-BR. Devuelve (uy, br, ar)."""
    pais_uy = Pais(nombre="Uruguay", codigo_iso="UY", programa_oea="OEC")
    pais_br = Pais(nombre="Brasil", codigo_iso="BR", programa_oea="OEA")
    pais_ar = Pais(nombre="Argentina", codigo_iso="AR", programa_oea="OEA")
    db_session.add_all([pais_uy, pais_br, pais_ar])
    await db_session.flush()

    acuerdo = AcuerdoARM(
        pais_origen_id=pais_uy.id,
        pais_destino_id=pais_br.id,
        estado=EstadoAcuerdo.activo,
    )
    db_session.add(acuerdo)
    await db_session.commit()
    return pais_uy, pais_br, pais_ar


async def setup_operador_con_cert(db_session, pais_uy, estado: EstadoCertificacion, numero_oec: str):
    """Crea usuario operador + operador + certificación directamente en DB."""
    user = Usuario(
        email=f"op-{numero_oec}@test.com",
        password_hash=hash_password("pass"),
        rol=RolUsuario.operador,
    )
    db_session.add(user)
    await db_session.flush()

    operador = Operador(
        usuario_id=user.id,
        pais_id=pais_uy.id,
        razon_social="Test SA",
        rut=f"RUT-{numero_oec}",
    )
    db_session.add(operador)
    await db_session.flush()

    fecha_vencimiento = (
        datetime.utcnow() + timedelta(days=365) if estado == EstadoCertificacion.vigente
        else datetime.utcnow() - timedelta(days=1)
    )
    cert = Certificacion(
        operador_id=operador.id,
        numero_oec=numero_oec,
        estado=estado,
        fecha_emision=datetime.utcnow() - timedelta(days=30),
        fecha_vencimiento=fecha_vencimiento,
    )
    db_session.add(cert)
    await db_session.commit()
