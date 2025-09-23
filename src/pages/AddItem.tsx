import { useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function AddItem() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    city: "",
    state: "",
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

  // Lista de categorias disponíveis "
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
    const newImages: File[] = [];
    const newPreviews: string[] = [];
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        newImages.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
            setImagePreviews(prev => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    setImages(prev => [...prev, ...newImages]);
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
  
  if (!form.title || !form.description || !form.city || !form.state || !form.category_id) {
    setError("Preencha todos os campos obrigatórios.");
    return;
  }
  
  const outrosCategoryId = "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6"; 
  if (form.category_id === outrosCategoryId && !form.custom_category) {
    setError("Por favor, especifique a categoria personalizada.");
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
      city: form.city,
      state: form.state,
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
        throw new Error("Permissão negada. Verifique as políticas de segurança do banco de dados.");
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
    setError(error.message || "Erro ao adicionar item. Verifique o console para mais detalhes.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-primary/10 relative">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center text-primary">Adicionar Produto</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-semibold text-primary">Título *</label>
            <Input 
              name="title" 
              value={form.title} 
              onChange={handleChange} 
              required 
              className="bg-muted/30" 
              placeholder="Ex: Bicicleta usada em bom estado"
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
              placeholder="Descreva o produto em detalhes..."
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
              Esta informação será adicionada à descrição do produto.
            </p>
          </div>
          
          <div>
            <label className="block mb-2 font-semibold text-primary">Condição *</label>
            <select
              name="condition"
              value={form.condition}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2 bg-muted/30"
            >
              <option value="novo">Novo</option>
              <option value="como_novo">Como novo</option>
              <option value="bom">Bom</option>
              <option value="regular">Regular</option>
              <option value="precisa_reparo">Precisa de reparo</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-2 font-semibold text-primary">Tipo *</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2 bg-muted/30"
            >
              <option value="doacao">Doação</option>
              <option value="venda">Venda</option>
            </select>
          </div>
          
          {form.type === "venda" && (
            <div>
              <label className="block mb-2 font-semibold text-primary">Preço (R$) *</label>
              <Input 
                type="number" 
                name="price" 
                value={form.price} 
                onChange={handleChange} 
                required 
                className="bg-muted/30" 
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          )}
          
          <div>
            <label className="block mb-2 font-semibold text-primary">Imagens (opcional, máximo 4)</label>
            <Input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleImageChange}
              className="bg-muted/30"
              disabled={images.length >= 4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {images.length}/4 imagens selecionadas
            </p>
            
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={preview} 
                    alt={`Preview ${index}`} 
                    className="w-full h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          
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
            {loading ? "Adicionando..." : "Adicionar Produto"}
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
  );
}