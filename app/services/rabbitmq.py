import json
import logging
from typing import Optional
import aio_pika
from app.config import settings

logger = logging.getLogger(__name__)

_connection: Optional[aio_pika.RobustConnection] = None
_channel: Optional[aio_pika.Channel] = None
EXCHANGE_NAME = "portal_arm"


async def connect():
    global _connection, _channel
    try:
        _connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        _channel = await _connection.channel()
        await _channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True)
        logger.info("Conectado a RabbitMQ")
    except Exception as e:
        logger.warning(f"RabbitMQ no disponible: {e}")


async def disconnect():
    if _connection:
        await _connection.close()


async def publish(routing_key: str, payload: dict):
    if _channel is None:
        logger.warning(f"RabbitMQ no conectado, evento {routing_key} descartado")
        return
    try:
        exchange = await _channel.get_exchange(EXCHANGE_NAME)
        message = aio_pika.Message(
            body=json.dumps(payload).encode(),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key=routing_key)
        logger.info(f"Evento publicado: {routing_key}")
    except Exception as e:
        logger.error(f"Error publicando en RabbitMQ: {e}")
