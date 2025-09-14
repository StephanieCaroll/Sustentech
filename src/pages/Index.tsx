import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import CategoryFilter from "@/components/CategoryFilter";
import ItemCard from "@/components/ItemCard";
import ServiceCard from "@/components/ServiceCard";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockItems = [
  {
    title: "Sofá 3 lugares em ótimo estado",
    price: "R$ 450",
    location: "2.1 km",
    condition: "Muito Bom",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400",
    category: "Móveis"
  },
  {
    title: "iPhone 12 128GB",
    price: "R$ 1.200",
    location: "1.5 km", 
    condition: "Bom Estado",
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400",
    category: "Eletrônicos"
  },
  {
    title: "Coleção Harry Potter completa",
    price: "Gratuito",
    location: "800m",
    condition: "Usado",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
    category: "Livros"
  },
  {
    title: "Vestido social feminino P",
    price: "R$ 80",
    location: "3.2 km",
    condition: "Muito Bom",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400",
    category: "Roupas"
  }
];

const mockServices = [
  {
    providerName: "Maria Silva",
    service: "Costureira Especializada",
    description: "Ajustes, reformas e consertos de roupas. Mais de 15 anos de experiência.",
    price: "A partir de R$ 25",
    rating: 4.9,
    reviews: 127,
    location: "1.2 km",
    availability: "Seg-Sex, 8h-18h",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400",
    verified: true,
    category: "Costura"
  },
  {
    providerName: "João Santos",
    service: "Marceneiro",
    description: "Restauração de móveis antigos e fabricação sob medida. Trabalho artesanal.",
    price: "R$ 80/hora",
    rating: 4.8,
    reviews: 89,
    location: "2.5 km",
    availability: "Ter-Sáb, 9h-17h",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
    verified: true,
    category: "Marcenaria"
  },
  {
    providerName: "TechFix",
    service: "Conserto de Eletrônicos",
    description: "Especialistas em smartphones, tablets e notebooks. Diagnóstico gratuito.",
    price: "A partir de R$ 40",
    rating: 4.6,
    reviews: 203,
    location: "900m",
    availability: "Seg-Sáb, 9h-19h",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400",
    verified: true,
    category: "Eletrônicos"
  }
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<"items" | "services">("items");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { user, loading: authLoading } = useAuth();
  const { items, services, categories, loading, searchData, filterByCategory } = useSupabaseData();
  const navigate = useNavigate();

  // Filtrar categorias baseado no tipo atual
  const currentCategories = categories.filter(cat => 
    cat.type === (activeTab === "items" ? "item" : "service")
  );

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

  // Redirectar para auth se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
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
      
      <main className="container mx-auto px-4 py-6 lg:px-6">
        {/* Stats - Responsivo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-xl border border-primary/20">
            <h3 className="text-xl lg:text-2xl font-bold text-primary">{items.length}</h3>
            <p className="text-sm text-muted-foreground">Itens disponíveis</p>
          </div>
          <div className="bg-gradient-to-br from-accent/30 to-accent/10 p-4 rounded-xl border border-accent/20">
            <h3 className="text-xl lg:text-2xl font-bold text-accent-foreground">{services.length}</h3>
            <p className="text-sm text-muted-foreground">Serviços ativos</p>
          </div>
          <div className="bg-gradient-to-br from-secondary/50 to-secondary/20 p-4 rounded-xl border border-secondary/20 hidden lg:block">
            <h3 className="text-2xl font-bold text-secondary-foreground">12.5k</h3>
            <p className="text-sm text-muted-foreground">Membros</p>
          </div>
          <div className="bg-gradient-to-br from-muted/50 to-muted/20 p-4 rounded-xl border border-muted/20 hidden lg:block">
            <h3 className="text-2xl font-bold text-muted-foreground">456</h3>
            <p className="text-sm text-muted-foreground">Reparos realizados</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Content Grid - Responsivo */}
            {activeTab === "items" ? (
              items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
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
            ) : (
              services.length > 0 ? (
                <div className="space-y-4">
                  {services.map((service) => (
                    <ServiceCard key={service.id} service={service} />
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
              )
            )}

            {/* Community Section - Responsivo */}
            <div className="mt-12 p-6 bg-gradient-to-r from-accent/20 to-primary/10 rounded-2xl border border-primary/20">
              <h2 className="text-xl font-semibold mb-2 text-center">Comunidade SustenTech</h2>
              <p className="text-center text-muted-foreground mb-4">
                Juntos por um consumo mais consciente e sustentável
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
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
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
