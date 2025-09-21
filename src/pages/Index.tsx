import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import CategoryFilter from "@/components/CategoryFilter";
import ItemCard from "@/components/ItemCard";
import ServiceCard from "@/components/ServiceCard";
import { Messages } from "@/components/Message";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Loader2, MapPin, Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"items" | "services">("items");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyItems, setNearbyItems] = useState<any[]>([]);
  const [nearbyServices, setNearbyServices] = useState<any[]>([]);
  const { user, loading: authLoading } = useAuth();
  const { items, services, categories, loading, searchData, filterByCategory } = useSupabaseData();
  const navigate = useNavigate();

  const currentCategories = categories.filter(cat =>
    cat.type === (activeTab === "items" ? "item" : "service")
  );

  // Obter localização do usuário
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setShowMap(true);
          findNearbyItemsAndServices(latitude, longitude);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
        }
      );
    } else {
      alert("Geolocalização não é suportada por este navegador.");
    }
  };

  // Simulação: encontrar itens e serviços próximos
  const findNearbyItemsAndServices = (lat: number, lng: number) => {
    // Em uma implementação real, você faria uma consulta ao seu backend
    // com a localização do usuário para encontrar itens e serviços próximos
    
    // Simulação: considerar todos os itens e serviços como "próximos" para demonstração
    setNearbyItems(items);
    setNearbyServices(services);
  };

  const handleSearchSubmit = () => {
    if (searchTerm.trim()) {
      searchData(searchTerm, activeTab, activeCategory !== "all" ? activeCategory : undefined);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    filterByCategory(categoryId, activeTab, searchTerm || undefined);
  };

  const handleTabChange = (tab: "items" | "services") => {
    setActiveTab(tab);
    setActiveCategory("all");
    setSearchTerm("");
  };

  const handleStartConversation = (sellerId: string, item: any) => {
    setSelectedSellerId(sellerId);
    setSelectedItem(item);
    setIsMessagesOpen(true);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center overflow-x-hidden">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-muted/30 overflow-x-hidden relative">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
      />
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
      <CategoryFilter
        type={activeTab}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        categories={currentCategories}
      />

      <main className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
        {/* Estatísticas compactas e lado a lado */}
        <div className="grid grid-cols-2 gap-3 mb-6 justify-center">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-xl border border-primary/20 flex flex-col items-center text-center max-w-[160px] mx-auto">
            <h3 className="text-xl font-bold text-primary">{items.length}</h3>
            <p className="text-xs text-muted-foreground">Itens disponíveis</p>
          </div>
          <div className="bg-gradient-to-br from-accent/30 to-accent/10 p-3 rounded-xl border border-accent/20 flex flex-col items-center text-center max-w-[160px] mx-auto">
            <h3 className="text-xl font-bold text-accent-foreground">{services.length}</h3>
            <p className="text-xs text-muted-foreground">Serviços ativos</p>
          </div>
        </div>

        {/* Botão de Geolocalização */}
        <div className="flex justify-center mb-6">
          <Button 
            onClick={getUserLocation}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            <MapPin size={16} />
            Ver itens e serviços próximos
          </Button>
        </div>

        {/* Cards */}
        {activeTab === "items" ? (
          items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <div key={item.id} className="w-full max-w-full overflow-hidden">
                  <ItemCard 
                    item={item} 
                    onStartConversation={handleStartConversation}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum item encontrado</p>
              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveCategory("all");
                  }}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )
        ) : services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.id} className="w-full max-w-full overflow-hidden">
                <ServiceCard service={service} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum serviço encontrado</p>
            {searchTerm && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setActiveCategory("all");
                }}
                className="mt-4"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {/* Comunidade */}
        <div className="mt-12 p-6 bg-gradient-to-r from-accent/20 to-primary/10 rounded-2xl border border-primary/20 text-center w-full break-words">
          <h2 className="text-lg sm:text-xl font-semibold mb-2 break-words">
            Comunidade SustenTech
          </h2>
          <p className="text-muted-foreground mb-4 break-words">
            Juntos por um consumo mais consciente và sustentável
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary">12.5k</div>
              <div className="text-xs text-muted-foreground">Membros</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">8.2k</div>
              <div className="text-xs text-muted-foreground">Itens doados</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">456</div>
              <div className="text-xs text-muted-foreground">Reparos realizados</div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal do Mapa - Corrigido para aparecer corretamente */}
      {showMap && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-96 md:h-[500px] relative overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 z-10 bg-white rounded-full shadow-md"
              onClick={() => setShowMap(false)}
            >
              <X size={20} />
            </Button>
            
            {/* Mapa Simulado */}
            <div className="w-full h-full rounded-lg bg-blue-50 flex items-center justify-center relative border">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-blue-200 opacity-50"></div>
              <Map size={48} className="text-blue-300 z-10" />
              
              {/* Simulação de pontos no mapa */}
              {userLocation && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-lg animate-pulse flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="text-xs mt-2 text-center font-medium bg-white/80 px-2 py-1 rounded-md shadow-sm">Você está aqui</div>
                </div>
              )}
              
              {/* Pontos de itens (em vermelho) */}
              {nearbyItems.slice(0, 8).map((item, index) => (
                <div 
                  key={item.id}
                  className="absolute z-20"
                  style={{
                    top: `${30 + (index * 8)}%`,
                    left: `${20 + (index * 7)}%`,
                  }}
                >
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </div>
              ))}
              
              {/* Pontos de serviços (em verde) */}
              {nearbyServices.slice(0, 8).map((service, index) => (
                <div 
                  key={service.id}
                  className="absolute z-20"
                  style={{
                    top: `${50 + (index * 5)}%`,
                    left: `${60 + (index * 4)}%`,
                  }}
                >
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-white rounded-b-lg border-t">
              <div className="flex items-center justify-center gap-6 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Itens ({nearbyItems.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Serviços ({nearbyServices.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                  <span className="text-sm">Sua localização</span>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                {userLocation 
                  ? `Mostrando itens e serviços próximos a sua localização atual`
                  : `Localização não disponível`}
              </p>
            </div>
          </div>
        </div>
      )}

      <Messages 
        isOpen={isMessagesOpen} 
        onClose={() => {
          setIsMessagesOpen(false);
          setSelectedSellerId(null);
          setSelectedItem(null);
        }}
        initialSellerId={selectedSellerId || undefined}
        initialItem={selectedItem}
      />

      <Footer />
    </div>
  );
};

export default Index;