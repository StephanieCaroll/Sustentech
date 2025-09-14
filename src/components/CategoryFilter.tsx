import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Shirt, 
  Sofa, 
  Smartphone, 
  Book, 
  Utensils, 
  Gamepad2,
  Hammer,
  Scissors,
  Wrench,
  PaintBucket,
  Zap,
  Car
} from "lucide-react";

interface CategoryFilterProps {
  type: "items" | "services";
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  categories: Category[];
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  type: string;
}

const itemCategories = [
  { id: "all", name: "Todos", icon: null },
  { id: "roupas", name: "Roupas", icon: Shirt },
  { id: "moveis", name: "Móveis", icon: Sofa },
  { id: "eletronicos", name: "Eletrônicos", icon: Smartphone },
  { id: "livros", name: "Livros", icon: Book },
  { id: "domesticos", name: "Domésticos", icon: Utensils },
  { id: "jogos", name: "Jogos", icon: Gamepad2 },
];

const serviceCategories = [
  { id: "all", name: "Todos", icon: null },
  { id: "costura", name: "Costura", icon: Scissors },
  { id: "marcenaria", name: "Marcenaria", icon: Hammer },
  { id: "eletronicos", name: "Eletrônicos", icon: Zap },
  { id: "pintura", name: "Pintura", icon: PaintBucket },
  { id: "mecanica", name: "Mecânica", icon: Car },
  { id: "geral", name: "Conserto Geral", icon: Wrench },
];

const CategoryFilter = ({ type, activeCategory, onCategoryChange, categories: dbCategories }: CategoryFilterProps) => {
  // Usar categorias do banco ou fallback para as estáticas
  const staticCategories = type === "items" ? itemCategories : serviceCategories;
  const categories = dbCategories.length > 0 
    ? [{ id: "all", name: "Todos", icon: null, type: "both" }, ...dbCategories.map(cat => ({ ...cat, icon: null }))]
    : staticCategories;

  return (
    <div className="w-full bg-background py-3 border-b">
      <ScrollArea className="w-full">
        <div className="flex space-x-2 px-4">
          {categories.map((category) => {
            const IconComponent = category.icon;
            const isActive = activeCategory === category.id;
            
            return (
              <Button
                key={category.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`shrink-0 space-x-2 transition-all duration-200 ${
                  isActive 
                    ? "bg-gradient-to-r from-primary to-primary-glow shadow-sustainable" 
                    : "hover:border-primary/50 hover:text-primary"
                }`}
                onClick={() => onCategoryChange(category.id)}
              >
                {IconComponent && <IconComponent className="h-3 w-3" />}
                <span className="text-xs">{category.name}</span>
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default CategoryFilter;