"""Scheduler independiente: una vez por día revisa el estado de las
certificaciones (vencidas / próximas a vencer) y publica un evento en RabbitMQ
para que el Consumer lo procese. No expone HTTP: solo corre en loop."""
import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import aio_pika
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.config import settings
from app.database import AsyncSessionLocal, engine, Base
from app.models import Certificacion, EstadoCertificacion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [SCHEDULER] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

EXCHANGE_NAME = "portal_arm"
DIAS_AVISO_VENCIMIENTO = 30


async def publish_event(channel: aio_pika.Channel, routing_key: str, payload: dict):
    import json
    try:
        exchange = await channel.get_exchange(EXCHANGE_NAME)
        message = aio_pika.Message(
            body=json.dumps(payload).encode(),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key=routing_key)
    except Exception as e:
        logger.error(f"Error publicando: {e}")


async def check_certificaciones_vencidas(channel: aio_pika.Channel):
    logger.info("Revisando certificaciones vencidas...")
    now = datetime.utcnow()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Certificacion)
            .options(selectinload(Certificacion.operador))
            .where(
                Certificacion.estado == EstadoCertificacion.vigente,
                Certificacion.fecha_vencimiento < now,
            )
        )
        vencidas = result.scalars().all()
        for cert in vencidas:
            cert.estado = EstadoCertificacion.vencida
            await publish_event(channel, "certificacion.vencida", {
                "certificacion_id": cert.id,
                "numero_oec": cert.numero_oec,
                "razon_social": cert.operador.razon_social if cert.operador else "N/A",
            })
        await db.commit()
        logger.info(f"Certificaciones marcadas como vencidas: {len(vencidas)}")


async def check_certificaciones_por_vencer(channel: aio_pika.Channel):
    logger.info(f"Revisando certificaciones por vencer (próximos {DIAS_AVISO_VENCIMIENTO} días)...")
    now = datetime.utcnow()
    limite = now + timedelta(days=DIAS_AVISO_VENCIMIENTO)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Certificacion)
            .options(selectinload(Certificacion.operador))
            .where(
                Certificacion.estado == EstadoCertificacion.vigente,
                Certificacion.fecha_vencimiento >= now,
                Certificacion.fecha_vencimiento <= limite,
            )
        )
        por_vencer = result.scalars().all()
        for cert in por_vencer:
            dias = (cert.fecha_vencimiento - now).days
            await publish_event(channel, "certificacion.por_vencer", {
                "certificacion_id": cert.id,
                "numero_oec": cert.numero_oec,
                "razon_social": cert.operador.razon_social if cert.operador else "N/A",
                "dias_restantes": dias,
            })
        logger.info(f"Certificaciones por vencer notificadas: {len(por_vencer)}")


async def ensure_schema():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Esquema de DB verificado")
    except Exception as e:
        logger.warning(f"No se pudo verificar el esquema de DB: {e}")


async def main():
    logger.info("Iniciando scheduler...")
    await ensure_schema()
    while True:
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            channel = await connection.channel()
            await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True)
            logger.info("Conectado a RabbitMQ")

            while True:
                await check_certificaciones_vencidas(channel)
                await check_certificaciones_por_vencer(channel)
                logger.info("Próxima revisión en 24 horas")
                await asyncio.sleep(86400)

        except Exception as e:
            logger.error(f"Error: {e}. Reintentando en 10s...")
            await asyncio.sleep(10)


if __name__ == "__main__":
    asyncio.run(main())
