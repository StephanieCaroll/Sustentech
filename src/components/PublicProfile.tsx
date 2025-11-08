import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom"; 
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Star, ArrowLeft, Package, Wrench, MessageSquare, CheckCircle, Send, MapPin, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
    reviewer_profile?: { name: string; avatar_url: string };
}

type ItemWithInjectedProfile = Item & { categories: { name: string }; profiles: ProfileForCard; };
type ServiceWithInjectedProfile = Service & { categories: { name: string }; profiles: ProfileForCard; };

const renderStars = (rating: number, clickable = false, setRating?: (r: number) => void) => {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-5 w-5 transition-colors ${
                        rating >= star
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-300"
                    } ${clickable ? "cursor-pointer hover:text-yellow-400" : ""}`}
                    onClick={clickable && setRating ? () => setRating(star) : undefined}
                />
            ))}
        </div>
    );
};

const formatPhoneNumber = (phone: string): string | JSX.Element => {
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

export default function PublicProfile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { userId } = useParams<{ userId: string }>(); 
    
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [items, setItems] = useState<ItemWithInjectedProfile[]>([]);
    const [services, setServices] = useState<ServiceWithInjectedProfile[]>([]);
    const [reviews, setReviews] = useState<ReviewData[]>([]);
    
    const [activeTab, setActiveTab] = useState("items");
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const scrollPositionRef = useRef(0);
    
    const isOwner = user?.id === userId;

    async function fetchProfileData() {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const targetUserId = userId;

        try {
         
            const profilePromise = supabase
                .from("profiles")
                .select("id, name, avatar_url, banner_url, phone, logradouro, numero, complemento, bairro, rating, total_reviews, is_verified, user_id") 
                .eq("user_id", targetUserId)
                .single();

            const itemsPromise = supabase.from("items").select("*, categories(name)").eq("user_id", targetUserId);
            const servicesPromise = supabase.from("services").select("*, categories(name)").eq("user_id", targetUserId);
           
            const reviewsPromise = supabase
                .from("reviews")
                .select("id, rating, comment, created_at, reviewer_id")
                .eq("reviewed_user_id", targetUserId)
                .order("created_at", { ascending: false });

            const [
                { data: profileData, error: profileError },
                { data: itemsData, error: itemsError },
                { data: servicesData, error: servicesError },
                { data: reviewsData, error: reviewsError }
            ] = await Promise.all([
                profilePromise,
                itemsPromise,
                servicesPromise,
                reviewsPromise
            ]);

            if (profileError) throw profileError;

            if (user && targetUserId === user.id) {
                navigate("/profile", { replace: true });
                return; 
            }
            
            const profileForCard: ProfileForCard = {
                name: profileData.name || "Usuário",
                avatar_url: profileData.avatar_url || "",
                is_verified: profileData.is_verified || false
            };
            
            const enhancedItems = (itemsData || []).map(item => ({ ...item, profiles: profileForCard }));
            const enhancedServices = (servicesData || []).map(service => ({ ...service, profiles: profileForCard }));

            let reviewsWithProfiles: ReviewData[] = [];
            if (reviewsData && reviewsData.length > 0) {
                const reviewerIds = reviewsData.map(review => review.reviewer_id);
                const { data: reviewerProfiles, error: profilesError } = await supabase
                    .from("profiles")
                    .select("user_id, name, avatar_url")
                    .in("user_id", reviewerIds);

                if (!profilesError && reviewerProfiles) {
                    reviewsWithProfiles = reviewsData.map(review => {
                        const reviewerProfile = reviewerProfiles.find(profile => profile.user_id === review.reviewer_id);
                        return {
                            ...review,
                            reviewer_profile: reviewerProfile
                        };
                    });
                } else {
                    reviewsWithProfiles = reviewsData.map(review => ({
                        ...review,
                        reviewer_profile: undefined
                    }));
                }
            }

            setItems(enhancedItems as any);
            setServices(enhancedServices as any);
            setReviews(reviewsWithProfiles);
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
                email: profileData.email || "", 
                items_count: itemsData?.length || 0,
                services_count: servicesData?.length || 0,
                is_verified: profileData.is_verified || false,
            });

        } catch (error) {
            console.error("Erro ao carregar perfil público:", error);
            setProfile(null); 
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchProfileData();
    }, [userId, user, navigate]);

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

    const renderStarsStateful = (rating: number, clickable = false) => {
        return renderStars(rating, clickable, setReviewRating);
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("📝 Iniciando envio de avaliação...");
        
        if (!user || isOwner) {
            console.log("❌ Bloqueado: usuário não logado ou é o dono");
            toast({ 
                title: "Ação não permitida", 
                description: "Você precisa estar logado e não pode avaliar a si mesmo.", 
                variant: "destructive" 
            });
            return; 
        }
        
        if (reviewRating === 0) {
            console.log("❌ Bloqueado: rating 0");
            toast({ 
                title: "Atenção", 
                description: "Por favor, selecione uma nota com as estrelas.", 
                variant: "destructive" 
            });
            return;
        }

        if (reviewComment.trim().length < 3) {
            console.log("❌ Bloqueado: comentário muito curto");
            toast({ 
                title: "Atenção", 
                description: "O comentário precisa ter pelo menos 3 caracteres.", 
                variant: "destructive" 
            });
            return;
        }

        setIsSubmittingReview(true);
        try {
            console.log("🚀 Enviando avaliação para o Supabase...");
            
            let itemIdToUse = null;
            let serviceIdToUse = null;

            if (items.length > 0) {
                itemIdToUse = items[0].id;
                console.log("📦 Usando primeiro item do usuário:", itemIdToUse);
            } else if (services.length > 0) {
                serviceIdToUse = services[0].id;
                console.log("🔧 Usando primeiro serviço do usuário:", serviceIdToUse);
            }

            const reviewData: any = {
                reviewer_id: user.id,
                reviewed_user_id: userId,
                rating: reviewRating,
                comment: reviewComment.trim(),
            };

            if (itemIdToUse) {
                reviewData.item_id = itemIdToUse;
            } else if (serviceIdToUse) {
                reviewData.service_id = serviceIdToUse;
            }

            console.log("📊 Dados da avaliação:", reviewData);

            const { data, error } = await supabase.from('reviews')
                .insert(reviewData)
                .select();

            console.log("📨 Resposta do Supabase:", { data, error });

            if (error) {
                console.error("❌ Erro do Supabase:", error);
                throw error;
            }

            console.log("✅ Avaliação enviada com sucesso!");
            toast({ 
                title: "Sucesso!", 
                description: "Sua avaliação foi enviada. Obrigado!" 
            });
            
            setReviewComment("");
            setReviewRating(0);
            
            await fetchProfileData();

        } catch (error: any) {
            console.error("💥 Erro ao enviar avaliação:", error);
            
            let errorMessage = "Não foi possível enviar a avaliação.";
            if (error.message) {
                if (error.message.includes('item_id and service_id are both null')) {
                    errorMessage = "Erro: É necessário vincular a avaliação a um item ou serviço. Este usuário não tem itens ou serviços disponíveis.";
                } else if (error.message.includes('duplicate key')) {
                    errorMessage = "Você já avaliou este vendedor. Cada usuário pode avaliar apenas uma vez.";
                } else {
                    errorMessage += ` Erro: ${error.message}`;
                }
            }
            
            toast({ 
                title: "Erro", 
                description: errorMessage, 
                variant: "destructive" 
            });
        } finally {
            setIsSubmittingReview(false);
        }
    };
    
    const TabHeader = ({ value, icon: Icon, label, count }: { value: string, icon: React.ElementType, label: string, count: number }) => (
        <div
            onClick={() => handleTabChange(value)}
            className={`
                flex-1 text-base p-3 cursor-pointer transition-colors flex items-center justify-center space-x-2
                ${activeTab === value ? 'bg-white text-green-700 shadow-sm border-b-2 border-green-600' : 'hover:bg-green-100/50 text-gray-700'}
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col gap-4 justify-center items-center min-h-screen">
                <h2 className="text-2xl font-semibold">Perfil Não Encontrado</h2>
                <p className="text-gray-600">O usuário com o ID "{userId}" pode não existir.</p>
                <Button onClick={() => navigate("/")} className="bg-green-600 hover:bg-green-700">Voltar ao Início</Button>
            </div>
        );
    }

    const bannerImage = profile.banner_url;

    return (
        <div className="min-h-screen w-full bg-gray-50 py-8">
            <div className="container mx-auto max-w-5xl space-y-8 px-4">
                
                <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-green-200 overflow-hidden relative">
                    
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-4 left-4 z-10 rounded-full bg-white/90 shadow-md hover:bg-gray-100"
                        onClick={() => navigate(-1)}
                        title="Voltar"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-700" />
                    </Button>

                    <div className="h-40 relative">
                        {bannerImage ? (
                            <img src={bannerImage} alt="Banner do perfil" className="h-full w-full object-cover"/>
                        ) : (
                            <div className="h-full w-full bg-gradient-to-r from-green-100 to-green-50"></div>
                        )}
                    </div>

                    <div className="flex flex-col items-center px-8 pb-8 -mt-20">
                        <div className="relative mb-4">
                            <Avatar className="h-32 w-32 ring-4 ring-white shadow-xl rounded-full">
                                <AvatarImage src={profile.avatar_url} alt={profile.name} />
                                <AvatarFallback className="text-green-700 text-4xl font-bold bg-green-100">
                                    {profile.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-3xl font-bold text-gray-800">
                                {profile.name}
                            </h2>
                            {profile.is_verified && (
                                <CheckCircle className="h-5 w-5 text-green-600 fill-current" />
                            )}
                        </div>
                        
                        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-center pt-4">
                            
                            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
                                <span className="block text-2xl font-bold text-green-700">
                                    {profile.items_count || 0}
                                </span>
                                <span className="text-sm text-gray-600">Itens</span>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
                                <span className="block text-2xl font-bold text-green-700">
                                    {profile.services_count || 0}
                                </span>
                                <span className="text-sm text-gray-600">Serviços</span>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100 flex flex-col justify-center items-center">
                                <span className="block text-2xl font-bold text-green-700">
                                    {profile.rating?.toFixed(1) || 0} <Star className="h-5 w-5 inline-block -mt-1 text-yellow-500 fill-yellow-500" />
                                </span>
                                <span className="text-sm text-gray-600">({profile.total_reviews || 0} avaliações)</span>
                            </div>
                        </div>

                        <div className="w-full border-t border-green-200 pt-6 mb-6 text-left space-y-4">
                            
                            <h3 className="text-xl font-semibold text-green-600 mb-4 text-center">Informações Básicas</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-3 shadow-inner">
                                    <Phone className="h-5 w-5 text-green-500 shrink-0" />
                                    <div>
                                        <span className="block text-xs font-semibold text-gray-500">Telefone</span>
                                        <span className="text-gray-800 text-base">
                                            {formatPhoneNumber(profile.phone || "")}
                                        </span>
                                    </div>
                                </div>
                               
                                <div className="bg-gray-50 rounded-lg p-4 flex items-start space-x-3 shadow-inner">
                                    <MapPin className="h-5 w-5 text-green-500 mt-1 shrink-0" />
                                    <div>
                                        <span className="block text-xs font-semibold text-gray-500">Endereço Principal</span>
                                        <p className="text-gray-800 text-sm">
                                            {profile.logradouro || ''} {profile.numero || ''}
                                        </p>
                                        <p className="text-gray-600 text-xs">
                                            {profile.bairro || 'Bairro não informado'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </div>
                </div>

                <div className="animate-in fade-in-0 slide-in-from-bottom-8 duration-500 delay-100">
                    
                    <div className="flex w-full rounded-lg overflow-hidden bg-green-100/50 border border-green-200 shadow-md">
                        
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

                    <div className="mt-6">
                        
                        {activeTab === "items" && (
                            <div className="space-y-6">
                                {items.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {items.map((item) => (
                                            <div 
                                                key={item.id} 
                                                className="cursor-pointer transition-transform duration-200 ease-in-out hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
                                                onClick={() => navigate(`/item/${item.id}`)}
                                            >
                                              
                                                <ItemCard item={item} onUpdate={() => fetchProfileData()} /> 
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-10 bg-white rounded-2xl shadow-lg border border-primary/10">
                                        <h3 className="text-xl font-semibold text-gray-700">Nenhum item publicado</h3>
                                        <p className="text-gray-500 mt-2">Este vendedor ainda não listou nenhum item para venda/doação.</p>
                                    </div>
                                )}
                            </div>
                        )}
                       
                        {activeTab === "services" && (
                            <div className="space-y-6">
                                {services.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {services.map((service) => (
                                            <div 
                                                key={service.id} 
                                                className="cursor-pointer transition-transform duration-200 ease-in-out hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
                                                onClick={() => navigate(`/service/${service.id}`)}
                                            >
                                                {/* @ts-ignore */}
                                                <ServiceCard service={service} onUpdate={() => fetchProfileData()} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-10 bg-white rounded-2xl shadow-lg border border-primary/10">
                                        <h3 className="text-xl font-semibold text-gray-700">Nenhum serviço oferecido</h3>
                                        <p className="text-gray-500 mt-2">Este vendedor ainda não oferece serviços.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === "reviews" && (
                            <div className="w-full bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-green-100 space-y-8">
                                <h2 className="text-2xl font-bold text-green-700">
                                    Avaliações Recebidas ({profile.total_reviews || 0})
                                </h2>

                                {user && !isOwner ? (
                                    <form onSubmit={handleSubmitReview} className="space-y-4 border border-green-300 p-4 rounded-xl bg-green-50">
                                        <h3 className="text-xl font-semibold text-gray-700 mb-2">Deixe sua Avaliação</h3>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Sua Nota *</label>
                                            {renderStarsStateful(reviewRating, true)} 
                                            <p className="text-xs text-gray-500 mt-1">Clique nas estrelas para dar uma nota.</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Comentário *</label>
                                            <Textarea
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                rows={3}
                                                required
                                                className="bg-white border-gray-300 focus:border-green-600"
                                                placeholder="Descreva sua experiência com este vendedor/prestador de serviço (Mín. 3 caracteres)."
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                {reviewComment.length}/3 caracteres mínimos
                                            </p>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            disabled={isSubmittingReview}
                                        >
                                            <Send className="h-4 w-4 mr-2" />
                                            {isSubmittingReview ? "Enviando..." : "Enviar Avaliação"}
                                        </Button>

                                        {(items.length === 0 && services.length === 0) && (
                                            <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                                                <p className="text-yellow-800 text-sm">
                                                    ⚠️ Este usuário não tem itens ou serviços listados. A avaliação pode não funcionar.
                                                </p>
                                            </div>
                                        )}
                                    </form>
                                ) : user && isOwner ? (
                                   
                                    <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
                                        <p className="text-gray-700">Você está visualizando seu próprio perfil. Não é possível se autoavaliar.</p>
                                    </div>
                                ) : (
                                    
                                    <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg">
                                        <p className="text-blue-800">Faça login para poder avaliar este vendedor.</p>
                                    </div>
                                )}

                                {reviews.length > 0 ? (
                                    <div className="space-y-6 pt-4">
                                        {reviews.map((review) => (
                                            <div key={review.id} className="flex gap-4 border-b border-gray-200 pb-4 last:border-b-0">
                                                <Avatar className="h-12 w-12 shrink-0">
                                                    <AvatarImage src={review.reviewer_profile?.avatar_url} alt={review.reviewer_profile?.name} />
                                                    <AvatarFallback className="bg-green-100 text-green-700">
                                                        {review.reviewer_profile?.name?.slice(0, 2).toUpperCase() || "??"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-bold text-lg text-gray-800">
                                                            {review.reviewer_profile?.name || "Avaliador Anônimo"}
                                                        </h4>
                                                        <span className="text-xs text-gray-500 mt-1">
                                                            {new Date(review.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    {renderStars(review.rating, false)}
                                                    <p className="text-gray-600 mt-2">{review.comment}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">Este vendedor ainda não recebeu nenhuma avaliação.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}