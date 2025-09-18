import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Item {
  id: string;
  title: string;
  description?: string;
  price?: number;
  condition: string;
  type: string;
  image_urls?: string[];
  location?: string;
  city?: string;
  state?: string;
  category_id: string;
  user_id: string;
  is_active?: boolean;
  views?: number;
  created_at: string;
  profiles?: {
    name: string;
    avatar_url?: string;
    rating?: number;
  } | null;
  categories?: {
    name: string;
    icon?: string;
  } | null;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price_per_hour?: number;
  availability: string;
  location?: string;
  city?: string;
  state?: string;
  category_id: string;
  user_id: string;
  is_active?: boolean;
  created_at: string;
  profiles?: {
    name: string;
    avatar_url?: string;
    rating?: number;
    total_reviews?: number;
    is_verified?: boolean;
  } | null;
  categories?: {
    name: string;
    icon?: string;
  } | null;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  type: string;
}

export const useSupabaseData = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchItems = async (searchTerm?: string, categoryId?: string) => {
    let query = supabase
      .from('items')
      .select(`
        *,
        categories(name, icon)
      `)
      .eq('is_active', true);

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`);
    }

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar itens:', error);
      return [];
    }

    // Buscar informações de perfis separadamente se necessário
    if (data && data.length > 0) {
      const userIds = data.map(item => item.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url, rating')
          .in('user_id', userIds);

        // Combinar dados manualmente
        return data.map(item => ({
          ...item,
          profiles: profilesData?.find(profile => profile.user_id === item.user_id) || null
        }));
      }
    }

    return data || [];
  };

  const fetchServices = async (searchTerm?: string, categoryId?: string) => {
    let query = supabase
      .from('services')
      .select(`
        *,
        categories(name, icon)
      `) 
      .eq('is_active', true);

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar serviços:', error);
      return [];
    }

    // Buscar informações de perfis separadamente se necessário
    if (data && data.length > 0) {
      const userIds = data.map(service => service.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url, rating, total_reviews, is_verified')
          .in('user_id', userIds);

        // Combinar dados manualmente
        return data.map(service => ({
          ...service,
          profiles: profilesData?.find(profile => profile.user_id === service.user_id) || null
        }));
      }
    }

    return data || [];
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }

    return data || [];
  };

  const loadData = async (searchTerm?: string, categoryId?: string) => {
    setLoading(true);
    try {
      const [itemsData, servicesData, categoriesData] = await Promise.all([
        fetchItems(searchTerm, categoryId),
        fetchServices(searchTerm, categoryId),
        fetchCategories()
      ]);

      setItems(itemsData as unknown as Item[]);
      setServices(servicesData as unknown as Service[]);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchData = async (searchTerm: string, type: 'items' | 'services', categoryId?: string) => {
    if (type === 'items') {
      const data = await fetchItems(searchTerm, categoryId);
      setItems(data as unknown as Item[]);
    } else {
      const data = await fetchServices(searchTerm, categoryId);
      setServices(data as unknown as Service[]);
    }
  };

  const filterByCategory = async (categoryId: string, type: 'items' | 'services', searchTerm?: string) => {
    if (type === 'items') {
      const data = await fetchItems(searchTerm, categoryId);
      setItems(data as unknown as Item[]);
    } else {
      const data = await fetchServices(searchTerm, categoryId);
      setServices(data as unknown as Service[]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    items,
    services,
    categories,
    loading,
    searchData,
    filterByCategory,
    refreshData: loadData
  };
};