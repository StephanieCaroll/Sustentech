import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "./use-toast";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserFavorites();
    }
  }, [user]);

  const fetchUserFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('item_id, service_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const favoriteIds = new Set(
        data
          .map(fav => fav.item_id || fav.service_id)
          .filter(Boolean)
      );
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const isFavorite = (id: string) => {
    return favorites.has(id);
  };

  const toggleFavorite = async (itemId?: string, serviceId?: string) => {
    if (!user) {
      toast({
        title: "Atenção",
        description: "Faça login para salvar favoritos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const targetId = itemId || serviceId;
      if (!targetId) return;

      if (isFavorite(targetId)) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .or(`item_id.eq.${targetId},service_id.eq.${targetId}`);

        if (error) throw error;

        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(targetId);
          return newFavorites;
        });

        toast({
          title: "Removido",
          description: "Removido dos favoritos.",
        });
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            ...(itemId ? { item_id: itemId } : { service_id: serviceId }),
          });

        if (error) throw error;

        setFavorites(prev => new Set(prev).add(targetId));

        toast({
          title: "Adicionado",
          description: "Salvo nos favoritos!",
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os favoritos.",
        variant: "destructive",
      });
    }
  };

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    refreshFavorites: fetchUserFavorites,
  };
};