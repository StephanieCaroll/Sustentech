import { Heart, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ItemCardProps {
  title: string;
  price: string;
  location: string;
  condition: string;
  rating: number;
  image: string;
  category: string;
  isLiked?: boolean;
}

const ItemCard = ({ 
  title, 
  price, 
  location, 
  condition, 
  rating, 
  image, 
  category,
  isLiked = false 
}: ItemCardProps) => {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-card hover:-translate-y-1 group cursor-pointer">
      <div className="relative">
        <div className="aspect-square bg-muted/30 overflow-hidden">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        
        {/* Overlay Actions */}
        <div className="absolute top-2 right-2">
          <Button
            size="icon"
            variant="ghost"
            className={`h-8 w-8 rounded-full bg-background/80 backdrop-blur transition-colors ${
              isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
          </Button>
        </div>

        {/* Category Badge */}
        <Badge 
          variant="secondary" 
          className="absolute top-2 left-2 bg-primary/10 text-primary border-primary/20"
        >
          {category}
        </Badge>
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">{price}</span>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{rating}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{location}</span>
          </div>

          <Badge 
            variant="outline" 
            className="text-xs border-primary/20 text-primary"
          >
            {condition}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemCard;