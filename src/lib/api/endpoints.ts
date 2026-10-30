// One typed function per backend route (see mewshot-be README "Endpoint").

import { Platform } from 'react-native';

import { request } from './client';
import type {
  AppNotification,
  CaptureResponse,
  Cat,
  CatSort,
  Comment,
  Friend,
  FriendRequest,
  LocationSource,
  LocPrecision,
  MapMarker,
  Me,
  NearbyCat,
  Page,
  Photo,
  Post,
  Profile,
  Reaction,
  Relationship,
  ReportTarget,
  Sighting,
  TokenResponse,
  User,
  UserWithRelation,
  Visibility,
} from './types';

type PageQuery = { cursor?: string | null; limit?: number };

/** A local image to upload, e.g. an expo-image-picker asset after compression. */
export type UploadFile = { uri: string; name?: string; type?: string };

export type LocationFields = {
  lat?: number;
  lng?: number;
  label?: string;
  /** "manual" when picked on the map; it then wins over EXIF GPS on the server. */
  location_source?: Exclude<LocationSource, 'exif'>;
  seen_at?: string;
};

async function photoForm(file: UploadFile, fields: Record<string, string | number | boolean | undefined>) {
  const form = new FormData();
  const name = file.name ?? 'photo.jpg';
  if (Platform.OS === 'web') {
    // Browsers need a real Blob; picker/manipulator URIs on web are blob: or data: URLs.
    form.append('photo', await (await fetch(file.uri)).blob(), name);
  } else {
    // React Native's FormData accepts {uri, name, type} for files.
    form.append('photo', { uri: file.uri, name, type: file.type ?? 'image/jpeg' } as unknown as Blob);
  }
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) form.append(k, String(v));
  }
  return form;
}

export const authApi = {
  register: (body: { email: string; password: string; username: string; invite_code?: string }) =>
    request<TokenResponse>('/auth/register', { method: 'POST', body, auth: false }),
  /** `email` also accepts a username. */
  login: (body: { email: string; password: string }) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body, auth: false }),
  google: (body: { id_token: string; invite_code?: string }) =>
    request<TokenResponse>('/auth/google', { method: 'POST', body, auth: false }),
  logout: (refresh_token: string) =>
    request<void>('/auth/logout', { method: 'POST', body: { refresh_token }, auth: false }),
  forgotPassword: (email: string) =>
    request<{ status: string }>('/auth/password/forgot', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (body: { email: string; code: string; new_password: string }) =>
    request<void>('/auth/password/reset', { method: 'POST', body, auth: false }),
};

export const meApi = {
  get: () => request<Me>('/me'),
  update: (body: { username?: string; bio?: string }) => request<Me>('/me', { method: 'PATCH', body }),
  /** Google-only accounts send an empty password. */
  delete: (password: string) => request<void>('/me', { method: 'DELETE', body: { password } }),
  changePassword: (body: { current_password: string; new_password: string }) =>
    request<void>('/me/password', { method: 'PUT', body }),
  putAvatar: async (file: UploadFile) => request<Me>('/me/avatar', { method: 'PUT', form: await photoForm(file, {}) }),
  deleteAvatar: () => request<void>('/me/avatar', { method: 'DELETE' }),
};

export type CatInput = { name?: string; notes?: string; is_favorite?: boolean };

export const catsApi = {
  /** The cursor here is an offset, but it is passed back opaquely like every other list. */
  list: (q: PageQuery & { q?: string; sort?: CatSort } = {}) => request<Page<Cat>>('/cats', { query: q }),
  create: (body: CatInput) => request<Cat>('/cats', { method: 'POST', body }),
  get: (id: number) => request<Cat>(`/cats/${id}`),
  /** An empty string clears name or notes. */
  update: (id: number, body: CatInput) => request<Cat>(`/cats/${id}`, { method: 'PATCH', body }),
  delete: (id: number) => request<void>(`/cats/${id}`, { method: 'DELETE' }),
  merge: (id: number, intoCatId: number) =>
    request<Cat>(`/cats/${id}/merge`, { method: 'POST', body: { into_cat_id: intoCatId } }),
  setCover: (id: number, photoId: number) =>
    request<Cat>(`/cats/${id}/cover`, { method: 'PUT', body: { photo_id: photoId } }),
  photos: (id: number, q: PageQuery = {}) => request<Page<Photo>>(`/cats/${id}/photos`, { query: q }),
  uploadPhoto: async (id: number, file: UploadFile, fields: LocationFields & { caption?: string; add_sighting?: boolean } = {}) =>
    request<{ photo: Photo; sighting: Sighting | null; detected_location: unknown }>(`/cats/${id}/photos`, {
      method: 'POST',
      form: await photoForm(file, fields),
    }),
  sightings: (id: number, q: PageQuery = {}) => request<Page<Sighting>>(`/cats/${id}/sightings`, { query: q }),
  addSighting: (id: number, body: { lat?: number; lng?: number; label?: string; source?: string; seen_at?: string }) =>
    request<Sighting>(`/cats/${id}/sightings`, { method: 'POST', body }),
  nearby: (lat: number, lng: number, radius_m?: number) =>
    request<{ items: NearbyCat[] }>('/cats/nearby', { query: { lat, lng, radius_m } }),
  map: () => request<{ items: MapMarker[] }>('/map/cats'),
};

export const photosApi = {
  update: (id: number, caption: string) => request<Photo>(`/photos/${id}`, { method: 'PATCH', body: { caption } }),
  delete: (id: number) => request<void>(`/photos/${id}`, { method: 'DELETE' }),
};

export const sightingsApi = {
  update: (id: number, body: { lat?: number; lng?: number; label?: string; seen_at?: string }) =>
    request<Sighting>(`/sightings/${id}`, { method: 'PATCH', body }),
  delete: (id: number) => request<void>(`/sightings/${id}`, { method: 'DELETE' }),
};

/** Quick capture: one photo becomes a new unnamed cat (or goes to `cat_id`) plus a sighting. */
export async function capture(
  file: UploadFile,
  fields: LocationFields & { cat_id?: number; name?: string; notes?: string; caption?: string } = {},
) {
  return request<CaptureResponse>('/captures', { method: 'POST', form: await photoForm(file, fields) });
}

export const usersApi = {
  search: (q: string) => request<{ items: UserWithRelation[] }>('/users/search', { query: { q } }),
  profile: (username: string) => request<Profile>(`/users/${encodeURIComponent(username)}`),
  posts: (username: string, q: PageQuery = {}) =>
    request<Page<Post>>(`/users/${encodeURIComponent(username)}/posts`, { query: q }),
};

export const friendsApi = {
  list: (q: PageQuery = {}) => request<Page<Friend>>('/friends', { query: q }),
  remove: (userId: number) => request<void>(`/friends/${userId}`, { method: 'DELETE' }),
  requests: (direction: 'incoming' | 'outgoing') =>
    request<{ items: FriendRequest[] }>('/friends/requests', { query: { direction } }),
  /** Accepted immediately when the other user already sent a request. */
  send: (username: string) => request<Relationship>('/friends/requests', { method: 'POST', body: { username } }),
  accept: (requestId: number) => request<Relationship>(`/friends/requests/${requestId}/accept`, { method: 'POST' }),
  /** Decline an incoming request or cancel an outgoing one. */
  decline: (requestId: number) => request<void>(`/friends/requests/${requestId}`, { method: 'DELETE' }),
};

export const blocksApi = {
  list: () => request<{ items: User[] }>('/blocks'),
  block: (userId: number) => request<void>('/blocks', { method: 'POST', body: { user_id: userId } }),
  unblock: (userId: number) => request<void>(`/blocks/${userId}`, { method: 'DELETE' }),
};

export type PostInput = {
  cat_id: number;
  photo_ids: number[];
  caption?: string;
  visibility?: Visibility;
  loc_precision?: LocPrecision;
  sighting_id?: number;
};

export const postsApi = {
  feed: (q: PageQuery = {}) => request<Page<Post>>('/feed', { query: q }),
  explore: (q: PageQuery = {}) => request<Page<Post>>('/explore', { query: q }),
  create: (body: PostInput) => request<Post>('/posts', { method: 'POST', body }),
  get: (id: number) => request<Post>(`/posts/${id}`),
  update: (
    id: number,
    body: { caption?: string; visibility?: Visibility; loc_precision?: LocPrecision; comments_disabled?: boolean },
  ) => request<Post>(`/posts/${id}`, { method: 'PATCH', body }),
  delete: (id: number) => request<void>(`/posts/${id}`, { method: 'DELETE' }),
  react: (id: number, emoji: Reaction) => request<Post>(`/posts/${id}/reaction`, { method: 'PUT', body: { emoji } }),
  unreact: (id: number) => request<void>(`/posts/${id}/reaction`, { method: 'DELETE' }),
  comments: (id: number, q: PageQuery = {}) => request<Page<Comment>>(`/posts/${id}/comments`, { query: q }),
  addComment: (id: number, body: string) =>
    request<Comment>(`/posts/${id}/comments`, { method: 'POST', body: { body } }),
  deleteComment: (commentId: number) => request<void>(`/comments/${commentId}`, { method: 'DELETE' }),
};

export const notificationsApi = {
  list: (q: PageQuery = {}) => request<Page<AppNotification>>('/notifications', { query: q }),
  unreadCount: () => request<{ unread: number }>('/notifications/unread-count'),
  markRead: (ids: number[] | 'all') =>
    request<void>('/notifications/read', { method: 'POST', body: ids === 'all' ? { all: true } : { ids } }),
};

export function report(target_type: ReportTarget, target_id: number, reason: string) {
  return request<{ id: number; status: 'OPEN' }>('/reports', { method: 'POST', body: { target_type, target_id, reason } });
}
