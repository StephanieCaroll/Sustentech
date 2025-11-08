import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Star, PlusCircle, Camera, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, Wrench, MessageSquare } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import ServiceCard from "@/components/ServiceCard";
import { Item, Service } from "@/hooks/useSupabaseData";

type ProfileForCard = {
  name: string;
  avatar_url: string;
  is_verified: boolean;
};

interface ProfileData {
  id: string;
  name: string;
  avatar_url?: string;
  banner_url?: string;
  phone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  rating?: number;
  total_reviews?: number;
  email?: string;
  items_count?: number;
  services_count?: number;
  is_verified: boolean; 
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
}

type ItemWithInjectedProfile = Item & {
  categories: { name: string };
  profiles: ProfileForCard;
};
type ServiceWithInjectedProfile = Service & {
  categories: { name: string };
  profiles: ProfileForCard;
};

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("items");
  const scrollPositionRef = useRef(0); 
  const [items, setItems] = useState<ItemWithInjectedProfile[]>([]);
  const [services, setServices] = useState<ServiceWithInjectedProfile[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      setLoading(true);

      try {
        const authUserId = user.id;

        const profilePromise = supabase
          .from("profiles")
          .select(
            "id, name, avatar_url, banner_url, phone, logradouro, numero, complemento, bairro, rating, total_reviews, is_verified"
          )
          .eq("user_id", authUserId)
          .single();

        const itemsPromise = supabase
          .from("items")
          .select(
            "*, categories(name)",
            { count: "exact" }
          )
          .eq("user_id", authUserId);

        const servicesPromise = supabase
          .from("services")
          .select(
            "*, categories(name)",
            { count: "exact" }
          )
          .eq("user_id", authUserId);

        const reviewsPromise = supabase
          .from("reviews")
          .select(
            `id, rating, comment, created_at, reviewer_id`
          )
          .eq("reviewed_user_id", authUserId)
          .order("created_at", { ascending: false });
        
        const [
          { data: profileData, error: profileError },
          { data: itemsData, count: itemsCount, error: itemsError },
          { data: servicesData, count: servicesCount, error: servicesError },
          { data: reviewsData, error: reviewsError },
        ] = await Promise.all([
          profilePromise,
          itemsPromise,
          servicesPromise,
          reviewsPromise,
        ]);

        if (profileError) console.error("Erro ao buscar perfil:", profileError);
        if (itemsError) console.error("Erro ao buscar itens:", itemsError);
        if (servicesError) console.error("Erro ao buscar serviços:", servicesError);
        if (reviewsError) console.error("Erro ao buscar avaliações:", reviewsError);
        
        if (!profileData) {
            setLoading(false);
            return;
        }
        
        const profileForCard: ProfileForCard = {
            name: profileData.name || "Usuário",
            avatar_url: profileData.avatar_url || "",
            is_verified: profileData.is_verified || false
        };

        const enhancedItems = (itemsData || []).map(item => ({
            ...item,
            profiles: profileForCard 
        }));

        const enhancedServices = (servicesData || []).map(service => ({
            ...service,
            profiles: profileForCard 
        }));

        setItems(enhancedItems as any);
        setServices(enhancedServices as any);
        setReviews(reviewsData || []);
        setProfile({
          id: profileData.id,
          name: profileData.name || "",
          avatar_url: profileData.avatar_url || undefined,
          banner_url: profileData.banner_url || undefined,
          phone: profileData.phone || "",
          logradouro: profileData.logradouro || "",
          numero: profileData.numero || "",
          complemento: profileData.complemento || "",
          bairro: profileData.bairro || "",
          rating: profileData.rating,
          total_reviews: profileData.total_reviews,
          email: user.email || "",
          items_count: itemsCount || 0,
          services_count: servicesCount || 0,
          is_verified: profileData.is_verified || false,
        });

      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  async function uploadImageAsBase64(
    file: File,
    columnToUpdate: "avatar_url" | "banner_url"
  ): Promise<string> {
    const base64String = await readFileAsBase64(file);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ [columnToUpdate]: base64String })
      .eq("id", profile!.id); 

    if (updateError) {
      console.error(`Erro ao salvar ${columnToUpdate}:`, updateError);
      throw new Error("Não foi possível salvar a imagem no perfil.");
    }
    return base64String;
  }

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Por favor, selecione um arquivo de imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (type === "avatar") {
        setAvatarPreview(result);
        uploadAvatar(file);
      } else {
        setBannerPreview(result);
        uploadBanner(file);
      }
    };
    reader.readAsDataURL(file);
  };

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    try {
      const base64String = await uploadImageAsBase64(file, "avatar_url");
      setProfile((prev) => prev ? { ...prev, avatar_url: base64String } : prev);
      toast({ title: "Foto atualizada!", description: "Sua foto de perfil foi salva." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      setTimeout(() => setAvatarPreview(null), 2000);
    }
  }

  async function uploadBanner(file: File) {
    setUploadingBanner(true);
    try {
      const base64String = await uploadImageAsBase64(file, "banner_url");
      setProfile((prev) => prev ? { ...prev, banner_url: base64String } : prev);
      toast({ title: "Capa atualizada!", description: "Sua imagem de capa foi salva." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setUploadingBanner(false);
      setTimeout(() => setBannerPreview(null), 2000);
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

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              rating >= star
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return <span className="text-gray-400">Não informado</span>;
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    }
    return phone;
  };

  const handleTabChange = (value: string) => {

    scrollPositionRef.current = window.scrollY;

    setActiveTab(value);
  
    setTimeout(() => {
        window.scrollTo({ 
            top: scrollPositionRef.current, 
            behavior: 'auto' 
        });
    }, 0); 
  };
  
  const TabHeader = ({ value, icon: Icon, label, count }: { value: string, icon: React.ElementType, label: string, count: number }) => (
    <div
      onClick={() => handleTabChange(value)}
      className={`
        flex-1 text-base p-3 cursor-pointer transition-colors flex items-center justify-center space-x-2
        ${activeTab === value ? 'bg-white text-primary shadow-sm border-b-2 border-primary' : 'hover:bg-primary/10 text-gray-600'}
        whitespace-nowrap 
      `}
    >
      <Icon className="h-5 w-5" />
      <span>{label} ({count})</span>
    </div>
  );


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-4 justify-center items-center min-h-screen">
        <h2 className="text-2xl font-semibold">Perfil não encontrado</h2>
        <p className="text-gray-600">
          Parece que há um problema ao carregar seu perfil.
        </p>
        <p className="text-sm text-gray-500">
          (Dica: Verifique sua política de RLS para a tabela 'profiles' no Supabase.)
        </p>
        <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
      </div>
    );
  }

  const bannerImage = bannerPreview || profile.banner_url;

  return (
<div className="min-h-screen w-full bg-gradient-to-br from-primary/5 to-background">
      <div className="container mx-auto max-w-5xl space-y-8 px-4">
        
        {/* Card de Perfil com Banner */}
        <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-primary/20 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500 relative">
          
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 left-4 z-10 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
            onClick={() => navigate("/")}
            title="Voltar ao Início"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Banner */}
          <div className="h-40 relative">
            {bannerImage ? (
                <img src={bannerImage} alt="Banner do perfil" className="h-full w-full object-cover"/>
            ) : (
                <div className="h-full w-full bg-gradient-to-r from-primary/20 to-primary/5"></div>
            )}
            
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "banner")}
              disabled={uploadingBanner}
            />
            <Button
              size="sm"
              variant="outline"
              className="absolute bottom-4 right-4 rounded-full shadow-md bg-white/80 h-9 w-9 p-0 backdrop-blur-sm"
              title="Mudar foto da capa"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
            >
              {uploadingBanner ? "..." : <Camera className="h-4 w-4" />}
            </Button>
          </div>

          {/* Conteúdo do Perfil */}
          <div className="flex flex-col items-center px-8 pb-8 -mt-20">
            <div className="relative mb-4">
              <Avatar className="h-32 w-32 ring-4 ring-white rounded-full">
                <AvatarImage src={avatarPreview || profile.avatar_url} alt={profile.name} />
                <AvatarFallback className="text-primary text-4xl font-bold bg-primary/10">
                  {profile.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "avatar")}
                disabled={uploadingAvatar}
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute bottom-1 right-1 rounded-full shadow-md bg-white h-9 w-9 p-0"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Mudar foto de perfil"
              >
                {uploadingAvatar ? "..." : <Pencil className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-3xl font-bold text-gray-800">
                {profile.name}
              </h2>
              <Link to="/profile/edit">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Editar informações">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-gray-600 mb-6 text-lg">{profile.email}</p>

            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-center">
              <div className="bg-primary/5 rounded-xl p-4">
                <span className="block text-2xl font-bold text-primary">
                  {profile.items_count || 0}
                </span>
                <span className="text-sm text-gray-600">Itens</span>
              </div>
              <div className="bg-primary/5 rounded-xl p-4">
                <span className="block text-2xl font-bold text-primary">
                  {profile.services_count || 0}
                </span>
                <span className="text-sm text-gray-600">Serviços</span>
              </div>
              <div className="bg-primary/5 rounded-xl p-4 flex flex-col justify-center items-center">
                <span className="block text-2xl font-bold text-primary">
                  {profile.rating?.toFixed(1) || 0} <Star className="h-5 w-5 inline-block -mt-1 text-yellow-400 fill-yellow-400" />
                </span>
                <span className="text-sm text-gray-600">({profile.total_reviews || 0} avaliações)</span>
              </div>
            </div>

            {/* Minhas Informações */}
            <div className="w-full border-t border-primary/10 pt-6 mb-6 text-left">
              <h3 className="text-xl font-semibold text-primary mb-4">Minhas Informações</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="bg-primary/5 rounded-xl p-4">
                  <span className="block text-xs font-semibold text-gray-500">Telefone</span>
                  <span className="text-gray-800">
                    {formatPhoneNumber(profile.phone || "")}
                  </span>
                </div>

                <div className="bg-primary/5 rounded-xl p-4">
                  <span className="block text-xs font-semibold text-gray-500">Logradouro</span>
                  <span className="text-gray-800">
                    {profile.logradouro || <span className="text-gray-400">Não informado</span>}
                  </span>
                </div>

                <div className="bg-primary/5 rounded-xl p-4">
                  <span className="block text-xs font-semibold text-gray-500">Número</span>
                  <span className="text-gray-800">
                    {profile.numero || <span className="text-gray-400">Não informado</span>}
                  </span>
                </div>

                <div className="bg-primary/5 rounded-xl p-4">
                  <span className="block text-xs font-semibold text-gray-500">Bairro</span>
                  <span className="text-gray-800">
                    {profile.bairro || <span className="text-gray-400">Não informado</span>}
                  </span>
                </div>

                <div className="bg-primary/5 rounded-xl p-4 sm:col-span-2">
                  <span className="block text-xs font-semibold text-gray-500">Complemento</span>
                  <span className="text-gray-800">
                    {profile.complemento || <span className="text-gray-400">Não informado</span>}
                  </span>
                </div>

              </div>
            </div>
            
          </div>
        </div>

        {/* Seção de Abas */}
        <div className="animate-in fade-in-0 slide-in-from-bottom-8 duration-500 delay-100">
          
          {/* Cabeçalho das Tabs*/}
          <div className="flex w-full rounded-lg overflow-hidden bg-primary/5 border border-primary/10 shadow-sm">
            
            <TabHeader 
              value="items" 
              icon={Package} 
              label="Itens" 
              count={items.length} 
            />
            
            <TabHeader 
              value="services" 
              icon={Wrench} 
              label="Serviços" 
              count={services.length} 
            />
            
            <TabHeader 
              value="reviews" 
              icon={MessageSquare} 
              label="Avaliações" 
              count={reviews.length} 
            />
            
          </div>

          {/* Conteúdo das Tabs*/}
          <div className="mt-6">
            
            {activeTab === "items" && (
              <div>
                {items.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                      <div 
                        key={item.id} 
                        className="cursor-pointer transition-transform duration-200 ease-in-out hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
                        onClick={() => navigate(`/item/${item.id}`)}
                    >
                      {/* @ts-ignore */}
                      <ItemCard item={item} hideBuyButton={true} /> 
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-10 bg-white rounded-2xl shadow-lg border border-primary/10">
                  <h3 className="text-xl font-semibold text-gray-700">
                    Você ainda não publicou nenhum item
                  </h3>
                  <p className="text-gray-500 mb-6 mt-2">
                    Que tal começar agora?
                  </p>
                  <Button
                    size="lg"
                    onClick={() => navigate("/add-item")}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Publicar um Item
                  </Button>
                </div>
              )}
            </div>
            )}
            
            {activeTab === "services" && (
              <div>
                {services.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                      <div 
                        key={service.id} 
                        className="cursor-pointer transition-transform duration-200 ease-in-out hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
                        onClick={() => navigate(`/service/${service.id}`)}
                      >
                        {/* @ts-ignore */}
                        <ServiceCard service={service} hideBuyButton={true} />
                      </div>
                    ))}
                  </div>
                ) : (
                    <div className="text-center p-10 bg-white rounded-2xl shadow-lg border border-primary/10">
                    <h3 className="text-xl font-semibold text-gray-700">
                      Você ainda não ofereceu nenhum serviço
                    </h3>
                    <p className="text-gray-500 mb-6 mt-2">
                      Publique seus serviços e comece a receber propostas.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => navigate("/add-service")}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Oferecer um Serviço
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "reviews" && (
              <div className="w-full bg-white rounded-2xl shadow-lg p-8 border border-primary/10">
                <h2 className="text-2xl font-bold text-primary mb-6">
                  Avaliações Recebidas ({profile.total_reviews || 0})
                </h2>
                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="flex gap-4 border-b border-primary/10 pb-4 last:border-b-0">
                        <Avatar className="h-10 w-10">
                         
                          <AvatarFallback className="bg-primary/10 text-primary">
                            ??
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="font-semibold text-gray-800">
                              Avaliador Anônimo
                            </h4>
                            <span className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {renderStars(review.rating)}
                          <p className="text-gray-600 mt-2">{review.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Você ainda não recebeu nenhuma avaliação.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}