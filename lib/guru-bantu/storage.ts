import { supabase } from '@/lib/supabase'
import { BUCKET_ABSENSI, BUCKET_IZIN } from './constants'

export { BUCKET_ABSENSI, BUCKET_IZIN }

const bucketSiap = new Set<string>()

function bucketTidakAda(pesan: string) {
  return /bucket not found|404|not found/i.test(pesan)
}

function pesanBucketBelumAda(bucket: string) {
  return (
    `Bucket Storage "${bucket}" belum ada di proyek Supabase. ` +
    `Buat bucket public dengan nama persis "${bucket}" lewat Dashboard → Storage → New bucket, ` +
    `atau jalankan skrip bucket di file supabase/guru-bantu.sql (SQL Editor).`
  )
}

/** Cek bucket ada; coba buat otomatis jika API mengizinkan (service role / izin admin). */
export async function pastikanBucketStorage(bucket: string): Promise<void> {
  if (bucketSiap.has(bucket)) return

  const { data, error } = await supabase.storage.getBucket(bucket)
  if (data?.id) {
    bucketSiap.add(bucket)
    return
  }

  const pesanAwal = String(error?.message || '')
  if (!bucketTidakAda(pesanAwal) && error) {
    throw error
  }

  const { error: buat } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  })

  if (!buat) {
    bucketSiap.add(bucket)
    return
  }

  if (/already exists|duplicate/i.test(buat.message)) {
    bucketSiap.add(bucket)
    return
  }

  throw new Error(pesanBucketBelumAda(bucket))
}

export async function uploadFotoPresensi(
  bucket: string,
  idInduk: string,
  prefix: string,
  blob: Blob,
): Promise<string> {
  await pastikanBucketStorage(bucket)
  const path = `${idInduk}/${prefix}_${Date.now()}.jpg`
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })

  if (error) {
    if (bucketTidakAda(error.message)) {
      throw new Error(pesanBucketBelumAda(bucket))
    }
    throw error
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
