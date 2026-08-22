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
  WaitingQuery,
  CustomerEmail,
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user_rifat',
    name: 'MD Rifat Molla',
    email: 'rifat.molla@petboxdesk.com',
    role: 'agent',
    status: 'online',
    statusStartedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    conversationsCount: 18,
    avgHandleTimeMinutes: 4.2,
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'user_nusrat',
    name: 'Nusrat Jahan',
    email: 'nusrat.j@petboxdesk.com',
    role: 'agent',
    status: 'online',
    statusStartedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    conversationsCount: 24,
    avgHandleTimeMinutes: 3.8,
    createdAt: '2024-02-01T09:30:00Z',
  },
  {
    id: 'user_tanvir',
    name: 'Tanvir Ahmed',
    email: 'tanvir.a@petboxdesk.com',
    role: 'supervisor',
    status: 'away',
    statusStartedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    conversationsCount: 12,
    avgHandleTimeMinutes: 5.1,
    createdAt: '2023-11-10T10:00:00Z',
  },
  {
    id: 'user_sabbir',
    name: 'Sabbir Hossain (Admin)',
    email: 'admin@petboxdesk.com',
    role: 'admin',
    status: 'online',
    statusStartedAt: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    conversationsCount: 5,
    avgHandleTimeMinutes: 2.5,
    createdAt: '2023-08-01T00:00:00Z',
  },
];

export const INITIAL_PAGES: PageChannel[] = [
  {
    id: 'page_petbox_fb',
    name: 'Petbox',
    channelType: 'facebook',
    pageAccessToken: 'EAAC...PETBOX_MESSENGER_VERIFIED',
    webhookVerifyToken: 'petbox_verify_token_secure_360',
    status: 'active',
    autoReplyMessage: 'ধন্যবাদ! আমাদের সকল প্রতিনিধি বর্তমানে ব্যস্ত আছেন। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন, দ্রুতই আপনার সাথে যোগাযোগ করা হবে।',
    settings: {
      themeColor: '#e11d48',
      welcomeMessage: 'নগদ কাস্টমার কেয়ার সার্ভিসে আপনাকে স্বাগতম। কিভাবে সাহায্য করতে পারি?',
      businessHours: '24/7 Live Support',
    },
  },
  {
    id: 'page_web_livechat',
    name: 'Petbox Website Widget',
    channelType: 'live_chat',
    status: 'active',
    settings: {
      themeColor: '#f97316',
      welcomeMessage: 'Hello! How can we assist with your transaction or account today?',
      position: 'bottom-right',
      headingTitle: 'Petbox Live Chat',
      businessHours: '9:00 AM - 11:00 PM',
    },
  },
  {
    id: 'page_email_support',
    name: 'Petbox Email Helpdesk',
    channelType: 'email',
    status: 'active',
    settings: {
      themeColor: '#0284c7',
      welcomeMessage: 'Thank you for reaching out. A ticket has been created.',
    },
  },
];

export const INITIAL_TAGS: Tag[] = [
  { id: 'tag_spam_other', name: 'SPAM_Q » Other » und...', category: 'type', color: '#64748b' },
  { id: 'tag_kyc', name: 'KYC_Verification', category: 'type', color: '#0284c7' },
  { id: 'tag_pin_reset', name: 'Self_PIN_Reset', category: 'type', color: '#8b5cf6' },
  { id: 'tag_deposit', name: 'Add_Money_Issue', category: 'type', color: '#f59e0b' },
  { id: 'tag_merchant', name: 'Merchant_Payment', category: 'type', color: '#10b981' },
  { id: 'tag_general', name: 'General_Inquiry', category: 'type', color: '#6366f1' },
  { id: 'tag_sentiment_neg', name: 'Negative_Feedback', category: 'sentiment', color: '#ef4444' },
  { id: 'tag_sentiment_pos', name: 'Satisfied_Customer', category: 'sentiment', color: '#22c55e' },
  { id: 'tag_urgent', name: 'Urgent_Resolution', category: 'status', color: '#dc2626' },
];

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'contact_milon',
    name: 'Milon Ahmed',
    facebookPsid: '24517170204544759',
    email: '24517170204544759@facebook.com',
    phone: '+880 1712-345678',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    notes: 'Customer inquiring about NID KYC update problem after app update.',
    createdAt: '2025-08-10T14:22:00Z',
    customerTier: 'Regular',
    location: 'Dhaka, Bangladesh',
  },
  {
    id: 'contact_sarah',
    name: 'Sarah Khan',
    email: 'sarah.k@gmail.com',
    phone: '+880 1819-876543',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    notes: 'Live chat visitor experiencing Add Money gateway timeout.',
    createdAt: '2025-08-12T08:15:00Z',
    customerTier: 'VIP',
    location: 'Chittagong, Bangladesh',
  },
  {
    id: 'contact_tanvir',
    name: 'Tanvir Hossain',
    facebookPsid: '9981240182371923',
    email: '9981240182371923@facebook.com',
    phone: '+880 1911-009988',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    notes: 'Requested PIN reset instructions in Bengali.',
    createdAt: '2025-08-11T11:00:00Z',
    customerTier: 'Regular',
    location: 'Sylhet, Bangladesh',
  },
  {
    id: 'contact_anika',
    name: 'Anika Tabassum',
    email: 'anika.t@outlook.com',
    phone: '+880 1622-443322',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    notes: 'Merchant onboarding query.',
    createdAt: '2025-08-09T16:40:00Z',
    customerTier: 'VIP',
    location: 'Dhaka, Bangladesh',
  },
  {
    id: 'contact_kamrul',
    name: 'Kamrul Islam',
    facebookPsid: '4410294820194829',
    email: 'kamrul.islam@yahoo.com',
    phone: '+880 1555-667788',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&auto=format&fit=crop&q=80',
    notes: 'Spam query or wrong number.',
    createdAt: '2025-08-12T10:00:00Z',
    customerTier: 'New',
    location: 'Rajshahi, Bangladesh',
  },
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg_1',
    conversationId: 'conv_milon',
    senderType: 'contact',
    senderId: 'contact_milon',
    senderName: 'Milon Ahmed',
    content: 'নগদ কে ওয়াই করার পর হচ্ছে না',
    messageType: 'text',
    createdAt: '2025-08-12T12:06:56Z',
    isRead: true,
  },
  {
    id: 'msg_2',
    conversationId: 'conv_milon',
    senderType: 'contact',
    senderId: 'contact_milon',
    senderName: 'Milon Ahmed',
    content: 'আপনার সমস্যাটির বিস্তারিত জানান',
    attachments: [
      {
        url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop&q=80',
        name: 'kyc_verification_doc.jpg',
        size: '1.2 MB',
        type: 'image/jpeg',
      },
    ],
    messageType: 'image',
    createdAt: '2025-08-12T12:07:30Z',
    isRead: true,
  },
  // Sarah Khan messages
  {
    id: 'msg_s1',
    conversationId: 'conv_sarah',
    senderType: 'contact',
    senderId: 'contact_sarah',
    senderName: 'Sarah Khan',
    content: 'Hello, I tried adding money from Visa card (BDT 5,000) but my account balance was debited without being credited in Petbox wallet.',
    messageType: 'text',
    createdAt: '2025-08-12T10:15:00Z',
    isRead: true,
  },
  {
    id: 'msg_s2',
    conversationId: 'conv_sarah',
    senderType: 'agent',
    senderId: 'user_rifat',
    senderName: 'MD Rifat Molla',
    content: 'Hello Sarah! We apologize for the inconvenience. Please share your transaction TRX ID and mobile number so we can verify the settlement immediately.',
    messageType: 'text',
    createdAt: '2025-08-12T10:16:30Z',
    isRead: true,
  },
  // Tanvir Hossain messages
  {
    id: 'msg_t1',
    conversationId: 'conv_tanvir',
    senderType: 'contact',
    senderId: 'contact_tanvir',
    senderName: 'Tanvir Hossain',
    content: 'আমি আমার পিন নম্বর ভুলে গেছি। কিভাবে রিসেট করব?',
    messageType: 'text',
    createdAt: '2025-08-12T09:30:00Z',
    isRead: true,
  },
  // Anika Tabassum messages
  {
    id: 'msg_a1',
    conversationId: 'conv_anika',
    senderType: 'contact',
    senderId: 'contact_anika',
    senderName: 'Anika Tabassum',
    content: 'We need QR code stand for our retail pharmacy outlet. What documents are needed for Petbox Merchant signup?',
    messageType: 'text',
    createdAt: '2025-08-12T08:00:00Z',
    isRead: true,
  },
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_milon',
    convUid: '4d3f0e448b9042ac8fd81564',
    pageId: 'page_petbox_fb',
    pageName: 'Petbox',
    channelType: 'facebook',
    contactId: 'contact_milon',
    contact: INITIAL_CONTACTS[0],
    assignedAgentId: 'user_rifat',
    assignedAgent: INITIAL_USERS[0],
    status: 'open',
    sentiment: 'negative',
    tags: [INITIAL_TAGS[0], INITIAL_TAGS[1]],
    lastMessageAt: '2025-08-12T12:07:30Z',
    lastMessageText: 'আমার এনআইডি সাবমিট করার পর ক্যামেরা ভেরিফিকেশন ফেইল দেখাচ্ছে...',
    unreadCount: 1,
    isBookmarked: true,
    createdAt: '2025-08-12T11:55:00Z',
    priority: 'high',
    notes: ['Customer was polite but frustrated by camera lighting issues during KYC.'],
  },
  {
    id: 'conv_sarah',
    convUid: '8e1b0c229f3147ba9c2d1190',
    pageId: 'page_petbox_fb',
    pageName: 'Petbox',
    channelType: 'facebook',
    contactId: 'contact_sarah',
    contact: INITIAL_CONTACTS[1],
    assignedAgentId: 'user_rifat',
    assignedAgent: INITIAL_USERS[0],
    status: 'open',
    sentiment: 'neutral',
    tags: [INITIAL_TAGS[3]],
    lastMessageAt: '2025-08-12T10:16:30Z',
    lastMessageText: 'Please share your transaction TRX ID and mobile number...',
    unreadCount: 0,
    isBookmarked: false,
    createdAt: '2025-08-12T10:10:00Z',
    priority: 'urgent',
    notes: ['Checked with bank gateway, pending manual recon batch #892.'],
  },
];

export const INITIAL_WAITING_QUEUE: WaitingQuery[] = [
  {
    id: 'wait_1',
    name: 'Farhana Yasmin',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    email: '92847194018274019@facebook.com',
    message: 'আমার নতুন এনআইডি কার্ড দিয়ে নগদ একাউন্ট ভেরিফিকেশন সফল হয়েছে কিনা জানাবেন।',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:08:00Z',
    priority: 'high',
  },
  {
    id: 'wait_2',
    name: 'Kamrul Islam',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    email: '18492049281740192@facebook.com',
    message: 'নগদ ইসলামিক একাউন্টে কোনো সেভিংস ইন্টারেস্ট বা অতিরিক্ত চার্জ আছে কি?',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:09:00Z',
    priority: 'medium',
  },
  {
    id: 'wait_3',
    name: 'Tania Sultana',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    email: '30491829401928471@facebook.com',
    message: 'সেন্ড মানি করতে গিয়ে ভুল নম্বরে টাকা চলে গেছে, এখন কি করণীয়?',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:09:30Z',
    priority: 'urgent',
  },
  {
    id: 'wait_4',
    name: 'Sumon Das',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    email: '29481729481029481@facebook.com',
    message: 'আমার নগদ একাউন্টে ক্যাশ আউট লিমিট শেষ হয়ে গেছে, কীভাবে বাড়াবো?',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:10:00Z',
    priority: 'medium',
  },
  {
    id: 'wait_5',
    name: 'Tanvir Hossain',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    email: '9981240182371923@facebook.com',
    message: 'আমি আমার পিন নম্বর ভুলে গেছি। কিভাবে রিসেট করব?',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:11:00Z',
    priority: 'medium',
  },
  {
    id: 'wait_6',
    name: 'Anika Tabassum',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    email: 'anika.t@outlook.com',
    message: 'We need QR code stand for our retail pharmacy outlet.',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:11:30Z',
    priority: 'low',
  },
  {
    id: 'wait_7',
    name: 'Sajid Hasan',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    email: '49102948192048192@facebook.com',
    message: 'মার্চেন্ট পেমেন্ট করার পর ট্রানজেকশন আইডি পেয়েছি কিন্তু ক্যাশব্যাক পাইনি।',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:12:00Z',
    priority: 'high',
  },
  {
    id: 'wait_8',
    name: 'Mitu Akter',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    email: '81729401928471029@facebook.com',
    message: 'বিদেশ থেকে রেমিট্যান্স এসেছে, নগদ একাউন্টে কীভাবে বোনাস পাবো?',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:12:30Z',
    priority: 'medium',
  },
  {
    id: 'wait_9',
    name: 'Rashedul Karim',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    email: '19482019482019482@facebook.com',
    message: 'ইউটিলিটি গ্যাস বিল পেমেন্ট পেন্ডিং দেখাচ্ছে ৩ ঘণ্টা ধরে।',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:13:00Z',
    priority: 'urgent',
  },
  {
    id: 'wait_10',
    name: 'Nusrat Jahan',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    email: 'nusrat.jahan@gmail.com',
    message: 'নগদ একাউন্ট টাইপ পার্সোনাল থেকে উদ্যোক্তা একাউন্টে কনভার্ট করা যাবে?',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:13:30Z',
    priority: 'medium',
  },
  {
    id: 'wait_11',
    name: 'Ariful Haque',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    email: '91827401928374019@facebook.com',
    message: 'কার্ড টু নগদ এড মানি করতে গিয়ে ওটিপি কোড পাচ্ছি না।',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:14:00Z',
    priority: 'high',
  },
  {
    id: 'wait_12',
    name: 'Sabrina Mostofa',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    email: 'sabrina.m@yahoo.com',
    message: 'নগদ ডিপিএস পলিসি কত বছরের জন্য সর্বোচ্চ চালু করা যায়?',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:14:30Z',
    priority: 'low',
  },
  {
    id: 'wait_13',
    name: 'Imran Hossain',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    email: '82940192847102938@facebook.com',
    message: 'ভুল পিন ৩ বার দেওয়ায় একাউন্ট লক হয়ে গেছে, আনলক করে দিন।',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:15:00Z',
    priority: 'urgent',
  },
  {
    id: 'wait_14',
    name: 'Priyanka Roy',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    email: 'priyanka.roy@gmail.com',
    message: 'মোবাইল রিচার্জ অফারে ২০% ক্যাশব্যাক পাবো কিনা জানতে চাই।',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:15:30Z',
    priority: 'low',
  },
  {
    id: 'wait_15',
    name: 'Mahmud Hasan',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    email: '71928401928471029@facebook.com',
    message: 'নগদ উদ্যোক্তা পয়েন্ট থেকে ক্যাশ আউট চার্জ কত শতাংশ?',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:16:00Z',
    priority: 'medium',
  },
  {
    id: 'wait_16',
    name: 'Jannatul Ferdous',
    avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80',
    email: 'jannat.ferdous@gmail.com',
    message: 'আমার নগদ একাউন্টে নমিনি তথ্য পরিবর্তন করতে কী কী ডকুমেন্টস লাগবে?',
    channelType: 'facebook',
    pageName: 'Petbox',
    createdAt: '2025-08-12T12:16:30Z',
    priority: 'medium',
  },
];

export const INITIAL_QUICK_RESPONSES: QuickResponse[] = [
  {
    id: 'qr_1',
    title: 'Bistartio B',
    content: 'প্রিয় গ্রাহক {customer_name}, আপনার সমস্যাটি বিস্তারিতভাবে আমাদের জানান যাতে আমরা আপনাকে যথাযথ সেবা প্রদান করতে পারি।',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/bistarito',
    usageCount: 142,
  },
  {
    id: 'qr_2',
    title: 'Bistartio E',
    content: 'Dear {customer_name}, could you please provide more details regarding your query so that we can assist you better?',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/details',
    usageCount: 88,
  },
  {
    id: 'qr_3',
    title: 'Short Opekkha B',
    content: 'অনুগ্রহ করে কিছু সময় অপেক্ষা করুন, আমরা তথ্যটি যাচাই করে জানাচ্ছি।',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/wait',
    usageCount: 230,
  },
  {
    id: 'qr_4',
    title: 'Short Opekkha E',
    content: 'Please allow us a moment while we verify the details with our core system.',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/waiten',
    usageCount: 95,
  },
  {
    id: 'qr_5',
    title: '2nd Short Opekkha B',
    content: 'ধৈর্য ধরে সাথে থাকার জন্য ধন্যবাদ। আপনার সমস্যাটির সমাধান প্রক্রিয়াধীন রয়েছে।',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/hold2',
    usageCount: 77,
  },
  {
    id: 'qr_6',
    title: 'Already Share B',
    content: 'আপনি পূর্বে যে তথ্য দিয়েছেন তা আমাদের কাছে সংরক্ষিত আছে। আমরা দ্রুততম সময়ে সমাধান দিচ্ছি।',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/shared',
    usageCount: 64,
  },
  {
    id: 'qr_7',
    title: 'Already Share E',
    content: 'We have received your previous details. Our team is actively reviewing your request.',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/shareden',
    usageCount: 41,
  },
  {
    id: 'qr_8',
    title: 'Self Pin Reset B',
    content: 'পিন রিসেট করতে নগদ অ্যাপের "পিন রিসেট" অপশন ব্যবহার করুন অথবা *167# ডায়াল করে পিন রিসেট নির্দেশনা অনুসরণ করুন।',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/pinb',
    usageCount: 512,
  },
  {
    id: 'qr_9',
    title: 'Self Pin Reset E',
    content: 'To reset your PIN, please use the "Reset PIN" option in the Petbox app or dial *167# from your registered SIM.',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/pinen',
    usageCount: 320,
  },
  {
    id: 'qr_10',
    title: 'Pin policy B',
    content: 'নগদ কখনো আপনার ওটিপি (OTP) বা পিন নম্বর জানতে চাইবে না। অনুগ্রহ করে কারও সাথে এটি শেয়ার করবেন না।',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/security',
    usageCount: 410,
  },
  {
    id: 'qr_11',
    title: 'Pin Policy E',
    content: 'Petbox representatives will NEVER ask for your PIN or OTP. Never share your security credentials with anyone.',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/securityen',
    usageCount: 198,
  },
  {
    id: 'qr_12',
    title: 'Punorai Jogajog B',
    content: 'অন্য কোনো তথ্যের জন্য আমাদের সাথে পুনরায় যোগাযোগ করার অনুরোধ রইল। নগদ-এর সাথে থাকার জন্য ধন্যবাদ!',
    category: 'mine',
    createdBy: 'user_rifat',
    shortcutKey: '/thanks',
    usageCount: 650,
  },
];

export const INITIAL_SLA_RULES: SLARule[] = [
  {
    id: 'sla_fb',
    name: 'Facebook Messenger Standard SLA',
    channelType: 'facebook',
    responseTimeMinutes: 2,
    resolutionTimeMinutes: 15,
    escalateToAgentId: 'user_tanvir',
    isActive: true,
  },
  {
    id: 'sla_livechat',
    name: 'Live Chat Fast Response',
    channelType: 'live_chat',
    responseTimeMinutes: 1,
    resolutionTimeMinutes: 10,
    escalateToAgentId: 'user_tanvir',
    isActive: true,
  },
  {
    id: 'sla_email',
    name: 'Email Support 4-Hour Rule',
    channelType: 'email',
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 240,
    escalateToAgentId: 'user_sabbir',
    isActive: true,
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_1',
    userId: 'user_rifat',
    userName: 'MD Rifat Molla',
    action: 'ASSIGN_CONVERSATION',
    targetType: 'Conversation',
    targetId: 'conv_milon',
    details: 'Claimed conversation from unassigned queue',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'log_2',
    userId: 'user_rifat',
    userName: 'MD Rifat Molla',
    action: 'TAG_UPDATE',
    targetType: 'Conversation',
    targetId: 'conv_milon',
    details: 'Applied tag "SPAM_Q » Other » und..." and "KYC_Verification"',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: 'log_3',
    userId: 'user_sabbir',
    userName: 'Sabbir Hossain (Admin)',
    action: 'RESOLVE_CONVERSATION',
    targetType: 'Conversation',
    targetId: 'conv_anika',
    details: 'Resolved with sentiment "positive" and tag "Merchant_Payment"',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log_4',
    userId: 'user_sabbir',
    userName: 'Sabbir Hossain (Admin)',
    action: 'PAGE_SETTING_UPDATE',
    targetType: 'PageChannel',
    targetId: 'page_petbox_fb',
    details: 'Updated auto-reply message for peak hours',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

export const INITIAL_CUSTOMER_EMAILS: CustomerEmail[] = [
  {
    id: 'eml_1',
    ticketNumber: 'NGD-EML-48201',
    fromName: 'Farhan Ahmed',
    fromEmail: 'farhan.ahmed.eng@gmail.com',
    toEmail: 'support@petbox.com.bd',
    subject: 'Urgent: Refund Request for failed Merchant Payment TRX#8921849',
    preview: 'I made a payment of BDT 4,500 at Shwapno outlet using Petbox QR. The amount was deducted from my account but merchant POS showed timeout...',
    body: `Dear Petbox Customer Care Team,

I am writing to formally report an issue regarding a failed merchant transaction.

Transaction Details:
- Date & Time: 21 August 2025, 04:35 PM
- Amount: BDT 4,500.00
- Sender Account: 01712-998877
- Merchant: Shwapno Superstore (Gulshan-1 Outlet)
- TRX ID: 8921849A7B9

My Petbox wallet balance was deducted immediately with confirmation SMS, but the merchant POS system printed a "Transaction Failed / Gateway Timeout" receipt. I had to pay cash again to receive my groceries.

Attached please find the POS receipt copy and my bank/Petbox SMS screenshot. Kindly process the refund to my Petbox account as soon as possible.

Best regards,
Farhan Ahmed
Contact: +880 1712-998877`,
    receivedAt: '2025-08-21T06:52:00Z',
    isRead: false,
    isStarred: true,
    status: 'new',
    priority: 'urgent',
    category: 'Refund / Failed TRX',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    threadCount: 2,
    hasAttachment: true,
    attachments: [
      { name: 'POS_Failure_Receipt.jpg', size: '840 KB', type: 'image/jpeg' },
      { name: 'Petbox_SMS_Debit.png', size: '420 KB', type: 'image/png' },
    ],
    accountNumber: '01712-998877',
  },
  {
    id: 'eml_2',
    ticketNumber: 'NGD-EML-48202',
    fromName: 'Tasnim Corporate Ltd (HR)',
    fromEmail: 'payroll.admin@tasnimapparel.com.bd',
    toEmail: 'corporate@petbox.com.bd',
    subject: 'Monthly Bulk Salary Disbursement API Batch Upload Inquiry',
    preview: 'We need confirmation regarding the daily limit for B2C bulk payroll transfer for 1,200 garment factory workers this month...',
    body: `Dear Petbox Corporate Banking Services,

We are preparing the monthly salary disbursement for August 2025 for our 1,200 factory workers through the Petbox Corporate Disbursement Portal.

Could you please verify our Corporate Portal daily throughput limit and verify if the bulk file format Excel template has received any updates for this quarter?

Kindly assign a corporate key account manager to assist us with the batch execution scheduled for tomorrow morning.

Thank you.

Warm regards,
Md. Kamrul Hasan
Head of Payroll & HR Operations
Tasnim Corporate Apparel Ltd.
Mobile: +880 1819-334455`,
    receivedAt: '2025-08-21T06:40:00Z',
    isRead: false,
    isStarred: true,
    status: 'in_progress',
    priority: 'high',
    category: 'Corporate',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    threadCount: 3,
    hasAttachment: true,
    attachments: [
      { name: 'Payroll_Disbursement_Schedule.pdf', size: '1.8 MB', type: 'application/pdf' },
    ],
    accountNumber: '01819-334455',
  },
  {
    id: 'eml_3',
    ticketNumber: 'NGD-EML-48203',
    fromName: 'Dr. Shahriar Kabir',
    fromEmail: 'shahriar.kabir@bsp-hospital.org',
    toEmail: 'support@petbox.com.bd',
    subject: 'NID Update & Biometric Re-verification after SIM Replacement',
    preview: 'I recently replaced my registered Teletalk SIM card. The app now asks for biometric re-verification but is stuck at the camera stage...',
    body: `Hello Petbox Support,

I am Dr. Shahriar Kabir from Dhaka Medical.

After replacing my SIM card due to damage, my Petbox app prompted for biometric re-verification with Smart NID card. I tried taking the selfie multiple times in bright daylight, but the facial match algorithms return "Verification Failed (Code: ERR_BIO_902)".

My registered Petbox number: 01552-445566
Smart NID Number: 1982740192847

Could you please reset my verification session from backend so I can proceed smoothly, or let me know if I need to visit a Petbox Sheba center in person?

Regards,
Dr. Shahriar Kabir`,
    receivedAt: '2025-08-21T06:15:00Z',
    isRead: true,
    isStarred: false,
    status: 'in_progress',
    priority: 'high',
    category: 'KYC & Account Unlock',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    threadCount: 1,
    hasAttachment: false,
    accountNumber: '01552-445566',
  },
  {
    id: 'eml_4',
    ticketNumber: 'NGD-EML-48204',
    fromName: 'Shirin Rahman',
    fromEmail: 'shirin.rahman@brac.net',
    toEmail: 'support@petbox.com.bd',
    subject: 'Petbox-Islamic DPS Monthly Installment Auto-Debit Inquiry',
    preview: 'I have started a 3-year Shariah compliant DPS scheme with Dhaka Bank via Petbox. I want to know the exact auto-debit cycle date...',
    body: `Dear Petbox Islamic Team,

I subscribed to the 3-Year Mudaraba Monthly DPS Scheme with Dhaka Bank via Petbox App (Monthly Installment: BDT 2,000).

I would like to clarify:
1. What is the grace period if my wallet balance is insufficient on the exact due date?
2. Can I deposit advance installments for 3 months at once?
3. How can I download the tax certificate for my DPS investment?

Looking forward to your kind guidance.

Sincerely,
Shirin Rahman
Senior Program Officer, BRAC`,
    receivedAt: '2025-08-21T05:30:00Z',
    isRead: true,
    isStarred: false,
    status: 'waiting_customer',
    priority: 'medium',
    category: 'General Query',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    threadCount: 4,
    hasAttachment: false,
    accountNumber: '01912-887766',
  },
  {
    id: 'eml_5',
    ticketNumber: 'NGD-EML-48205',
    fromName: 'Mehedi Hasan (Merchant)',
    fromEmail: 'contact@gadgetzonebd.com',
    toEmail: 'merchant-help@petbox.com.bd',
    subject: 'Request for Dynamic QR Stand and Merchant Payment Gateway Plugin',
    preview: 'We operate an e-commerce shop and 2 retail branches. We would like to integrate Petbox Checkout API on our WooCommerce store...',
    body: `Dear Petbox Merchant Operations,

We run GadgetZone BD (Trade License: TRAD/DNCC/092182/2024). We want to sign up as an official Petbox Merchant.

Requirements:
1. Online Payment Gateway (Petbox PG) for our WooCommerce website.
2. 2 Physical Dynamic Soundbox QR stands for our Dhanmondi & Banani showrooms.

All business documents (Trade License, TIN, BIN, Bank Solvency Certificate) are ready for submission.

Please let us know the contact details of the Merchant Relationship Manager assigned to the Dhanmondi zone.

Thank you,
Mehedi Hasan
Proprietor, GadgetZone BD
Phone: +880 1711-223344`,
    receivedAt: '2025-08-21T04:45:00Z',
    isRead: true,
    isStarred: true,
    status: 'new',
    priority: 'medium',
    category: 'Merchant Support',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    threadCount: 1,
    hasAttachment: true,
    attachments: [
      { name: 'Trade_License_2024_2025.pdf', size: '2.4 MB', type: 'application/pdf' },
      { name: 'BIN_Certificate.pdf', size: '920 KB', type: 'application/pdf' },
    ],
    accountNumber: '01711-223344',
  },
  {
    id: 'eml_6',
    ticketNumber: 'NGD-EML-48206',
    fromName: 'Nasrin Sultana',
    fromEmail: 'nasrin.sultana99@yahoo.com',
    toEmail: 'support@petbox.com.bd',
    subject: 'Wrong Send Money Recovery Request (TRX: 9912048201)',
    preview: 'By mistake I sent BDT 3,000 to 01799-123456 instead of 01799-123465. The recipient number appears inactive...',
    body: `Dear Sir/Madam,

Today at 10:15 AM, while sending money to my mother, I accidentally mistyped one digit in the recipient mobile number.

Details:
- Sent to: 01799-123456 (Wrong Number)
- Intended Number: 01799-123465
- Amount: BDT 3,000.00
- TRX ID: 9912048201
- Date: 21 August 2025

I have called the wrong number multiple times but it says "The number you have dialed is currently powered off". As per Bangladesh Bank guidelines for MFS wrong transactions, I request you to please hold the amount and help reverse it.

Gratefully,
Nasrin Sultana
Mobile: +880 1823-990011`,
    receivedAt: '2025-08-21T03:10:00Z',
    isRead: false,
    isStarred: true,
    status: 'new',
    priority: 'urgent',
    category: 'Refund / Failed TRX',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    threadCount: 1,
    hasAttachment: false,
    accountNumber: '01823-990011',
  },
];
