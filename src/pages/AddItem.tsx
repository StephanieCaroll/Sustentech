import { useState, ChangeEvent, useRef } from "react"; 
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext"; 
import { supabase } from "@/integrations/supabase/client";

import { Package, MapPin, Camera, DollarSign, ClipboardList, AlertTriangle, Leaf, Upload } from "lucide-react"; // ChevronDown foi removido

export default function AddItem() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    logradouro: "", 
    numero: "", 
    complemento: "", 
    bairro: "", 
    city: "",
    state: "",
    cep: "", 
    category_id: "",
    custom_category: "",
    condition: "bom",
    type: "doacao",
    price: "0"
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: "be411839-f207-494c-b71a-b0e13611b2bb", name: "Transporte" }, 
    { id: "1c9f44a4-8ad9-4d3e-b874-5789ced21ac3", name: "Livros" }, 
    { id: "02033057-16bd-4c22-9d93-e42d5f9a5032", name: "Jardim" }, 
    { id: "d3b9400a-c0a1-4632-b84d-3003acdd4786", name: "Cozinha" }, 
    { id: "663e1aab-7893-4ad1-8f36-13f146c39833", name: "Acessórios" }, 
    { id: "b5e48ea3-1758-4820-8537-227e6422fad1", name: "Compostagem" }, 
    { id: "b72d82f2-509f-45b4-be67-ebef01f679d3", name: "Eletrônicos" }, 
    { id: "c72df6c7-484b-4e5d-af71-7afb15636a90", name: "Móveis" }, 
    { id: "832c3be8-2d13-4076-aec2-ac1c2fec2131", name: "Roupas" }, 
    { id: "49580848-f200-4f06-9d8a-e3852ccd709c", name: "Brinquedos" }, 
    { id: "5e2f3a33-6c01-465e-a45c-85901a9f0b9c", name: "Ferramentas" }, 
    { id: "c7458288-af38-4f69-afd1-da2d7b598cd4", name: "Esportes" }, 
    { id: "9687916b-c910-402a-a2e7-a934864a516a", name: "Decoração" }, 
    { id: "a3f1145c-34e8-42ca-be09-3ef92121bd78", name: "Utensílios" },
    { id: "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6", name: "Outros" } 
  ];

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const availableSlots = 4 - images.length;
    const filesToProcess = files.slice(0, availableSlots); 
    
    const newImages: File[] = [];
    
    filesToProcess.forEach(file => {
      if (file.type.startsWith('image/')) {
        newImages.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setImagePreviews(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    setImages(prev => [...prev, ...newImages]);

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const uploadImages = async (itemId: string) => {
    const imageUrls: string[] = [];
    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${user?.id}/${itemId}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('items')
        .upload(fileName, image);
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        continue;
      }
      const { data: { publicUrl } } = supabase.storage
        .from('items')
        .getPublicUrl(fileName);
      imageUrls.push(publicUrl);
    }
    return imageUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.title || !form.description || !form.city || !form.state || !form.category_id || 
        !form.cep || !form.bairro || !form.logradouro || !form.numero) {
      setError("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }
    
    const outrosCategoryId = "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6"; 
    if (form.category_id === outrosCategoryId && !form.custom_category) {
      setError("Ao selecionar 'Outros', você deve especificar a categoria personalizada.");
      return;
    }
    
    setLoading(true);
    
    try {
      const price = form.type === "venda" ? parseFloat(form.price) || 0 : 0;

      let finalDescription = form.description;
      if (form.category_id === outrosCategoryId && form.custom_category) {
        finalDescription = `[Categoria Personalizada: ${form.custom_category}]\n\n${form.description}`;
      }

      const itemData = {
        title: form.title,
        description: finalDescription,
        logradouro: form.logradouro, 
        numero: form.numero, 
        complemento: form.complemento, 
        bairro: form.bairro, 
        city: form.city,
        state: form.state,
        cep: form.cep, 
        category_id: form.category_id,
        user_id: user?.id, 
        is_active: true,
        condition: form.condition,
        type: form.type,
        price: price,
        image_urls: []
      };

      console.log("Tentando inserir item:", itemData);

      const { data: insertedItem, error: itemError } = await supabase
        .from("items")
        .insert(itemData)
        .select()
        .single();
      
      if (itemError) {
        console.error("Erro ao inserir item:", itemError);
        if (itemError.code === '42501') {
          throw new Error("Permissão negada. Verifique as políticas de segurança (RLS).");
        }
        if (itemError.code === '42703') { 
            throw new Error("Coluna não encontrada. Você rodou o 'ALTER TABLE' no Supabase?");
        }
        throw new Error(itemError.message);
      }
      
      let imageUrls: string[] = [];
      if (images.length > 0 && insertedItem) {
        try {
          imageUrls = await uploadImages(insertedItem.id);
          const { error: updateError } = await supabase
            .from("items")
            .update({ image_urls: imageUrls })
            .eq("id", insertedItem.id);
          if (updateError) {
            console.error("Erro ao atualizar item com imagens:", updateError);
          }
        } catch (uploadError) {
          console.error("Erro no upload de imagens:", uploadError);
        }
      }
      
      navigate("/", { 
        state: { 
          message: "Produto adicionado com sucesso!",
          showToast: true
        } 
      });
    } catch (error: any) {
      console.error("Erro completo:", error);
      setError(error.message || "Erro ao adicionar item. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-4 py-8">
      <div className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 lg:p-12 border border-green-100 relative">
        
        <h1 className="flex flex-col items-center justify-center text-3xl md:text-4xl font-extrabold mb-8 text-center text-green-700 tracking-tight border-b-2 border-green-100 pb-4">
            <Leaf className="w-8 h-8 md:w-10 md:h-10 mb-2 text-green-500" />
            Anunciar novo Produto
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-8 md:space-y-10">
          
          {/* GRUPO: INFORMAÇÕES BÁSICAS E CATEGORIA */}
          <div className="border border-gray-200 rounded-xl p-5 md:p-6 bg-white shadow-lg">
            <h2 className="flex items-center text-xl md:text-2xl font-bold mb-5 text-green-600 border-b pb-3 border-green-100">
              <Package className="w-5 h-5 md:w-6 md:h-6 mr-3 text-green-500" />
              1. Item e Classificação
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold text-gray-700">Título *</label>
                <Input 
                  name="title" 
                  value={form.title} 
                  onChange={handleChange} 
                  required 
                  className="bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                  placeholder="Nome do produto (Ex: Bicicleta Caloi 10)"
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
                  placeholder="Descreva o estado, características e detalhes importantes para quem for pegar/comprar."
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
                    className="w-full border rounded-lg px-3 py-2.5 bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 appearance-none" /* appearance-none mantido para manter o estilo do select */
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Condição */}
                <div className="relative"> 
                    <label className="block mb-2 font-semibold text-gray-700">Condição *</label>
                    <select
                        name="condition"
                        value={form.condition}
                        onChange={handleChange}
                        required
                        className="w-full border rounded-lg px-3 py-2.5 bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 appearance-none" /* appearance-none mantido para manter o estilo do select */
                    >
                        <option value="novo">Novo</option>
                        <option value="como_novo">Como novo</option>
                        <option value="bom">Bom</option>
                        <option value="regular">Regular</option>
                        <option value="precisa_reparo">Precisa de reparo</option>
                    </select>
                </div>
              </div>

              {/* Campo Categoria Customizada */}
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
                  placeholder="Ex: Plantas medicinais"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta informação será adicionada à descrição para quem for visualizar.
                </p>
              </div>
            </div>
          </div>
          
          {/* GRUPO: TIPO E PREÇO */}
          <div className="border border-gray-200 rounded-xl p-5 md:p-6 bg-white shadow-lg">
            <h2 className="flex items-center text-xl md:text-2xl font-bold mb-5 text-green-600 border-b pb-3 border-green-100">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 mr-3 text-green-500" />
                2. Oferta
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Tipo */}
              <div className="relative"> 
                <label className="block mb-2 font-semibold text-gray-700">Tipo *</label>
                <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-3 py-2.5 bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 appearance-none" /* appearance-none mantido para manter o estilo do select */
                >
                    <option value="doacao">Doação (Grátis)</option>
                    <option value="venda">Venda (Preço Fixo)</option>
                </select>
              </div>

              {/* Preço */}
              {form.type === "venda" ? (
                <div>
                    <label className="block mb-2 font-semibold text-gray-700">Preço (R$) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">R$</span>
                      <Input 
                          type="number" 
                          name="price" 
                          value={form.price} 
                          onChange={handleChange} 
                          required 
                          className="pl-10 bg-gray-50 border-gray-300 transition duration-300 hover:border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-100" 
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                      />
                    </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-3 bg-green-100 rounded-lg text-center border border-green-300 md:mt-7">
                    <span className="text-lg font-extrabold text-green-700">ESTE ITEM SERÁ DOADO!</span>
                </div>
              )}
            </div>
          </div>

          {/* GRUPO: ENDEREÇO */}
          <div className="border border-gray-200 rounded-xl p-5 md:p-6 bg-white shadow-lg">
            <h2 className="flex items-center text-xl md:text-2xl font-bold mb-5 text-green-600 border-b pb-3 border-green-100">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 mr-3 text-green-500" />
                3. Localização para Retirada
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
                    placeholder="Ex: Apto 101, Bloco B"
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
                <Camera className="w-5 h-5 md:w-6 md:h-6 mr-3 text-green-500" />
                4. Fotos do Item
            </h2>

            <div>
             
              <input 
                id="image-upload"
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageChange}
                ref={fileInputRef}
                className="hidden" 
                disabled={images.length >= 4}
              />

              <label 
                htmlFor="image-upload" 
                className={`w-full flex items-center justify-center space-x-2 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-md ${images.length >= 4 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 cursor-pointer'}`
                }
              >
                <Upload className="w-5 h-5" />
                <span>
                    {images.length >= 4 ? "Máximo de 4 Imagens Atingido" : "Clique para Selecionar Fotos"}
                </span>
              </label>
              
              <p className="text-sm text-gray-500 mt-2 text-center">
                **{images.length}/4** imagens selecionadas.
              </p>
              
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
          
          {error && (
            <div className="flex items-start p-4 bg-red-100 border-l-4 border-red-500 rounded-lg shadow-md">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-red-800 font-medium text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-4 pt-4">
            <Button 
              type="submit" 
              className="w-full bg-green-600 text-white text-xl font-extrabold py-3.5 rounded-xl shadow-xl hover:bg-green-700 transition-all transform hover:scale-[1.01] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              <ClipboardList className={`w-5 h-5 mr-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Publicando Anúncio..." : "Finalizar e Publicar"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full text-green-600 border-green-400 text-lg font-bold py-3.5 rounded-xl hover:bg-green-50 transition-colors"
              onClick={() => navigate("/")}
            >
              Voltar ao Início
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}