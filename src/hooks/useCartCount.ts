// hooks/useCartCount.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useCartCount = () => {
  const [count, setCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    const fetchCartCount = async () => {
      try {
        // Busca direta sem subscription complexa
        const { data, error } = await supabase
          .from('cart_items')
          .select('id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro:', error);
          return;
        }

        setCount(data?.length || 0);
      } catch (error) {
        console.error('Erro:', error);
      }
    };

    // Busca inicial
    fetchCartCount();

    // Atualiza a cada 2 segundos (solução prática)
    const interval = setInterval(fetchCartCount, 2000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  return count;
};