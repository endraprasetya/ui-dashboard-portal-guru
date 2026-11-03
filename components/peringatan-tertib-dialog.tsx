"use client";

/** Peringatan di atas modal Beri Nilai — menutup dialog ini tidak menutup modal induk. */
export function PeringatanTertibDialog({
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
      aria-labelledby="judul-peringatan-tertib"
      aria-describedby="teks-peringatan-tertib"
      onClick={onTutup}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="judul-peringatan-tertib" className="text-base font-bold text-slate-900">
          Perhatian
        </h4>
        <p id="teks-peringatan-tertib" className="mt-2 text-sm leading-relaxed text-slate-700">
          {pesan}
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onTutup}
            className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
