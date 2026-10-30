import { getSupabase } from "@/lib/supabase/client";
import { removePostImage, uploadPostImage } from "@/lib/storage";

export type Author = {
  id: string;
  name: string;
  headline: string;
  avatarPath: string | null;
};
export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
};
export type Post = {
  id: string;
  citySlug: string;
  domainSlug: string;
  imagePath: string | null;
  body: string;
  createdAt: string;
  author: Author;
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  editedAt: string | null;
};

export const PAGE_SIZE = 20;

type AuthorRow = {
  id: string;
  full_name: string;
  headline: string | null;
  avatar_path: string | null;
} | null;

function toAuthor(row: AuthorRow): Author {
  return {
    id: row?.id ?? "",
    name: row?.full_name ?? "Member",
    headline: row?.headline ?? "",
    avatarPath: row?.avatar_path ?? null,
  };
}

const POST_COLUMNS =
  "id, body, created_at, city_slug, domain_slug, image_path, edited_at, author:profiles(id, full_name, headline, avatar_path), comments(count), likes:post_likes(count)";

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  city_slug: string;
  domain_slug: string;
  image_path: string | null;
  edited_at: string | null;
  author: AuthorRow;
  comments: { count: number }[] | null;
  likes: { count: number }[] | null;
};

function mapPosts(rows: PostRow[], liked: Set<string>): Post[] {
  return rows.map((r) => ({
    id: r.id,
    citySlug: r.city_slug,
    domainSlug: r.domain_slug,
    imagePath: r.image_path ?? null,
    body: r.body,
    createdAt: r.created_at,
    author: toAuthor(r.author),
    commentCount: r.comments?.[0]?.count ?? 0,
    likeCount: r.likes?.[0]?.count ?? 0,
    likedByMe: liked.has(r.id),
    editedAt: r.edited_at ?? null,
  }));
}

/** Which of these posts the signed-in member has liked. */
async function likedAmong(postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const db = getSupabase();
  const { data: session } = await db.auth.getSession();
  const me = session.session?.user.id;
  if (!me) return new Set();
  const { data, error } = await db
    .from("post_likes")
    .select("post_id")
    .eq("user_id", me)
    .in("post_id", postIds);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.post_id as string));
}

async function withLikes(rows: PostRow[]): Promise<Post[]> {
  return mapPosts(rows, await likedAmong(rows.map((r) => r.id)));
}

/** One page of posts, newest first. Pass the createdAt of the last post to get the next page. */
export async function fetchPosts(
  citySlug: string,
  domainSlug: string,
  before?: string,
): Promise<Post[]> {
  let query = getSupabase()
    .from("posts")
    .select(POST_COLUMNS)
    .eq("city_slug", citySlug)
    .eq("domain_slug", domainSlug)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw error;
  return withLikes((data ?? []) as unknown as PostRow[]);
}

/** Newest posts across every community the member can read (the database enforces who that is). */
export async function fetchHomeFeed(before?: string): Promise<Post[]> {
  let query = getSupabase()
    .from("posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw error;
  return withLikes((data ?? []) as unknown as PostRow[]);
}

export async function createPost(
  userId: string,
  citySlug: string,
  domainSlug: string,
  body: string,
  imagePath: string | null = null,
): Promise<void> {
  const { error } = await getSupabase().from("posts").insert({
    city_slug: citySlug,
    domain_slug: domainSlug,
    author_id: userId,
    body: body.trim(),
    image_path: imagePath,
  });
  if (error) throw error;
}

export async function updatePost(postId: string, body: string): Promise<void> {
  const { error } = await getSupabase()
    .from("posts")
    .update({ body: body.trim() })
    .eq("id", postId);
  if (error) throw error;
}

export async function setLike(
  userId: string,
  postId: string,
  liked: boolean,
): Promise<void> {
  const db = getSupabase();
  const { error } = liked
    ? await db.from("post_likes").insert({ post_id: postId, user_id: userId })
    : await db
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
  // 23505 = already liked (double tap): the end state is what the person wanted.
  if (error && error.code !== "23505") throw error;
}

export async function deletePost(
  postId: string,
  imagePath: string | null = null,
): Promise<void> {
  const { error } = await getSupabase().from("posts").delete().eq("id", postId);
  if (error) throw error;
  if (imagePath) await removePostImage(imagePath);
}

/**
 * Post with an optional photo. If saving the post fails, the uploaded photo is removed again
 * so nothing is left behind.
 */
export async function createPostWithImage(
  userId: string,
  citySlug: string,
  domainSlug: string,
  body: string,
  file: File | null,
): Promise<void> {
  const imagePath = file
    ? await uploadPostImage(userId, citySlug, domainSlug, file)
    : null;
  try {
    await createPost(userId, citySlug, domainSlug, body, imagePath);
  } catch (err) {
    if (imagePath) await removePostImage(imagePath);
    throw err;
  }
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await getSupabase()
    .from("comments")
    .select(
      "id, body, created_at, author:profiles(id, full_name, headline, avatar_path)",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  type Row = {
    id: string;
    body: string;
    created_at: string;
    author: AuthorRow;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    author: toAuthor(r.author),
  }));
}

export async function createComment(
  userId: string,
  postId: string,
  body: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("comments")
    .insert({ post_id: postId, author_id: userId, body: body.trim() });
  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("comments")
    .delete()
    .eq("id", commentId);
  if (error) throw error;
}

/** Friendly message for a failed write. */
export function writeErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code;
  if (code === "23514")
    return "You are posting too fast. Please try again in a while.";
  if (code === "42501")
    return "You cannot post here right now. The community may not be open yet.";
  return `Something went wrong. Please try again.${code ? ` (code: ${code})` : ""}`;
}
