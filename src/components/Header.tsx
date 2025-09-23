import {
  Search,
  MessageCircle,
  MapPin,
  User,
  LogOut,
  Map,
  X,
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
}

const Header = ({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
}: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearchSubmit();
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setShowMap(true);
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
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadMessagesCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadMessagesCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!isMessagesOpen && user) {
      fetchUnreadMessagesCount();
    }
  }, [isMessagesOpen, user]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-x-hidden">
        <div className="w-full max-w-screen-xl mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8 overflow-hidden break-words">
        
          <div className="flex items-center space-x-2 min-w-fit">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <span className="text-lg font-bold text-primary-foreground">
                S
              </span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent hidden sm:block">
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
                  className="relative h-10 w-10"
                  onClick={() => setIsMessagesOpen(true)}
                >
                  <MessageCircle className="h-6 w-6" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center">
                      {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-10 w-10"
                  onClick={getUserLocation}
                >
                  <MapPin className="h-6 w-6" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                      <User className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      Conta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-primary to-primary-glow h-12"
              >
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

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
            
            <div className="w-full h-full rounded-lg bg-blue-50 flex items-center justify-center relative border">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-blue-200 opacity-50"></div>
              <Map size={48} className="text-blue-300 z-10" />
              
              {userLocation && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-lg animate-pulse flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="text-xs mt-2 text-center font-medium bg-white/80 px-2 py-1 rounded-md shadow-sm">Você está aqui</div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white rounded-b-lg border-t">
              <div className="flex items-center justify-center gap-6 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Itens próximos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Serviços próximos</span>
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
        onClose={() => setIsMessagesOpen(false)}
      />
    </>
  );
};

export default Header;