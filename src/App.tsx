// App.tsx - Ajuste das rotas
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AddItem from "./pages/AddItem";
import AddService from "./pages/AddService";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import NotFound from "./pages/NotFound";
import Favorites from "./pages/Favorites";
import BudgetPage from "./pages/BudgetPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ItemDetail from "./pages/ItemDetail";
import ServiceDetail from "./pages/ServiceDetail"; 
import PublicProfile from "./components/PublicProfile"; 
import MapPage from "./pages/MapPage";
import HomePage from "./pages/HomePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<Index />} />
            <Route path="/AddItem" element={<AddItem />} />
            <Route path="/AddService" element={<AddService />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/edit" element={<ProfileEdit />} /> 
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/mapa" element={<MapPage />} />
            <Route path="/servicos/:serviceId/orcamento" element={<BudgetPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/service/:id" element={<ServiceDetail />} />
            <Route path="/user/:userId" element={<PublicProfile />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;