import { useAuth } from "@/contexts/AuthContext";
import ItemCard from "./ItemCard";
import { Item } from "@/hooks/useSupabaseData";

interface ItemCardWrapperProps {
  item: Item;
  isLiked?: boolean;
  onUpdate?: () => void;
  onStartConversation?: (sellerId: string, item: Item) => void;
  onCartUpdate?: () => void;
}

const ItemCardWrapper = ({ item, isLiked, onUpdate, onStartConversation, onCartUpdate }: ItemCardWrapperProps) => {
  const { user } = useAuth();
  
  return (
    <ItemCard 
      item={item}
      isLiked={isLiked}
      onUpdate={onUpdate}
      onStartConversation={onStartConversation}
      onCartUpdate={onCartUpdate}
    />
  );
};

export default ItemCardWrapper;