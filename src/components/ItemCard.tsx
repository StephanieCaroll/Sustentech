import { useState, useRef, useEffect } from "react";
import {
  Heart,
  MapPin,
  Star,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit,
  Save,
  Plus,
  X,
  ShoppingCart,
  CheckCircle,
  MessageCircle,
  Trash2,
} from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ItemCardProps {
  item: Item;
  isLiked?: boolean;
  onUpdate?: () => void;
  onStartConversation?: (sellerId: string, item: Item) => void;
  onCartUpdate?: () => void;
  onFavoriteUpdate?: () => void;
  onDeleteItem?: (itemId: string) => void;
}

interface EditForm {
  title: string;
  description: string;
  price: number;
  condition: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  city: string;
  state: string;
}

interface ItemReview {
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

const ItemCard = ({
  item,
  isLiked = false,
  onUpdate,
  onStartConversation,
  onCartUpdate,
  onFavoriteUpdate,
  onDeleteItem,
}: ItemCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [internalItem, setInternalItem] = useState(item);
  const [itemReviews, setItemReviews] = useState<ItemReview[]>([]);
  const [itemRatingStats, setItemRatingStats] = useState({
    average: 0,
    count: 0,
  });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasUserRated, setHasUserRated] = useState(false);

  const [editForm, setEditForm] = useState<EditForm>({
    title: item.title,
    description: item.description || "",
    price: item.price || 0,
    condition: item.condition,
    logradouro: (item as any).logradouro || "",
    numero: (item as any).numero || "",
    complemento: (item as any).complemento || "",
    bairro: (item as any).bairro || "",
    cep: (item as any).cep || "",
    city: item.city || "",
    state: item.state || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(
    internalItem.image_urls || []
  );
  const [liked, setLiked] = useState(isLiked);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isOwner = user?.id === internalItem.user_id;
  const MAX_IMAGES = 4;

  const fetchItemReviews = async (itemId: string) => {
    if (!itemId) return;

    setLoadingReviews(true);
    try {
      const { data: reviewsData, error } = await supabase
        .from("item_reviews")
        .select(
          `
          id, 
          rating, 
          comment, 
          created_at, 
          user_id,
          profiles:user_id (name, avatar_url)
        `
        )
        .eq("item_id", itemId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      if (reviewsData) {
        setItemReviews(reviewsData as ItemReview[]);

        if (user) {
          const userReview = reviewsData.find(
            (review) => review.user_id === user.id
          );
          setHasUserRated(!!userReview);
          if (userReview) {
            setUserRating(userReview.rating);
            setRatingComment(userReview.comment || "");
          }
        }

        if (reviewsData.length > 0) {
          const totalRating = reviewsData.reduce(
            (sum, review) => sum + review.rating,
            0
          );
          const averageRating = totalRating / reviewsData.length;
          setItemRatingStats({
            average: Math.round(averageRating * 10) / 10,
            count: reviewsData.length,
          });
        } else {
          setItemRatingStats({ average: 0, count: 0 });
        }
      } else {
        setItemReviews([]);
        setItemRatingStats({ average: 0, count: 0 });
        setHasUserRated(false);
      }
    } catch (error) {
      console.error("Erro ao buscar avaliações do item:", error);
      setItemReviews([]);
      setItemRatingStats({ average: 0, count: 0 });
      setHasUserRated(false);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    setInternalItem(item);
  }, [item]);

  useEffect(() => {
    setEditForm({
      title: internalItem.title,
      description: internalItem.description || "",
      price: internalItem.price || 0,
      condition: internalItem.condition,
      logradouro: (internalItem as any).logradouro || "",
      numero: (internalItem as any).numero || "",
      complemento: (internalItem as any).complemento || "",
      bairro: (internalItem as any).bairro || "",
      cep: (internalItem as any).cep || "",
      city: internalItem.city || "",
      state: internalItem.state || "",
    });
    setImageUrls(internalItem.image_urls || []);
  }, [internalItem]);

  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked]);

  useEffect(() => {
    const checkIfLiked = async () => {
      if (user) {
        const { data } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("item_id", internalItem.id)
          .single();
        setLiked(!!data);
      }
    };
    if (user) {
      checkIfLiked();
    } else {
      setLiked(false);
    }
  }, [user, internalItem.id]);

 useEffect(() => {
  if (internalItem.id) {
    fetchItemReviews(internalItem.id);
  }
}, [internalItem.id]);

useEffect(() => {
  if (internalItem.id) {
    fetchItemReviews(internalItem.id);
  }
}, []);

  useEffect(() => {
    if (!isExpanded && hasUnsavedChanges && isEditing) {
      handleSaveEdit();
    }
  }, [isExpanded, hasUnsavedChanges, isEditing]);

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

  const formatPrice = (price?: number) => {
    if (!price || price === 0) return "Gratuito";
    return `R$ ${price.toFixed(2)}`;
  };

  const formatCondition = (condition: string) => {
    const conditions: Record<string, string> = {
      novo: "Novo",
      como_novo: "Como Novo",
      bom: "Bom Estado",
      regular: "Regular",
      precisa_reparo: "Precisa Reparo",
    };
    return conditions[condition] || condition;
  };

  const formatFullAddress = (itemData: Item | EditForm) => {
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

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizes = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizes[size]} ${
              rating >= star
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingStars = (
    currentRating: number,
    onRate: (rating: number) => void
  ) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            className="focus:outline-none transition-transform hover:scale-110"
            aria-label={`Avaliar com ${star} estrela${star > 1 ? "s" : ""}`}
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
        description: "Você precisa estar logado para avaliar itens",
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
        description: "Você não pode avaliar seu próprio item",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRating(true);
    try {
      if (hasUserRated) {
        const { error } = await supabase
          .from("item_reviews")
          .update({
            rating: userRating,
            comment: ratingComment,
            updated_at: new Date().toISOString(),
          })
          .eq("item_id", internalItem.id)
          .eq("user_id", user.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Avaliação atualizada com sucesso",
        });
      } else {
        const { error } = await supabase.from("item_reviews").insert({
          item_id: internalItem.id,
          user_id: user.id,
          rating: userRating,
          comment: ratingComment,
        });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Avaliação enviada com sucesso",
        });
      }

      await fetchItemReviews(internalItem.id);
      setIsRating(false);
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua avaliação",
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
        .from("item_reviews")
        .delete()
        .eq("item_id", internalItem.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Avaliação removida com sucesso",
      });

      setUserRating(0);
      setRatingComment("");
      setHasUserRated(false);
      await fetchItemReviews(internalItem.id);
    } catch (error) {
      console.error("Erro ao excluir avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover sua avaliação",
        variant: "destructive",
      });
    }
  };

  const toggleExpand = () => {
    if (isEditing) return;
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
      if (
        isExpanded &&
        !isEditing &&
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
  }, [isExpanded, isEditing]);

  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: name === "price" ? parseFloat(value) || 0 : value,
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveEdit = async () => {
    if (!hasUnsavedChanges && isEditing) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        title: editForm.title,
        description: editForm.description,
        price: editForm.price,
        condition: editForm.condition,
        image_urls: imageUrls,
        updated_at: new Date().toISOString(),
        logradouro: editForm.logradouro,
        numero: editForm.numero,
        complemento: editForm.complemento,
        bairro: editForm.bairro,
        cep: editForm.cep,
        city: editForm.city,
        state: editForm.state,
        location: editForm.city,
      };

      const { error } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", internalItem.id);

      if (error) throw error;

      setInternalItem((prev) => ({
        ...prev,
        ...updateData,
        profiles: prev.profiles,
        categories: prev.categories,
      }));

      setIsEditing(false);
      setHasUnsavedChanges(false);

      if (onUpdate) onUpdate();

      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditForm({
      title: internalItem.title,
      description: internalItem.description || "",
      price: internalItem.price || 0,
      condition: internalItem.condition,
      logradouro: (internalItem as any).logradouro || "",
      numero: (internalItem as any).numero || "",
      complemento: (internalItem as any).complemento || "",
      bairro: (internalItem as any).bairro || "",
      cep: (internalItem as any).cep || "",
      city: internalItem.city || "",
      state: internalItem.state || "",
    });
    setImageUrls(internalItem.image_urls || []);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const startEditing = (e: React.MouseEvent) => {
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
        .from("items")
        .delete()
        .eq("id", internalItem.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item excluído com sucesso",
      });

      if (onDeleteItem) {
        onDeleteItem(internalItem.id);
      }

      setIsDeleting(false);
      setIsExpanded(false);
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o item",
        variant: "destructive",
      });
    }
  };

  const handleAddImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      !e.target.files ||
      e.target.files.length === 0 ||
      imageUrls.length >= MAX_IMAGES
    ) {
      return;
    }
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${internalItem.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("items")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) {
        console.error("Erro detalhado no upload:", uploadError);
        throw uploadError;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("items").getPublicUrl(filePath);
      setImageUrls((prev) => [...prev, publicUrl]);
      setHasUnsavedChanges(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast({
        title: "Sucesso",
        description: "Imagem adicionada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast({
        title: "Erro",
        description:
          "Erro ao fazer upload da imagem. Verifique se o bucket existe e as permissões estão configuradas.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    if (imageUrls.length <= 1) {
      toast({
        title: "Atenção",
        description: "O item deve ter pelo menos uma imagem",
        variant: "destructive",
      });
      return;
    }
    try {
      const urlToRemove = imageUrls[index];
      const urlObj = new URL(urlToRemove);
      const pathParts = urlObj.pathname.split("/");
      const bucketIndex = pathParts.indexOf("items");
      if (bucketIndex === -1) {
        throw new Error("URL da imagem não contém o bucket esperado");
      }
      const filePath = pathParts.slice(bucketIndex + 1).join("/");

      const { error: removeError } = await supabase.storage
        .from("items")
        .remove([filePath]);
      if (removeError) {
        console.error("Erro detalhado na remoção:", removeError);
        throw removeError;
      }
      const newImageUrls = [...imageUrls];
      newImageUrls.splice(index, 1);
      setImageUrls(newImageUrls);
      setHasUnsavedChanges(true);
      if (currentImageIndex >= newImageUrls.length) {
        setCurrentImageIndex(newImageUrls.length - 1);
      }
      toast({
        title: "Sucesso",
        description: "Imagem removida com sucesso",
      });
    } catch (error) {
      console.error("Erro ao remover imagem:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover imagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Atenção",
        description: "Você precisa estar logado para comprar itens",
        variant: "destructive",
      });
      return;
    }
    if (isOwner) {
      toast({
        title: "Atenção",
        description: "Você não pode comprar seu próprio item",
        variant: "destructive",
      });
      return;
    }
    if (onStartConversation) {
      onStartConversation(internalItem.user_id, internalItem);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Atenção",
        description: "Você precisa estar logado para favoritar itens",
        variant: "destructive",
      });
      return;
    }
    try {
      if (liked) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", internalItem.id);
        if (error) throw error;
        setLiked(false);
        toast({
          title: "Removido",
          description: "Item removido dos favoritos",
        });
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          item_id: internalItem.id,
        });
        if (error) throw error;
        setLiked(true);
        toast({
          title: "Adicionado",
          description: "Item adicionado aos favoritos",
        });
      }
      if (onFavoriteUpdate) {
        onFavoriteUpdate();
      }
    } catch (error) {
      console.error("Erro ao atualizar favoritos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os favoritos",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Atenção",
        description:
          "Você precisa estar logado para adicionar itens ao carrinho",
        variant: "destructive",
      });
      return;
    }
    if (isOwner) {
      toast({
        title: "Atenção",
        description: "Você não pode adicionar seu próprio item ao carrinho",
        variant: "destructive",
      });
      return;
    }
    try {
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("item_id", internalItem.id)
        .single();
      if (existingItem) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Quantidade atualizada no carrinho",
        });
      } else {
        const { error } = await supabase.from("cart_items").insert({
          user_id: user.id,
          item_id: internalItem.id,
          quantity: 1,
        });
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Item adicionado ao carrinho",
        });
      }
      if (onCartUpdate) {
        onCartUpdate();
      }
    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item ao carrinho",
        variant: "destructive",
      });
    }
  };

  const hasMultipleImages = imageUrls && imageUrls.length > 1;
  const currentImage =
    imageUrls?.[currentImageIndex] ||
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400";

  return (
    <div className="relative">
      <Card
        ref={cardRef}
        className={`w-full overflow-hidden group cursor-pointer ${
          isExpanded
            ? "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-background rounded-lg shadow-xl overflow-y-auto max-h-[90vh] w-[95vw] max-w-4xl"
            : "hover:shadow-card hover:-translate-y-1"
        }`}
        onClick={
          !isExpanded && !isEditing && !isRating ? toggleExpand : undefined
        }
      >
        {!isExpanded && (
          <div className="relative">
            <div className="aspect-square overflow-hidden relative">
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <img
                  src={currentImage}
                  alt={internalItem.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ objectPosition: "center" }}
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
            <div className="absolute top-2 right-2 z-10">
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 rounded-full bg-background/80 backdrop-blur transition-colors ${
                  liked
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                }`}
                onClick={toggleFavorite}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              </Button>
            </div>
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 bg-white text-primary border-primary/20 z-10"
            >
              {internalItem.categories?.name || "Categoria"}
            </Badge>
          </div>
        )}

        <CardContent className={`p-4 ${isExpanded ? "space-y-4" : ""}`}>
          <div className="space-y-2 break-words">
            <div className="flex items-start space-x-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage
                  src={internalItem.profiles?.avatar_url}
                  alt={internalItem.profiles?.name}
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {internalItem.profiles?.name?.slice(0, 2).toUpperCase() ||
                    "US"}
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
                    {internalItem.profiles?.name || "Usuário"}
                  </h3>
                  {internalItem.profiles?.is_verified && (
                    <CheckCircle className="h-4 w-4 text-primary fill-current" />
                  )}
                </div>
                {isEditing && isExpanded ? (
                  <Input
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
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
                    {internalItem.title}
                  </p>
                )}
                <div className="flex items-center space-x-1 mt-1">
                  {renderStars(itemRatingStats.average, "sm")}
                  {itemRatingStats.count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({itemRatingStats.count})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isExpanded && (
              <>
                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                  {internalItem.description || "Sem descrição disponível"}
                </p>
                <div className="space-y-2 text-xs text-muted-foreground break-words">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {internalItem.city ||
                        (internalItem as any).location ||
                        "Localização"}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs border-primary/20 text-primary"
                  >
                    {formatCondition(internalItem.condition)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(internalItem.price)}
                  </span>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-primary to-primary-glow"
                    onClick={handleBuyNow}
                  >
                    Comprar
                  </Button>
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
                    alt={internalItem.title}
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
                {hasMultipleImages && imageUrls.length > 1 && (
                  <div>
                    <h4 className="font-medium mb-2">Mais Imagens</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="w-full h-20 bg-muted flex items-center justify-center rounded-md overflow-hidden">
                            <img
                              src={url}
                              alt={`${internalItem.title} ${index + 1}`}
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
                          {isEditing && (
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
                          )}
                        </div>
                      ))}
                      {isOwner &&
                        isEditing &&
                        imageUrls.length < MAX_IMAGES && (
                          <div
                            className="border-2 border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center h-20 md:h-36 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={handleAddImageClick}
                          >
                            <Plus className="h-8 w-8 text-muted-foreground/50" />
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/*"
                              className="hidden"
                            />
                          </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {imageUrls.length} de {MAX_IMAGES} imagens (máximo)
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl md:text-3xl font-bold text-green-600 break-words flex-1 mr-4">
                    {internalItem.title}
                  </h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-8 w-8 rounded-full transition-colors ${
                      liked
                        ? "text-red-500"
                        : "text-muted-foreground hover:text-red-500"
                    }`}
                    onClick={toggleFavorite}
                  >
                    <Heart
                      className={`h-5 w-5 ${liked ? "fill-current" : ""}`}
                    />
                  </Button>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <label htmlFor="price" className="text-sm font-medium">
                        Preço (R$)
                      </label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.price}
                        onChange={handleEditChange}
                        className="text-2xl md:text-3xl font-bold w-40"
                        placeholder="0.00"
                      />
                    </div>
                  ) : (
                    <span className="text-2xl md:text-3xl font-bold text-primary">
                      {formatPrice(internalItem.price)}
                    </span>
                  )}
                  <div className="flex items-center space-x-2">
                    {renderStars(itemRatingStats.average, "md")}
                    {itemRatingStats.count > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ({itemRatingStats.count})
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div
                    className={`p-2 bg-muted/30 rounded-md ${
                      isEditing ? "space-y-2" : "flex items-center space-x-2"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {!isEditing && (
                        <span>
                          {internalItem.city ||
                            (internalItem as any).location ||
                            "Localização não informada"}
                        </span>
                      )}
                    </div>
                    {isEditing && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Localização (Cidade)
                        </label>
                        <Input
                          name="city"
                          value={editForm.city}
                          onChange={handleEditChange}
                          placeholder="Digite a localização"
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div
                    className={`p-2 bg-muted/30 rounded-md ${
                      isEditing ? "space-y-2" : "flex items-center space-x-2"
                    }`}
                  >
                    {!isEditing ? (
                      <Badge
                        variant="outline"
                        className="border-primary/20 text-primary"
                      >
                        {formatCondition(internalItem.condition)}
                      </Badge>
                    ) : (
                      <div className="space-y-1 w-full">
                        <label className="text-xs text-muted-foreground">
                          Condição
                        </label>
                        <select
                          name="condition"
                          value={editForm.condition}
                          onChange={handleEditChange}
                          className="text-sm border rounded p-1 w-full"
                        >
                          <option value="novo">Novo</option>
                          <option value="como_novo">Como Novo</option>
                          <option value="bom">Bom Estado</option>
                          <option value="regular">Regular</option>
                          <option value="precisa_reparo">Precisa Reparo</option>
                        </select>
                      </div>
                    )}
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
                      {internalItem.description ||
                        "Este item não possui descrição."}
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
                            value={editForm.logradouro}
                            onChange={handleEditChange}
                            placeholder="Ex: Av. Paulista"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Número
                          </label>
                          <Input
                            name="numero"
                            value={editForm.numero}
                            onChange={handleEditChange}
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
                          value={editForm.complemento}
                          onChange={handleEditChange}
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
                            value={editForm.bairro}
                            onChange={handleEditChange}
                            placeholder="Ex: Bela Vista"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            CEP
                          </label>
                          <Input
                            name="cep"
                            value={editForm.cep}
                            onChange={handleEditChange}
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
                            value={editForm.city}
                            onChange={handleEditChange}
                            placeholder="Ex: São Paulo"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Estado (UF)
                          </label>
                          <Input
                            name="state"
                            value={editForm.state}
                            onChange={handleEditChange}
                            placeholder="Ex: SP"
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground">
                      {formatFullAddress(internalItem)}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Avaliações do Produto</h4>
                    {!isOwner && user && !isRating && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsRating(true)}
                      >
                        {hasUserRated ? "Editar Avaliação" : "Avaliar Produto"}
                      </Button>
                    )}
                  </div>

                  {isRating && (
                    <div className="bg-muted/30 rounded-lg p-4 mb-4 space-y-4">
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
                        <Textarea
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                          placeholder="Compartilhe sua experiência com este serviço..."
                          rows={3}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="resize-none"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={submitRating}
                          disabled={isSubmittingRating || userRating === 0}
                          className="flex-1"
                        >
                          {isSubmittingRating
                            ? "Enviando..."
                            : hasUserRated
                            ? "Atualizar Avaliação"
                            : "Enviar Avaliação"}
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

                  {loadingReviews ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : itemReviews.length > 0 ? (
                    <div className="space-y-4 max-h-60 overflow-y-auto">
                      {itemReviews.map((review) => (
                        <div
                          key={review.id}
                          className="flex gap-3 border-b border-gray-200 pb-3 last:border-b-0"
                        >
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage
                              src={review.profiles?.avatar_url}
                              alt={review.profiles?.name}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {review.profiles?.name
                                ?.slice(0, 2)
                                .toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-medium text-sm text-gray-800">
                                {review.profiles?.name || "Avaliador Anônimo"}
                              </h5>
                              <span className="text-xs text-gray-500">
                                {new Date(review.created_at).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </span>
                            </div>
                            {renderStars(review.rating, "sm")}
                            <p className="text-sm text-gray-600 mt-1 break-words">
                              {review.comment}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">
                        Este produto ainda não recebeu avaliações.
                      </p>
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
                            alt={`${internalItem.title} ${index + 1}`}
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
                  <div
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (internalItem.user_id) {
                        navigate(`/user/${internalItem.user_id}`);
                      }
                    }}
                  >
                    <Avatar className="h-14 w-14 shrink-0">
                      <AvatarImage
                        src={internalItem.profiles?.avatar_url}
                        alt={internalItem.profiles?.name}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {internalItem.profiles?.name
                          ?.slice(0, 2)
                          .toUpperCase() || "US"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">
                          {internalItem.profiles?.name || "Usuário"}
                        </h4>
                        {internalItem.profiles?.is_verified && (
                          <CheckCircle className="h-4 w-4 text-primary fill-current" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>
                          {internalItem.profiles?.rating || 0} •{" "}
                          {internalItem.profiles?.total_reviews || 0} avaliações
                        </span>
                      </div>
                      {internalItem.profiles?.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {internalItem.profiles.bio}
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
                </div>

                {isOwner && !isEditing && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={startEditing}
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

                {!isEditing && (
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
              Tem certeza que deseja excluir este item? Esta ação não pode ser
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
    </div>
  );
};

export default ItemCard;
