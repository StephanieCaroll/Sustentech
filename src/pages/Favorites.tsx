import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Package, Wrench, ArrowLeft, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface FavoriteItem {
  id: string;
  item_id?: string;
  service_id?: string;
  created_at: string;
  items?: {
    description: any;
    id: string;
    title: string;
    price: number;
    image_urls: string[];
    condition: string;
    user_id: string;
    profiles?: {
      name: string;
      avatar_url: string;
    };
  };
  services?: {
    description: any;
    id: string;
    name: string;
    price_per_hour: number;
    images: string[];
    availability: string;
    user_id: string;
    profiles?: {
      name: string;
      avatar_url: string;
    };
  };
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FavoriteItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (favoritesError) throw favoritesError;

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const itemIds = favoritesData.filter(fav => fav.item_id).map(fav => fav.item_id);
      const serviceIds = favoritesData.filter(fav => fav.service_id).map(fav => fav.service_id);

      let itemsData: any[] = [];
      if (itemIds.length > 0) {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .in('id', itemIds);
        if (!error) itemsData = data || [];
      }

      let servicesData: any[] = [];
      if (serviceIds.length > 0) {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .in('id', serviceIds);
        if (!error) servicesData = data || [];
      }

      const userIds = [
        ...itemsData.map(item => item.user_id),
        ...servicesData.map(service => service.user_id)
      ].filter((id, index, array) => id && array.indexOf(id) === index);

      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);
        if (!error) profilesData = data || [];
      }

      const favoritesWithDetails = favoritesData.map(favorite => {
        if (favorite.item_id) {
          const item = itemsData.find(i => i.id === favorite.item_id);
          if (item) {
            const profile = profilesData.find(p => p.user_id === item.user_id);
            return {
              ...favorite,
              items: {
                ...item,
                profiles: profile
              }
            };
          }
        } else if (favorite.service_id) {
          const service = servicesData.find(s => s.id === favorite.service_id);
          if (service) {
            const profile = profilesData.find(p => p.user_id === service.user_id);
            return {
              ...favorite,
              services: {
                ...service,
                profiles: profile
              }
            };
          }
        }
        return favorite;
      }).filter(Boolean);

      setFavorites(favoritesWithDetails);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os favoritos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
      
      toast({
        title: "Removido",
        description: "Item removido dos favoritos.",
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o favorito.",
        variant: "destructive",
      });
    }
  };

  const openModal = (item: FavoriteItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const favoriteItems = favorites.filter(fav => fav.item_id);
  const favoriteServices = favorites.filter(fav => fav.service_id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderFavoritesList = (items: FavoriteItem[]) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 col-span-full">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
            Nenhum favorito nesta categoria
          </h2>
          <p className="text-muted-foreground mb-4">
            {activeTab === "items" 
              ? "Você ainda não favoritou nenhum item." 
              : "Você ainda não favoritou nenhum serviço."}
          </p>
          <Button onClick={() => navigate("/")}>
            Explorar {activeTab === "items" ? "itens" : "serviços"}
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((favorite) => (
          <Card key={favorite.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader className="p-0">
              <div className="relative">
                <img
                  src={
                    favorite.items?.image_urls?.[0] || 
                    favorite.services?.images?.[0] || 
                    "/placeholder-image.jpg"
                  }
                  alt={favorite.items?.title || favorite.services?.name}
                  className="w-full h-48 object-cover rounded-t-lg cursor-pointer"
                  onClick={() => openModal(favorite)}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFavorite(favorite.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="absolute top-2 left-2">
                  {favorite.item_id ? (
                    <Badge className="bg-blue-500">
                      <Package className="h-3 w-3 mr-1" />
                      Item
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500">
                      <Wrench className="h-3 w-3 mr-1" />
                      Serviço
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <h3 
                className="font-semibold text-lg mb-2 cursor-pointer hover:text-primary"
                onClick={() => openModal(favorite)}
              >
                {favorite.items?.title || favorite.services?.name}
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                Por {favorite.items?.profiles?.name || favorite.services?.profiles?.name || "Usuário"}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  R$ {favorite.items?.price || favorite.services?.price_per_hour}
                </span>
                {favorite.items?.condition && (
                  <Badge variant="outline">
                    {favorite.items.condition}
                  </Badge>
                )}
                {favorite.services?.availability && (
                  <Badge variant="outline">
                    {favorite.services.availability}
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button 
                className="w-full"
                onClick={() => openModal(favorite)}
              >
                Ver detalhes
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex items-center gap-4 justify-center">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Heart className="h-8 w-8 text-primary" fill="currentColor" />
              <h1 className="text-3xl font-bold">Meus Favoritos</h1>
            </div>
            <Badge variant="secondary" className="ml-2">
              {favorites.length} itens
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="items">Itens</TabsTrigger>
              <TabsTrigger value="services">Serviços</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all">
            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
                  Nenhum favorito ainda
                </h2>
                <p className="text-muted-foreground mb-4">
                  Salve itens e serviços que você gosta para encontrá-los facilmente depois.
                </p>
                <Button onClick={() => navigate("/")}>
                  Explorar itens
                </Button>
              </div>
            ) : (
              renderFavoritesList(favorites)
            )}
          </TabsContent>
          
          <TabsContent value="items">
            {renderFavoritesList(favoriteItems)}
          </TabsContent>
          
          <TabsContent value="services">
            {renderFavoritesList(favoriteServices)}
          </TabsContent>
        </Tabs>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Detalhes do {selectedItem?.item_id ? 'Item' : 'Serviço'}</span>
                <Button variant="ghost" size="icon" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            {selectedItem && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
                <div>
                  <img
                    src={
                      selectedItem.items?.image_urls?.[0] || 
                      selectedItem.services?.images?.[0] || 
                      "/placeholder-image.jpg"
                    }
                    alt={selectedItem.items?.title || selectedItem.services?.name}
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {(selectedItem.items?.image_urls?.slice(0, 3) || selectedItem.services?.images?.slice(0, 3))?.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`Imagem ${index + 1}`}
                        className="w-full h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {selectedItem.items?.title || selectedItem.services?.name}
                  </h2>
                  
                  <div className="flex items-center mb-4">
                    <Badge className={
                      selectedItem.item_id ? "bg-blue-500" : "bg-green-500"
                    }>
                      {selectedItem.item_id ? (
                        <>
                          <Package className="h-3 w-3 mr-1" />
                          Item
                        </>
                      ) : (
                        <>
                          <Wrench className="h-3 w-3 mr-1" />
                          Serviço
                        </>
                      )}
                    </Badge>
                    <span className="ml-4 text-muted-foreground">
                      Por {selectedItem.items?.profiles?.name || selectedItem.services?.profiles?.name || "Usuário"}
                    </span>
                  </div>

                  <div className="text-3xl font-bold text-primary mb-4">
                    R$ {selectedItem.items?.price || selectedItem.services?.price_per_hour}
                  </div>

                  {selectedItem.items?.condition && (
                    <div className="mb-4">
                      <span className="font-semibold">Condição: </span>
                      <Badge variant="outline">{selectedItem.items.condition}</Badge>
                    </div>
                  )}

                  {selectedItem.services?.availability && (
                    <div className="mb-4">
                      <span className="font-semibold">Disponibilidade: </span>
                      <Badge variant="outline">{selectedItem.services.availability}</Badge>
                    </div>
                  )}

                  <div className="mb-4">
                    <span className="font-semibold">Descrição:</span>
                    <p className="text-muted-foreground mt-1">
                      {selectedItem.items?.description || selectedItem.services?.description || "Sem descrição disponível."}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={closeModal}
                    >
                      Fechar
                    </Button>
                    <Button 
                     >
                      Comprar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Favorites;