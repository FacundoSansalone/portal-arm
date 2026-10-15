"""Endpoint WebSocket: feed en tiempo real de validaciones ARM.

Pensado para un dashboard de Aduana o Administración que quiere ver las
consultas a medida que se procesan, sin recargar la página ni hacer polling.
Es de solo difusión (la API empuja, el cliente no necesita mandar nada).

La sesión de DB se inyecta con `Depends(get_db)`, igual que en los endpoints
REST y en GraphQL, para no duplicar la configuración de conexión.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth import get_user_from_raw_token
from app.models import RolUsuario
from app.services.ws_manager import manager

router = APIRouter(prefix="/api/v1/ws", tags=["websocket"])


@router.websocket("/validaciones")
async def ws_validaciones(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_from_raw_token(token, db)

    if user is None or user.rol not in (RolUsuario.admin, RolUsuario.aduana):
        await websocket.close(code=4401)
        return

    await manager.connect(websocket)
    try:
        while True:
            # No esperamos mensajes del cliente: este `receive` solo sirve
            # para detectar cuándo el cliente cierra la conexión.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
