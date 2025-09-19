import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  items_count?: number;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, phone, address, city, state, rating, total_reviews")
          .eq("user_id", user.id)
          .single();
          
        if (profileError) {
          console.error("Erro ao buscar perfil:", profileError);
          return;
        }
        
        const { count: itemsCount, error: itemsError } = await supabase
          .from("items")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
          
        if (itemsError) {
          console.error("Erro ao contar itens:", itemsError);
        }
        
        if (profileData) {
          setProfile({
            id: profileData.id,
            name: profileData.name || "",
            avatar_url: profileData.avatar_url || undefined,
            phone: profileData.phone || "",
            address: profileData.address || "",
            city: profileData.city || "",
            state: profileData.state || "",
            rating: profileData.rating,
            total_reviews: profileData.total_reviews,
            email: user.email || "",
            items_count: itemsCount || 0,
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;

    // Verificar se o arquivo é uma imagem
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem.",
        variant: "destructive"
      });
      return;
    }

    // Verificar tamanho do arquivo (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive"
      });
      return;
    }

    // Criar preview imediata da imagem
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Fazer upload da imagem como Base64
    uploadAvatarAsBase64(file);
  };

  async function uploadAvatarAsBase64(file: File) {
    setUploading(true);
    try {
      // Ler o arquivo como Base64
      const base64String = await readFileAsBase64(file);
      
      // Atualizar perfil com a imagem em base64
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: base64String })
        .eq('id', profile!.id);
        
      if (updateError) {
        console.error("Erro ao salvar avatar:", updateError);
        throw new Error("Não foi possível salvar a imagem no perfil.");
      }
      
      // Atualizar estado local
      setProfile((prev) => prev ? { 
        ...prev, 
        avatar_url: base64String 
      } : prev);
      
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi salva com sucesso.",
      });
      
    } catch (error: any) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar sua foto de perfil.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Manter o preview por mais 2 segundos para transição suave
      setTimeout(() => setAvatarPreview(null), 2000);
    }
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
          <div className="h-28 w-28 mb-2 ring-4 ring-blue-200 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
            {/* Mostrar preview primeiro, depois a imagem do perfil */}
            {avatarPreview ? (
              <img 
                src={avatarPreview} 
                alt="Preview"
                className="h-full w-full object-cover"
              />
            ) : profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Se der erro ao carregar, mostrar iniciais
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : null}
            
            {/* Fallback para iniciais */}
            {(!avatarPreview && !profile.avatar_url) && (
              <span className="text-blue-600 text-2xl font-bold">
                {profile.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          
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
            className="absolute bottom-0 right-0 rounded-full shadow-md bg-white"
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
            <span className="font-semibold">Itens publicados:</span> 
            {profile.items_count !== undefined ? (
              <span className="ml-2">{profile.items_count}</span>
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