-- Create enum types
CREATE TYPE public.item_condition AS ENUM ('novo', 'como_novo', 'bom', 'regular', 'precisa_reparo');
CREATE TYPE public.item_type AS ENUM ('doacao', 'venda');
CREATE TYPE public.service_availability AS ENUM ('disponivel', 'ocupado', 'offline');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  type TEXT CHECK (type IN ('item', 'service')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create items table
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  condition public.item_condition NOT NULL,
  type public.item_type NOT NULL,
  image_urls TEXT[],
  location TEXT,
  city TEXT,
  state TEXT,
  is_active BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price_per_hour DECIMAL(10,2),
  availability public.service_availability DEFAULT 'disponivel',
  location TEXT,
  city TEXT,
  state TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for categories
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories FOR SELECT USING (true);

-- Create RLS policies for items
CREATE POLICY "Items are viewable by everyone" 
ON public.items FOR SELECT USING (true);

CREATE POLICY "Users can create their own items" 
ON public.items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" 
ON public.items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" 
ON public.items FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for services
CREATE POLICY "Services are viewable by everyone" 
ON public.services FOR SELECT USING (true);

CREATE POLICY "Users can create their own services" 
ON public.services FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own services" 
ON public.services FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own services" 
ON public.services FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for reviews
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" 
ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" 
ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial categories
INSERT INTO public.categories (name, icon, type) VALUES
-- Item categories
('Eletrônicos', '📱', 'item'),
('Roupas', '👕', 'item'),
('Móveis', '🪑', 'item'),
('Livros', '📚', 'item'),
('Utensílios', '🍴', 'item'),
('Decoração', '🖼️', 'item'),
-- Service categories
('Costura', '🧵', 'service'),
('Eletrônica', '🔧', 'service'),
('Marcenaria', '🔨', 'service'),
('Sapataria', '👞', 'service'),
('Limpeza', '🧽', 'service'),
('Jardinagem', '🌱', 'service');