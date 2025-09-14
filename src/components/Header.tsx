import { Search, Menu, Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearchSubmit: () => void;
}

const Header = ({ searchTerm, onSearchChange, onSearchSubmit }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearchSubmit();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center space-x-2 min-w-fit">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <span className="text-sm font-bold text-primary-foreground">S</span>
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent hidden sm:block">
            SustenTech
          </span>
        </div>

        {/* Search Bar - Responsivo */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar itens ou serviços..." 
              className="pl-10 bg-muted/30 border-0 focus:bg-background transition-colors"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={handleSearchKeyPress}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {user && (
            <>
              <Button variant="ghost" size="icon" className="relative hidden sm:flex">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center">
                  2
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {!user && (
            <Button 
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;