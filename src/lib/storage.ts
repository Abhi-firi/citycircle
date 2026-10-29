import { getSupabase } from "@/lib/supabase/client";
import { extensionFor, processImage } from "@/lib/image";

function randomName(ext: string): string {
  return `${crypto.randomUUID()}.${ext}`;
}

/** Public link for an avatar file. No network call. */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return getSupabase().storage.from("avatars").getPublicUrl(path).data
    .publicUrl;
}

/** Upload a new profile photo, save it on the profile, and remove the old file. Returns the new path. */
export async function uploadAvatar(
  userId: string,
  file: File,
  previousPath: string | null,
): Promise<string> {
  const blob = await processImage(file, {
    maxSide: 512,
    square: true,
    quality: 0.85,
  });
  const path = `${userId}/${randomName(extensionFor(blob.type))}`;
  const db = getSupabase();
  const { error: uploadError } = await db.storage
    .from("avatars")
    .upload(path, blob, { contentType: blob.type });
  if (uploadError) throw uploadError;
  const { error } = await db
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", userId);
  if (error) {
    await db.storage
      .from("avatars")
      .remove([path])
      .catch(() => {});
    throw error;
  }
  if (previousPath)
    await db.storage
      .from("avatars")
      .remove([previousPath])
      .catch(() => {});
  return path;
}

export async function removeAvatar(
  userId: string,
  previousPath: string | null,
): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", userId);
  if (error) throw error;
  if (previousPath)
    await db.storage
      .from("avatars")
      .remove([previousPath])
      .catch(() => {});
}

/** Upload an image for a post. Returns the path to store on the post. */
export async function uploadPostImage(
  userId: string,
  citySlug: string,
  domainSlug: string,
  file: File,
): Promise<string> {
  const blob = await processImage(file, { maxSide: 1280, quality: 0.82 });
  const path = `${citySlug}/${domainSlug}/${userId}/${randomName(extensionFor(blob.type))}`;
  const { error } = await getSupabase()
    .storage.from("post-images")
    .upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return path;
}

export async function removePostImage(path: string): Promise<void> {
  await getSupabase()
    .storage.from("post-images")
    .remove([path])
    .catch(() => {});
}

/** Short-lived links for private post images, one request for the whole list. */
export async function signedPostImageUrls(
  paths: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return {};
  const { data, error } = await getSupabase()
    .storage.from("post-images")
    .createSignedUrls(unique, 3600);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}
