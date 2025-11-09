import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { MapPin, ArrowLeft, Loader2, X } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <Loader2 className="animate-spin text-green-500 h-12 w-12" />
        <p className="mt-3 text-lg font-semibold">Carregando mapa e localizações...</p>
      </div>
    );

  return (
    <div className="min-h-screen w-full bg-white fixed inset-0 overflow-hidden flex flex-col items-center">
      <div className="w-full flex flex-col items-center text-center px-4 py-2 mt-3 gap-2">
        <h1 className="text-xl font-bold text-green-600 flex items-center gap-2 justify-center">
          <MapPin className="h-6 w-6" /> Mapa de Oportunidades
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      <div className="w-full max-w-lg aspect-square rounded-xl overflow-hidden shadow-xl border border-gray-300 mt-1 relative">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={16} 
          scrollWheelZoom
          className="w-full h-full relative z-0"
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
                click: () => setModalData(p),
              }}
            />
          ))}
        </MapContainer>
      </div>

      <div className="mt-2 flex flex-col sm:flex-row flex-wrap items-center justify-center text-center gap-2 sm:gap-6 text-sm font-medium text-gray-700 px-4">
        <span className="flex items-center gap-1 justify-center">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: MAP_PIN_COLORS.USER }}></div>
          Você
        </span>
        <span className="flex items-center gap-1 justify-center">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: MAP_PIN_COLORS.ITEM }}></div>
          Itens
        </span>
        <span className="flex items-center gap-1 justify-center">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: MAP_PIN_COLORS.SERVICE }}></div>
          Serviços
        </span>
      </div>

      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl relative">
            <button
              onClick={() => setModalData(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 font-bold"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-2 text-gray-800">
              {modalData.name}
            </h2>
            <p className="text-sm text-gray-700">{modalData.address}</p>
            <p className="text-sm text-gray-500 mt-1">Tipo: {modalData.type === "ITEM" ? "Item" : "Serviço"}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;