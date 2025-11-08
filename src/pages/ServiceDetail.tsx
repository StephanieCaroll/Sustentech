import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    ArrowLeft,
    Wrench,
    Heart,
    MapPin,
    Star,
    CheckCircle,
    MessageCircle,
    Pencil,
    Save,
    X,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Plus, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Service } from "@/hooks/useSupabaseData";
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
import {
    Select, 
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type ServiceWithProfile = Service & {
    profiles: any | null;
    categories: { name: string, id: string | number };
    images?: string[]; 
};

interface Category {
    id: string | number;
    name: string;
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

const formatPricePerHour = (pricePerHour?: number) => {
    if (!pricePerHour || pricePerHour === 0) return "Preço a combinar";
    return `R$ ${pricePerHour.toFixed(2)} / hora`;
};

const formatFullAddress = (service: ServiceWithProfile | any) => {
    const s = service as any;
    if (!s.logradouro && !s.city) return "Localização não informada";

    const parts: string[] = [];
    if (s.logradouro) parts.push(`${s.logradouro}, ${s.numero || "s/n"}`);
    if (s.complemento) parts.push(s.complemento);
    if (s.bairro) parts.push(s.bairro);
    const firstLine = parts.filter(Boolean).join(" - ");
    const secondLine = [s.city, s.state].filter(Boolean).join(", ");

    return (
        <>
            {firstLine && <span className="block">{firstLine}</span>}
            {secondLine && <span className="block">{secondLine}</span>}
            {!firstLine && !secondLine && "Localização não informada"}
        </>
    );
};

const StaticServiceAddressBlock = ({ service }: { service: ServiceWithProfile }) => {
    return (
        <div className="p-4 bg-primary/5 rounded-lg text-gray-700">
            {formatFullAddress(service)}
        </div>
    );
};

const EditServiceAddressForm = ({
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
                <label className="text-xs text-muted-foreground">Logradouro (Rua, Av.)</label>
                <Input name="logradouro" value={editForm.logradouro || ''} onChange={handleEditChange} placeholder="Ex: Av. Principal" />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Número</label>
                <Input name="numero" value={editForm.numero || ''} onChange={handleEditChange} placeholder="Ex: 100" />
            </div>
        </div>
        <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Complemento (opcional)</label>
            <Input name="complemento" value={editForm.complemento || ''} onChange={handleEditChange} placeholder="Ex: Sala 5" />
            </div>
        <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Bairro</label>
            <Input name="bairro" value={editForm.bairro || ''} onChange={handleEditChange} placeholder="Ex: Centro" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cidade</label>
                <Input name="city" value={editForm.city || ''} onChange={handleEditChange} placeholder="Ex: São Paulo" />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Estado (UF)</label>
                <Input name="state" value={editForm.state || ''} onChange={handleEditChange} placeholder="Ex: SP" maxLength={2} />
            </div>
        </div>
    </div>
);


export default function ServiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [service, setService] = useState<ServiceWithProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [categories, setCategories] = useState<Category[]>([]); 
    const [isUploading, setIsUploading] = useState(false); 
    const fileInputRef = useRef<HTMLInputElement>(null); 
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [editForm, setEditForm] = useState({
        name: "", 
        description: "",
        price_per_hour: 0,
        city: "",
        state: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        category_id: "" as string | number, 
    });

    const MAX_IMAGES = 4;
    const getDefaultImage = () => {
        return "/placeholder-service.jpg";
    };

    const loadServiceImages = async (imagePaths: string[]) => {
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
                    .from("service-images")
                    .getPublicUrl(imagePath);

                if (publicData?.publicUrl) {
                    return publicData.publicUrl;
                }

                const { data, error } = await supabase.storage
                    .from("service-images")
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
        async function fetchInitialData() {
            if (!id) return;
            setLoading(true);

            // 1. Busca de Categorias (Para o Select)
            const { data: categoriesData, error: categoriesError } = await supabase
                .from("categories")
                .select("id, name");
            
            if (categoriesError) console.error("Erro ao buscar categorias:", categoriesError);
            if (categoriesData) setCategories(categoriesData);

            // 2. Buscar o serviço 
            const { data: serviceData, error: serviceError } = await supabase
                .from("services")
                .select("*, categories(id, name), images") // Incluído categories(id, name) e images
                .eq("id", id)
                .maybeSingle(); 

            if (serviceError) {
                console.error("Erro ao buscar SERVIÇO:", JSON.stringify(serviceError, null, 2));
                navigate("/404");
                return;
            }

            // 3. Buscar o perfil do prestador
            let profileData = null;
            if (serviceData) {
                const { data: pData, error: profileError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", serviceData.user_id)
                    .limit(1)
                    .maybeSingle(); 

                if (profileError) {
                    console.error("Erro ao buscar PERFIL:", JSON.stringify(profileError, null, 2));
                }
                profileData = pData;
            }

            const fullService = serviceData ? {
                ...serviceData,
                profiles: profileData,
            } : null;

            setService(fullService as any);

            // 4. Carregar as URLs das imagens
            const s = fullService as any;
            if (s && s.images) {
                await loadServiceImages(s.images);
            }

            // 5. Preencher o formulário de edição
            if (s) {
                 setEditForm({
                    name: s.name || "", 
                    description: s.description || "",
                    price_per_hour: s.price_per_hour || 0,
                    city: s.city || "",
                    state: s.state || "",
                    logradouro: s.logradouro || "",
                    numero: s.numero || "",
                    complemento: s.complemento || "",
                    bairro: s.bairro || "",
                    category_id: s.category_id || (s.categories ? s.categories.id : ""), 
                });
            }


            setLoading(false);
        }
        fetchInitialData();
    }, [id, navigate]);

    useEffect(() => {
        if (!user || !service) return;
        const checkIfLiked = async () => {
            const { data } = await supabase
                .from("favorites")
                .select("id")
                .eq("user_id", user.id)
                .eq("service_id", service.id)
                .limit(1)
                .maybeSingle(); 
            setLiked(!!data);
        };
        checkIfLiked();
    }, [user, service]);

    // --- FUNÇÕES DE NAVEGAÇÃO DA IMAGEM ---
    const nextImage = () => {
        if (imageUrls.length <= 1) return;
        setCurrentImageIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1));
    };

    const prevImage = () => {
        if (imageUrls.length <= 1) return;
        setCurrentImageIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
    };

    const goToImage = (index: number) => { 
        setCurrentImageIndex(index);
    };

    // --- FUNÇÕES DE EDIÇÃO DE IMAGEM ---

    const handleAddImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (imageUrls.filter(url => url !== getDefaultImage()).length >= MAX_IMAGES) {
            toast({ title: "Limite atingido", description: `O máximo é ${MAX_IMAGES} imagens por serviço.`, variant: "destructive" });
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !service) return;

        if (imageUrls.filter(url => url !== getDefaultImage()).length >= MAX_IMAGES) return;
        if (file.size > 2 * 1024 * 1024) { 
            toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
            return;
        }
        
        setIsUploading(true);

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${service.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from("service-images")
                .upload(filePath, file);
                
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("service-images")
                .getPublicUrl(filePath);
            
            setImageUrls(prev => {
                const newUrls = prev.filter(url => url !== getDefaultImage());
                return [...newUrls, publicUrl];
            });
            
            setCurrentImageIndex(imageUrls.length);

            toast({ title: "Sucesso", description: "Imagem adicionada. Clique em Salvar para atualizar o serviço." });

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
            toast({ title: "Atenção", description: "O serviço deve ter pelo menos uma imagem.", variant: "destructive" });
            return;
        }

        try {
           
            const urlObj = new URL(urlToRemove);
            const pathParts = urlObj.pathname.split('/');
            const bucketIndex = pathParts.findIndex(part => part === 'service-images'); 
            const filePath = pathParts.slice(bucketIndex + 1).join('/');

            const { error: removeError } = await supabase.storage
                .from('service-images')
                .remove([filePath]);

            if (removeError) {
                 console.warn("Aviso: Falha ao remover imagem do Storage (pode ser RLS), mas removemos localmente:", removeError);
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


    // --- FUNÇÕES DE AÇÕES E EDIÇÃO GERAL ---
    
    const toggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!user || !service) {
            toast({ title: "Atenção", description: "Você precisa estar logado para favoritar serviços", variant: "destructive" });
            return;
        }

        try {
            if (liked) {
                const { error } = await supabase
                    .from("favorites") 
                    .delete()
                    .eq("user_id", user.id)
                    .eq("service_id", service.id);
                if (error) throw error;
                setLiked(false);
                toast({ title: "Removido", description: "Serviço removido dos favoritos" });
            } else {
                const { error } = await supabase.from("favorites").insert({ 
                    user_id: user.id,
                    service_id: service.id,
                });
                if (error) throw error;
                setLiked(true);
                toast({ title: "Adicionado", description: "Serviço adicionado aos favoritos" });
            }
        } catch (error) {
            console.error("Erro ao atualizar favoritos:", error);
            toast({ title: "Erro", description: "Não foi possível atualizar os favoritos", variant: "destructive" });
        }
    };

    const handleRequestBudget = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !service) {
            toast({ title: "Atenção", description: "Você precisa estar logado.", variant: "destructive" });
            return;
        }
        navigate(`/servicos/${service.id}/orcamento`);
    };

    const handleEditChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value } = e.target;

        let newValue: string | number = value;

        if (name === 'price_per_hour') {
            newValue = parseFloat(value) || 0;
        }

        setEditForm((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    const handleCategoryChange = (value: string) => {
         setEditForm((prev) => ({
            ...prev,
            category_id: value,
        }));
    };

    const startEdit = () => {
        if (!service) return;
        const s = service as any;

        setEditForm({
            name: s.name || '', 
            description: s.description || '',
            price_per_hour: s.price_per_hour || 0,
            city: s.city || '',
            state: s.state || '',
            logradouro: s.logradouro || '',
            numero: s.numero || '',
            complemento: s.complemento || '',
            bairro: s.bairro || '',
            category_id: s.category_id || (s.categories ? s.categories.id : ""),
        });
        setIsEditing(true); 
    };

    const cancelEdit = () => {
        if (!service) return;
        const s = service as any;

        setEditForm({
            name: s.name || "", 
            description: s.description || "",
            price_per_hour: s.price_per_hour || 0,
            city: s.city || "",
            state: s.state || "",
            logradouro: s.logradouro || "",
            numero: s.numero || "",
            complemento: s.complemento || "",
            bairro: s.bairro || "",
            category_id: s.category_id || (s.categories ? s.categories.id : ""),
        });
      
        if (s.images) {
             loadServiceImages(s.images);
        } else {
            setImageUrls([getDefaultImage()]);
        }
        
        setCurrentImageIndex(0);
        setIsEditing(false); 
    };

    const handleSaveEdit = async () => {
        if (!service || imageUrls.filter(url => url !== getDefaultImage()).length === 0) {
            toast({ title: "Erro", description: "O serviço deve ter pelo menos uma imagem válida.", variant: "destructive" });
            return;
        }
        if (!editForm.category_id) {
            toast({ title: "Erro", description: "Selecione uma categoria para o serviço.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        
        const validImageUrls = imageUrls.filter(url => url !== getDefaultImage()); 

        const updateData = {
            ...editForm,
            images: validImageUrls, 
            category_id: editForm.category_id,
            updated_at: new Date().toISOString(),
            location: editForm.city,
        };

        try {
            const { data, error } = await supabase
                .from("services")
                .update(updateData)
                .eq("id", service.id)
                .select("*, categories(id, name), images") 
                .maybeSingle(); 

            if (error) throw error;
            if (!data) throw new Error("Falha ao salvar. Registro não encontrado ou RLS bloqueou a atualização.");

            const updatedCategory = categories.find(c => c.id === data.category_id) || data.categories;

            setService(prevService => {
                if (!prevService) return null;
                return {
                    ...prevService,
                    ...data,
                    categories: updatedCategory, 
                };
            });
            
            setImageUrls(data.images || [getDefaultImage()]);
            setCurrentImageIndex(0);

            toast({ title: "Sucesso", description: "Serviço atualizado." });
            setIsEditing(false); 
        } catch (error) {
            console.error("Erro ao salvar serviço:", error);
            toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleting(true);
    };

    const confirmDelete = async () => {
        if (!service) return;
        setIsDeleting(false);
        setLoading(true);

        try {
            
            const { error: dbError } = await supabase
                .from("services")
                .delete()
                .eq("id", service.id);

            if (dbError) throw dbError;

            toast({ title: "Sucesso", description: "Serviço excluído do seu perfil." });
            navigate("/profile");

        } catch (error) {
            console.error("Erro fatal ao excluir serviço:", error);
            toast({ title: "Erro", description: "Não foi possível excluir o serviço. Verifique as permissões de RLS.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const currentImage = imageUrls[currentImageIndex] || getDefaultImage();
    const isPlaceholder = currentImage === getDefaultImage();
    const currentImageUrls = imageUrls.filter(url => url !== getDefaultImage());
    const hasMultipleImages = currentImageUrls.length > 1;


    // --- RENDERIZAÇÃO ---

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                Serviço não encontrado.
            </div>
        );
    }

    const isOwner = user?.id === service.user_id;
    const serviceAsAny = service as any;

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
                        {/* Coluna da Esquerda: Imagem do Serviço (GALERIA/EDIÇÃO) */}
                        <div className="space-y-4">
                            
                            {/* Bloco da Imagem Principal */}
                            <div className="h-96 overflow-hidden relative rounded-2xl">
                                
                                <img
                                    src={currentImage}
                                    alt={serviceAsAny.name || "Imagem do Serviço"}
                                    className={`w-full h-full object-cover shadow-md ${isPlaceholder ? 'p-10 object-contain' : ''}`}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                                
                                {/* Botões de Navegação (Se houver mais de uma imagem e NÃO estiver editando) */}
                                {hasMultipleImages && !isEditing && (
                                    <>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute left-2 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-background/50 backdrop-blur hover:bg-background/80"
                                            onClick={prevImage}
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-background/50 backdrop-blur hover:bg-background/80"
                                            onClick={nextImage}
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    </>
                                )}
                            </div>
                            
                            {/* Bloco de Miniaturas (Thumbnails) para Visualização ou Edição */}
                            {(isOwner && isEditing) ? (
                                // MODO EDIÇÃO: Gerenciamento de Imagens
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-primary">Gerenciar Imagens ({currentImageUrls.length}/{MAX_IMAGES})</h4>
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
                                        {currentImageUrls.length < MAX_IMAGES && (
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
                                // MODO VISUALIZAÇÃO: Miniaturas Clicáveis
                                hasMultipleImages && (
                                    <div className="flex space-x-2 overflow-x-auto pb-2">
                                        {imageUrls.map((url, index) => (
                                            <div
                                                key={index}
                                                className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden cursor-pointer transition-all border-2 ${
                                                    index === currentImageIndex ? 'border-primary' : 'border-transparent hover:border-gray-300'
                                                }`}
                                                onClick={() => goToImage(index)}
                                            >
                                                <img
                                                    src={url}
                                                    alt={`Miniatura ${index + 1}`}
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
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleEditChange}
                                        className="text-3xl lg:text-4xl font-bold"
                                        placeholder="Nome do Serviço"
                                    />
                                ) : (
                                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">
                                        {serviceAsAny.name}
                                    </h1>
                                )}

                                {/* Botão de Favorito*/}
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
                                {/* Faixa de Preço */}
                                {isEditing ? (
                                    <div>
                                        <label className="text-xs text-muted-foreground">Preço por Hora (R$)</label>
                                        <Input
                                            name="price_per_hour"
                                            type="number"
                                            value={editForm.price_per_hour}
                                            onChange={handleEditChange}
                                            className="text-2xl font-bold text-primary w-full"
                                            placeholder="Ex: 50.00"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-2xl font-bold text-primary block">
                                        {formatPricePerHour(serviceAsAny.price_per_hour)}
                                    </span>
                                )}

                                {/* Botões de Ação Final */}
                                {!isEditing && !isOwner && (
                                    <Button
                                        size="lg"
                                        className="w-full bg-gradient-to-r from-primary to-primary-glow py-6 text-lg"
                                        onClick={handleRequestBudget}
                                    >
                                        <MessageCircle className="mr-2 h-5 w-5" />
                                        Solicitar Orçamento
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
                                        Este é o seu serviço
                                    </Button>
                                )}
                            </div>

                            {/* Seção Sobre o Prestador */}
                            {service.profiles && (
                                <div className="border-t pt-6">
                                    <h4 className="font-semibold text-lg mb-3 text-primary">Sobre o Prestador</h4>
                                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage src={service.profiles.avatar_url} alt={service.profiles.name} />
                                            <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                                {service.profiles.name?.slice(0, 2).toUpperCase() || "SR"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg font-semibold text-gray-800">
                                                    {service.profiles.name}
                                                </span>
                                                {service.profiles.is_verified && (
                                                    <CheckCircle className="h-5 w-5 text-primary fill-current" />
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                                                {renderStars(service.profiles.rating || 0)}
                                                <span className="ml-1">
                                                    ({service.profiles.total_reviews || 0} avaliações)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Detalhes do Serviço */}
                            <div className="border-t pt-6 space-y-4">
                                <h4 className="font-semibold text-lg text-primary">Detalhes do Serviço</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Categoria */}
                                    <div className="bg-primary/5 p-4 rounded-lg col-span-2">
                                        <span className="block text-xs font-semibold text-gray-500">Categoria</span>
                                        {isEditing ? (
                                            <Select 
                                                value={String(editForm.category_id)} 
                                                onValueChange={handleCategoryChange}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Selecione a Categoria" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map((category) => (
                                                        <SelectItem key={category.id} value={String(category.id)}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className="text-gray-800 font-medium">{service.categories.name}</span>
                                        )}
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
                                            <span>{serviceAsAny.city || "Não informado"}, {serviceAsAny.state || "UF"}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Descrição e Endereço  */}
                    <div className="border-t pt-6 mt-8 space-y-6">
                        {/* Fundo na Descrição */}
                        <div>
                            <h4 className="font-semibold text-lg mb-3 text-primary">Descrição</h4>
                            <div className={`p-4 bg-primary/5 rounded-lg text-gray-700`}>
                                {isEditing ? (
                                    <Textarea
                                        name="description"
                                        value={editForm.description}
                                        onChange={handleEditChange}
                                        rows={6}
                                        className="text-gray-700 whitespace-pre-line leading-relaxed border-none focus-visible:ring-0 resize-none p-0"
                                        placeholder="Descreva seu serviço..."
                                    />
                                ) : (
                                    <p className="whitespace-pre-line leading-relaxed">
                                        {serviceAsAny.description || "Este serviço não possui descrição."}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-lg mb-3 text-primary">Detalhes do Endereço (Local de Atendimento)</h4>
                            {isEditing ? (
                                <EditServiceAddressForm editForm={editForm} handleEditChange={handleEditChange} />
                            ) : (
                                <StaticServiceAddressBlock service={service} />
                            )}
                        </div>

                        {/* Botões de Edição para o Dono */}
                        {isOwner && (
                            <div className="flex justify-end gap-2 mt-6">
                                {!isEditing ? (
                                    <Button variant="outline" onClick={startEdit}>
                                        <Pencil className="mr-2 h-4 w-4" /> Editar Serviço
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="ghost" onClick={cancelEdit} disabled={isSaving}>
                                            <X className="mr-2 h-4 w-4" /> Cancelar
                                        </Button>
                                        <Button onClick={handleSaveEdit} disabled={isSaving}>
                                            {isSaving ? "Salvando..." : <Save className="mr-2 h-4 w-4" />} Salvar
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação de Exclusão */}
            <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center">
                            <Trash2 className="h-6 w-6 mr-2" /> Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja **excluir permanentemente** este serviço? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleting(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
                            {loading ? "Excluindo..." : "Excluir Serviço"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}