import { supabase } from '@/integrations/supabase/client';

export async function uploadAvatar(file: File, userId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const filePath = `avatars/${userId}.${fileExt}`;
  const { error } = await supabase.storage.from('avatars').upload(filePath, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) {
    console.log('Erro ao fazer upload do avatar:', error);
    return null;
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return data.publicUrl || null;
}
