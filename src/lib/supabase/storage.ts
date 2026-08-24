import { createAdminClient } from "./admin";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "learning-resources";

export async function uploadResourceFile(path: string, file: File) {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return getPublicUrl(path);
}

export function getPublicUrl(path: string) {
  const supabase = createAdminClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteResourceFile(path: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
