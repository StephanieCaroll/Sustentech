import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ArrowLeft,
  User,
  Phone,
  Home,
  Hash,
  Map,
  ClipboardList 
} from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  phone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
}

export default function ProfileEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    id: "",
    name: "",
    phone: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
  });

  const formatPhoneMask = (value: string): string => {
    if (!value) return "";
    let v = value.replace(/\D/g, '');
    v = v.slice(0, 11); // Limita a 11 dígitos (XX) XXXXX-XXXX

    if (v.length > 6) {
      // (XX) XXXXX-XXXX
      v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    } else if (v.length > 2) {
      // (XX) XXXXX
      v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (v.length > 0) {
      // (XX
      v = v.replace(/^(\d{0,2})/, '($1');
    }
    
    return v;
  }

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, phone, logradouro, numero, complemento, bairro")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Erro ao buscar perfil:", error);
        } else if (data) {
        
          setProfile({
            id: data.id,
            name: data.name || "",
            phone: data.phone ? formatPhoneMask(data.phone) : "", 
            logradouro: data.logradouro || "",
            numero: data.numero || "",
            complemento: data.complemento || "",
            bairro: data.bairro || "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile.id) return;

    setSaving(true);
    try {
    
      const justPhoneDigits = profile.phone?.replace(/\D/g, "") || "";

      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          phone: justPhoneDigits, 
          logradouro: profile.logradouro,
          numero: profile.numero,
          complemento: profile.complemento,
          bairro: profile.bairro,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso!",
      });

      navigate("/profile");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar suas informações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      const formattedPhone = formatPhoneMask(value);
      setProfile((prev) => ({ ...prev, phone: formattedPhone }));
    } else {
      
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-100 to-white p-4">
    
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-emerald-200/70 relative animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-4 left-4 text-gray-500 hover:bg-emerald-100/70 hover:text-emerald-700 rounded-full"
          onClick={() => navigate("/profile")}
          title="Voltar ao Perfil"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center tracking-tight">
          Editar Perfil
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* --- Divisor de Seção 1 --- */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-emerald-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-base font-medium text-emerald-600">
                Informações Pessoais
              </span>
            </div>
          </div>

          {/* Campos de Informações Pessoais com Ícones */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-600" />
                <Label htmlFor="name" className="text-gray-700 font-medium">Nome</Label>
              </div>
              <Input
                id="name"
                name="name"
                type="text"
                value={profile.name}
                onChange={handleChange}
                required
                className="focus-visible:ring-emerald-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600" />
                <Label htmlFor="phone" className="text-gray-700 font-medium">Telefone</Label>
              </div>
              {/* *** INPUT DE TELEFONE *** */}
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={profile.phone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
                maxLength={15} // (XX) XXXXX-XXXX = 15 caracteres
                className="focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* --- Divisor de Seção 2 --- */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-emerald-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-base font-medium text-emerald-600">
                Endereço
              </span>
            </div>
          </div>

          {/* Campos de Endereço com Ícones */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-emerald-600" />
                  <Label htmlFor="logradouro" className="text-gray-700 font-medium">Logradouro (Rua, Av.)</Label>
                </div>
                <Input
                  id="logradouro"
                  name="logradouro"
                  type="text"
                  value={profile.logradouro}
                  onChange={handleChange}
                  placeholder="Ex: Av. Boa Viagem"
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                 <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-emerald-600" />
                  <Label htmlFor="numero" className="text-gray-700 font-medium">Número</Label>
                </div>
                <Input
                  id="numero"
                  name="numero"
                  type="text"
                  value={profile.numero}
                  onChange={handleChange}
                  placeholder="Ex: 1500"
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-emerald-600" />
                  <Label htmlFor="bairro" className="text-gray-700 font-medium">Bairro</Label>
                </div>
                <Input
                  id="bairro"
                  name="bairro"
                  type="text"
                  value={profile.bairro}
                  onChange={handleChange}
                  placeholder="Ex: Boa Viagem"
                  className="focus-visible:ring-emerald-500"
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-emerald-600" />
                  <Label htmlFor="complemento" className="text-gray-700 font-medium">Complemento (Opcional)</Label>
                </div>
                <Input
                  id="complemento"
                  name="complemento"
                  type="text"
                  value={profile.complemento}
                  onChange={handleChange}
                  placeholder="Ex: Apto 101, Bloco A"
                  className="focus-visible:ring-emerald-500"
                />
              </div>
            </div>
          </div>
          
          {/* Botões com micro-interação */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 transition-colors hover:bg-gray-100"
              onClick={() => navigate("/profile")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600
                         transition-all transform hover:-translate-y-0.5 hover:shadow-lg"
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}