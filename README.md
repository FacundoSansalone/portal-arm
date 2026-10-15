# Portal ARM — Sistema de Validación OEC

Sistema distribuido para validar certificaciones de Operadores Económicos Calificados (OEC)
en el marco de Acuerdos de Reconocimiento Mutuo (ARM) entre aduanas. Proyecto de Sistemas
Distribuidos — Universidad de Montevideo.

## Funcionalidades implementadas

1. **Login** (`POST /api/v1/auth/login`, `POST /api/v1/auth/registro`) — autenticación con
   JWT y 3 roles: `admin`, `operador`, `aduana`.
2. **Validación ARM** (`POST /api/v1/validaciones/`) — dado un número OEC y el país que
   consulta, determina si corresponde el reconocimiento mutuo (operador con certificación
   vigente + Acuerdo ARM activo entre los países), persiste el resultado y publica un evento
   asincrónico para que el Consumer lo procese.

## Inicio rápido

### 1. Levantar servicios

```bash
docker compose up --build
```

Servicios: `api` (8000), `frontend` (3000), `db` (5432), `rabbitmq` (5672/15672), `consumer`, `scheduler`

### 2. Cargar datos de prueba

```bash
docker compose exec api python -m scripts.seed
```

### 3. Acceder al sistema

- **Frontend:** http://localhost:3000
- **API docs:** http://localhost:8000/docs
- **RabbitMQ Management:** http://localhost:15672 (guest/guest)

## Usuarios de prueba

| Email | Contraseña | Rol |
|---|---|---|
| admin@portal-arm.uy | Admin123! | Administrador |
| operador@empresauy.com | Oper123! | Operador |
| aduana@dna.gub.uy | Aduana123! | Aduana |
| aduana.br@receita.gov.br | Aduana123! | Aduana |

## Números OEC de prueba

| Número OEC | Estado | Resultado esperado con país con acuerdo |
|---|---|---|
| OEC-UY-2024-001 | vigente | APROBADA (con BR, US, KR, IL) |
| OEC-UY-2020-099 | vencida | CERTIFICACION_VENCIDA |
| OEC-UY-2025-002 | en proceso | RECHAZADA |

Para obtener `SIN_ACUERDO`: consultar `OEC-UY-2024-001` con país `AR` (Argentina, sin acuerdo).

## Ejecutar tests

```bash
pip install -r requirements.txt
pytest tests/ -v
```

## Arquitectura

```
Frontend (React) → API (FastAPI) → PostgreSQL
                              ↓
                          RabbitMQ → Consumer (proceso independiente) → Webhook a aduana externa
                          ↑
                      Scheduler (proceso independiente)
```

6 servicios en Docker Compose: `api`, `consumer`, `scheduler`, `frontend`, `db`, `rabbitmq`.

### Formas de comunicación

1. **REST API** — comunicación principal frontend ↔ API (síncrona).
2. **RabbitMQ (Topic Exchange)** — comunicación asincrónica: la API publica eventos
   (`validacion.registrada`, `certificacion.aprobada`, `certificacion.vencida`,
   `certificacion.por_vencer`, etc.) en lugar de procesarlos en el momento. El Consumer
   los escucha y, si el país solicitante tiene un `webhook_url` configurado, le notifica
   el resultado por HTTP.
3. **GraphQL** (`POST /api/v1/graphql`, requiere token Bearer) — query alternativa de
   consulta para sistemas externos: `consultarOec(numeroOec: "...")`.

### Ejemplo de query GraphQL
```graphql
query {
  consultarOec(numeroOec: "OEC-UY-2024-001") {
    numeroOec
    estado
    operador {
      razonSocial
      pais { nombre }
    }
  }
}
```

## Administración

- `GET/POST /api/v1/admin/paises` — gestión de países (y su `webhook_url` opcional).
- `GET/POST /api/v1/admin/acuerdos-arm`, `PATCH /api/v1/admin/acuerdos-arm/{id}/estado` —
  gestión de Acuerdos ARM (activo/suspendido, con motivo).
- `GET /api/v1/admin/certificaciones-pendientes`,
  `POST /api/v1/admin/certificaciones/{id}/aprobar|rechazar` — workflow de aprobación de
  certificaciones OEC solicitadas por un operador.

## 12-Factor App: conceptos aplicados

- **Config**: toda la configuración (`DATABASE_URL`, `RABBITMQ_URL`, `SECRET_KEY`, etc.) se
  lee de variables de entorno (`app/config.py`), nunca hardcodeada en el código.
- **Dependencias declaradas explícitamente**: `requirements.txt` (backend) y
  `package.json` (frontend) fijan versiones exactas.
- **Build, release, run**: separados vía Docker (`Dockerfile` construye la imagen,
  `docker-compose.yml` la ejecuta con su configuración).
- **Procesos sin estado (stateless)**: la API no guarda sesión en memoria; toda la
  información persiste en PostgreSQL y la identidad viaja en el JWT.
- **Servicios con backing services intercambiables**: PostgreSQL y RabbitMQ se acceden
  solo por URL de conexión, pueden reemplazarse sin tocar código de la aplicación.
- **Concurrencia mediante el modelo de procesos**: `api`, `consumer` y `scheduler` son
  procesos independientes que escalan por separado (no comparten estado en memoria).
- **Logs como flujo de eventos**: los tres procesos escriben a stdout/stderr; Docker los
  centraliza en vez de escribir a archivos de log propios.

## Variables de entorno

Ver `.env.example` para las variables disponibles.
