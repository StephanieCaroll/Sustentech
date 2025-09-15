import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    extraData?: { address?: string; avatar_url?: string; city?: string; phone?: string; state?: string }
  ) => Promise<{ error: any, user?: User | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Configurar listener de mudanças de auth primeiro
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Depois verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.log('Erro no login:', error);
      toast({
        title: "Erro no login",
        description: error.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : "Erro ao fazer login. Tente novamente.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Login realizado",
        description: "Bem-vindo de volta!",
      });
    }
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    extraData?: { address?: string; avatar_url?: string; city?: string; phone?: string; state?: string }
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    let error = null;
    let user = null;
    
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            ...extraData
          }
        }
      });
      
      user = data.user ?? null;
      
      if (signUpError) {
        error = signUpError;
        console.log('Erro no cadastro:', signUpError);
      }
      
      // O trigger handle_new_user irá criar o perfil automaticamente
    } catch (e) {
      error = e;
      console.log('Erro inesperado no cadastro:', e);
    }
    
    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message === "User already registered"
          ? "Este email já está cadastrado"
          : "Erro ao criar conta. Tente novamente.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Conta criada",
        description: "Sua conta foi criada com sucesso! Verifique seu email para confirmar.",
      });
    }
    
    return { error, user };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};