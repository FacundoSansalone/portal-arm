"""Consumer independiente: escucha los eventos publicados en RabbitMQ y, cuando
corresponde, reenvía una notificación HTTP a la aduana externa interesada
(el `webhook_url` configurado en el país solicitante o en el país del operador).

Es el segundo extremo de la comunicación asincrónica del sistema: la API nunca
llama directamente a un sistema externo, publica un evento y este proceso se
encarga de la entrega, para no acoplar el tiempo de respuesta de la API a la
disponibilidad de la aduana externa.
"""
import asyncio
import json
import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import aio_pika
import httpx
from sqlalchemy import select
from app.config import settings
from app.database import AsyncSessionLocal
from app.models import Pais

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [CONSUMER] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

EXCHANGE_NAME = "portal_arm"
QUEUE_NAME = "portal_arm_consumer"
ROUTING_KEYS = ["validacion.*", "certificacion.*", "acuerdo.*"]


async def _notificar_aduana_externa(routing_key: str, payload: dict):
    """Si el evento trae un país solicitante con webhook configurado, le hace
    un POST con el resultado (ver diagrama: Consumer -> HTTP webhook -> Aduanas
    externas)."""
    pais_iso = payload.get("pais_solicitante")
    if not pais_iso:
        return
    try:
        async with AsyncSessionLocal() as db:
            pais = (await db.execute(select(Pais).where(Pais.codigo_iso == pais_iso))).scalar_one_or_none()
    except Exception as e:
        logger.error(f"No se pudo leer el país {pais_iso}: {e}")
        return

    if not pais or not pais.webhook_url:
        return

    body = {"evento": routing_key, "datos": payload}
    try:
        async with httpx.AsyncClient(timeout=settings.WEBHOOK_TIMEOUT_SEGUNDOS) as client:
            resp = await client.post(pais.webhook_url, json=body)
        logger.info(f"Webhook -> {pais.webhook_url} ({resp.status_code})")
    except Exception as e:
        logger.warning(f"No se pudo entregar el webhook a {pais.webhook_url}: {e}")


async def _procesar(routing_key: str, payload: dict):
    logger.info(f"[EVENT] {routing_key} | {json.dumps(payload, ensure_ascii=False)}")
    await _notificar_aduana_externa(routing_key, payload)


async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        payload = json.loads(message.body.decode())
        await _procesar(message.routing_key, payload)


async def main():
    logger.info("Iniciando consumer...")
    while True:
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=10)

            exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True)
            queue = await channel.declare_queue(QUEUE_NAME, durable=True)
            for rk in ROUTING_KEYS:
                await queue.bind(exchange, routing_key=rk)

            logger.info(f"Escuchando cola '{QUEUE_NAME}' con routing keys: {ROUTING_KEYS}")
            await queue.consume(process_message)

            await asyncio.Future()  # bloquea indefinidamente
        except Exception as e:
            logger.error(f"Error de conexión: {e}. Reintentando en 5s...")
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main())
