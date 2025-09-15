import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import FavoritedItems from "@/components/FavoritedItems";
import { useToast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  total_reviews?: number;
  email?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, phone, address, city, state, rating, total_reviews")
          .eq("user_id", user.id)
          .single();
          
        if (error) {
          console.error("Erro ao buscar perfil:", error);
          return;
        }
        
        if (data) {
          setProfile({
            id: data.id,
            name: data.name || "",
            avatar_url: data.avatar_url || undefined,
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            rating: data.rating,
            total_reviews: data.total_reviews,
            email: user.email || "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}.${fileExt}`;
      
      // Fazer upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Atualizar perfil com a nova URL do avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', profile.id);
        
      if (updateError) {
        throw updateError;
      }
      
      // Atualizar estado local
      setProfile((prev) => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
      
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar sua foto de perfil.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh]">Carregando...</div>;
  }
  
  if (!profile) {
    return <div className="flex justify-center items-center min-h-[40vh]">Perfil não encontrado.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-white p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 border border-blue-200 flex flex-col items-center">
        <div className="relative flex flex-col items-center mb-4">
          <Avatar className="h-28 w-28 mb-2 ring-4 ring-blue-200">
            <AvatarImage src={profile.avatar_url} alt={profile.name} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
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
        
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-3xl font-bold text-gray-800">{profile.name}</h2>
          <Link to="/profile/edit">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="text-gray-600 mb-6 text-lg">{profile.email}</p>
        
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="font-semibold">Telefone:</span> 
            {profile.phone ? (
              <span className="ml-2">{profile.phone}</span>
            ) : (
              <span className="text-gray-400 ml-2">Não informado</span>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="font-semibold">Endereço:</span> 
            {profile.address ? (
              <span className="ml-2">{profile.address}</span>
            ) : (
              <span className="text-gray-400 ml-2">Não informado</span>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="font-semibold">Cidade:</span> 
            {profile.city ? (
              <span className="ml-2">{profile.city}</span>
            ) : (
              <span className="text-gray-400 ml-2">Não informado</span>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="font-semibold">Estado:</span> 
            {profile.state ? (
              <span className="ml-2">{profile.state}</span>
            ) : (
              <span className="text-gray-400 ml-2">Não informado</span>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="font-semibold">Avaliação:</span> 
            {profile.rating !== undefined && profile.rating !== null ? (
              <span className="ml-2">{profile.rating} ⭐</span>
            ) : (
              <span className="text-gray-400 ml-2">Sem avaliações</span>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <span className="font-semibold">Total de avaliações:</span> 
            {profile.total_reviews !== undefined && profile.total_reviews !== null ? (
              <span className="ml-2">{profile.total_reviews}</span>
            ) : (
              <span className="text-gray-400 ml-2">0</span>
            )}
          </div>
        </div>
        
        <Button 
          className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-lg py-3 rounded-xl shadow-md hover:scale-[1.02] transition-transform" 
          onClick={() => navigate("/")}
        >
          Voltar
        </Button>
        
        <h3 className="text-2xl font-bold text-gray-800 mt-10 mb-4 w-full text-left">Favoritos</h3>
        <div className="w-full">
          <FavoritedItems />
        </div>
      </div>
    </div>
  );
}