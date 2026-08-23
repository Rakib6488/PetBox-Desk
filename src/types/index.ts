export type AppRoute =
  | '/login'
  | '/agent/inbox'
  | '/agent/assigned'
  | '/agent/bookmarked'
  | '/agent/summary'
  | '/admin/summary/all'
  | '/admin/summary/agents'
  | '/agent/team'
  | '/admin/dashboard'
  | '/admin/agents'
  | '/admin/pages'
  | '/admin/tags'
  | '/admin/quick-responses'
  | '/admin/sla'
  | '/admin/audit-logs'
  | '/admin/roles'
  | '/admin/settings'
  | '/bi/summary'
  | '/bi/categories'
  | '/bi/sentiment'
  | '/bi/agent-performance'
  | '/bi/channel-performance'
  | '/bi/peak-hours'
  | '/bi/sla-compliance'
  | '/bi/repeat-contacts'
  | '/bi/custom-reports'
  | '/dev-tools/fb-webhook-simulator'
  | '/dev-tools/livechat-simulator'
  | '/customer-website';

export type UserRole = 'admin' | 'supervisor' | 'agent' | 'bi';
export type AgentStatus = 'online' | 'away' | 'break' | 'offline' | 'disabled';
export type ChannelType = 'facebook' | 'live_chat' | 'email' | 'whatsapp';
export type ConversationStatus = 'open' | 'pending' | 'paused' | 'closed';
export type SentimentType = 'positive' | 'negative' | 'neutral';
export type SenderType = 'agent' | 'contact' | 'system';
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'audio' | 'product_card';
export type QuickResponseCategory = 'favorite' | 'admin' | 'mine';
export type TagCategory = 'type' | 'sentiment' | 'status' | 'general';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AgentStatus;
  statusStartedAt: string;
  avatar: string;
  conversationsCount?: number;
  avgHandleTimeMinutes?: number;
  createdAt: string;
}

export interface PageChannel {
  id: string;
  name: string;
  channelType: ChannelType;
  pageAccessToken?: string;
  webhookVerifyToken?: string;
  status: 'active' | 'paused';
  pauseReason?: string;
  pausedBy?: string;
  pausedAt?: string;
  autoReplyMessage?: string;
  settings?: {
    themeColor?: string;
    welcomeMessage?: string;
    position?: 'bottom-right' | 'bottom-left';
    businessHours?: string;
    headingTitle?: string;
    avatarUrl?: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  facebookPsid?: string;
  whatsappJid?: string;
  email?: string;
  phone?: string;
  avatar: string;
  notes?: string;
  createdAt: string;
  location?: string;
  customerTier?: 'VIP' | 'Regular' | 'New';
}

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
  color: string;
}

export interface MessageAttachment {
  url: string;
  name: string;
  size?: string;
  type?: string;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  attachments?: MessageAttachment[];
  messageType: MessageType;
  createdAt: string;
  isRead?: boolean;
  metadata?: Record<string, any>;
}

export interface WaitingQuery {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone?: string;
  message: string;
  channelType: ChannelType;
  pageName: string;
  createdAt: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  subject?: string;
  sourceEmailId?: string;
  messageId?: string;
  references?: string;
}

export interface CustomerEmail {
  id: string;
  ticketNumber: string; // e.g. NGD-EML-48201
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  isStarred?: boolean;
  status: 'new' | 'in_progress' | 'waiting_customer' | 'resolved';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'Refund / Failed TRX' | 'KYC & Account Unlock' | 'Merchant Support' | 'Corporate' | 'General Query';
  avatar?: string;
  threadCount?: number;
  hasAttachment?: boolean;
  attachments?: { name: string; size: string; type: string }[];
  assignedAgentName?: string;
  accountNumber?: string;
  messageId?: string;
  references?: string;
}

export interface EmailOperationsSettings {
  enabled: boolean;
  autoSync: boolean;
  autoLand: boolean;
  allowReplies: boolean;
}

export interface ConversationSummary {
  text: string;
  customerMessageCount: number;
  lastCustomerMessage: string;
  lastCustomerMessageAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  convUid: string; // e.g. 4d3f0e448b9042ac8fd81564
  pageId: string;
  pageName: string;
  channelType: ChannelType;
  contactId: string;
  contact: Contact;
  subject?: string;
  sourceEmailId?: string;
  emailMessageId?: string;
  emailReferences?: string;
  assignedAgentId?: string;
  assignedAgent?: User;
  status: ConversationStatus;
  sentiment?: SentimentType;
  tags: Tag[];
  lastMessageAt: string;
  landedAt?: string;
  slaDueAt?: string;
  firstResponseAt?: string;
  lastMessageText: string;
  unreadCount: number;
  isBookmarked?: boolean;
  pausedReason?: string;
  pausedAt?: string;
  pausedBy?: string;
  resolvedAt?: string;
  closedByAgentId?: string;
  createdAt: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  slaBreach?: boolean;
  notes?: string[];
  summary?: ConversationSummary;
}

export interface QuickResponse {
  id: string;
  title: string;
  content: string;
  category: QuickResponseCategory;
  createdBy: string;
  isFavorite?: boolean;
  shortcutKey?: string; // e.g. /selfpin
  usageCount?: number;
}

export interface AgentStatusLog {
  id: string;
  agentId: string;
  agentName: string;
  status: AgentStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface SLARule {
  id: string;
  name: string;
  channelType: ChannelType | 'all';
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalateToAgentId?: string;
  isActive: boolean;
}

export interface ReportFilter {
  dateRange: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'custom';
  agentId?: string;
  channel?: ChannelType | 'all';
  tagId?: string;
  sentiment?: SentimentType | 'all';
}
