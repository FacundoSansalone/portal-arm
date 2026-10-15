"""Segunda forma de comunicación de la API: GraphQL.
Se expone una sola query de consulta (consultar_oec), que es el caso de uso
real que necesita una aduana externa: conocer el estado de una certificación
sin tener que aprender los filtros de la API REST.

La sesión de base de datos se inyecta vía `context_getter` (Depends(get_db)),
igual que en los endpoints REST, en lugar de abrir una conexión propia: así
ambos caminos comparten la misma configuración y son testeables igual.
"""
from typing import Optional
import strawberry
from fastapi import Depends
from strawberry.fastapi import GraphQLRouter
from strawberry.types import Info
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Certificacion, Operador, Usuario
from app.auth import get_current_user


@strawberry.type
class PaisGQL:
    id: int
    nombre: str
    codigo_iso: str
    programa_oea: Optional[str] = None


@strawberry.type
class OperadorGQL:
    id: int
    razon_social: str
    rut: str
    pais: PaisGQL


@strawberry.type
class CertificacionGQL:
    id: int
    numero_oec: str
    estado: str
    operador: OperadorGQL


@strawberry.type
class Query:
    @strawberry.field
    async def consultar_oec(self, info: Info, numero_oec: str) -> Optional[CertificacionGQL]:
        db: AsyncSession = info.context["db"]
        result = await db.execute(
            select(Certificacion)
            .options(selectinload(Certificacion.operador).selectinload(Operador.pais))
            .where(Certificacion.numero_oec == numero_oec)
        )
        cert = result.scalar_one_or_none()
        if not cert:
            return None
        return CertificacionGQL(
            id=cert.id,
            numero_oec=cert.numero_oec,
            estado=cert.estado.value,
            operador=OperadorGQL(
                id=cert.operador.id,
                razon_social=cert.operador.razon_social,
                rut=cert.operador.rut,
                pais=PaisGQL(
                    id=cert.operador.pais.id,
                    nombre=cert.operador.pais.nombre,
                    codigo_iso=cert.operador.pais.codigo_iso,
                    programa_oea=cert.operador.pais.programa_oea,
                ),
            ),
        )


async def get_context(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exige un token válido (el endpoint expone datos sensibles como el RUT del
    operador, igual que la API REST) e inyecta la misma sesión de DB que usan
    los endpoints REST."""
    return {"current_user": current_user, "db": db}


schema = strawberry.Schema(query=Query)
graphql_router = GraphQLRouter(schema, path="/graphql", context_getter=get_context)
