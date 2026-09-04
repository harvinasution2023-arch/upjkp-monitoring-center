from __future__ import annotations

import math
import re
import uuid
from calendar import month_abbr
from datetime import date, datetime, timedelta
from typing import Any

from .repository import (
    DatabaseError,
    WorkbookRepository,
    append_record,
    find_record_row,
    sheet_records,
    utc_now,
)
from .schema import CATEGORY_TO_SUBBAGIAN, SUBBAGIAN


MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def parse_date(value: Any) -> date | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for candidate in (text[:10], text):
        try:
            return date.fromisoformat(candidate)
        except (TypeError, ValueError):
            continue
    return None


def number(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace("Rp", "").replace(" ", "")
    if not text:
        return 0.0
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif text.count(".") > 1:
        text = text.replace(".", "")
    elif "," in text:
        text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return 0.0


def year_of(row: dict[str, Any], *fields: str) -> int | None:
    raw_year = row.get("tahun")
    try:
        if raw_year not in (None, ""):
            return int(float(str(raw_year)))
    except ValueError:
        pass
    for field in fields:
        parsed = parse_date(row.get(field))
        if parsed:
            return parsed.year
    return None


def report_progress(row: dict[str, Any], today: date | None = None) -> dict[str, Any]:
    today = today or date.today()
    draft = parse_date(row.get("tanggal_draft_masuk"))
    net = parse_date(row.get("tanggal_net"))
    sent = parse_date(row.get("tanggal_kirim"))
    print_date = parse_date(row.get("tanggal_cetak"))
    revision = parse_date(row.get("tanggal_revisi"))
    checkpoint = str(row.get("checkpoint_terakhir") or "").strip().upper()

    if net:
        status = "NET / RP27"
    elif sent:
        status = "SELESAI"
    elif checkpoint:
        status = checkpoint
    elif print_date:
        status = "DICETAK"
    elif revision:
        status = "DIREVISI"
    elif draft:
        status = "DRAFT MASUK"
    else:
        status = "BELUM DIMULAI"

    deadline = draft + timedelta(days=30) if draft else None
    stop_date = net or sent or today
    elapsed = max(0, (stop_date - draft).days) if draft else 0
    remaining = (deadline - today).days if deadline and not (net or sent) else None

    if net or sent:
        deadline_status = "SELESAI"
    elif not draft:
        deadline_status = "BELUM DIMULAI"
    elif elapsed <= 20:
        deadline_status = "AMAN"
    elif elapsed <= 25:
        deadline_status = "PERHATIAN"
    elif elapsed <= 29:
        deadline_status = "SEGERA SELESAIKAN"
    else:
        deadline_status = "TERLAMBAT"

    progress = min(100, round((elapsed / 30) * 100)) if draft else 0
    return {
        **row,
        "status_hitung": status,
        "deadline": deadline.isoformat() if deadline else "",
        "hari_berjalan": elapsed,
        "hari_tersisa": remaining,
        "persentase_waktu": progress,
        "status_deadline": deadline_status,
    }


def billing_progress(row: dict[str, Any], today: date | None = None) -> dict[str, Any]:
    today = today or date.today()
    amount = number(row.get("nilai"))
    paid = number(row.get("total_pembayaran"))
    invoice_date = parse_date(row.get("tanggal_invoice"))
    due = parse_date(row.get("jatuh_tempo"))
    ready = parse_date(row.get("tanggal_siap_tagih"))

    if amount > 0 and paid >= amount:
        status = "LUNAS"
    elif paid > 0:
        status = "BAYAR SEBAGIAN"
    elif due and due < today:
        status = "JATUH TEMPO"
    elif invoice_date:
        status = "MENUNGGU PEMBAYARAN"
    elif ready:
        status = "SIAP TAGIH"
    else:
        status = "BELUM SIAP TAGIH"

    outstanding = max(0.0, amount - paid)
    age = max(0, (today - invoice_date).days) if invoice_date and outstanding else 0
    if age <= 30:
        aging = "0–30"
    elif age <= 60:
        aging = "31–60"
    elif age <= 90:
        aging = "61–90"
    else:
        aging = ">90"
    return {**row, "status_hitung": status, "piutang": outstanding, "umur_piutang": age, "aging": aging}


def _matches_year(row: dict[str, Any], selected_year: int | None, *date_fields: str) -> bool:
    if not selected_year:
        return True
    return year_of(row, *date_fields) == selected_year


def build_dashboard(snapshot: dict[str, list[dict[str, Any]]], year: int | None = None) -> dict[str, Any]:
    today = date.today()
    activities = [
        row for row in snapshot["KEGIATAN"]
        if _matches_year(row, year, "tanggal_surat_masuk", "tanggal_spk", "created_at")
    ]
    reports = [
        report_progress(row, today) for row in snapshot["MONITORING_LAPORAN"]
        if _matches_year(row, year, "tanggal_draft_masuk", "created_at")
    ]
    billings = [
        billing_progress(row, today) for row in snapshot["PENAGIHAN"]
        if _matches_year(row, year, "tanggal_invoice", "tanggal_siap_tagih", "created_at")
    ]
    labs = [
        row for row in snapshot["ANALISIS_LAB"]
        if _matches_year(row, year, "tanggal_sampel_masuk", "created_at")
    ]
    trainings = [
        row for row in snapshot["KEGIATAN_PELATIHAN"]
        if _matches_year(row, year, "tanggal_mulai", "created_at")
    ]
    jid_transactions = [
        row for row in snapshot["TRANSAKSI_JID"]
        if _matches_year(row, year, "tanggal", "created_at")
    ]

    total_revenue = sum(number(row.get("nilai")) for row in billings)
    total_paid = sum(number(row.get("total_pembayaran")) for row in billings)
    total_receivable = sum(row["piutang"] for row in billings)
    total_hpp = sum(number(row.get("hpp")) for row in activities)
    gross_profit = total_revenue - total_hpp
    rkap_rows = [row for row in snapshot["RKAP"] if not year or year_of(row) == year]
    total_rkap = sum(number(row.get("nilai")) for row in rkap_rows)

    report_done = sum(1 for row in reports if row["status_hitung"] in {"NET / RP27", "SELESAI"})
    report_late = sum(1 for row in reports if row["status_deadline"] == "TERLAMBAT")
    report_warning = sum(
        1 for row in reports if row["status_deadline"] in {"PERHATIAN", "SEGERA SELESAIKAN"}
    )
    net_ready_ids = {
        str(row.get("report_id")) for row in reports if row["status_hitung"] == "NET / RP27"
    }
    billed_sources = {str(row.get("source_id")) for row in billings}
    net_ready = len(net_ready_ids - billed_sources)

    kcd_total = sum(number(row.get("jumlah_kcd")) for row in labs)
    lab_active = sum(1 for row in labs if str(row.get("status", "")).upper() != "SELESAI")
    upcoming_training = sum(
        1 for row in trainings
        if (parsed := parse_date(row.get("tanggal_mulai"))) and parsed >= today
    )
    jid_revenue = sum(number(row.get("nilai")) for row in jid_transactions)

    stock_by_product: dict[str, float] = {}
    for row in snapshot["STOK_JID"]:
        product_id = str(row.get("product_id", ""))
        mutation = str(row.get("jenis_mutasi", "")).upper()
        qty = number(row.get("jumlah"))
        direction = -1 if mutation in {"PENJUALAN", "PENYESUAIAN KELUAR", "KELUAR"} else 1
        stock_by_product[product_id] = stock_by_product.get(product_id, 0) + direction * qty
    products = []
    critical_stock = 0
    for row in snapshot["MASTER_PRODUK_JID"]:
        stock = stock_by_product.get(str(row.get("product_id", "")), 0)
        minimum = number(row.get("minimum_stok"))
        if stock <= minimum:
            critical_stock += 1
        products.append({**row, "stok": stock, "kritis": stock <= minimum})

    subsection_counts = {code: 0 for code in SUBBAGIAN}
    subsection_revenue = {code: 0.0 for code in SUBBAGIAN}
    subsection_done = {code: 0 for code in SUBBAGIAN}
    for row in activities:
        code = str(row.get("subbagian") or CATEGORY_TO_SUBBAGIAN.get(str(row.get("kategori")), "ADM"))
        if code in subsection_counts:
            subsection_counts[code] += 1
            subsection_revenue[code] += number(row.get("nilai_kontrak"))
    activity_sub = {str(row.get("activity_id")): str(row.get("subbagian")) for row in activities}
    for report in reports:
        code = activity_sub.get(str(report.get("activity_id")), "")
        if code in subsection_done and report["status_hitung"] in {"NET / RP27", "SELESAI"}:
            subsection_done[code] += 1

    subsection_cards = []
    for code, label in SUBBAGIAN.items():
        total = subsection_counts[code]
        done = subsection_done[code]
        subsection_cards.append(
            {
                "code": code,
                "label": label,
                "count": total,
                "done": done,
                "completion": round(done / total * 100) if total else 0,
                "revenue": subsection_revenue[code],
            }
        )

    monthly = [{"month": MONTHS_ID[index], "revenue": 0.0, "hpp": 0.0, "rkap": 0.0} for index in range(12)]
    for row in billings:
        parsed = parse_date(row.get("tanggal_invoice") or row.get("tanggal_siap_tagih"))
        if parsed:
            monthly[parsed.month - 1]["revenue"] += number(row.get("nilai"))
    for row in activities:
        parsed = parse_date(row.get("tanggal_spk") or row.get("tanggal_surat_masuk"))
        if parsed:
            monthly[parsed.month - 1]["hpp"] += number(row.get("hpp"))
    for row in rkap_rows:
        try:
            month_index = int(float(str(row.get("bulan")))) - 1
        except ValueError:
            continue
        if 0 <= month_index < 12:
            monthly[month_index]["rkap"] += number(row.get("nilai"))

    regional_map: dict[str, dict[str, Any]] = {}
    for report in reports:
        regional = str(report.get("regional") or "Belum ditentukan")
        item = regional_map.setdefault(regional, {"regional": regional, "total": 0, "selesai": 0, "terlambat": 0})
        item["total"] += 1
        item["selesai"] += int(report["status_hitung"] in {"NET / RP27", "SELESAI"})
        item["terlambat"] += int(report["status_deadline"] == "TERLAMBAT")
    regional = []
    for item in regional_map.values():
        item["proses"] = item["total"] - item["selesai"]
        item["completion"] = round(item["selesai"] / item["total"] * 100) if item["total"] else 0
        regional.append(item)
    regional.sort(key=lambda item: item["regional"])

    attention: list[dict[str, Any]] = []
    for row in reports:
        if row["status_deadline"] in {"TERLAMBAT", "SEGERA SELESAIKAN", "PERHATIAN"}:
            priority = {"TERLAMBAT": 1, "SEGERA SELESAIKAN": 2, "PERHATIAN": 3}[row["status_deadline"]]
            attention.append(
                {
                    "priority": priority,
                    "type": "LAPORAN",
                    "title": str(row.get("perusahaan") or row.get("nama_kegiatan") or "Laporan"),
                    "detail": f"{row.get('kebun') or 'Tanpa lokasi'} · {row['status_deadline']} · hari ke-{row['hari_berjalan']}",
                    "source_id": row.get("report_id", ""),
                    "route": "reports",
                }
            )
    for row in billings:
        if row["status_hitung"] == "JATUH TEMPO":
            attention.append(
                {
                    "priority": 1,
                    "type": "BILLING",
                    "title": str(row.get("perusahaan") or "Tagihan"),
                    "detail": f"Jatuh tempo · piutang Rp {row['piutang']:,.0f}",
                    "source_id": row.get("billing_id", ""),
                    "route": "billing",
                }
            )
    for product in products:
        if product["kritis"]:
            attention.append(
                {
                    "priority": 2,
                    "type": "STOK",
                    "title": str(product.get("nama") or "Produk JID"),
                    "detail": f"Stok {product['stok']:g} · minimum {number(product.get('minimum_stok')):g}",
                    "source_id": product.get("product_id", ""),
                    "route": "jid",
                }
            )
    attention.sort(key=lambda item: (item["priority"], item["title"]))

    unread = sum(1 for row in snapshot["NOTIFIKASI"] if not row.get("read_at") and not row.get("resolved_at"))
    years = set()
    for table, fields in (
        (snapshot["KEGIATAN"], ("tanggal_surat_masuk", "created_at")),
        (snapshot["MONITORING_LAPORAN"], ("tanggal_draft_masuk", "created_at")),
        (snapshot["PENAGIHAN"], ("tanggal_invoice", "created_at")),
    ):
        for row in table:
            found = year_of(row, *fields)
            if found:
                years.add(found)
    years.add(today.year)

    return {
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "year": year,
        "years": sorted(years, reverse=True),
        "kpis": {
            "activities": len(activities),
            "reports": len(reports),
            "reports_process": len(reports) - report_done,
            "reports_done": report_done,
            "reports_warning": report_warning,
            "reports_late": report_late,
            "net_ready": net_ready,
            "completion": round(report_done / len(reports) * 100) if reports else 0,
            "revenue": total_revenue,
            "hpp": total_hpp,
            "gross_profit": gross_profit,
            "margin": round(gross_profit / total_revenue * 100, 1) if total_revenue else 0,
            "rkap": total_rkap,
            "rkap_achievement": round(total_revenue / total_rkap * 100, 1) if total_rkap else 0,
            "receivable": total_receivable,
            "paid": total_paid,
            "lab_active": lab_active,
            "kcd": kcd_total,
            "training_upcoming": upcoming_training,
            "jid_revenue": jid_revenue,
            "critical_stock": critical_stock,
            "notifications_unread": unread,
        },
        "subsections": subsection_cards,
        "monthly": monthly,
        "regional": regional,
        "attention": attention[:12],
        "recent_activities": sorted(
            activities,
            key=lambda row: str(row.get("updated_at") or row.get("created_at") or ""),
            reverse=True,
        )[:8],
        "products": products,
    }


def create_activity(repository: WorkbookRepository, payload: dict[str, Any], actor: str = "web") -> dict[str, Any]:
    company_name = str(payload.get("perusahaan", "")).strip()
    if not company_name:
        raise DatabaseError("Nama perusahaan wajib diisi")

    category = str(payload.get("kategori") or "BT").strip().upper()
    subsection = str(payload.get("subbagian") or CATEGORY_TO_SUBBAGIAN.get(category, "ADM")).strip().upper()
    if subsection not in SUBBAGIAN:
        raise DatabaseError("Subbagian tidak valid")
    selected_year = payload.get("tahun") or date.today().year
    try:
        selected_year = int(selected_year)
    except (TypeError, ValueError) as exc:
        raise DatabaseError("Tahun tidak valid") from exc

    created: dict[str, Any] = {}

    def next_sequence(ws, field: str, prefix: str) -> int:
        highest = 0
        for row in sheet_records(ws, include_archived=True):
            value = str(row.get(field, ""))
            match = re.search(r"(\d+)$", value) if value.startswith(prefix) else None
            if match:
                highest = max(highest, int(match.group(1)))
        return highest + 1

    def mutate(workbook):
        companies = workbook["MASTER_PERUSAHAAN"]
        company_rows = sheet_records(companies, include_archived=False)
        company = next((row for row in company_rows if str(row.get("nama", "")).casefold() == company_name.casefold()), None)
        now = utc_now()
        if company:
            company_id = str(company["company_id"])
        else:
            company_number = next_sequence(companies, "company_id", "PRSH-")
            company_id = f"PRSH-{company_number:04d}"
            append_record(
                companies,
                {
                    "company_id": company_id,
                    "nama": company_name,
                    "nama_singkat": company_name,
                    "jenis_instansi": payload.get("instansi", ""),
                    "regional": payload.get("regional", ""),
                    "status_aktif": "YA",
                    "created_at": now,
                    "updated_at": now,
                },
            )

        activities = workbook["KEGIATAN"]
        prefix = f"ACT-{selected_year}-"
        sequence = next_sequence(activities, "activity_id", prefix)
        activity_id = f"{prefix}{sequence:04d}"
        display_id = f"{category}-{str(payload.get('instansi') or 'UPJKP').upper()}-{sequence:04d}"
        record = {
            "activity_id": activity_id,
            "display_id": display_id,
            "company_id": company_id,
            "perusahaan": company_name,
            "subbagian": subsection,
            "kategori": category,
            "instansi": payload.get("instansi", ""),
            "jenis_kegiatan": payload.get("jenis_kegiatan", ""),
            "status_biaya": payload.get("status_biaya", "Biaya"),
            "regional": payload.get("regional", ""),
            "kebun_lokasi": payload.get("kebun_lokasi", ""),
            "tahun": selected_year,
            "tanggal_surat_masuk": payload.get("tanggal_surat_masuk", ""),
            "tanggal_spk": payload.get("tanggal_spk", ""),
            "batas_akhir": payload.get("batas_akhir", ""),
            "nilai_kontrak": number(payload.get("nilai_kontrak")),
            "hpp": number(payload.get("hpp")),
            "pic": payload.get("pic", ""),
            "status": payload.get("status", "AKTIF"),
            "catatan": payload.get("catatan", ""),
            "created_at": now,
            "updated_at": now,
            "archived_at": "",
        }
        append_record(activities, record)
        created.update(record)
        return record

    repository.transaction(
        mutate,
        actor=actor,
        action="create",
        table_name="KEGIATAN",
        record_id="AUTO",
        reason="Pencatatan kegiatan dari dashboard",
    )
    return created


def build_demo_rows(today: date | None = None) -> dict[str, list[dict[str, Any]]]:
    today = today or date.today()
    now = utc_now()

    def iso(offset: int) -> str:
        return (today + timedelta(days=offset)).isoformat()

    companies = [
        ("PRSH-0001", "PT Agro Sejahtera", "R1"),
        ("PRSH-0002", "PT Sawit Makmur", "R2"),
        ("PRSH-0003", "PT Perkebunan Nusantara", "R4P"),
        ("PRSH-0004", "PT Palma Lestari", "SW"),
    ]
    company_rows = [
        {"company_id": cid, "nama": name, "nama_singkat": name, "regional": regional, "status_aktif": "YA", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now}
        for cid, name, regional in companies
    ]
    activities = [
        {"activity_id": "ACT-DEMO-0001", "display_id": "RP-UPJKP-0001", "company_id": "PRSH-0001", "perusahaan": companies[0][1], "subbagian": "RPJID", "kategori": "RP", "jenis_kegiatan": "Rekomendasi Pemupukan 2027", "regional": "R1", "kebun_lokasi": "Kebun A", "tahun": today.year, "tanggal_surat_masuk": iso(-50), "tanggal_spk": iso(-42), "nilai_kontrak": 475_000_000, "hpp": 62_000_000, "pic": "Dewi", "status": "AKTIF", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"activity_id": "ACT-DEMO-0002", "display_id": "BT-UPJKP-0001", "company_id": "PRSH-0002", "perusahaan": companies[1][1], "subbagian": "BT", "kategori": "BT", "jenis_kegiatan": "Evaluasi TBM Kelapa Sawit", "regional": "R2", "kebun_lokasi": "Kebun Bahagia", "tahun": today.year, "tanggal_surat_masuk": iso(-28), "tanggal_spk": iso(-24), "batas_akhir": iso(8), "nilai_kontrak": 185_000_000, "hpp": 38_500_000, "pic": "Rizal", "status": "AKTIF", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"activity_id": "ACT-DEMO-0003", "display_id": "TR-UPJKP-0001", "company_id": "PRSH-0003", "perusahaan": companies[2][1], "subbagian": "PLT", "kategori": "TR", "jenis_kegiatan": "Pelatihan Panen Presisi", "regional": "R4P", "kebun_lokasi": "Medan", "tahun": today.year, "tanggal_surat_masuk": iso(-12), "nilai_kontrak": 125_000_000, "hpp": 31_000_000, "pic": "Nina", "status": "AKTIF", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"activity_id": "ACT-DEMO-0004", "display_id": "JID-UPJKP-0001", "company_id": "PRSH-0004", "perusahaan": companies[3][1], "subbagian": "RPJID", "kategori": "JID", "jenis_kegiatan": "Pengadaan Automatic Weather Station", "regional": "SW", "kebun_lokasi": "Kebun Lestari", "tahun": today.year, "tanggal_surat_masuk": iso(-18), "nilai_kontrak": 210_000_000, "hpp": 118_000_000, "pic": "Agus", "status": "AKTIF", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"activity_id": "ACT-DEMO-0005", "display_id": "ADM-UPJKP-0001", "company_id": "PRSH-0001", "perusahaan": companies[0][1], "subbagian": "ADM", "kategori": "LN", "jenis_kegiatan": "Pembaruan Kontrak Payung", "regional": "R1", "kebun_lokasi": "Kantor Pusat", "tahun": today.year, "tanggal_surat_masuk": iso(-9), "nilai_kontrak": 0, "hpp": 0, "pic": "Sari", "status": "PROSES", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
    ]
    reports = [
        {"report_id": "LAP-DEMO-0001", "activity_id": "ACT-DEMO-0001", "company_id": "PRSH-0001", "perusahaan": companies[0][1], "regional": "R1", "kebun": "Kebun A", "nama_kegiatan": "Rekomendasi Pemupukan 2027", "tahun": today.year, "workflow": "RP", "tanggal_draft_masuk": iso(-35), "checkpoint_terakhir": "KOREKTOR 2 CETAK", "korektor_terakhir": "Edi Sigit", "tanggal_checkpoint": iso(-4), "status": "KOREKTOR 2 CETAK", "pic": "Dewi", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"report_id": "LAP-DEMO-0002", "activity_id": "ACT-DEMO-0002", "company_id": "PRSH-0002", "perusahaan": companies[1][1], "regional": "R2", "kebun": "Kebun Bahagia", "nama_kegiatan": "Evaluasi TBM Kelapa Sawit", "tahun": today.year, "workflow": "UMUM", "tanggal_draft_masuk": iso(-26), "checkpoint_terakhir": "DIREVISI", "korektor_terakhir": "Josep", "tanggal_checkpoint": iso(-2), "tanggal_revisi": iso(-2), "status": "DIREVISI", "pic": "Rizal", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"report_id": "LAP-DEMO-0003", "activity_id": "ACT-DEMO-0004", "company_id": "PRSH-0004", "perusahaan": companies[3][1], "regional": "SW", "kebun": "Kebun Lestari", "nama_kegiatan": "Dokumentasi Instalasi AWS", "tahun": today.year, "workflow": "UMUM", "tanggal_draft_masuk": iso(-18), "checkpoint_terakhir": "DIKOREKSI", "korektor_terakhir": "Desra", "tanggal_checkpoint": iso(-5), "status": "DIKOREKSI", "pic": "Agus", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"report_id": "LAP-DEMO-0004", "activity_id": "ACT-DEMO-0003", "company_id": "PRSH-0003", "perusahaan": companies[2][1], "regional": "R4P", "kebun": "Medan", "nama_kegiatan": "Laporan Pelatihan Panen Presisi", "tahun": today.year, "workflow": "UMUM", "tanggal_draft_masuk": iso(-40), "tanggal_kirim": iso(-12), "tanggal_net": iso(-13), "checkpoint_terakhir": "NET / RP27", "rp27": "RP27_Pelatihan_PTPN_Medan", "status": "NET / RP27", "pic": "Nina", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
    ]
    billings = [
        {"billing_id": "BIL-DEMO-0001", "company_id": "PRSH-0001", "perusahaan": companies[0][1], "source_type": "LAPORAN", "source_id": "LAP-DEMO-0001", "nilai": 475_000_000, "tanggal_siap_tagih": iso(-6), "nomor_invoice": "INV-DEMO-001", "tanggal_invoice": iso(-5), "jatuh_tempo": iso(25), "status": "MENUNGGU PEMBAYARAN", "total_pembayaran": 0, "pic": "Sari", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"billing_id": "BIL-DEMO-0002", "company_id": "PRSH-0002", "perusahaan": companies[1][1], "source_type": "KEGIATAN", "source_id": "ACT-DEMO-0002", "nilai": 185_000_000, "tanggal_siap_tagih": iso(-50), "nomor_invoice": "INV-DEMO-002", "tanggal_invoice": iso(-45), "jatuh_tempo": iso(-15), "status": "JATUH TEMPO", "total_pembayaran": 60_000_000, "pic": "Sari", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"billing_id": "BIL-DEMO-0003", "company_id": "PRSH-0003", "perusahaan": companies[2][1], "source_type": "PELATIHAN", "source_id": "ACT-DEMO-0003", "nilai": 125_000_000, "tanggal_siap_tagih": iso(-12), "nomor_invoice": "INV-DEMO-003", "tanggal_invoice": iso(-10), "jatuh_tempo": iso(20), "status": "LUNAS", "total_pembayaran": 125_000_000, "tanggal_pembayaran": iso(-2), "pic": "Sari", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
    ]
    products = [
        {"product_id": "PRD-0001", "nama": "Ombrometer", "deskripsi": "Alat ukur curah hujan manual", "spesifikasi": "Tabung presisi, dudukan lapangan", "harga": 2_500_000, "satuan": "unit", "minimum_stok": 5, "status_aktif": "YA", "created_at": now, "updated_at": now},
        {"product_id": "PRD-0002", "nama": "Gelas Ukur", "deskripsi": "Gelas ukur lapangan", "spesifikasi": "Skala permanen", "harga": 350_000, "satuan": "unit", "minimum_stok": 10, "status_aktif": "YA", "created_at": now, "updated_at": now},
        {"product_id": "PRD-0003", "nama": "Automatic Weather Station", "deskripsi": "Pemantauan cuaca otomatis", "spesifikasi": "Sensor hujan, suhu, RH, angin", "harga": 70_000_000, "satuan": "unit", "minimum_stok": 2, "status_aktif": "YA", "created_at": now, "updated_at": now},
    ]
    stocks = [
        {"stock_id": "STK-DEMO-0001", "product_id": "PRD-0001", "jenis_mutasi": "STOK AWAL", "tanggal": iso(-90), "jumlah": 18, "pic": "Agus", "catatan": "DEMO / SAMPLE DATA", "created_at": now},
        {"stock_id": "STK-DEMO-0002", "product_id": "PRD-0001", "jenis_mutasi": "PENJUALAN", "tanggal": iso(-12), "jumlah": 11, "pic": "Agus", "catatan": "DEMO / SAMPLE DATA", "created_at": now},
        {"stock_id": "STK-DEMO-0003", "product_id": "PRD-0002", "jenis_mutasi": "STOK AWAL", "tanggal": iso(-90), "jumlah": 40, "pic": "Agus", "catatan": "DEMO / SAMPLE DATA", "created_at": now},
        {"stock_id": "STK-DEMO-0004", "product_id": "PRD-0002", "jenis_mutasi": "PENJUALAN", "tanggal": iso(-16), "jumlah": 12, "pic": "Agus", "catatan": "DEMO / SAMPLE DATA", "created_at": now},
        {"stock_id": "STK-DEMO-0005", "product_id": "PRD-0003", "jenis_mutasi": "STOK AWAL", "tanggal": iso(-90), "jumlah": 4, "pic": "Agus", "catatan": "DEMO / SAMPLE DATA", "created_at": now},
        {"stock_id": "STK-DEMO-0006", "product_id": "PRD-0003", "jenis_mutasi": "PENJUALAN", "tanggal": iso(-18), "jumlah": 2, "pic": "Agus", "catatan": "DEMO / SAMPLE DATA", "created_at": now},
    ]
    jid = [
        {"transaction_id": "JID-DEMO-0001", "product_id": "PRD-0003", "company_id": "PRSH-0004", "perusahaan": companies[3][1], "activity_id": "ACT-DEMO-0004", "tanggal": iso(-18), "jumlah": 2, "harga_satuan": 70_000_000, "nilai": 140_000_000, "status_tagihan": "BELUM DITAGIH", "pic": "Agus", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"transaction_id": "JID-DEMO-0002", "product_id": "PRD-0001", "company_id": "PRSH-0001", "perusahaan": companies[0][1], "tanggal": iso(-12), "jumlah": 11, "harga_satuan": 2_500_000, "nilai": 27_500_000, "status_tagihan": "LUNAS", "pic": "Agus", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
    ]
    labs = [
        {"lab_id": "LAB-DEMO-0001", "company_id": "PRSH-0001", "perusahaan": companies[0][1], "activity_id": "ACT-DEMO-0001", "kebun": "Kebun A", "jenis_analisis": "DAUN", "jumlah_kcd": 128, "tahun": today.year, "tanggal_sampel_masuk": iso(-14), "tanggal_mulai_proses": iso(-12), "status": "PROSES", "pic": "Budi", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"lab_id": "LAB-DEMO-0002", "company_id": "PRSH-0002", "perusahaan": companies[1][1], "kebun": "Kebun Bahagia", "jenis_analisis": "TANAH", "jumlah_kcd": 74, "tahun": today.year, "tanggal_sampel_masuk": iso(-31), "tanggal_selesai": iso(-3), "status": "SELESAI", "pic": "Budi", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
    ]
    trainings = [
        {"training_id": "PLT-DEMO-0001", "company_id": "PRSH-0003", "perusahaan": companies[2][1], "nama_kegiatan": "Pelatihan Panen Presisi", "lokasi": "Medan", "tanggal_mulai": iso(12), "tanggal_selesai": iso(14), "jumlah_peserta": 35, "pic": "Nina", "status": "PERSIAPAN", "billing_id": "BIL-DEMO-0003", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
        {"training_id": "PLT-DEMO-0002", "company_id": "PRSH-0004", "perusahaan": companies[3][1], "nama_kegiatan": "Pelatihan Interpretasi Data Cuaca", "lokasi": "Palembang", "tanggal_mulai": iso(28), "tanggal_selesai": iso(29), "jumlah_peserta": 24, "pic": "Nina", "status": "DIJADWALKAN", "catatan": "DEMO / SAMPLE DATA", "created_at": now, "updated_at": now},
    ]
    experts = [
        {"expert_id": "EXP-0001", "nama": "Dr. Edi Sigit", "bidang_keahlian": "Agronomi", "status_aktif": "YA", "created_at": now, "updated_at": now},
        {"expert_id": "EXP-0002", "nama": "Ir. Josep", "bidang_keahlian": "Pemupukan", "status_aktif": "YA", "created_at": now, "updated_at": now},
        {"expert_id": "EXP-0003", "nama": "Dr. Desra", "bidang_keahlian": "Tanah dan Air", "status_aktif": "YA", "created_at": now, "updated_at": now},
    ]
    souvenirs = [
        {"item_id": "SVR-0001", "nama": "Paket Seminar", "satuan": "paket", "minimum_stok": 20, "status_aktif": "YA", "created_at": now, "updated_at": now},
    ]
    souvenir_tx = [
        {"souvenir_tx_id": "SVTX-DEMO-0001", "item_id": "SVR-0001", "jenis_mutasi": "STOK AWAL", "tanggal": iso(-60), "jumlah": 42, "pic": "Nina", "catatan": "DEMO / SAMPLE DATA", "created_at": now},
    ]
    rkap = []
    for month in range(1, 13):
        rkap.extend(
            [
                {"rkap_id": f"RKAP-{today.year}-RPJID-{month:02d}", "tahun": today.year, "subbagian": "RPJID", "kategori": "RPJID", "bulan": month, "nilai": 120_000_000, "created_at": now, "updated_at": now},
                {"rkap_id": f"RKAP-{today.year}-BT-{month:02d}", "tahun": today.year, "subbagian": "BT", "kategori": "BT", "bulan": month, "nilai": 80_000_000, "created_at": now, "updated_at": now},
                {"rkap_id": f"RKAP-{today.year}-PLT-{month:02d}", "tahun": today.year, "subbagian": "PLT", "kategori": "TR", "bulan": month, "nilai": 45_000_000, "created_at": now, "updated_at": now},
            ]
        )
    return {
        "MASTER_PERUSAHAAN": company_rows,
        "KEGIATAN": activities,
        "MONITORING_LAPORAN": reports,
        "ANALISIS_LAB": labs,
        "MASTER_PRODUK_JID": products,
        "STOK_JID": stocks,
        "TRANSAKSI_JID": jid,
        "PENAGIHAN": billings,
        "KEGIATAN_PELATIHAN": trainings,
        "TENAGA_AHLI": experts,
        "MASTER_SOUVENIR": souvenirs,
        "TRANSAKSI_SOUVENIR": souvenir_tx,
        "RKAP": rkap,
    }


def filter_rows(
    rows: list[dict[str, Any]],
    *,
    query: str = "",
    filters: dict[str, str] | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict[str, Any]:
    filters = filters or {}
    normalized_query = query.casefold().strip()
    result = []
    for row in rows:
        if normalized_query and normalized_query not in " ".join(str(value) for value in row.values()).casefold():
            continue
        matched = True
        for key, expected in filters.items():
            if expected and str(row.get(key, "")).casefold() != expected.casefold():
                matched = False
                break
        if matched:
            result.append(row)
    page = max(1, page)
    page_size = min(200, max(1, page_size))
    start = (page - 1) * page_size
    return {
        "items": result[start : start + page_size],
        "total": len(result),
        "page": page,
        "page_size": page_size,
        "pages": max(1, math.ceil(len(result) / page_size)),
    }
