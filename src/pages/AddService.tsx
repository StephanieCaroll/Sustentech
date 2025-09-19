import { useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.name || !form.description || !form.city || !form.state || !form.category_id) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    
    // Se selecionou "Outros" mas não preencheu a categoria personalizada
    const outrosCategoryId = "d5a2a7b0-7ac1-4dfe-9126-62391b076ef6"; 
    if (form.category_id === outrosCategoryId && !form.custom_category) {
      setError("Por favor, especifique a categoria personalizada.");
      return;
    }
    
    setLoading(true);
    
    try {
      const pricePerHour = parseFloat(form.price_per_hour) || 0;

      // Para a categoria "Outros", adicionar a info na descrição
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

      console.log("Tentando inserir serviço:", serviceData);

      const { data: insertedService, error: serviceError } = await supabase
        .from("services")
        .insert(serviceData)
        .select()
        .single();
      
      if (serviceError) {
        console.error("Erro ao inserir serviço:", serviceError);
        
        // Verificar se é erro de RLS
        if (serviceError.code === '42501') {
          throw new Error("Permissão negada. Verifique as políticas de segurança do banco de dados.");
        }
        
        throw new Error(serviceError.message);
      }
      
      navigate("/", { 
        state: { 
          message: "Serviço adicionado com sucesso!",
          showToast: true
        } 
      });
    } catch (error: any) {
      console.error("Erro completo:", error);
      setError(error.message || "Erro ao adicionar serviço. Verifique o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-primary/10 relative">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center text-primary">Adicionar Serviço</h1>
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
              placeholder="Descreva o serviço em detalhes, incluindo suas habilidades e experiência..."
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
  );
}