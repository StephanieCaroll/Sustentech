import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import FavoritedItems from "@/components/FavoritedItems";

interface ProfileData {
  name: string;
  avatar_url?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  total_reviews?: number;
  created_at?: string;
  updated_at?: string;
  is_verified?: boolean;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url, phone, address, city, state, rating, total_reviews, created_at, updated_at, is_verified")
        .eq("user_id", user.id)
        .single();
      setProfile({
        name: data?.name || "",
        avatar_url: data?.avatar_url || undefined,
        email: user.email || "",
        phone: data?.phone || "",
        address: data?.address || "",
        city: data?.city || "",
        state: data?.state || "",
        rating: data?.rating,
        total_reviews: data?.total_reviews,
        created_at: data?.created_at,
        updated_at: data?.updated_at,
        is_verified: data?.is_verified,
      });
      setLoading(false);
    }
    fetchProfile();
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('user_id', user.id);
      setProfile((prev) => prev ? { ...prev, avatar_url: data.publicUrl } : prev);
    }
    setUploading(false);
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh]">Carregando...</div>;
  }
  if (!profile) {
    return <div className="flex justify-center items-center min-h-[40vh]">Perfil não encontrado.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 border border-primary/10 flex flex-col items-center">
        <div className="relative flex flex-col items-center mb-4">
          <Avatar className="h-28 w-28 mb-2 ring-4 ring-primary/20">
            <AvatarImage src={profile.avatar_url} alt={profile.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {profile.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            disabled={uploading}
          />
          <Button
            size="sm"
            variant="outline"
            className="absolute bottom-0 right-0 rounded-full shadow-md"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Enviando..." : "Mudar foto"}
          </Button>
        </div>
        <h2 className="text-3xl font-bold text-primary mb-1">{profile.name}</h2>
        <p className="text-muted-foreground mb-2 text-lg">{profile.email}</p>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="font-semibold">Telefone:</span> {profile.phone || <span className="text-muted-foreground">Não informado</span>}
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="font-semibold">Endereço:</span> {profile.address || <span className="text-muted-foreground">Não informado</span>}
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="font-semibold">Cidade:</span> {profile.city || <span className="text-muted-foreground">Não informado</span>}
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="font-semibold">Estado:</span> {profile.state || <span className="text-muted-foreground">Não informado</span>}
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="font-semibold">Avaliação:</span> {profile.rating !== undefined ? `${profile.rating} ⭐` : <span className="text-muted-foreground">Sem avaliações</span>}
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="font-semibold">Total de avaliações:</span> {profile.total_reviews !== undefined ? profile.total_reviews : <span className="text-muted-foreground">0</span>}
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="font-semibold">Conta verificada:</span> {profile.is_verified ? "Sim" : "Não"}
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="font-semibold">Criada em:</span> {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}
          </div>
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="font-semibold">Atualizada em:</span> {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "-"}
          </div>
        </div>
        <Button className="w-full mt-2 bg-gradient-to-r from-primary to-primary-glow text-lg py-3 rounded-xl shadow-md hover:scale-[1.02] transition-transform" onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <h3 className="text-2xl font-bold text-primary mt-10 mb-4 w-full text-left">Favoritos</h3>
        <FavoritedItems />
      </div>
    </div>
  );
}
