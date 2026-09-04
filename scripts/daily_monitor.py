from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.automation import run_daily_monitor
from backend.config import load_settings
from backend.repository import DatabaseError, WorkbookRepository


def main() -> int:
    settings = load_settings()
    repository = WorkbookRepository(settings)
    try:
        result = run_daily_monitor(repository)
    except DatabaseError as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 2
    print(json.dumps({"ok": True, "data": result}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
