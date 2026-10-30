#!/usr/bin/env node
// Fills a LOCAL mewshot-be with test accounts, friendships, cats and posts.
//
//   node scripts/seed-dev.mjs                 # uses EXPO_PUBLIC_API_URL from .env.local, or localhost:8080
//   API_URL=http://127.0.0.1:8080/v1 node scripts/seed-dev.mjs
//
// It refuses to run against anything but localhost, so it can never touch production.
// Safe to run again: existing accounts are signed in, and users who already have cats get no new ones.
//
// Every account signs in with its username (or email) and PASSWORD below.
// The main account is `demo`:
//   friends with dita, bima, sari  ·  raka sent demo a request  ·  demo sent nina a request  ·  joko is a stranger
// So in the app, "Teman" shows posts by demo, dita, bima and sari, and "Publik" shows every PUBLIC post,
// including raka's, nina's and joko's (their FRIENDS posts stay hidden from demo).
//
// Cat photos come from cataas.com (Cat as a Service) and are cached in the OS temp folder.

import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PASSWORD = 'meowshot-dev-123';
const EMAIL_DOMAIN = 'meowshot.test';

const PLACES = {
  suropati: { lat: -6.19951, lng: 106.83254, label: 'Taman Suropati' },
  menteng: { lat: -6.19632, lng: 106.83035, label: 'Jl. Teuku Umar, Menteng' },
  tebet: { lat: -6.23766, lng: 106.85238, label: 'Tebet Eco Park' },
  kotatua: { lat: -6.13519, lng: 106.81329, label: 'Taman Fatahillah' },
  blokm: { lat: -6.24398, lng: 106.80126, label: 'Blok M Square' },
  kemang: { lat: -6.26043, lng: 106.81326, label: 'Kemang Raya' },
  gbk: { lat: -6.21854, lng: 106.80262, label: 'GBK, Senayan' },
  sudirman: { lat: -6.20876, lng: 106.82191, label: 'Stasiun Sudirman' },
  kuningan: { lat: -6.22441, lng: 106.83187, label: 'Kuningan City' },
  santa: { lat: -6.23502, lng: 106.80866, label: 'Pasar Santa' },
  senopati: { lat: -6.23178, lng: 106.81227, label: 'Senopati' },
  cikini: { lat: -6.18985, lng: 106.83975, label: 'Taman Ismail Marzuki' },
};

// visibility: PUBLIC shows in Publik for everyone; FRIENDS only in Teman for friends.
const USERS = [
  {
    username: 'demo',
    bio: 'Akun utama untuk tes Meowshot.',
    cats: [
      { name: 'Oyen', place: 'suropati', daysAgo: 0, visibility: 'PUBLIC', caption: 'Oyen lagi santai di bawah pohon.' },
      { name: 'Mochi', place: 'menteng', daysAgo: 2, visibility: 'FRIENDS', caption: 'Mochi minta dielus terus.' },
    ],
  },
  {
    username: 'dita',
    bio: 'Tiap pagi ngasih makan kucing komplek.',
    cats: [
      { name: 'Belang', place: 'tebet', daysAgo: 1, visibility: 'PUBLIC', caption: 'Belang sarapan duluan.' },
      { name: 'Cimol', place: 'tebet', daysAgo: 3, visibility: 'FRIENDS', caption: 'Cimol tidur di atas motor.' },
    ],
  },
  {
    username: 'bima',
    bio: 'Fotografer kucing amatir.',
    cats: [
      { name: 'Item', place: 'kotatua', daysAgo: 0, visibility: 'PUBLIC', caption: 'Item jaga gerbang museum.' },
      { name: 'Kunyit', place: 'blokm', daysAgo: 5, visibility: 'FRIENDS', caption: 'Kunyit nongkrong dekat parkiran.' },
    ],
  },
  {
    username: 'sari',
    bio: 'Oyen enthusiast.',
    cats: [
      { name: 'Tompel', place: 'gbk', daysAgo: 1, visibility: 'PUBLIC', caption: 'Tompel ikut lari pagi.' },
      { name: 'Oyen Kecil', place: 'kemang', daysAgo: 4, visibility: 'FRIENDS', caption: 'Anak oyen baru kelihatan.' },
    ],
  },
  {
    username: 'raka',
    bio: 'Baru gabung.',
    cats: [
      { name: 'Si Putih', place: 'sudirman', daysAgo: 2, visibility: 'PUBLIC', caption: 'Ketemu Si Putih pas pulang kerja.' },
      { name: 'Jahe', place: 'sudirman', daysAgo: 6, visibility: 'FRIENDS', caption: 'Jahe galak tapi lucu.' },
    ],
  },
  {
    username: 'nina',
    bio: 'Kucing kantor adalah rekan kerja terbaik.',
    cats: [
      { name: 'Kopi', place: 'kuningan', daysAgo: 0, visibility: 'PUBLIC', caption: 'Kopi ikut rapat pagi.' },
      { name: 'Bos', place: 'kuningan', daysAgo: 7, visibility: 'FRIENDS', caption: 'Bos menguasai kursi direktur.' },
    ],
  },
  {
    username: 'joko',
    bio: 'Jalan-jalan sore cari kucing.',
    cats: [
      { name: 'Garong', place: 'santa', daysAgo: 1, visibility: 'PUBLIC', caption: 'Garong penguasa Pasar Santa.' },
      { name: 'Kumis', place: 'senopati', daysAgo: 3, visibility: 'FRIENDS', caption: 'Kumis malu-malu.' },
      { name: 'Abu', place: 'cikini', daysAgo: 9, visibility: 'PUBLIC', caption: 'Abu nonton pertunjukan dari luar.' },
    ],
  },
];

// [from, to]: from sends a request; listed both ways it becomes a friendship.
const REQUESTS = [
  ['demo', 'dita'], ['dita', 'demo'],
  ['demo', 'bima'], ['bima', 'demo'],
  ['sari', 'demo'], ['demo', 'sari'],
  ['dita', 'bima'], ['bima', 'dita'],
  ['raka', 'demo'], // pending: incoming for demo
  ['demo', 'nina'], // pending: outgoing from demo
];

// [who, whose post (by cat name), emoji, comment or null]. Only between people who can see the post.
const REACTIONS = [
  ['dita', 'Oyen', '😻', 'Gemes banget!'],
  ['bima', 'Oyen', '❤️', null],
  ['sari', 'Mochi', '🐾', 'Mochi favoritku.'],
  ['demo', 'Belang', '❤️', 'Belang makin gendut ya.'],
  ['demo', 'Item', '👍', null],
  ['joko', 'Item', '😹', null],
  ['bima', 'Cimol', '😹', 'Motor siapa tuh?'],
  ['demo', 'Tompel', '😻', null],
  ['nina', 'Garong', '🐾', 'Pernah ketemu juga!'],
];

// --- plumbing -------------------------------------------------------------------------------

async function apiBase() {
  if (process.env.API_URL) return process.env.API_URL;
  try {
    const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
    const match = env.match(/^EXPO_PUBLIC_API_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  return 'http://localhost:8080/v1';
}

const BASE = (await apiBase()).replace(/\/$/, '');
const host = new URL(BASE).hostname;
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
  console.error(`Refusing to seed ${BASE}: only a local backend may be seeded.`);
  process.exit(1);
}

class ApiError extends Error {
  constructor(status, code, message) {
    super(`${status} ${code}: ${message}`);
    this.status = status;
    this.code = code;
  }
}

async function call(method, path, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(BASE + path, { method, headers, body });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'unknown', data?.error?.message ?? text);
  return data;
}

async function signIn(username) {
  try {
    return await call('POST', '/auth/login', { json: { email: username, password: PASSWORD } });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
  }
  return call('POST', '/auth/register', {
    json: { email: `${username}@${EMAIL_DOMAIN}`, username, password: PASSWORD },
  });
}

const CACHE = join(tmpdir(), 'meowshot-seed-photos');

/** Distinct JPEG cat photos, downloaded once and reused on later runs. */
async function catPhotos(count) {
  await mkdir(CACHE, { recursive: true });
  const list = await (await fetch('https://cataas.com/api/cats?limit=200')).json();
  const ids = list
    .filter((c) => c.mimetype === 'image/jpeg' && !c.tags?.some((t) => /gif|text|meme/i.test(t)))
    .map((c) => c.id)
    .slice(0, count);
  if (ids.length < count) throw new Error(`cataas.com returned only ${ids.length} usable photos`);
  const files = [];
  for (const id of ids) {
    const file = join(CACHE, `${id}.jpg`);
    try {
      await access(file);
    } catch {
      const res = await fetch(`https://cataas.com/cat/${id}?width=1200`);
      const bytes = Buffer.from(await res.arrayBuffer());
      // Only keep real JPEGs (FF D8 FF); anything else would be rejected by the server anyway.
      if (!res.ok || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`photo ${id} is not a JPEG`);
      await writeFile(file, bytes);
    }
    files.push(file);
  }
  return files;
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + (days % 9), 15, 0, 0);
  return d.toISOString();
}

// --- seeding --------------------------------------------------------------------------------

console.log(`Seeding ${BASE}`);
const totalCats = USERS.reduce((n, u) => n + u.cats.length, 0);
const photos = await catPhotos(totalCats);
console.log(`  ${photos.length} cat photos ready in ${CACHE}`);

const sessions = {};
const postsByCat = {};
let photoIndex = 0;

for (const user of USERS) {
  const res = await signIn(user.username);
  const token = res.access_token;
  sessions[user.username] = token;
  await call('PATCH', '/me', { token, json: { bio: user.bio } });

  const existing = await call('GET', '/cats', { token });
  if ((existing.items ?? []).length > 0) {
    console.log(`  @${user.username}: already has cats, skipped`);
    photoIndex += user.cats.length;
  } else {
    for (const cat of user.cats) {
      const place = PLACES[cat.place];
      const form = new FormData();
      form.append('photo', new Blob([await readFile(photos[photoIndex++])], { type: 'image/jpeg' }), 'kucing.jpg');
      form.append('name', cat.name);
      form.append('lat', String(place.lat));
      form.append('lng', String(place.lng));
      form.append('label', place.label);
      form.append('location_source', 'device');
      form.append('seen_at', daysAgoIso(cat.daysAgo));
      const captured = await call('POST', '/captures', { token, form });
      await call('POST', '/posts', {
        token,
        json: {
          cat_id: captured.cat.id,
          photo_ids: [captured.photo.id],
          sighting_id: captured.sighting.id,
          caption: cat.caption,
          visibility: cat.visibility,
        },
      });
    }
    console.log(`  @${user.username}: ${user.cats.length} cats and posts`);
  }

  // Remember each post by its cat's name, for the reactions below.
  const mine = await call('GET', `/users/${user.username}/posts`, { token });
  for (const post of mine.items ?? []) postsByCat[post.cat?.name ?? ''] = post.id;
}

for (const [from, to] of REQUESTS) {
  try {
    await call('POST', '/friends/requests', { token: sessions[from], json: { username: to } });
  } catch (e) {
    if (!(e instanceof ApiError) || !['already_friends', 'already_requested'].includes(e.code)) throw e;
  }
}
console.log(`  friendships and requests done`);

for (const [who, catName, emoji, comment] of REACTIONS) {
  const postId = postsByCat[catName];
  if (!postId) continue;
  const token = sessions[who];
  await call('PUT', `/posts/${postId}/reaction`, { token, json: { emoji } });
  if (comment) {
    const existing = await call('GET', `/posts/${postId}/comments`, { token });
    if (!(existing.items ?? []).some((c) => c.body === comment)) {
      await call('POST', `/posts/${postId}/comments`, { token, json: { body: comment } });
    }
  }
}
console.log(`  reactions and comments done`);

console.log('\nAccounts (password is PASSWORD in scripts/seed-dev.mjs):');
for (const user of USERS) console.log(`  ${user.username.padEnd(5)}  ${user.username}@${EMAIL_DOMAIN}`);
