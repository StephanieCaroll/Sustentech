import { Star, MapPin, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ServiceCardProps {
  providerName: string;
  service: string;
  description: string;
  price: string;
  rating: number;
  reviews: number;
  location: string;
  availability: string;
  avatar: string;
  verified: boolean;
  category: string;
}

const ServiceCard = ({
  providerName,
  service,
  description,
  price,
  rating,
  reviews,
  location,
  availability,
  avatar,
  verified,
  category
}: ServiceCardProps) => {
  return (
    <Card className="transition-all duration-300 hover:shadow-card hover:-translate-y-1 group cursor-pointer">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatar} alt={providerName} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {providerName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {providerName}
                </h3>
                {verified && (
                  <CheckCircle className="h-4 w-4 text-primary fill-current" />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">{service}</p>
              
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1 text-xs">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{rating}</span>
                  <span className="text-muted-foreground">({reviews})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category */}
          <Badge 
            variant="secondary" 
            className="bg-accent/50 text-accent-foreground border-accent/20"
          >
            {category}
          </Badge>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          {/* Info */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>{location}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{availability}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-bold text-primary">{price}</span>
            <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow">
              Contatar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;