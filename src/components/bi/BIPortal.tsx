import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, Download, Filter, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppRoute, ChannelType } from '../../types';

type BiTab = 'summary' | 'categories' | 'sentiment' | 'agent-performance' | 'channel-performance' | 'peak-hours' | 'sla-compliance' | 'repeat-contacts' | 'custom-reports';
type DateRange = 'today' | 'last_7_days' | 'last_30_days';
const COLORS = ['#0f766e', '#2563eb', '#f59e0b', '#e11d48', '#64748b'];

const tabItems: Array<{ id: BiTab; route: AppRoute; label: string }> = [
  { id: 'summary', route: '/bi/summary', label: 'Executive Summary' },
  { id: 'categories', route: '/bi/categories', label: 'Categories' },
  { id: 'sentiment', route: '/bi/sentiment', label: 'Sentiment' },
  { id: 'agent-performance', route: '/bi/agent-performance', label: 'Agent Performance' },
  { id: 'channel-performance', route: '/bi/channel-performance', label: 'Channels' },
  { id: 'peak-hours', route: '/bi/peak-hours', label: 'Peak Hours' },
  { id: 'sla-compliance', route: '/bi/sla-compliance', label: 'SLA Compliance' },
  { id: 'repeat-contacts', route: '/bi/repeat-contacts', label: 'Repeat Contacts' },
  { id: 'custom-reports', route: '/bi/custom-reports', label: 'Custom Reports' },
];

export const BIPortal: React.FC = () => {
  const { conversations, selectedConversation, users, tags, pages, slaRules, messages, customerEmails, waitingQueue, auditLogs, navigateTo, currentRoute } = useApp();
  const [dateRange, setDateRange] = useState<DateRange>('last_7_days');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [summaryStartDate, setSummaryStartDate] = useState('');
  const [summaryEndDate, setSummaryEndDate] = useState('');
  const [summaryChannelId, setSummaryChannelId] = useState('');
  const [summaryStatus, setSummaryStatus] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [selectedSummary, setSelectedSummary] = useState<typeof conversations[number] | null>(null);
  const [activeTab, setActiveTab] = useState<BiTab>(() => {
    const routeTab = tabItems.find((item) => item.route === currentRoute);
    return routeTab?.id || 'summary';
  });

  useEffect(() => {
    if (currentRoute === '/bi/summary') {
      const summaryConversation = selectedConversation || conversations.find((conversation) => conversation.summary) || null;
      if (summaryConversation) setSelectedSummary(summaryConversation);
    }
  }, [currentRoute, selectedConversation?.id, conversations]);

  useEffect(() => {
    const routeTab = tabItems.find((item) => item.route === currentRoute);
    if (routeTab) setActiveTab(routeTab.id);
  }, [currentRoute]);

  const filtered = useMemo(() => {
    const days = dateRange === 'today' ? 1 : dateRange === 'last_30_days' ? 30 : 7;
    const cutoff = Date.now() - days * 86400000;
    return conversations.filter((conversation) => {
      if (new Date(conversation.lastMessageAt).getTime() < cutoff) return false;
      if (selectedAgent !== 'all' && conversation.assignedAgentId !== selectedAgent) return false;
      if (selectedChannel !== 'all' && conversation.channelType !== selectedChannel) return false;
      if (selectedTag !== 'all' && !conversation.tags.some((tag) => tag.id === selectedTag)) return false;
      return true;
    });
  }, [conversations, dateRange, selectedAgent, selectedChannel, selectedTag]);

  const metrics = useMemo(() => {
    const closed = filtered.filter((item) => item.status === 'closed');
    const resolutionMinutes = closed.map((item) => item.resolvedAt ? (new Date(item.resolvedAt).getTime() - new Date(item.createdAt).getTime()) / 60000 : 0).filter((value) => value > 0);
    return {
      total: filtered.length,
      open: filtered.filter((item) => item.status === 'open').length,
      pending: filtered.filter((item) => item.status === 'pending').length,
      closed: closed.length,
      breached: filtered.filter((item) => item.slaBreach).length,
      resolutionRate: filtered.length ? Math.round((closed.length / filtered.length) * 100) : 0,
      avgResolution: resolutionMinutes.length ? Math.round(resolutionMinutes.reduce((sum, value) => sum + value, 0) / resolutionMinutes.length) : 0,
    };
  }, [filtered]);

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach((item) => item.tags.forEach((tag) => counts.set(tag.name, (counts.get(tag.name) || 0) + 1)));
    return [...counts.entries()].map(([name, volume]) => ({ name, volume })).sort((a, b) => b.volume - a.volume);
  }, [filtered]);

  const sentimentData = useMemo(() => ['positive', 'neutral', 'negative'].map((sentiment) => ({
    name: sentiment,
    value: filtered.filter((item) => (item.sentiment || 'neutral') === sentiment).length,
  })), [filtered]);

  const agentData = useMemo(() => users.filter((user) => user.role === 'agent' || user.role === 'supervisor').map((user) => {
    const handled = filtered.filter((item) => item.assignedAgentId === user.id);
    const closed = handled.filter((item) => item.status === 'closed').length;
    return { name: user.name, handled: handled.length, closed, resolutionRate: handled.length ? Math.round((closed / handled.length) * 100) : 0, avgHandle: user.avgHandleTimeMinutes || 0 };
  }), [users, filtered]);

  const channelData = useMemo(() => (['facebook', 'live_chat', 'email'] as ChannelType[]).map((channel) => {
    const items = filtered.filter((item) => item.channelType === channel);
    const resolved = items.filter((item) => item.resolvedAt);
    const avgResolution = resolved.length ? Math.round(resolved.reduce((sum, item) => sum + (new Date(item.resolvedAt as string).getTime() - new Date(item.createdAt).getTime()) / 60000, 0) / resolved.length) : 0;
    return { name: channel.replace('_', ' '), volume: items.length, avgResolution };
  }), [filtered]);

  const peakData = useMemo(() => Array.from({ length: 24 }, (_, hour) => ({ hour: `${hour}:00`, volume: filtered.filter((item) => new Date(item.lastMessageAt).getHours() === hour).length })), [filtered]);
  const repeatData = useMemo(() => {
    const grouped = new Map<string, typeof filtered>();
    filtered.forEach((item) => grouped.set(item.contactId, [...(grouped.get(item.contactId) || []), item]));
    return [...grouped.entries()].filter(([, items]) => items.length > 1).map(([contactId, items]) => ({ contactId, customer: items[0].contact.name, conversations: items.length, lastContact: items.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))[0].lastMessageAt }));
  }, [filtered]);
  const summaryRows = useMemo(() => conversations
    .filter((conversation) => conversation.summary)
    .filter((conversation) => !summaryStartDate || conversation.lastMessageAt.slice(0, 10) >= summaryStartDate)
    .filter((conversation) => !summaryEndDate || conversation.lastMessageAt.slice(0, 10) <= summaryEndDate)
    .filter((conversation) => !summaryChannelId.trim() || conversation.convUid.toLowerCase().includes(summaryChannelId.trim().toLowerCase()))
    .filter((conversation) => summaryStatus === 'all' || (summaryStatus === 'complete' ? conversation.status === 'closed' : conversation.status !== 'closed'))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)), [conversations, summaryStartDate, summaryEndDate, summaryChannelId, summaryStatus]);
  const slaData = useMemo(() => users.filter((user) => user.role === 'agent' || user.role === 'supervisor').map((user) => {
    const items = filtered.filter((item) => item.assignedAgentId === user.id);
    const breached = items.filter((item) => item.slaBreach).length;
    return { name: user.name, total: items.length, met: items.length - breached, breached, compliance: items.length ? Math.round(((items.length - breached) / items.length) * 100) : 0 };
  }), [users, filtered]);

  const operationalMetrics = useMemo(() => ({
    emailTickets: customerEmails.length,
    unreadEmails: customerEmails.filter((email) => !email.isRead).length,
    resolvedEmails: customerEmails.filter((email) => email.status === 'resolved').length,
    emailQueue: waitingQueue.filter((item) => item.channelType === 'email').length,
    totalQueue: waitingQueue.length,
    repliesSent: auditLogs.filter((log) => log.action === 'EMAIL_REPLY_SENT').length,
    repliesFailed: auditLogs.filter((log) => log.action === 'EMAIL_REPLY_FAILED' || log.action === 'EMAIL_REPLY_BLOCKED').length,
    syncEvents: auditLogs.filter((log) => log.action === 'SYNC_IMAP_EMAILS').length,
  }), [customerEmails, waitingQueue, auditLogs]);

  const exportCsv = (rows: string[][], filename: string) => {
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; link.download = filename; link.click();
  };

  const card = 'rounded-xl border border-slate-200 bg-white p-4 shadow-2xs';
  const tab = tabItems.find((item) => item.id === activeTab) || tabItems[0];

  return <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50 p-4 sm:p-6">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300"><BarChart3 className="h-4 w-4" /> Business Intelligence</div><h1 className="mt-1 text-2xl font-black">Petbox Desk BI Portal</h1><p className="mt-1 text-xs text-slate-300">Read-only insights derived from live Agent Portal activity.</p></div><button onClick={() => exportCsv([['Metric', 'Value'], ['Total queries', String(metrics.total)], ['Resolved', String(metrics.closed)], ['Resolution rate', `${metrics.resolutionRate}%`]], 'bi-summary.csv')} className="flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-xs font-bold hover:bg-teal-400"><Download className="h-4 w-4" /> Export Summary</button></div></div>
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold shadow-sm">{tabItems.map((item) => <button key={item.id} onClick={() => { setActiveTab(item.id); navigateTo(item.route); }} className={`whitespace-nowrap rounded-lg px-3 py-2 ${activeTab === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</button>)}</div>
      <div className={`${card} grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4`}><div><label className="mb-1 block text-[10px] font-bold uppercase text-slate-400"><Filter className="mr-1 inline h-3 w-3" /> Date range</label><select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"><option value="today">Today</option><option value="last_7_days">Last 7 days</option><option value="last_30_days">Last 30 days</option></select></div><div><label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Agent</label><select value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"><option value="all">All agents</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div><div><label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Channel</label><select value={selectedChannel} onChange={(event) => setSelectedChannel(event.target.value as ChannelType | 'all')} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"><option value="all">All channels</option><option value="facebook">Facebook</option><option value="live_chat">Live Chat</option><option value="email">Email</option></select></div><div><label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Tag</label><select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"><option value="all">All tags</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></div></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {[
          ['Email tickets', operationalMetrics.emailTickets, 'bg-sky-50 text-sky-800'],
          ['Unread emails', operationalMetrics.unreadEmails, 'bg-amber-50 text-amber-800'],
          ['Resolved emails', operationalMetrics.resolvedEmails, 'bg-emerald-50 text-emerald-800'],
          ['Email queue', operationalMetrics.emailQueue, 'bg-violet-50 text-violet-800'],
          ['Total queue', operationalMetrics.totalQueue, 'bg-slate-100 text-slate-800'],
          ['Replies sent', operationalMetrics.repliesSent, 'bg-teal-50 text-teal-800'],
          ['Reply failures', operationalMetrics.repliesFailed, 'bg-rose-50 text-rose-800'],
          ['IMAP syncs', operationalMetrics.syncEvents, 'bg-indigo-50 text-indigo-800'],
        ].map(([label, value, tone]) => <div key={String(label)} className={`rounded-xl p-3 ${tone}`}><span className="block text-[10px] font-bold uppercase opacity-70">{label}</span><span className="mt-1 block text-xl font-black">{value}</span></div>)}
      </div>
      {activeTab === 'summary' && <section className={card}><div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end"><div className="flex items-center gap-2"><input type="date" value={summaryStartDate} onChange={(event) => setSummaryStartDate(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600" /><span className="text-xs text-slate-400">→</span><input type="date" value={summaryEndDate} onChange={(event) => setSummaryEndDate(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600" /></div><input value={summaryChannelId} onChange={(event) => setSummaryChannelId(event.target.value)} placeholder="channelId" className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600 placeholder:text-slate-400" /><select value={summaryStatus} onChange={(event) => setSummaryStatus(event.target.value as 'all' | 'complete' | 'incomplete')} className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600"><option value="all">Status</option><option value="complete">Complete</option><option value="incomplete">Incomplete</option></select><div className="flex justify-end gap-2"><button onClick={() => { setSummaryStartDate(''); setSummaryEndDate(''); setSummaryChannelId(''); setSummaryStatus('all'); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</button><button onClick={() => undefined} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800">Query</button></div></div><div className="mt-8 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-[11px] font-bold text-slate-700"><tr><th className="px-2 py-3">Date</th><th className="px-2 py-3">channelId</th><th className="px-2 py-3">Status</th><th className="px-2 py-3 text-right">Operation</th></tr></thead><tbody className="divide-y divide-slate-100">{summaryRows.map((conversation) => <tr key={conversation.id} className="hover:bg-slate-50"><td className="px-2 py-4 text-slate-600">{new Date(conversation.lastMessageAt).toLocaleString()}</td><td className="px-2 py-4 font-mono text-[11px] text-slate-600">{conversation.convUid}</td><td className="px-2 py-4"><span className={`font-semibold ${conversation.status === 'closed' ? 'text-emerald-600' : 'text-amber-600'}`}>{conversation.status === 'closed' ? 'Complete' : 'Incomplete'}</span></td><td className="px-2 py-4 text-right"><button onClick={() => setSelectedSummary(conversation)} className="font-semibold text-violet-700 hover:text-violet-900">Summary</button></td></tr>)}{summaryRows.length === 0 && <tr><td colSpan={4} className="px-2 py-12 text-center text-slate-400">No saved summaries found.</td></tr>}</tbody></table></div></section>}
      {activeTab === 'categories' && <ChartCard title="Query volume by tag"><BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="volume" fill="#0f766e" /></BarChart></ChartCard>}
      {activeTab === 'sentiment' && <div className="grid gap-5 xl:grid-cols-2"><ChartCard title="Sentiment distribution"><PieChart><Pie data={sentimentData} dataKey="value" nameKey="name" outerRadius={90}>{sentimentData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Tooltip /><Legend /></PieChart></ChartCard><ChartCard title="Sentiment totals"><SimpleTable headers={['Sentiment', 'Queries']} rows={sentimentData.map((item) => [item.name, String(item.value)])} /></ChartCard></div>}
      {activeTab === 'agent-performance' && <TableCard headers={['Agent', 'Handled', 'Resolved', 'Resolution rate', 'Avg handle']} rows={agentData.map((item) => [item.name, String(item.handled), String(item.closed), `${item.resolutionRate}%`, `${item.avgHandle} min`])} />}
      {activeTab === 'channel-performance' && <TableCard headers={['Channel', 'Volume', 'Avg resolution']} rows={channelData.map((item) => [item.name, String(item.volume), `${item.avgResolution} min`])} />}
      {activeTab === 'peak-hours' && <ChartCard title="Conversation volume by hour"><BarChart data={peakData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="hour" interval={2} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="volume" fill="#2563eb" /></BarChart></ChartCard>}
      {activeTab === 'sla-compliance' && <TableCard headers={['Agent', 'Total', 'Met', 'Breached', 'Compliance']} rows={slaData.map((item) => [item.name, String(item.total), String(item.met), String(item.breached), `${item.compliance}%`])} />}
      {activeTab === 'repeat-contacts' && <TableCard headers={['Customer', 'Contact ID', 'Conversations', 'Last contact']} rows={repeatData.map((item) => [item.customer, item.contactId, String(item.conversations), new Date(item.lastContact).toLocaleString()])} />}
      {activeTab === 'custom-reports' && <div className={card}><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-800">Custom report</h2><p className="text-xs text-slate-500">Current filters produce this live dataset.</p></div><button onClick={() => exportCsv([['Conversation', 'Customer', 'Channel', 'Status', 'Created'], ...filtered.map((item) => [item.convUid, item.contact.name, item.channelType, item.status, item.createdAt])], 'custom-bi-report.csv')} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Download className="h-3.5 w-3.5" /> Download CSV</button></div><TableCard headers={['Conversation', 'Customer', 'Channel', 'Status']} rows={filtered.slice(0, 50).map((item) => [item.convUid, item.contact.name, item.channelType, item.status])} /></div>}
      {selectedSummary && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setSelectedSummary(null)}><div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">Complete Summary</p><h2 className="mt-1 text-lg font-black text-slate-800">{selectedSummary.contact.name}</h2></div><button onClick={() => setSelectedSummary(null)} className="text-slate-400 hover:text-slate-700">×</button></div><div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/60 p-4"><p className="text-sm font-semibold text-slate-700">Other</p><p className="mt-1 text-xs text-slate-500">{selectedSummary.summary?.customerMessageCount || 0} customer messages</p></div><div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Customer replies</h3>{messages.filter((message) => message.conversationId === selectedSummary.id && message.senderType === 'contact').map((message) => <div key={message.id} className="rounded-lg border border-slate-200 bg-white p-3"><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{message.content}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(message.createdAt).toLocaleString()}</p></div>)}{messages.filter((message) => message.conversationId === selectedSummary.id && message.senderType === 'contact').length === 0 && <p className="py-6 text-center text-xs text-slate-400">No customer replies recorded.</p>}</div></div></div>}
      <p className="text-[11px] text-slate-400">Showing {filtered.length} conversations for {tab.label}. Connected pages: {pages.filter((page) => page.status === 'active').length}; SLA rules: {slaRules.filter((rule) => rule.isActive).length}; messages analysed: {messages.length}.</p>
      {selectedSummary && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setSelectedSummary(null)}><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">Customer Summary</p><h2 className="mt-1 text-lg font-black text-slate-800">{selectedSummary.contact.name}</h2></div><button onClick={() => setSelectedSummary(null)} className="text-slate-400 hover:text-slate-700">×</button></div><p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selectedSummary.summary?.text}</p><p className="mt-3 text-xs text-slate-400">{selectedSummary.summary?.customerMessageCount} customer messages · {new Date(selectedSummary.summary?.lastCustomerMessageAt || selectedSummary.lastMessageAt).toLocaleString()}</p></div></div>}
    </div>
  </div>;
};

const ChartCard: React.FC<{ title: string; children: React.ReactElement }> = ({ title, children }) => <section className="h-80 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs"><h2 className="mb-3 font-bold text-slate-800">{title}</h2><ResponsiveContainer width="100%" height="90%">{children}</ResponsiveContainer></section>;
const TableCard: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500"><tr>{headers.map((header) => <th className="px-4 py-3" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr className="text-slate-700" key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td className="px-4 py-3" key={`${cell}-${cellIndex}`}>{cell}</td>)}</tr>) : <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={headers.length}>No data for the selected filters.</td></tr>}</tbody></table></div>;
const SimpleTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => <TableCard headers={headers} rows={rows} />;
