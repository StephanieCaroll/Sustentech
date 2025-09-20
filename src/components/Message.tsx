import { useState, useEffect, useRef } from "react";
import { Send, X, User, Loader2, ImageIcon, ArrowLeft, MessageCircle } from "lucide-react";
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
  image_url?: string;
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
  created_at: string;
}

interface FormattedConversation {
  id: string;
  participant: Profile;
  last_message?: Message;
  unread_count: number;
  last_activity: string;
}

interface MessagesProps {
  isOpen: boolean;
  onClose: () => void;
  initialSellerId?: string;
  initialItem?: any;
}

interface OnlineStatus {
  [userId: string]: boolean;
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
  const [activeParticipant, setActiveParticipant] = useState<Profile | null>(null);
  const [showConversationList, setShowConversationList] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ensureUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) return true;

      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          name: 'Usuário',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (createError) {
        console.error('Erro ao criar perfil:', createError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar/criar perfil:', error);
      return false;
    }
  };

  const fetchProfile = async (userId: string): Promise<Profile> => {
    try {
      await ensureUserProfile(userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, avatar_url')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return { id: userId, user_id: userId, name: 'Usuário' };
      }
      
      return data || { id: userId, user_id: userId, name: 'Usuário' };
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return { id: userId, user_id: userId, name: 'Usuário' };
    }
  };

  const checkOnlineStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data: presenceData, error: presenceError } = await supabase
        .from('user_presence')
        .select('is_online, last_seen')
        .eq('user_id', userId)
        .maybeSingle();

      if (!presenceError && presenceData) {
        if (presenceData.is_online) {
          return true;
        }
        if (presenceData.last_seen) {
          const lastSeen = new Date(presenceData.last_seen);
          const now = new Date();
          const diffInMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
          return diffInMinutes < 2;
        }
      }

      const { data: lastActivity } = await supabase
        .from('messages')
        .select('created_at')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastActivity) {
        const lastActivityDate = new Date(lastActivity.created_at);
        const now = new Date();
        const diffInMinutes = (now.getTime() - lastActivityDate.getTime()) / (1000 * 60);
        return diffInMinutes < 5;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar status online:', error);
      return false;
    }
  };

  const fetchOnlineStatuses = async (userIds: string[]) => {
    const statuses: OnlineStatus = {};
    const promises = userIds.map(async (userId) => {
      if (userId !== currentUser?.id) {
        try {
          const isOnline = await checkOnlineStatus(userId);
          statuses[userId] = isOnline;
        } catch (error) {
          console.error(`Erro ao verificar status para usuário ${userId}:`, error);
          statuses[userId] = false;
        }
      }
    });
    
    await Promise.all(promises);
    setOnlineStatus(prev => ({ ...prev, ...statuses }));
  };

  const createConversation = async (sellerId: string) => {
    if (!currentUser) return null;
    
    try {
      const { data: existingConversations, error: checkError } = await supabase
        .from('conversations')
        .select('id, participant1, participant2')
        .or(`participant1.eq.${currentUser.id},participant2.eq.${currentUser.id}`);

      if (checkError) {
        console.error('Erro ao verificar conversas:', checkError);
        throw checkError;
      }
     
      const existingConversation = existingConversations?.find(conv => 
        (conv.participant1 === currentUser.id && conv.participant2 === sellerId) ||
        (conv.participant1 === sellerId && conv.participant2 === currentUser.id)
      );

      if (existingConversation) {
        return existingConversation.id;
      }
      
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant1: currentUser.id,
          participant2: sellerId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Erro ao criar conversa:', createError);
        throw createError;
      }
      
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

  const fetchConversations = async () => {
    if (!currentUser?.id) return;
    
    try {
      setIsLoading(true);
      
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, participant1, participant2, last_message_id, created_at')
        .or(`participant1.eq.${currentUser.id},participant2.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (conversationsError) throw conversationsError;
      
      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const formattedConversations: FormattedConversation[] = [];
      const userIdsToCheck: string[] = [];
      
      for (const conv of conversationsData) {
        try {
          const otherParticipantId = conv.participant1 === currentUser.id ? conv.participant2 : conv.participant1;
          const participant = await fetchProfile(otherParticipantId);
          userIdsToCheck.push(otherParticipantId);
          
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('conversation_id', conv.id)
            .eq('receiver_id', currentUser.id)
            .eq('read', false);
          
          formattedConversations.push({
            id: conv.id,
            participant,
            last_message: lastMessageData || null,
            unread_count: unreadCount || 0,
            last_activity: lastMessageData?.created_at || conv.created_at
          });
        } catch (error) {
          console.error('Erro ao formatar conversa:', error);
        }
      }
  
      formattedConversations.sort((a, b) => 
        new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );
      
      setConversations(formattedConversations);
      
      if (userIdsToCheck.length > 0) {
        fetchOnlineStatuses(userIdsToCheck);
      }
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
   
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setActiveParticipant(conversation.participant);
        
        if (conversation.participant.user_id !== currentUser?.id) {
          try {
            const isOnline = await checkOnlineStatus(conversation.participant.user_id);
            setOnlineStatus(prev => ({
              ...prev,
              [conversation.participant.user_id]: isOnline
            }));
          } catch (error) {
            console.error('Erro ao verificar status online:', error);
          }
        }
      }

      if (window.innerWidth < 768) {
        setShowConversationList(false);
      }
  
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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
   
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Erro ao listar buckets:', bucketsError);
        throw new Error('Não foi possível acessar o armazenamento');
      }
      
      const targetBucket = buckets?.find(bucket => 
        bucket.name === 'messages' || bucket.name === 'message-images'
      );
    
      const bucketName = targetBucket?.name || 'messages';
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw new Error('Falha no upload da imagem');
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a imagem. Verifique se o bucket 'messages' existe no Supabase Storage.",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const sendMessage = async (content?: string, imageUrl?: string) => {
    const messageContent = content || newMessage.trim();
    if ((!messageContent && !imageUrl) || !activeConversation || !currentUser) return;
    
    try {
      setIsSending(true);
      
      const conversation = conversations.find(c => c.id === activeConversation);
      if (!conversation) return;
      
      const receiverId = conversation.participant.user_id;
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          content: messageContent,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          conversation_id: activeConversation,
          read: false,
          created_at: new Date().toISOString(),
          image_url: imageUrl || null
        })
        .select()
        .single();
      
      if (messageError) {
        console.error('Erro ao enviar mensagem:', messageError);
        throw messageError;
      }
  
      await supabase
        .from('conversations')
        .update({ 
          last_message_id: messageData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeConversation);
      
      setNewMessage("");
      setMessages(prev => [...prev, messageData]);
      
      if (content) {
        setInitialMessageSent(true);
      }
 
      fetchConversations();
      
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || !currentUser) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem (JPEG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive"
      });
      return;
    }

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      await sendMessage("", imageUrl);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startConversationWithSeller = async (sellerId: string, item: any) => {
    if (!currentUser) return;
    
    setCreatingConversation(true);
    try {
      const conversationId = await createConversation(sellerId);
      
      if (conversationId) {
        await fetchConversations();
        setActiveConversation(conversationId);
        await fetchMessages(conversationId);
        
        if (item && !initialMessageSent) {
          const initialMessage = `Olá! Tenho interesse no item "${item.title}" que você está vendendo por R$ ${item.price?.toFixed(2) || '0,00'}. Podemos conversar sobre isso?`;
          await sendMessage(initialMessage);
        }
      }
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a conversa com o vendedor",
        variant: "destructive"
      });
    } finally {
      setCreatingConversation(false);
    }
  };

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
        if (payload.new.conversation_id === activeConversation) {
          setMessages(prev => [...prev, payload.new as Message]);
        }
        fetchConversations();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${currentUser.id}`
      }, (payload) => {
        if (payload.new.conversation_id === activeConversation) {
          setMessages(prev => [...prev, payload.new as Message]);
        }
        fetchConversations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser, activeConversation]);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchConversations();
      
      if (initialSellerId && initialItem) {
        startConversationWithSeller(initialSellerId, initialItem);
      }
    }
  }, [isOpen, currentUser, initialSellerId, initialItem]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      setActiveConversation(null);
      setMessages([]);
      setNewMessage("");
      setInitialMessageSent(false);
      setActiveParticipant(null);
      setShowConversationList(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const interval = setInterval(() => {
      const userIds = conversations.map(conv => conv.participant.user_id);
      if (userIds.length > 0) {
        fetchOnlineStatuses(userIds);
      }
    }, 30000); 

    return () => clearInterval(interval);
  }, [isOpen, conversations, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const updatePresence = async () => {
      try {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: currentUser.id,
            is_online: true,
            last_seen: new Date().toISOString()
          });
      } catch (error) {
        console.error('Erro ao atualizar presença:', error);
      }
    };

    updatePresence();

    const presenceInterval = setInterval(updatePresence, 60000);

    return () => {
      clearInterval(presenceInterval);
      if (currentUser) {
        supabase
          .from('user_presence')
          .upsert({
            user_id: currentUser.id,
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .then(({ error }) => {
            if (error) console.error('Erro ao marcar como offline:', error);
          });
      }
    };
  }, [currentUser, isOpen]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
  };

  const handleBackToConversations = () => {
    setShowConversationList(true);
    setActiveConversation(null);
    setActiveParticipant(null);
  };

  const getStatusText = (userId: string) => {
    if (userId === currentUser?.id) return "Você";
    
    const isOnline = onlineStatus[userId];
    if (isOnline === undefined) return "Verificando...";
    return isOnline ? "Online" : "Offline";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
   
      {uploadingImage && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Enviando imagem...</span>
          </div>
        </div>
      )}
      
      <div className="bg-background border rounded-lg shadow-lg flex flex-col w-full h-full md:max-w-4xl md:max-h-[90vh] md:h-auto">
      
        <div className="flex items-center justify-between p-4 border-b">
          {!showConversationList && activeParticipant ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBackToConversations} className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src={activeParticipant.avatar_url} />
                <AvatarFallback>
                  {activeParticipant.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{activeParticipant.name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">
                  {getStatusText(activeParticipant.user_id)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">Mensagens</h3>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {(showConversationList || window.innerWidth >= 768) && (
            <div className="w-full md:w-1/3 border-r overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Suas conversas aparecerão aqui
                  </p>
                </div>
              ) : (
                conversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      activeConversation === conversation.id ? "bg-muted" : ""
                    }`}
                    onClick={() => fetchMessages(conversation.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conversation.participant.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {conversation.participant.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">
                            {conversation.participant.name || 'Usuário'}
                          </p>
                          {conversation.last_message && (
                            <span className="text-xs text-muted-foreground">
                              {formatTime(conversation.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conversation.last_message?.image_url 
                            ? "📷 Imagem" 
                            : conversation.last_message?.content || "Nenhua mensagem ainda"
                          }
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getStatusText(conversation.participant.user_id)}
                        </p>
                      </div>
                      {conversation.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {(activeConversation || window.innerWidth >= 768) && (
            <div className="w-full md:w-2/3 flex flex-col">
              {activeConversation && activeParticipant ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-muted-foreground mt-2">
                          Envie uma mensagem para iniciar a conversa
                        </p>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const isOwn = message.sender_id === currentUser?.id;
                        const showAvatar = !isOwn && (
                          index === messages.length - 1 ||
                          messages[index + 1]?.sender_id !== message.sender_id
                        );

                        return (
                          <div
                            key={message.id}
                            className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            {!isOwn && showAvatar && (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={activeParticipant.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {activeParticipant.name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            {!isOwn && !showAvatar && (
                              <div className="w-6" />
                            )}
                            <div
                              className={`max-w-xs p-3 rounded-2xl ${
                                isOwn
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-background border rounded-bl-md"
                              }`}
                            >
                              {message.image_url && (
                                <div className="mb-2">
                                  <img 
                                    src={message.image_url} 
                                    alt="Imagem da mensagem" 
                                    className="rounded-md max-w-full h-auto max-h-48 object-cover"
                                  />
                                </div>
                              )}
                              {message.content && (
                                <p className="text-sm">{message.content}</p>
                              )}
                              <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t bg-background">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage || isSending || creatingConversation}
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <ImageIcon className="h-5 w-5" />
                        )}
                      </Button>
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
                        disabled={isSending || creatingConversation || uploadingImage}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        onClick={() => sendMessage()}
                        disabled={(!newMessage.trim() && !uploadingImage) || isSending || creatingConversation}
                        className="h-10 w-10"
                      >
                        {isSending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {creatingConversation ? "Iniciando conversa..." : "Selecione uma conversa para começar"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};