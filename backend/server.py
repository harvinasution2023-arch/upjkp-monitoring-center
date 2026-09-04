from __future__ import annotations

import json
import logging
import mimetypes
import os
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from logging.handlers import RotatingFileHandler
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from backend.automation import run_daily_monitor
    from backend.config import load_settings
    from backend.repository import DatabaseError, DatabaseLockedError, WorkbookRepository
    from backend.services import (
        billing_progress,
        build_dashboard,
        build_demo_rows,
        create_activity,
        filter_rows,
        report_progress,
    )
    from backend.validation import validate_snapshot
else:
    from .automation import run_daily_monitor
    from .config import load_settings
    from .repository import DatabaseError, DatabaseLockedError, WorkbookRepository
    from .services import (
        billing_progress,
        build_dashboard,
        build_demo_rows,
        create_activity,
        filter_rows,
        report_progress,
    )
    from .validation import validate_snapshot


SETTINGS = load_settings()
REPOSITORY = WorkbookRepository(SETTINGS)
FRONTEND_ROOT = SETTINGS.project_root / "frontend"


def configure_logging() -> logging.Logger:
    log_dir = SETTINGS.project_root / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("upjkp")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = RotatingFileHandler(log_dir / "server.log", maxBytes=1_000_000, backupCount=5, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        logger.addHandler(handler)
        logger.addHandler(logging.StreamHandler())
    return logger


LOGGER = configure_logging()


TABLE_ROUTES = {
    "activities": ("KEGIATAN", "activity_id"),
    "reports": ("MONITORING_LAPORAN", "report_id"),
    "labs": ("ANALISIS_LAB", "lab_id"),
    "products": ("MASTER_PRODUK_JID", "product_id"),
    "jid-transactions": ("TRANSAKSI_JID", "transaction_id"),
    "billing": ("PENAGIHAN", "billing_id"),
    "training": ("KEGIATAN_PELATIHAN", "training_id"),
    "experts": ("TENAGA_AHLI", "expert_id"),
    "companies": ("MASTER_PERUSAHAAN", "company_id"),
    "documents": ("DOKUMEN", "document_id"),
    "notifications": ("NOTIFIKASI", "notification_id"),
    "audit": ("AUDIT_LOG", "audit_id"),
}


class AppHandler(BaseHTTPRequestHandler):
    server_version = "UPJKP/1.0"

    def log_message(self, fmt: str, *args) -> None:
        LOGGER.info("%s %s", self.address_string(), fmt % args)

    def _json(self, payload, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _error(self, message: str, status: int = 400) -> None:
        self._json({"ok": False, "error": message}, status)

    def _body(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise DatabaseError("Content-Length tidak valid") from exc
        if length > 2_000_000:
            raise DatabaseError("Payload terlalu besar")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            value = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise DatabaseError("Body JSON tidak valid") from exc
        if not isinstance(value, dict):
            raise DatabaseError("Body harus berupa objek JSON")
        return value

    def _serve_static(self, request_path: str) -> None:
        relative = "index.html" if request_path in {"", "/"} else unquote(request_path.lstrip("/"))
        candidate = (FRONTEND_ROOT / relative).resolve()
        root = FRONTEND_ROOT.resolve()
        if root != candidate and root not in candidate.parents:
            self._error("Path tidak diizinkan", HTTPStatus.FORBIDDEN)
            return
        if not candidate.is_file():
            candidate = FRONTEND_ROOT / "index.html"
        if not candidate.is_file():
            self._error("Frontend belum tersedia", HTTPStatus.NOT_FOUND)
            return
        body = candidate.read_bytes()
        mime, _ = mimetypes.guess_type(str(candidate))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", (mime or "application/octet-stream") + ("; charset=utf-8" if mime and mime.startswith("text/") else ""))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    @staticmethod
    def _query_filters(query: dict[str, list[str]]) -> dict[str, str]:
        ignored = {"q", "page", "page_size", "year"}
        return {key: values[0] for key, values in query.items() if key not in ignored and values and values[0]}

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        query = parse_qs(parsed.query)
        try:
            if path == "/api/health":
                REPOSITORY.ensure_initialized()
                self._json(
                    {
                        "ok": True,
                        "application": "UPJKP Monitoring Center",
                        "database": SETTINGS.database_path.name,
                        "demo_mode": SETTINGS.demo_mode,
                    }
                )
                return
            if path == "/api/dashboard":
                selected = query.get("year", [""])[0]
                year = int(selected) if selected.isdigit() else None
                self._json({"ok": True, "data": build_dashboard(REPOSITORY.snapshot(), year)})
                return
            if path == "/api/validation":
                issues = validate_snapshot(REPOSITORY.snapshot())
                self._json(
                    {
                        "ok": True,
                        "data": {
                            "items": issues,
                            "total": len(issues),
                            "errors": sum(item["level"] == "ERROR" for item in issues),
                            "warnings": sum(item["level"] == "WARNING" for item in issues),
                        },
                    }
                )
                return
            if path == "/api/export":
                REPOSITORY.ensure_initialized()
                body = SETTINGS.database_path.read_bytes()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                self.send_header("Content-Disposition", f'attachment; filename="Dashboard_UPJKP_{__import__("datetime").date.today().isoformat()}.xlsx"')
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if path.startswith("/api/"):
                route = path.split("/")[2] if len(path.split("/")) > 2 else ""
                if route in TABLE_ROUTES:
                    sheet_name, _ = TABLE_ROUTES[route]
                    rows = REPOSITORY.rows(sheet_name)
                    if route == "reports":
                        rows = [report_progress(row) for row in rows]
                    elif route == "billing":
                        rows = [billing_progress(row) for row in rows]
                    payload = filter_rows(
                        rows,
                        query=query.get("q", [""])[0],
                        filters=self._query_filters(query),
                        page=int(query.get("page", ["1"])[0] or 1),
                        page_size=int(query.get("page_size", ["50"])[0] or 50),
                    )
                    self._json({"ok": True, "data": payload})
                    return
                self._error("Endpoint API tidak ditemukan", HTTPStatus.NOT_FOUND)
                return
            self._serve_static(parsed.path)
        except DatabaseLockedError as exc:
            self._error(str(exc), HTTPStatus.CONFLICT)
        except (DatabaseError, ValueError) as exc:
            LOGGER.warning("Request gagal: %s", exc)
            self._error(str(exc), HTTPStatus.BAD_REQUEST)
        except Exception as exc:
            LOGGER.exception("Kesalahan server")
            self._error(f"Kesalahan server: {exc}", HTTPStatus.INTERNAL_SERVER_ERROR)

    def do_POST(self) -> None:
        path = urlparse(self.path).path.rstrip("/")
        try:
            payload = self._body()
            if path == "/api/activities":
                created = create_activity(REPOSITORY, payload, actor=str(payload.get("actor") or "web"))
                self._json({"ok": True, "data": created}, HTTPStatus.CREATED)
                return
            if path == "/api/demo":
                counts = REPOSITORY.seed_rows(build_demo_rows(), actor="web:demo")
                self._json({"ok": True, "data": counts})
                return
            if path == "/api/monitor/run":
                result = run_daily_monitor(REPOSITORY, actor="web:manual-monitor")
                self._json({"ok": True, "data": result})
                return
            if path.startswith("/api/notifications/") and path.endswith("/read"):
                notification_id = path.split("/")[3]
                updated = REPOSITORY.update(
                    "NOTIFIKASI", "notification_id", notification_id, {"read_at": __import__("datetime").datetime.now().astimezone().isoformat(timespec="seconds")}, actor="web"
                )
                self._json({"ok": True, "data": updated})
                return
            self._error("Endpoint API tidak ditemukan", HTTPStatus.NOT_FOUND)
        except DatabaseLockedError as exc:
            self._error(str(exc), HTTPStatus.CONFLICT)
        except DatabaseError as exc:
            self._error(str(exc), HTTPStatus.BAD_REQUEST)
        except Exception as exc:
            LOGGER.exception("Kesalahan server")
            self._error(f"Kesalahan server: {exc}", HTTPStatus.INTERNAL_SERVER_ERROR)

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path.rstrip("/")
        try:
            payload = self._body()
            parts = path.split("/")
            if len(parts) == 4 and parts[1] == "api" and parts[2] in TABLE_ROUTES:
                route = parts[2]
                sheet_name, id_field = TABLE_ROUTES[route]
                updated = REPOSITORY.update(sheet_name, id_field, parts[3], payload, actor="web")
                self._json({"ok": True, "data": updated})
                return
            self._error("Endpoint API tidak ditemukan", HTTPStatus.NOT_FOUND)
        except DatabaseLockedError as exc:
            self._error(str(exc), HTTPStatus.CONFLICT)
        except DatabaseError as exc:
            self._error(str(exc), HTTPStatus.BAD_REQUEST)
        except Exception as exc:
            LOGGER.exception("Kesalahan server")
            self._error(f"Kesalahan server: {exc}", HTTPStatus.INTERNAL_SERVER_ERROR)

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path.rstrip("/")
        try:
            parts = path.split("/")
            if len(parts) == 4 and parts[1] == "api" and parts[2] in TABLE_ROUTES:
                route = parts[2]
                sheet_name, id_field = TABLE_ROUTES[route]
                archived = REPOSITORY.archive(sheet_name, id_field, parts[3], actor="web")
                self._json({"ok": True, "data": archived})
                return
            self._error("Endpoint API tidak ditemukan", HTTPStatus.NOT_FOUND)
        except DatabaseLockedError as exc:
            self._error(str(exc), HTTPStatus.CONFLICT)
        except DatabaseError as exc:
            self._error(str(exc), HTTPStatus.BAD_REQUEST)
        except Exception as exc:
            LOGGER.exception("Kesalahan server")
            self._error(f"Kesalahan server: {exc}", HTTPStatus.INTERNAL_SERVER_ERROR)


def main() -> None:
    REPOSITORY.ensure_initialized()
    server = ThreadingHTTPServer((SETTINGS.host, SETTINGS.port), AppHandler)
    LOGGER.info("UPJKP Monitoring Center aktif di http://%s:%s", SETTINGS.host, SETTINGS.port)
    print(f"UPJKP Monitoring Center aktif di http://{SETTINGS.host}:{SETTINGS.port}")
    print("Tekan Ctrl+C untuk menghentikan server.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
