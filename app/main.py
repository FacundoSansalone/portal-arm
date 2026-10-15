from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import init_db, engine
from app.services import rabbitmq
from app.routers import auth, operadores, validaciones, admin
from app.graphql_schema import graphql_router
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"DB init skipped: {e}")
    try:
        await rabbitmq.connect()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"RabbitMQ init skipped: {e}")
    yield
    await rabbitmq.disconnect()


app = FastAPI(title="Portal ARM", version="1.0.0", lifespan=lifespan)

_cors_origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(operadores.router)
app.include_router(validaciones.router)
app.include_router(admin.router)
app.include_router(graphql_router, prefix="/api/v1")


@app.get("/health")
async def health():
    db_status = "ok"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    conn = rabbitmq._connection
    rabbit_status = "ok" if (conn is not None and not conn.is_closed) else "desconectado"

    overall = "ok" if db_status == "ok" else "degraded"
    return {
        "status": overall,
        "service": "portal-arm-api",
        "database": db_status,
        "rabbitmq": rabbit_status,
    }
