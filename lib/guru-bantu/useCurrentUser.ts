"use client";
import { useEffect, useState } from "react";
import type { GuruUser } from "./types";
import { userDariSesi } from "./utils";

const KUNCI_SESI = "user_session";

/** Baca akun Portal Guru yang sedang login dari `localStorage.user_session`. */
export function bacaUserSesi(): GuruUser | null {
  try {
    const raw = localStorage.getItem(KUNCI_SESI);
    return userDariSesi(raw ? JSON.parse(raw) : null);
  } catch {
    return null;
  }
}

/**
 * User aktif Portal Guru: `target_id`, `nama_lengkap`, `role`
 * dari sesi login (tabel `users`).
 */
export function useCurrentUser() {
  const [user, setUser] = useState<GuruUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(bacaUserSesi());
    setLoading(false);
  }, []);

  return { user, loading };
}
