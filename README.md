# Meowshot Mobile

App React Native (Expo SDK 58) untuk Meowshot, "Instagram + Pokédex untuk kucing jalanan".
Backend dan PRD ada di repo `mewshot-be` (README di sana berisi daftar endpoint dan panduan integrasi mobile).

## Menjalankan

```bash
npm install
```

```bash
npx expo start
```

Tanpa konfigurasi, app memanggil API produksi `https://meowshot-api.zyros.me/v1`. Untuk backend lokal, buat `.env.local` (lihat [.env.example](.env.example)):

```
EXPO_PUBLIC_API_URL=http://localhost:8080/v1
```

`localhost` hanya jalan untuk iOS Simulator dan web. HP sungguhan dan emulator Android memakai IP LAN laptop.

Google Sign-In (`@react-native-google-signin/google-signin`) butuh development build (`npx expo run:ios` / `run:android`), tidak jalan di Expo Go. Bundle id / package: `me.zyros.meowshot`.

Sebelum commit:

```bash
npx tsc --noEmit
```

```bash
npx expo lint
```

## Struktur

| Path | Isi |
|---|---|
| `src/app/_layout.tsx` | Provider (React Query, sesi, tema) dan guard login: `(app)` hanya untuk yang sudah login, layar auth hanya untuk yang belum |
| `src/app/sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx`, `reset-password.tsx` | Alur auth. Sengaja di root, bukan di grup, supaya guard selalu punya layar tujuan |
| `src/app/(app)/_layout.tsx` | Native tabs: Feed, Explore, Foto, Kucingku, Profil (Android maksimal 5 tab) |
| `src/lib/api/client.ts` | `fetch` wrapper: Bearer token, refresh otomatis saat 401, error `ApiError` |
| `src/lib/api/endpoints.ts` | Satu fungsi bertipe per endpoint backend |
| `src/lib/api/types.ts` | Bentuk JSON dari API (snake_case, sama persis dengan backend) |
| `src/lib/api/tokens.ts` | Token di `expo-secure-store` (web: `localStorage`) |
| `src/lib/auth/session.tsx` | `useSession()` (status, signIn, signOut) dan `useMe()` |

## Aturan yang wajib diikuti

- **Refresh token sekali pakai.** Kalau token lama dipakai lagi, server mencabut semua sesi user. Selalu lewat `request()` di `client.ts`, yang membagi satu refresh untuk semua request; jangan panggil `/auth/refresh` sendiri.
- **URL foto adalah signed URL (sekitar 15 menit).** Jangan disimpan. Untuk `expo-image`, pakai `cacheKey` berbasis id (misal `photo-${id}`) supaya gambar tidak diunduh ulang setiap URL berganti.
- **GPS harus diambil sebelum kompresi.** `expo-image-manipulator` membuang EXIF, jadi ambil koordinat dari `expo-image-picker` (`exif: true`) atau `expo-location`, lalu kirim sebagai `lat`/`lng`.
- Pesan error untuk user ada di `src/lib/api/errors.ts` (`errorMessage(err)`).
