import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, Recycle, Sprout, ArrowRight, Users, Shield, Zap, Heart, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const HomePage = () => {
  const navigate = useNavigate();
  const [activeService, setActiveService] = useState(0);
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const servicesSectionRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Comunidade Ativa",
      description: "Conecte-se com pessoas que compartilham seus valores sustentáveis"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Transparência Total",
      description: "Saiba exatamente a origem e impacto de cada produto"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Tecnologia Verde",
      description: "Plataforma otimizada para mínimo consumo energético"
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Impacto Real",
      description: "Acompanhe sua contribuição para um mundo mais sustentável"
    }
  ];

  const stats = [
    { value: "12.5k+", label: "Membros Ativos" },
    { value: "8.2k+", label: "Itens Doados" },
    { value: "456+", label: "Reparos Realizados" },
    { value: "2.1t", label: "CO₂ Economizado" }
  ];

  // Função para randomizar array
  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Carregar itens em destaque do Supabase com randomização
  const fetchFeaturedItems = async () => {
    try {
      setLoadingItems(true);
      
      // Busca mais itens para ter uma boa base para randomização
      const { data: items, error } = await supabase
        .from("items")
        .select("*")
        .order('created_at', { ascending: false })
        .limit(12); // Busca 12 itens para randomizar entre eles

      if (error) {
        console.error("Erro ao carregar itens:", error);
        setFeaturedItems([]);
        return;
      }

      // Randomiza os itens e pega apenas 4
      const shuffledItems = shuffleArray(items || []);
      const selectedItems = shuffledItems.slice(0, 4);
      
      console.log("Itens carregados e randomizados:", selectedItems);
      setFeaturedItems(selectedItems);
      
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
      setFeaturedItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Carregar serviços em destaque do Supabase com randomização
  const fetchFeaturedServices = async () => {
    try {
      setLoadingServices(true);
      
      // Busca mais serviços para ter uma boa base para randomização
      const { data: services, error } = await supabase
        .from("services")
        .select("*")
        .order('created_at', { ascending: false })
        .limit(12); // Busca 9 serviços para randomizar entre eles

      if (error) {
        console.error("Erro ao carregar serviços:", error);
        setFeaturedServices([]);
        return;
      }

      // Randomiza os serviços e pega apenas 3
      const shuffledServices = shuffleArray(services || []);
      const selectedServices = shuffledServices.slice(0, 3);
      
      console.log("Serviços carregados e randomizados:", selectedServices);
      setFeaturedServices(selectedServices);
      
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      setFeaturedServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchFeaturedItems();
    fetchFeaturedServices();
  }, []);

  useEffect(() => {
    if (featuredServices.length > 0) {
      const interval = setInterval(() => {
        setActiveService((prev) => (prev + 1) % featuredServices.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [featuredServices.length]);

  const handleLoginClick = () => {
    navigate("/auth");
  };

  const scrollToServices = () => {
    servicesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return "Gratuito";
    return `R$ ${price.toFixed(2)}`;
  };

  const formatPricePerHour = (price: number) => {
    if (!price || price === 0) return "A combinar";
    return `R$ ${price.toFixed(2)}/hora`;
  };

  const getItemImage = (item: any) => {
    if (item.image_urls && item.image_urls.length > 0 && Array.isArray(item.image_urls)) {
      return item.image_urls[0];
    }
    return "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400";
  };

  const getServiceIcon = (service: any, index: number) => {
   
    const serviceName = service.name?.toLowerCase() || '';
    
    if (serviceName.includes('jardin') || serviceName.includes('plant')) {
      return <Sprout className="w-8 h-8" />;
    } else if (serviceName.includes('repar') || serviceName.includes('manuten')) {
      return <Wrench className="w-8 h-8" />;
    } else if (serviceName.includes('reciclagem') || serviceName.includes('sustent')) {
      return <Recycle className="w-8 h-8" />;
    }
    
    const icons = [<Sprout className="w-8 h-8" />, <Recycle className="w-8 h-8" />, <Wrench className="w-8 h-8" />];
    return icons[index % icons.length];
  };

  const renderItemCards = () => {
    // Se não há itens ou está carregando, mostra os cards padrão
    if (featuredItems.length === 0 || loadingItems) {
      return [1, 2, 3, 4].map((item) => (
        <div 
          key={item}
          className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl p-6 text-center transition-all duration-500 hover:scale-105 hover:shadow-lg cursor-pointer"
          onClick={handleLoginClick}
        >
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-green-800">Item {item}</h3>
          <p className="text-sm text-green-600 mt-1">Em breve</p>
        </div>
      ));
    }

    // Se há itens, mostra os itens reais 
    return featuredItems.map((item) => (
      <div 
        key={item.id}
        className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl p-4 text-center transition-all duration-500 hover:scale-105 hover:shadow-lg cursor-pointer"
        onClick={handleLoginClick}
      >
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden">
          <img 
            src={getItemImage(item)} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="font-semibold text-green-800 text-sm mb-1 line-clamp-1">
          {item.title}
        </h3>
        <p className="text-sm text-green-600 font-medium">
          {formatPrice(item.price)}
        </p>
        <p className="text-xs text-green-500 mt-1">
          {item.city || "Localização"}
        </p>
      </div>
    ));
  };

  const renderServiceCards = () => {
    // Se não há serviços ou está carregando, mostra os cards padrão
    if (featuredServices.length === 0 || loadingServices) {
      return [
        {
          id: 1,
          name: "Serviço Básico",
          price: "R$ 255,00",
          description: "Manutenção preventiva e reparos simples",
          features: ["Diagnóstico completo", "Limpeza básica", "Ajustes essenciais"],
          icon: <Sprout className="w-8 h-8" />
        },
        {
          id: 2,
          name: "Serviço Intermediário",
          price: "R$ 385,00",
          description: "Reparos especializados e otimizações",
          features: ["Todos os itens do básico", "Substituição de peças", "Otimização energética"],
          icon: <Recycle className="w-8 h-8" />
        },
        {
          id: 3,
          name: "Serviço Avançado",
          price: "R$ 515,00",
          description: "Solução completa e personalizada",
          features: ["Todos os itens do intermediário", "Consultoria especializada", "Suporte prioritário"],
          icon: <Leaf className="w-8 h-8" />
        }
      ].map((service, index) => (
        <div
          key={service.id}
          className={`relative bg-white rounded-3xl p-8 border-2 transition-all duration-500 transform ${
            activeService === index 
              ? 'scale-105 border-green-500 shadow-2xl z-10' 
              : 'scale-95 border-green-200 shadow-lg opacity-80'
          } hover:scale-105 hover:shadow-xl cursor-pointer`}
          onMouseEnter={() => setActiveService(index)}
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
              {service.icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {service.name}
            </h3>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {service.price}
            </div>
            <p className="text-gray-600">
              {service.description}
            </p>
          </div>

          <ul className="space-y-3 mb-8">
            {service.features.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-center text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                {feature}
              </li>
            ))}
          </ul>

          <Button 
            onClick={handleLoginClick}
            className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeService === index
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {activeService === index ? 'Começar Agora' : 'Saiba Mais'}
          </Button>

          {activeService === index && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </div>
      ));
    }

    return featuredServices.map((service, index) => (
      <div
        key={service.id}
        className={`relative bg-white rounded-3xl p-8 border-2 transition-all duration-500 transform ${
          activeService === index 
            ? 'scale-105 border-green-500 shadow-2xl z-10' 
            : 'scale-95 border-green-200 shadow-lg opacity-80'
        } hover:scale-105 hover:shadow-xl cursor-pointer`}
        onMouseEnter={() => setActiveService(index)}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
            {getServiceIcon(service, index)}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {service.name}
          </h3>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {formatPricePerHour(service.price_per_hour)}
          </div>
          <p className="text-gray-600">
            {service.description || "Serviço de qualidade e sustentável"}
          </p>
        </div>

        <ul className="space-y-3 mb-8">
          <li className="flex items-center text-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            Serviço sustentável
          </li>
          <li className="flex items-center text-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            {service.city || "Localização disponível"}
          </li>
          <li className="flex items-center text-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            Profissional qualificado
          </li>
        </ul>

        <Button 
          onClick={handleLoginClick}
          className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
            activeService === index
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {activeService === index ? 'Contratar Agora' : 'Saiba Mais'}
        </Button>

        {activeService === index && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-green-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-xl">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                SustenTech
              </span>
            </div>

            {/* Login Button */}
            <Button 
              onClick={handleLoginClick}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Entrar
            </Button>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
           
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Conectando você a um futuro{" "}
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    sustentável
                  </span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Junte-se à nossa comunidade e descubra uma nova forma de consumir, 
                  reparar e compartilhar. Juntos, fazemos a diferença para o planeta.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleLoginClick}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Começar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  onClick={scrollToServices}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300"
                >
                  Conhecer Serviços
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10 bg-white rounded-3xl p-8 shadow-2xl border border-green-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  Itens em Destaque
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {renderItemCards()}
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-200 rounded-full opacity-50"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-200 rounded-full opacity-50"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Por que escolher a SustenTech?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nossa plataforma combina tecnologia de ponta com compromisso ambiental 
              para oferecer a melhor experiência sustentável.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4 text-white">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section ref={servicesSectionRef} className="py-20 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Nossos Serviços
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {featuredServices.length > 0 
                ? "Serviços sustentáveis disponíveis na comunidade" 
                : "Oferecemos soluções completas para suas necessidades de sustentabilidade"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {renderServiceCards()}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-emerald-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Pronto para fazer a diferença?
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já estão transformando seu consumo 
            e contribuindo para um planeta mais verde.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleLoginClick}
              className="bg-white text-green-600 hover:bg-green-50 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Criar Minha Conta
            </Button>
            <Button 
              variant="outline"
              className="bg-white text-green-600 hover:bg-green-50 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Saber Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-xl">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold">SustenTech</span>
            </div>
            <div className="text-gray-400">
              &copy; 2025 SustenTech. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;