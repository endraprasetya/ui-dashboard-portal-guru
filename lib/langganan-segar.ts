import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const JEDA_DEBOUNCE_MS = 800
const JEDA_CADANGAN_MS = 3 * 60 * 1000

/**
 * Realtime tetap menjadi sumber pembaruan.
 * Interval cadangan (3 menit) hanya dipasang saat kanal belum berstatus SUBSCRIBED.
 * Callback perubahan di-debounce supaya beberapa event beruntun menjadi satu muat ulang.
 */
export function buatKendaliSegar(muatSenyap: () => void) {
  let hidup = true
  let idInterval: number | null = null
  let idDebounce: number | null = null

  const hentikanCadangan = () => {
    if (idInterval === null) return
    window.clearInterval(idInterval)
    idInterval = null
  }

  const mulaiCadangan = () => {
    if (!hidup || idInterval !== null) return
    idInterval = window.setInterval(() => {
      if (hidup) muatSenyap()
    }, JEDA_CADANGAN_MS)
  }

  return {
    dariRealtime() {
      if (!hidup) return
      if (idDebounce !== null) window.clearTimeout(idDebounce)
      idDebounce = window.setTimeout(() => {
        idDebounce = null
        if (hidup) muatSenyap()
      }, JEDA_DEBOUNCE_MS)
    },
    pasang(kanal: RealtimeChannel) {
      kanal.subscribe((status) => {
        if (!hidup) return
        if (status === 'SUBSCRIBED') hentikanCadangan()
        else mulaiCadangan()
      })
      return () => {
        hidup = false
        if (idDebounce !== null) window.clearTimeout(idDebounce)
        hentikanCadangan()
        void supabase.removeChannel(kanal)
      }
    },
  }
}
