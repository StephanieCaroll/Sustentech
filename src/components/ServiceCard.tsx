import { useState, useRef, useEffect } from "react";
import { Star, MapPin, Clock, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Heart, MessageCircle, Edit, Trash2, Plus, X, Save } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  name: string;
  avatar_url?: string;
  rating?: number;
  total_reviews?: number;
  is_verified?: boolean;
  bio?: string;
}

interface ExtendedService extends Service {
  images?: string[];
  profiles?: UserProfile;
}

interface ServiceCardProps {
  service: ExtendedService;
  onStartConversation?: (providerId: string, service: Service, message: string) => void;
  onUpdateService?: (updatedService: Service) => void;
  onDeleteService?: (serviceId: string) => void;
  onFavoriteUpdate?: () => void;
}

const ServiceCard = ({
  service,
  onStartConversation,
  onUpdateService,
  onDeleteService,
  onFavoriteUpdate
}: ServiceCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: service.name || "",
    description: service.description || "",
    price_per_hour: service.price_per_hour || 0,
    availability: service.availability || "disponivel",
    city: service.city || "",
    location: service.location || "",
    category_id: service.category_id || ""
  });

  const isOwner = user?.id === service.user_id;
  const MAX_IMAGES = 5;

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) {
        setIsFavorite(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('service_id', service.id) 
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar favorito:', error);
          setIsFavorite(false);
          return;
        }
        
        setIsFavorite(!!data);
      } catch (error) {
        console.error('Erro ao verificar favorito:', error);
        setIsFavorite(false);
      }
    };

    checkFavorite();
  }, [user, service.id]);

  useEffect(() => {
    const loadServiceImages = async () => {
      setLoadingImages(true);
      try {
        if (service.images && service.images.length > 0) {
          const isFullUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://');

          const urls = await Promise.all(
            service.images.map(async (imagePath) => {
              if (typeof imagePath !== 'string') return '';

              if (isFullUrl(imagePath)) {
                return imagePath;
              }

              try {
                const { data, error } = await supabase.storage
                  .from('service-images')
                  .createSignedUrl(imagePath, 60 * 60);

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

  const toggleFavorite = async (e: React.MouseEvent) => {
  e.stopPropagation();

  if (!user) {
    toast({
      title: "Atenção",
      description: "Você precisa estar logado para favoritar serviços",
      variant: "destructive"
    });
    return;
  }

  try {
    if (isFavorite) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('service_id', service.id);

      if (error) {
        console.error('Erro ao remover favorito:', error);
        if (error.code === 'PGRST116' || error.message?.includes('found')) {
          setIsFavorite(false);
          return;
        }
        throw error;
      }

      setIsFavorite(false);
      toast({
        title: "Removido",
        description: "Serviço removido dos favoritos",
      });
    } else {
  
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          service_id: service.id, 
          item_id: null, 
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao adicionar favorito:', error);
       
        if (error.code === '23505' || error.message?.includes('unique')) {
          setIsFavorite(true);
          return;
        }
        throw error;
      }

      setIsFavorite(true);
      toast({
        title: "Adicionado",
        description: "Serviço adicionado aos favoritos",
      });
    }

    if (onFavoriteUpdate) {
      onFavoriteUpdate();
    }
  } catch (error: any) {
    console.error('Erro ao atualizar favoritos:', error);
    
    let errorMessage = "Não foi possível atualizar os favoritos";
    if (error?.code === '23505') {
      errorMessage = "Este serviço já está nos seus favoritos";
    } else if (error?.code === 'PGRST116') {
      errorMessage = "Favorito não encontrado";
    } else if (error?.code === '23514') {
      errorMessage = "Erro de constraint - verifique se está tentando favoritar um item e um serviço ao mesmo tempo";
    }

    toast({
      title: "Erro",
      description: errorMessage,
      variant: "destructive"
    });
  }
};

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price_per_hour' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    if (newImages.length + imageUrls.length + filesArray.length > MAX_IMAGES) {
      toast({
        title: "Limite excedido",
        description: `Você pode ter no máximo ${MAX_IMAGES} imagens`,
        variant: "destructive"
      });
      return;
    }

    setNewImages(prev => [...prev, ...filesArray]);
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const markImageForDeletion = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImagesToDelete(prev => [...prev, url]);
    setImageUrls(prev => prev.filter(imgUrl => imgUrl !== url));
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Serviço excluído com sucesso",
      });

      if (onDeleteService) {
        onDeleteService(service.id);
      }

      setIsDeleting(false);
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o serviço",
        variant: "destructive"
      });
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
     
      const uploadedImagePaths = [...service.images || []];
      
      for (const file of newImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('service-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        uploadedImagePaths.push(fileName);
      }

      const finalImagePaths = uploadedImagePaths.filter(path => 
        !imagesToDelete.includes(path)
      );

      const { data, error } = await supabase
        .from('services')
        .update({
          ...formData,
          images: finalImagePaths
        })
        .eq('id', service.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Serviço atualizado com sucesso",
      });

      if (onUpdateService) {
        onUpdateService(data);
      }

      setIsEditing(false);
      setNewImages([]);
      setImagesToDelete([]);
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o serviço",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: service.name || "",
      description: service.description || "",
      price_per_hour: service.price_per_hour || 0,
      availability: service.availability || "disponivel",
      city: service.city || "",
      location: service.location || "",
      category_id: service.category_id || ""
    });
    setNewImages([]);
    setImagesToDelete([]);
  };

  const handleContact = (e: React.MouseEvent, isBudgetRequest: boolean) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Atenção",
        description: "Você precisa estar logado para entrar em contato",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (onStartConversation) {
      const defaultMessage = isBudgetRequest 
        ? `Olá! Gostaria de solicitar um orçamento para o serviço: ${service.name}`
        : `Olá! Tenho interesse no seu serviço: ${service.name}`;
      
      onStartConversation(service.user_id, service, defaultMessage);
    }
  };

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

  const hasMultipleImages = imageUrls.length > 1;
  const currentImage = imageUrls[currentImageIndex] || getDefaultImage();

  return (
    <div className="relative">
      <Card
        ref={cardRef}
        className={`w-full max-w-full overflow-hidden group cursor-pointer ${
          isExpanded
            ? "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-background rounded-lg shadow-xl overflow-y-auto max-h-[90vh] w-[95vw] max-w-4xl"
            : "hover:shadow-card hover:-translate-y-1"
        }`}
        onClick={!isExpanded ? toggleExpand : undefined}
      >
        {!isExpanded && (
          <div className="relative">
            <div className="aspect-square overflow-hidden relative">
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <img
                  src={currentImage}
                  alt={service.name}
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
                          index === currentImageIndex ? "bg-white scale-125" : "bg-white/50"
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
                  isFavorite ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                }`}
                onClick={toggleFavorite}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              </Button>
            </div>

            <Badge
              variant="secondary"
              className="absolute top-2 left-2 bg-white text-primary border-primary/20 z-10"
            >
              {service.categories?.name || "Serviço"}
            </Badge>
          </div>
        )}

        <CardContent className={`p-4 ${isExpanded ? "space-y-4" : ""}`}>
          <div className="space-y-2 break-words">
            <div className="flex items-start space-x-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={service.profiles?.avatar_url} alt={service.profiles?.name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {service.profiles?.name?.slice(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className={`font-semibold ${isExpanded ? "text-xl" : "text-sm"} truncate ${!isExpanded ? "group-hover:text-primary transition-colors" : ""} break-words`}>
                    {service.profiles?.name || 'Usuário'}
                  </h3>
                  {service.profiles?.is_verified && (
                    <CheckCircle className="h-4 w-4 text-primary fill-current" />
                  )}
                </div>
                
                {isEditing ? (
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="text-lg text-green-600 font-medium mt-1"
                  />
                ) : (
                  <p className={`${isExpanded ? "text-lg text-green-600 font-medium" : "text-sm"} text-muted-foreground break-words`}>
                    {service.name}
                  </p>
                )}
                
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
                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                  {service.description || 'Sem descrição disponível'}
                </p>

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

                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-primary">{formatPrice(service.price_per_hour)}</span>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-primary to-primary-glow" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContact(e, false);
                    }}
                  >
                    Contatar
                  </Button>
                </div>
              </>
            )}
          </div>

          {isExpanded && (
            <div className="pt-4 space-y-4 md:grid md:grid-cols-[1fr_2fr] md:gap-6 md:space-y-0">
             
              {isOwner && !isEditing && (
                <div className="absolute top-4 right-4 z-10 flex gap-2">
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
                    alt={service.name}
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
                
                {isOwner && isEditing && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Imagens</h4>
                      {imageUrls.length < MAX_IMAGES && (
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
                            alt={`${service.name} ${index + 1}`}
                            className={`w-full h-28 md:h-36 object-cover rounded-md cursor-pointer transition-opacity ${
                              index === currentImageIndex ? 'ring-2 ring-primary' : 'opacity-80 hover:opacity-100'
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
                      {imageUrls.length + newImages.length} de {MAX_IMAGES} imagens (máximo)
                    </p>
                  </div>
                )}
                
                {hasMultipleImages && imageUrls.length > 1 && (
                  <div>
                    <h4 className="font-medium mb-2">Mais Imagens</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="w-full h-20 bg-muted flex items-center justify-center rounded-md overflow-hidden">
                            <img 
                              src={url} 
                              alt={`${service.name} ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:opacity-80"
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
                          {index === currentImageIndex && (
                            <div className="absolute inset-0 border-2 border-primary rounded-md pointer-events-none"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="md:col-span-1 space-y-4">
                {isEditing ? (
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="text-2xl md:text-3xl font-bold text-green-600"
                  />
                ) : (
                  <h2 className="text-2xl md:text-3xl font-bold text-green-600 break-words">
                    {service.name}
                  </h2>
                )}
               
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
                      {formatPrice(service.price_per_hour)}
                    </span>
                  )}
                  <div className="flex items-center space-x-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{service.profiles?.rating || 0}</span>
                    <span className="text-muted-foreground">({service.profiles?.total_reviews || 0} avaliações)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Cidade"
                        className="h-8"
                      />
                    ) : (
                      <span>{service.city || service.location || 'Localização não informada'}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Select 
                        value={formData.availability} 
                        onValueChange={(value) => handleSelectChange('availability', value)}
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
                      <span>{formatAvailability(service.availability)}</span>
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
                      {service.description || "Este serviço não possui descrição detalhada."}
                    </p>
                  )}
                </div>
             
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
              
                {!isOwner && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                    <Button 
                      className="bg-gradient-to-r from-primary to-primary-glow flex-1 py-3 text-base"
                      onClick={(e) => handleContact(e, false)}
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Entrar em Contato
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 py-3"
                      onClick={(e) => handleContact(e, true)}
                    >
                      Solicitar Orçamento
                    </Button>
                  </div>
                )}

                {isOwner && isEditing && (
                  <div className="flex gap-2 pt-4">
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isExpanded && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
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
    </div>
  );
};

export default ServiceCard;