"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Trash2 } from "lucide-react";
import { memberHref } from "@/modules/network/PersonRow";
import { useAuth } from "@/modules/auth/AuthProvider";
import { fetchIsAdmin, fetchStatuses } from "@/modules/admin/api";
import { inputClass } from "@/modules/auth/Field";
import { fetchMyMemberships } from "@/modules/memberships/api";
import { communityKey } from "@/modules/memberships/progress";
import {
  PAGE_SIZE,
  createComment,
  createPost,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPosts,
  writeErrorMessage,
  type Author,
  type Comment,
  type Post,
} from "./api";
import { MAX_COMMENT, MAX_POST, timeAgo, validateBody } from "./text";

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-semibold text-deep"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function AuthorLine({
  author,
  createdAt,
}: {
  author: Author;
  createdAt: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">
        {author.id ? (
          <Link
            href={memberHref(author.id)}
            className="hover:text-primary hover:underline"
          >
            {author.name}
          </Link>
        ) : (
          author.name
        )}
        <span className="ml-2 text-xs font-normal text-muted">
          {timeAgo(createdAt)}
        </span>
      </p>
      {author.headline && (
        <p className="truncate text-xs text-muted">{author.headline}</p>
      )}
    </div>
  );
}

/** Shows the community feed to members (and admins) once the community is live. */
export function CommunityFeed({
  citySlug,
  domainSlug,
}: {
  citySlug: string;
  domainSlug: string;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const key = communityKey(citySlug, domainSlug);

  const [access, setAccess] = useState<{
    live: boolean;
    canRead: boolean;
    isAdmin: boolean;
  } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      try {
        const [statuses, mine, admin] = await Promise.all([
          fetchStatuses(),
          fetchMyMemberships(userId),
          fetchIsAdmin().catch(() => false),
        ]);
        if (!active) return;
        const a = {
          live: statuses[key] === "live",
          canRead: admin || mine.includes(key),
          isAdmin: admin,
        };
        setAccess(a);
        if (a.canRead && (a.live || a.isAdmin)) {
          const first = await fetchPosts(citySlug, domainSlug);
          if (!active) return;
          setPosts(first);
          setHasMore(first.length === PAGE_SIZE);
        }
        setLoaded(true);
      } catch (err) {
        console.error("Could not load the feed", err);
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, key, citySlug, domainSlug]);

  const loadMore = useCallback(async () => {
    const last = posts[posts.length - 1];
    if (!last) return;
    try {
      const next = await fetchPosts(citySlug, domainSlug, last.createdAt);
      setPosts((p) => [...p, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      console.error("Could not load more posts", err);
    }
  }, [posts, citySlug, domainSlug]);

  async function refresh() {
    try {
      const first = await fetchPosts(citySlug, domainSlug);
      setPosts(first);
      setHasMore(first.length === PAGE_SIZE);
    } catch (err) {
      console.error("Could not refresh the feed", err);
    }
  }

  if (!userId) return null;
  if (failed)
    return (
      <p className="text-sm text-muted">
        Could not load the feed. Please refresh the page.
      </p>
    );
  if (!loaded || !access || !access.canRead) return null;

  const canPost = access.live || access.isAdmin;
  if (!access.live && !access.isAdmin) return null;

  return (
    <section aria-label="Community feed" className="max-w-xl space-y-4">
      {!access.live && (
        <p className="rounded-lg bg-pale px-4 py-2 text-sm">
          Admin view: this community is not open to members yet. Posts you add
          now will be waiting for them.
        </p>
      )}
      {canPost && (
        <PostComposer
          userId={userId}
          citySlug={citySlug}
          domainSlug={domainSlug}
          onPosted={refresh}
        />
      )}
      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-5 text-sm text-muted">
          No posts yet. Be the first to start a conversation.
        </p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              isAdmin={access.isAdmin}
              onDeleted={() =>
                setPosts((p) => p.filter((x) => x.id !== post.id))
              }
            />
          ))}
        </ul>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={() => void loadMore()}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-primary"
        >
          Load more
        </button>
      )}
    </section>
  );
}

export function PostComposer({
  userId,
  citySlug,
  domainSlug,
  onPosted,
}: {
  userId: string;
  citySlug: string;
  domainSlug: string;
  onPosted: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateBody(text, MAX_POST);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await createPost(userId, citySlug, domainSlug, text);
      setText("");
      await onPosted();
    } catch (err) {
      console.error("Post failed", err);
      setError(writeErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-line bg-surface p-4"
      noValidate
    >
      <label htmlFor="new-post" className="sr-only">
        Start a post
      </label>
      <textarea
        id="new-post"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share something with your city's community..."
        className={inputClass}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {text.length}/{MAX_POST}
        </span>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}

export function PostCard({
  post,
  communityName,
  userId,
  isAdmin,
  onDeleted,
}: {
  post: Post;
  communityName?: string;
  userId: string;
  isAdmin: boolean;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [count, setCount] = useState(post.commentCount);
  const [error, setError] = useState<string | null>(null);
  const canDelete = isAdmin || post.author.id === userId;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      try {
        setComments(await fetchComments(post.id));
      } catch (err) {
        console.error("Could not load comments", err);
        setError("Could not load comments.");
      }
    }
  }

  async function remove() {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePost(post.id);
      onDeleted();
    } catch (err) {
      console.error("Delete failed", err);
      setError(writeErrorMessage(err));
    }
  }

  return (
    <li className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={post.author.name} />
        <div className="min-w-0 flex-1">
          <AuthorLine author={post.author} createdAt={post.createdAt} />
          {communityName && (
            <p className="truncate text-xs text-primary">in {communityName}</p>
          )}
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => void remove()}
            aria-label="Delete post"
            className="text-muted hover:text-fg"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words leading-relaxed">
        {post.body}
      </p>
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <MessageSquare aria-hidden="true" className="h-4 w-4" />
        {count === 0
          ? "Comment"
          : `${count} ${count === 1 ? "comment" : "comments"}`}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {open && comments !== null && (
        <div className="space-y-3 border-t border-line pt-3">
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <Avatar name={c.author.name} />
                <div className="min-w-0 flex-1 rounded-lg bg-pale px-3 py-2">
                  <AuthorLine author={c.author} createdAt={c.createdAt} />
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {c.body}
                  </p>
                </div>
                {(isAdmin || c.author.id === userId) && (
                  <button
                    type="button"
                    aria-label="Delete comment"
                    className="mt-2 text-muted hover:text-fg"
                    onClick={async () => {
                      try {
                        await deleteComment(c.id);
                        setComments((list) =>
                          (list ?? []).filter((x) => x.id !== c.id),
                        );
                        setCount((n) => Math.max(0, n - 1));
                      } catch (err) {
                        console.error("Delete failed", err);
                        setError(writeErrorMessage(err));
                      }
                    }}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <CommentComposer
            userId={userId}
            postId={post.id}
            onAdded={async () => {
              setComments(await fetchComments(post.id));
              setCount((n) => n + 1);
            }}
          />
        </div>
      )}
    </li>
  );
}

function CommentComposer({
  userId,
  postId,
  onAdded,
}: {
  userId: string;
  postId: string;
  onAdded: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateBody(text, MAX_COMMENT);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await createComment(userId, postId, text);
      setText("");
      await onAdded();
    } catch (err) {
      console.error("Comment failed", err);
      setError(writeErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <label htmlFor={`c-${postId}`} className="sr-only">
        Write a comment
      </label>
      <input
        id={`c-${postId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a comment..."
        className={inputClass}
      />
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-primary disabled:opacity-60"
      >
        {busy ? "Sending..." : "Comment"}
      </button>
    </form>
  );
}
