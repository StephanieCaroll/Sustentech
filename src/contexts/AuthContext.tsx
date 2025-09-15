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
      // Após login, verifica/cria perfil se não existir
      try {
        const user = data.user;
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', user.id)
            .single();
          if (!profile) {
            const meta = user.user_metadata || {};
            const profileData = {
              user_id: user.id,
              name: meta.name || '',
              address: meta.address || '',
              avatar_url: meta.avatar_url || '',
              city: meta.city || '',
              phone: meta.phone || '',
              state: meta.state || ''
            };
            const { error: insertError } = await supabase.from('profiles').insert(profileData);
            if (insertError) {
              console.log('Erro ao criar perfil após login:', insertError);
            }
          }
        }
      } catch (e) {
        console.log('Erro ao verificar/criar perfil após login:', e);
      }
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
      } else if (!user) {
        // Usuário precisa confirmar o e-mail antes de autenticar
        console.log('Usuário precisa confirmar o e-mail antes de criar perfil.');
      }
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
        description: "Sua conta foi criada com sucesso!",
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