import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

const BudgetPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<Array<{name: string, price: number, quantity: number}>>([]);
  const [formData, setFormData] = useState({
    details: "",
    deadline: "",
    budget_preference: "",
    estimated_total: 0
  });

  useEffect(() => {
    const fetchProducts = async () => {
      if (!serviceId) return;

      try {
        const { data, error } = await supabase
          .from('service_products')
          .select(`
            id,
            name,
            price,
            description,
            products (*)
          `)
          .eq('service_id', serviceId);

        if (error) {
          console.error('Erro ao carregar produtos:', error);
          return;
        }

        const productsData = data.map(item => ({
          id: item.id,
          name: item.name || item.products?.name || 'Produto',
          price: item.price || item.products?.price || 0,
          description: item.description || item.products?.description
        }));

        setProducts(productsData);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      }
    };

    fetchProducts();
  }, [serviceId]);

  useEffect(() => {
    let total = 0;

    selectedProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      const quantity = quantities[productId] || 1;
      if (product) {
        total += product.price * quantity;
      }
    });

    customItems.forEach(item => {
      total += item.price * item.quantity;
    });

    setFormData(prev => ({
      ...prev,
      estimated_total: total
    }));
  }, [selectedProducts, quantities, customItems, products]);

  const handleProductSelection = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
      setQuantities(prev => ({ ...prev, [productId]: 1 }));
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
      setQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[productId];
        return newQuantities;
      });
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setQuantities(prev => ({ ...prev, [productId]: quantity }));
  };

  const addCustomItem = () => {
    setCustomItems(prev => [...prev, { name: '', price: 0, quantity: 1 }]);
  };

  const updateCustomItem = (index: number, field: string, value: string | number) => {
    setCustomItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: typeof value === 'string' ? value : Number(value) } : item
    ));
  };

  const removeCustomItem = (index: number) => {
    setCustomItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para solicitar orçamento",
        variant: "destructive"
      });
      return;
    }

    if (!serviceId) {
      toast({
        title: "Erro",
        description: "Serviço não encontrado",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('budget_requests')
        .insert({
          service_id: serviceId,
          user_id: user.id,
          details: formData.details,
          deadline: formData.deadline || null,
          budget_preference: formData.budget_preference || null,
          estimated_total: formData.estimated_total,
          status: 'pending',
          selected_products: selectedProducts.map(id => ({
            product_id: id,
            quantity: quantities[id] || 1
          })),
          custom_items: customItems
        })
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      toast({
        title: "Sucesso!",
        description: "Solicitação de orçamento enviada com sucesso!"
      });

      navigate(-1);
    } catch (error: any) {
      console.error('Erro ao enviar orçamento:', error);
      
      let errorMessage = "Não foi possível enviar sua solicitação";
      
      if (error.code === '42501') {
        errorMessage = "Permissão negada. Verifique as políticas de segurança.";
      } else if (error.code === '23503') {
        errorMessage = "Serviço não encontrado ou inválido.";
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Solicitar Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
           
            {products.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Produtos Disponíveis</h3>
                <div className="grid gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => 
                            handleProductSelection(product.id, checked as boolean)
                          }
                        />
                        <Label htmlFor={`product-${product.id}`} className="flex-1">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.description}
                            </p>
                            <p className="text-sm font-semibold text-primary">
                              R$ {product.price.toFixed(2)}
                            </p>
                          </div>
                        </Label>
                      </div>
                      
                      {selectedProducts.includes(product.id) && (
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) - 1)}
                            disabled={(quantities[product.id] || 1) <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">
                            {quantities[product.id] || 1}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) + 1)}
                          >
                            +
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Itens Personalizados</h3>
                <Button type="button" variant="outline" size="sm" onClick={addCustomItem}>
                  Adicionar Item
                </Button>
              </div>
              
              {customItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
                  <div className="md:col-span-4">
                    <Input
                      placeholder="Nome do item"
                      value={item.name}
                      onChange={(e) => updateCustomItem(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      type="number"
                      placeholder="Preço"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateCustomItem(index, 'price', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Qtd"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateCustomItem(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-sm font-semibold">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="md:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomItem(index)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Estimado:</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {formData.estimated_total.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Detalhes do serviço desejado</label>
              <Textarea
                value={formData.details}
                onChange={(e) => setFormData({...formData, details: e.target.value})}
                placeholder="Descreva com detalhes o que você precisa..."
                required
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Prazo desejado (opcional)</label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Observações adicionais (opcional)</label>
              <Input
                type="text"
                value={formData.budget_preference}
                onChange={(e) => setFormData({...formData, budget_preference: e.target.value})}
                placeholder="Alguma observação especial sobre o orçamento..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Solicitar Orçamento"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetPage;