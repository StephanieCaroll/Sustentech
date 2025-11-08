import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    ArrowLeft,
    Heart,
    MapPin,
    Star,
    CheckCircle,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Save,
    X,
    Trash2, 
    Plus,   
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Item } from "@/hooks/useSupabaseData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type ItemWithProfile = Item & {
    profiles: any | null;
    categories: { name: string };
    image_urls?: string[]; 
};

const formatCEP = (cep: string) => {
    if (!cep) return cep;
    const digits = cep.replace(/\D/g, "").substring(0, 8); 
    if (digits.length > 5) {
        return `${digits.substring(0, 5)}-${digits.substring(5)}`;
    }
    return digits;
};

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
const formatPrice = (price?: number) => {
    if (!price || price === 0) return "Gratuito";
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(price);
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

const EditAddressForm = ({
    editForm,
    handleEditChange,
}: {
    editForm: any;
    handleEditChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void;
}) => (
    <div className="space-y-3 p-4 bg-primary/5 rounded-lg">
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
                <label className="text-xs text-muted-foreground">Número</label>
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
        <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Bairro</label>
            <Input
                name="bairro"
                value={editForm.bairro}
                onChange={handleEditChange}
                placeholder="Ex: Bela Vista"
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">CEP</label>
                <Input
                    name="cep"
                    value={editForm.cep}
                    onChange={handleEditChange}
                    maxLength={9} 
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cidade</label>
                <Input
                    name="city"
                    value={editForm.city}
                    onChange={handleEditChange}
                    placeholder="Ex: São Paulo"
                />
            </div>
        </div>
        <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Estado (UF)</label>
            <Input
                name="state"
                value={editForm.state}
                onChange={handleEditChange}
                placeholder="Ex: SP"
                maxLength={2}
            />
        </div>
    </div>
);

const StaticAddressBlock = ({ item }: { item: ItemWithProfile }) => {
    const parts: string[] = [];
    if (item.logradouro) parts.push(`${item.logradouro}, ${item.numero || "s/n"}`);
    if (item.complemento) parts.push(item.complemento);
    if (item.bairro) parts.push(item.bairro);
    const firstLine = parts.filter(Boolean).join(" - ");
    const cepFormatted = item.cep ? `CEP: ${formatCEP(item.cep)}` : ""; 
    const secondLine = [item.city, item.state].filter(Boolean).join(", ");
    const thirdLine = cepFormatted; 

    return (
        <div className="p-4 bg-primary/5 rounded-lg text-gray-700">
            {firstLine || secondLine || thirdLine ? (
                <>
                    {firstLine && <span className="block">{firstLine}</span>}
                    {secondLine && <span className="block">{secondLine}</span>}
                    {thirdLine && <span className="block">{thirdLine}</span>}
                </>
            ) : (
                "Localização não informada"
            )}
        </div>
    );
};

export default function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [item, setItem] = useState<ItemWithProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [liked, setLiked] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false); 
    const [isDeleting, setIsDeleting] = useState(false); 
    const fileInputRef = useRef<HTMLInputElement>(null); 
    
    const [editForm, setEditForm] = useState({
        title: "",
        price: 0,
        description: "",
        condition: "bom",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cep: "",
        city: "",
        state: "",
    });

    const getDefaultImage = () => {
        return "https://via.placeholder.com/600x600.png?text=Sem+Imagem";
    };

    const loadItemImages = async (imagePaths: string[]) => {
        if (!imagePaths || imagePaths.length === 0) {
            setImageUrls([getDefaultImage()]);
            return;
        }

        const urls = await Promise.all(
            imagePaths.map(async (imagePath) => {
                if (typeof imagePath !== "string") return "";
                if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                    return imagePath;
                }

                const { data: publicData } = supabase.storage
                    .from("items") 
                    .getPublicUrl(imagePath);

                if (publicData?.publicUrl) {
                    return publicData.publicUrl;
                }

                const { data, error } = await supabase.storage
                    .from("items") 
                    .createSignedUrl(imagePath, 60 * 60);

                if (error) {
                    console.error("Erro ao gerar URL assinada:", error);
                    return "";
                }
                return data?.signedUrl || "";
            })
        );

        const validUrls = urls.filter((url) => url !== "");
        setImageUrls(validUrls.length > 0 ? validUrls : [getDefaultImage()]);
    };


    useEffect(() => {
        async function fetchItem() {
            if (!id) return;
            setLoading(true);

            const { data: itemData, error: itemError } = await supabase
                .from("items")
                .select("*, categories(name), image_urls") 
                .eq("id", id)
                .maybeSingle();

            if (itemError) {
                console.error("Erro ao buscar ITEM:", itemError);
                navigate("/404");
                return;
            }

            let profileData = null;
            if (itemData) {
                const { data: pData, error: profileError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", itemData.user_id)
                    .limit(1)
                    .maybeSingle(); 

                if (profileError) {
                    console.error("Erro ao buscar PERFIL:", profileError);
                }
                profileData = pData;
            }

            const fullItem = itemData ? {
                ...itemData,
                profiles: profileData,
            } : null;

            setItem(fullItem as any);
            
            if (fullItem && fullItem.image_urls) {
                await loadItemImages(fullItem.image_urls);
            } else {
                 setImageUrls([getDefaultImage()]);
            }

            if (fullItem) {
                setEditForm({
                    title: fullItem.title || "",
                    price: fullItem.price || 0,
                    description: fullItem.description || "",
                    condition: fullItem.condition || "bom",
                    logradouro: fullItem.logradouro || "",
                    numero: fullItem.numero || "",
                    complemento: fullItem.complemento || "",
                    bairro: fullItem.bairro || "",
                    cep: formatCEP(fullItem.cep || ""),
                    city: fullItem.city || "",
                    state: fullItem.state || "",
                });
            }


            setLoading(false);
        }

        fetchItem();
    }, [id, navigate]);

    useEffect(() => {
        if (!user || !item) return;
        const checkIfLiked = async () => {
            const { data } = await supabase
                .from("favorites")
                .select("id")
                .eq("user_id", user.id)
                .eq("item_id", item.id)
                .limit(1)
                .maybeSingle();
            setLiked(!!data);
        };
        checkIfLiked();
    }, [user, item]);

    const hasMultipleImages = imageUrls.length > 1;

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) =>
            prev === imageUrls.length - 1 ? 0 : prev + 1
        );
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) =>
            prev === 0 ? imageUrls.length - 1 : prev - 1
        );
    };

    const goToImage = (index: number) => {
        setCurrentImageIndex(index);
    };


    const handleEditChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value } = e.target;
        
        let newValue: string | number | undefined = value;

        if (name === "cep") {
            const cleanedValue = value.replace(/\D/g, ''); 
            newValue = formatCEP(cleanedValue);
        } else if (name === "price") {
            newValue = parseFloat(value) || 0;
        }

        setEditForm((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    const cancelEdit = () => {
        if (!item) return;
        setEditForm({
            title: item.title || "",
            price: item.price || 0,
            description: item.description || "",
            condition: item.condition || "bom",
            logradouro: item.logradouro || "",
            numero: item.numero || "",
            complemento: item.complemento || "",
            bairro: item.bairro || "",
            cep: formatCEP(item.cep || ""), 
            city: item.city || "",
            state: item.state || "",
        });
       
        if (item.image_urls) {
             loadItemImages(item.image_urls);
        } else {
            setImageUrls([getDefaultImage()]);
        }
        
        setCurrentImageIndex(0);
        setIsEditing(false);
    };

    const handleSaveEdit = async () => {
        if (!item || imageUrls.length === 0 || imageUrls[0] === getDefaultImage()) {
            toast({ title: "Erro", description: "O item deve ter pelo menos uma imagem válida.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        
        const cepToSave = editForm.cep.replace(/\D/g, ''); 
       
        const validImageUrls = imageUrls.filter(url => url !== getDefaultImage()); 

        const updateData = {
            ...editForm,
            cep: cepToSave, 
            image_urls: validImageUrls, 
            updated_at: new Date().toISOString(),
            location: editForm.city,
        };

        try {
            const { data: updatedItem, error } = await supabase
                .from("items")
                .update(updateData)
                .eq("id", item.id)
                .select("*, categories(name), image_urls")
                .maybeSingle();

            if (error) throw error;
            if (!updatedItem) throw new Error("Falha ao salvar. Registro não encontrado.");
           
            setItem(prevItem => {
                if (!prevItem) return null;
                return {
                    ...prevItem,
                    ...updatedItem,
                    profiles: prevItem.profiles,
                };
            });
            
            setImageUrls(updatedItem.image_urls || [getDefaultImage()]);
            setCurrentImageIndex(0);

            toast({ title: "Sucesso", description: "Item atualizado." });
            setIsEditing(false);
        } catch (error) {
            console.error("Erro ao salvar item:", error);
            toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation(); 
        
        if (!user || !item) {
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
                    .eq("item_id", item.id);
                if (error) throw error;
                setLiked(false);
                toast({ title: "Removido", description: "Item removido dos favoritos" });
            } else {
                const { error } = await supabase.from("favorites").insert({
                    user_id: user.id,
                    item_id: item.id,
                });
                if (error) throw error;
                setLiked(true);
                toast({ title: "Adicionado", description: "Item adicionado aos favoritos" });
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

    const handleBuyNow = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !item) {
            toast({ title: "Atenção", description: "Você precisa estar logado.", variant: "destructive" });
            return;
        }
        toast({
            title: "Iniciando conversa...",
            description: "Redirecionando para o chat com o vendedor.",
        });
    };
    
    const handleAddImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (imageUrls.filter(url => url !== getDefaultImage()).length >= 4) {
            toast({ title: "Limite atingido", description: "O máximo é 4 imagens por item.", variant: "destructive" });
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !item) return;

        if (imageUrls.filter(url => url !== getDefaultImage()).length >= 4) return;
        if (file.size > 2 * 1024 * 1024) { 
            toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
            return;
        }
        
        setIsUploading(true);

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${item.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from("items")
                .upload(filePath, file);
                
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("items")
                .getPublicUrl(filePath);
           
            setImageUrls(prev => {
                const newUrls = prev.filter(url => url !== getDefaultImage());
                return [...newUrls, publicUrl];
            });
            
            setCurrentImageIndex(imageUrls.length);

            toast({ title: "Sucesso", description: "Imagem adicionada. Clique em Salvar para atualizar o item." });

        } catch (error) {
            console.error("Erro ao fazer upload da imagem:", error);
            toast({ title: "Erro", description: "Falha no upload. Verifique as permissões do Storage.", variant: "destructive" });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; 
            }
        }
    };
    
    const handleRemoveImage = async (e: React.MouseEvent, urlToRemove: string) => {
        e.stopPropagation();
        if (imageUrls.filter(url => url !== getDefaultImage()).length <= 1) {
            toast({ title: "Atenção", description: "O item deve ter pelo menos uma imagem.", variant: "destructive" });
            return;
        }

        try {
           
            const urlObj = new URL(urlToRemove);
            const pathParts = urlObj.pathname.split('/');
            const bucketIndex = pathParts.findIndex(part => part === 'items'); 
            const filePath = pathParts.slice(bucketIndex + 1).join('/');

            const { error: removeError } = await supabase.storage
                .from('items')
                .remove([filePath]);

            if (removeError) {
                 console.warn("Aviso: Falha ao remover imagem do Storage (pode ser RLS), mas removemos localmente.");
            }
            
            setImageUrls(prev => {
                const newUrls = prev.filter(url => url !== urlToRemove);
                if (newUrls.length === 0) return [getDefaultImage()];
                return newUrls;
            });
            
            setCurrentImageIndex(0); 

            toast({ title: "Removida", description: "Imagem removida da galeria. Clique em Salvar para finalizar." });

        } catch (error) {
            toast({ title: "Erro", description: "Falha ao remover imagem.", variant: "destructive" });
        }
    };
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleting(true); 
    };
    
    const confirmDelete = async () => {
        if (!item) return;
        setIsDeleting(false);
        setLoading(true);
    
        try {
            const { error: dbError } = await supabase
                .from("items")
                .delete()
                .eq("id", item.id);
    
            if (dbError) throw dbError;
    
            toast({ title: "Sucesso", description: "Item excluído e liberado do seu perfil." });
            navigate("/profile"); // Redireciona para o perfil após excluir
    
        } catch (error) {
            console.error("Erro fatal ao excluir item:", error);
            toast({ title: "Erro", description: "Não foi possível excluir o item. Verifique as permissões de RLS.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const currentImage = imageUrls[currentImageIndex] || getDefaultImage();
    const isPlaceholder = currentImage === getDefaultImage();
    const currentImageUrls = imageUrls.filter(url => url !== getDefaultImage());


    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                Item não encontrado.
            </div>
        );
    }

    const isOwner = user?.id === item.user_id;

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background">
            <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
                
                {/* Botões de Ação no Topo */}
                <div className="flex justify-between items-center mb-4">
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    
                    {/* Botão de Lixo no Topo */}
                    {isOwner && (
                        <Button variant="destructive" size="icon" onClick={handleDelete} className="ml-auto" disabled={isEditing}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-primary/10">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Coluna da Esquerda: Galeria de Imagens (com pré-visualização de edição) */}
                        <div className="space-y-4">
                            
                            {/* Bloco da Imagem Principal */}
                            <div className="aspect-square w-full bg-muted rounded-2xl overflow-hidden relative">
                                
                                <img
                                    src={currentImage}
                                    alt={item.title}
                                    className={`w-full h-full object-cover ${isPlaceholder ? 'p-10 object-contain' : ''}`}
                                />
                                
                                {/* Botões de Navegação (Se houver mais de uma imagem e não estiver editando) */}
                                {!isPlaceholder && currentImageUrls.length > 1 && !isEditing && (
                                    <>
                                        <Button size="icon" variant="ghost" className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/50 backdrop-blur hover:bg-background/80" onClick={prevImage} >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/50 backdrop-blur hover:bg-background/80" onClick={nextImage} >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                            
                            {/* Bloco de Miniaturas (Thumbnails) para Visualização ou Edição */}
                            {isOwner && isEditing ? (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-primary">Gerenciar Imagens ({currentImageUrls.length}/4)</h4>
                                    <div className="grid grid-cols-4 gap-2">
                                        {imageUrls.map((url, index) => (
                                            url !== getDefaultImage() ? (
                                                <div key={index} className="relative group w-full aspect-square">
                                                    <img 
                                                        src={url} 
                                                        alt={`Miniatura ${index + 1}`} 
                                                        className={`w-full h-full object-cover rounded-md cursor-pointer ${index === currentImageIndex ? 'ring-2 ring-primary' : ''}`}
                                                        onClick={() => goToImage(index)}
                                                    />
                                                    <Button 
                                                        size="icon" 
                                                        variant="destructive" 
                                                        className="absolute top-1 right-1 h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => handleRemoveImage(e, url)}
                                                        disabled={currentImageUrls.length <= 1}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : null
                                        ))}
                                        {currentImageUrls.length < 4 && (
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="w-full h-auto aspect-square border-dashed border-primary/50"
                                                onClick={handleAddImageClick}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? '...' : <Plus className="h-5 w-5" />}
                                            </Button>
                                        )}
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                    </div>
                                </div>
                            ) : (
                                // Miniaturas de visualização normal
                                currentImageUrls.length > 1 && (
                                    <div className="grid grid-cols-4 gap-2">
                                        {currentImageUrls.map((url, index) => (
                                            <div
                                                key={index}
                                                className={`w-full aspect-square bg-muted rounded-md overflow-hidden cursor-pointer ${
                                                    index === currentImageIndex
                                                        ? "ring-2 ring-primary ring-offset-2"
                                                        : "opacity-70 hover:opacity-100"
                                                }`}
                                                onClick={() => goToImage(index)}
                                            >
                                                <img
                                                    src={url}
                                                    alt={`${item.title} ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>

                        {/* Coluna da Direita: Informações */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-start gap-4">
                                
                                {/* Título */}
                                {isEditing ? (
                                    <Input
                                        name="title"
                                        value={editForm.title}
                                        onChange={handleEditChange}
                                        className="text-3xl lg:text-4xl font-bold"
                                        placeholder="Título do Item"
                                    />
                                ) : (
                                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">
                                        {item.title}
                                    </h1>
                                )}

                                {/* Botão de Favorito */}
                                {!isEditing && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className={`h-10 w-10 rounded-full flex-shrink-0 ${
                                            liked ? "text-red-500 fill-red-500" : "text-muted-foreground"
                                            }`}
                                        onClick={toggleFavorite} 
                                        disabled={isOwner} 
                                    >
                                        <Heart className={`h-6 w-6 ${liked ? "fill-current" : ""}`} /> 
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {/* Preço */}
                                {isEditing ? (
                                    <div>
                                        <label className="text-xs text-muted-foreground">Preço (R$)</label>
                                        <Input
                                            name="price"
                                            type="number"
                                            value={editForm.price}
                                            onChange={handleEditChange}
                                            className="text-4xl font-bold text-primary w-48"
                                            placeholder="0.00"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-4xl font-bold text-primary">
                                        {formatPrice(item.price)}
                                    </span>
                                )}
                         
                                {!isEditing && !isOwner && (
                                    <Button
                                        size="lg"
                                        className="w-full bg-gradient-to-r from-primary to-primary-glow py-6 text-lg"
                                        onClick={handleBuyNow}
                                    >
                                        <MessageCircle className="mr-2 h-5 w-5" />
                                        Comprar Agora
                                    </Button>
                                )}
                                {!isEditing && isOwner && (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full py-6 text-lg"
                                        onClick={() => navigate("/profile")}
                                    >
                                        <CheckCircle className="mr-2 h-5 w-5" />
                                        Este item é seu
                                    </Button>
                                )}
                            </div>
                              
                            {!isEditing && item.profiles && (
                                <div className="border-t pt-6">
                                    <h4 className="font-semibold text-lg mb-3 text-primary">Sobre o Vendedor</h4>
                                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage src={item.profiles.avatar_url} alt={item.profiles.name} />
                                            <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                                {item.profiles.name?.slice(0, 2).toUpperCase() || "US"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg font-semibold text-gray-800">
                                                    {item.profiles.name}
                                                </span>
                                                {item.profiles.is_verified && (
                                                    <CheckCircle className="h-5 w-5 text-primary fill-current" />
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                                                {renderStars(item.profiles.rating || 0)}
                                                <span className="ml-1">
                                                    ({item.profiles.total_reviews || 0} avaliações)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border-t pt-6 space-y-4">
                                <h4 className="font-semibold text-lg text-primary">Detalhes do Item</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-primary/5 p-4 rounded-lg">
                                        <span className="block text-xs font-semibold text-gray-500">Condição</span>
                                        {isEditing ? (
                                            <select
                                                name="condition"
                                                value={editForm.condition}
                                                onChange={handleEditChange}
                                                className="w-full p-2 border rounded-md bg-white text-gray-800 font-medium"
                                            >
                                                <option value="novo">Novo</option>
                                                <option value="como_novo">Como Novo</option>
                                                <option value="bom">Bom Estado</option>
                                                <option value="regular">Regular</option>
                                                <option value="precisa_reparo">Precisa Reparo</option>
                                            </select>
                                        ) : (
                                            <span className="text-gray-800 font-medium">{formatCondition(item.condition)}</span>
                                        )}
                                    </div>
                                    <div className="bg-primary/5 p-4 rounded-lg">
                                        <span className="block text-xs font-semibold text-gray-500">Categoria</span>
                                        <span className="text-gray-800 font-medium">{item.categories.name}</span>
                                    </div>
                                </div>

                                <div className="bg-primary/5 p-4 rounded-lg">
                                    <span className="block text-xs font-semibold text-gray-500">Localização (Cidade)</span>
                                    {isEditing ? (
                                        <Input
                                            name="city"
                                            value={editForm.city}
                                            onChange={handleEditChange}
                                            className="text-gray-800 font-medium"
                                            placeholder="Cidade"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-800 font-medium">
                                            <MapPin className="h-4 w-4" />
                                            <span>{item.city || "Não informado"}, {item.state || "UF"}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t pt-6 mt-8 space-y-6">
                        <div>
                            <h4 className="font-semibold text-lg mb-3 text-primary">Descrição</h4>
                            <div className="p-4 bg-primary/5 rounded-lg text-gray-700">
                                {isEditing ? (
                                    <Textarea
                                        name="description"
                                        value={editForm.description}
                                        onChange={handleEditChange}
                                        rows={6}
                                        className="text-gray-700 whitespace-pre-line leading-relaxed border-none focus-visible:ring-0 resize-none p-0"
                                        placeholder="Descreva seu item..."
                                    />
                                ) : (
                                    <p className="whitespace-pre-line leading-relaxed">
                                        {item.description || "Este item não possui descrição."}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold text-lg mb-3 text-primary">Endereço de Retirada</h4>
                            {isEditing ? (
                                <EditAddressForm editForm={editForm} handleEditChange={handleEditChange} />
                            ) : (
                                <StaticAddressBlock item={item} />
                            )}
                        </div>

                        {isOwner && (
                            <div className="flex justify-end gap-2 mt-6">
                                {!isEditing ? (
                                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Editar Item
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="ghost" onClick={cancelEdit} disabled={isSaving || isUploading}>
                                            <X className="mr-2 h-4 w-4" /> Cancelar
                                        </Button>
                                        <Button onClick={handleSaveEdit} disabled={isSaving || isUploading}>
                                            {isSaving ? "Salvando..." : <Save className="mr-2 h-4 w-4" />} Salvar
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
           
            <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center">
                            <Trash2 className="h-6 w-6 mr-2" /> Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja **excluir permanentemente** este item e todas as suas imagens? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleting(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
                            {loading ? "Excluindo..." : "Excluir Item"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}