import { useState, useEffect, useRef } from "react";
import { Send, X, User, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read: boolean;
  conversation_id: string;
}

interface Profile {
  id: string;
  user_id: string;
  name?: string;
  avatar_url?: string;
}

interface Conversation {
  id: string;
  participant1: string;
  participant2: string;
  last_message_id?: string;
}

interface FormattedConversation {
  id: string;
  participant: Profile;
  last_message?: Message;
  unread_count: number;
}

interface MessagesProps {
  isOpen: boolean;
  onClose: () => void;
  initialSellerId?: string;
  initialItem?: any;
}

export const Messages = ({ isOpen, onClose, initialSellerId, initialItem }: MessagesProps) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<FormattedConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Buscar perfil de um usuário
  const fetchProfile = async (userId: string): Promise<Profile> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, avatar_url')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        return { id: userId, user_id: userId, name: 'Usuário' };
      }
      
      return data || { id: userId, user_id: userId, name: 'Usuário' };
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return { id: userId, user_id: userId, name: 'Usuário' };
    }
  };

  // Criar uma nova conversa
  const createConversation = async (sellerId: string) => {
    if (!currentUser) return null;
    
    try {
      // Verificar se já existe uma conversa entre os usuários
      const { data: existingConversations, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1.eq.${currentUser.id},participant2.eq.${sellerId}),and(participant1.eq.${sellerId},participant2.eq.${currentUser.id})`);
      
      if (checkError) throw checkError;
      
      if (existingConversations && existingConversations.length > 0) {
        return existingConversations[0].id;
      }
      
      // Criar nova conversa
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant1: currentUser.id,
          participant2: sellerId
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      return newConversation.id;
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a conversa",
        variant: "destructive"
      });
      return null;
    }
  };

  // Buscar conversas do usuário
  const fetchConversations = async () => {
    if (!currentUser?.id) return;
    
    try {
      setIsLoading(true);
      
      // Buscar conversas onde o usuário atual é participante
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, participant1, participant2, last_message_id')
        .or(`participant1.eq.${currentUser.id},participant2.eq.${currentUser.id}`);

      if (conversationsError) throw conversationsError;
      
      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Formatar as conversas
      const formattedConversations: FormattedConversation[] = await Promise.all(
        conversationsData.map(async (conv: Conversation) => {
          // Identificar o outro participante
          const otherParticipantId = conv.participant1 === currentUser.id ? conv.participant2 : conv.participant1;
          
          // Buscar perfil do outro participante
          const participant = await fetchProfile(otherParticipantId);
          
          // Buscar última mensagem
          let lastMessage = null;
          if (conv.last_message_id) {
            const { data: messageData } = await supabase
              .from('messages')
              .select('*')
              .eq('id', conv.last_message_id)
              .single();
            lastMessage = messageData;
          }
          
          // Contar mensagens não lidas
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('conversation_id', conv.id)
            .eq('receiver_id', currentUser.id)
            .eq('read', false);
          
          return {
            id: conv.id,
            participant,
            last_message: lastMessage,
            unread_count: unreadCount || 0
          };
        })
      );
      
      setConversations(formattedConversations);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conversas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar mensagens de uma conversa
  const fetchMessages = async (conversationId: string) => {
    try {
      setIsLoading(true);
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      setMessages(messagesData || []);
      setActiveConversation(conversationId);
      
      // Marcar mensagens como lidas
      if (currentUser) {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', conversationId)
          .eq('receiver_id', currentUser.id)
          .eq('read', false);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar mensagem
  const sendMessage = async (content?: string) => {
    const messageContent = content || newMessage.trim();
    if (!messageContent || !activeConversation || !currentUser) return;
    
    try {
      setIsSending(true);
      
      // Identificar o destinatário
      const conversation = conversations.find(c => c.id === activeConversation);
      if (!conversation) return;
      
      const receiverId = conversation.participant.user_id;
      
      // Inserir a mensagem
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          content: messageContent,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          conversation_id: activeConversation,
          read: false
        })
        .select()
        .single();
      
      if (messageError) throw messageError;
      
      // Atualizar a última mensagem da conversa
      await supabase
        .from('conversations')
        .update({ last_message_id: messageData.id })
        .eq('id', activeConversation);
      
      setNewMessage("");
      setMessages(prev => [...prev, messageData]);
      
      // Se era a mensagem inicial, marcar como enviada
      if (content) {
        setInitialMessageSent(true);
      }
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Iniciar conversa com um vendedor
  const startConversationWithSeller = async (sellerId: string, item: any) => {
    if (!currentUser) return;
    
    setCreatingConversation(true);
    try {
      const conversationId = await createConversation(sellerId);
      
      if (conversationId) {
        // Buscar conversas atualizadas
        await fetchConversations();
        
        // Selecionar a nova conversa
        setActiveConversation(conversationId);
        await fetchMessages(conversationId);
        
        // Enviar mensagem inicial sobre o item
        if (item && !initialMessageSent) {
          const initialMessage = `Olá! Tenho interesse no item "${item.title}" que você está vendendo por R$ ${item.price?.toFixed(2) || '0,00'}. Podemos conversar sobre isso?`;
          await sendMessage(initialMessage);
        }
      }
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
    } finally {
      setCreatingConversation(false);
    }
  };

  // Configurar real-time para novas mensagens
  useEffect(() => {
    if (!currentUser) return;
    
    const subscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${currentUser.id}`
      }, (payload) => {
        // Se a mensagem é da conversa ativa
        if (payload.new.conversation_id === activeConversation) {
          setMessages(prev => [...prev, payload.new as Message]);
        }
        
        // Atualizar a lista de conversas
        fetchConversations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser, activeConversation]);

  // Buscar conversas quando o componente abre
  useEffect(() => {
    if (isOpen && currentUser) {
      fetchConversations();
      
      // Se um sellerId foi fornecido, iniciar conversa com ele
      if (initialSellerId && initialItem) {
        startConversationWithSeller(initialSellerId, initialItem);
      }
    }
  }, [isOpen, currentUser]);

  // Rolagem automática para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Limpar estado quando fechar
  useEffect(() => {
    if (!isOpen) {
      setActiveConversation(null);
      setMessages([]);
      setNewMessage("");
      setInitialMessageSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-background border rounded-lg shadow-lg flex flex-col w-full max-w-4xl h-full max-h-[80vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Mensagens</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Lista de conversas */}
          <div className="w-1/3 border-r overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                Nenhuma conversa
              </p>
            ) : (
              conversations.map(conversation => (
                <div
                  key={conversation.id}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                    activeConversation === conversation.id ? "bg-muted" : ""
                  }`}
                  onClick={() => fetchMessages(conversation.id)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conversation.participant.avatar_url} />
                      <AvatarFallback>
                        {conversation.participant.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversation.participant.name || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.last_message?.content || "Nenhuma mensagem"}
                      </p>
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Área de mensagens */}
          <div className="w-2/3 flex flex-col">
            {activeConversation ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Nenhuma mensagem ainda. Envie uma mensagem para iniciar a conversa.
                    </p>
                  ) : (
                    messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === currentUser?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs p-3 rounded-lg ${
                            message.sender_id === currentUser?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite uma mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={isSending || creatingConversation}
                    />
                    <Button
                      size="icon"
                      onClick={() => sendMessage()}
                      disabled={!newMessage.trim() || isSending || creatingConversation}
                    >
                      {isSending || creatingConversation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  {creatingConversation ? "Iniciando conversa..." : "Selecione uma conversa para começar"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};