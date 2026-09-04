from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _load_env_file(path: Path) -> None:
    """Load a small .env file without an external dependency."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _resolve_path(value: str | None, default: Path) -> Path:
    if not value:
        return default.resolve()
    candidate = Path(os.path.expandvars(value)).expanduser()
    if not candidate.is_absolute():
        candidate = PROJECT_ROOT / candidate
    return candidate.resolve()


@dataclass(frozen=True)
class Settings:
    project_root: Path
    database_path: Path
    document_root: Path
    backup_root: Path
    host: str
    port: int
    backup_retention: int
    demo_mode: bool


def load_settings() -> Settings:
    _load_env_file(PROJECT_ROOT / ".env")

    database_value = os.getenv("ONEDRIVE_DATABASE_PATH")
    database_path = _resolve_path(database_value, PROJECT_ROOT / "data" / "UPJKP_DB.xlsx")
    if database_path.suffix.lower() not in {".xlsx", ".xlsm"}:
        database_path = database_path / "UPJKP_DB.xlsx"

    document_root = _resolve_path(
        os.getenv("ONEDRIVE_DOCUMENT_PATH"), PROJECT_ROOT / "documents"
    )
    backup_root = _resolve_path(
        os.getenv("UPJKP_BACKUP_PATH"), database_path.parent / "backup"
    )

    try:
        port = int(os.getenv("UPJKP_PORT", "8765"))
    except ValueError:
        port = 8765
    try:
        retention = max(7, int(os.getenv("UPJKP_BACKUP_RETENTION", "30")))
    except ValueError:
        retention = 30

    return Settings(
        project_root=PROJECT_ROOT,
        database_path=database_path,
        document_root=document_root,
        backup_root=backup_root,
        host=os.getenv("UPJKP_HOST", "127.0.0.1"),
        port=port,
        backup_retention=retention,
        demo_mode=os.getenv("UPJKP_DEMO_MODE", "false").lower() in {"1", "true", "yes"},
    )
