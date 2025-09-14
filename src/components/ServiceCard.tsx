import { Star, MapPin, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Service } from "@/hooks/useSupabaseData";

interface ServiceCardProps {
  service: Service;
}

const ServiceCard = ({ service }: ServiceCardProps) => {
  const formatPrice = (pricePerHour?: number) => {
    if (!pricePerHour) return "A consultar";
    return `R$ ${pricePerHour.toFixed(2)}/hora`;
  };

  const formatAvailability = (availability: string) => {
    const availabilities: Record<string, string> = {
      'disponivel': 'Disponível',
      'ocupado': 'Ocupado',
      'offline': 'Offline'
    };
    return availabilities[availability] || availability;
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-card hover:-translate-y-1 group cursor-pointer">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={service.profiles?.avatar_url} alt={service.profiles?.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {service.profiles?.name.slice(0, 2).toUpperCase() || 'US'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {service.profiles?.name || 'Usuário'}
                </h3>
                {service.profiles?.is_verified && (
                  <CheckCircle className="h-4 w-4 text-primary fill-current" />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">{service.name}</p>
              
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1 text-xs">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{service.profiles?.rating || 0}</span>
                  <span className="text-muted-foreground">({service.profiles?.total_reviews || 0})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category */}
          <Badge 
            variant="secondary" 
            className="bg-accent/50 text-accent-foreground border-accent/20"
          >
            {service.categories?.name || 'Serviço'}
          </Badge>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {service.description || 'Sem descrição disponível'}
          </p>

          {/* Info */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>{service.city || service.location || 'Localização'}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatAvailability(service.availability)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-bold text-primary">{formatPrice(service.price_per_hour)}</span>
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