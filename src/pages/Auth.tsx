import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import ConfirmEmailModal from "@/components/ConfirmEmailModal";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    city: "",
    phone: "",
    state: ""
  });
  const [signupError, setSignupError] = useState<string | null>(null);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) return;
    
    setIsLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setIsLoading(false);
    
    if (!error) {
      setShowConfirmModal(true);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    if (!signupForm.name || !signupForm.email || !signupForm.password) return;
    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError("As senhas não coincidem.");
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(
      signupForm.email,
      signupForm.password,
      signupForm.name,
      {
        address: signupForm.address,
        city: signupForm.city,
        phone: signupForm.phone,
        state: signupForm.state
      }
    );
    setIsLoading(false);
    if (error) {
      setSignupError(error.message || 'Erro ao cadastrar.');
      console.log('Erro no cadastro:', error);
    }
    if (!error) {
      setShowConfirmModal(true);
    }
  };

  // Fecha o modal automaticamente quando o usuário autenticar (ou seja, confirmou o e-mail e fez login)
  useEffect(() => {
    if (user && showConfirmModal) {
      setShowConfirmModal(false);
    }
  }, [user, showConfirmModal]);

  return (
    <>
      <ConfirmEmailModal
        open={showConfirmModal}
        email={signupForm.email}
        onClose={() => {}}
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">

        
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <span className="text-sm font-bold text-primary-foreground">S</span>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                SustenTech
              </span>
            </div>
            <p className="text-muted-foreground">Entre na plataforma sustentável</p>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Acesse sua conta</CardTitle>
              <CardDescription className="text-center">
                Faça login ou crie uma conta para continuar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Cadastro</TabsTrigger>
                </TabsList>
              
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-primary-glow" 
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>
              
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={signupForm.name}
                        onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirmar senha</Label>
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="Repita a senha"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-address">Endereço</Label>
                      <Input
                        id="signup-address"
                        type="text"
                        placeholder="Endereço completo"
                        value={signupForm.address}
                        onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-city">Cidade</Label>
                      <Input
                        id="signup-city"
                        type="text"
                        placeholder="Cidade"
                        value={signupForm.city}
                        onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-state">Estado</Label>
                      <Input
                        id="signup-state"
                        type="text"
                        placeholder="Estado"
                        value={signupForm.state}
                        onChange={(e) => setSignupForm({ ...signupForm, state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Telefone</Label>
                      <Input
                        id="signup-phone"
                        type="text"
                        placeholder="Telefone"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                      />
                    </div>
                    {signupError && (
                      <div className="text-red-500 text-sm text-center">{signupError}</div>
                    )}
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary to-primary-glow"
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Auth;