from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Usuario, RolUsuario
from app.schemas import RegistroRequest, LoginRequest, TokenResponse, UsuarioOut
from app.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/registro", response_model=UsuarioOut, status_code=201)
async def registro(body: RegistroRequest, db: AsyncSession = Depends(get_db)):
    """Alta de un nuevo usuario. No se permite auto-asignarse el rol admin por
    este endpoint público (los administradores se crean por seed)."""
    if body.rol == RolUsuario.admin:
        raise HTTPException(status_code=403, detail="No se permite registrarse como administrador")

    existing = await db.execute(select(Usuario).where(Usuario.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="El email ya está registrado")

    user = Usuario(email=body.email, password_hash=hash_password(body.password), rol=body.rol)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.activo:
        raise HTTPException(status_code=401, detail="Usuario desactivado")

    token = create_access_token({"sub": user.email, "rol": user.rol})
    return TokenResponse(access_token=token, rol=user.rol, email=user.email)
