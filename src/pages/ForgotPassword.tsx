import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

const handleResetPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email) return;

  setIsLoading(true);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      
      redirectTo: "https://sustentech-azure.vercel.app/reset-password",
    });

    if (error) {
      throw error;
    }

    setIsSent(true);
    toast({
      title: "Email enviado",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
  } catch (error: any) {
    toast({
      title: "Erro",
      description: error.message || "Erro ao enviar email de recuperação.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

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
                <CardTitle className="text-2xl">Recuperar senha</CardTitle>
                <CardDescription>
                  {isSent 
                    ? "Verifique seu email para continuar" 
                    : "Digite seu email para receber o link de recuperação"
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isSent ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-primary-glow" 
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link de recuperação
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-green-600">
                  <p>Email enviado com sucesso!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Verifique sua caixa de entrada e spam.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full"
                >
                  Voltar para login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;