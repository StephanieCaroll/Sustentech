import { useState, ChangeEvent, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Upload } from "lucide-react";

import ServiceCard from "@/components/ServiceCard";

export default function AddService() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    city: "",
    state: "",
    category_id: "",
    custom_category: "",
    price_per_hour: "0",
    availability: "disponivel"
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista de categorias disponíveis para serviços
  const categories = [
    { id: "559ad555-6da5-4122-a28c-cf6a7d4838d2", name: "Transporte" }, 
    { id: "024ef469-a030-4a8b-a09a-5365a16e3b9b", name: "Sapataria" }, 
    { id: "7b364105-5b72-407c-bcf9-a4a925dbaa51", name: "Marcenaria" }, 
    { id: "478d6d3a-213e-4248-adbc-591bae33e87c", name: "Limpeza" }, 
    { id: "2982968f-80cc-44d6-a461-8048bfbe6cba", name: "Jardinagem" }, 
    { id: "494845c3-aeee-4403-bedf-01b0d3639c70", name: "Eletrônica" }, 
    { id: "c9fdf92a-bba1-4fd8-83ae-571df8de59dc", name: "Costura" }, 
    { id: "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6", name: "Outros" } 
  ];

  const handleCardClick = (service: any) => {
    setSelectedService(service);
    setShowPreviewModal(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas arquivos de imagem.');
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Cada imagem deve ter no máximo 5MB.');
        continue;
      }

      newImages.push(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          if (newPreviews.length === newImages.length) {
            setImagePreviews(prev => [...prev, ...newPreviews]);
          }
        }
      };
      reader.readAsDataURL(file);
    }

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const uploadImages = async (serviceId: string) => {
    const imageUrls: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${serviceId}/${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(fileName, file);
      
      if (uploadError) {
        throw new Error(`Falha ao enviar imagem: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('service-images')
        .getPublicUrl(fileName);
      
      imageUrls.push(publicUrl);
      
      setUploadProgress(Math.round(((i + 1) / images.length) * 100));
    }
    
    return imageUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.name || !form.description || !form.city || !form.state || !form.category_id) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    
    const outrosCategoryId = "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6"; 
    if (form.category_id === outrosCategoryId && !form.custom_category) {
      setError("Por favor, especifique a categoria personalizada.");
      return;
    }
    
    setLoading(true);
    setUploadProgress(0);
    
    try {
      const pricePerHour = parseFloat(form.price_per_hour) || 0;

      let finalDescription = form.description;
      if (form.category_id === outrosCategoryId && form.custom_category) {
        finalDescription = `[Categoria Personalizada: ${form.custom_category}]\n\n${form.description}`;
      }

      const serviceData = {
        name: form.name,
        description: finalDescription,
        city: form.city,
        state: form.state,
        category_id: form.category_id,
        user_id: user?.id, 
        is_active: true,
        price_per_hour: pricePerHour,
        availability: form.availability
      };

      const { data: insertedService, error: serviceError } = await supabase
        .from("services")
        .insert(serviceData)
        .select()
        .single();
      
      if (serviceError) {
        if (serviceError.code === '42501') {
          throw new Error("Permissão negada. Verifique as políticas de segurança do banco de dados.");
        }
        
        throw new Error(serviceError.message);
      }
      
      if (images.length > 0 && insertedService) {
        const imageUrls = await uploadImages(insertedService.id);
        
        const { error: updateError } = await supabase
          .from("services")
          .update({ images: imageUrls })
          .eq("id", insertedService.id);
        
        if (updateError) {
          console.error("Erro ao atualizar serviço com imagens:", updateError);
        }
      }
      
      navigate("/", { 
        state: { 
          message: "Serviço adicionado com sucesso!",
          showToast: true
        } 
      });
    } catch (error: any) {
      setError(error.message || "Erro ao adicionar serviço. Verifique o console para mais detalhes.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const getCategoryName = () => {
    if (form.category_id === "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6") {
      return form.custom_category || "Outros";
    }
    return categories.find(cat => cat.id === form.category_id)?.name || "Não especificada";
  };

  const getAvailabilityText = () => {
    switch (form.availability) {
      case "disponivel": return "Disponível";
      case "indisponivel": return "Indisponível";
      case "sob_consulta": return "Sob consulta";
      default: return form.availability;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background p-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-primary">Adicionar Serviço</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-primary/10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold text-primary">Nome do Serviço *</label>
                <Input 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  required 
                  className="bg-muted/30" 
                  placeholder="Ex: Reparo de bicicletas"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-primary">Descrição *</label>
                <Textarea 
                  name="description" 
                  value={form.description} 
                  onChange={handleChange} 
                  required 
                  className="bg-muted/30 min-h-[100px]" 
                  placeholder="Descreva o serviço em detalhes..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-semibold text-primary">Cidade *</label>
                  <Input 
                    name="city" 
                    value={form.city} 
                    onChange={handleChange} 
                    required 
                    className="bg-muted/30" 
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-semibold text-primary">Estado *</label>
                  <Input 
                    name="state" 
                    value={form.state} 
                    onChange={handleChange} 
                    required 
                    className="bg-muted/30" 
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-primary">Categoria *</label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2 bg-muted/30"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={form.category_id === "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6" ? "block" : "hidden"}>
                <label className="block mb-2 font-semibold text-primary">
                  Especifique a categoria *
                </label>
                <Input 
                  name="custom_category" 
                  value={form.custom_category} 
                  onChange={handleChange} 
                  required={form.category_id === "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6"}
                  className="bg-muted/30" 
                  placeholder="Digite o nome da categoria personalizada"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Esta informação será adicionada à descrição do serviço.
                </p>
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-primary">Disponibilidade *</label>
                <select
                  name="availability"
                  value={form.availability}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2 bg-muted/30"
                >
                  <option value="disponivel">Disponível</option>
                  <option value="indisponivel">Indisponível</option>
                  <option value="sob_consulta">Sob consulta</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-primary">Preço por Hora (R$)</label>
                <Input 
                  type="number" 
                  name="price_per_hour" 
                  value={form.price_per_hour} 
                  onChange={handleChange} 
                  className="bg-muted/30" 
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Deixe em 0 para serviços gratuitos ou de doação
                </p>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-primary">Imagens do Serviço</label>
                <div 
                  className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <Upload className="mx-auto h-12 w-12 text-primary/50 mb-2" />
                  <p className="text-primary/70">Clique para adicionar imagens</p>
                  <p className="text-sm text-muted-foreground mt-1">Máximo 5 imagens, 5MB cada</p>
                </div>
              </div>

              {imagePreviews.length > 0 && (
                <div>
                  <h3 className="font-medium text-primary mb-2">Pré-visualização das imagens:</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`}
                          className="h-24 w-full object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                  <p className="text-sm text-center mt-1">Enviando imagens: {uploadProgress}%</p>
                </div>
              )}
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full mt-2 bg-gradient-to-r from-primary to-primary/80 text-lg py-3 rounded-xl hover:from-primary/90 hover:to-primary transition-all" 
                disabled={loading}
              >
                {loading ? "Adicionando..." : "Adicionar Serviço"}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2 text-lg py-3 rounded-xl border-primary/40 hover:bg-primary/10 transition-colors"
                onClick={() => navigate(-1)}
              >
                Voltar
              </Button>
            </form>
          </div>

        </div>
      </div>

      {/* Modal de visualização */}
      {showPreviewModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-primary">Detalhes do Serviço</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreviewModal(false)}
                className="h-8 w-8"
              >
                <X size={16} />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              {/* Nome */}
              <div>
                <h3 className="font-semibold text-primary mb-2 text-lg">Nome do Serviço</h3>
                <p className="text-gray-800 text-2xl font-bold">{selectedService.name}</p>
              </div>

              {/* Descrição */}
              <div>
                <h3 className="font-semibold text-primary mb-2 text-lg">Descrição</h3>
                <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-lg text-lg">
                  {selectedService.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Localização */}
                <div>
                  <h3 className="font-semibold text-primary mb-2 text-lg">Localização</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 text-lg">
                      <span className="font-medium">Cidade:</span> {selectedService.city}
                    </p>
                    <p className="text-gray-700 text-lg">
                      <span className="font-medium">Estado:</span> {selectedService.state}
                    </p>
                  </div>
                </div>

                {/* Categoria */}
                <div>
                  <h3 className="font-semibold text-primary mb-2 text-lg">Categoria</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 text-lg">{selectedService.category}</p>
                  </div>
                </div>

                {/* Disponibilidade */}
                <div>
                  <h3 className="font-semibold text-primary mb-2 text-lg">Disponibilidade</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 text-lg">
                      {selectedService.availability === "disponivel" && "Disponível"}
                      {selectedService.availability === "indisponivel" && "Indisponível"}
                      {selectedService.availability === "sob_consulta" && "Sob consulta"}
                    </p>
                  </div>
                </div>

                {/* Preço */}
                <div>
                  <h3 className="font-semibold text-primary mb-2 text-lg">Preço por Hora</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 text-lg">
                      {selectedService.price_per_hour > 0 
                        ? `R$ ${selectedService.price_per_hour.toFixed(2)}` 
                        : "Gratuito/Doação"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Seção para exibir as imagens do serviço */}
              {selectedService.images && selectedService.images.length > 0 && (
                <div>
                  <h3 className="font-semibold text-primary mb-2 text-lg">Imagens do Serviço</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedService.images.map((img: string, index: number) => (
                      <img 
                        key={index} 
                        src={img} 
                        alt={`Imagem do serviço ${selectedService.name}`} 
                        className="w-full h-32 object-cover rounded-md shadow-sm"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Botão para fechar o modal */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-8 py-3 text-lg"
                  size="lg"
                >
                  Fechar Detalhes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}