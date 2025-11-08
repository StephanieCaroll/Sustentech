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

    const [nearbyItems, setNearbyItems] = useState<any[]>([]);
    const [nearbyServices, setNearbyServices] = useState<any[]>([]);
    const { user, loading: authLoading } = useAuth();
    const { items, services, categories, loading, searchData, filterByCategory } = useSupabaseData();
    const navigate = useNavigate();

    const currentCategories = categories.filter(cat =>
        cat.type === (activeTab === "items" ? "item" : "service")
    );


    const findNearbyItemsAndServices = (lat: number, lng: number) => {

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


    useEffect(() => {

        if (isMessagesOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isMessagesOpen]);


    if (authLoading || !user) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center overflow-x-hidden">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // Variável removida

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-background to-muted/30 overflow-x-hidden relative">

            <div className="fixed top-0 left-0 right-0 z-50 md:z-100 bg-background/95 backdrop-blur-sm border-b border-border/60">
                <Header
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearchSubmit={handleSearchSubmit}
                    items={items}
                    services={services}
                />
                <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
                <CategoryFilter
                    type={activeTab}
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                    categories={currentCategories}
                />
            </div>

            <main className={`w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-64 md:pt-48 pb-6 overflow-x-hidden`}>
                
                <div className="flex gap-3 mb-6 justify-center">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-xl border border-primary/20 flex flex-col items-center text-center max-w-[160px]">
                        <h3 className="text-xl font-bold text-primary">{items.length}</h3>
                        <p className="text-xs text-muted-foreground">Itens disponíveis</p>
                    </div>
                    <div className="bg-gradient-to-br from-accent/30 to-accent/10 p-3 rounded-xl border border-accent/20 flex flex-col items-center text-center max-w-[160px]">
                        <h3 className="text-xl font-bold text-accent-foreground">{services.length}</h3>
                        <p className="text-xs text-muted-foreground">Serviços ativos</p>
                    </div>
                </div>

                {activeTab === "items" ? (
                    items.length > 0 ? (
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {items.map((item) => (
                                <ItemCard 
                                    key={item.id} 
                                    item={item} 
                                    onStartConversation={handleStartConversation}
                                    
                                />
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {services.map((service) => (
                            <ServiceCard 
                                key={service.id} 
                                service={service} 
                            />
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

                <div className="mt-12 p-6 bg-gradient-to-r from-accent/20 to-primary/10 rounded-2xl border border-primary/20 text-center w-full break-words">
                    <h2 className="text-lg sm:text-xl font-semibold mb-2 break-words">
                        Comunidade SustenTech
                    </h2>
                    <p className="text-muted-foreground mb-4 break-words">
                        Juntos por um consumo mais consciente e sustentável
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