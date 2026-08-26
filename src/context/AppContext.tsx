import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  User,
  PageChannel,
  Contact,
  Conversation,
  Message,
  Tag,
  QuickResponse,
  SLARule,
  AuditLog,
  AgentStatus,
  SentimentType,
  ChannelType,
  ConversationStatus,
  AppRoute,
  WaitingQuery,
  CustomerEmail,
  ConversationSummary,
  EmailOperationsSettings,
} from '../types';
import { authApi } from '../features/auth/authApi';
import { inboxApi } from '../features/inbox/inboxApi';
import { emailApi } from '../features/email/emailApi';
import { channelApi } from '../features/channels/channelApi';
import { whatsappApi, normalizeWhatsAppPhone, type WhatsAppIncomingMessage } from '../features/whatsapp/whatsappApi';
import type { Socket } from 'socket.io-client';

function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

function stableEmailConversationId(email: string, sourceEmailId: string): string {
  return `conv_email_${encodeURIComponent(normalizeEmailAddress(email))}_${encodeURIComponent(sourceEmailId)}`;
}

export type ActiveNavTab =
  | 'inbox'
  | 'assigned'
  | 'bookmarked'
  | 'team'
  | 'notifications'
  | 'reports'
  | 'admin'

export type AdminSubTab =
  | 'overview'
  | 'agents'
  | 'pages'
  | 'tags'
  | 'quick-responses'
  | 'sla'
  | 'audit-logs'
  | 'roles'
  | 'settings';

function createConversationSummary(conversation: Conversation, customerMessages: Message[], latestMessage?: Message): ConversationSummary {
  const allCustomerMessages = latestMessage?.senderType === 'contact' && !customerMessages.some((message) => message.id === latestMessage.id)
    ? [...customerMessages, latestMessage]
    : customerMessages;
  const latestCustomerMessage = [...allCustomerMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  const latestText = latestCustomerMessage?.content?.trim() || conversation.lastMessageText;
  const latestAt = latestCustomerMessage?.createdAt || conversation.lastMessageAt;
  return {
    text: `${conversation.contact.name} contacted support about: ${latestText.slice(0, 180)}${latestText.length > 180 ? '…' : ''}`,
    customerMessageCount: allCustomerMessages.length,
    lastCustomerMessage: latestText,
    lastCustomerMessageAt: latestAt,
    updatedAt: new Date().toISOString(),
  };
}

const PROMOTIONAL_MESSAGE_PATTERN = /(unsubscribe|newsletter|no[-_ ]?reply|noreply|marketing|advertis|promotional|sponsored|bulk mail|click here to (buy|shop|subscribe)|utm_[a-z]+|বিজ্ঞাপন|প্রচার)/i;

function isPromotionalMessage(content: string, sender = '') {
  const combined = `${sender} ${content}`;
  if (PROMOTIONAL_MESSAGE_PATTERN.test(combined)) return true;
  if (/(services agreement|privacy policy|terms of (service|use)|view in browser|manage preferences)/i.test(combined)) return true;
  if (/\b(dazn|linkedin)\b/i.test(combined)) return true;
  return /(sale|discount|coupon|offer|অফার|ছাড়|কুপন)/i.test(content) && /(https?:\/\/|www\.|buy|shop|subscribe|কিনুন|অর্ডার)/i.test(content);
}

const EMPTY_USER: User = {
  id: '', name: '', email: '', role: 'agent', status: 'offline', statusStartedAt: '', avatar: '', createdAt: '',
};

interface AppContextType {
  // Current user & Auth
  currentUser: User;
  setCurrentUser: (user: User) => void;
  isLoggedIn: boolean;
  whatsappSocket: Socket | null;
  login: (user: User) => void;
  logout: () => void;
  updateUserStatus: (status: AgentStatus) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;

  // Routing & Navigation
  currentRoute: AppRoute;
  navigateTo: (route: AppRoute) => void;
  adminSubTab: AdminSubTab;
  setAdminSubTab: (subTab: AdminSubTab) => void;
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;

  // Conversations
  conversations: Conversation[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  selectedConversation: Conversation | null;
  messages: Message[];
  conversationMessages: Message[];

  // Actions on conversation
  sendMessage: (
    content: string,
    messageType?: 'text' | 'image' | 'file' | 'audio' | 'product_card',
    attachments?: any[]
  ) => void;
  draftMessage: string;
  setDraftMessage: React.Dispatch<React.SetStateAction<string>>;
  simulateIncomingMessage: (
    conversationId: string,
    content: string,
    senderName?: string,
    messageType?: 'text' | 'image'
  ) => void;
  assignConversation: (conversationId: string, agentId: string) => void;
  toggleBookmark: (conversationId: string) => void;
  pauseConversation: (conversationId: string, reason: string) => void;
  resumeConversation: (conversationId: string) => void;
  updateConversationSentiment: (conversationId: string, sentiment: SentimentType) => void;
  addTagToConversation: (conversationId: string, tag: Tag) => void;
  removeTagFromConversation: (conversationId: string, tagId: string) => void;
  endConversation: (conversationId: string, tag: Tag, sentiment: SentimentType) => boolean;
  addConversationNote: (conversationId: string, note: string) => void;

  // Filters
  channelFilter: ChannelType | 'all';
  setChannelFilter: (c: ChannelType | 'all') => void;
  statusFilter: ConversationStatus | 'all';
  setStatusFilter: (s: ConversationStatus | 'all') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Pages & Channels
  pages: PageChannel[];
  togglePageStatus: (pageId: string, reason?: string) => void;
  updatePageSettings: (pageId: string, settings: Partial<PageChannel>) => void;
  addPage: (page: Omit<PageChannel, 'id'> & { id?: string }) => void;

  // Quick Responses
  quickResponses: QuickResponse[];
  addQuickResponse: (qr: Omit<QuickResponse, 'id' | 'usageCount'>) => void;
  updateQuickResponse: (id: string, qr: Partial<QuickResponse>) => void;
  deleteQuickResponse: (id: string) => void;
  incrementQuickResponseUsage: (id: string) => void;

  // Tags
  tags: Tag[];
  addTag: (tag: Omit<Tag, 'id'>) => void;
  deleteTag: (id: string) => void;

  // SLA & Audit
  slaRules: SLARule[];
  updateSLARule: (id: string, rule: Partial<SLARule>) => void;
  auditLogs: AuditLog[];
  addAuditLog: (action: string, targetType: string, targetId: string, details: string) => void;

  // Sound Chime & Notifications
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  notificationCount: number;
  workspaceNotice: string;

  // Waiting Queue & Landing Control
  waitingQueue: WaitingQuery[];
  landingLimit: number;
  setLandingLimit: (limit: number) => void;
  isAgentPaused: boolean;
  toggleAgentPause: () => void;
  dropNextIncomingQuery: () => void;
  landNextQueryFromQueue: () => void;

  // Customer Email Tickets (4k+ Support Mailbox)
  customerEmails: CustomerEmail[];
  emailSettings: EmailOperationsSettings;
  updateEmailSettings: (settings: Partial<EmailOperationsSettings>) => void;
  markEmailRead: (emailId: string) => void;
  toggleEmailStar: (emailId: string) => void;
  updateEmailStatus: (emailId: string, status: CustomerEmail['status']) => void;
  replyToCustomerEmail: (emailId: string, replyBody: string) => void;
  convertEmailToConversationTicket: (emailId: string) => string;
  sendNewCustomerEmail: (emailData: Omit<CustomerEmail, 'id' | 'ticketNumber' | 'receivedAt'>) => void;
  mergeFetchedEmails: (newEmails: CustomerEmail[]) => void;

  // Helpers
  createLiveChatVisitorConversation: (visitorName: string, initialMsg: string, email?: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Production data comes only from the authenticated PostgreSQL workspace.
  const [users, setUsers] = useState<User[]>([]);

  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER);

  const [pages, setPages] = useState<PageChannel[]>([]);

  const [tags, setTags] = useState<Tag[]>([]);

  const [quickResponses, setQuickResponses] = useState<QuickResponse[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draftMessage, setDraftMessage] = useState('');

  const [slaRules, setSlaRules] = useState<SLARule[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [waitingQueue, setWaitingQueue] = useState<WaitingQuery[]>([]);
  const [landingLimit, setLandingLimitState] = useState(2);

  const [customerEmails, setCustomerEmails] = useState<CustomerEmail[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailOperationsSettings>({
    enabled: true,
    autoSync: true,
    autoLand: true,
    allowReplies: true,
  });

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('/agent/inbox');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('overview');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [whatsappSocket, setWhatsappSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('inbox');
  const [channelFilter, setChannelFilter] = useState<ChannelType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [workspaceNotice, setWorkspaceNotice] = useState('');
  // Agents are available after login. They can explicitly pause intake from
  // the inbox control when needed.
  const [isAgentPaused, setIsAgentPaused] = useState(false);
  const routeStorageKey = (userId: string) => `petboxdesk:last-route:${userId}`;
  const dbHydratedRef = React.useRef(false);
  const skipNextWorkspaceSaveRef = React.useRef(false);
  const workspaceVersionRef = React.useRef(0);
  const authCheckActiveRef = React.useRef(true);
  const conversationsRef = React.useRef(conversations);
  const messagesRef = React.useRef(messages);
  const waitingQueueRef = React.useRef(waitingQueue);
  const customerEmailsRef = React.useRef(customerEmails);
  const processedWhatsAppIdsRef = React.useRef(new Set<string>());
  const processedEmailIdsRef = React.useRef(new Set<string>());
  const activeDeliveryKeysRef = React.useRef(new Set<string>());
  const emailSyncInFlightRef = React.useRef(false);
  const inboxSocketRef = React.useRef<Socket | null>(null);
  const whatsappSocketRef = React.useRef<Socket | null>(null);
  const socketDisconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  conversationsRef.current = conversations;
  messagesRef.current = messages;
  waitingQueueRef.current = waitingQueue;
  customerEmailsRef.current = customerEmails;

  const markConversationRead = (conversationId: string) => {
    setConversations((previous) => previous.map((conversation) =>
      conversation.id === conversationId
        ? { ...conversation, unreadCount: 0 }
        : conversation
    ));
    void inboxApi.markConversationRead(conversationId).catch((error) => {
      if (error?.status === 404) {
        console.debug('Legacy conversation, no persisted unread state to clear:', conversationId);
        return;
      }
      console.error('Failed to persist conversation read state:', error);
    });
  };

  const selectConversation = (conversationId: string | null) => {
    setSelectedConversationId(conversationId);
    if (!conversationId) return;
    const conversation = conversationsRef.current.find((item) => item.id === conversationId);
    if (conversation?.channelType === 'whatsapp' || conversation?.channelType === 'email') {
      markConversationRead(conversationId);
    } else {
      setConversations((previous) => previous.map((item) =>
        item.id === conversationId ? { ...item, unreadCount: 0 } : item
      ));
    }
  };
  const setLandingLimit = (limit: number) => {
    if (!Number.isFinite(limit)) return;
    setLandingLimitState(Math.max(1, Math.min(20, Math.round(limit))));
  };


  // Helper to land a query into the active inbox
  const landQueryItem = (item: WaitingQuery): Conversation => {
    const existingConversation = item.sourceEmailId
      ? conversationsRef.current.find((conversation) => conversation.sourceEmailId === item.sourceEmailId)
      : undefined;
    if (existingConversation) return existingConversation;

    const landedAt = new Date();
    const landedAtIso = landedAt.toISOString();
    const normalizedEmail = normalizeEmailAddress(item.email);
    const existingEmailContactConversation = item.channelType === 'email'
      ? conversationsRef.current.find((conversation) =>
          conversation.channelType === 'email'
          && normalizeEmailAddress(conversation.contact.email || '') === normalizedEmail
        )
      : undefined;
    const normalizedWhatsAppPhone = item.channelType === 'whatsapp'
      ? normalizeWhatsAppPhone(item.whatsappJid || item.phone || item.email || '')
      : '';
    const existingWhatsAppContactConversation = item.channelType === 'whatsapp'
      ? conversationsRef.current.find((conversation) =>
          conversation.channelType === 'whatsapp'
          && normalizeWhatsAppPhone(conversation.contact.whatsappJid || conversation.contact.phone || '') === normalizedWhatsAppPhone
        )
      : undefined;
    const existingContactConversation = existingEmailContactConversation || existingWhatsAppContactConversation;
    const contactId = existingContactConversation?.contactId
      || `contact_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const convId = item.channelType === 'email' && item.sourceEmailId
      ? item.conversationId || stableEmailConversationId(item.email, item.sourceEmailId)
      : item.channelType === 'whatsapp'
        ? item.conversationId || `conv_wa_${normalizedWhatsAppPhone}`
        : `conv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const convUid =
      Math.random().toString(16).substring(2, 10) +
      Math.random().toString(16).substring(2, 10);

    // Legacy email conversation IDs remain untouched. New inbound emails
    // use deterministic per-message IDs. Existing contacts are reused by
    // normalized email so CRM notes/tags/history remain connected.
    const newContact = existingContactConversation?.contact || {
      id: contactId,
      name: item.name,
      facebookPsid: item.facebookPsid || item.email.split('@')[0],
      whatsappJid: item.whatsappJid,
      email: item.email,
      avatar: item.avatar,
      createdAt: new Date().toISOString(),
      customerTier: 'Regular' as const,
    };
    const contact = item.channelType === 'whatsapp' && existingContactConversation?.contact
      ? { ...newContact, whatsappJid: item.whatsappJid || newContact.whatsappJid, phone: normalizedWhatsAppPhone }
      : newContact;

    const newConv: Conversation = {
      id: convId,
      convUid,
      pageId: item.pageId || 'page_petbox_fb',
      pageName: item.pageName || 'Petbox',
      channelType: item.channelType || 'facebook',
      contactId: newContact.id,
      contact,
      subject: item.subject,
      sourceEmailId: item.sourceEmailId,
      emailMessageId: item.messageId,
      emailReferences: item.references,
      assignedAgentId: currentUser.id,
      assignedAgent: currentUser,
      status: 'open',
      sentiment: 'neutral',
      tags: tags.length ? [tags[0]] : [],
      lastMessageAt: landedAtIso,
      landedAt: landedAtIso,
      slaDueAt: new Date(landedAt.getTime() + 5 * 60 * 1000).toISOString(),
      lastMessageText: item.message,
      unreadCount: 1,
      createdAt: landedAtIso,
      priority: item.priority || 'medium',
    };

    const firstMsg: Message = {
      id: `msg_cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      conversationId: convId,
      senderType: 'contact',
      senderId: contact.id,
      senderName: contact.name,
      content: item.message,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      isRead: false,
      ...(item.relationalPersistenceStatus === 'workspace_only'
        ? { metadata: { relationalPersistenceStatus: 'workspace_only' } }
        : {}),
    };

    newConv.summary = createConversationSummary(newConv, [firstMsg]);

    setConversations((prev) => [newConv, ...prev]);
    setMessages((prev) => [...prev, firstMsg]);
    if (item.channelType === 'email' && item.sourceEmailId) {
      setCustomerEmails((prev) => prev.map((email) => email.id === item.sourceEmailId
        ? { ...email, status: 'in_progress', isRead: true, assignedAgentName: currentUser.name }
        : email
      ));
    }
    playSoundChime();
    addAuditLog('QUERY_LANDED_INBOX', 'Conversation', convId, `Query landed in agent inbox from ${item.name}`);
    return newConv;
  };

  const queueIncomingQuery = (item: WaitingQuery) => {
    setWaitingQueue((previous) => {
      const duplicate = previous.some((query) => query.id === item.id
        || (item.sourceEmailId && query.sourceEmailId === item.sourceEmailId)
        || (item.channelType === 'whatsapp' && query.whatsappJid === item.whatsappJid && query.createdAt === item.createdAt));
      return duplicate ? previous : [...previous, item];
    });
    addAuditLog('QUERY_ADDED_TO_WAITING_QUEUE', 'WaitingQuery', item.id, `${item.channelType} query queued for an available agent`);
  };

  // Land next waiting query from queue if available
  const landNextQueryFromQueue = () => {
    if (isAgentPaused) return;
    const activeOpenCount = conversations.filter(
      (conversation) => (conversation.status === 'open' || conversation.status === 'pending') && conversation.assignedAgentId === currentUser.id
    ).length;
    if (activeOpenCount >= landingLimit) return;
    setWaitingQueue((prevQueue) => {
      if (prevQueue.length === 0) return prevQueue;
      const [nextItem, ...remaining] = prevQueue;
      landQueryItem(nextItem);
      return remaining;
    });
  };

  // Automatically drain the waiting queue when an agent finishes a
  // conversation and a landing slot becomes available.
  useEffect(() => {
    if (!isLoggedIn || isAgentPaused || waitingQueue.length === 0) return;
    const activeOpenCount = conversations.filter(
      (conversation) => (conversation.status === 'open' || conversation.status === 'pending') && conversation.assignedAgentId === currentUser.id
    ).length;
    if (activeOpenCount < landingLimit) landNextQueryFromQueue();
  }, [isLoggedIn, isAgentPaused, waitingQueue.length, conversations, landingLimit, currentUser.id]);

  // Drop incoming query: Only max 2 active queries land for the agent at a time; others stay in waiting queue
  const dropNextIncomingQuery = () => {
    // Demo query generation is intentionally disabled. Incoming items must come
    // from a connected Facebook, email, live-chat, or WhatsApp source.
    return undefined;
  };

  // Toggle Agent Pause / Resume
  const toggleAgentPause = () => {
    const next = !isAgentPaused;
    setIsAgentPaused(next);

    const nextStatus: AgentStatus = next ? 'offline' : 'online';
    if (currentUser.status !== nextStatus) {
      const updatedUser = { ...currentUser, status: nextStatus, statusStartedAt: new Date().toISOString() };
      setCurrentUser(updatedUser);
      setUsers((prev) => prev.map((user) => (user.id === currentUser.id ? updatedUser : user)));
      addAuditLog('AGENT_STATUS_CHANGE', 'User', currentUser.id, `Status updated to ${nextStatus}`);
    }
    addAuditLog(
      next ? 'AGENT_PAUSED' : 'AGENT_RESUMED',
      'User',
      currentUser.id,
      next ? 'Agent paused incoming queue' : 'Agent resumed incoming queue'
    );

    if (!next) {
      // When switching from Pause to Resume, fill available configured slots.
      setTimeout(() => {
        setConversations((currentConvs) => {
          const activeOpen = currentConvs.filter(
            (c) => (c.status === 'open' || c.status === 'pending') && c.assignedAgentId === currentUser.id
          );
          const slotsAvailable = Math.max(0, landingLimit - activeOpen.length);
          if (slotsAvailable > 0) {
            setWaitingQueue((prevQueue) => {
              if (prevQueue.length === 0) return prevQueue;
              const toLand = prevQueue.slice(0, slotsAvailable);
              toLand.forEach((q) => landQueryItem(q));
              return prevQueue.slice(slotsAvailable);
            });
          }
          return currentConvs;
        });
      }, 300);
    }
  };

  const routeForRole = (role: User['role'], requestedRoute: AppRoute): AppRoute => {
    return role === 'admin' && requestedRoute.startsWith('/agent')
      ? '/admin/dashboard' as AppRoute
      : role !== 'admin' && requestedRoute.startsWith('/admin')
        ? '/agent/inbox' as AppRoute
      : !['admin', 'supervisor', 'bi'].includes(role) && requestedRoute.startsWith('/bi/')
        ? '/agent/inbox' as AppRoute
        : role === 'bi' && requestedRoute.startsWith('/agent')
          ? '/bi/summary' as AppRoute
          : role !== 'admin' && requestedRoute.startsWith('/dev-tools/')
            ? '/agent/inbox' as AppRoute
        : requestedRoute;
  };

  // Function to navigate cleanly between hierarchy routes
  const navigateTo = (requestedRoute: AppRoute) => {
    const route = routeForRole(currentUser.role, requestedRoute);
    setCurrentRoute(route);
    if (isLoggedIn && route !== '/login') {
      localStorage.setItem(routeStorageKey(currentUser.id), route);
    }

    if (route === '/login') {
      // Login route
    } else if (route === '/agent/inbox') {
      setActiveTab('inbox');
    } else if (route === '/agent/assigned') {
      setActiveTab('assigned');
    } else if (route === '/agent/bookmarked') {
      setActiveTab('bookmarked');
    } else if (route === '/agent/team') {
      setActiveTab('team');
    } else if (route === '/admin/dashboard') {
      setActiveTab('admin');
      setAdminSubTab('overview');
    } else if (route.startsWith('/bi/')) {
      setActiveTab('reports');
    } else if (route === '/admin/agents') {
      setActiveTab('admin');
      setAdminSubTab('agents');
    } else if (route === '/admin/pages') {
      setActiveTab('admin');
      setAdminSubTab('pages');
    } else if (route === '/admin/tags') {
      setActiveTab('admin');
      setAdminSubTab('tags');
    } else if (route === '/admin/quick-responses') {
      setActiveTab('admin');
      setAdminSubTab('quick-responses');
    } else if (route === '/admin/sla') {
      setActiveTab('admin');
      setAdminSubTab('sla');
    } else if (route === '/admin/audit-logs') {
      setActiveTab('admin');
      setAdminSubTab('audit-logs');
    } else if (route === '/admin/roles') {
      setActiveTab('admin');
      setAdminSubTab('roles');
    } else if (route === '/admin/settings') {
      setActiveTab('admin');
      setAdminSubTab('settings');
    }
  };

  const login = (user: User) => {
    // Prevent a slow initial /auth/me request from restoring the previous session
    // (for example an Agent) after a successful Admin login.
    authCheckActiveRef.current = false;
    setCurrentUser(user);
    setIsLoggedIn(true);
    setSelectedConversationId(null);
    const defaultRoute = user.role === 'admin' ? '/admin/dashboard' : user.role === 'bi' ? '/bi/summary' : '/agent/inbox';
    const savedRoute = localStorage.getItem(routeStorageKey(user.id)) as AppRoute | null;
    setCurrentRoute(savedRoute ? routeForRole(user.role, savedRoute) : defaultRoute);
    setActiveTab(user.role === 'admin' ? 'admin' : user.role === 'bi' ? 'reports' : 'inbox');
    if (user.role === 'admin') setAdminSubTab('overview');
    addAuditLog('USER_LOGIN', 'User', user.id, `User ${user.name} logged in`);
  };

  const logout = () => {
    authCheckActiveRef.current = false;
    void authApi.logout().catch(() => undefined);
    setIsLoggedIn(false);
    setSelectedConversationId(null);
    navigateTo('/login');
  };

  useEffect(() => {
    let mounted = true;
    authApi.me()
      .then((data) => data)
      .then((data) => {
        if (mounted && authCheckActiveRef.current && data?.user) {
          setCurrentUser(data.user);
          setIsLoggedIn(true);
          const defaultRoute = data.user.role === 'admin' ? '/admin/dashboard' : data.user.role === 'bi' ? '/bi/summary' : '/agent/inbox';
          const savedRoute = localStorage.getItem(routeStorageKey(data.user.id)) as AppRoute | null;
          setCurrentRoute(savedRoute ? routeForRole(data.user.role, savedRoute) : defaultRoute);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    dbHydratedRef.current = false;
    skipNextWorkspaceSaveRef.current = false;
    inboxApi.loadState()
      .then(async (saved) => {
        // Loading the shared snapshot must not immediately write it back.
        skipNextWorkspaceSaveRef.current = true;
        workspaceVersionRef.current = Number.isInteger(saved?.version) ? Number(saved.version) : 0;
        const data = saved?.state;
        if (data) {
          const recentCutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
          const isRecent = (value: string | undefined) => {
            const timestamp = Date.parse(String(value || ''));
            return Number.isFinite(timestamp) && timestamp >= recentCutoff;
          };
          if (Array.isArray(data.users)) setUsers(data.users);
          if (Array.isArray(data.pages)) setPages(data.pages);
          if (Array.isArray(data.tags)) setTags(data.tags);
          if (Array.isArray(data.quickResponses)) setQuickResponses(data.quickResponses);
          if (Array.isArray(data.conversations)) {
            const allMessages = Array.isArray(data.messages) ? data.messages as Message[] : [];
            const recentMessages = allMessages.filter((message) => isRecent(message.createdAt));
            const seenEmailConversationSources = new Set<string>();
            const cleanConversations = data.conversations.filter((conversation: Conversation) => {
              if (conversation.channelType === 'email' && conversation.sourceEmailId) {
                if (seenEmailConversationSources.has(conversation.sourceEmailId)) return false;
                seenEmailConversationSources.add(conversation.sourceEmailId);
              }
              const customerMessages = allMessages.filter((message) => message.conversationId === conversation.id && message.senderType === 'contact');
              const latestCustomerAt = customerMessages.map((message) => message.createdAt).sort().at(-1) || conversation.lastMessageAt;
              const isOldPromotionalEmail = conversation.channelType === 'email'
                && isPromotionalMessage(`${conversation.subject || ''} ${conversation.lastMessageText || ''}`, conversation.contact?.email || conversation.contact?.name || '');
              return isRecent(latestCustomerAt) && !isOldPromotionalEmail;
            });
            const allowedConversationIds = new Set(cleanConversations.map((conversation: Conversation) => conversation.id));
            const workspaceUsers = Array.isArray(data.users) ? data.users as User[] : [];
            const knownUserIds = new Set(workspaceUsers.map((user) => user.id));
            const routedConversations = cleanConversations.map((conversation: Conversation) => {
              // WhatsApp inbound rows can be persisted before the browser
              // workspace snapshot has an assignment. Recover those unread
              // conversations into the current agent's landed inbox after a
              // refresh; never take a valid assignment from another agent.
              if (
                conversation.channelType === 'whatsapp'
                && conversation.unreadCount > 0
                && (conversation.status === 'closed' || !conversation.assignedAgentId || !knownUserIds.has(conversation.assignedAgentId))
              ) {
                return { ...conversation, assignedAgentId: currentUser.id, assignedAgent: currentUser, status: 'open' as const };
              }
              return conversation;
            });
            setConversations(routedConversations
              .map((conversation: Conversation) => {
                const customerMessages = recentMessages.filter((message) => message.conversationId === conversation.id && message.senderType === 'contact');
                return customerMessages.length ? { ...conversation, summary: createConversationSummary(conversation, customerMessages) } : conversation;
              })
              .sort((a: Conversation, b: Conversation) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt)));
            if (Array.isArray(data.messages)) {
              setMessages(recentMessages
                .filter((message) => allowedConversationIds.has(message.conversationId))
                .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)));
            }
          } else if (Array.isArray(data.messages)) {
            setMessages((data.messages as Message[]).filter((message) => isRecent(message.createdAt)));
          }
          if (Array.isArray(data.slaRules)) setSlaRules(data.slaRules);
          if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
          if (Array.isArray(data.waitingQueue)) {
            const seenWaitingItems = new Set<string>();
            setWaitingQueue(data.waitingQueue.filter((item: WaitingQuery) => {
              const dedupeKey = item.sourceEmailId
                || (item.channelType === 'whatsapp' ? `${item.whatsappJid || item.email}:${item.createdAt}` : item.id);
              if (seenWaitingItems.has(dedupeKey)) return false;
              seenWaitingItems.add(dedupeKey);
              return (
              isRecent(item.createdAt)
              && !(item.channelType === 'email' && isPromotionalMessage(`${item.subject || ''} ${item.message || ''}`, item.email || item.name))
              );
            }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
          }
          if (Array.isArray(data.customerEmails)) {
            const seenEmailIds = new Set<string>();
            setCustomerEmails(data.customerEmails.filter((email: CustomerEmail) => {
              if (seenEmailIds.has(email.id)) return false;
              seenEmailIds.add(email.id);
              return isRecent(email.receivedAt) && !isPromotionalMessage(`${email.subject} ${email.preview} ${email.body}`, email.fromEmail);
            }));
          }
          if (data.emailSettings && typeof data.emailSettings === 'object') setEmailSettings((prev) => ({ ...prev, ...data.emailSettings }));
          if (typeof data.landingLimit === 'number') setLandingLimit(data.landingLimit);
        }
        dbHydratedRef.current = true;
      })
      .catch(() => {
        // Never persist empty/default state when the shared snapshot failed to load.
        dbHydratedRef.current = false;
        setWorkspaceNotice('Shared workspace data load হয়নি। Connection check করে Refresh চাপুন।');
      });
  }, [isLoggedIn]);

  // Persist every workspace change to PostgreSQL. No browser storage fallback is used.
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!isLoggedIn || !dbHydratedRef.current) return;
    if (skipNextWorkspaceSaveRef.current) {
      skipNextWorkspaceSaveRef.current = false;
      return;
    }
    if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
    saveStateTimerRef.current = setTimeout(() => {
      workspaceSaveQueueRef.current = workspaceSaveQueueRef.current.then(async () => {
        if (!dbHydratedRef.current) return;
        await inboxApi.saveState({ users, pages, tags, quickResponses, conversations, messages, slaRules, auditLogs, waitingQueue, customerEmails, landingLimit, emailSettings }, workspaceVersionRef.current)
        .then((saved) => { workspaceVersionRef.current = saved.version; })
        .catch((error: Error & { status?: number }) => {
          if (error.status === 409) {
            // Keep the local workspace usable after a concurrent save. The
            // next save will retry using the latest server version.
            dbHydratedRef.current = true;
            void inboxApi.loadState().then((latest) => {
              if (Number.isInteger(latest?.version)) workspaceVersionRef.current = Number(latest.version);
            }).catch(() => undefined);
            if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
            setWorkspaceNotice('আপনার পরিবর্তন save হয়নি—অন্য কেউ workspace update করেছে। সর্বশেষ data দেখতে Refresh চাপুন।');
            setTimeout(() => setWorkspaceNotice(''), 1500);
            return;
          }
          console.error('Failed to persist workspace state to PostgreSQL', error);
        });
      });
    }, 300);
    return () => { if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current); };
  }, [isLoggedIn, users, pages, tags, quickResponses, conversations, messages, slaRules, auditLogs, waitingQueue, customerEmails, landingLimit, emailSettings]);

  const updateEmailSettings = (settings: Partial<EmailOperationsSettings>) => {
    setEmailSettings((prev) => ({ ...prev, ...settings }));
    addAuditLog('UPDATE_EMAIL_SETTINGS', 'EmailOperations', 'email_settings', `Updated email operations: ${Object.entries(settings).map(([key, value]) => `${key}=${String(value)}`).join(', ')}`);
  };

  // Selected conversation computed
  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  // Messages for currently selected conversation
  const conversationMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messages
      .filter((m) => m.conversationId === selectedConversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedConversationId]);

  useEffect(() => {
    if (!isLoggedIn || !selectedConversationId) return;
    if (selectedConversation?.channelType !== 'email' && selectedConversation?.channelType !== 'whatsapp') return;
    let active = true;
    void inboxApi.loadMessages(selectedConversationId)
      .then((result) => {
        if (!active || !Array.isArray(result?.messages)) return;
        setMessages((previous) => {
          const byId = new Map<string, Message>(previous.map((message) => [message.id, message]));
          for (const message of result.messages) {
            if (message?.id) byId.set(message.id, { ...message, attachments: message.attachments || undefined });
          }
          return [...byId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        });
      })
      .catch((error) => console.warn('Relational message hydration failed:', error?.message || error));
    return () => { active = false; };
  }, [isLoggedIn, selectedConversationId, selectedConversation?.channelType]);

  // Notification count
  const notificationCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Play audio chime
  const playSoundChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  const addAuditLog = (action: string, targetType: string, targetId: string, details: string) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Update Current User Status
  const updateUserStatus = (status: AgentStatus) => {
    const updatedUser = {
      ...currentUser,
      status,
      statusStartedAt: new Date().toISOString(),
    };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    setIsAgentPaused(status !== 'online');
    addAuditLog('AGENT_STATUS_CHANGE', 'User', currentUser.id, `Status updated to ${status}`);
  };

  // Send message as agent
  const sendMessage = (
    content: string,
    messageType: 'text' | 'image' | 'file' | 'audio' | 'product_card' = 'text',
    attachments?: any[]
  ) => {
    if (!selectedConversationId || !content.trim()) return;

    const activeConversation = selectedConversation;
    const isExternalChannel = activeConversation?.channelType === 'email' || activeConversation?.channelType === 'whatsapp';
    const deliveryKey = isExternalChannel ? `${activeConversation?.channelType}:${selectedConversationId}:${messageType}:${content}` : '';
    if (deliveryKey && activeDeliveryKeysRef.current.has(deliveryKey)) return;
    if (deliveryKey) activeDeliveryKeysRef.current.add(deliveryKey);
    const finishDelivery = () => { if (deliveryKey) activeDeliveryKeysRef.current.delete(deliveryKey); };
    const withDeliveryTimeout = <T,>(promise: Promise<T>, timeoutMs = 12000) => Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Delivery timed out. Please retry.')), timeoutMs)),
    ]);
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      conversationId: selectedConversationId,
      senderType: 'agent',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content,
      attachments,
      messageType,
      createdAt: new Date().toISOString(),
      isRead: true,
      metadata: { deliveryStatus: isExternalChannel ? 'pending' : 'sent' },
    };
    const isFirstResponse = !messages.some((message) => message.conversationId === selectedConversationId && message.senderType === 'agent');

    setMessages((prev) => [...prev, newMessage]);
    const updateDeliveryStatus = (deliveryStatus: 'sent' | 'failed', deliveryError?: string) => setMessages((prev) => prev.map((message) => message.id === newMessage.id ? { ...message, metadata: { ...message.metadata, deliveryStatus, ...(deliveryError ? { deliveryError } : {}) } } : message));
    const activeChannel = activeConversation?.channelType || 'email';
    const accountId = activeChannel === 'whatsapp'
      ? 'whatsapp'
      : activeConversation?.pageId?.trim()
        && !(activeChannel === 'email' && activeConversation.pageId === 'page_petbox_fb')
        ? activeConversation.pageId.trim()
        : 'default-mailbox';
    const externalConversationKey = activeChannel === 'whatsapp'
      ? `whatsapp:${accountId}:${normalizeWhatsAppPhone(activeConversation?.contact.whatsappJid || activeConversation?.contact.phone || '')}`
      : activeChannel === 'email' && activeConversation?.sourceEmailId
        ? `email:${accountId}:${normalizeEmailAddress(activeConversation.contact.email || '')}:${activeConversation.sourceEmailId}`
        : undefined;
    const persistMessage = (externalMessageId?: string) => inboxApi.sendMessage(
      selectedConversationId,
      content,
      messageType,
      activeChannel,
      attachments,
      externalMessageId,
      externalConversationKey,
    );
    if (!isExternalChannel) void persistMessage()
      .then(() => { if (!isExternalChannel) updateDeliveryStatus('sent'); })
      .catch((error) => { updateDeliveryStatus('failed'); addAuditLog('MESSAGE_PERSISTENCE_FAILED', 'Conversation', selectedConversationId, error?.message || 'Unable to save message.'); });
    if (activeConversation?.channelType === 'email' && activeConversation.contact.email && emailSettings.allowReplies && emailSettings.enabled) {
      void withDeliveryTimeout(emailApi.send({
        to: activeConversation.contact.email,
        subject: activeConversation.subject?.startsWith('Re:') ? activeConversation.subject : `Re: ${activeConversation.subject || 'Petbox Desk Support'}`,
        body: content,
        inReplyTo: activeConversation.emailMessageId,
        references: [activeConversation.emailReferences, activeConversation.emailMessageId].filter(Boolean).join(' '),
      }), 30000).then((delivery) => persistMessage(delivery.messageId)).then(() => {
        updateDeliveryStatus('sent');
        if (activeConversation.sourceEmailId) {
          setCustomerEmails((prev) => prev.map((email) => email.id === activeConversation.sourceEmailId ? { ...email, status: 'in_progress', isRead: true, assignedAgentName: currentUser.name } : email));
        }
        addAuditLog('EMAIL_REPLY_SENT', 'Conversation', selectedConversationId, `Email reply accepted by the configured email provider for ${activeConversation.contact.email}`);
      }).catch((error) => {
        updateDeliveryStatus('failed', error?.message || 'Email delivery failed.');
        console.error('Failed to send email reply', error);
        addAuditLog('EMAIL_REPLY_FAILED', 'Conversation', selectedConversationId, `Email reply failed for ${activeConversation.contact.email}: ${error?.message || 'Email request failed'}`);
      }).finally(finishDelivery);
    } else if (activeConversation?.channelType === 'email') {
      const deliveryError = !activeConversation.contact.email
        ? 'Customer email address is missing.'
        : !emailSettings.enabled
          ? 'Email channel is disabled in Admin Portal settings.'
          : 'Email replies are disabled in Admin Portal settings.';
      updateDeliveryStatus('failed', deliveryError);
      addAuditLog('EMAIL_REPLY_BLOCKED', 'Conversation', selectedConversationId, 'Email reply blocked by Admin email operations settings or missing customer email address.');
      finishDelivery();
    } else if (activeConversation?.channelType === 'whatsapp' && activeConversation.contact.whatsappJid) {
      const voiceAttachment = messageType === 'audio' ? attachments?.find((attachment) => typeof attachment?.url === 'string' && attachment.url.startsWith('data:audio/')) : undefined;
      const delivery = voiceAttachment?.url
        ? whatsappApi.sendVoice(activeConversation.contact.whatsappJid, voiceAttachment.url, voiceAttachment.type || 'audio/webm')
        : whatsappApi.send(activeConversation.contact.whatsappJid, content);
      void withDeliveryTimeout(delivery)
        .then((deliveryResult) => persistMessage(deliveryResult.messageId))
        .then(() => { updateDeliveryStatus('sent'); addAuditLog('WHATSAPP_MESSAGE_SENT', 'Conversation', selectedConversationId, `WhatsApp message accepted for ${activeConversation.contact.name}`); })
        .catch((error) => { updateDeliveryStatus('failed'); addAuditLog('WHATSAPP_MESSAGE_FAILED', 'Conversation', selectedConversationId, `WhatsApp message failed: ${error?.message || 'WhatsApp delivery failed'}`); })
        .finally(finishDelivery);
    } else if (activeConversation?.channelType === 'whatsapp') {
      updateDeliveryStatus('failed');
      addAuditLog('WHATSAPP_MESSAGE_BLOCKED', 'Conversation', selectedConversationId, 'WhatsApp reply blocked because the customer JID is missing.');
      finishDelivery();
    }

    // Update conversation metadata
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === selectedConversationId) {
          return {
            ...conv,
            lastMessageAt: newMessage.createdAt,
            lastMessageText: content,
            ...(isFirstResponse ? { firstResponseAt: newMessage.createdAt } : {}),
            status: conv.status === 'closed' ? 'open' : conv.status,
            unreadCount: 0,
          };
        }
        return conv;
      })
    );
    addAuditLog('SEND_MESSAGE', 'Conversation', selectedConversationId, `Sent ${messageType} message`);
  };

  // Simulate incoming customer message
  const simulateIncomingMessage = (
    conversationId: string,
    content: string,
    senderName?: string,
    messageType: 'text' | 'image' = 'text'
  ) => {
    const targetConv = conversations.find((c) => c.id === conversationId);
    if (!targetConv) return;

    const targetPage = pages.find((p) => p.id === targetConv.pageId);

    const newMsg: Message = {
      id: `msg_in_${Date.now()}`,
      conversationId,
      senderType: 'contact',
      senderId: targetConv.contactId,
      senderName: senderName || targetConv.contact.name,
      content,
      messageType,
      createdAt: new Date().toISOString(),
      isRead: selectedConversationId === conversationId,
    };

    setMessages((prev) => [...prev, newMsg]);

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessageAt: newMsg.createdAt,
            lastMessageText: content,
            unreadCount: selectedConversationId === conversationId ? 0 : c.unreadCount + 1,
            status: c.status === 'closed' ? 'open' : c.status,
            summary: createConversationSummary(c, messages.filter((message) => message.conversationId === conversationId && message.senderType === 'contact'), newMsg),
          };
        }
        return c;
      })
    );
    const endedConversation = conversations.find((conversation) => conversation.id === conversationId);
    if (endedConversation?.channelType === 'email' && endedConversation.sourceEmailId) {
      setCustomerEmails((prev) => prev.map((email) => email.id === endedConversation.sourceEmailId
        ? { ...email, status: 'resolved', isRead: true, assignedAgentName: currentUser.name }
        : email
      ));
    }
    playSoundChime();

    // Check if page or conversation is paused, trigger auto-reply
    if (targetPage?.status === 'paused' || targetConv.status === 'paused') {
      const autoReplyText =
        targetPage?.autoReplyMessage ||
        'আমাদের প্রতিনিধি এই মুহূর্তে সাময়িকভাবে বিরতিতে আছেন। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।';

      setTimeout(() => {
        const autoMsg: Message = {
          id: `msg_auto_${Date.now()}`,
          conversationId,
          senderType: 'system',
          senderId: 'system_bot',
          senderName: 'System Auto-Reply',
          content: `[Auto-Reply] ${autoReplyText}`,
          messageType: 'text',
          createdAt: new Date().toISOString(),
          isRead: true,
        };
        setMessages((m) => [...m, autoMsg]);
      }, 1000);
    }
  };

  // Assign conversation
  const assignConversation = (conversationId: string, agentId: string) => {
    const agent = users.find((u) => u.id === agentId);
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            assignedAgentId: agentId,
            assignedAgent: agent,
          };
        }
        return c;
      })
    );
    void inboxApi.updateConversation(conversationId, { assigned_agent_id: agentId }).catch(() => undefined);
    addAuditLog('ASSIGN_CONVERSATION', 'Conversation', conversationId, `Assigned to ${agent?.name || agentId}`);
  };

  // Toggle bookmark
  const toggleBookmark = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return { ...c, isBookmarked: !c.isBookmarked };
        }
        return c;
      })
    );
  };

  // Pause conversation
  const pauseConversation = (conversationId: string, reason: string) => {
    const now = new Date().toISOString();
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            status: 'paused',
            pausedReason: reason,
            pausedAt: now,
            pausedBy: currentUser.name,
          };
        }
        return c;
      })
    );

    // Add a system log message to thread
    const systemMsg: Message = {
      id: `sys_${Date.now()}`,
      conversationId,
      senderType: 'system',
      senderId: currentUser.id,
      senderName: 'System',
      content: `Conversation paused by ${currentUser.name}. Reason: ${reason}`,
      messageType: 'text',
      createdAt: now,
      isRead: true,
    };
    setMessages((prev) => [...prev, systemMsg]);
    addAuditLog('PAUSE_CONVERSATION', 'Conversation', conversationId, `Paused. Reason: ${reason}`);
  };

  // Resume conversation
  const resumeConversation = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            status: 'open',
            pausedReason: undefined,
            pausedAt: undefined,
            pausedBy: undefined,
          };
        }
        return c;
      })
    );
    const systemMsg: Message = {
      id: `sys_${Date.now()}`,
      conversationId,
      senderType: 'system',
      senderId: currentUser.id,
      senderName: 'System',
      content: `Conversation resumed by ${currentUser.name}`,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      isRead: true,
    };
    setMessages((prev) => [...prev, systemMsg]);
    addAuditLog('RESUME_CONVERSATION', 'Conversation', conversationId, 'Resumed conversation');
  };

  // Update Sentiment
  const updateConversationSentiment = (conversationId: string, sentiment: SentimentType) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, sentiment } : c))
    );
  };

  // Add Tag
  const addTagToConversation = (conversationId: string, tag: Tag) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          if (c.tags.some((t) => t.id === tag.id)) return c;
          return { ...c, tags: [...c.tags, tag] };
        }
        return c;
      })
    );
    addAuditLog('ADD_TAG', 'Conversation', conversationId, `Tag added: ${tag.name}`);
  };

  // Remove Tag
  const removeTagFromConversation = (conversationId: string, tagId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return { ...c, tags: c.tags.filter((t) => t.id !== tagId) };
        }
        return c;
      })
    );
  };

  // End / Close Conversation (strict requirement: Tag & Sentiment must be provided)
  const endConversation = (conversationId: string, tag: Tag, sentiment: SentimentType): boolean => {
    const now = new Date().toISOString();
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          const updatedTags = c.tags.some((t) => t.id === tag.id) ? c.tags : [...c.tags, tag];
          return {
            ...c,
            status: 'closed',
            sentiment,
            tags: updatedTags,
            resolvedAt: now,
            closedByAgentId: currentUser.id,
          };
        }
        return c;
      })
    );

    // Insert system wrap-up message
    const sysMsg: Message = {
      id: `sys_${Date.now()}`,
      conversationId,
      senderType: 'system',
      senderId: currentUser.id,
      senderName: 'System',
      content: `Conversation closed by ${currentUser.name}. Final Tag: "${tag.name}", Sentiment: "${String(sentiment || 'neutral').toUpperCase()}".`,
      messageType: 'text',
      createdAt: now,
      isRead: true,
    };
    setMessages((prev) => [...prev, sysMsg]);

    addAuditLog(
      'CLOSE_CONVERSATION',
      'Conversation',
      conversationId,
      `Ended ticket with tag "${tag.name}" and sentiment "${sentiment}"`
    );

    // If agent is not paused, land the next waiting query from queue to maintain 2 active landed queries!
    if (!isAgentPaused) {
      setTimeout(() => {
        setWaitingQueue((prevQueue) => {
          if (prevQueue.length === 0) {
            setConversations((convs) => {
              const nextActive = convs.find(
                (conversation) => (conversation.status === 'open' || conversation.status === 'pending') && conversation.id !== conversationId
              );
              setSelectedConversationId(nextActive?.id || null);
              return convs;
            });
            return prevQueue;
          }
          const [nextItem, ...remaining] = prevQueue;
          const newlyLanded = landQueryItem(nextItem);
          setSelectedConversationId(newlyLanded.id);
          return remaining;
        });
      }, 350);
    } else {
      setTimeout(() => {
        setConversations((convs) => {
          const remainingActive = convs.filter(
            (c) => (c.status === 'open' || c.status === 'pending') && c.id !== conversationId
          );
          setSelectedConversationId(remainingActive[0]?.id || null);
          return convs;
        });
      }, 200);
    }

    return true;
  };

  // Add conversation internal note
  const addConversationNote = (conversationId: string, note: string) => {
    if (!note.trim()) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return { ...c, notes: [...(c.notes || []), note.trim()] };
        }
        return c;
      })
    );
    addAuditLog('ADD_NOTE', 'Conversation', conversationId, `Note added by ${currentUser.name}`);
  };

  // Page status toggle
  const togglePageStatus = (pageId: string, reason?: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === pageId) {
          const isPausing = p.status === 'active';
          return {
            ...p,
            status: isPausing ? 'paused' : 'active',
            pauseReason: isPausing ? reason || 'Peak operational pause' : undefined,
            pausedAt: isPausing ? new Date().toISOString() : undefined,
            pausedBy: isPausing ? currentUser.name : undefined,
          };
        }
        return p;
      })
    );
    addAuditLog('PAGE_STATUS_TOGGLE', 'PageChannel', pageId, `Status updated`);
  };

  const updatePageSettings = (pageId: string, updated: Partial<PageChannel>) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, ...updated } : p)));
    addAuditLog('PAGE_SETTINGS_UPDATE', 'PageChannel', pageId, 'Updated settings');
  };

  const addPage = (newPage: Omit<PageChannel, 'id'> & { id?: string }) => {
    const page: PageChannel = {
      ...newPage,
      id: newPage.id || `page_${Date.now()}`,
    };
    setPages((prev) => [...prev, page]);
    addAuditLog('PAGE_CREATE', 'PageChannel', page.id, `Created page ${page.name}`);
  };

  // Quick Responses CRUD
  const addQuickResponse = (qr: Omit<QuickResponse, 'id' | 'usageCount'>) => {
    const newQr: QuickResponse = {
      ...qr,
      id: `qr_${Date.now()}`,
      usageCount: 0,
    };
    setQuickResponses((prev) => [newQr, ...prev]);
    addAuditLog('QUICK_RESPONSE_CREATE', 'QuickResponse', newQr.id, `Created template "${qr.title}"`);
  };

  const updateQuickResponse = (id: string, updated: Partial<QuickResponse>) => {
    setQuickResponses((prev) => prev.map((q) => (q.id === id ? { ...q, ...updated } : q)));
  };

  const deleteQuickResponse = (id: string) => {
    setQuickResponses((prev) => prev.filter((q) => q.id !== id));
  };

  const incrementQuickResponseUsage = (id: string) => {
    setQuickResponses((prev) =>
      prev.map((q) => (q.id === id ? { ...q, usageCount: (q.usageCount || 0) + 1 } : q))
    );
  };

  // Tags CRUD
  const addTag = (newTag: Omit<Tag, 'id'>) => {
    const tag: Tag = {
      ...newTag,
      id: `tag_${Date.now()}`,
    };
    setTags((prev) => [...prev, tag]);
    addAuditLog('TAG_CREATE', 'Tag', tag.id, `Created tag ${tag.name}`);
  };

  const deleteTag = (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  // SLA Rule update
  const updateSLARule = (id: string, updated: Partial<SLARule>) => {
    setSlaRules((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    addAuditLog('SLA_RULE_UPDATE', 'SLARule', id, 'Updated SLA configuration');
  };

  // Helper to create a live chat conversation on the fly from visitor widget
  const createLiveChatVisitorConversation = (visitorName: string, initialMsg: string, email?: string): string => {
    const visitorId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
    const contactId = `contact_visitor_${visitorId}`;
    const convId = `conv_livechat_${visitorId}`;
    const convUid = visitorId.replaceAll('-', '').slice(0, 16);

    const newContact: Contact = {
      id: contactId,
      name: visitorName || 'Live Chat Visitor',
      email: email || `visitor_${visitorId.slice(0, 8)}@customer.com`,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      customerTier: 'New',
    };

    const newConv: Conversation = {
      id: convId,
      convUid,
      pageId: 'page_web_livechat',
      pageName: 'Petbox Live Chat',
      channelType: 'live_chat',
      contactId: newContact.id,
      contact: newContact,
      assignedAgentId: currentUser.id,
      assignedAgent: currentUser,
      status: 'open',
      sentiment: 'neutral',
      tags: [tags[1] || tags[0]],
      lastMessageAt: new Date().toISOString(),
      lastMessageText: initialMsg,
      unreadCount: 1,
      createdAt: new Date().toISOString(),
      priority: 'medium',
    };

    const firstMsg: Message = {
      id: `msg_init_${visitorId}`,
      conversationId: convId,
      senderType: 'contact',
      senderId: newContact.id,
      senderName: newContact.name,
      content: initialMsg,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    newConv.summary = createConversationSummary(newConv, [firstMsg]);

    setConversations((prev) => [newConv, ...prev]);
    setMessages((prev) => [...prev, firstMsg]);
    playSoundChime();
    return convId;
  };

  // Customer Email Ticket Operations
  const markEmailRead = (emailId: string) => {
    setCustomerEmails((prev) =>
      prev.map((eml) => (eml.id === emailId ? { ...eml, isRead: true } : eml))
    );
  };

  const toggleEmailStar = (emailId: string) => {
    setCustomerEmails((prev) =>
      prev.map((eml) => (eml.id === emailId ? { ...eml, isStarred: !eml.isStarred } : eml))
    );
  };

  const updateEmailStatus = (emailId: string, status: CustomerEmail['status']) => {
    setCustomerEmails((prev) =>
      prev.map((eml) => (eml.id === emailId ? { ...eml, status } : eml))
    );
    addAuditLog('UPDATE_EMAIL_STATUS', 'CustomerEmail', emailId, `Changed email ticket status to ${status}`);
  };

  const replyToCustomerEmail = (emailId: string, _replyBody: string) => {
    const targetEmail = customerEmails.find((e) => e.id === emailId);
    if (!targetEmail) return;

    setCustomerEmails((prev) =>
      prev.map((eml) =>
        eml.id === emailId
          ? {
              ...eml,
              status: 'in_progress',
              isRead: true,
              threadCount: (eml.threadCount || 1) + 1,
              assignedAgentName: currentUser.name,
            }
          : eml
      )
    );

    addAuditLog(
      'REPLY_CUSTOMER_EMAIL',
      'CustomerEmail',
      emailId,
      `Sent email response to ${targetEmail.fromEmail} (${targetEmail.subject})`
    );
    playSoundChime();
  };

  const convertEmailToConversationTicket = (emailId: string): string => {
    const email = customerEmails.find((e) => e.id === emailId);
    if (!email) return '';

    const contactId = `contact_eml_${Date.now()}`;
    const convId = `conv_eml_${Date.now()}`;
    const convUid = Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);

    const newContact: Contact = {
      id: contactId,
      name: email.fromName,
      email: email.fromEmail,
      phone: email.accountNumber ? `+880 ${email.accountNumber}` : undefined,
      avatar: email.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      notes: `Ticket #${email.ticketNumber} - Category: ${email.category}`,
      createdAt: new Date().toISOString(),
      customerTier: 'Regular',
    };

    const newConv: Conversation = {
      id: convId,
      convUid,
      pageId: 'page_petbox_email',
      pageName: 'Petbox Email Support',
      channelType: 'email',
      contactId: newContact.id,
      contact: newContact,
      assignedAgentId: currentUser.id,
      assignedAgent: currentUser,
      emailMessageId: email.messageId,
      emailReferences: email.references,
      status: 'open',
      sentiment: email.priority === 'urgent' ? 'negative' : 'neutral',
      tags: tags.length ? [tags[0]] : [],
      lastMessageAt: new Date().toISOString(),
      lastMessageText: `[Email: ${email.subject}] ${email.preview}`,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      priority: email.priority,
      notes: [`Converted from email ticket ${email.ticketNumber}`],
    };

    const emailMsg: Message = {
      id: `msg_eml_${Date.now()}`,
      conversationId: convId,
      senderType: 'contact',
      senderId: newContact.id,
      senderName: newContact.name,
      content: email.preview || email.body || email.subject,
      messageType: 'text',
      createdAt: email.receivedAt,
      isRead: true,
    };

    setConversations((prev) => [newConv, ...prev]);
    setMessages((prev) => [...prev, emailMsg]);
    setSelectedConversationId(convId);
    markEmailRead(emailId);
    addAuditLog('CONVERT_EMAIL_TO_TICKET', 'Conversation', convId, `Converted email ticket #${email.ticketNumber} to live CRM conversation`);
    playSoundChime();
    return convId;
  };

  const sendNewCustomerEmail = (emailData: Omit<CustomerEmail, 'id' | 'ticketNumber' | 'receivedAt'>) => {
    const newId = `eml_${Date.now()}`;
    const newTicketNumber = `NGD-EML-${Math.floor(40000 + Math.random() * 90000)}`;

    const newEmail: CustomerEmail = {
      id: newId,
      ticketNumber: newTicketNumber,
      receivedAt: new Date().toISOString(),
      ...emailData,
    };

    setCustomerEmails((prev) => [newEmail, ...prev]);
    addAuditLog('COMPOSE_NEW_EMAIL', 'CustomerEmail', newId, `Dispatched outgoing email to ${emailData.fromEmail}`);
    playSoundChime();
  };

  const mergeFetchedEmails = (newEmails: CustomerEmail[]) => {
    const recentCutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const realEmails = newEmails.filter((email) => {
      const receivedAt = Date.parse(String(email.receivedAt || ''));
      return Number.isFinite(receivedAt)
        && receivedAt >= recentCutoff
        && !isPromotionalMessage(`${email.subject} ${email.preview} ${email.body}`, email.fromEmail);
    });
    const existingEmailIds = new Set(customerEmailsRef.current.map((email) => email.id));
    const uniqueNewEmails = realEmails.filter((email) => !existingEmailIds.has(email.id) && !processedEmailIdsRef.current.has(email.id));
    uniqueNewEmails.forEach((email) => processedEmailIdsRef.current.add(email.id));
    uniqueNewEmails
      .filter((email) => email.relationalPersistenceStatus === 'workspace_only')
      .forEach((email) => {
        addAuditLog(
          'RELATIONAL_PERSISTENCE_DRIFT',
          'Conversation',
          email.conversationId || stableEmailConversationId(email.fromEmail, email.id),
          `Email ${email.id} is currently available only in workspace state.`,
        );
      });
    setCustomerEmails((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const existingSubjects = new Set(prev.map((e) => `${e.fromEmail}_${e.subject}_${e.receivedAt}`));
      const uniqueNew = uniqueNewEmails.filter(
        (e) => !existingIds.has(e.id) && !existingSubjects.has(`${e.fromEmail}_${e.subject}_${e.receivedAt}`)
      );
      if (uniqueNew.length === 0) return prev;
      return [...uniqueNew, ...prev];
    });
    if (uniqueNewEmails.length && emailSettings.enabled) {
      const known = new Set([
        ...waitingQueueRef.current.map((item) => item.sourceEmailId),
        ...conversationsRef.current.map((conversation) => conversation.sourceEmailId),
      ].filter(Boolean));
      const seenIncoming = new Set<string>();
      const incoming = uniqueNewEmails
        .filter((email) => {
          if (known.has(email.id) || seenIncoming.has(email.id)) return false;
          seenIncoming.add(email.id);
          return true;
        })
        .map((email): WaitingQuery => ({
          id: `wait_email_${email.id}`,
          name: email.fromName || email.fromEmail || 'Email Customer',
          avatar: email.avatar || '',
          email: email.fromEmail,
          // Keep the same customer-facing preview shown in the email header
          // as the first conversation message.
          message: email.preview || email.body || email.subject,
          channelType: 'email',
          pageName: 'Email Support',
          createdAt: email.receivedAt,
          priority: email.priority || 'medium',
          subject: email.subject,
          sourceEmailId: email.id,
          messageId: email.messageId,
          references: email.references,
          conversationId: email.conversationId,
          relationalPersistenceStatus: email.relationalPersistenceStatus,
        }));

      let activeOpenCount = conversationsRef.current.filter(
        (conversation) => (conversation.status === 'open' || conversation.status === 'pending') && conversation.assignedAgentId === currentUser.id
      ).length;
      const queuedEmails: WaitingQuery[] = [];

      incoming.forEach((query) => {
        if (emailSettings.autoLand && !isAgentPaused && activeOpenCount < landingLimit) {
          landQueryItem(query);
          activeOpenCount += 1;
        } else {
          queuedEmails.push(query);
        }
      });

      if (queuedEmails.length) {
        setWaitingQueue((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const existingEmailIds = new Set(prev.map((item) => item.sourceEmailId).filter(Boolean));
          const uniqueQueued = queuedEmails.filter((item) => !existingIds.has(item.id) && !existingEmailIds.has(item.sourceEmailId));
          return uniqueQueued.length ? [...prev, ...uniqueQueued] : prev;
        });
      }
    }
    addAuditLog('SYNC_IMAP_EMAILS', 'CustomerEmail', 'imap_sync', `Synced emails from live IMAP server`);
  };

  // Initial auto-sync with live IMAP mailbox
  useEffect(() => {
    // The email API is protected by authentication. Do not start IMAP sync
    // while the login screen is still active; that only creates an expected
    // 401 request before a session exists.
    if (!isLoggedIn || !emailSettings.enabled || !emailSettings.autoSync) return;

    const syncMailbox = () => {
      if (emailSyncInFlightRef.current) return;
      emailSyncInFlightRef.current = true;
      void emailApi.fetch(25)
        .then((data) => {
          if (data && data.success && Array.isArray(data.emails) && data.emails.length > 0) {
            mergeFetchedEmails(data.emails);
          }
        })
        .catch((err) => {
          console.error('Background IMAP sync failed:', err);
          setWorkspaceNotice(`Email sync failed: ${err?.message || 'Unable to reach the mailbox.'}`);
          window.setTimeout(() => setWorkspaceNotice(''), 5000);
        })
        .finally(() => { emailSyncInFlightRef.current = false; });
    };
    syncMailbox();
    const timer = setInterval(syncMailbox, 60_000);
    return () => clearInterval(timer);
  }, [isLoggedIn, emailSettings.enabled, emailSettings.autoSync, emailSettings.autoLand, isAgentPaused, landingLimit, currentUser.id]);

  // Keep one socket per logged-in session. Listener effects below may be
  // re-bound as UI state changes, but they must not tear down these sockets.
  useEffect(() => {
    if (socketDisconnectTimerRef.current) {
      clearTimeout(socketDisconnectTimerRef.current);
      socketDisconnectTimerRef.current = null;
    }
    if (!isLoggedIn) return;

    if (!inboxSocketRef.current) inboxSocketRef.current = channelApi.socket();
    if (!whatsappSocketRef.current) {
      whatsappSocketRef.current = whatsappApi.socket();
      setWhatsappSocket(whatsappSocketRef.current);
    }

    return () => {
      // A short grace period prevents React StrictMode's development
      // mount/cleanup/remount cycle from closing a socket that is still needed.
      socketDisconnectTimerRef.current = setTimeout(() => {
        inboxSocketRef.current?.disconnect();
        whatsappSocketRef.current?.disconnect();
        inboxSocketRef.current = null;
        whatsappSocketRef.current = null;
        setWhatsappSocket(null);
        socketDisconnectTimerRef.current = null;
      }, 250);
    };
  }, [isLoggedIn, currentUser.id]);

  // Receive persisted unread updates for the active Email/WhatsApp channels.
  useEffect(() => {
    if (!isLoggedIn) return;
    const socket = inboxSocketRef.current;
    if (!socket) return;
    const handleBadgeUpdate = (update: { channel: string; conversationId: string; unreadCount: number }) => {
      if (!['whatsapp', 'email'].includes(update.channel)) return;
      setConversations((previous) => previous.map((conversation) =>
        conversation.id === update.conversationId
          ? { ...conversation, unreadCount: update.unreadCount }
          : conversation
      ));
    };
    socket.on('badge:update', handleBadgeUpdate);
    return () => {
      socket.off('badge:update', handleBadgeUpdate);
    };
  }, [isLoggedIn]);

  // Receive real WhatsApp text messages without replacing the active selection.
  useEffect(() => {
    if (!isLoggedIn) return;
    const socket = whatsappSocketRef.current;
    if (!socket) return;
    const handleWhatsAppMessage = (incoming: WhatsAppIncomingMessage) => {
      if (isPromotionalMessage(incoming.content, incoming.senderName)) return;
      const createdAt = new Date(incoming.timestamp || Date.now()).toISOString();
      const inboundId = incoming.messageId || `wa_${incoming.senderId}_${incoming.timestamp}_${incoming.content}`;
      const normalizedPhone = normalizeWhatsAppPhone(incoming.senderId);
      const stableConversationId = incoming.conversationId || `conv_wa_${normalizedPhone}`;
      if (processedWhatsAppIdsRef.current.has(inboundId) || messagesRef.current.some((message) => message.id === `wa_msg_${inboundId}`)) return;
      processedWhatsAppIdsRef.current.add(inboundId);
      const existingConversation = conversationsRef.current.find((conversation) => conversation.channelType === 'whatsapp' && conversation.id === stableConversationId);
      const existingContactConversation = conversationsRef.current.find((conversation) => conversation.channelType === 'whatsapp' && normalizeWhatsAppPhone(conversation.contact.whatsappJid || conversation.contact.phone || '') === normalizedPhone);
      const activeOpenCount = conversationsRef.current.filter((conversation) => (conversation.status === 'open' || conversation.status === 'pending') && conversation.assignedAgentId === currentUser.id).length;
      if (!existingConversation && activeOpenCount >= landingLimit) {
        queueIncomingQuery({
          id: `wa_queue_${inboundId}`,
          name: incoming.senderName || 'WhatsApp Customer',
          avatar: '',
          email: `${incoming.senderId}@whatsapp.local`,
          phone: incoming.senderId.split('@')[0],
          message: incoming.content,
          channelType: 'whatsapp',
          pageName: pages.find((page) => page.channelType === 'whatsapp')?.name || 'WhatsApp Support',
          pageId: pages.find((page) => page.channelType === 'whatsapp')?.id,
          whatsappJid: incoming.senderId,
          createdAt,
          priority: 'medium',
        });
        playSoundChime();
        return;
      }
      let conversationId = '';
      let nextMessage: Message | null = null;

      setConversations((previous) => {
        const existing = previous.find((conversation) => conversation.channelType === 'whatsapp' && conversation.id === stableConversationId);
        if (existing) {
          conversationId = existing.id;
          nextMessage = {
            id: `wa_msg_${inboundId}`,
            conversationId,
            senderType: 'contact',
            senderId: existing.contactId,
            senderName: incoming.senderName,
            content: incoming.content,
            messageType: 'text',
            createdAt,
            isRead: selectedConversationId === conversationId,
            ...(incoming.relationalPersistenceStatus === 'workspace_only'
              ? { metadata: { relationalPersistenceStatus: 'workspace_only' } }
              : {}),
          };
          return previous.map((conversation) => conversation.id === conversationId ? {
            ...conversation,
            lastMessageAt: createdAt,
            lastMessageText: incoming.content,
            unreadCount: selectedConversationId === conversationId ? 0 : conversation.unreadCount + 1,
            status: conversation.status === 'closed' ? 'open' : conversation.status,
            summary: createConversationSummary(conversation, messagesRef.current.filter((message) => message.conversationId === conversationId && message.senderType === 'contact'), nextMessage || undefined),
          } : conversation);
        }

        // Legacy wa_conv_${Date.now()} conversations remain untouched. New
        // inbound messages use conv_wa_${phone}; contact identity is reused
        // by normalized phone so CRM notes/tags/history stay connected.
        conversationId = stableConversationId;
        const reusedContact = existingContactConversation?.contact;
        const contactId = existingContactConversation?.contactId || `wa_contact_${normalizedPhone}`;
        const newConversation: Conversation = {
          id: conversationId,
          convUid: `WA-${Date.now()}`,
          pageId: pages.find((page) => page.channelType === 'whatsapp')?.id || 'whatsapp',
          pageName: pages.find((page) => page.channelType === 'whatsapp')?.name || 'WhatsApp Support',
          channelType: 'whatsapp',
          contactId,
          contact: reusedContact
            ? { ...reusedContact, whatsappJid: incoming.senderId, phone: normalizedPhone }
            : { id: contactId, name: incoming.senderName, whatsappJid: incoming.senderId, phone: normalizedPhone, avatar: '', createdAt },
          assignedAgentId: currentUser.id,
          assignedAgent: currentUser,
          status: 'open',
          sentiment: 'neutral',
          tags: tags.length ? [tags[0]] : [],
          lastMessageAt: createdAt,
          lastMessageText: incoming.content,
          unreadCount: 1,
          createdAt,
          priority: 'medium',
        };
        nextMessage = {
          id: `wa_msg_${inboundId}`,
          conversationId,
          senderType: 'contact',
          senderId: contactId,
          senderName: incoming.senderName,
          content: incoming.content,
          messageType: 'text',
          createdAt,
          isRead: false,
          ...(incoming.relationalPersistenceStatus === 'workspace_only'
            ? { metadata: { relationalPersistenceStatus: 'workspace_only' } }
            : {}),
        };
        newConversation.summary = createConversationSummary(newConversation, [nextMessage]);
        return [newConversation, ...previous];
      });

      if (nextMessage) setMessages((previous) => [...previous, nextMessage as Message]);
      if (incoming.relationalPersistenceStatus === 'workspace_only' && conversationId) {
        addAuditLog(
          'RELATIONAL_PERSISTENCE_DRIFT',
          'Conversation',
          conversationId,
          `WhatsApp message ${inboundId} is currently available only in workspace state.`,
        );
      }
      if (conversationId) addAuditLog('WHATSAPP_MESSAGE_RECEIVED', 'Conversation', conversationId, `Received WhatsApp message from ${incoming.senderName}`);
      playSoundChime();
    };

    socket.on('whatsapp:message', handleWhatsAppMessage);
    const handleBadgeUpdate = (update: { channel: string; conversationId: string; unreadCount: number }) => {
      if (update.channel !== 'whatsapp') return;
      setConversations((previous) => previous.map((conversation) =>
        conversation.id === update.conversationId ? { ...conversation, unreadCount: update.unreadCount } : conversation
      ));
    };
    socket.on('badge:update', handleBadgeUpdate);
    return () => {
      socket.off('whatsapp:message', handleWhatsAppMessage);
      socket.off('badge:update', handleBadgeUpdate);
    };
  }, [isLoggedIn, selectedConversationId, currentUser.id, currentUser.name, currentUser.avatar, pages, tags, landingLimit]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoggedIn,
        whatsappSocket,
        login,
        logout,
        updateUserStatus,
        users,
        setUsers,
        currentRoute,
        navigateTo,
        adminSubTab,
        setAdminSubTab,
        activeTab,
        setActiveTab,
        conversations,
        selectedConversationId,
        setSelectedConversationId: selectConversation,
        selectedConversation,
        messages,
        conversationMessages,
        sendMessage,
        draftMessage,
        setDraftMessage,
        simulateIncomingMessage,
        assignConversation,
        toggleBookmark,
        pauseConversation,
        resumeConversation,
        updateConversationSentiment,
        addTagToConversation,
        removeTagFromConversation,
        endConversation,
        addConversationNote,
        channelFilter,
        setChannelFilter,
        statusFilter,
        setStatusFilter,
        searchQuery,
        setSearchQuery,
        pages,
        togglePageStatus,
        updatePageSettings,
        addPage,
        quickResponses,
        addQuickResponse,
        updateQuickResponse,
        deleteQuickResponse,
        incrementQuickResponseUsage,
        tags,
        addTag,
        deleteTag,
        slaRules,
        updateSLARule,
        auditLogs,
        addAuditLog,
        soundEnabled,
        setSoundEnabled,
        notificationCount,
        workspaceNotice,
        waitingQueue,
        landingLimit,
        setLandingLimit,
        isAgentPaused,
        toggleAgentPause,
        dropNextIncomingQuery,
        landNextQueryFromQueue,
        customerEmails,
        emailSettings,
        updateEmailSettings,
        markEmailRead,
        toggleEmailStar,
        updateEmailStatus,
        replyToCustomerEmail,
        convertEmailToConversationTicket,
        sendNewCustomerEmail,
        mergeFetchedEmails,
        createLiveChatVisitorConversation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
