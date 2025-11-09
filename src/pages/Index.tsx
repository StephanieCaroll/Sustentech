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
import { Loader2, MapPin, Map, X, Leaf, Recycle, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";

const LoadingScreen = () => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 overflow-hidden relative">
          
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute top-1/4 -right-8 w-24 h-24 bg-blue-200 rounded-full opacity-30 animate-pulse delay-300"></div>
                <div className="absolute bottom-1/3 left-1/4 w-20 h-20 bg-emerald-200 rounded-full opacity-25 animate-pulse delay-700"></div>
                <div className="absolute bottom-20 right-1/4 w-28 h-28 bg-teal-200 rounded-full opacity-20 animate-pulse delay-500"></div>
            </div>

            <div className="relative z-10 text-center space-y-8 px-6">
               
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl animate-spin-slow"></div>
                    <div className="absolute inset-2 bg-white rounded-xl flex items-center justify-center">
                        <Leaf className="h-10 w-10 text-green-500" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        SustenTech
                    </h1>
                    <p className="text-gray-600 text-lg max-w-md mx-auto">
                        Conectando você a um consumo mais consciente e sustentável
                    </p>
                    
                    <div className="w-64 mx-auto bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full"
                            style={{
                                animation: 'progress 2s ease-in-out infinite'
                            }}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto pt-4">
                    <div className="text-center">
                        <Recycle className="h-6 w-6 text-green-500 mx-auto mb-2 animate-bounce" />
                        <div className="text-sm text-gray-600">Carregando itens</div>
                    </div>
                    <div className="text-center">
                        <Sprout className="h-6 w-6 text-green-500 mx-auto mb-2 animate-bounce delay-200" />
                        <div className="text-sm text-gray-600">Buscando serviços</div>
                    </div>
                    <div className="text-center">
                        <Leaf className="h-6 w-6 text-green-500 mx-auto mb-2 animate-bounce delay-400" />
                        <div className="text-sm text-gray-600">Preparando comunidade</div>
                    </div>
                </div>

                <div className="flex justify-center space-x-2 pt-4">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce delay-150"></div>
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-300"></div>
                </div>
            </div>
        </div>
    );
};

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
        return <LoadingScreen />;
    }

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

            <main className={`w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-64 md:pt-56 pb-6 overflow-x-hidden`}>
               
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