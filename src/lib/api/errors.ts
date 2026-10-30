import { ApiError } from './client';

const MESSAGES: Record<string, string> = {
  network: 'Tidak bisa terhubung ke server. Cek koneksi internetmu.',
  unauthorized: 'Email/username atau password salah.',
  account_suspended: 'Akun ini sedang ditangguhkan.',
  rate_limited: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
  too_many_attempts: 'Terlalu banyak percobaan login gagal. Coba lagi beberapa menit lagi.',
  username_taken: 'Username sudah dipakai.',
  email_taken: 'Email sudah terdaftar.',
  invite_required: 'Butuh kode undangan yang valid untuk mendaftar.',
  invalid_code: 'Kode reset salah atau sudah kedaluwarsa.',
  wrong_password: 'Password saat ini salah.',
  file_too_large: 'Foto terlalu besar.',
  unsupported_media: 'Format foto tidak didukung (pakai JPEG, PNG, WebP, atau HEIC).',
  already_friends: 'Kalian sudah berteman.',
  already_requested: 'Permintaan pertemanan sudah dikirim.',
  google_disabled: 'Login Google belum diaktifkan di server.',
  not_found: 'Data tidak ditemukan.',
};

/** User-facing (Indonesian) text for an error thrown by the API client. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // validation_failed messages come from the server in English but are specific; show them as-is.
    if (err.code === 'validation_failed') return err.message;
    return MESSAGES[err.code] ?? err.message;
  }
  return 'Terjadi kesalahan. Coba lagi.';
}
