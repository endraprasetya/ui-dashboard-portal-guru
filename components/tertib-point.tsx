"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isKelasAlumni } from "@/lib/siswa";
import { BidangSuaraMandiri } from "@/components/input-suara";

interface Student {
  id: string;
  name: string;
  kelas: string;
  unit?: string;
}

interface Rule {
  id: string;
  label: string;
  pts: number;
  type: "pos" | "neg";
}

interface Log {
  id: number | string;
  sid: string;
  label: string;
  pts: number;
  guru: string;
  month: string;
  unit?: string;
  keterangan: string;
  ts: number;
}

const KOLOM_LOG = "id_tertib_point,id_siswa,label,pts,guru,bulan,unit,keterangan,created_at";

function normNama(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function milikPencatat(guru: string, user?: { nama_lengkap?: string; nama?: string; username?: string } | null) {
  const pencatat = normNama(guru);
  if (!pencatat || pencatat === "-") return false;
  const kandidat = [user?.nama_lengkap, user?.nama, user?.username].map((item) => normNama(item)).filter(Boolean);
  return kandidat.includes(pencatat);
}

const MODAL_PTS = 200;

const DEF_NEG: [string, number][] = [
  ["Keluar kelas tanpa ijin", 10],
  ["Membuang sampah sembarangan", 10],
  ["Terlambat datang", 10],
  ["Tidak membawa buku", 10],
  ["Tidak berseragam lengkap", 10],
  ["Tidak mengikuti pelajaran", 10],
  ["Tidak tertib di masjid", 10],
  ["Tidak tidur siang", 20],
  ["Bicara kotor", 30],
  ["Mengejek teman", 30],
  ["Tidak menghormati guru", 30],
  ["Berbohong", 40],
  ["Berkelahi", 50],
  ["Membolos", 50],
];

const DEF_POS: [string, number][] = [
  ["Menolong teman", 10],
  ["Berbagi", 10],
  ["Membantu ustadz", 10],
];

function mapSiswaRow(row: any): Student {
  return {
    id: String(row.id_siswa ?? row.id ?? ""),
    name: String(row.nama_siswa || row.name || ""),
    kelas: String(row.kelas || ""),
    unit: String(row.unit || "").trim() || undefined,
  };
}

function mapLogRow(row: any): Log {
  const created = row.created_at ? Date.parse(row.created_at) : NaN;
  return {
    id: row.id_tertib_point,
    sid: String(row.id_siswa ?? ""),
    label: String(row.label || ""),
    pts: Number(row.pts) || 0,
    guru: String(row.guru || "-"),
    month: String(row.bulan || ""),
    unit: row.unit ? String(row.unit) : undefined,
    keterangan: String(row.keterangan || "").trim(),
    ts: Number.isFinite(created) ? created : Date.now(),
  };
}

function mapRuleRow(row: any): Rule | null {
  const type = String(row.type || "").toLowerCase() === "pos" ? "pos" : String(row.type || "").toLowerCase() === "neg" ? "neg" : null;
  if (!type || !row.label) return null;
  return {
    id: String(row.id_aturan ?? row.id ?? row.label),
    label: String(row.label),
    pts: Math.abs(Number(row.pts) || 0),
    type,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printOfficialLetter(title: string, bodyHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    window.print();
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 1.6cm 1.8cm; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.45;
    }
    .kop { text-align: center; }
    .kop-ar { font-family: "Traditional Arabic", "Amiri", "Times New Roman", serif; font-size: 17px; margin: 0; }
    .kop-name { font-size: 15px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; margin: 6px 0 4px; }
    .kop-meta { font-size: 10px; line-height: 1.45; margin: 0; }
    .rule-double { border-top: 2.5px solid #000; margin-top: 8px; }
    .rule-single { border-top: 1px solid #000; margin-top: 3px; margin-bottom: 16px; }
    h1 { text-align: center; font-size: 13.5pt; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 14px; padding-bottom: 8px; border-bottom: 1px solid #000; }
    p { margin: 0 0 10px; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 16px; }
    th, td { border: 1px solid #111; padding: 6px 8px; vertical-align: top; }
    th { font-size: 11px; background: #fff; }
    .signs { width: 100%; margin-top: 42px; border-collapse: collapse; }
    .signs td { border: 0; width: 50%; text-align: center; font-size: 11px; padding: 0 12px; }
    .sign-space { height: 68px; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`);
  doc.close();

  const run = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 1200);
    }
  };

  window.setTimeout(run, 250);
}

async function fetchAllPages<T>(loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>) {
  const pageSize = 1000;
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) return { data: all, error };
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return { data: all, error: null };
}

export default function TertibPoint({ currentUser }: { currentUser?: any }) {
  const [tab, setTab] = useState<"poin" | "murid" | "aturan">("poin");
  const [bulan, setBulan] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [students, setStudents] = useState<Student[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [rulesFromDb, setRulesFromDb] = useState(false);
  const [keteranganInput, setKeteranganInput] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editKeterangan, setEditKeterangan] = useState("");

  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"give" | "report" | null>(null);

  const currentTeacherName = currentUser?.nama_lengkap || currentUser?.username || "Ustadz/Ustadzah";
  const currentUnit = String(currentUser?.unit || currentUser?.sekolah || "").trim() || "Semua Unit";

  const fetchStudents = useCallback(async () => {
    const { data, error } = await fetchAllPages((from, to) => {
      let query = supabase
        .from("siswa")
        .select("id_siswa,nama_siswa,kelas,unit")
        .not("kelas", "ilike", "%Alumni%")
        .order("nama_siswa", { ascending: true })
        .range(from, to);
      if (currentUnit && currentUnit !== "Semua Unit") query = query.eq("unit", currentUnit);
      return query;
    });
    if (error) {
      console.error("Gagal memuat siswa:", error.message);
      return;
    }
    setStudents((data || []).map(mapSiswaRow).filter((s) => s.id && s.name && !isKelasAlumni(s.kelas)));
  }, [currentUnit]);

  const fetchRules = useCallback(async () => {
    const { data, error } = await supabase
      .from("aturan_tertib_point")
      .select("id_aturan,label,pts,type")
      .order("pts", { ascending: true });

    if (error || !data || data.length === 0) {
      setRules([]);
      setRulesFromDb(false);
      return;
    }

    const mapped = data.map(mapRuleRow).filter((row): row is Rule => row !== null);
    setRules(mapped);
    setRulesFromDb(mapped.length > 0);
  }, []);

  const fetchLogs = useCallback(async (monthValue: string, unitValue: string) => {
    const { data, error } = await fetchAllPages((from, to) => {
      let query = supabase
        .from("tertib_point")
        .select(KOLOM_LOG)
        .eq("bulan", monthValue)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (unitValue && unitValue !== "Semua Unit") query = query.eq("unit", unitValue);
      return query;
    });

    if (error) {
      console.error("Gagal memuat riwayat tertib point:", error.message);
      setStatus("Gagal memuat riwayat poin: " + error.message);
      setStatusError(true);
      return;
    }

    setLogs((data || []).map(mapLogRow));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStudents(), fetchRules()]).finally(() => setLoading(false));
  }, [fetchStudents, fetchRules]);

  useEffect(() => {
    fetchLogs(bulan, currentUnit);
  }, [bulan, currentUnit, fetchLogs]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (isKelasAlumni(s.kelas)) return false
      const matchUnit =
        currentUnit === "Semua Unit" || !s.unit || s.unit.toLowerCase() === currentUnit.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchQuery = !query || s.name.toLowerCase().includes(query) || s.kelas.toLowerCase().includes(query);
      return matchUnit && matchQuery;
    });
  }, [students, currentUnit, searchQuery]);

  const ukuranHalaman = 20;
  const jumlahHalaman = Math.max(1, Math.ceil(filteredStudents.length / ukuranHalaman));
  const halamanAman = Math.min(halaman, jumlahHalaman);
  const siswaTampil = filteredStudents.slice((halamanAman - 1) * ukuranHalaman, halamanAman * ukuranHalaman);

  const allRules = useMemo(() => {
    const fromDbNeg = rules.filter((r) => r.type === "neg");
    const fromDbPos = rules.filter((r) => r.type === "pos");
    return {
      neg:
        fromDbNeg.length > 0
          ? fromDbNeg
          : DEF_NEG.map(([label, pts]) => ({ id: `d-${label}`, label, pts, type: "neg" as const })),
      pos:
        fromDbPos.length > 0
          ? fromDbPos
          : DEF_POS.map(([label, pts]) => ({ id: `d-${label}`, label, pts, type: "pos" as const })),
    };
  }, [rules]);

  const calcPoints = (sid: string) => {
    let p = 0;
    let n = 0;
    const studentLogs = logs.filter((l) => String(l.sid) === String(sid) && l.month === bulan);
    studentLogs.forEach((l) => {
      if (l.pts > 0) p += l.pts;
      else n += Math.abs(l.pts);
    });
    const lastLog = studentLogs.length > 0 ? studentLogs[0].guru : "-";
    return { p, n, sisa: MODAL_PTS + p - n, lastGuru: lastLog };
  };

  const getStatus = (sisa: number) => {
    if (sisa <= 50) return { bg: "bg-red-100 text-red-700", label: "Panggil Orang Tua" };
    if (sisa <= 100) return { bg: "bg-amber-100 text-amber-700", label: "Kirim Laporan" };
    return null;
  };

  const handleApplyRule = async (rule: { label: string; pts: number; type: "pos" | "neg" }, sid: string) => {
    if (busy) return;
    const student = students.find((s) => s.id === sid);
    const ptsVal = rule.type === "neg" ? -Math.abs(rule.pts) : Math.abs(rule.pts);
    const payload = {
      id_siswa: String(sid),
      label: rule.label,
      pts: ptsVal,
      guru: currentTeacherName,
      bulan,
      unit: student?.unit || (currentUnit !== "Semua Unit" ? currentUnit : ""),
      keterangan: keteranganInput.trim(),
    };

    setBusy(true);
    setStatus("");
    setStatusError(false);

    const { data, error } = await supabase.from("tertib_point").insert([payload]).select(KOLOM_LOG).single();

    setBusy(false);

    if (error) {
      setStatus("Gagal menyimpan poin: " + error.message);
      setStatusError(true);
      return;
    }

    if (data) setLogs((current) => [mapLogRow(data), ...current]);
    setKeteranganInput("");
    setStatus("Poin berhasil dicatat.");
  };

  const tolakBukanPencatat = () => {
    setStatus("Hanya guru yang mencatat poin ini yang dapat mengubah atau menghapusnya.");
    setStatusError(true);
  };

  const handleSimpanEdit = async (log: Log) => {
    if (busy) return;
    if (!milikPencatat(log.guru, currentUser)) {
      tolakBukanPencatat();
      return;
    }
    setBusy(true);
    setStatus("");
    setStatusError(false);
    const keterangan = editKeterangan.trim();
    const { data, error } = await supabase
      .from("tertib_point")
      .update({ keterangan })
      .eq("id_tertib_point", log.id)
      .eq("guru", log.guru)
      .select(KOLOM_LOG)
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      setStatus(error ? "Gagal memperbarui keterangan: " + error.message : "Catatan tidak dapat diubah.");
      setStatusError(true);
      return;
    }
    setLogs((current) => current.map((item) => (String(item.id) === String(log.id) ? mapLogRow(data) : item)));
    setEditId(null);
    setEditKeterangan("");
    setStatus("Keterangan poin diperbarui.");
  };

  const handleDelLog = async (log: Log) => {
    if (busy) return;
    if (!milikPencatat(log.guru, currentUser)) {
      tolakBukanPencatat();
      return;
    }
    setBusy(true);
    setStatus("");
    setStatusError(false);

    const { data, error } = await supabase
      .from("tertib_point")
      .delete()
      .eq("id_tertib_point", log.id)
      .eq("guru", log.guru)
      .select("id_tertib_point");
    setBusy(false);

    if (error || !data || data.length === 0) {
      setStatus(error ? "Gagal menghapus catatan: " + error.message : "Catatan tidak dapat dihapus.");
      setStatusError(true);
      return;
    }

    setLogs((current) => current.filter((l) => String(l.id) !== String(log.id)));
    if (editId === String(log.id)) {
      setEditId(null);
      setEditKeterangan("");
    }
    setStatus("Catatan poin dihapus.");
  };

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const formatMonthName = (mStr: string) => {
    const [y, m] = mStr.split("-");
    return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
  };

  const activeStudent = students.find((s) => s.id === activeStudentId);
  const activeStudentCalc = activeStudentId ? calcPoints(activeStudentId) : { p: 0, n: 0, sisa: MODAL_PTS, lastGuru: "-" };

  const todayLetter = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const studentLogs = activeStudent
    ? logs.filter((l) => String(l.sid) === String(activeStudent.id) && l.month === bulan)
    : [];

  const handlePrintReport = () => {
    if (!activeStudent) return;
    const isSummon = activeStudentCalc.sisa <= 50;
    const title = isSummon ? "Panggilan Orang Tua / Wali Murid" : "Laporan Tertib Point";
    const unitText = activeStudent.unit ? ` · ${escapeHtml(activeStudent.unit)}` : "";
    const bodyText = isSummon
      ? `Poin tertib ananda pada bulan ${formatMonthName(bulan)} tersisa ${activeStudentCalc.sisa} dari ${MODAL_PTS}. Mohon Bapak/Ibu hadir ke sekolah untuk berdiskusi bersama guru.`
      : `Berikut laporan tertib poin ananda bulan ${formatMonthName(bulan)}. Sisa poin saat ini ${activeStudentCalc.sisa} dari ${MODAL_PTS}. Mohon dukungan Bapak/Ibu.`;
    const logRows =
      studentLogs.length > 0
        ? studentLogs
            .map(
              (l) => `<tr>
                <td>${escapeHtml(new Date(l.ts).toLocaleDateString("id-ID"))}</td>
                <td>${escapeHtml(l.label)}${l.keterangan ? `<br><span style="font-weight:400">${escapeHtml(l.keterangan)}</span>` : ""}</td>
                <td>${escapeHtml(l.guru)}</td>
                <td style="text-align:center;font-weight:700">${l.pts > 0 ? `+${l.pts}` : l.pts}</td>
              </tr>`,
            )
            .join("")
        : `<tr><td colspan="4" style="text-align:center;font-style:italic">Tidak ada catatan pelanggaran atau kontribusi pada bulan ini.</td></tr>`;

    printOfficialLetter(
      title,
      `<div class="kop">
        <p class="kop-ar">مدرسة المدينة الابتدائية الإسلامية النموذجية</p>
        <p class="kop-name">Sekolah Dasar Islam Terpadu Al Madinah</p>
        <p class="kop-meta">SK. DIKNAS. NO : 421/5506/12/2008 | NPSN : 20337787 | NSS : 102030912035</p>
        <p class="kop-meta">Alamat : Jalan Mangu - Nogosari Km 4 Grenjeng Kenteng Nogosari Boyolali | Telp. (0271) 7470724</p>
        <p class="kop-meta">Website : sdialmadinahnogosari.sch.id | Email : sdipalmadinahnogosari@gmail.com</p>
        <div class="rule-double"></div>
        <div class="rule-single"></div>
      </div>
      <h1>${escapeHtml(title)}</h1>
      <p>Kepada Yth. Orang tua / wali dari <strong>${escapeHtml(activeStudent.name)}</strong> (Kelas ${escapeHtml(activeStudent.kelas)}${unitText}).</p>
      <p>${escapeHtml(bodyText)}</p>
      <table>
        <thead>
          <tr><th>Poin Bekal</th><th>Positif</th><th>Negatif</th><th>Sisa</th></tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center">${MODAL_PTS}</td>
            <td style="text-align:center;font-weight:700">+${activeStudentCalc.p}</td>
            <td style="text-align:center;font-weight:700">−${activeStudentCalc.n}</td>
            <td style="text-align:center;font-weight:800">${activeStudentCalc.sisa}</td>
          </tr>
        </tbody>
      </table>
      <p style="font-weight:700;margin-bottom:6px">Rincian Catatan Bulan ${escapeHtml(formatMonthName(bulan))}</p>
      <table>
        <thead>
          <tr>
            <th style="text-align:left">Tanggal</th>
            <th style="text-align:left">Uraian / Catatan</th>
            <th style="text-align:left">Guru Pencatat</th>
            <th>Poin</th>
          </tr>
        </thead>
        <tbody>${logRows}</tbody>
      </table>
      <table class="signs">
        <tr>
          <td>
            <p>Mengetahui,</p>
            <p style="font-weight:700">Orang Tua / Wali</p>
            <div class="sign-space"></div>
            <p>........................................</p>
            <p>Nama terang</p>
          </td>
          <td>
            <p>Nogosari, ${escapeHtml(todayLetter)}</p>
            <p style="font-weight:700">Guru Kelas / Tim Ketertiban</p>
            <div class="sign-space"></div>
            <p>........................................</p>
            <p>${escapeHtml(currentTeacherName)}</p>
          </td>
        </tr>
      </table>`,
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen text-slate-800">
      <style>{`
        @media print {
          @page { size: A4; margin: 1.6cm 1.8cm; }
          html, body {
            background: #fff !important;
            height: auto !important;
            overflow: visible !important;
          }
          header, nav, .no-print, .print-hidden { display: none !important; }
          .print-only { display: block !important; }
          .print-modal-overlay,
          .print-modal-sheet {
            position: static !important;
            inset: auto !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
          }
          #suratTertibPoint {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            color: #111 !important;
            background: #fff !important;
          }
          .print-table, .print-table th, .print-table td {
            border: 1px solid #111 !important;
            background: #fff !important;
            color: #111 !important;
          }
          .print-table { border-collapse: collapse !important; width: 100% !important; }
        }
      `}</style>
      <header className="no-print flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-emerald-900">Tertib Point</h1>
          <p className="text-sm text-slate-500">
            Catat kontribusi dan pelanggaran santri unit <strong>{currentUnit}</strong>. Penilai aktif:{" "}
            <strong className="text-emerald-700">{currentTeacherName}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col text-xs font-semibold text-slate-600">
            Pilih Bulan
            <input
              type="month"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="mt-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </label>
        </div>
      </header>

      {status && (
        <p className={`no-print mb-4 text-xs font-semibold ${statusError ? "text-red-600" : "text-emerald-700"}`}>{status}</p>
      )}
      {loading && <p className="no-print mb-4 text-xs text-slate-500">Memuat data santri dan aturan dari Supabase...</p>}

      <nav className="no-print flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto">
        {[
          { key: "poin", label: "Poin Santri" },
          { key: "murid", label: "Data Santri" },
          { key: "aturan", label: "Daftar Poin / Aturan" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as "poin" | "murid" | "aturan")}
            className={`px-4 py-2.5 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${
              tab === item.key ? "border-emerald-700 text-emerald-900" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "poin" && (
        <div className="no-print">
          <div className="bg-emerald-800 text-white rounded-xl p-5 flex items-center justify-between mb-6 shadow-md">
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-200 font-medium">Point Bekal Awal</p>
              <div className="text-4xl font-black">{MODAL_PTS}</div>
            </div>
            <div className="text-right text-sm text-emerald-100">
              Periode Penilaian: <br />
              <span className="font-bold text-white">{formatMonthName(bulan)}</span>
            </div>
          </div>

          <div className="mb-4">
            <input
              type="search"
              placeholder="Cari nama atau kelas santri (pencarian canggih)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHalaman(1);
              }}
              className="w-full md:w-96 bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase">
                  <th className="p-3">Nama Santri</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3 text-right">Poin Positif</th>
                  <th className="p-3 text-right">Poin Negatif</th>
                  <th className="p-3 text-right">Sisa Poin</th>
                  <th className="p-3">Guru Pencatat</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {siswaTampil.length > 0 ? (
                  siswaTampil.map((s) => {
                    const c = calcPoints(s.id);
                    const st = getStatus(c.sisa);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-medium text-slate-900">{s.name}</td>
                        <td className="p-3 text-slate-600">{s.kelas}</td>
                        <td className="p-3 text-right font-semibold text-emerald-600">+{c.p}</td>
                        <td className="p-3 text-right font-semibold text-red-600">−{c.n}</td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-base">{c.sisa}</span>
                          {st && <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${st.bg}`}>{st.label}</span>}
                        </td>
                        <td className="p-3 text-xs text-slate-600 italic">{c.lastGuru}</td>
                        <td className="p-3 text-center space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setActiveStudentId(s.id);
                              setModalType("give");
                              setEditId(null);
                              setEditKeterangan("");
                              setKeteranganInput("");
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
                          >
                            Beri Poin
                          </button>
                          {st && (
                            <button
                              onClick={() => {
                                setActiveStudentId(s.id);
                                setModalType("report");
                              }}
                              className="border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg"
                            >
                              Laporan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      Tidak ada data santri ditemukan untuk unit {currentUnit}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PagerHalaman
            halaman={halamanAman}
            jumlah={jumlahHalaman}
            onSebelumnya={() => setHalaman((nilai) => Math.max(1, nilai - 1))}
            onBerikutnya={() => setHalaman((nilai) => nilai + 1)}
          />
        </div>
      )}

      {tab === "murid" && (
        <div className="no-print bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">
            Data Santri Unit {currentUnit} ({filteredStudents.length})
          </h3>
          <div className="space-y-3">
            {siswaTampil.map((s) => (
              <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-medium">
                  {s.name} <span className="text-xs text-slate-500">· Kelas {s.kelas}</span>
                </span>
              </div>
            ))}
          </div>
          <PagerHalaman
            halaman={halamanAman}
            jumlah={jumlahHalaman}
            onSebelumnya={() => setHalaman((nilai) => Math.max(1, nilai - 1))}
            onBerikutnya={() => setHalaman((nilai) => nilai + 1)}
          />
        </div>
      )}

      {tab === "aturan" && (
        <div className="no-print space-y-3">
          <p className="text-xs text-slate-500">
            {rulesFromDb
              ? "Aturan dimuat dari tabel aturan_tertib_point."
              : "Tabel aturan_tertib_point belum tersedia/kosong. Menampilkan daftar aturan bawaan."}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-red-700">Pelanggaran (Mengurangi Poin)</h3>
              <div className="space-y-2">
                {allRules.neg.map((r) => (
                  <div key={r.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-sm">
                    <span>{r.label}</span>
                    <span className="font-bold text-red-600">−{r.pts}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-emerald-700">Kontribusi Positif (Menambah Poin)</h3>
              <div className="space-y-2">
                {allRules.pos.map((r) => (
                  <div key={r.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-sm">
                    <span>{r.label}</span>
                    <span className="font-bold text-emerald-600">+{r.pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStudent && modalType && (
        <div className="print-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="print-modal-sheet bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="no-print flex justify-between items-start mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{activeStudent.name}</h3>
                <p className="text-xs text-slate-500">
                  Kelas {activeStudent.kelas} · Sisa Poin: <strong className="text-slate-900">{activeStudentCalc.sisa}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveStudentId(null);
                  setModalType(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {modalType === "give" && (
              <div>
                <p className="text-xs text-emerald-700 font-semibold mb-3">Pencatat poin saat ini: {currentTeacherName}</p>
                <label className="mb-4 block">
                  <span className="mb-1 block text-xs font-bold text-slate-700">
                    Keterangan <span className="font-normal text-slate-400">(opsional)</span>
                  </span>
                  <BidangSuaraMandiri
                    value={keteranganInput}
                    onChange={setKeteranganInput}
                    rows={2}
                    placeholder="Catatan tambahan untuk poin yang akan dicatat"
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm"
                  />
                </label>
                <h4 className="font-bold text-emerald-700 text-sm mb-2">Kontribusi Positif</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {allRules.pos.map((r) => (
                    <button
                      key={r.id}
                      disabled={busy}
                      onClick={() => handleApplyRule(r, activeStudent.id)}
                      className="flex justify-between items-center p-2.5 border border-emerald-300 hover:bg-emerald-50 rounded-lg text-emerald-800 text-xs font-semibold text-left transition disabled:opacity-50"
                    >
                      <span>{r.label}</span>
                      <span className="font-bold">+{r.pts}</span>
                    </button>
                  ))}
                </div>

                <h4 className="font-bold text-red-700 text-sm mb-2">Pelanggaran</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 max-h-60 overflow-y-auto pr-1">
                  {allRules.neg.map((r) => (
                    <button
                      key={r.id}
                      disabled={busy}
                      onClick={() => handleApplyRule(r, activeStudent.id)}
                      className="flex justify-between items-center p-2.5 border border-red-300 hover:bg-red-50 rounded-lg text-red-800 text-xs font-semibold text-left transition disabled:opacity-50"
                    >
                      <span>{r.label}</span>
                      <span className="font-bold">−{r.pts}</span>
                    </button>
                  ))}
                </div>

                <h4 className="font-bold text-slate-800 text-sm mb-2">Riwayat Bulan {formatMonthName(bulan)}</h4>
                <div className="space-y-2 mb-6">
                  {logs
                    .filter((l) => String(l.sid) === String(activeStudent.id) && l.month === bulan)
                    .map((l) => (
                      <div key={String(l.id)} className="rounded-lg bg-slate-50 p-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-medium">{l.label}</span> <span className="text-slate-400">({l.guru})</span>
                            {l.keterangan && editId !== String(l.id) && (
                              <p className="mt-1 text-slate-600">{l.keterangan}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={l.pts > 0 ? "font-bold text-emerald-600" : "font-bold text-red-600"}>
                              {l.pts > 0 ? `+${l.pts}` : l.pts}
                            </span>
                            {milikPencatat(l.guru, currentUser) && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setEditId(String(l.id));
                                    setEditKeterangan(l.keterangan);
                                  }}
                                  className="font-semibold text-sky-700 hover:underline disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDelLog(l)}
                                  className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                                >
                                  Hapus
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {editId === String(l.id) && (
                          <div className="mt-2 space-y-2">
                            <BidangSuaraMandiri
                              value={editKeterangan}
                              onChange={setEditKeterangan}
                              rows={2}
                              placeholder="Keterangan"
                              className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setEditId(null);
                                  setEditKeterangan("");
                                }}
                                className="rounded-lg border border-slate-300 px-2 py-1 font-semibold text-slate-600"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleSimpanEdit(l)}
                                className="rounded-lg bg-emerald-700 px-2 py-1 font-semibold text-white disabled:opacity-50"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setActiveStudentId(null);
                      setModalType(null);
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition"
                  >
                    Simpan & Tutup
                  </button>
                </div>
              </div>
            )}

            {modalType === "report" && (
              <div className="space-y-4 text-slate-800">
                <div id="suratTertibPoint" className="border border-slate-200 p-6 rounded-xl bg-white text-slate-900">
                  <div className="print-only hidden text-center mb-3">
                    <p className="text-[17px] leading-snug" style={{ fontFamily: "'Traditional Arabic','Amiri','Times New Roman',serif" }}>
                      مدرسة المدينة الابتدائية الإسلامية النموذجية
                    </p>
                    <h1 className="mt-1 text-[15px] font-black tracking-wide uppercase">
                      Sekolah Dasar Islam Terpadu Al Madinah
                    </h1>
                    <p className="mt-1 text-[10px] leading-4">
                      SK. DIKNAS. NO : 421/5506/12/2008 | NPSN : 20337787 | NSS : 102030912035
                    </p>
                    <p className="text-[10px] leading-4">
                      Alamat : Jalan Mangu - Nogosari Km 4 Grenjeng Kenteng Nogosari Boyolali | Telp. (0271) 7470724
                    </p>
                    <p className="text-[10px] leading-4">
                      Website : sdialmadinahnogosari.sch.id | Email : sdipalmadinahnogosari@gmail.com
                    </p>
                    <div className="mt-2 border-t-2 border-black" />
                    <div className="mt-[3px] border-t border-black" />
                  </div>

                  <h2 className="text-center text-base font-black uppercase tracking-wide border-b border-slate-300 pb-2 mb-4 print:border-black">
                    {activeStudentCalc.sisa <= 50 ? "Panggilan Orang Tua / Wali Murid" : "Laporan Tertib Point"}
                  </h2>
                  <p className="text-sm mb-3 leading-6">
                    Kepada Yth. Orang tua / wali dari <strong>{activeStudent.name}</strong> (Kelas {activeStudent.kelas}
                    {activeStudent.unit ? ` · ${activeStudent.unit}` : ""}).
                  </p>
                  <p className="text-sm mb-4 leading-6">
                    {activeStudentCalc.sisa <= 50
                      ? `Poin tertib ananda pada bulan ${formatMonthName(bulan)} tersisa ${activeStudentCalc.sisa} dari ${MODAL_PTS}. Mohon Bapak/Ibu hadir ke sekolah untuk berdiskusi bersama guru.`
                      : `Berikut laporan tertib poin ananda bulan ${formatMonthName(bulan)}. Sisa poin saat ini ${activeStudentCalc.sisa} dari ${MODAL_PTS}. Mohon dukungan Bapak/Ibu.`}
                  </p>

                  <table className="print-table w-full text-sm border-collapse border border-black mb-6">
                    <thead>
                      <tr>
                        <th className="border border-black p-2">Poin Bekal</th>
                        <th className="border border-black p-2">Positif</th>
                        <th className="border border-black p-2">Negatif</th>
                        <th className="border border-black p-2">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-2 text-center">{MODAL_PTS}</td>
                        <td className="border border-black p-2 text-center font-semibold">+{activeStudentCalc.p}</td>
                        <td className="border border-black p-2 text-center font-semibold">−{activeStudentCalc.n}</td>
                        <td className="border border-black p-2 text-center font-bold">{activeStudentCalc.sisa}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="font-bold text-sm text-slate-900 mb-2">Rincian Catatan Bulan {formatMonthName(bulan)}</h4>
                  <table className="print-table w-full text-xs border-collapse border border-black">
                    <thead>
                      <tr>
                        <th className="border border-black p-2 text-left">Tanggal</th>
                        <th className="border border-black p-2 text-left">Uraian / Catatan</th>
                        <th className="border border-black p-2 text-left">Guru Pencatat</th>
                        <th className="border border-black p-2 text-center">Poin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentLogs.length > 0 ? (
                        studentLogs.map((l) => (
                          <tr key={String(l.id)}>
                            <td className="border border-black p-2">{new Date(l.ts).toLocaleDateString("id-ID")}</td>
                            <td className="border border-black p-2 font-medium">
                              {l.label}
                              {l.keterangan ? <span className="mt-1 block font-normal">{l.keterangan}</span> : null}
                            </td>
                            <td className="border border-black p-2">{l.guru}</td>
                            <td className="border border-black p-2 text-center font-bold">
                              {l.pts > 0 ? `+${l.pts}` : l.pts}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="border border-black p-3 text-center italic">
                            Tidak ada catatan pelanggaran atau kontribusi pada bulan ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="mt-10 grid grid-cols-2 gap-10 text-center text-xs">
                    <div>
                      <p>Mengetahui,</p>
                      <p className="font-semibold">Orang Tua / Wali</p>
                      <div className="h-16" />
                      <p>........................................</p>
                      <p className="mt-1">Nama terang</p>
                    </div>
                    <div>
                      <p>Nogosari, {todayLetter}</p>
                      <p className="font-semibold">Guru Kelas / Tim Ketertiban</p>
                      <div className="h-16" />
                      <p>........................................</p>
                      <p className="mt-1">{currentTeacherName}</p>
                    </div>
                  </div>
                </div>

                <div className="no-print flex justify-end gap-2">
                  <button onClick={handlePrintReport} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    Cetak / Simpan PDF
                  </button>
                  <button onClick={() => setModalType(null)} className="border border-slate-300 px-4 py-2 rounded-lg text-sm">
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PagerHalaman({
  halaman,
  jumlah,
  onSebelumnya,
  onBerikutnya,
}: {
  halaman: number;
  jumlah: number;
  onSebelumnya: () => void;
  onBerikutnya: () => void;
}) {
  if (jumlah <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-xs">
      <button
        type="button"
        disabled={halaman <= 1}
        onClick={onSebelumnya}
        className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40"
      >
        Sebelumnya
      </button>
      <span className="font-semibold text-slate-500">
        Halaman {halaman} dari {jumlah}
      </span>
      <button
        type="button"
        disabled={halaman >= jumlah}
        onClick={onBerikutnya}
        className="rounded-lg bg-emerald-800 px-3 py-1.5 font-bold text-white disabled:opacity-40"
      >
        Berikutnya
      </button>
    </div>
  );
}
