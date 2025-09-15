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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title || !form.description || !form.city || !form.state || !form.condition || !form.type) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setLoading(true);
    
    const { error } = await supabase.from("items").insert([
      {
        title: form.title,
        description: form.description,
        city: form.city,
        state: form.state,
        category_id: form.category_id || undefined,
        user_id: user?.id ?? "",
        is_active: true,
        condition: form.condition,
        type: form.type,
      }
    ]);
    setLoading(false);
    if (error) {
      setError(error.message || "Erro ao adicionar item.");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 border border-primary/10 relative">
        <h1 className="text-3xl font-bold mb-4 text-center text-primary">Adicionar Produto para Doação</h1>
        <div className="flex justify-center mb-6">
          
        </div>
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
