import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Package, Wrench, Heart, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationProps {
  activeTab: "items" | "services";
  onTabChange: (tab: "items" | "services") => void;
}

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="w-full bg-background border-b">
    
      <div className="grid grid-cols-2 md:flex items-center justify-center p-4 gap-4 md:space-x-2">
        <Button
          variant={activeTab === "items" ? "default" : "outline"}
          className={cn(
            "space-x-2 transition-all duration-300 w-full",
            activeTab === "items" && "bg-gradient-to-r from-primary to-primary-glow shadow-sustainable"
          )}
          onClick={() => onTabChange("items")}
        >
          <Package className="h-4 w-4" />
          <span>Itens</span>
        </Button>
        
        <Button
          variant={activeTab === "services" ? "default" : "outline"}
          className={cn(
            "space-x-2 transition-all duration-300 w-full",
            activeTab === "services" && "bg-gradient-to-r from-primary to-primary-glow shadow-sustainable"
          )}
          onClick={() => onTabChange("services")}
        >
          <Wrench className="h-4 w-4" />
          <span>Serviços</span>
        </Button>

        <Button 
          variant="outline"
          className="space-x-1 w-full"
          onClick={() => navigate("/favorites")}
        >
          <Heart className="h-4 w-4" />
          <span>Favoritos</span>
        </Button>
        
        <Button
          className="space-x-1 w-full bg-gradient-to-r from-primary to-primary-glow"
          onClick={() => navigate("/AddItem")}
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar</span>
        </Button>
      </div>
    </div>
  );
};

export default Navigation;
