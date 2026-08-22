import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageChannel, User, Tag, QuickResponse, SLARule, UserRole } from '../../types';
import { adminApi } from '../../features/admin/adminApi';
import {
  Users,
  Layers,
  FileText,
  Shield,
  Clock,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Code,
  Palette,
  Sparkles,
  Bot,
  Sliders,
  Check,
  Tag as TagIcon,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'agents'
  | 'pages'
  | 'tags'
  | 'quick_responses'
  | 'sla'
  | 'audit_logs'
  | 'roles'
  | 'settings';

const ROLE_SUMMARIES: Array<{ role: UserRole; label: string; description: string }> = [
  { role: 'admin', label: 'Admin', description: 'Full workspace configuration and oversight.' },
  { role: 'supervisor', label: 'Supervisor', description: 'Team supervision and operational support.' },
  { role: 'agent', label: 'Agent', description: 'Handles customer conversations and follow-ups.' },
  { role: 'bi', label: 'BI User', description: 'Read-only analytics and report exports.' },
];

const PERMISSIONS: Array<{ label: string; category: 'Configuration' | 'Reporting & Analytics'; roles: UserRole[] }> = [
  { label: 'Manage agents', category: 'Configuration', roles: ['admin', 'supervisor'] },
  { label: 'Connect pages', category: 'Configuration', roles: ['admin'] },
  { label: 'Edit tags', category: 'Configuration', roles: ['admin', 'supervisor'] },
  { label: 'View BI Portal', category: 'Reporting & Analytics', roles: ['bi'] },
  { label: 'Export reports', category: 'Reporting & Analytics', roles: ['bi'] },
];

export const AdminPortal: React.FC = () => {
  const {
    users,
    setUsers,
    pages,
    togglePageStatus,
    updatePageSettings,
    addPage,
    tags,
    addTag,
    deleteTag,
    quickResponses,
    addQuickResponse,
    deleteQuickResponse,
    slaRules,
    updateSLARule,
    auditLogs,
    conversations,
    waitingQueue,
    customerEmails,
    emailSettings,
    updateEmailSettings,
    landingLimit,
    setLandingLimit,
    assignConversation,
    adminSubTab,
    setAdminSubTab,
    navigateTo,
  } = useApp();

  const activeTab = adminSubTab;
  const supportUsers = users.filter((user) => user.role === 'agent' || user.role === 'supervisor');
  const openTickets = conversations.filter((conversation) => conversation.status === 'open').length;
  const activeChannels = pages.filter((page) => page.status === 'active').length;

  // Agent modal state
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [agentRole, setAgentRole] = useState<'agent' | 'supervisor' | 'admin'>('agent');
  const [agentError, setAgentError] = useState('');

  // Tag modal state
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#0D9488');
  const [tagCategory, setTagCategory] = useState<'type' | 'sentiment' | 'status'>('type');

  // Live Chat Widget Customizer state
  const [widgetThemeColor, setWidgetThemeColor] = useState('#F97316');
  const [widgetWelcomeMsg, setWidgetWelcomeMsg] = useState(
    'নগদ লাইভ চ্যাটে আপনাকে স্বাগতম। কিভাবে সাহায্য করতে পারি?'
  );
  const [widgetTitle, setWidgetTitle] = useState('Petbox Desk Live Support');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Facebook connection state
  const [fbConnectModalOpen, setFbConnectModalOpen] = useState(false);
  const [newFbPageName, setNewFbPageName] = useState('Petbox Customer Hub');

  // Pause page modal state
  const [pausePageId, setPausePageId] = useState<string | null>(null);
  const [pagePauseReason, setPagePauseReason] = useState('System maintenance & staff training');
  const [pageAutoReply, setPageAutoReply] = useState(
    'আমাদের সকল এজেন্ট এই মুহূর্তে ব্যস্ত আছেন। শীঘ্রই আপনার মেসেজের উত্তর দেওয়া হবে।'
  );

  const handleAddAgent = async () => {
    if (!agentName.trim() || !agentEmail.trim() || !agentPassword) return;
    setAgentError('');
    try {
      const { user: newAgent } = await adminApi.createUser({ name: agentName, email: agentEmail, password: agentPassword, role: agentRole });
      setUsers((prev) => [...prev.filter((user) => user.id !== newAgent.id), newAgent]);
      setAgentModalOpen(false);
      setAgentName('');
      setAgentEmail('');
      setAgentPassword('');
    } catch (error: any) {
      setAgentError(error?.message || 'Unable to create user.');
    }
  };

  const handleAddTag = () => {
    if (!tagName.trim()) return;
    addTag({
      name: tagName.trim(),
      color: tagColor,
      category: tagCategory,
    });
    setTagModalOpen(false);
    setTagName('');
  };

  const handleConnectFbPage = () => {
    if (!newFbPageName.trim()) return;
    addPage({
      name: newFbPageName.trim(),
      channelType: 'facebook',
      pageAccessToken: `EAAC...FB_PAGE_TOKEN_${Date.now()}`,
      webhookVerifyToken: 'verify_token_360',
      status: 'active',
      autoReplyMessage: 'ধন্যবাদ, আমরা দ্রুতই আপনার সাথে যোগাযোগ করব।',
      settings: {
        themeColor: '#1877F2',
      },
    });
    setFbConnectModalOpen(false);
  };

  const embedScriptCode = `<script 
  src="https://cdn.petboxdesk.com/widget/v1/widget.js" 
  data-page-id="${pages[1]?.id || 'page_web_livechat'}" 
  data-theme="${widgetThemeColor}"
  async>
</script>`;

  return (
    <div className="flex-1 min-w-0 w-full bg-slate-50 overflow-x-hidden overflow-y-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6 select-none">
      {/* Left Admin Navigation */}
      <div className="w-full md:w-64 md:shrink-0 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-4 self-start">
        {/* Tab Navigation */}
        <div className="flex min-w-0 max-w-full flex-col items-stretch gap-1 border-t border-slate-100 pt-3 text-xs font-semibold">
          {[
            { id: 'overview', route: '/admin/dashboard', label: 'Dashboard', icon: Settings },
            { id: 'agents', route: '/admin/agents', label: 'Agents', icon: Users },
            { id: 'pages', route: '/admin/pages', label: 'Pages', icon: Layers },
            { id: 'tags', route: '/admin/tags', label: 'Tags', icon: TagIcon },
            { id: 'quick-responses', route: '/admin/quick-responses', label: 'Quick Responses', icon: FileText },
            { id: 'sla', route: '/admin/sla', label: 'SLA', icon: Shield },
            { id: 'audit-logs', route: '/admin/audit-logs', label: 'Audit Logs', icon: Shield },
            { id: 'roles', route: '/admin/roles', label: 'Roles & Permissions', icon: Shield },
            { id: 'settings', route: '/admin/settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab.route as any)}
                className={`w-full px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap text-left transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-6">
      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Agents</span>
              <p className="text-2xl font-black text-slate-800 mt-1">
                {supportUsers.filter((u) => u.status === 'online').length} / {supportUsers.length}
              </p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">Ready for queries</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Connected Pages</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{activeChannels} / {pages.length}</p>
              <p className="text-xs text-teal-600 font-semibold mt-1">Active channels</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Tickets</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{conversations.length}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {openTickets} currently open
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Quick Responses</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{quickResponses.length}</p>
              <p className="text-xs text-indigo-600 font-semibold mt-1">Templates active</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Waiting Queue</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{waitingQueue.length}</p>
              <p className="text-xs text-amber-600 font-semibold mt-1">Live incoming queries</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Users className="h-4 w-4 text-teal-600" /> Incoming Query Control</h3>
                  <p className="mt-1 text-xs text-slate-500">Set how many open or pending queries can land for an agent at once.</p>
                </div>
                <input type="number" min={1} max={20} value={landingLimit} onChange={(event) => setLandingLimit(Number(event.target.value))} className="w-20 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-sm font-bold text-slate-800" />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 text-xs"><span className="font-semibold text-teal-800">Configured active query limit</span><span className="font-black text-teal-700">{landingLimit} per agent</span></div>
              <p className="mt-2 text-[11px] text-slate-400">New queries above this limit remain in the waiting queue and are persisted in PostgreSQL.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Shield className="h-4 w-4 text-teal-600" /> Assign Landed Queries</h3>
              <p className="mt-1 text-xs text-slate-500">Admin can reassign active landed conversations to any support agent.</p>
              <div className="mt-3 max-h-44 space-y-2 overflow-y-auto">
                {conversations.filter((conversation) => conversation.status === 'open' || conversation.status === 'pending').slice(0, 8).map((conversation) => (
                  <div key={conversation.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
                    <div className="min-w-0"><p className="truncate font-bold text-slate-800">{conversation.contact.name}</p><p className="text-[10px] capitalize text-slate-400">{conversation.channelType} · {conversation.status}</p></div>
                    <select value={conversation.assignedAgentId || ''} onChange={(event) => assignConversation(conversation.id, event.target.value)} className="max-w-[140px] rounded-md border border-slate-200 bg-white p-1.5 text-[11px] text-slate-700"><option value="" disabled>Assign agent</option>{supportUsers.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select>
                  </div>
                ))}
                {conversations.filter((conversation) => conversation.status === 'open' || conversation.status === 'pending').length === 0 && <p className="py-4 text-center text-xs text-slate-400">No active landed queries.</p>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileText className="h-4 w-4 text-teal-600" /> Customer Message Summaries</h3><p className="mt-1 text-xs text-slate-500">Saved summaries generated from Agent Portal customer messages.</p></div><span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700">{conversations.filter((conversation) => conversation.summary).length} saved</span></div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {conversations.filter((conversation) => conversation.summary).slice(0, 6).map((conversation) => <div key={conversation.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold text-slate-800">{conversation.contact.name}</p><span className="text-[10px] text-slate-400">{conversation.summary?.customerMessageCount} msgs</span></div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-600">{conversation.summary?.text}</p></div>)}
              {conversations.filter((conversation) => conversation.summary).length === 0 && <p className="col-span-full py-4 text-center text-xs text-slate-400">Customer summaries will appear as messages arrive.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Real-time Agent Status Board */}
            <div className="min-w-0 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" /> Real-time Support Agent Roster
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {supportUsers.map((u) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-slate-800">{u.name}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{u.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          u.status === 'online'
                            ? 'bg-emerald-100 text-emerald-700'
                            : u.status === 'away'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.status}
                      </span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {u.conversationsCount || 0} chats
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Channels Status Board */}
            <div className="min-w-0 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" /> Channel Ingest & Health
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {pages.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{p.channelType} channel</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {p.status === 'active' ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Agents */}
      {activeTab === 'agents' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" /> Support Agents & Supervisors
            </h3>
            <button
              onClick={() => setAgentModalOpen(true)}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Agent
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Agent Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Conversations Handled</th>
                  <th className="py-3 px-4">Avg Handle Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 flex items-center gap-2.5">
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <span className="font-bold text-slate-800">{u.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{u.email}</td>
                    <td className="py-3 px-4 capitalize font-bold text-slate-700">{u.role}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          u.status === 'online'
                            ? 'bg-emerald-100 text-emerald-700'
                            : u.status === 'away'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {u.conversationsCount || 0}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {u.avgHandleTimeMinutes || 3.5} mins
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Pages & Channels */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" /> Connected Social Channels & Pages
              </h3>

              <button
                onClick={() => setFbConnectModalOpen(true)}
                className="px-3 py-1.5 bg-[#1877F2] text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Connect Facebook Page (OAuth)
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {pages.map((p) => (
                <div key={p.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-bold text-[10px]">
                        {p.channelType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {p.status === 'active' ? 'Operational' : 'Paused'}
                      </span>
                    </div>

                    <p className="text-slate-500 text-[11px] mt-1">
                      Auto-reply message:{' '}
                      <span className="italic text-slate-700">"{p.autoReplyMessage}"</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.status === 'active' ? (
                      <button
                        onClick={() => {
                          setPausePageId(p.id);
                        }}
                        className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 flex items-center gap-1"
                      >
                        <Pause className="w-3 h-3" /> Pause Channel
                      </button>
                    ) : (
                      <button
                        onClick={() => togglePageStatus(p.id)}
                        className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Resume Channel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Chat Widget Customizer & Embed Code Generator */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" /> Website Live Chat Widget Settings & Embed Code
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Widget Heading Title
                  </label>
                  <input
                    type="text"
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Welcome Greeting Message
                  </label>
                  <textarea
                    rows={2}
                    value={widgetWelcomeMsg}
                    onChange={(e) => setWidgetWelcomeMsg(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Brand Theme Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={widgetThemeColor}
                      onChange={(e) => setWidgetThemeColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-slate-600">{widgetThemeColor}</span>
                  </div>
                </div>
              </div>

              {/* Embed Script Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-teal-600" /> Embeddable Javascript Snippet
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(embedScriptCode);
                      setCopiedSnippet(true);
                      setTimeout(() => setCopiedSnippet(false), 2000);
                    }}
                    className="text-[11px] text-teal-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedSnippet ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                <pre className="p-3 bg-slate-900 text-teal-400 rounded-lg text-[11px] font-mono overflow-x-auto">
                  {embedScriptCode}
                </pre>
                <p className="text-[11px] text-slate-500">
                  Paste this snippet right before the closing <code className="text-rose-500 font-mono">&lt;/body&gt;</code> tag on your website.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Tags Manager */}
      {activeTab === 'tags' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-teal-600" /> Conversation Category & Sentiment Tags
            </h3>
            <button
              onClick={() => setTagModalOpen(true)}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Create New Tag
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {tags.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: t.color }}
                  />
                  <div>
                    <p className="font-bold text-slate-800 truncate max-w-[150px]">{t.name}</p>
                    <span className="text-[10px] text-slate-400 capitalize">{t.category}</span>
                  </div>
                </div>

                <button
                  onClick={() => deleteTag(t.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                  title="Delete Tag"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Quick Responses */}
      {(activeTab === 'quick_responses' || activeTab === 'quick-responses') && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" /> Response Templates & Canned Answers
            </h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {quickResponses.map((qr) => (
              <div key={qr.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{qr.title}</span>
                    <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold capitalize">
                      {qr.category}
                    </span>
                    {qr.shortcutKey && (
                      <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                        {qr.shortcutKey}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">{qr.content}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Used {qr.usageCount || 0} times
                  </p>
                </div>

                <button
                  onClick={() => deleteQuickResponse(qr.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Delete Template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SLA Rules */}
      {activeTab === 'sla' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" /> Service Level Agreement (SLA) & Escalations
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {slaRules.map((sla) => (
              <div
                key={sla.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{sla.name}</span>
                    <span className="px-2 py-0.2 rounded bg-slate-200 text-slate-700 uppercase font-bold text-[10px]">
                      {sla.channelType}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-slate-600 text-[11px]">
                    <span>
                      Max First Response:{' '}
                      <strong className="text-slate-800">{sla.responseTimeMinutes} mins</strong>
                    </span>
                    <span>
                      Max Full Resolution:{' '}
                      <strong className="text-slate-800">{sla.resolutionTimeMinutes} mins</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                    Active Enforcement
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Audit Logs */}
      {(activeTab === 'audit_logs' || activeTab === 'audit-logs') && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600" /> System Activity & Audit Trail
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{log.userName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{log.targetType}</td>
                    <td className="py-2.5 px-3 text-slate-700">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: System Settings */}
      {activeTab === 'roles' && (
        <div className="space-y-5">
          <div className="px-1">
            <p className="text-[11px] text-slate-400">Admin Portal / Roles &amp; Permissions</p>
            <h3 className="mt-1 flex items-center gap-2 text-lg font-bold tracking-tight text-slate-800"><Shield className="h-5 w-5 text-slate-700" /> Roles &amp; Permissions</h3>
            <p className="mt-1 text-xs text-slate-500">Read-only permission matrix for the current workspace roles.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full min-w-[700px] text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500">
                <tr><th className="px-4 py-3">Permission</th>{ROLE_SUMMARIES.map((summary) => <th className="px-4 py-3" key={summary.role}>{summary.label}</th>)}</tr>
              </thead>
              <tbody>
                {(['Configuration', 'Reporting & Analytics'] as const).map((category) => (
                  <React.Fragment key={category}>
                    <tr className="bg-slate-50"><th colSpan={ROLE_SUMMARIES.length + 1} className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{category}</th></tr>
                    {PERMISSIONS.filter((permission) => permission.category === category).map((permission) => (
                      <tr key={permission.label} className="odd:bg-white even:bg-slate-50/50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800"><span>{permission.label}</span>{category === 'Configuration' && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">Sensitive</span>}</td>
                        {ROLE_SUMMARIES.map((summary) => {
                          const granted = permission.roles.includes(summary.role);
                          return <td className="px-4 py-3" key={summary.role}><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${granted ? 'bg-teal-50 text-teal-700' : 'text-slate-300'}`}>{granted ? 'Yes' : '—'}</span></td>;
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {ROLE_SUMMARIES.map((summary) => {
              const count = users.filter((user) => user.role === summary.role).length;
              return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs" key={summary.role}><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-800">{summary.label}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{count}</span></div><p className="mt-2 text-[11px] leading-4 text-slate-500">{summary.description}</p></div>;
            })}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-5 max-w-3xl text-xs">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">Security & Operational Configurations</h3>

          <div className="space-y-4 divide-y divide-slate-100">
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Two-Factor Authentication (2FA) Enforcement</p>
                <p className="text-slate-500 text-[11px]">Require all agents and supervisors to use TOTP authentication.</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Not configured</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Operational Business Hours (Asia/Dhaka)</p>
                <p className="text-slate-500 text-[11px]">Auto-switch channels to after-hours bot auto-reply outside schedule.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Managed by server</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Strict Resolution Tag & Sentiment Enforcement</p>
                <p className="text-slate-500 text-[11px]">Prevent agents from pressing 'End' without choosing valid tag & sentiment.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Enforced</span>
            </div>
          </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Email & Queue Operations</h3>
              <p className="mt-1 text-[11px] text-slate-500">Control email ingestion and replies. SMTP/IMAP credentials remain protected in Render Environment Variables.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['enabled', 'Enable email channel', 'Accept and process customer email queries.'],
                ['autoSync', 'Automatic IMAP sync', 'Fetch new emails after agent login.'],
                ['autoLand', 'Auto-land email queries', 'Land emails into active inbox slots when available.'],
                ['allowReplies', 'Allow email replies', 'Permit agents to send SMTP replies to customers.'],
              ] as const).map(([key, label, description]) => (
                <label key={key} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer">
                  <span><span className="block font-bold text-slate-800">{label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{description}</span></span>
                  <input type="checkbox" checked={emailSettings[key]} onChange={(event) => updateEmailSettings({ [key]: event.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600" />
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-sky-50 p-3"><span className="block text-[10px] font-bold uppercase text-sky-600">Email tickets</span><span className="mt-1 block text-xl font-black text-sky-800">{customerEmails.length}</span></div>
              <div className="rounded-lg bg-amber-50 p-3"><span className="block text-[10px] font-bold uppercase text-amber-600">Unread emails</span><span className="mt-1 block text-xl font-black text-amber-800">{customerEmails.filter((email) => !email.isRead).length}</span></div>
              <div className="rounded-lg bg-emerald-50 p-3"><span className="block text-[10px] font-bold uppercase text-emerald-600">Waiting queries</span><span className="mt-1 block text-xl font-black text-emerald-800">{waitingQueue.length}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Modal */}
      {agentModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add Support Agent</h3>
              <button onClick={() => setAgentModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Mahfuzur Rahman"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  placeholder="agent@example.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="agent">Support Agent</option>
                  <option value="supervisor">Team Supervisor</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  value={agentPassword}
                  onChange={(e) => setAgentPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              {agentError && <p className="text-xs text-rose-600">{agentError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setAgentModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAgent}
                className="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
              >
                Save Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {tagModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Create New Category Tag</h3>
              <button onClick={() => setTagModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g. Card_Transaction_Issue"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={tagCategory}
                  onChange={(e) => setTagCategory(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="type">Issue Type</option>
                  <option value="sentiment">Sentiment Marker</option>
                  <option value="status">Priority / Status</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tag Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                  />
                  <span className="font-mono text-slate-600">{tagColor}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setTagModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTag}
                className="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
              >
                Create Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facebook OAuth connect modal */}
      {fbConnectModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs">
                  f
                </span>
                Facebook Messenger OAuth Integration
              </h3>
              <button onClick={() => setFbConnectModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Grant permission for Petbox Desk to receive incoming Messenger webhooks and reply via Facebook Send API.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Page Name</label>
                <input
                  type="text"
                  value={newFbPageName}
                  onChange={(e) => setNewFbPageName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 space-y-1">
                <p className="font-semibold">Required Facebook Permissions:</p>
                <p>• pages_messaging</p>
                <p>• pages_show_list</p>
                <p>• pages_read_engagement</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setFbConnectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectFbPage}
                className="px-4 py-1.5 rounded-lg bg-[#1877F2] text-white text-xs font-semibold hover:bg-blue-700"
              >
                Authenticate & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Page Modal */}
      {pausePageId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm text-rose-600">Pause Channel Intake</h3>
              <button onClick={() => setPausePageId(null)} className="text-slate-400">✕</button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pause Reason</label>
                <input
                  type="text"
                  value={pagePauseReason}
                  onChange={(e) => setPagePauseReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Automated Reply to Incoming Customers
                </label>
                <textarea
                  rows={3}
                  value={pageAutoReply}
                  onChange={(e) => setPageAutoReply(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setPausePageId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  togglePageStatus(pausePageId, pagePauseReason);
                  updatePageSettings(pausePageId, { autoReplyMessage: pageAutoReply });
                  setPausePageId(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
              >
                Confirm Pause Channel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
