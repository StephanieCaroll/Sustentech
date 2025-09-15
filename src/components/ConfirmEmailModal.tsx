import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmEmailModalProps {
  open: boolean;
  email: string;
  onClose: () => void;
}

export default function ConfirmEmailModal({ open, email, onClose }: ConfirmEmailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirme seu e-mail</DialogTitle>
          <DialogDescription>
            Enviamos um link de confirmação para <b>{email}</b>.<br />
            Por favor, acesse seu e-mail e clique no link para ativar sua conta.<br />
            Após confirmar, volte para o site e faça login normalmente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <Button asChild variant="outline">
            <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer">
              Ir para o Gmail
            </a>
          </Button>
          <Button onClick={onClose} variant="default">
            Já confirmei, acessar o site
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
