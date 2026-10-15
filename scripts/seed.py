"""Script de seed: carga datos de prueba para poder demostrar el sistema."""
import asyncio
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.models import Usuario, Pais, Operador, Certificacion, AcuerdoARM, EstadoCertificacion, EstadoAcuerdo, RolUsuario
from app.auth import hash_password


PAISES = [
    {"nombre": "Uruguay", "codigo_iso": "UY", "programa_oea": "OEC"},
    {"nombre": "Estados Unidos", "codigo_iso": "US", "programa_oea": "C-TPAT"},
    {
        "nombre": "Brasil", "codigo_iso": "BR", "programa_oea": "OEA",
        # Endpoint de ejemplo: el Consumer le notifica por HTTP el resultado de
        # cada validación que involucre a Brasil (ver app/services/consumer.py).
        "webhook_url": "https://webhook.site/portal-arm-demo-br",
    },
    {"nombre": "Corea del Sur", "codigo_iso": "KR", "programa_oea": "AEO"},
    {"nombre": "Israel", "codigo_iso": "IL", "programa_oea": "AEO"},
    {"nombre": "Argentina", "codigo_iso": "AR", "programa_oea": "OEA"},
]

ACUERDOS = [
    ("UY", "US", datetime(2016, 6, 15)),
    ("UY", "BR", datetime(2012, 3, 20)),
    ("UY", "KR", datetime(2019, 9, 10)),
    ("UY", "IL", datetime(2017, 11, 5)),
]

USUARIOS = [
    {"email": "admin@portal-arm.uy", "password": "Admin123!", "rol": RolUsuario.admin},
    {"email": "operador@empresauy.com", "password": "Oper123!", "rol": RolUsuario.operador},
    {"email": "aduana@dna.gub.uy", "password": "Aduana123!", "rol": RolUsuario.aduana},
    {"email": "aduana.br@receita.gov.br", "password": "Aduana123!", "rol": RolUsuario.aduana},
]


async def main():
    print("Iniciando seed...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Países
        pais_map = {}
        for p in PAISES:
            existing = await db.execute(select(Pais).where(Pais.codigo_iso == p["codigo_iso"]))
            pais = existing.scalar_one_or_none()
            if not pais:
                pais = Pais(**p)
                db.add(pais)
                await db.flush()
                print(f"  Pais creado: {pais.nombre}")
            pais_map[pais.codigo_iso] = pais
        await db.commit()

        # Recargar mapa
        for codigo in pais_map:
            r = await db.execute(select(Pais).where(Pais.codigo_iso == codigo))
            pais_map[codigo] = r.scalar_one()

        # Acuerdos ARM
        for origen_iso, destino_iso, fecha in ACUERDOS:
            pais_origen = pais_map[origen_iso]
            pais_destino = pais_map[destino_iso]
            existing = await db.execute(
                select(AcuerdoARM).where(
                    AcuerdoARM.pais_origen_id == pais_origen.id,
                    AcuerdoARM.pais_destino_id == pais_destino.id,
                )
            )
            if not existing.scalar_one_or_none():
                acuerdo = AcuerdoARM(
                    pais_origen_id=pais_origen.id,
                    pais_destino_id=pais_destino.id,
                    fecha_firma=fecha,
                    estado=EstadoAcuerdo.activo,
                )
                db.add(acuerdo)
                print(f"  Acuerdo ARM: {origen_iso} <-> {destino_iso}")
        await db.commit()

        # Usuarios
        user_map = {}
        for u in USUARIOS:
            existing = await db.execute(select(Usuario).where(Usuario.email == u["email"]))
            user = existing.scalar_one_or_none()
            if not user:
                user = Usuario(
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    rol=u["rol"],
                )
                db.add(user)
                await db.flush()
                print(f"  Usuario creado: {user.email} ({user.rol})")
            user_map[u["email"]] = user
        await db.commit()

        for email in user_map:
            r = await db.execute(select(Usuario).where(Usuario.email == email))
            user_map[email] = r.scalar_one()

        # Operador de prueba
        operador_user = user_map["operador@empresauy.com"]
        pais_uy = pais_map["UY"]
        existing = await db.execute(select(Operador).where(Operador.usuario_id == operador_user.id))
        operador = existing.scalar_one_or_none()
        if not operador:
            operador = Operador(
                usuario_id=operador_user.id,
                pais_id=pais_uy.id,
                razon_social="Empresa Logística Uruguay S.A.",
                rut="211234560011",
                contacto_email="operador@empresauy.com",
            )
            db.add(operador)
            await db.flush()
            print(f"  Operador creado: {operador.razon_social}")
        await db.commit()

        r = await db.execute(select(Operador).where(Operador.usuario_id == operador_user.id))
        operador = r.scalar_one()

        # Certificación vigente
        existing = await db.execute(
            select(Certificacion).where(Certificacion.numero_oec == "OEC-UY-2024-001")
        )
        if not existing.scalar_one_or_none():
            cert_vigente = Certificacion(
                operador_id=operador.id,
                numero_oec="OEC-UY-2024-001",
                estado=EstadoCertificacion.vigente,
                fecha_emision=datetime(2024, 1, 15),
                fecha_vencimiento=datetime(2027, 1, 15),
            )
            db.add(cert_vigente)
            print("  Certificación vigente: OEC-UY-2024-001")

        # Certificación vencida (para demostrar ese resultado)
        existing = await db.execute(
            select(Certificacion).where(Certificacion.numero_oec == "OEC-UY-2020-099")
        )
        if not existing.scalar_one_or_none():
            cert_vencida = Certificacion(
                operador_id=operador.id,
                numero_oec="OEC-UY-2020-099",
                estado=EstadoCertificacion.vencida,
                fecha_emision=datetime(2020, 3, 1),
                fecha_vencimiento=datetime(2023, 3, 1),
            )
            db.add(cert_vencida)
            print("  Certificación vencida: OEC-UY-2020-099")

        # Certificación en proceso (pendiente de aprobación)
        existing = await db.execute(
            select(Certificacion).where(Certificacion.numero_oec == "OEC-UY-2025-002")
        )
        if not existing.scalar_one_or_none():
            cert_proceso = Certificacion(
                operador_id=operador.id,
                numero_oec="OEC-UY-2025-002",
                estado=EstadoCertificacion.en_proceso,
            )
            db.add(cert_proceso)
            print("  Certificación en proceso: OEC-UY-2025-002")

        await db.commit()
        print("\nSeed completado con éxito!")
        print("\nUsuarios de prueba:")
        for u in USUARIOS:
            print(f"  {u['email']} / {u['password']} [{u['rol']}]")
        print("\nNúmeros OEC de prueba:")
        print("  OEC-UY-2024-001  -> vigente (debería resultar APROBADA con país con acuerdo)")
        print("  OEC-UY-2020-099  -> vencida (resultado: CERTIFICACION_VENCIDA)")
        print("  OEC-UY-2025-002  -> en proceso (resultado: RECHAZADA)")
        print("  Código ISO sin acuerdo: AR (Argentina, sin acuerdo ARM con Uruguay)")


if __name__ == "__main__":
    asyncio.run(main())
