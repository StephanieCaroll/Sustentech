import { useState } from "react";
import ItemCard from "./ItemCard";
import { Messages } from "@/components/Message";
import { Item } from "@/hooks/useSupabaseData";

interface ItemDetailContainerProps {
  item: Item;
}

const ItemDetailContainer = ({ item }: ItemDetailContainerProps) => {
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>();
  const [selectedItem, setSelectedItem] = useState<Item>();

  const handleStartConversation = (sellerId: string, item: Item) => {
    setSelectedSellerId(sellerId);
    setSelectedItem(item);
    setIsMessagesOpen(true);
  };

  return (
    <div>
      {/* O ItemCard agora recebe a função do seu componente pai */}
      <ItemCard
        item={item}
        onStartConversation={handleStartConversation}
      />
      
      <Messages
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
        initialSellerId={selectedSellerId}
        initialItem={selectedItem}
      />
    </div>
  );
};

export default ItemDetailContainer;