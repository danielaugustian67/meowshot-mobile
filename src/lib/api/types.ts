// Shapes returned by the Meowshot API (mewshot-be/internal/api). Field names stay snake_case to
// match the JSON exactly. Timestamps are RFC 3339 strings.

export type Page<T> = {
  items: T[];
  next_cursor: string | null;
};

export type User = {
  id: number;
  username: string;
  /** Signed URL, expires after ~15 minutes. Do not persist. */
  avatar_url: string | null;
  bio: string;
};

export type Me = User & {
  email: string;
  role: 'user' | 'admin';
  has_password: boolean;
  google_linked: boolean;
  cat_count: number;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  is_new_user: boolean;
  user: Me;
};

export type LocationSource = 'exif' | 'device' | 'manual';

export type Sighting = {
  id: number;
  cat_id: number;
  lat: number | null;
  lng: number | null;
  label: string | null;
  source: LocationSource;
  seen_at: string;
};

export type Photo = {
  id: number;
  cat_id: number;
  post_id: number | null;
  url: string | null;
  thumb_url: string | null;
  width: number;
  height: number;
  caption: string;
  taken_at: string | null;
  created_at: string;
};

export type Cat = {
  id: number;
  name: string | null;
  notes: string | null;
  is_favorite: boolean;
  cover: { photo_id: number; url: string | null; thumb_url: string | null } | null;
  photo_count: number;
  sighting_count: number;
  last_sighting: Sighting | null;
  created_at: string;
  updated_at: string;
};

/** A cat as it shows in a friend's collection: no notes or sightings. */
export type CollectionCat = Pick<Cat, 'id' | 'name' | 'is_favorite' | 'cover' | 'photo_count'>;

export type CatSort = 'last_seen' | 'found' | 'name';

export type NearbyCat = { cat: Cat; distance_m: number };

export type CaptureResponse = {
  cat: Cat;
  photo: Photo;
  sighting: Sighting;
  suggestions: NearbyCat[];
};

export type MapMarker = {
  cat_id: number;
  name: string | null;
  thumb_url: string | null;
  lat: number;
  lng: number;
  label: string | null;
  seen_at: string;
};

export type Visibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
export type LocPrecision = 'EXACT' | 'APPROX' | 'HIDDEN';

export const REACTIONS = ['❤️', '😻', '😹', '🐾', '👍', '😢'] as const;
export type Reaction = (typeof REACTIONS)[number];

/** What the viewer may know about where the post's cat was seen; blurred on the server. */
export type PostLocation = {
  lat: number | null;
  lng: number | null;
  label: string | null;
  seen_at?: string;
};

export type Post = {
  id: number;
  author: User;
  cat: { id: number; name: string | null };
  caption: string;
  visibility: Visibility;
  loc_precision: LocPrecision;
  location: PostLocation | null;
  /** Owner only: the location other viewers see. */
  shared_location: PostLocation | null;
  photos: {
    id: number;
    url: string | null;
    thumb_url: string | null;
    width: number;
    height: number;
    caption: string;
  }[];
  reaction_counts: Partial<Record<Reaction, number>>;
  my_reaction: Reaction | null;
  comment_count: number;
  comments_disabled: boolean;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: number;
  post_id: number;
  author: User;
  body: string;
  can_delete: boolean;
  created_at: string;
};

export type RelationshipStatus = 'none' | 'friends' | 'request_sent' | 'request_received' | 'self';

export type Relationship = { status: RelationshipStatus; request_id?: number };

export type Profile = User & {
  cat_count: number;
  post_count: number;
  friend_count: number;
  relationship: Relationship;
  joined_at: string;
};

export type UserWithRelation = User & { relationship: Relationship };

export type Friend = User & { since: string; friendship_id: number };

export type FriendRequest = { id: number; user: User; created_at: string };

export type NotificationType = 'friend_request' | 'friend_accepted' | 'reaction' | 'comment';

export type AppNotification = {
  id: number;
  type: NotificationType;
  actor: User | null;
  /** Friendship id for friend_*, post id for reaction/comment. */
  ref_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type ReportTarget = 'POST' | 'COMMENT' | 'USER';
