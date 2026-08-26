import React, { useState } from 'react';
import { ChevronDown, CornerUpLeft, FileBarChart, FileText, Inbox, Layers, List, Menu, Send, Settings, Shield, Tag as TagIcon, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SidebarNav: React.FC = () => {
  const { currentRoute, navigateTo, currentUser } = useApp();
  const [pinned, setPinned] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

  if (currentUser.role === 'bi') return null;
  const isAdmin = currentUser.role === 'admin';
  const expanded = pinned;
  const go = (route: string) => navigateTo(route as any);
  const itemClass = (active: boolean) => `${expanded ? 'w-full justify-start gap-3 px-3' : 'w-7 justify-center'} h-8 rounded-lg flex items-center text-xs font-semibold transition-colors ${active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`;
  const adminItems = [
    ['/admin/agents', 'Agents', Users], ['/admin/pages', 'Pages', Layers], ['/admin/tags', 'Tags', TagIcon],
    ['/admin/quick-responses', 'Quick Responses', FileText], ['/admin/sla', 'SLA', Shield],
    ['/admin/audit-logs', 'Audit Logs', Shield], ['/admin/roles', 'Roles & Permissions', Shield], ['/admin/settings', 'Settings', Settings],
  ] as const;

  return (
    <aside className={`${expanded ? 'w-52 items-stretch px-2' : 'w-10 items-center'} shrink-0 z-10 flex flex-col border-r border-slate-200 bg-white select-none transition-[width] duration-200`} aria-label="Primary navigation">
      <div className="-mx-2 flex h-11 shrink-0 items-center justify-center border-b border-slate-200 px-2">
        <button type="button" onClick={() => setPinned(value => !value)} className={`${expanded ? 'w-full justify-start gap-3 px-3' : 'w-7 justify-center'} h-8 rounded-lg flex items-center text-slate-700 hover:bg-slate-100`} title="Toggle navigation sidebar" aria-label="Toggle navigation sidebar" aria-expanded={expanded}>
          <Menu className="h-4 w-4 shrink-0" />{expanded && <span>Menu</span>}
        </button>
      </div>
      <nav className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch gap-1 pt-2.5">
        {isAdmin ? <>
          <button type="button" onClick={() => go('/admin/dashboard')} className={itemClass(currentRoute === '/admin/dashboard')} title="Dashboard" aria-label="Dashboard"><Settings className="h-4 w-4 shrink-0" />{expanded && <span>Dashboard</span>}</button>
          <div className={`${expanded ? 'w-full' : 'w-7'} rounded-lg border border-slate-200 bg-slate-50`}>
            <button type="button" onClick={() => setSummaryOpen(value => !value)} className={`${expanded ? 'w-full justify-between px-3' : 'w-7 justify-center'} h-8 rounded-lg flex items-center text-slate-700`} title="Summary" aria-label="Summary" aria-expanded={summaryOpen}>
              <span className="flex items-center gap-3"><FileBarChart className="h-4 w-4 shrink-0" />{expanded && <span className="text-xs font-semibold">Summary</span>}</span>
              {expanded && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${summaryOpen ? '' : '-rotate-90'}`} />}
            </button>
            {expanded && summaryOpen && <div className="space-y-1 px-1 pb-1">
              <button type="button" onClick={() => go('/admin/summary/all')} className={itemClass(currentRoute === '/admin/summary/all')}><List className="h-4 w-4 shrink-0" /><span>All summaries</span></button>
              <button type="button" onClick={() => go('/admin/summary/agents')} className={itemClass(currentRoute === '/admin/summary/agents')}><Users className="h-4 w-4 shrink-0" /><span>Agent-wise</span></button>
            </div>}
          </div>
          {adminItems.map(([route, label, Icon]) => <button key={route} type="button" onClick={() => go(route)} className={itemClass(currentRoute === route)} title={label} aria-label={label}><Icon className="h-4 w-4 shrink-0" />{expanded && <span>{label}</span>}</button>)}
        </> : <>
          <button type="button" onClick={() => go('/agent/inbox')} className={itemClass(currentRoute === '/agent/inbox')} title="Inbox" aria-label="Inbox"><Inbox className="h-4 w-4 shrink-0" />{expanded && <span>Inbox</span>}</button>
          <button type="button" onClick={() => go('/agent/assigned')} className={itemClass(currentRoute === '/agent/assigned')} title="Assigned" aria-label="Assigned"><CornerUpLeft className="h-4 w-4 shrink-0" />{expanded && <span>Assigned</span>}</button>
          <button type="button" onClick={() => go('/agent/summary')} className={itemClass(currentRoute === '/agent/summary')} title="Summary" aria-label="Summary"><List className="h-4 w-4 shrink-0" />{expanded && <span>Summary</span>}</button>
        </>}
      </nav>
      <div className="flex shrink-0 justify-center pb-2.5">
        <button type="button" onClick={() => go(isAdmin ? '/admin/dashboard' : '/agent/inbox')} className={`${expanded ? 'w-full justify-start gap-3 px-3' : 'w-7 justify-center'} h-8 rounded-full bg-slate-100 flex items-center text-slate-600 hover:bg-slate-200`} title={isAdmin ? 'Dashboard' : 'Inbox'} aria-label={isAdmin ? 'Dashboard' : 'Inbox'}>{isAdmin ? <Shield className="h-3.5 w-3.5 shrink-0" /> : <Send className="h-3.5 w-3.5 shrink-0 rotate-45" />}{expanded && <span className="text-xs font-semibold">{isAdmin ? 'Dashboard' : 'Inbox'}</span>}</button>
      </div>
    </aside>
  );
};
