import { useState, ChangeEvent, useRef } from "react"; 
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { X, Upload, Leaf, MapPin, Briefcase, DollarSign, Clock, AlertTriangle } from "lucide-react"; 

export default function AddService() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    logradouro: "", 
    numero: "", 
    complemento: "", 
    bairro: "", 
    cep: "", 
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

  if (name === 'cep') {
   
    const onlyNumbers = value.replace(/\D/g, '');
    
    let formattedCep = onlyNumbers;
    if (onlyNumbers.length > 5) {
      formattedCep = onlyNumbers.substring(0, 5) + '-' + onlyNumbers.substring(5, 8);
    }
    
    setForm(prev => ({ ...prev, [name]: formattedCep }));
  } else {
    setForm(prev => ({ ...prev, [name]: value }));
  }
};


  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    let validFiles: File[] = [];
    let validPreviews: string[] = [];
    let localError: string | null = null;
    
    setError(null);

    filesArray.forEach(file => {
      if (!file.type.startsWith('image/')) {
        localError = 'Por favor, selecione apenas arquivos de imagem.';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        localError = 'Cada imagem deve ter no máximo 5MB.';
        return;
      }
      validFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          validPreviews.push(e.target.result as string);
          
          setImagePreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (localError) {
        setError(localError);
    }
    
    setImages(prev => [...prev, ...validFiles]);
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
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
    
    if (!form.name || !form.description || !form.city || !form.state || !form.category_id ||
      !form.logradouro || !form.numero || !form.bairro || !form.cep) {
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
        logradouro: form.logradouro, 
        numero: form.numero, 
        complemento: form.complemento, 
        bairro: form.bairro, 
        cep: form.cep, 
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
          throw new Error("Permissão negada. Verifique as políticas de segurança (RLS).");
        }
        if (serviceError.code === '42703') {
           throw new Error("Coluna não encontrada. Você lembrou de rodar o 'ALTER TABLE' no Supabase?");
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
      
      navigate("/app", { 
        state: { 
          message: "Serviço adicionado com sucesso!",
          showToast: true
        } 
      });
    } catch (error: any) {
      setError(error.message || "Erro ao adicionar serviço. Verifique o console.");
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
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-4 py-8">
      <div className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 lg:p-12 border border-green-100 relative">
        
        {/* TÍTULO PRINCIPAL */}
        <h1 className="flex flex-col items-center justify-center text-3xl md:text-4xl font-extrabold mb-8 text-center text-green-700 tracking-tight border-b-2 border-green-100 pb-4">
            <Briefcase className="w-8 h-8 md:w-10 md:h-10 mb-2 text-green-500" /> 
            Anunciar Novo Serviço
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-8 md:space-y-10">
          
          {/* GRUPO: DETALHES DO SERVIÇO */}
          <div className="border border-gray-200 rounded-xl p-5 md:p-6 bg-white shadow-lg">
            <h2 className="flex items-center text-xl md:text-2xl font-bold mb-5 text-green-600 border-b pb-3 border-green-100">
              <Leaf className="w-5 h-5 md:w-6 md:h-6 mr-3 text-green-500" />
              1. Detalhes e Especialidade
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Nome do Serviço *</label>
                <Input 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  required 
                  className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                  placeholder="Ex: Consultoria em Jardinagem Orgânica"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Descrição *</label>
                <Textarea 
                  name="description" 
                  value={form.description} 
                  onChange={handleChange} 
                  required 
                  className="bg-gray-50 border-gray-300 min-h-[100px] md:min-h-[120px] transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                  placeholder="Descreva sua experiência, o que o serviço inclui e como ele funciona..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Categoria */}
                <div className="relative">
                  <label className="block mb-2 font-semibold text-gray-700">Categoria *</label>
                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-3 py-2.5 bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 appearance-none" 
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Disponibilidade */}
                <div className="relative">
                    <label className="block mb-2 font-semibold text-gray-700">Disponibilidade *</label>
                    <select
                        name="availability"
                        value={form.availability}
                        onChange={handleChange}
                        required
                        className="w-full border rounded-lg px-3 py-2.5 bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 appearance-none" 
                    >
                        <option value="disponivel">Disponível</option>
                        <option value="indisponivel">Indisponível</option>
                        <option value="sob_consulta">Sob consulta</option>
                    </select>
                </div>
              </div>

              {/* Campo Categoria Customizada (Condicional) */}
              <div className={`transition-all duration-300 ease-in-out ${form.category_id === "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6" ? "block mt-4" : "hidden"}`}>
                <label className="block mb-2 font-semibold text-gray-700">
                  Especifique a Categoria *
                </label>
                <Input 
                  name="custom_category" 
                  value={form.custom_category} 
                  onChange={handleChange} 
                  required={form.category_id === "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6"}
                  className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                  placeholder="Ex: Aulas particulares de costura"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta informação será adicionada à descrição.
                </p>
              </div>
            </div>
          </div>
          
          {/* GRUPO: PREÇO E COBRANÇA */}
          <div className="border border-gray-200 rounded-xl p-5 md:p-6 bg-white shadow-lg">
            <h2 className="flex items-center text-xl md:text-2xl font-bold mb-5 text-green-600 border-b pb-3 border-green-100">
                <Clock className="w-5 h-5 md:w-6 md:h-6 mr-3 text-green-500" />
                2. Preço por Hora
            </h2>

            <div>
                <label className="block mb-2 font-semibold text-gray-700">Preço por Hora (R$)</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">R$</span>
                    <Input 
                        type="number" 
                        name="price_per_hour" 
                        value={form.price_per_hour} 
                        onChange={handleChange} 
                        className="pl-10 bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                    />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                    Deixe em 0.00 para serviços gratuitos ou "a combinar".
                </p>
            </div>
          </div>

          {/* GRUPO: ENDEREÇO */}
          <div className="border border-gray-200 rounded-xl p-5 md:p-6 bg-white shadow-lg">
            <h2 className="flex items-center text-xl md:text-2xl font-bold mb-5 text-green-600 border-b pb-3 border-green-100">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 mr-3 text-green-500" />
                3. Local de Atendimento
            </h2>

            <div className="space-y-4">
                {/* Linha 1: Logradouro e Número */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block mb-2 font-semibold text-gray-700">Logradouro (Rua, Av.) *</label>
                    <Input 
                      name="logradouro" 
                      value={form.logradouro} 
                      onChange={handleChange} 
                      required 
                      className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                      placeholder="Ex: Rua das Flores"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block mb-2 font-semibold text-gray-700">Número *</label>
                    <Input 
                      name="numero" 
                      value={form.numero} 
                      onChange={handleChange} 
                      required 
                      className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                      placeholder="Ex: 123"
                    />
                  </div>
                </div>
                
                {/* Linha 2: Complemento */}
                <div>
                  <label className="block mb-2 font-semibold text-gray-700">Complemento (opcional)</label>
                  <Input 
                    name="complemento" 
                    value={form.complemento} 
                    onChange={handleChange} 
                    className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                    placeholder="Ex: Sala 101, Fundos"
                  />
                </div>

                {/* Linha 3: Bairro e CEP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-semibold text-gray-700">Bairro *</label>
                    <Input 
                      name="bairro" 
                      value={form.bairro} 
                      onChange={handleChange} 
                      required 
                      className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                      placeholder="Ex: Jardim Botânico"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-gray-700">CEP *</label>
                    <Input 
                      name="cep" 
                      value={form.cep} 
                      onChange={handleChange} 
                      required 
                      className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                      placeholder="Ex: 01000-000"
                      maxLength={9} 
                      inputMode="numeric"
                    />
                  </div>
                </div>
                
                {/* Linha 4: Cidade e Estado */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-semibold text-gray-700">Cidade *</label>
                    <Input 
                      name="city" 
                      value={form.city} 
                      onChange={handleChange} 
                      required 
                      className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                      placeholder="São Paulo"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-gray-700">Estado (UF) *</label>
                    <Input 
                      name="state" 
                      value={form.state} 
                      onChange={handleChange} 
                      required 
                      className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 text-center uppercase" 
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>
            </div>
          </div>
          
          {/* GRUPO: IMAGENS */}
          <div className="border border-gray-200 rounded-xl p-5 md:p-6 bg-white shadow-lg">
            <h2 className="flex items-center text-xl md:text-2xl font-bold mb-5 text-green-600 border-b pb-3 border-green-100">
                <Upload className="w-5 h-5 md:w-6 md:h-6 mr-3 text-green-500" />
                4. Portfólio (Imagens)
            </h2>

            <div>
              {/* INPUT DE ARQUIVO ESCONDIDO - Solução para o botão teimoso */}
              <input 
                id="image-upload"
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden" 
              />

              {/* LABEL/BOTÃO CUSTOMIZADO */}
              <label 
                htmlFor="image-upload" 
                className="w-full flex items-center justify-center space-x-2 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-md bg-green-600 hover:bg-green-700 cursor-pointer"
              >
                <Upload className="w-5 h-5" />
                <span>Clique para Adicionar Imagens do Serviço</span>
              </label>
              
              {imagePreviews.length > 0 && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  **{images.length}** imagens selecionadas.
                </p>
              )}
              
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group shadow-md hover:shadow-xl transition-shadow rounded-lg overflow-hidden ring-2 ring-offset-2 ring-green-500/50">
                    <img 
                      src={preview} 
                      alt={`Preview ${index}`} 
                      className="w-full h-28 object-cover transition duration-300 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110 shadow-lg"
                      aria-label="Remover imagem"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* BARRA DE PROGRESSO DE UPLOAD */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-center text-green-700 mt-1">
                Enviando imagens: {uploadProgress}%
              </p>
            </div>
          )}
          
          {/* DIV DE ERRO (destacada) */}
          {error && (
            <div className="flex items-start p-4 bg-red-100 border-l-4 border-red-500 rounded-lg shadow-md">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-red-800 font-medium text-sm">{error}</p>
            </div>
          )}
          
          {/* BOTÕES DE AÇÃO */}
          <div className="space-y-4 pt-4">
            <Button 
              type="submit" 
              className="w-full bg-green-600 text-white text-xl font-extrabold py-3.5 rounded-xl shadow-xl hover:bg-green-700 transition-all transform hover:scale-[1.01] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              <Briefcase className={`w-5 h-5 mr-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Publicando Serviço..." : "Publicar Serviço"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full text-green-600 border-green-400 text-lg font-bold py-3.5 rounded-xl hover:bg-green-50 transition-colors"
              onClick={() => navigate("/app")}
            >
              Voltar ao Início
            </Button>
          </div>
        </form>
      </div>

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