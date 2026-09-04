from __future__ import annotations

import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

from backend.automation import run_daily_monitor
from backend.config import Settings
from backend.repository import WorkbookRepository
from backend.schema import SHEETS
from backend.services import build_dashboard, build_demo_rows, create_activity, report_progress
from backend.validation import validate_snapshot


class RepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.settings = Settings(
            project_root=root,
            database_path=root / "data" / "UPJKP_DB.xlsx",
            document_root=root / "documents",
            backup_root=root / "backup",
            host="127.0.0.1",
            port=8765,
            backup_retention=10,
            demo_mode=True,
        )
        self.repository = WorkbookRepository(self.settings)
        self.repository.ensure_initialized()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_initializes_all_sheets(self) -> None:
        snapshot = self.repository.snapshot()
        self.assertEqual(set(snapshot), set(SHEETS))
        self.assertTrue(self.settings.database_path.exists())

    def test_seed_dashboard_and_validation(self) -> None:
        self.repository.seed_rows(build_demo_rows(), actor="test")
        snapshot = self.repository.snapshot()
        dashboard = build_dashboard(snapshot, date.today().year)
        self.assertEqual(len(dashboard["subsections"]), 4)
        self.assertGreaterEqual(dashboard["kpis"]["activities"], 5)
        self.assertGreater(dashboard["kpis"]["revenue"], 0)
        errors = [item for item in validate_snapshot(snapshot) if item["level"] == "ERROR"]
        self.assertEqual(errors, [])

    def test_create_activity_creates_company_and_backup(self) -> None:
        created = create_activity(
            self.repository,
            {
                "perusahaan": "PT Uji Integrasi",
                "subbagian": "BT",
                "kategori": "BT",
                "jenis_kegiatan": "Evaluasi Lapangan",
                "tahun": date.today().year,
            },
            actor="test",
        )
        self.assertTrue(created["activity_id"].startswith(f"ACT-{date.today().year}-"))
        self.assertEqual(len(self.repository.rows("MASTER_PERUSAHAAN")), 1)
        self.assertTrue(any(self.settings.backup_root.rglob("UPJKP_DB_*.xlsx")))

    def test_report_deadline(self) -> None:
        progress = report_progress({"tanggal_draft_masuk": (date.today() - timedelta(days=30)).isoformat()})
        self.assertEqual(progress["status_deadline"], "TERLAMBAT")
        self.assertEqual(progress["hari_berjalan"], 30)

    def test_daily_monitor_is_idempotent(self) -> None:
        self.repository.seed_rows(build_demo_rows(), actor="test")
        first = run_daily_monitor(self.repository, actor="test-monitor")
        second = run_daily_monitor(self.repository, actor="test-monitor")
        self.assertGreater(first["notifications_created"], 0)
        self.assertEqual(second["notifications_created"], 0)
        self.assertEqual(second["billing_drafts_created"], 0)


if __name__ == "__main__":
    unittest.main()
