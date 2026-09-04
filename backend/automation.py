from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any

from .repository import WorkbookRepository, append_record, sheet_records, utc_now
from .services import billing_progress, number, parse_date, report_progress
from .validation import validate_snapshot


def run_daily_monitor(repository: WorkbookRepository, actor: str = "daily_monitor") -> dict[str, Any]:
    snapshot = repository.snapshot()
    today = date.today()
    candidates: list[dict[str, Any]] = []
    billing_drafts: list[dict[str, Any]] = []

    def notify(key: str, category: str, priority: str, title: str, body: str, table: str, record_id: str, route: str) -> None:
        candidates.append(
            {
                "notification_id": f"NTF-{uuid.uuid4().hex[:12].upper()}",
                "dedupe_key": key,
                "kategori": category,
                "prioritas": priority,
                "judul": title,
                "isi": body,
                "source_table": table,
                "source_id": record_id,
                "target_route": route,
                "created_at": utc_now(),
            }
        )

    billed_report_ids = {
        str(row.get("source_id"))
        for row in snapshot["PENAGIHAN"]
        if str(row.get("source_type", "")).upper() == "LAPORAN"
    }
    for row in snapshot["MONITORING_LAPORAN"]:
        progress = report_progress(row, today)
        report_id = str(row.get("report_id", ""))
        elapsed = progress["hari_berjalan"]
        if progress["status_hitung"] == "NET / RP27":
            notify(
                f"report:{report_id}:net",
                "BILLING",
                "TINGGI",
                "Laporan NET siap ditagih",
                f"{row.get('perusahaan', '')} · {row.get('kebun', '')} · {row.get('rp27', '')}",
                "MONITORING_LAPORAN",
                report_id,
                "reports",
            )
            if report_id not in billed_report_ids:
                billing_drafts.append(
                    {
                        "company_id": row.get("company_id", ""),
                        "perusahaan": row.get("perusahaan", ""),
                        "kebun": row.get("kebun", ""),
                        "source_type": "LAPORAN",
                        "source_id": report_id,
                        "nilai": 0,
                        "tanggal_siap_tagih": row.get("tanggal_net") or today.isoformat(),
                        "status": "SIAP TAGIH",
                        "pic": row.get("pic", ""),
                        "catatan": "Dibuat otomatis dari laporan NET; nilai perlu dilengkapi.",
                    }
                )
        elif elapsed in {21, 26, 29, 30} or elapsed > 30:
            milestone = str(elapsed) if elapsed in {21, 26, 29, 30} else "overdue"
            notify(
                f"report:{report_id}:deadline:{milestone}",
                "URGENT" if elapsed >= 30 else "REMINDER",
                "KRITIS" if elapsed >= 30 else "TINGGI",
                "Laporan melewati SLA" if elapsed >= 30 else f"Laporan memasuki hari ke-{elapsed}",
                f"{row.get('perusahaan', '')} · status {progress['status_hitung']} · deadline {progress['deadline']}",
                "MONITORING_LAPORAN",
                report_id,
                "reports",
            )

    for row in snapshot["PENAGIHAN"]:
        progress = billing_progress(row, today)
        if progress["status_hitung"] == "JATUH TEMPO":
            billing_id = str(row.get("billing_id", ""))
            notify(
                f"billing:{billing_id}:overdue",
                "BILLING",
                "KRITIS",
                "Invoice jatuh tempo",
                f"{row.get('perusahaan', '')} · piutang Rp {progress['piutang']:,.0f}",
                "PENAGIHAN",
                billing_id,
                "billing",
            )

    for row in snapshot["ANALISIS_LAB"]:
        sample_date = parse_date(row.get("tanggal_sampel_masuk"))
        if sample_date and str(row.get("status", "")).upper() != "SELESAI":
            age = (today - sample_date).days
            if age > 21:
                lab_id = str(row.get("lab_id", ""))
                notify(
                    f"lab:{lab_id}:age:21",
                    "LAB",
                    "TINGGI",
                    "Sampel terlalu lama diproses",
                    f"{row.get('perusahaan', '')} · {age} hari · {row.get('jumlah_kcd', 0)} KCD",
                    "ANALISIS_LAB",
                    lab_id,
                    "labs",
                )

    stock: dict[str, float] = {}
    for row in snapshot["STOK_JID"]:
        product_id = str(row.get("product_id", ""))
        mutation = str(row.get("jenis_mutasi", "")).upper()
        direction = -1 if mutation in {"PENJUALAN", "PENYESUAIAN KELUAR", "KELUAR"} else 1
        stock[product_id] = stock.get(product_id, 0) + direction * number(row.get("jumlah"))
    for row in snapshot["MASTER_PRODUK_JID"]:
        product_id = str(row.get("product_id", ""))
        available = stock.get(product_id, 0)
        minimum = number(row.get("minimum_stok"))
        if available <= minimum:
            notify(
                f"stock:{product_id}:low:{available:g}",
                "STOCK",
                "TINGGI" if available > 0 else "KRITIS",
                "Stok produk rendah",
                f"{row.get('nama', '')} · stok {available:g} · minimum {minimum:g}",
                "MASTER_PRODUK_JID",
                product_id,
                "jid",
            )

    for row in snapshot["KEGIATAN_PELATIHAN"]:
        start = parse_date(row.get("tanggal_mulai"))
        if start and today <= start <= today + timedelta(days=3):
            training_id = str(row.get("training_id", ""))
            remaining = (start - today).days
            notify(
                f"training:{training_id}:h-{remaining}",
                "TRAINING",
                "TINGGI",
                f"Pelatihan H-{remaining}",
                f"{row.get('nama_kegiatan', '')} · {row.get('perusahaan', '')}",
                "KEGIATAN_PELATIHAN",
                training_id,
                "training",
            )

    for issue in validate_snapshot(snapshot):
        if issue["table"] == "JADWAL_TENAGA_AHLI" and "Konflik" in issue["message"]:
            notify(
                f"schedule:{issue['record_id']}:conflict",
                "TRAINING",
                "KRITIS",
                "Konflik jadwal tenaga ahli",
                issue["message"],
                issue["table"],
                issue["record_id"],
                "experts",
            )

    existing_keys = {str(row.get("dedupe_key")) for row in snapshot["NOTIFIKASI"]}
    new_candidates = [row for row in candidates if row["dedupe_key"] not in existing_keys]
    if not new_candidates and not billing_drafts:
        return {"notifications_created": 0, "billing_drafts_created": 0, "issues": len(validate_snapshot(snapshot))}

    def mutate(workbook):
        notification_ws = workbook["NOTIFIKASI"]
        live_keys = {str(row.get("dedupe_key")) for row in sheet_records(notification_ws, include_archived=True)}
        notification_count = 0
        for row in new_candidates:
            if row["dedupe_key"] in live_keys:
                continue
            append_record(notification_ws, row)
            live_keys.add(row["dedupe_key"])
            notification_count += 1

        billing_ws = workbook["PENAGIHAN"]
        billing_rows = sheet_records(billing_ws, include_archived=True)
        live_sources = {
            str(row.get("source_id")) for row in billing_rows
            if str(row.get("source_type", "")).upper() == "LAPORAN"
        }
        highest = 0
        for row in billing_rows:
            value = str(row.get("billing_id", ""))
            if value.startswith(f"BIL-{today.year}-"):
                try:
                    highest = max(highest, int(value.rsplit("-", 1)[-1]))
                except ValueError:
                    pass
        billing_count = 0
        for row in billing_drafts:
            if str(row["source_id"]) in live_sources:
                continue
            highest += 1
            row = {
                **row,
                "billing_id": f"BIL-{today.year}-{highest:04d}",
                "created_at": utc_now(),
                "updated_at": utc_now(),
            }
            append_record(billing_ws, row)
            live_sources.add(str(row["source_id"]))
            billing_count += 1
        return {"notifications_created": notification_count, "billing_drafts_created": billing_count}

    result = repository.transaction(
        mutate,
        actor=actor,
        action="daily_monitor",
        table_name="MULTI",
        record_id=today.isoformat(),
        reason="Pemantauan harian idempotent",
    )
    result["issues"] = len(validate_snapshot(repository.snapshot()))
    return result
