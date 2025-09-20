// utils/cartActions.ts
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const useCartActions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      // Verifica se o item já existe no carrinho
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existingItem) {
        // Atualiza a quantidade se o item já existir
        const { error } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingItem.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);

        if (error) {
          console.error('Erro ao atualizar carrinho:', error);
          return;
        }
      } else {
        // Adiciona novo item ao carrinho
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: quantity
          });

        if (error) {
          console.error('Erro ao adicionar ao carrinho:', error);
          return;
        }
      }

      console.log('Item adicionado/atualizado no carrinho');
    } catch (error) {
      console.error('Erro ao manipular carrinho:', error);
    }
  };

  return { addToCart };
};