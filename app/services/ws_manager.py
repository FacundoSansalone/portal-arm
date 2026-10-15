"""Gestiona las conexiones WebSocket activas y difunde mensajes a todas ellas.

Es el tercer canal de comunicación de la API (ver diagrama de arquitectura):
a diferencia de REST (síncrono, request/response) y de RabbitMQ (asincrónico,
entre procesos / hacia afuera del sistema), este canal empuja actualizaciones
en tiempo real hacia la UI del propio Portal, sin que el cliente tenga que
hacer polling para enterarse de una nueva validación.
"""
import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._conexiones: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self._conexiones.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self._conexiones:
            self._conexiones.remove(websocket)

    async def broadcast(self, payload: dict[str, Any]):
        data = json.dumps(payload, default=str)
        muertas = []
        for ws in self._conexiones:
            try:
                await ws.send_text(data)
            except Exception:
                muertas.append(ws)
        for ws in muertas:
            self.disconnect(ws)


manager = ConnectionManager()
