import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://canary_user:canary_password@localhost:5432/canary_db"
    )

    # Security
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Google OAuth
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/google/callback")

    # Cloudflare R2
    r2_bucket_name: str = os.getenv("R2_BUCKET_NAME", "")
    r2_account_id: str = os.getenv("R2_ACCOUNT_ID", "")
    r2_access_key_id: str = os.getenv("R2_ACCESS_KEY_ID", "")
    r2_secret_access_key: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    r2_endpoint_url: str = os.getenv("R2_ENDPOINT_URL", "")

    # Application
    app_name: str = "Canary Evaluation Platform"
    app_version: str = "0.1.0"
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"

    # CORS
    allowed_origins: list = ["http://localhost:3000", "http://localhost:8000"]

    class Config:
        env_file = ".env"


settings = Settings()
