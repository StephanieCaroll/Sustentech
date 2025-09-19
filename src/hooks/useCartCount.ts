import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useCartCount = () => {
  const [count, setCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const fetchCartCount = async () => {
      const { count, error } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!error && count !== null) {
        setCount(count);
      }
    };

    fetchCartCount();

    const subscription = supabase
      .channel('cart_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          fetchCartCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return count;
};