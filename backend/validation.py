from __future__ import annotations

from collections import Counter
from datetime import date
from typing import Any

from .schema import SHEETS
from .services import billing_progress, number, parse_date


ID_FIELDS = {
    "MASTER_PERUSAHAAN": "company_id",
    "KEGIATAN": "activity_id",
    "MONITORING_LAPORAN": "report_id",
    "ANALISIS_LAB": "lab_id",
    "MASTER_PRODUK_JID": "product_id",
    "TRANSAKSI_JID": "transaction_id",
    "PENAGIHAN": "billing_id",
    "KEGIATAN_PELATIHAN": "training_id",
    "TENAGA_AHLI": "expert_id",
    "DOKUMEN": "document_id",
}


def validate_snapshot(snapshot: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []

    def add(level: str, table: str, record_id: str, message: str) -> None:
        issues.append({"level": level, "table": table, "record_id": record_id, "message": message})

    for table, id_field in ID_FIELDS.items():
        values = [str(row.get(id_field, "")).strip() for row in snapshot.get(table, [])]
        for value, count in Counter(values).items():
            if not value:
                add("ERROR", table, "", f"{id_field} kosong")
            elif count > 1:
                add("ERROR", table, value, f"ID duplikat ditemukan {count} kali")

    company_ids = {str(row.get("company_id")) for row in snapshot.get("MASTER_PERUSAHAAN", [])}
    activity_ids = {str(row.get("activity_id")) for row in snapshot.get("KEGIATAN", [])}
    report_ids = {str(row.get("report_id")) for row in snapshot.get("MONITORING_LAPORAN", [])}
    product_ids = {str(row.get("product_id")) for row in snapshot.get("MASTER_PRODUK_JID", [])}

    for table in ("KEGIATAN", "MONITORING_LAPORAN", "ANALISIS_LAB", "TRANSAKSI_JID", "PENAGIHAN", "KEGIATAN_PELATIHAN"):
        id_field = ID_FIELDS.get(table, "")
        for row in snapshot.get(table, []):
            company_id = str(row.get("company_id", ""))
            if company_id and company_id not in company_ids:
                add("ERROR", table, str(row.get(id_field, "")), f"Company ID {company_id} tidak ditemukan")

    for row in snapshot.get("MONITORING_LAPORAN", []):
        record_id = str(row.get("report_id", ""))
        activity_id = str(row.get("activity_id", ""))
        if activity_id and activity_id not in activity_ids:
            add("ERROR", "MONITORING_LAPORAN", record_id, f"Activity ID {activity_id} tidak ditemukan")
        draft = parse_date(row.get("tanggal_draft_masuk"))
        net = parse_date(row.get("tanggal_net"))
        checkpoint = parse_date(row.get("tanggal_checkpoint"))
        if net and not draft:
            add("ERROR", "MONITORING_LAPORAN", record_id, "NET tercatat tanpa tanggal draft masuk")
        if draft and checkpoint and checkpoint < draft:
            add("ERROR", "MONITORING_LAPORAN", record_id, "Tanggal checkpoint lebih awal dari draft")

    for row in snapshot.get("ANALISIS_LAB", []):
        if number(row.get("jumlah_kcd")) < 0:
            add("ERROR", "ANALISIS_LAB", str(row.get("lab_id", "")), "Jumlah KCD negatif")

    stock: dict[str, float] = {}
    for row in snapshot.get("STOK_JID", []):
        product_id = str(row.get("product_id", ""))
        if product_id not in product_ids:
            add("ERROR", "STOK_JID", str(row.get("stock_id", "")), f"Product ID {product_id} tidak ditemukan")
        mutation = str(row.get("jenis_mutasi", "")).upper()
        direction = -1 if mutation in {"PENJUALAN", "PENYESUAIAN KELUAR", "KELUAR"} else 1
        stock[product_id] = stock.get(product_id, 0) + direction * number(row.get("jumlah"))
    for product_id, value in stock.items():
        if value < 0:
            add("ERROR", "STOK_JID", product_id, f"Stok negatif: {value:g}")

    for row in snapshot.get("PENAGIHAN", []):
        record_id = str(row.get("billing_id", ""))
        source_type = str(row.get("source_type", "")).upper()
        source_id = str(row.get("source_id", ""))
        if source_type in {"KEGIATAN", "PELATIHAN"} and source_id and source_id not in activity_ids:
            add("WARNING", "PENAGIHAN", record_id, f"Activity sumber {source_id} tidak ditemukan")
        if source_type == "LAPORAN" and source_id and source_id not in report_ids:
            add("ERROR", "PENAGIHAN", record_id, f"Report sumber {source_id} tidak ditemukan")
        invoice = parse_date(row.get("tanggal_invoice"))
        payment = parse_date(row.get("tanggal_pembayaran"))
        if payment and not invoice:
            add("ERROR", "PENAGIHAN", record_id, "Pembayaran tercatat tanpa tanggal invoice")
        if payment and invoice and payment < invoice:
            add("ERROR", "PENAGIHAN", record_id, "Tanggal pembayaran lebih awal dari invoice")
        if number(row.get("total_pembayaran")) > number(row.get("nilai")) > 0:
            add("WARNING", "PENAGIHAN", record_id, "Pembayaran melebihi nilai tagihan")

    schedules = snapshot.get("JADWAL_TENAGA_AHLI", [])
    for index, left in enumerate(schedules):
        left_start = parse_date(left.get("tanggal_mulai"))
        left_end = parse_date(left.get("tanggal_selesai")) or left_start
        if not left_start:
            continue
        for right in schedules[index + 1 :]:
            if str(left.get("expert_id")) != str(right.get("expert_id")):
                continue
            right_start = parse_date(right.get("tanggal_mulai"))
            right_end = parse_date(right.get("tanggal_selesai")) or right_start
            if right_start and right_end and left_end and left_start <= right_end and right_start <= left_end:
                add("WARNING", "JADWAL_TENAGA_AHLI", str(left.get("schedule_id", "")), "Konflik jadwal tenaga ahli")

    return issues
