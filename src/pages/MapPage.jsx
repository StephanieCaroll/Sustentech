import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { MapPin, ArrowLeft, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_COORDS = { lat: -23.55052, lng: -46.633308 };

const geocodeAddress = () => ({
  lat: DEFAULT_COORDS.lat + (Math.random() - 0.5) * 0.015,
  lng: DEFAULT_COORDS.lng + (Math.random() - 0.5) * 0.015,
});

const MAP_PIN_COLORS = {
  ITEM: "#f97316",
  SERVICE: "#10b981",
  USER: "#3b82f6",
};

const PIN_SIZE = 25;

const createCustomIcon = (color) =>
  L.divIcon({
    html: `<div style="
      width: ${PIN_SIZE}px;
      height: ${PIN_SIZE}px;
      background-color: ${color};
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    "></div>`,
    className: "",
    iconSize: [PIN_SIZE, PIN_SIZE],
    iconAnchor: [PIN_SIZE / 2, PIN_SIZE / 2],
  });

const FitBoundsHandler = ({ points, userLocation }) => {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = points.map((p) => [p.lat, p.lng]);
    if (userLocation) bounds.push([userLocation.lat, userLocation.lng]);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }, [points, userLocation, map]);
  return null;
};

const MapPage = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [points, setPoints] = useState([]);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
   
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(DEFAULT_COORDS)
    );

    const loadData = async () => {
      await new Promise((r) => setTimeout(r, 400));

      const { data: itemsDB } = await supabase
        .from("items")
        .select("id, title, logradouro, numero, bairro, city, state, cep");

      const { data: servicesDB } = await supabase
        .from("services")
        .select("id, name, logradouro, numero, bairro, city, state, cep");

      const formattedItems = itemsDB.map((item) => {
        const coords = geocodeAddress();
        return {
          id: item.id,
          name: item.title,
          lat: coords.lat,
          lng: coords.lng,
          address: `${item.logradouro || ""} ${item.numero || ""}, ${item.bairro || ""}, ${item.city || ""} - ${item.state || ""}`,
          type: "ITEM",
        };
      });

      const formattedServices = servicesDB.map((s) => {
        const coords = geocodeAddress();
        return {
          id: s.id,
          name: s.name,
          lat: coords.lat,
          lng: coords.lng,
          address: `${s.logradouro || ""} ${s.numero || ""}, ${s.bairro || ""}, ${s.city || ""} - ${s.state || ""}`,
          type: "SERVICE",
        };
      });

      setPoints([...formattedItems, ...formattedServices]);
    };

    loadData();
  }, []);

  if (!userLocation || points.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <Loader2 className="animate-spin text-green-500 h-12 w-12" />
        <p className="mt-3 text-lg font-semibold">Carregando mapa...</p>
      </div>
    );

  return (
    <div className="min-h-screen w-full bg-white fixed inset-0 overflow-hidden flex flex-col items-center">
      {/* Cabeçalho */}
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

      {/* Mapa */}
      <div className="w-full max-w-lg aspect-square rounded-xl overflow-hidden shadow-xl border border-gray-300 mt-1 relative">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={14}
          scrollWheelZoom
          className="w-full h-full relative z-0"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Usuário */}
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createCustomIcon(MAP_PIN_COLORS.USER)}
          />

          {/* Pins */}
          {points.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createCustomIcon(MAP_PIN_COLORS[p.type])}
              eventHandlers={{
                click: () => setModalData(p),
              }}
            />
          ))}

          <FitBoundsHandler points={points} userLocation={userLocation} />
        </MapContainer>
      </div>

      {/* Legenda */}
      <div className="mt-2 flex flex-col sm:flex-row flex-wrap items-center justify-center text-center gap-2 sm:gap-6 text-sm font-medium text-gray-700 px-4">
        <span className="flex items-center gap-1 justify-center">
          <div className="w-3 h-3 rounded-full" style={{ background: MAP_PIN_COLORS.USER }}></div> Você
        </span>
        <span className="flex items-center gap-1 justify-center">
          <div className="w-3 h-3 rounded-full" style={{ background: MAP_PIN_COLORS.ITEM }}></div> Itens
        </span>
        <span className="flex items-center gap-1 justify-center">
          <div className="w-3 h-3 rounded-full" style={{ background: MAP_PIN_COLORS.SERVICE }}></div> Serviços
        </span>
      </div>

      {/* Modal */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl relative">
            <button
              onClick={() => setModalData(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 font-bold"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-2">{modalData.name}</h2>
            <p className="text-sm text-gray-700">{modalData.address}</p>
            <p className="text-sm text-gray-500 mt-1">Tipo: {modalData.type}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
