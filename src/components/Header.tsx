import {
    Search,
    MessageCircle,
    MapPin,
    User,
    LogOut,
    Leaf
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom"; 
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { Messages } from "./Message";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onSearchSubmit: () => void;
    items: any[];
    services: any[];
}

const Header = ({
    searchTerm,
    onSearchChange,
    onSearchSubmit,
    items,
    services,
}: HeaderProps) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMessagesOpen, setIsMessagesOpen] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            onSearchSubmit();
        }
    };
    
    const navigateToMapPage = (locationData: { lat: number, lng: number } | null) => {
        navigate("/mapa", { 
            state: { 
                items, 
                services, 
                userLocation: locationData 
            } 
        });
    }

    const getUserLocation = () => {
        const handleError = () => {
            setUserLocation(null); 
            navigateToMapPage(null);
            console.error("Geolocalização indisponível. Abrindo mapa no centro padrão.");
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const locationData = { lat: latitude, lng: longitude };
                    setUserLocation(locationData);
                    navigateToMapPage(locationData);
                },
                (error) => {
                    console.error("Erro ao obter localização:", error);
                    handleError();
                }
            );
        } else {
            handleError();
        }
    };

    const fetchUnreadMessagesCount = async () => {
        if (!user?.id) return;

        try {
            const { count, error } = await supabase
                .from("messages")
                .select("*", { count: "exact" })
                .eq("receiver_id", user.id)
                .eq("read", false); 
            
            if (error) {
                console.error("Erro ao buscar mensagens não lidas:", error);
                return;
            }

            setUnreadMessagesCount(count || 0);
        } catch (error) {
            console.error("Erro ao buscar mensagens não lidas:", error);
        }
    };

    useEffect(() => {
        if (!user?.id) return;
        fetchUnreadMessagesCount();

        const subscription = supabase
            .channel("unread-messages-count")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
                () => { fetchUnreadMessagesCount(); }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
                () => { fetchUnreadMessagesCount(); }
            )
            .subscribe();

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, [user]);

    useEffect(() => {
        if (!isMessagesOpen && user) {
            fetchUnreadMessagesCount();
        }
    }, [isMessagesOpen, user]);

    const handleLogoClick = () => {
        if (user) {
            navigate("/app");
        } else {
            navigate("/");
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate("/"); 
    };

    return (
        <>
            <header className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-x-hidden`}>
                <div className="w-full max-w-screen-xl mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8 overflow-hidden break-words">
                    
                    <div 
                        className="flex items-center space-x-3 min-w-fit cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleLogoClick}
                    >
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-xl">
                            <Leaf className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-xl bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent hidden sm:block">
                            SustenTech
                        </span>
                    </div>

                    <div className="flex-1 max-w-2xl px-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar itens ou serviços..."
                                className="pl-10 h-12 bg-muted/30 border-0 focus:bg-background transition-colors w-full"
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                onKeyPress={handleSearchKeyPress}
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                        {user ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative h-10 w-10 hover:bg-green-50"
                                    onClick={() => setIsMessagesOpen(true)}
                                >
                                    <MessageCircle className="h-6 w-6 text-green-700" />
                                    {unreadMessagesCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-600 rounded-full text-[10px] text-white flex items-center justify-center">
                                            {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                                        </span>
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative h-10 w-10 hover:bg-green-50"
                                    onClick={getUserLocation} 
                                >
                                    <MapPin className="h-6 w-6 text-green-700" />
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-green-50">
                                            <User className="h-6 w-6 text-green-700" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="border-green-200">
                                        <DropdownMenuItem 
                                            onClick={() => navigate("/profile")}
                                            className="text-green-700 hover:bg-green-50 cursor-pointer"
                                        >
                                            Conta
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            onClick={handleSignOut} 
                                            className="text-green-700 hover:bg-green-50 cursor-pointer"
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Sair
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <Button
                                onClick={() => navigate("/auth")}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 text-white"
                            >
                                Entrar
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <Messages
                isOpen={isMessagesOpen}
                onClose={() => setIsMessagesOpen(false)}
            />
        </>
    );
};

export default Header;