from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.config import load_settings
from backend.repository import WorkbookRepository


def main() -> None:
    settings = load_settings()
    repository = WorkbookRepository(settings)
    repository.ensure_initialized()
    print(f"Database siap: {settings.database_path}")


if __name__ == "__main__":
    main()
