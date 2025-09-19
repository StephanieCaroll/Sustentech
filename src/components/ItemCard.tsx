import { useState, useRef, useEffect } from "react";
import { Heart, MapPin, Star, ArrowLeft, ChevronLeft, ChevronRight, Edit, Save, Plus, X, ShoppingCart, CheckCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Item } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface ItemCardProps {
  item: Item;
  isLiked?: boolean;
  onUpdate?: () => void;
  onStartConversation?: (sellerId: string, item: Item) => void;
  onCartUpdate?: () => void;
}

const ItemCard = ({ item, isLiked = false, onUpdate, onStartConversation, onCartUpdate }: ItemCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: item.title,
    description: item.description || "",
    price: item.price || 0,
    condition: item.condition,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(item.image_urls || []);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const isOwner = user?.id === item.user_id;
  const MAX_IMAGES = 4;

  useEffect(() => {
  if (isExpanded) {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
  } else {
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
  }

  return () => {
    if (isExpanded) {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  };
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) {
      setCurrentImageIndex(0);
      setIsEditing(false);
      setImageUrls(item.image_urls || []);
    }
  }, [isExpanded, item.image_urls]);

  const formatPrice = (price?: number) => {
    if (!price) return "Gratuito";
    return `R$ ${price.toFixed(2)}`;
  };

  const formatCondition = (condition: string) => {
    const conditions: Record<string, string> = {
      'novo': 'Novo',
      'como_novo': 'Como Novo', 
      'bom': 'Bom Estado',
      'regular': 'Regular',
      'precisa_reparo': 'Precisa Reparo'
    };
    return conditions[condition] || condition;
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageUrls && imageUrls.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === imageUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageUrls && imageUrls.length > 0) {
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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ 
      ...prev, 
      [name]: name === 'price' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          title: editForm.title,
          description: editForm.description,
          price: editForm.price,
          condition: editForm.condition,
          image_urls: imageUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;

      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditForm({
      title: item.title,
      description: item.description || "",
      price: item.price || 0,
      condition: item.condition,
    });
    setImageUrls(item.image_urls || []);
    setIsEditing(false);
  };

  const handleAddImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || imageUrls.length >= MAX_IMAGES) {
      return;
    }

    const file = e.target.files[0];
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${item.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('items')  
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro detalhado no upload:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('items')  
        .getPublicUrl(filePath);

      setImageUrls(prev => [...prev, publicUrl]);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Verifique se o bucket existe e as permissões estão configuradas.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    if (imageUrls.length <= 1) {
      alert('O item deve ter pelo menos uma imagem');
      return;
    }

    try {
      const urlToRemove = imageUrls[index];
      
      const urlObj = new URL(urlToRemove);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.indexOf('items');
      
      if (bucketIndex === -1) {
        throw new Error('URL da imagem não contém o bucket esperado');
      }
      

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

    
      const { error: removeError } = await supabase.storage
        .from('items') 
        .remove([filePath]);

      if (removeError) {
        console.error('Erro detalhado na remoção:', removeError);
        throw removeError;
      }

      const newImageUrls = [...imageUrls];
      newImageUrls.splice(index, 1);
      setImageUrls(newImageUrls);
      
      if (currentImageIndex >= newImageUrls.length) {
        setCurrentImageIndex(newImageUrls.length - 1);
      }
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      alert('Erro ao remover imagem. Tente novamente.');
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Atenção",
        description: "Você precisa estar logado para comprar itens",
        variant: "destructive"
      });
      return;
    }

    if (isOwner) {
      toast({
        title: "Atenção",
        description: "Você não pode comprar seu próprio item",
        variant: "destructive"
      });
      return;
    }

    if (onStartConversation) {
      onStartConversation(item.user_id, item);
    }
  };

  const hasMultipleImages = imageUrls && imageUrls.length > 1;
  const currentImage = imageUrls?.[currentImageIndex] || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400";

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Atenção",
        description: "Você precisa estar logado para adicionar itens ao carrinho",
        variant: "destructive"
      });
      return;
    }

    if (isOwner) {
      toast({
        title: "Atenção",
        description: "Você não pode adicionar seu próprio item ao carrinho",
        variant: "destructive"
      });
      return;
    }

    try {
      // Verifica se o item já está no carrinho
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('item_id', item.id)
        .single();

      if (existingItem) {
        // Atualiza a quantidade se já existir
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Quantidade atualizada no carrinho"
        });
      } else {
        // Adiciona novo item ao carrinho
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            item_id: item.id,
            quantity: 1
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Item adicionado ao carrinho"
        });
      }
      
      // Notifica o componente pai sobre a atualização do carrinho
      if (onCartUpdate) {
        onCartUpdate();
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item ao carrinho",
        variant: "destructive"
      });
    }
  };

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
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ objectPosition: 'center' }}
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
                  isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              </Button>
            </div>

            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 bg-white text-primary border-primary/20 z-10"
            >
              {item.categories?.name || 'Categoria'}
            </Badge>
          </div>
        )}

        <CardContent className={`p-4 ${isExpanded ? "space-y-4" : ""}`}>
          <div className="space-y-2 break-words">
            <div className="flex items-start space-x-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={item.profiles?.avatar_url} alt={item.profiles?.name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {item.profiles?.name?.slice(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className={`font-semibold ${isExpanded ? "text-xl" : "text-sm"} truncate ${!isExpanded ? "group-hover:text-primary transition-colors" : ""} break-words`}>
                    {item.profiles?.name || 'Usuário'}
                  </h3>
                  {item.profiles?.is_verified && (
                    <CheckCircle className="h-4 w-4 text-primary fill-current" />
                  )}
                </div>
                
                {isEditing ? (
                  <Input
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    className="text-lg text-green-600 font-medium mt-1"
                  />
                ) : (
                  <p className={`${isExpanded ? "text-lg text-green-600 font-medium" : "text-sm"} text-muted-foreground break-words`}>
                    {item.title}
                  </p>
                )}
                
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1 text-xs">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{item.profiles?.rating || 0}</span>
                    <span className="text-muted-foreground">({item.profiles?.total_reviews || 0})</span>
                  </div>
                </div>
              </div>
            </div>

            {!isExpanded && (
              <>
                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                  {item.description || 'Sem descrição disponível'}
                </p>

                <div className="space-y-2 text-xs text-muted-foreground break-words">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{item.city || item.location || 'Localização'}</span>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className="text-xs border-primary/20 text-primary"
                  >
                    {formatCondition(item.condition)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-primary">{formatPrice(item.price)}</span>
                  <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow" onClick={handleBuyNow}>
                    Comprar
                  </Button>
                </div>
              </>
            )}
          </div>

          {isExpanded && (
            <div className="pt-4 space-y-4 md:grid md:grid-cols-[1fr_2fr] md:gap-6 md:space-y-0">
              <div className="md:col-span-1 space-y-4">
                <div className="h-64 md:h-80 lg:h-96 overflow-hidden rounded-lg relative">
                  <img 
                    src={currentImage} 
                    alt={item.title}
                    className="w-full h-full object-cover"
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
                
                {hasMultipleImages && imageUrls.length > 1 && (
                  <div>
                    <h4 className="font-medium mb-2">Mais Imagens</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="w-full h-20 bg-muted flex items-center justify-center rounded-md overflow-hidden">
                            <img 
                              src={url} 
                              alt={`${item.title} ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:opacity-80"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex(index);
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
                <h2 className="text-2xl md:text-3xl font-bold text-green-600 break-words">
                  {item.title}
                </h2>
               
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-2xl md:text-3xl font-bold text-primary">
                    {formatPrice(item.price)}
                  </span>
                  <div className="flex items-center space-x-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{item.profiles?.rating || 0}</span>
                    <span className="text-muted-foreground">({item.profiles?.total_reviews || 0} avaliações)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{item.city || item.location || 'Localização não informada'}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
                    <Badge 
                      variant="outline" 
                      className="border-primary/20 text-primary"
                    >
                      {formatCondition(item.condition)}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Descrição</h4>
                  {isEditing ? (
                    <Textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleEditChange}
                      className="text-sm"
                      rows={4}
                    />
                  ) : (
                    <p className="text-muted-foreground whitespace-pre-line">
                      {item.description || "Este item não possui descrição."}
                    </p>
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
                            onClick={handleAddImageClick}
                            disabled={uploading}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {uploading ? "Enviando..." : "Adicionar Imagem"}
                          </Button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                          />
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={url} 
                            alt={`${item.title} ${index + 1}`}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(index);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {imageUrls.length < MAX_IMAGES && (
                        <div 
                          className="border-2 border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center h-28 md:h-36 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={handleAddImageClick}
                        >
                          <Plus className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {imageUrls.length} de {MAX_IMAGES} imagens (máximo)
                    </p>
                  </div>
                )}
             
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Sobre o Vendedor</h4>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={item.profiles?.avatar_url} alt={item.profiles?.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {item.profiles?.name?.slice(0, 2).toUpperCase() || 'US'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{item.profiles?.name || 'Usuário'}</h4>
                        {item.profiles?.is_verified && (
                          <CheckCircle className="h-4 w-4 text-primary fill-current" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{item.profiles?.rating || 0} • {item.profiles?.total_reviews || 0} avaliações</span>
                      </div>
                      {item.profiles?.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {item.profiles.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                  <Button 
                    className="bg-gradient-to-r from-primary to-primary-glow flex-1 py-3 text-base"
                    onClick={handleBuyNow}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Comprar Agora
                  </Button>
                  <Button variant="outline" className="flex-1 py-3" onClick={handleAddToCart}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                </div>

                {isOwner && !isEditing && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Item
                  </Button>
                )}

                {isOwner && isEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Salvando..." : "Salvar"}
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
                      toggleExpand();
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
          onClick={toggleExpand}
        />
      )}
    </div>
  );
};

export default ItemCard;