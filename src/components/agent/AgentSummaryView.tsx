import React, { useEffect, useMemo, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { whatsappApi } from '../../features/whatsapp/whatsappApi';

export const AgentSummaryView: React.FC = () => {
  const { conversations, users, currentRoute, setSelectedConversationId, navigateTo } = useApp();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [channel, setChannel] = useState<'all' | 'email' | 'whatsapp'>('all');
  const [status, setStatus] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [whatsappAccountNumber, setWhatsappAccountNumber] = useState('');
  const isAgentWise = currentRoute === '/admin/summary/agents';
  const supportUsers = users.filter((user) => user.role === 'agent' || user.role === 'supervisor');

  useEffect(() => {
    let active = true;
    void whatsappApi.status().then((result) => {
      if (active) setWhatsappAccountNumber(result.phoneNumber || '');
    }).catch(() => {
      if (active) setWhatsappAccountNumber('');
    });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => conversations
    .filter((conversation) => Boolean(conversation.summary?.customerMessageCount))
    .filter((conversation) => !startDate || conversation.lastMessageAt.slice(0, 10) >= startDate)
    .filter((conversation) => !endDate || conversation.lastMessageAt.slice(0, 10) <= endDate)
    .filter((conversation) => channel === 'all' || conversation.channelType === channel)
    .filter((conversation) => !isAgentWise || selectedAgent === 'all' || conversation.assignedAgentId === selectedAgent)
    .filter((conversation) => status === 'all' || (status === 'complete' ? conversation.status === 'closed' : conversation.status !== 'closed'))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)), [conversations, startDate, endDate, channel, status, isAgentWise, selectedAgent]);

  const reset = () => { setStartDate(''); setEndDate(''); setChannel('all'); setStatus('all'); setSelectedAgent('all'); };
  const colSpan = isAgentWise ? 7 : 6;

  return (
    <section className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-teal-50 p-2 text-teal-700"><FileBarChart className="h-5 w-5" /></div><div><h1 className="text-lg font-black text-slate-900">{isAgentWise ? 'Agent-wise summaries' : 'All summaries'}</h1><p className="text-xs text-slate-500">Summaries are available after a customer reply is received.</p></div></div>
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="grid grid-cols-1 gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center"><div className="flex items-center gap-2"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2 text-xs text-slate-600" /><span className="text-xs text-slate-400">→</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2 text-xs text-slate-600" /></div>{isAgentWise ? <select value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)} className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600"><option value="all">All agents</option>{supportUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select> : <select value={channel} onChange={(event) => setChannel(event.target.value as 'all' | 'email' | 'whatsapp')} className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600"><option value="all">All channels</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select>}<select value={status} onChange={(event) => setStatus(event.target.value as 'all' | 'complete' | 'incomplete')} className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600"><option value="all">Status</option><option value="complete">Complete</option><option value="incomplete">Incomplete</option></select><button type="button" onClick={reset} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</button></div></div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[11px] font-bold text-slate-700"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Customer</th>{isAgentWise && <th className="px-3 py-3">Agent</th>}<th className="px-3 py-3">Channel ID</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Operation</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((conversation) => { const category = conversation.tags?.map((tag) => tag.name).join(', ') || conversation.subject || 'Other'; const customerName = conversation.contact.name || conversation.contact.email || conversation.contact.phone || 'Unknown customer'; const channelLabel = conversation.channelType === 'whatsapp' ? 'WhatsApp' : conversation.channelType === 'email' ? 'Email' : conversation.channelType; const channelAccountId = conversation.channelType === 'whatsapp' ? (whatsappAccountNumber || 'WhatsApp not connected') : conversation.channelType === 'email' ? 'default-mailbox' : conversation.pageId || conversation.convUid; const complete = conversation.status === 'closed'; const agent = supportUsers.find((user) => user.id === conversation.assignedAgentId); return <tr key={conversation.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-4 text-slate-600">{new Date(conversation.lastMessageAt).toLocaleString()}</td><td className="px-3 py-4"><div className="font-semibold text-slate-800">{customerName}</div>{conversation.contact.email && <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-slate-400" title={conversation.contact.email}>{conversation.contact.email}</div>}</td>{isAgentWise && <td className="px-3 py-4 text-slate-600">{agent?.name || 'Unassigned'}</td>}<td className="px-3 py-4"><div className="font-semibold capitalize text-slate-700">{channelLabel}</div><div className="mt-0.5 max-w-[180px] truncate font-mono text-[10px] text-slate-400" title={channelAccountId}>{channelAccountId}</div></td><td className="px-3 py-4 text-slate-600">{category}</td><td className={`px-3 py-4 font-semibold ${complete ? 'text-emerald-600' : 'text-amber-600'}`}>{complete ? 'Complete' : 'Incomplete'}</td><td className="px-3 py-4"><button type="button" onClick={() => { setSelectedConversationId(conversation.id); navigateTo('/agent/inbox'); }} className="font-semibold text-violet-700 hover:text-violet-900">Summary</button><p className="mt-1 max-w-xs truncate text-[11px] text-slate-400" title={conversation.summary?.text}>{conversation.summary?.text}</p></td></tr>; })}{rows.length === 0 && <tr><td colSpan={colSpan} className="px-3 py-14 text-center text-xs text-slate-400">No customer summaries found.</td></tr>}</tbody></table></div>
      </div>
    </section>
  );
};
