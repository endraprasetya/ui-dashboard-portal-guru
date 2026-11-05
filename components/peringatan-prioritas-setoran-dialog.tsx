"use client";

/** Notifikasi guru: siswa kemarin tidak masuk — prioritaskan setoran. */
export function PeringatanPrioritasSetoranDialog({
  pesan,
  onTutup,
}: {
  pesan: string;
  onTutup: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="judul-prioritas-setoran"
      aria-describedby="teks-prioritas-setoran"
      onClick={onTutup}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h4 id="judul-prioritas-setoran" className="text-base font-bold text-amber-900">
          Rekomendasi Prioritas Setoran
        </h4>
        <p id="teks-prioritas-setoran" className="mt-2 text-sm leading-relaxed text-slate-700">
          {pesan}
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onTutup}
            className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
