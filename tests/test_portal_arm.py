"""Suite de tests de Portal ARM (versión simplificada).

Cubre las 2 funcionalidades pedidas por la letra (login y validación ARM),
el flujo de aprobación de certificaciones, la gestión básica de países y
acuerdos ARM, el endpoint GraphQL y el health check.
"""
import pytest
from app.models import EstadoCertificacion, EstadoAcuerdo
from tests.conftest import auth, register_and_login, admin_token, create_paises_y_acuerdo, setup_operador_con_cert


# --------------------------------- Auth / Login ---------------------------------

@pytest.mark.asyncio
async def test_registro_y_login_ok(client):
    r = await client.post("/api/v1/auth/registro", json={
        "email": "nuevo@test.com", "password": "Pass123!", "rol": "operador",
    })
    assert r.status_code == 201
    assert r.json()["email"] == "nuevo@test.com"

    r = await client.post("/api/v1/auth/login", json={"email": "nuevo@test.com", "password": "Pass123!"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["rol"] == "operador"


@pytest.mark.asyncio
async def test_login_credenciales_invalidas(client):
    await client.post("/api/v1/auth/registro", json={
        "email": "x@test.com", "password": "Pass123!", "rol": "operador",
    })
    r = await client.post("/api/v1/auth/login", json={"email": "x@test.com", "password": "incorrecta"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_registro_no_permite_admin(client):
    r = await client.post("/api/v1/auth/registro", json={
        "email": "fake-admin@test.com", "password": "Pass123!", "rol": "admin",
    })
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_registro_email_duplicado(client):
    await client.post("/api/v1/auth/registro", json={
        "email": "dup@test.com", "password": "Pass123!", "rol": "operador",
    })
    r = await client.post("/api/v1/auth/registro", json={
        "email": "dup@test.com", "password": "Otra123!", "rol": "operador",
    })
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_endpoint_protegido_sin_token(client):
    r = await client.get("/api/v1/operadores/mi-dashboard")
    assert r.status_code == 401


# ------------------------------ Validación ARM (core) ------------------------------

@pytest.mark.asyncio
async def test_validacion_aprobada(client, db_session):
    pais_uy, pais_br, _ = await create_paises_y_acuerdo(db_session)
    await setup_operador_con_cert(db_session, pais_uy, EstadoCertificacion.vigente, "OEC-001")
    token = await register_and_login(client, "aduana1@test.com", "Pass123!", rol="aduana")

    r = await client.post("/api/v1/validaciones/", json={
        "numero_oec": "OEC-001", "pais_solicitante": "BR",
    }, headers=auth(token))
    assert r.status_code == 201
    body = r.json()
    assert body["resultado"] == "APROBADA"
    assert body["beneficios"]


@pytest.mark.asyncio
async def test_validacion_sin_acuerdo(client, db_session):
    pais_uy, _, pais_ar = await create_paises_y_acuerdo(db_session)
    await setup_operador_con_cert(db_session, pais_uy, EstadoCertificacion.vigente, "OEC-002")
    token = await register_and_login(client, "aduana2@test.com", "Pass123!", rol="aduana")

    r = await client.post("/api/v1/validaciones/", json={
        "numero_oec": "OEC-002", "pais_solicitante": "AR",
    }, headers=auth(token))
    assert r.status_code == 201
    assert r.json()["resultado"] == "SIN_ACUERDO"


@pytest.mark.asyncio
async def test_validacion_certificacion_vencida(client, db_session):
    pais_uy, pais_br, _ = await create_paises_y_acuerdo(db_session)
    await setup_operador_con_cert(db_session, pais_uy, EstadoCertificacion.vencida, "OEC-003")
    token = await register_and_login(client, "aduana3@test.com", "Pass123!", rol="aduana")

    r = await client.post("/api/v1/validaciones/", json={
        "numero_oec": "OEC-003", "pais_solicitante": "BR",
    }, headers=auth(token))
    assert r.status_code == 201
    assert r.json()["resultado"] == "CERTIFICACION_VENCIDA"


@pytest.mark.asyncio
async def test_validacion_oec_inexistente(client, db_session):
    await create_paises_y_acuerdo(db_session)
    token = await register_and_login(client, "aduana4@test.com", "Pass123!", rol="aduana")

    r = await client.post("/api/v1/validaciones/", json={
        "numero_oec": "OEC-NO-EXISTE", "pais_solicitante": "BR",
    }, headers=auth(token))
    assert r.status_code == 201
    assert r.json()["resultado"] == "RECHAZADA"


@pytest.mark.asyncio
async def test_validacion_solo_aduana_o_admin(client, db_session):
    pais_uy, _, _ = await create_paises_y_acuerdo(db_session)
    await setup_operador_con_cert(db_session, pais_uy, EstadoCertificacion.vigente, "OEC-004")
    token = await register_and_login(client, "operador-x@test.com", "Pass123!", rol="operador")

    r = await client.post("/api/v1/validaciones/", json={
        "numero_oec": "OEC-004", "pais_solicitante": "BR",
    }, headers=auth(token))
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_listar_validaciones_paginado(client, db_session):
    pais_uy, pais_br, _ = await create_paises_y_acuerdo(db_session)
    await setup_operador_con_cert(db_session, pais_uy, EstadoCertificacion.vigente, "OEC-005")
    token = await register_and_login(client, "aduana5@test.com", "Pass123!", rol="aduana")

    for _ in range(3):
        await client.post("/api/v1/validaciones/", json={
            "numero_oec": "OEC-005", "pais_solicitante": "BR",
        }, headers=auth(token))

    r = await client.get("/api/v1/validaciones/?limit=2&offset=0", headers=auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2


# --------------------------- Operadores / Certificaciones ---------------------------

@pytest.mark.asyncio
async def test_crear_operador_y_certificacion(client, db_session):
    pais_uy, _, _ = await create_paises_y_acuerdo(db_session)
    token = await register_and_login(client, "operador-nuevo@test.com", "Pass123!", rol="operador")

    r = await client.post("/api/v1/operadores/", json={
        "pais_id": pais_uy.id, "razon_social": "Mi Empresa SA", "rut": "211999990011",
    }, headers=auth(token))
    assert r.status_code == 201
    operador_id = r.json()["id"]

    r = await client.post(f"/api/v1/operadores/{operador_id}/certificaciones", json={
        "numero_oec": "OEC-NEW-001",
    }, headers=auth(token))
    assert r.status_code == 201
    assert r.json()["estado"] == "en_proceso"

    r = await client.get("/api/v1/operadores/mi-dashboard", headers=auth(token))
    assert r.status_code == 200
    assert r.json()["operador"]["razon_social"] == "Mi Empresa SA"


@pytest.mark.asyncio
async def test_aprobar_y_rechazar_certificacion(client, db_session):
    pais_uy, _, _ = await create_paises_y_acuerdo(db_session)
    token_op = await register_and_login(client, "operador-flow@test.com", "Pass123!", rol="operador")
    r = await client.post("/api/v1/operadores/", json={
        "pais_id": pais_uy.id, "razon_social": "Flow SA", "rut": "211888880011",
    }, headers=auth(token_op))
    operador_id = r.json()["id"]
    r = await client.post(f"/api/v1/operadores/{operador_id}/certificaciones", json={
        "numero_oec": "OEC-FLOW-001",
    }, headers=auth(token_op))
    cert_id = r.json()["id"]

    token_admin = await admin_token(client, db_session)

    r = await client.get("/api/v1/admin/certificaciones-pendientes", headers=auth(token_admin))
    assert r.status_code == 200
    assert any(c["id"] == cert_id for c in r.json())

    r = await client.post(f"/api/v1/admin/certificaciones/{cert_id}/aprobar", headers=auth(token_admin))
    assert r.status_code == 200
    assert r.json()["estado"] == "vigente"

    # Una vez aprobada, ya no puede volver a aprobarse/rechazarse
    r = await client.post(f"/api/v1/admin/certificaciones/{cert_id}/rechazar", headers=auth(token_admin))
    assert r.status_code == 409


# ----------------------------- Países / Acuerdos ARM (admin) -----------------------------

@pytest.mark.asyncio
async def test_admin_crear_pais(client, db_session):
    token_admin = await admin_token(client, db_session)
    r = await client.post("/api/v1/admin/paises", json={
        "nombre": "Chile", "codigo_iso": "CL", "programa_oea": "OEA",
    }, headers=auth(token_admin))
    assert r.status_code == 201
    assert r.json()["codigo_iso"] == "CL"

    r = await client.get("/api/v1/admin/paises")
    assert r.status_code == 200
    assert any(p["codigo_iso"] == "CL" for p in r.json())


@pytest.mark.asyncio
async def test_admin_crear_y_suspender_acuerdo(client, db_session):
    pais_uy, pais_br, pais_ar = await create_paises_y_acuerdo(db_session)
    token_admin = await admin_token(client, db_session)

    r = await client.post("/api/v1/admin/acuerdos-arm", json={
        "pais_origen_id": pais_uy.id, "pais_destino_id": pais_ar.id,
    }, headers=auth(token_admin))
    assert r.status_code == 201
    acuerdo_id = r.json()["id"]
    assert r.json()["estado"] == "activo"

    r = await client.patch(f"/api/v1/admin/acuerdos-arm/{acuerdo_id}/estado", json={
        "estado": "suspendido", "motivo": "Revisión bilateral",
    }, headers=auth(token_admin))
    assert r.status_code == 200
    assert r.json()["estado"] == "suspendido"

    # Suspendido el acuerdo, una validación entre esos países ya no debe aprobar
    await setup_operador_con_cert(db_session, pais_uy, EstadoCertificacion.vigente, "OEC-SUSP-001")
    token_aduana = await register_and_login(client, "aduana-susp@test.com", "Pass123!", rol="aduana")
    r = await client.post("/api/v1/validaciones/", json={
        "numero_oec": "OEC-SUSP-001", "pais_solicitante": "AR",
    }, headers=auth(token_aduana))
    assert r.json()["resultado"] == "SIN_ACUERDO"


# --------------------------------- GraphQL ---------------------------------

@pytest.mark.asyncio
async def test_graphql_requiere_auth(client):
    r = await client.post("/api/v1/graphql", json={"query": "{ consultarOec(numeroOec: \"X\") { id } }"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_graphql_consultar_oec(client, db_session):
    pais_uy, _, _ = await create_paises_y_acuerdo(db_session)
    await setup_operador_con_cert(db_session, pais_uy, EstadoCertificacion.vigente, "OEC-GQL-001")
    token = await register_and_login(client, "gql@test.com", "Pass123!", rol="aduana")

    query = '{ consultarOec(numeroOec: "OEC-GQL-001") { numeroOec estado operador { razonSocial pais { nombre } } } }'
    r = await client.post("/api/v1/graphql", json={"query": query}, headers=auth(token))
    assert r.status_code == 200
    data = r.json()["data"]["consultarOec"]
    assert data["numeroOec"] == "OEC-GQL-001"
    assert data["estado"] == "vigente"


# --------------------------------- Health ---------------------------------

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["service"] == "portal-arm-api"
