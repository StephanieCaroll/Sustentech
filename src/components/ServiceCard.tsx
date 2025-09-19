import { useState, useRef, useEffect } from "react";
import { Star, MapPin, Clock, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Service } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Definir interface para o perfil do usuário
interface UserProfile {
  name: string;
  avatar_url?: string;
  rating?: number;
  total_reviews?: number;
  is_verified?: boolean;
  bio?: string;
}

// Extender a interface Service para incluir images
interface ExtendedService extends Service {
  images?: string[];
  profiles?: UserProfile;
}

interface ServiceCardProps {
  service: ExtendedService;
  isFavorite?: boolean;
  onToggleFavorite?: (serviceId: string) => void;
  onStartConversation?: (providerId: string, service: Service) => void;
}

const ServiceCard = ({ service, isFavorite = false, onToggleFavorite, onStartConversation }: ServiceCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const isOwner = user?.id === service.user_id;

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isExpanded]);

  // Carregar URLs das imagens do bucket service-images
  useEffect(() => {
    const loadServiceImages = async () => {
      setLoadingImages(true);
      try {
        if (service.images && service.images.length > 0) {
          // Verificar se as imagens já são URLs completas
          const isFullUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://');
          
          const urls = await Promise.all(
            service.images.map(async (imagePath) => {
              if (typeof imagePath !== 'string') return '';
              
              // Se já é uma URL completa, usar diretamente
              if (isFullUrl(imagePath)) {
                return imagePath;
              }
              
              try {
                // Gerar URL assinada para a imagem no bucket service-images
                const { data, error } = await supabase.storage
                  .from('service-images')
                  .createSignedUrl(imagePath, 60 * 60); // URL válida por 1 hora
                
                if (error) {
                  console.error('Erro ao gerar URL assinada:', error);
                  return getDefaultImage();
                }
                
                return data?.signedUrl || getDefaultImage();
              } catch (error) {
                console.error('Erro ao processar imagem:', error, imagePath);
                return getDefaultImage();
              }
            })
          );
          
          const validUrls = urls.filter(url => url !== '');
          setImageUrls(validUrls.length > 0 ? validUrls : [getDefaultImage()]);
        } else {
          // Se não há imagens, usar imagem padrão
          setImageUrls([getDefaultImage()]);
        }
      } catch (error) {
        console.error('Erro ao carregar imagens:', error);
        setImageUrls([getDefaultImage()]);
      } finally {
        setLoadingImages(false);
      }
    };

    loadServiceImages();
  }, [service.images]);

  const getDefaultImage = () => {
    // Imagem padrão relacionada a serviços
    return "/placeholder-service.jpg";
  };

  const formatPrice = (pricePerHour?: number) => {
    if (!pricePerHour) return "A consultar";
    return `R$ ${pricePerHour.toFixed(2)}/hora`;
  };

  const formatAvailability = (availability: string) => {
    const availabilities: Record<string, string> = {
      'disponivel': 'Disponível',
      'ocupado': 'Ocupado',
      'offline': 'Offline'
    };
    return availabilities[availability] || availability;
  };

  const toggleExpand = () => {
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
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded && cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Atenção",
        description: "Você precisa estar logado para entrar em contato",
        variant: "destructive"
      });
      return;
    }

    if (isOwner) {
      toast({
        title: "Atenção",
        description: "Você não pode contratar seu próprio serviço",
        variant: "destructive"
      });
      return;
    }

    if (onStartConversation) {
      onStartConversation(service.user_id, service);
    }
  };

  const hasMultipleImages = imageUrls.length > 1;
  const currentImage = imageUrls[currentImageIndex] || getDefaultImage();

  if (loadingImages) {
    return (
      <Card className="w-full max-w-full overflow-hidden">
        <div className="aspect-square bg-muted animate-pulse" />
        <CardContent className="p-4 space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <Card 
        ref={cardRef}
        className={`w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-card hover:-translate-y-1 group cursor-pointer ${
          isExpanded 
            ? "fixed inset-0 md:inset-10 lg:inset-20 z-50 bg-background rounded-none md:rounded-lg shadow-xl overflow-y-auto max-h-screen" 
            : ""
        }`}
        onClick={!isExpanded ? toggleExpand : undefined}
      >
        <div className="relative">
          <div className={`${isExpanded ? "h-64 md:h-96" : "aspect-square"} overflow-hidden relative`}>
            <img 
              src={currentImage} 
              alt={service.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              style={{ objectPosition: 'center' }}
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
                          ? 'bg-white scale-125' 
                          : 'bg-white/50'
                      }`}
                      onClick={(e) => goToImage(index, e)}
                      aria-label={`Ir para imagem ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="absolute top-2 right-2 z-10">
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 rounded-full bg-background/80 backdrop-blur transition-colors ${
                isFavorite ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleFavorite) {
                  onToggleFavorite(service.id);
                }
              }}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
            </Button>
          </div>

          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 bg-primary/10 text-primary border-primary/20 z-10"
          >
            {service.categories?.name || 'Serviço'}
          </Badge>
        </div>

        <CardContent className={`p-4 ${isExpanded ? "space-y-4" : ""}`}>
          <div className="space-y-2 break-words">
            {/* Header */}
            <div className="flex items-start space-x-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={service.profiles?.avatar_url} alt={service.profiles?.name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {service.profiles?.name?.slice(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className={`font-semibold ${isExpanded ? "text-xl" : "text-sm"} truncate group-hover:text-primary transition-colors break-words`}>
                    {service.profiles?.name || 'Usuário'}
                  </h3>
                  {service.profiles?.is_verified && (
                    <CheckCircle className="h-4 w-4 text-primary fill-current" />
                  )}
                </div>
                
                <p className={`${isExpanded ? "text-lg" : "text-sm"} text-muted-foreground break-words`}>{service.name}</p>
                
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1 text-xs">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{service.profiles?.rating || 0}</span>
                    <span className="text-muted-foreground">({service.profiles?.total_reviews || 0})</span>
                  </div>
                </div>
              </div>
            </div>

            {!isExpanded && (
              <>
                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                  {service.description || 'Sem descrição disponível'}
                </p>

                {/* Info */}
                <div className="space-y-2 text-xs text-muted-foreground break-words">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{service.city || service.location || 'Localização'}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatAvailability(service.availability)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-primary">{formatPrice(service.price_per_hour)}</span>
                  <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow" onClick={handleContact}>
                    Contatar
                  </Button>
                </div>
              </>
            )}
          </div>

          {isExpanded && (
            <div className="pt-4 space-y-4">
              {/* Price and Rating */}
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-2xl md:text-3xl font-bold text-primary">
                  {formatPrice(service.price_per_hour)}
                </span>
                <div className="flex items-center space-x-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{service.profiles?.rating || 0}</span>
                  <span className="text-muted-foreground">({service.profiles?.total_reviews || 0} avaliações)</span>
                </div>
              </div>

              {/* Location and Availability */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{service.city || service.location || 'Localização não informada'}</span>
                </div>
                
                <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatAvailability(service.availability)}</span>
                </div>
              </div>

              {/* Description */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Descrição do Serviço</h4>
                <p className="text-muted-foreground whitespace-pre-line">
                  {service.description || "Este serviço não possui descrição detalhada."}
                </p>
              </div>
              
              {/* Gallery */}
              {hasMultipleImages && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Mais Imagens</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={url} 
                          alt={`${service.name} ${index + 1}`}
                          className={`w-full h-28 md:h-36 object-cover rounded-md cursor-pointer transition-opacity ${
                            index === currentImageIndex ? 'ring-2 ring-primary' : 'opacity-80 hover:opacity-100'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(index);
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getDefaultImage();
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Provider Info */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Sobre o Prestador</h4>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={service.profiles?.avatar_url} alt={service.profiles?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {service.profiles?.name?.slice(0, 2).toUpperCase() || 'US'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{service.profiles?.name || 'Usuário'}</h4>
                      {service.profiles?.is_verified && (
                        <CheckCircle className="h-4 w-4 text-primary fill-current" />
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{service.profiles?.rating || 0} • {service.profiles?.total_reviews || 0} avaliações</span>
                    </div>
                    {service.profiles?.bio && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {service.profiles.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button 
                  className="bg-gradient-to-r from-primary to-primary-glow flex-1 py-3 text-base"
                  onClick={handleContact}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Entrar em Contato
                </Button>
                <Button variant="outline" className="flex-1 py-3">
                  Solicitar Orçamento
                </Button>
              </div>
              
              {/* Back Button */}
              <div className="flex justify-center pt-2">
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand();
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
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
    </div>
  );
};

export default ServiceCard;