import { useState, useEffect } from "react";
import { X, Minus, Plus, ShoppingCart, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CartItem {
  id: string;
  item_id: string;
  quantity: number;
  items: {
    id: string;
    title: string;
    price: number;
    image_urls: string[];
    condition: string;
    user_id: string;
  };
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

const Cart = ({ isOpen, onClose }: CartProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      fetchCartItems();
    }
  }, [isOpen, user]);

  const fetchCartItems = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          item_id,
          quantity,
          items (
            id,
            title,
            price,
            image_urls,
            condition,
            user_id
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('Erro ao buscar itens do carrinho:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o carrinho",
        variant: "destructive"
      });
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;

      setCartItems(prev => 
        prev.map(item => 
          item.id === cartItemId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a quantidade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (cartItemId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      setCartItems(prev => prev.filter(item => item.id !== cartItemId));
      toast({
        title: "Sucesso",
        description: "Item removido do carrinho"
      });
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o item",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.items.price * item.quantity);
    }, 0);
  };

  const handleCheckout = () => {
    toast({
      title: "Checkout",
      description: "Funcionalidade de checkout em desenvolvimento"
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-lg">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              <h2 className="text-xl font-semibold">Carrinho</h2>
              <Badge variant="secondary" className="ml-2">
                {cartItems.length}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Seu carrinho está vazio</p>
                <Button className="mt-4" onClick={onClose}>
                  Continuar Comprando
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((cartItem) => (
                  <Card key={cartItem.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img 
                          src={cartItem.items.image_urls?.[0] || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400"} 
                          alt={cartItem.items.title}
                          className="h-16 w-16 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium line-clamp-2">{cartItem.items.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {cartItem.items.condition === 'novo' ? 'Novo' : 'Usado'}
                          </p>
                          <p className="font-semibold text-primary">
                            R$ {cartItem.items.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                            disabled={loading || cartItem.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{cartItem.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                            disabled={loading}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(cartItem.id)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {cartItems.length > 0 && (
            <>
              <Separator />
              <CardFooter className="p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center w-full">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {getTotal().toFixed(2)}
                  </span>
                </div>
                <Button 
                  className="w-full gap-2 py-3" 
                  size="lg"
                  onClick={handleCheckout}
                >
                  <CreditCard className="h-5 w-5" />
                  Finalizar Compra
                </Button>
              </CardFooter>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;