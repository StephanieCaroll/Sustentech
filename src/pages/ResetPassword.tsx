import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client"; 
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false); 
  const [isValidSession, setIsValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const hashIsPresent = window.location.hash.includes('access_token');

    const initialCheckAndListener = async () => {

      const { data: { session } } = await supabase.auth.getSession();
      
      if (active) {
        if (session) {
          setIsValidSession(true);
        }
       
        setIsInitialCheckDone(true);
      }
    };
   
    if (hashIsPresent) {
        setTimeout(() => {
            initialCheckAndListener();
        }, 300); 

    } else {
        initialCheckAndListener();
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (active) {
        
          if (event === "SIGNED_IN" && session) {
            setIsValidSession(true);
            setIsInitialCheckDone(true); 
          } else if (event === "SIGNED_OUT") {
            setIsValidSession(false);
            setIsInitialCheckDone(true);
          }
          
           if (event === "INITIAL_SESSION") {
             setIsValidSession(!!session);
             if (!!session || !hashIsPresent) {
                 setIsInitialCheckDone(true);
             }
          }
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []); 

  useEffect(() => {
    if (isValidSession && window.location.hash) {
      
      const timer = setTimeout(() => {
        if (window.location.hash) {
            
            window.history.replaceState(
                null,
                "",
                window.location.pathname
            );
        }
      }, 500); 

      return () => clearTimeout(timer);
    }
  }, [isValidSession]);
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
     
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
      
        throw error;
      }

      toast({
        title: "Senha alterada",
        description: "Sua senha foi redefinida com sucesso. Você será redirecionado em breve.",
      });

      setTimeout(() => {
        navigate("/auth");
      }, 2000);

    } catch (error: any) {
      let errorMessage = error.message || "Erro ao redefinir senha.";
      
      if (errorMessage.includes("Auth session missing") || errorMessage.includes("Invalid Refresh Token")) {
         errorMessage = "Sessão expirada ou inválida. Por favor, solicite um novo link de redefinição.";
         setIsValidSession(false); 
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialCheckDone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link inválido ou expirado</CardTitle>
            <CardDescription>
              O link de recuperação é inválido ou expirou. Solicite um novo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/forgot-password')} className="w-full">
              Solicitar novo link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/auth')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-2xl">Nova senha</CardTitle>
                <CardDescription>
                  Digite sua nova senha
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-7 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-7 h-7 w-7"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary-glow"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;