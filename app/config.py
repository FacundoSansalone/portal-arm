from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://portal:portal123@db:5432/portal_arm"
    RABBITMQ_URL: str = "amqp://guest:guest@rabbitmq:5672/"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS: lista de origenes permitidos separados por coma. "*" permite todos
    # (solo recomendable en desarrollo).
    CORS_ORIGINS: str = "*"

    # Timeout para el POST de webhook que el Consumer envia a la aduana externa.
    WEBHOOK_TIMEOUT_SEGUNDOS: int = 10

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
