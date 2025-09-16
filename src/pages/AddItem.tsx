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
    condition: "bom", // valor padrão
    type: "doacao", // valor padrão
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
            setImagePreviews([...imagePreviews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    setImages([...images, ...newImages]);
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
      const fileName = `${itemId}/${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('items')
        .upload(fileName, image);
      
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        continue;
      }
      
      // Get public URL
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
    if (!form.title || !form.description || !form.city || !form.state || !form.condition || !form.type) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setLoading(true);
    
    try {
      // First insert the item without images
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .insert({
          title: form.title,
          description: form.description,
          city: form.city,
          state: form.state,
          category_id: form.category_id || null,
          user_id: user?.id,
          is_active: true,
          condition: form.condition,
          type: form.type,
          image_urls: [] // Initialize with empty array
        })
        .select()
        .single();
      
      if (itemError) {
        throw itemError;
      }
      
      // Upload images if any
      if (images.length > 0 && itemData) {
        const imageUrls = await uploadImages(itemData.id);
        
        // Update the item with the image URLs
        const { error: updateError } = await supabase
          .from("items")
          .update({ image_urls: imageUrls })
          .eq("id", itemData.id);
          
        if (updateError) {
          console.error("Error updating item with images:", updateError);
        }
      }
      
      navigate("/");
    } catch (error: any) {
      setError(error.message || "Erro ao adicionar item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 border border-primary/10 relative">
        <h1 className="text-3xl font-bold mb-4 text-center text-primary">Adicionar Produto para Doação</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 font-semibold text-primary">Título *</label>
            <Input name="title" value={form.title} onChange={handleChange} required className="bg-muted/30" />
          </div>
          <div>
            <label className="block mb-2 font-semibold text-primary">Descrição *</label>
            <Textarea name="description" value={form.description} onChange={handleChange} required className="bg-muted/30" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-2 font-semibold text-primary">Cidade *</label>
              <Input name="city" value={form.city} onChange={handleChange} required className="bg-muted/30" />
            </div>
            <div className="flex-1">
              <label className="block mb-2 font-semibold text-primary">Estado *</label>
              <Input name="state" value={form.state} onChange={handleChange} required className="bg-muted/30" />
            </div>
          </div>
          <div>
            <label className="block mb-2 font-semibold text-primary">Categoria (opcional)</label>
            <Input name="category_id" value={form.category_id} onChange={handleChange} className="bg-muted/30" />
          </div>
          <div>
            <label className="block mb-2 font-semibold text-primary">Condição *</label>
            <select
              name="condition"
              value={form.condition}
              onChange={handleChange}
              required
              className="w-full border rounded px-2 py-2 bg-muted/30"
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
              className="w-full border rounded px-2 py-2 bg-muted/30"
            >
              <option value="doacao">Doação</option>
              <option value="venda">Venda</option>
            </select>
          </div>
          
          {/* Image Upload Section */}
          <div>
            <label className="block mb-2 font-semibold text-primary">Imagens (opcional)</label>
            <Input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleImageChange}
              className="bg-muted/30"
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img 
                    src={preview} 
                    alt={`Preview ${index}`} 
                    className="w-full h-24 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <Button type="submit" className="w-full mt-2 bg-gradient-to-r from-primary to-primary-glow text-lg py-3 rounded-xl shadow-md hover:scale-[1.02] transition-transform" disabled={loading}>
            {loading ? "Adicionando..." : "Adicionar Produto"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full mt-2 text-lg py-3 rounded-xl shadow-md border-primary/40 hover:bg-primary/10 transition-colors"
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
        </form>
      </div>
    </div>
  );
}