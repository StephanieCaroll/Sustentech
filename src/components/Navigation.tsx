import { useState } from "react";
import { Package, Wrench, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationProps {
  activeTab: "items" | "services";
  onTabChange: (tab: "items" | "services") => void;
}

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  return (
    <div className="w-full bg-background border-b">
      {/* Main Navigation */}
      <div className="flex items-center justify-center p-4 space-x-4">
        <Button
          variant={activeTab === "items" ? "default" : "outline"}
          className={cn(
            "flex-1 max-w-40 space-x-2 transition-all duration-300",
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
            "flex-1 max-w-40 space-x-2 transition-all duration-300",
            activeTab === "services" && "bg-gradient-to-r from-primary to-primary-glow shadow-sustainable"
          )}
          onClick={() => onTabChange("services")}
        >
          <Wrench className="h-4 w-4" />
          <span>Serviços</span>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-center pb-4 space-x-3">
        <Button size="sm" variant="outline" className="space-x-1">
          <Heart className="h-3 w-3" />
          <span>Favoritos</span>
        </Button>
        
        <Button size="sm" className="space-x-1 bg-gradient-to-r from-primary to-primary-glow">
          <Plus className="h-3 w-3" />
          <span>Adicionar</span>
        </Button>
      </div>
    </div>
  );
};

export default Navigation;