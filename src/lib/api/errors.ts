import { ApiError } from './client';

const MESSAGES: Record<string, string> = {
  network: 'Tidak ada koneksi.',
  unauthorized: 'Email/username atau password salah.',
  account_suspended: 'Akun ditangguhkan.',
  rate_limited: 'Terlalu sering. Coba lagi nanti.',
  too_many_attempts: 'Terlalu banyak percobaan. Coba lagi nanti.',
  username_taken: 'Username sudah dipakai.',
  email_taken: 'Email sudah terdaftar.',
  invite_required: 'Kode undangan tidak valid.',
  invalid_code: 'Kode salah atau kedaluwarsa.',
  wrong_password: 'Password saat ini salah.',
  file_too_large: 'Foto terlalu besar.',
  unsupported_media: 'Format foto tidak didukung.',
  already_friends: 'Kalian sudah berteman.',
  already_requested: 'Permintaan sudah dikirim.',
  google_disabled: 'Login Google belum tersedia.',
  not_found: 'Data tidak ditemukan.',
};

/** User-facing (Indonesian) text for an error thrown by the API client. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // validation_failed messages come from the server in English but are specific; show them as-is.
    if (err.code === 'validation_failed') return err.message;
    return MESSAGES[err.code] ?? err.message;
  }
  return 'Gagal. Coba lagi.';
}
