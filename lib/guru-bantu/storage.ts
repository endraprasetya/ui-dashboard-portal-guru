import { supabase } from '@/lib/supabase'
import { BUCKET_ABSENSI, BUCKET_IZIN } from './constants'

export { BUCKET_ABSENSI, BUCKET_IZIN }

function bucketTidakAda(pesan: string) {
  return /bucket not found|404|not found/i.test(pesan)
}

function gagalRlsStorage(pesan: string) {
  return /row-level security|violates.*policy|permission denied|not authorized|403/i.test(pesan)
}

function pesanBucketBelumAda(bucket: string) {
  return (
    `Bucket Storage "${bucket}" belum ada di proyek Supabase. ` +
    `Buat bucket public dengan nama persis "${bucket}" lewat Dashboard → Storage → New bucket, ` +
    `atau jalankan skrip bucket di file supabase/guru-bantu.sql (SQL Editor).`
  )
}

function pesanRlsStorage(bucket: string, detail: string) {
  return (
    `Upload ditolak oleh kebijakan Storage (RLS) untuk bucket "${bucket}". ` +
    `Jalankan bagian policy di supabase/guru-bantu.sql agar role anon dan authenticated ` +
    `boleh INSERT dan SELECT. Detail: ${detail}`
  )
}

/**
 * Portal memakai anon key + login custom (bukan Supabase Auth).
 * Metadata bucket (getBucket/createBucket) hanya untuk service role — tidak dicek di klien.
 */
export async function pastikanBucketStorage(_bucket: string): Promise<void> {
  /* no-op: bucket harus sudah dibuat di Supabase */
}

export async function uploadFotoPresensi(
  bucket: string,
  idInduk: string,
  prefix: string,
  blob: Blob,
): Promise<string> {
  await pastikanBucketStorage(bucket)
  const webp = blob.type === 'image/webp'
  const ext = webp ? 'webp' : 'jpg'
  const contentType = blob.type || (webp ? 'image/webp' : 'image/jpeg')
  const path = `${idInduk}/${prefix}_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType,
    upsert: false,
  })

  if (error) {
    const msg = error.message || String(error)
    if (bucketTidakAda(msg)) {
      throw new Error(pesanBucketBelumAda(bucket))
    }
    if (gagalRlsStorage(msg)) {
      throw new Error(pesanRlsStorage(bucket, msg))
    }
    throw error
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
