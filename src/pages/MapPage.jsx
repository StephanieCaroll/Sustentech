import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { MapPin, ArrowLeft, Loader2, X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

const GEOAPIFY_API_KEY = "ea090e96a1ed45bdb775551f9226f7d0"; 

const DEFAULT_COORDS = { lat: -23.55052, lng: -46.633308 };

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MAP_PIN_COLORS = {
  ITEM: "#f97316", 
  SERVICE: "#10b981", 
  USER: "#3b82f6", 
};

const createColoredIcon = (color) => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path fill="${color}" d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
        <circle fill="white" cx="12.5" cy="12.5" r="5.5"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });
};

const userIcon = createColoredIcon(MAP_PIN_COLORS.USER);
const itemIcon = createColoredIcon(MAP_PIN_COLORS.ITEM);
const serviceIcon = createColoredIcon(MAP_PIN_COLORS.SERVICE);

const getIconByType = (type) => {
  switch(type) {
    case "ITEM": return itemIcon;
    case "SERVICE": return serviceIcon;
    case "USER": return userIcon;
    default: return userIcon;
  }
};

const fetchCoordinates = async (address) => {
  if (!address || address.trim().length < 10) return null;

  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
    address
  )}&apiKey=${GEOAPIFY_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return {
        lat: parseFloat(lat),
        lng: parseFloat(lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Erro na geocodificação do endereço (Geoapify):", address, error);
    return null;
  }
};

const MapPage = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [points, setPoints] = useState([]);
  const [modalData, setModalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemDetails, setItemDetails] = useState(null);

  const getFullAddress = useCallback((data) => {
    const parts = [
      data.logradouro || "",
      data.numero || "",
      data.bairro || "",
      data.city || "",
      data.state || "",
      data.cep || "",
    ].filter(Boolean);
    return parts.join(", ");
  }, []);

  const fetchItemDetails = async (point) => {
    try {
      console.log("Buscando detalhes para:", point);
      
      if (point.type === "ITEM") {
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .eq("id", point.id)
          .single();
        
        console.log("Dados do item:", data, "Erro:", error);
        
        if (!error && data) {
          setItemDetails({
            ...data,
            images: data.image_urls ? data.image_urls.map(url => ({ url })) : []
          });
        }
      } else if (point.type === "SERVICE") {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("id", point.id)
          .single();
        
        console.log("Dados do serviço:", data, "Erro:", error);
        
        if (!error && data) {
          setItemDetails({
            ...data,
            images: data.images ? data.images.map(url => ({ url })) : [],
            price: data.price_per_hour
          });
        }
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
    }
  };

  const handleMarkerClick = async (point) => {
    setModalData(point);
    setItemDetails(null);
    await fetchItemDetails(point);
  };

  const handleCloseModal = () => {
    setModalData(null);
    setItemDetails(null);
  };

  const handleGoToAd = () => {
    if (modalData?.type === "ITEM") {
     
      navigate(`/item/${modalData.id}`);
    } else if (modalData?.type === "SERVICE") {
    
      navigate(`/service/${modalData.id}`);
    }
    handleCloseModal();
  };

  const formatPrice = (price) => {
  if (price === null || price === undefined) return "Preço não informado";
  if (price === 0) return "Gratuito";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setUserLocation(DEFAULT_COORDS)
    );
    
    const loadData = async () => {
      setLoading(true);
      const selectFields =
        "id, title, name, logradouro, numero, bairro, city, state, cep, lat, lng";

      const [itemsRes, servicesRes] = await Promise.all([
        supabase.from("items").select(selectFields.replace(", name", "")),
        supabase.from("services").select(selectFields.replace(", title", "")),
      ]);

      const itemsDB = itemsRes.data || [];
      const servicesDB = servicesRes.data || [];

      const processPoint = async (data, type) => {
        let coords = { lat: data.lat, lng: data.lng };

        if (typeof coords.lat !== "number" || typeof coords.lng !== "number") {
          const address = getFullAddress(data);
          coords = await fetchCoordinates(address);
        }

        if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
            return null; 
        }

        return {
          id: data.id,
          name: data.title || data.name,
          lat: coords.lat,
          lng: coords.lng,
          address: `${data.logradouro || ""} ${data.numero || ""}, ${data.bairro || ""}, ${data.city || ""} - ${data.state || ""}`,
          type: type,
        };
      };

      const [formattedItems, formattedServices] = await Promise.all([
        Promise.all(itemsDB.map((item) => processPoint(item, "ITEM"))),
        Promise.all(servicesDB.map((s) => processPoint(s, "SERVICE"))),
      ]);
      
      setPoints([
        ...formattedItems.filter(Boolean),
        ...formattedServices.filter(Boolean),
      ]);
      setLoading(false);
    };

    loadData();
  }, [getFullAddress]);

  if (loading || !userLocation)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
        <Loader2 className="animate-spin text-green-500 h-12 w-12" />
        <p className="mt-3 text-lg font-semibold">Carregando mapa e localizações...</p>
      </div>
    );

  return (
    <div className="min-h-screen w-full bg-white fixed inset-0 overflow-hidden flex flex-col">
      {/* Header compacto */}
      <div className="w-full bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            <h1 className="text-lg font-bold text-green-600">Mapa de Oportunidades</h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto">
        <div className="w-full h-full px-6">
          <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-gray-300 mx-auto relative">
          
            {modalData && (
              <div className="absolute inset-0 bg-transparent z-[1000]" />
            )}
            <MapContainer
              center={[userLocation.lat, userLocation.lng]}
              zoom={16} 
              scrollWheelZoom={!modalData} 
              className="w-full h-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={userIcon}
              />

              {points.map((p) => (
                <Marker
                  key={`${p.type}-${p.id}`}
                  position={[p.lat, p.lng]}
                  icon={getIconByType(p.type)}
                  eventHandlers={{
                    click: () => handleMarkerClick(p),
                  }}
                />
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      <div className="w-full bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-center gap-4 text-sm font-medium text-gray-700 max-w-7xl mx-auto w-full">
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MAP_PIN_COLORS.USER }}></div>
            Você
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MAP_PIN_COLORS.ITEM }}></div>
            Itens
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MAP_PIN_COLORS.SERVICE }}></div>
            Serviços
          </span>
        </div>
      </div>

      {modalData && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={handleCloseModal}
          />
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-hidden z-[10000]">
           
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
            >
              <X size={20} className="text-gray-600" />
            </button>

            <div className="w-full h-48 bg-gray-200 relative">
              {itemDetails?.images?.[0]?.url ? (
                <img 
                  src={itemDetails.images[0].url} 
                  alt={modalData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <MapPin className="h-12 w-12 text-gray-400" />
                </div>
              )}
              
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                  modalData.type === "ITEM" ? "bg-orange-500" : "bg-green-500"
                }`}>
                  {modalData.type === "ITEM" ? "Item" : "Serviço"}
                </span>
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {modalData.name}
              </h2>
              
              <p className="text-2xl font-bold text-green-600 mb-4">
                {modalData.type === "SERVICE" ? (
                  <>
                    {formatPrice(itemDetails?.price)}
                    <span className="text-sm font-normal text-gray-500 ml-1">/hora</span>
                  </>
                ) : (
                  formatPrice(itemDetails?.price)
                )}
              </p>

              {itemDetails?.description ? (
                <div className="mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {itemDetails.description}
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-gray-500 text-sm italic">
                    Descrição não disponível
                  </p>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm text-gray-600 flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  {modalData.address}
                </p>
              </div>

              <button
                onClick={handleGoToAd}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink size={18} />
                Ver Anúncio Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;