import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  MessageCircle, Users, Send, Search, Circle, Loader2, Badge as BadgeIcon, 
  Plus, X, Check, MoreVertical, Pencil, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { usePageHeader } from '@/contexts/PageContext';
import { useAuth } from '@/contexts/AuthContext';
import { chatService, employeeService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useParams, useNavigate } from 'react-router-dom';
import type { Conversation, ChatMessage } from '@/types/api.types';

export const Support: React.FC = () => {
  const { setPageHeader } = usePageHeader();
  const { user } = useAuth();
  const { toast } = useToast();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('internal');
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // === State для Групп ===
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Общие поля формы (используются и для создания, и для редактирования)
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [employeeNames, setEmployeeNames] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Список доступных ролей (Можно вынести в конфиг)
  const AVAILABLE_ROLES = ["Admin", "CEO", "Manager", "Teacher", "Student", "Accountant"];

  useEffect(() => { setPageHeader('Support & Messages', null); }, [setPageHeader]);

  // 1. Загрузка сотрудников
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeeService.listEmployees({ limit: 1000 });
        const list = Array.isArray(res) ? res : (res as any).data || [];
        setEmployeesList(list);

        const map = new Map<string, string>();
        list.forEach((e: any) => {
          const id = (e.id || e.employee_id)?.toString();
          const name = e.fullName || e.full_name || e.name || e.email || `User ${id}`;
          if (id) map.set(id, name);
          if (e.userId) map.set(e.userId.toString(), name);
        });
        setEmployeeNames(map);
      } catch (e) {
        console.warn('Failed to load employee names', e);
      }
    };
    fetchEmployees();
  }, [user]);

  // Хелперы
  const getChatName = (chat: Conversation) => {
    if (chat.type === 'group') return chat.name || 'Unnamed Group';
    const partnerId = chat.partnerId?.toString() || chat.participants?.find(p => p !== user?.id?.toString());
    if (partnerId && employeeNames.has(partnerId)) return employeeNames.get(partnerId);
    return chat.name || `User ${partnerId || 'Unknown'}`;
  };

  const getSenderName = (id: string, fallback?: string) => {
    if (id === user?.id?.toString()) return 'You';
    return employeeNames.get(id) || fallback || `User ${id}`;
  };

  const getInitials = (name?: string) => (name || '??').slice(0, 2).toUpperCase();

  // 2. Загрузка чатов
  const loadConversations = async () => {
    setLoadingChats(true);
    const section = activeTab === 'support' ? 'support' : undefined;
    const data = await chatService.listConversations({ section, search: searchTerm });
    setConversations(data.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()));
    setLoadingChats(false);
  };

  useEffect(() => { loadConversations(); }, [activeTab, searchTerm]);

  // 3. Выбор чата
  useEffect(() => {
    if (!conversationId) {
      setSelectedChat(null);
      return;
    }
    const initChat = async () => {
      const existing = conversations.find(c => c.id === conversationId);
      if (existing) setSelectedChat(existing);
      
      setLoadingMessages(true);
      const history = await chatService.getConversationHistory(conversationId);
      setMessages(history.data);
      setLoadingMessages(false);

      if (existing && (existing.unreadCount || 0) > 0) {
        chatService.markRead(conversationId);
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
      }
      
      if (chatService.isConnected()) chatService.joinConversation(conversationId);
    };

    if (!loadingChats) initChat();
  }, [conversationId, conversations.length, loadingChats]);

  // 4. WebSocket
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !user) return;
    chatService.connectWebSocket(token);
    
    const unsub = chatService.onMessage((wsMsg) => {
      if (wsMsg.type === 'message') {
        const msg = chatService.normalizeMessage(wsMsg);
        setConversations(prev => {
          const updated = prev.map(c => {
            if (c.id?.toString() === msg.conversationId?.toString()) {
              const isMe = msg.senderId === user.id?.toString();
              const isOpen = conversationId === c.id;
              return {
                ...c,
                lastMessage: msg.message,
                lastMessageAt: msg.timestamp,
                unreadCount: (!isMe && !isOpen) ? (c.unreadCount || 0) + 1 : 0
              };
            }
            return c;
          });
          return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        });

        if (conversationId && conversationId.toString() === msg.conversationId?.toString()) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev.map(m => m.id === msg.id ? {...msg, isOptimistic:false} : m);
            return [...prev, msg].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          });
          if (msg.senderId !== user.id?.toString()) chatService.markRead(conversationId);
        }
      } else if (wsMsg.type === 'new_conversation') {
        loadConversations();
      }
    });
    return () => unsub();
  }, [user, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 5. Отправка
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    const clientSideId = uuidv4();
    const text = messageInput.trim();
    
    const optimisticMsg: ChatMessage = {
      id: clientSideId,
      conversationId: selectedChat.id,
      senderId: user?.id?.toString() || '',
      senderName: 'You',
      message: text,
      timestamp: new Date().toISOString(),
      read: false,
      isOptimistic: true
    };

    setMessageInput('');
    setMessages(prev => [...prev, optimisticMsg]);
    setIsSending(true);

    try {
      await chatService.sendMessage({
        id: clientSideId,
        conversation_id: selectedChat.id,
        content: text,
        type: activeTab as any
      });
      setMessages(prev => prev.map(m => m.id === clientSideId ? { ...m, isOptimistic: false } : m));
      setConversations(prev => prev.map(c => c.id === selectedChat.id ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() } : c));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
      setMessages(prev => prev.filter(m => m.id !== clientSideId));
      setMessageInput(text);
    } finally {
      setIsSending(false);
    }
  };

  // === ЛОГИКА ГРУПП ===

  // Сброс формы
  const resetForm = () => {
    setGroupName('');
    setSelectedMembers([]);
    setSelectedRoles([]);
  };

  // Открытие модалки создания
  const openCreateModal = () => {
    resetForm();
    setIsGroupModalOpen(true);
  };

  // Открытие модалки редактирования
  const openEditModal = (chat: Conversation) => {
    setGroupName(chat.name || '');
    setSelectedMembers(chat.participants || []);
    // allowedRoles могут не быть в типе если не обновили types.ts, поэтому as any
    setSelectedRoles((chat as any).allowedRoles || []);
    setIsEditModalOpen(true);
  };

  // Создание
  const handleCreateGroup = async () => {
    if (!groupName || selectedMembers.length === 0) return;
    try {
      await chatService.createGroup(groupName, selectedMembers, selectedRoles);
      toast({ title: "Success", description: "Group created" });
      setIsGroupModalOpen(false);
      loadConversations();
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  // Редактирование
  const handleUpdateGroup = async () => {
    if (!selectedChat) return;
    try {
      await chatService.updateGroup(selectedChat.id, groupName, selectedMembers, selectedRoles);
      toast({ title: "Updated", description: "Group updated successfully" });
      setIsEditModalOpen(false);
      loadConversations();
      // Обновляем текущий чат в стейте
      setSelectedChat(prev => prev ? ({...prev, name: groupName, participants: selectedMembers, allowedRoles: selectedRoles} as any) : null);
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  // Фильтр сотрудников для отображения в модалке (по ролям)
  const filteredEmployees = useMemo(() => {
    if (selectedRoles.length === 0) return employeesList;
    // Предполагаем, что у employee есть поле role. Если нет - показываем всех.
    return employeesList.filter(emp => !emp.role || selectedRoles.includes(emp.role));
  }, [employeesList, selectedRoles]);


  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      {/* Cards */}
      <div className="grid grid-cols-4 gap-4 h-24 shrink-0">
        <StatsCard icon={MessageCircle} color="text-blue-500" bg="bg-blue-500/10" label="Total" value={conversations.length} />
        <StatsCard icon={Users} color="text-primary" bg="bg-primary/10" label="Groups" value={conversations.filter(c => c.type === 'group').length} />
        <StatsCard icon={Circle} color="text-yellow-500" bg="bg-yellow-500/10" label="Support" value={conversations.filter(c => c.type === 'support').length} />
        <StatsCard icon={BadgeIcon} color="text-red-500" bg="bg-red-500/10" label="Unread" value={conversations.reduce((s, c) => s + (c.unreadCount || 0), 0)} />
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border-0 shadow-md">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); navigate('/support'); }} className="h-full flex flex-col">
          <div className="border-b px-4 py-2 bg-background flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="internal">Chats</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
            </TabsList>
            
            {(user?.role === 'CEO' || user?.role === 'Admin') && (
              <Button size="sm" variant="outline" onClick={openCreateModal} className="gap-2">
                <Plus className="h-4 w-4" /> New Group
              </Button>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r flex flex-col bg-muted/10">
              <div className="p-3 border-b relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-9 bg-background" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <ScrollArea className="flex-1">
                {loadingChats ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : conversations.map(chat => {
                  const isActive = selectedChat?.id === chat.id;
                  const name = getChatName(chat);
                  return (
                    <div key={chat.id} onClick={() => { setSelectedChat(chat); navigate(`/support/${chat.id}`); }}
                      className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${isActive ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{chat.type === 'group' ? <Users className="h-4 w-4"/> : getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-baseline">
                            <span className="font-medium truncate text-sm">{name}</span>
                            {chat.lastMessageAt && <span className="text-[10px] text-muted-foreground">{new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground truncate w-40 block">{chat.lastMessage || 'No messages'}</span>
                            {(chat.unreadCount || 0) > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{chat.unreadCount}</Badge>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
              {selectedChat ? (
                <>
                  <div className="p-3 border-b flex items-center justify-between shadow-sm bg-background/95 backdrop-blur z-10">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{selectedChat.type === 'group' ? <Users className="h-4 w-4"/> : getInitials(getChatName(selectedChat))}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-sm">{getChatName(selectedChat)}</h3>
                        <p className="text-[10px] text-muted-foreground capitalize">{selectedChat.type}</p>
                      </div>
                    </div>

                    {/* Кнопка Редактирования (Только для админов и групп) */}
                    {selectedChat.type === 'group' && (user?.role === 'CEO' || user?.role === 'Admin') && (
                       <Button variant="ghost" size="icon" onClick={() => openEditModal(selectedChat)}>
                         <Pencil className="h-4 w-4 text-muted-foreground" />
                       </Button>
                    )}
                  </div>

                  <ScrollArea className="flex-1 p-4 bg-slate-50/50 dark:bg-black/20">
                    {/* ... Сообщения (код стандартный) ... */}
                     <div className="flex flex-col gap-3">
                        {messages.map((msg, i) => {
                          const isMe = msg.senderId === user?.id?.toString();
                          return (
                            <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2 text-sm rounded-2xl max-w-[75%] shadow-sm ${
                                  isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-white dark:bg-card border rounded-tl-sm'
                                } ${msg.isOptimistic ? 'opacity-70' : ''}`}>
                                  {msg.message}
                                </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                  </ScrollArea>

                  <div className="p-4 border-t bg-background">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input value={messageInput} onChange={e => setMessageInput(e.target.value)} placeholder="Type a message..." disabled={isSending} />
                      <Button type="submit" size="icon" disabled={!messageInput.trim() || isSending}>
                        {isSending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col">
                  <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
                  <p>Select a conversation</p>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </Card>

      {/* --- МОДАЛКА СОЗДАНИЯ ГРУППЫ --- */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>Create a group and limit access by roles.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="Group Name" value={groupName} onChange={e => setGroupName(e.target.value)} />
            
            <div className="space-y-2">
                <label className="text-xs font-medium">Allowed Roles (Access Control)</label>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ROLES.map(role => (
                        <Badge key={role} variant={selectedRoles.includes(role) ? "default" : "outline"} 
                               className="cursor-pointer hover:bg-primary/80" onClick={() => toggleRole(role)}>
                            {role}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="border rounded-md h-60 overflow-y-auto p-2">
              <p className="text-xs text-muted-foreground mb-2 px-2">Select Members:</p>
              {filteredEmployees.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer" onClick={() => toggleMember(emp.id.toString())}>
                  <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedMembers.includes(emp.id.toString()) ? 'bg-primary border-primary' : 'border-input'}`}>
                    {selectedMembers.includes(emp.id.toString()) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex flex-col">
                      <span className="text-sm font-medium">{emp.fullName || emp.email}</span>
                      <span className="text-[10px] text-muted-foreground">{emp.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateGroup} disabled={!groupName || selectedMembers.length === 0}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- МОДАЛКА РЕДАКТИРОВАНИЯ --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group name, members and access roles.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="Group Name" value={groupName} onChange={e => setGroupName(e.target.value)} />
            
            <div className="space-y-2">
                <label className="text-xs font-medium">Allowed Roles</label>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ROLES.map(role => (
                        <Badge key={role} variant={selectedRoles.includes(role) ? "default" : "outline"} 
                               className="cursor-pointer hover:bg-primary/80" onClick={() => toggleRole(role)}>
                            {role}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="border rounded-md h-60 overflow-y-auto p-2">
               <p className="text-xs text-muted-foreground mb-2 px-2">Members:</p>
               {filteredEmployees.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer" onClick={() => toggleMember(emp.id.toString())}>
                   <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedMembers.includes(emp.id.toString()) ? 'bg-primary border-primary' : 'border-input'}`}>
                    {selectedMembers.includes(emp.id.toString()) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex flex-col">
                      <span className="text-sm font-medium">{emp.fullName || emp.email}</span>
                      <span className="text-[10px] text-muted-foreground">{emp.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateGroup}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatsCard = ({ icon: Icon, color, bg, label, value }: any) => (
  <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-4 h-full"><div className={`p-3 rounded-xl ${bg}`}><Icon className={`w-6 h-6 ${color}`} /></div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>
);