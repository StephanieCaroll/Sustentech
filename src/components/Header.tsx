import {
  Search,
  MessageCircle,
  ShoppingCart,
  User,
  LogOut,
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
import Cart from "./Cart";
import { useCartCount } from "@/hooks/useCartCount";
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const cartItemCount = useCartCount();

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearchSubmit();
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
                  onClick={() => setIsCartOpen(true)}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full text-xs text-white flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
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

      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <Messages
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
      />
    </>
  );
};

export default Header;