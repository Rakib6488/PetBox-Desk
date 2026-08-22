import React, { useMemo, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AgentSummaryView: React.FC = () => {
  const { conversations, setSelectedConversationId, navigateTo } = useApp();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [channelId, setChannelId] = useState('');
  const [status, setStatus] = useState<'all' | 'complete' | 'incomplete'>('all');

  const rows = useMemo(() => conversations
    .filter((conversation) => Boolean(conversation.summary?.customerMessageCount))
    .filter((conversation) => !startDate || conversation.lastMessageAt.slice(0, 10) >= startDate)
    .filter((conversation) => !endDate || conversation.lastMessageAt.slice(0, 10) <= endDate)
    .filter((conversation) => !channelId.trim() || `${conversation.pageId} ${conversation.convUid}`.toLowerCase().includes(channelId.trim().toLowerCase()))
    .filter((conversation) => status === 'all' || (status === 'complete' ? conversation.status === 'closed' : conversation.status !== 'closed'))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)), [conversations, startDate, endDate, channelId, status]);

  const reset = () => { setStartDate(''); setEndDate(''); setChannelId(''); setStatus('all'); };

  return (
    <section className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-teal-50 p-2 text-teal-700"><FileBarChart className="h-5 w-5" /></div><div><h1 className="text-lg font-black text-slate-900">Customer summaries</h1><p className="text-xs text-slate-500">Summaries are available after a customer reply is received.</p></div></div>
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="grid grid-cols-1 gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center"><div className="flex items-center gap-2"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2 text-xs text-slate-600" /><span className="text-xs text-slate-400">→</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2 text-xs text-slate-600" /></div><input value={channelId} onChange={(event) => setChannelId(event.target.value)} placeholder="channelId" className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600 placeholder:text-slate-400" /><select value={status} onChange={(event) => setStatus(event.target.value as 'all' | 'complete' | 'incomplete')} className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600"><option value="all">Status</option><option value="complete">Complete</option><option value="incomplete">Incomplete</option></select><div className="flex justify-end gap-2"><button type="button" onClick={reset} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</button><button type="button" className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white">Query</button></div></div></div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[11px] font-bold text-slate-700"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Name</th><th className="px-3 py-3">Channel ID</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Operation</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((conversation) => { const category = conversation.tags?.map((tag) => tag.name).join(', ') || conversation.subject || 'Other'; const complete = conversation.status === 'closed'; return <tr key={conversation.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-4 text-slate-600">{new Date(conversation.lastMessageAt).toLocaleString()}</td><td className="px-3 py-4 font-semibold text-slate-800">{conversation.contact.name}</td><td className="px-3 py-4 font-mono text-[11px] text-slate-600">{conversation.pageId || conversation.convUid}</td><td className="px-3 py-4 text-slate-600">{category}</td><td className={`px-3 py-4 font-semibold ${complete ? 'text-emerald-600' : 'text-amber-600'}`}>{complete ? 'Complete' : 'Incomplete'}</td><td className="px-3 py-4"><button type="button" onClick={() => { setSelectedConversationId(conversation.id); navigateTo('/agent/inbox'); }} className="font-semibold text-violet-700 hover:text-violet-900">Summary</button><p className="mt-1 max-w-xs truncate text-[11px] text-slate-400" title={conversation.summary?.text}>{conversation.summary?.text}</p></td></tr>; })}{rows.length === 0 && <tr><td colSpan={6} className="px-3 py-14 text-center text-slate-400">No customer summaries found.</td></tr>}</tbody></table></div>
      </div>
    </section>
  );
};
