from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="OPAPRIKKIE_", env_file=".env", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8000
    dev_mode: bool = False
    max_sessions: int = Field(50, ge=1)
    session_ttl_days: int = Field(7, ge=1)
    cookie_secure: bool = False
    static_dir: Path = Path("frontend/dist")
