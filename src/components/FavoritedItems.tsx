import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ItemCard from "@/components/ItemCard";

export default function FavoritedItems() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavorited() {
      if (!user) return;
      // Supondo que existe uma tabela 'favorites' com user_id e item_id
      const { data: favs } = await supabase
        .from("favorites")
        .select("item_id")
        .eq("user_id", user.id);
      const itemIds = favs?.map(f => f.item_id) || [];
      if (itemIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      const { data: itemsData } = await supabase
        .from("items")
        .select("*, profiles(name, avatar_url, rating), categories(name, icon)")
        .in("id", itemIds);
      setItems(itemsData || []);
      setLoading(false);
    }
    fetchFavorited();
  }, [user]);

  if (loading) return <div className="text-center py-8">Carregando favoritos...</div>;
  if (!items.length) return <div className="text-center py-8 text-muted-foreground">Nenhum item favoritado.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
      {items.map(item => (
        <ItemCard key={item.id} item={item} isLiked />
      ))}
    </div>
  );
}
