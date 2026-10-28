import { getSupabase } from "@/lib/supabase/client";

export type Author = { id: string; name: string; headline: string };
export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
};
export type Post = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
  commentCount: number;
};

export const PAGE_SIZE = 20;

type AuthorRow = {
  id: string;
  full_name: string;
  headline: string | null;
} | null;

function toAuthor(row: AuthorRow): Author {
  return {
    id: row?.id ?? "",
    name: row?.full_name ?? "Member",
    headline: row?.headline ?? "",
  };
}

/** One page of posts, newest first. Pass the createdAt of the last post to get the next page. */
export async function fetchPosts(
  citySlug: string,
  domainSlug: string,
  before?: string,
): Promise<Post[]> {
  let query = getSupabase()
    .from("posts")
    .select(
      "id, body, created_at, author:profiles(id, full_name, headline), comments(count)",
    )
    .eq("city_slug", citySlug)
    .eq("domain_slug", domainSlug)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw error;
  type Row = {
    id: string;
    body: string;
    created_at: string;
    author: AuthorRow;
    comments: { count: number }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    author: toAuthor(r.author),
    commentCount: r.comments?.[0]?.count ?? 0,
  }));
}

export async function createPost(
  userId: string,
  citySlug: string,
  domainSlug: string,
  body: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("posts")
    .insert({
      city_slug: citySlug,
      domain_slug: domainSlug,
      author_id: userId,
      body: body.trim(),
    });
  if (error) throw error;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await getSupabase().from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await getSupabase()
    .from("comments")
    .select("id, body, created_at, author:profiles(id, full_name, headline)")
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
