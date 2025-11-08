import { useState, useRef, useEffect } from "react";
import {
  Star,
  MapPin,
  Clock,
  CheckCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Edit,
  Trash2,
  Plus,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Service } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Messages } from "@/components/Message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

// Interface para as avaliações de serviços
interface ServiceReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
    avatar_url: string;
  };
}

interface ServiceFavorite {
  id: string;
  user_id: string;
  service_id: string;
  created_at: string;
}

interface FavoriteCheckResponse {
  id: string;
}

interface ExtendedService extends Service {
  images?: string[];
}

interface ServiceCardProps {
  service: ExtendedService;
  onStartConversation?: (
    providerId: string,
    service: Service,
    message: string
  ) => void;
  onUpdateService?: (updatedService: Service) => void;
  onDeleteService?: (serviceId: string) => void;
  onFavoriteUpdate?: () => void;
  isFavorite?: boolean;
}

interface ServiceEditForm {
  name: string;
  description: string;
  price_per_hour: number;
  availability: string;
  category_id: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  city: string;
  state: string;
}

const ServiceCard = ({
  service,
  onStartConversation,
  onUpdateService,
  onDeleteService,
  onFavoriteUpdate,
  isFavorite: externalIsFavorite = false,
}: ServiceCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [selectedService, setSelectedService] = useState<ExtendedService | null>(null);
  const [initialMessage, setInitialMessage] = useState("");
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isFavorite, setIsFavorite] = useState(externalIsFavorite);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasUserRated, setHasUserRated] = useState(false);
  const [userReviewId, setUserReviewId] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [internalService, setInternalService] = useState(service);

  const [formData, setFormData] = useState<ServiceEditForm>({
    name: service?.name || "",
    description: service?.description || "",
    price_per_hour: service?.price_per_hour || 0,
    availability: service?.availability || "disponivel",
    category_id: service?.category_id || "",
    logradouro: (service as any)?.logradouro || "",
    numero: (service as any)?.numero || "",
    complemento: (service as any)?.complemento || "",
    bairro: (service as any)?.bairro || "",
    cep: (service as any)?.cep || "",
    city: service?.city || "",
    state: service?.state || "",
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isOwner = user?.id === internalService?.user_id;
  const MAX_IMAGES = 5;

  const fetchServiceReviews = async (serviceId: string) => {
  if (!serviceId) return;
  
  setLoadingReviews(true);
  try {
    console.log("🔄 Buscando avaliações para o serviço:", serviceId);
  
    const { data: reviewsData, error } = await supabase
      .from("service_reviews")
      .select(`
        id, 
        rating, 
        comment, 
        created_at, 
        user_id
      `)
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("❌ Erro ao buscar avaliações:", error);
      if (error.code === '42P01' || error.code === 'PGRST116') {
        console.warn("Tabela service_reviews não encontrada");
        setReviews([]);
        setAverageRating(0);
        setTotalReviews(0);
        setHasUserRated(false);
        setUserReviewId(null);
        return;
      }
      throw error;
    }

    console.log("📊 Avaliações encontradas:", reviewsData);

    if (reviewsData && reviewsData.length > 0) {
      const userIds = reviewsData.map(review => review.user_id);
      console.log("🆔 IDs para buscar perfis:", userIds);
      
      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      console.log("📋 Perfis encontrados:", allProfiles);
      console.log("❌ Erro perfis:", profilesError);

      const reviewsWithProfiles = reviewsData.map((review) => {
      
        const userProfile = allProfiles?.find(profile => profile.user_id === review.user_id);
        console.log(`🔍 Buscando perfil para user_id ${review.user_id}:`, userProfile);
        
        if (userProfile) {
          console.log(`✅ Perfil encontrado: ${userProfile.name}`);
          return {
            ...review,
            profiles: {
              name: userProfile.name || "Sem nome",
              avatar_url: userProfile.avatar_url || ""
            }
          };
        } else {
          console.log(`❌ Perfil NÃO encontrado para user_id: ${review.user_id}`);
          return {
            ...review,
            profiles: {
              name: "Usuário Anônimo",
              avatar_url: ""
            }
          };
        }
      });

      console.log("🎯 Avaliações FINAIS com perfis:", reviewsWithProfiles);
      setReviews(reviewsWithProfiles as ServiceReview[]);
      
      if (user) {
        const userReview = reviewsData.find(review => review.user_id === user.id);
        console.log("🔍 Avaliação do usuário atual:", userReview);
        setHasUserRated(!!userReview);
        if (userReview) {
          setUserRating(userReview.rating);
          setRatingComment(userReview.comment || "");
          setUserReviewId(userReview.id);
        } else {
          setUserRating(0);
          setRatingComment("");
          setUserReviewId(null);
        }
      }
      
      const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviewsData.length;
      setAverageRating(Math.round(averageRating * 10) / 10);
      setTotalReviews(reviewsData.length);
      
    } else {
      console.log("📭 Nenhuma avaliação encontrada");
      setReviews([]);
      setAverageRating(0);
      setTotalReviews(0);
      setHasUserRated(false);
      setUserReviewId(null);
    }
  } catch (error) {
    console.error("💥 Erro ao buscar avaliações do serviço:", error);
    setReviews([]);
    setAverageRating(0);
    setTotalReviews(0);
    setHasUserRated(false);
    setUserReviewId(null);
  } finally {
    setLoadingReviews(false);
  }
};

const checkFavoriteStatus = async () => {
  if (!user || !internalService) {
    setIsFavorite(false);
    return;
  }

  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("service_id", internalService.id) 
      .maybeSingle();

    if (error) {
      console.error("Erro ao verificar favorito:", error);
      setIsFavorite(false);
      return;
    }

    setIsFavorite(!!data);
  } catch (error) {
    console.error("Erro ao verificar favorito:", error);
    setIsFavorite(false);
  }
};

const toggleFavorite = async (e: React.MouseEvent) => {
  e.stopPropagation();
  
  if (!user) {
    toast({
      title: "Atenção",
      description: "Você precisa estar logado para favoritar serviços",
      variant: "destructive",
    });
    return;
  }

  if (isOwner) {
    toast({
      title: "Atenção",
      description: "Você não pode favoritar seu próprio serviço",
      variant: "destructive",
    });
    return;
  }

  setLoadingFavorite(true);
  try {
    if (isFavorite) {
      
      const { error } = await supabase
        .from("favorites") 
        .delete()
        .eq("user_id", user.id)
        .eq("service_id", internalService.id); 

      if (error) throw error;

      setIsFavorite(false);
      toast({
        title: "Removido dos favoritos",
        description: "Serviço removido dos seus favoritos",
      });
    } else {
      
      const { error } = await supabase
        .from("favorites") 
        .insert({
          user_id: user.id,
          service_id: internalService.id, 
          created_at: new Date().toISOString(),
        });

      if (error) {

        if (error.code === '23505') {
          setIsFavorite(true);
          toast({
            title: "Adicionado aos favoritos",
            description: "Serviço já estava nos seus favoritos",
          });
          return;
        }
        throw error;
      }

      setIsFavorite(true);
      toast({
        title: "Adicionado aos favoritos",
        description: "Serviço adicionado aos seus favoritos",
      });
    }

    if (onFavoriteUpdate) {
      onFavoriteUpdate();
    }
  } catch (error: any) {
    console.error("Erro ao atualizar favoritos:", error);
    
    let errorMessage = "Não foi possível atualizar os favoritos";
    if (error?.code === '23505') {
      errorMessage = "Este serviço já está nos seus favoritos";
    }

    toast({
      title: "Erro",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    setLoadingFavorite(false);
  }
};

  
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              rating >= star
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingStars = (currentRating: number, onRate: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            className="focus:outline-none transition-transform hover:scale-110"
            aria-label={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
          >
            <Star
              className={`h-8 w-8 ${
                currentRating >= star
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-gray-300 hover:text-yellow-400"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const submitRating = async () => {
    if (!user) {
      toast({
        title: "Atenção",
        description: "Você precisa estar logado para avaliar serviços",
        variant: "destructive",
      });
      return;
    }

    if (userRating === 0) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione uma avaliação de 1 a 5 estrelas",
        variant: "destructive",
      });
      return;
    }

    if (isOwner) {
      toast({
        title: "Atenção",
        description: "Você não pode avaliar seu próprio serviço",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRating(true);
    try {
  
      const { error } = await supabase
        .from("service_reviews")
        .upsert({
          service_id: internalService.id,
          user_id: user.id,
          rating: userRating,
          comment: ratingComment,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'service_id,user_id'
        });

      if (error) {
        
        if (error.code === '42P01') {
          toast({
            title: "Funcionalidade indisponível",
            description: "Avaliações não estão disponíveis no momento",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Sucesso",
        description: hasUserRated ? "Avaliação atualizada com sucesso" : "Avaliação enviada com sucesso",
      });

      await fetchServiceReviews(internalService.id);
      setIsRating(false);
      
    } catch (error: any) {
      console.error("Erro ao enviar avaliação:", error);
      
      let errorMessage = "Não foi possível enviar sua avaliação";
      if (error?.code === '23505') {
        errorMessage = "Você já avaliou este serviço";
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const deleteRating = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("service_reviews")
        .delete()
        .eq("service_id", internalService.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Avaliação removida com sucesso",
      });

      setUserRating(0);
      setRatingComment("");
      setHasUserRated(false);
      await fetchServiceReviews(internalService.id);
      
    } catch (error) {
      console.error("Erro ao excluir avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover sua avaliação",
        variant: "destructive",
      });
    }
  };

  const ReviewsSection = () => {
  if (loadingReviews) {
    return (
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Avaliações do Serviço</h4>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">Avaliações do Serviço</h4>
        {!isOwner && user && !isRating && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRating(true)}
          >
            {hasUserRated ? "Editar Avaliação" : "Avaliar Serviço"}
          </Button>
        )}
      </div>

      {/* Formulário de Avaliação */}
      {isRating && (
        <div 
          className="bg-muted/30 rounded-lg p-4 mb-4 space-y-4"
          style={{ direction: "ltr" }}
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              Sua Avaliação
            </label>
            {renderRatingStars(userRating, setUserRating)}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Comentário (opcional)
            </label>
            <div style={{ direction: "ltr" }}>
              <Textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Compartilhe sua experiência com este serviço..."
                className="min-h-[80px]"
                style={{ 
                  direction: "ltr", 
                  textAlign: "left",
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={submitRating}
              disabled={isSubmittingRating || userRating === 0}
              className="flex-1"
            >
              {isSubmittingRating ? "Enviando..." : hasUserRated ? "Atualizar Avaliação" : "Enviar Avaliação"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsRating(false);
                if (!hasUserRated) {
                  setUserRating(0);
                  setRatingComment("");
                }
              }}
            >
              Cancelar
            </Button>
            {hasUserRated && (
              <Button
                variant="destructive"
                onClick={deleteRating}
                disabled={isSubmittingRating}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Lista de Avaliações*/}
      {reviews.length > 0 ? (
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-3 border-b border-gray-200 pb-3 last:border-b-0">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage 
                  src={review.profiles?.avatar_url || ""} 
                  alt={review.profiles?.name || "Usuário"} 
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {review.profiles?.name?.slice(0, 2).toUpperCase() || "US"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h5 className="font-medium text-sm text-gray-800">
                    {review.profiles?.name || "Usuário Anônimo"}
                  </h5>
                  <span className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {renderStars(review.rating, "sm")}
                {review.comment && (
                  <p className="text-sm text-gray-600 mt-1 break-words">
                    {review.comment}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">Este serviço ainda não recebeu avaliações.</p>
          {!isOwner && user && !isRating && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setIsRating(true)}
            >
              Seja o primeiro a avaliar
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

useEffect(() => {
  const checkTablesExistence = async () => {
    if (!user || !internalService) return;

    try {
     
      const { error: favoritesError } = await supabase
        .from('favorites') 
        .select('id')
        .limit(1);

      if (favoritesError) {
        console.error('Erro ao acessar tabela favorites:', favoritesError);
       
        setIsFavorite(false);
      }
    } catch (error) {
      console.warn('Erro ao verificar tabela favorites:', error);
    }
  };

  checkTablesExistence();
}, [user, internalService]);

  useEffect(() => {
    setInternalService(service);
  }, [service]);

  useEffect(() => {
    if (internalService && isExpanded) {
     
      fetchServiceReviews(internalService.id);
    }
  }, [internalService, isExpanded]);

  useEffect(() => {
   
    checkFavoriteStatus();
  }, [user, internalService]);

  useEffect(() => {
    if (internalService) {
      setFormData({
        name: internalService.name || "",
        description: internalService.description || "",
        price_per_hour: internalService.price_per_hour || 0,
        availability: internalService.availability || "disponivel",
        category_id: internalService.category_id || "",
        logradouro: (internalService as any).logradouro || "",
        numero: (internalService as any).numero || "",
        complemento: (internalService as any).complemento || "",
        bairro: (internalService as any).bairro || "",
        cep: (internalService as any).cep || "",
        city: internalService.city || "",
        state: internalService.state || "",
      });
      setImageUrls(internalService.images || [getDefaultImage()]);
    } else {
      setFormData({
        name: "",
        description: "",
        price_per_hour: 0,
        availability: "disponivel",
        category_id: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cep: "",
        city: "",
        state: "",
      });
      setImageUrls([getDefaultImage()]);
    }
  }, [internalService]);

  useEffect(() => {
    const loadServiceImages = async () => {
      if (!internalService) {
        setLoadingImages(false);
        setImageUrls([getDefaultImage()]);
        return;
      }

      setLoadingImages(true);
      try {
        if (internalService.images && internalService.images.length > 0) {
          const isFullUrl = (url: string) =>
            url.startsWith("http://") || url.startsWith("https://");

          const urls = await Promise.all(
            internalService.images.map(async (imagePath) => {
              if (typeof imagePath !== "string") return "";
              if (isFullUrl(imagePath)) {
                return imagePath;
              }
              try {
                const { data: publicData } = supabase.storage
                  .from("service-images")
                  .getPublicUrl(imagePath);

                if (publicData?.publicUrl) {
                  const res = await fetch(publicData.publicUrl, {
                    method: "HEAD",
                  });
                  if (res.ok) return publicData.publicUrl;
                }

                const { data, error } = await supabase.storage
                  .from("service-images")
                  .createSignedUrl(imagePath, 60 * 60);

                if (error) {
                  console.error("Erro ao gerar URL assinada:", error);
                  return getDefaultImage();
                }
                return data?.signedUrl || getDefaultImage();
              } catch (error) {
                console.error("Erro ao processar imagem:", error, imagePath);
                return getDefaultImage();
              }
            })
          );

          const validUrls = urls.filter((url) => url !== "");
          setImageUrls(
            validUrls.length > 0 ? validUrls : [getDefaultImage()]
          );
        } else {
          setImageUrls([getDefaultImage()]);
        }
      } catch (error) {
        console.error("Erro ao carregar imagens:", error);
        setImageUrls([getDefaultImage()]);
      } finally {
        setLoadingImages(false);
      }
    };

    loadServiceImages();
  }, [internalService]);

  if (!internalService) {
    return null;
  }

  const getDefaultImage = () => {
    return "/placeholder-service.jpg";
  };

  const formatPrice = (pricePerHour?: number) => {
    if (!pricePerHour) return "A consultar";
    return `R$ ${pricePerHour.toFixed(2)}/hora`;
  };

  const formatAvailability = (availability: string) => {
    const availabilities: Record<string, string> = {
      disponivel: "Disponível",
      ocupado: "Ocupado",
      offline: "Offline",
    };
    return availabilities[availability] || availability;
  };

  const formatFullAddress = (itemData: ExtendedService | ServiceEditForm) => {
    const item = itemData as any;
    if (!item.logradouro && !item.city) return "Localização não informada";

    const parts: string[] = [];
    if (item.logradouro)
      parts.push(`${item.logradouro}, ${item.numero || "s/n"}`);
    if (item.complemento) parts.push(item.complemento);
    if (item.bairro) parts.push(item.bairro);

    const firstLine = parts.filter(Boolean).join(" - ");
    const secondLine = [item.city, item.state].filter(Boolean).join(", ");
    const thirdLine = item.cep ? `CEP: ${item.cep}` : "";

    return (
      <>
        {firstLine && <span className="block">{firstLine}</span>}
        {secondLine && <span className="block">{secondLine}</span>}
        {thirdLine && <span className="block">{thirdLine}</span>}
      </>
    );
  };

  const toggleExpand = () => {
    if (isEditing || isRating) return;
    setIsExpanded(!isExpanded);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageUrls.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === imageUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageUrls.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? imageUrls.length - 1 : prev - 1
      );
    }
  };

  const goToImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  useEffect(() => {
    if (isExpanded) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      if (document.body.style.position === "fixed") {
        const scrollY = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) {
      setCurrentImageIndex(0);
      setIsEditing(false);
      setIsRating(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isExpanded &&
        !isEditing &&
        !isRating &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, isEditing, isRating]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price_per_hour" ? parseFloat(value) || 0 : value,
    }));
    setHasUnsavedChanges(true);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setHasUnsavedChanges(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    if (newImages.length + imageUrls.length + filesArray.length > MAX_IMAGES) {
      toast({
        title: "Limite excedido",
        description: `Você pode ter no máximo ${MAX_IMAGES} imagens`,
        variant: "destructive",
      });
      return;
    }

    setNewImages((prev) => [...prev, ...filesArray]);
    setHasUnsavedChanges(true);
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const markImageForDeletion = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImagesToDelete((prev) => [...prev, url]);
    setImageUrls((prev) => prev.filter((imgUrl) => imgUrl !== url));
    setHasUnsavedChanges(true);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setHasUnsavedChanges(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", internalService.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Serviço excluído com sucesso",
      });

      if (onDeleteService) {
        onDeleteService(internalService.id);
      }

      setIsDeleting(false);
      setIsExpanded(false);
    } catch (error) {
      console.error("Erro ao excluir serviço:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o serviço",
        variant: "destructive",
      });
    }
  };

  const saveChanges = async () => {
    if (!hasUnsavedChanges && isEditing) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const originalImagePaths = (internalService.images || [])
        .filter((path) => {
          if (imagesToDelete.includes(path)) return false;
          const isUrl = path.startsWith("http");
          if (isUrl && !imageUrls.includes(path)) return false;
          if (isUrl) {
            try {
              const urlObj = new URL(path);
              const pathParts = urlObj.pathname.split("/");
              const bucketIndex = pathParts.indexOf("service-images");
              if (bucketIndex === -1) return null;
              return pathParts.slice(bucketIndex + 1).join("/");
            } catch (e) {
              return null;
            }
          }
          return true;
        })
        .filter(Boolean) as string[];

      const uploadedImagePaths: string[] = [];

      for (const file of newImages) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id}/${
          internalService.id
        }/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("service-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        uploadedImagePaths.push(fileName);
      }

      if (imagesToDelete.length > 0) {
        const pathsToDelete = imagesToDelete
          .map((url) => {
            try {
              const urlObj = new URL(url);
              const pathParts = urlObj.pathname.split("/");
              const bucketIndex = pathParts.indexOf("service-images");
              if (bucketIndex === -1) return null;
              return pathParts.slice(bucketIndex + 1).join("/");
            } catch (e) {
              return url;
            }
          })
          .filter(Boolean) as string[];

        if (pathsToDelete.length > 0) {
          await supabase.storage.from("service-images").remove(pathsToDelete);
        }
      }

      const finalImagePaths = [...originalImagePaths, ...uploadedImagePaths];

      const updateData = {
        ...formData,
        images: finalImagePaths,
        location: formData.city,
      };

      const { data, error } = await supabase
        .from("services")
        .update(updateData)
        .eq("id", internalService.id)
        .select("*, categories(name)")
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Serviço atualizado com sucesso",
      });

      const mergedData = {
        ...internalService,
        ...data,
      };

      setInternalService(mergedData as any);

      if (onUpdateService) {
        onUpdateService(mergedData);
      }

      setIsEditing(false);
      setNewImages([]);
      setImagesToDelete([]);
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error("Erro DETALHADO ao atualizar serviço:", error);
      console.error("Mensagem do Erro:", error?.message);
      toast({
        title: "Erro",
        description:
          error?.message || "Não foi possível atualizar o serviço",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: internalService.name || "",
      description: internalService.description || "",
      price_per_hour: internalService.price_per_hour || 0,
      availability: internalService.availability || "disponivel",
      category_id: internalService.category_id || "",
      logradouro: (internalService as any).logradouro || "",
      numero: (internalService as any).numero || "",
      complemento: (internalService as any).complemento || "",
      bairro: (internalService as any).bairro || "",
      cep: (internalService as any).cep || "",
      city: internalService.city || "",
      state: internalService.state || "",
    });
    setNewImages([]);
    setImagesToDelete([]);
    setImageUrls(internalService.images || [getDefaultImage()]);
    setHasUnsavedChanges(false);
  };

  const handleContact = (
    e: React.MouseEvent,
    contactType: "contact" | "budget"
  ) => {
    e.stopPropagation();

    if (!user) {
      toast({
        title: "Atenção",
        description: "Você precisa estar logado para entrar em contato",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (contactType === "budget") {
      navigate(`/servicos/${internalService.id}/orcamento`);
      return;
    }

    const message = "";

    if (onStartConversation) {
      onStartConversation(
        internalService.user_id,
        internalService,
        message
      );
      return;
    }

    setSelectedSellerId(internalService.user_id);
    setSelectedService(internalService);
    setInitialMessage(message);
    setIsMessagesOpen(true);
  };

  const hasMultipleImages = imageUrls.length > 1;
  const currentImage = imageUrls[currentImageIndex] || getDefaultImage();

  return (
    <div className="relative">
      <Card
        ref={cardRef}
        className={`w-full overflow-hidden group cursor-pointer ${
          isExpanded
            ? "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-background rounded-lg shadow-xl overflow-y-auto max-h-[90vh] w-[95vw] max-w-4xl"
            : "hover:shadow-card hover:-translate-y-1"
        }`}
        onClick={(e) => {
          if (!isExpanded && !isEditing && !isRating) {
            toggleExpand();
          }
        }}
      >
        {!isExpanded && (
          <div className="relative">
            <div className="aspect-square overflow-hidden relative">
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <img
                  src={currentImage}
                  alt={internalService.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ objectPosition: "center" }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getDefaultImage();
                  }}
                />
              </div>

              {hasMultipleImages && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {imageUrls.map((_, index) => (
                      <button
                        key={index}
                        className={`h-2 w-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? "bg-white scale-125"
                            : "bg-white/50"
                        }`}
                        onClick={(e) => goToImage(index, e)}
                        aria-label={`Ir para imagem ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 rounded-full bg-background/80 backdrop-blur transition-colors ${
                  isFavorite
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                } ${loadingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={toggleFavorite}
                disabled={loadingFavorite || isOwner}
                title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart
                  className={`h-4 w-4 ${isFavorite ? "fill-current" : ""} ${
                    loadingFavorite ? "animate-pulse" : ""
                  }`}
                />
              </Button>
            </div>

            <Badge
              variant="secondary"
              className="absolute top-2 left-2 bg-white text-primary border-primary/20 z-10"
            >
              {internalService.categories?.name || "Serviço"}
            </Badge>
          </div>
        )}

        <CardContent className={`p-4 ${isExpanded ? "space-y-4" : ""}`}>
          <div className="space-y-2 break-words">
            <div className="flex items-start space-x-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage
                  src={internalService.profiles?.avatar_url}
                  alt={internalService.profiles?.name}
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {internalService.profiles?.name
                    ?.slice(0, 2)
                    .toUpperCase() || "US"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3
                    className={`font-semibold ${
                      isExpanded ? "text-xl" : "text-sm"
                    } truncate ${
                      !isExpanded
                        ? "group-hover:text-primary transition-colors"
                        : ""
                    } break-words`}
                  >
                    {internalService.profiles?.name || "Usuário"}
                  </h3>
                  {internalService.profiles?.is_verified && (
                    <CheckCircle className="h-4 w-4 text-primary fill-current" />
                  )}
                </div>

                {isEditing && isExpanded ? (
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="text-lg text-green-600 font-medium mt-1"
                  />
                ) : (
                  <p
                    className={`${
                      isExpanded
                        ? "text-lg text-green-600 font-medium"
                        : "text-sm"
                    } text-muted-foreground break-words`}
                  >
                    {internalService.name}
                  </p>
                )}

                <div className="flex items-center space-x-1 mt-1">
                  {renderStars(averageRating, "sm")}
                  {totalReviews > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({totalReviews})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isExpanded && (
              <>
                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                  {internalService.description || "Sem descrição disponível"}
                </p>

                <div className="space-y-2 text-xs text-muted-foreground break-words">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {internalService.city ||
                        (internalService as any).location ||
                        "Localização"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatAvailability(internalService.availability)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(internalService.price_per_hour)}
                  </span>
                  {!isOwner && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-primary to-primary-glow"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContact(e, "contact");
                      }}
                    >
                      Contatar
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {isExpanded && (
            <div className="pt-4 space-y-4 md:grid md:grid-cols-[1fr_2fr] md:gap-6 md:space-y-0">
              {isOwner && !isEditing && (
                <div className="absolute top-4 right-4 z-[51] flex gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-10 w-10 rounded-full bg-background/80 backdrop-blur"
                    onClick={handleEdit}
                  >
                    <Edit className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-10 w-10 rounded-full bg-background/80 backdrop-blur"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              )}

              <div className="md:col-span-1 space-y-4">
                <div className="h-64 md:h-80 lg:h-96 overflow-hidden rounded-lg relative">
                  <img
                    src={currentImage}
                    alt={internalService.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getDefaultImage();
                    }}
                  />

                  {hasMultipleImages && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {imageUrls.map((_, index) => (
                          <button
                            key={index}
                            className={`h-2 w-2 rounded-full transition-all ${
                              index === currentImageIndex
                                ? "bg-white scale-125"
                                : "bg-white/50"
                            }`}
                            onClick={(e) => goToImage(index, e)}
                            aria-label={`Ir para imagem ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {isOwner && isEditing && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Imagens</h4>
                      {imageUrls.length + newImages.length < MAX_IMAGES && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {isUploading ? "Enviando..." : "Adicionar Imagem"}
                          </Button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                            multiple
                          />
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`${internalService.name} ${index + 1}`}
                            className={`w-full h-28 md:h-36 object-cover rounded-md cursor-pointer transition-opacity ${
                              index === currentImageIndex
                                ? "ring-2 ring-primary"
                                : "opacity-80 hover:opacity-100"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(index);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => markImageForDeletion(url, e)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {newImages.map((file, index) => (
                        <div key={`new-${index}`} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Nova imagem ${index + 1}`}
                            className="w-full h-28 md:h-36 object-cover rounded-md"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeNewImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {imageUrls.length + newImages.length < MAX_IMAGES && (
                        <div
                          className="border-2 border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center h-28 md:h-36 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Plus className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {imageUrls.length + newImages.length} de {MAX_IMAGES}{" "}
                      imagens (máximo)
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="text-2xl md:text-3xl font-bold text-green-600"
                    />
                  ) : (
                    <h2 className="text-2xl md:text-3xl font-bold text-green-600 break-words flex-1 mr-4">
                      {internalService.name}
                    </h2>
                  )}
                  {!isOwner && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 rounded-full transition-colors ${
                        isFavorite
                          ? "text-red-500"
                          : "text-muted-foreground hover:text-red-500"
                      } ${loadingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={toggleFavorite}
                      disabled={loadingFavorite}
                      title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Heart
                        className={`h-5 w-5 ${isFavorite ? "fill-current" : ""} ${
                          loadingFavorite ? "animate-pulse" : ""
                        }`}
                      />
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  {isEditing ? (
                    <Input
                      name="price_per_hour"
                      type="number"
                      step="0.01"
                      value={formData.price_per_hour}
                      onChange={handleInputChange}
                      className="text-2xl md:text-3xl font-bold text-primary w-32"
                    />
                  ) : (
                    <span className="text-2xl md:text-3xl font-bold text-primary">
                      {formatPrice(internalService.price_per_hour)}
                    </span>
                  )}
                  <div className="flex items-center space-x-2">
                    {renderStars(averageRating, "md")}
                    {totalReviews > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ({totalReviews})
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {internalService.city ||
                        (internalService as any).location ||
                        "Localização não informada"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Select
                        value={formData.availability}
                        onValueChange={(value) =>
                          handleSelectChange("availability", value)
                        }
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue placeholder="Disponibilidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponivel">Disponível</SelectItem>
                          <SelectItem value="ocupado">Ocupado</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>
                        {formatAvailability(internalService.availability)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Descrição do Serviço</h4>
                  {isEditing ? (
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="text-sm"
                      rows={4}
                      placeholder="Descreva seu serviço..."
                    />
                  ) : (
                    <p className="text-muted-foreground whitespace-pre-line">
                      {internalService.description ||
                        "Este serviço não possui descrição detalhada."}
                    </p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Endereço Completo</h4>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Logradouro (Rua, Av.)
                          </label>
                          <Input
                            name="logradouro"
                            value={formData.logradouro}
                            onChange={handleInputChange}
                            placeholder="Ex: Av. Paulista"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Número
                          </label>
                          <Input
                            name="numero"
                            value={formData.numero}
                            onChange={handleInputChange}
                            placeholder="Ex: 1578"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Complemento (opcional)
                        </label>
                        <Input
                            name="complemento"
                            value={formData.complemento}
                            onChange={handleInputChange}
                            placeholder="Ex: Apto 101, Bloco B"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Bairro
                            </label>
                            <Input
                              name="bairro"
                              value={formData.bairro}
                              onChange={handleInputChange}
                              placeholder="Ex: Bela Vista"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              CEP
                            </label>
                            <Input
                              name="cep"
                              value={formData.cep}
                              onChange={handleInputChange}
                              placeholder="Ex: 01310-200"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Cidade
                            </label>
                            <Input
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                              placeholder="Ex: São Paulo"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Estado (UF)
                            </label>
                            <Input
                              name="state"
                              value={formData.state}
                              onChange={handleInputChange}
                              placeholder="Ex: SP"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground">
                        {formatFullAddress(internalService)}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Sobre o Prestador</h4>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                      <Avatar className="h-14 w-14">
                        <AvatarImage
                          src={internalService.profiles?.avatar_url}
                          alt={internalService.profiles?.name}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {internalService.profiles?.name
                            ?.slice(0, 2)
                            .toUpperCase() || "US"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">
                            {internalService.profiles?.name || "Usuário"}
                          </h4>
                          {internalService.profiles?.is_verified && (
                            <CheckCircle className="h-4 w-4 text-primary fill-current" />
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                          {renderStars(internalService.profiles?.rating || 0, "sm")}
                          <span>
                            {internalService.profiles?.rating || 0} •{" "}
                            {internalService.profiles?.total_reviews || 0}{" "}
                            avaliações
                          </span>
                        </div>
                        {internalService.profiles?.bio && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {internalService.profiles.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Seção de avaliações do serviço - CORRIGIDA */}
                  <ReviewsSection />

                  {!isOwner && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                      <Button
                        className="bg-gradient-to-r from-primary to-primary-glow flex-1 py-3 text-base"
                        onClick={(e) => handleContact(e, "contact")}
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Entrar em Contato
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 py-3"
                        onClick={(e) => handleContact(e, "budget")}
                      >
                        Solicitar Orçamento
                      </Button>
                    </div>
                  )}

                  {isOwner && !isEditing && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleEdit}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Serviço
                    </Button>
                  )}

                  {isOwner && isEditing && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        className="flex-1"
                        onClick={saveChanges}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={cancelEdit}
                        disabled={isSaving}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(false);
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isExpanded && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={toggleExpand}
          />
        )}

        <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este serviço? Esta ação não pode ser
                desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleting(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isMessagesOpen && (
          <Messages
            isOpen={isMessagesOpen}
            onClose={() => setIsMessagesOpen(false)}
            initialSellerId={selectedSellerId}
            initialItem={selectedService as Service | null}
            initialMessage={initialMessage}
          />
        )}
      </div>
    );
  };

  export default ServiceCard;