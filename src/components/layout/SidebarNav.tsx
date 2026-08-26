import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Inbox, Send, Shield, CornerUpLeft, List, ChevronDown, Users, FileBarChart, Layers, FileText, Settings, Tag as TagIcon, Menu, MessageSquare } from 'lucide-react';

export const SidebarNav: React.FC = () => {
  const { currentRoute, navigateTo, currentUser } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  if (currentUser.role === 'bi') return null;
  const isAdmin = currentUser.role === 'admin';

  return (
    <aside className={`${isAdmin ? 'w-52 items-stretch px-2' : 'w-10 items-center'} border-r border-slate-200 bg-white flex flex-col py-2.5 justify-between select-none shrink-0 z-10`}>
      {/* Top Camera / Snapshot icon matching screenshot */}
      <div className={`flex flex-col gap-2 ${isAdmin ? 'items-stretch' : 'items-center'}`}>
        {!isAdmin && <div className="relative">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="w-7 h-7 rounded border border-slate-300 bg-slate-50 flex items-center justify-center text-slate-700 hover:bg-slate-100" title="Open navigation menu" aria-label="Open navigation menu" aria-expanded={menuOpen}>
            <Menu className="w-4 h-4" />
          </button>
          {menuOpen && <div className="absolute left-8 top-0 z-50 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <button type="button" onClick={() => { navigateTo('/agent/inbox'); setMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${currentRoute === '/agent/inbox' ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}><MessageSquare className="h-4 w-4" /> Inbox</button>
            <button type="button" onClick={() => { navigateTo('/agent/summary'); setMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${currentRoute === '/agent/summary' ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}><List className="h-4 w-4" /> Summary</button>
          </div>}
        </div>}
        {false && !isAdmin && <button
          type="button"
          onClick={() => navigateTo('/agent/assigned')}
          className={`w-7 h-7 rounded border flex items-center justify-center transition-colors ${currentRoute === '/agent/assigned' ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-teal-700'}`}
          title="Assigned conversations"
          aria-label="Assigned conversations"
        >
          <CornerUpLeft className="w-4 h-4" />
        </button>}
        {false && !isAdmin && <button
          type="button"
          onClick={() => navigateTo('/agent/summary')}
          className={`w-7 h-7 rounded border flex items-center justify-center transition-colors ${currentRoute === '/agent/summary' ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-teal-50 hover:text-teal-700'}`}
          title="Complete Summary"
          aria-label="Complete Summary"
        >
          <List className="w-4 h-4" />
        </button>}
        {isAdmin && <button
          type="button"
          onClick={() => navigateTo('/admin/dashboard')}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${currentRoute === '/admin/dashboard' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings className="h-3.5 w-3.5" /> Dashboard
        </button>}
        {isAdmin ? (
          <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1">
            <div className="flex items-center justify-between rounded px-2 py-1.5 text-xs font-bold text-slate-700"><span className="flex items-center gap-2"><FileBarChart className="h-4 w-4" /> Summary</span><ChevronDown className="h-3.5 w-3.5" /></div>
            <button type="button" onClick={() => navigateTo('/admin/summary/all')} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 pl-8 text-left text-xs font-semibold ${currentRoute === '/admin/summary/all' ? 'bg-teal-100 text-teal-700' : 'text-slate-600 hover:bg-white'}`}><List className="h-3.5 w-3.5" /> All summaries</button>
            <button type="button" onClick={() => navigateTo('/admin/summary/agents')} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 pl-8 text-left text-xs font-semibold ${currentRoute === '/admin/summary/agents' ? 'bg-teal-100 text-teal-700' : 'text-slate-600 hover:bg-white'}`}><Users className="h-3.5 w-3.5" /> Agent-wise</button>
          </div>
        ) : null /* Agent summary is already rendered above. */}
        {false && <button
          type="button"
          onClick={() => navigateTo('/agent/summary')}
          className={`w-7 h-7 rounded border flex items-center justify-center transition-colors ${currentRoute === '/agent/summary' ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-teal-50 hover:text-teal-700'}`}
          title="Complete Summary"
          aria-label="Complete Summary"
        >
          <List className="w-4 h-4" />
        </button>}
        {isAdmin && <div className="mt-1 flex w-full flex-col gap-1 border-t border-slate-100 pt-2">
          {[
            ['/admin/agents', 'Agents', Users],
            ['/admin/pages', 'Pages', Layers],
            ['/admin/tags', 'Tags', TagIcon],
            ['/admin/quick-responses', 'Quick Responses', FileText],
            ['/admin/sla', 'SLA', Shield],
            ['/admin/audit-logs', 'Audit Logs', Shield],
            ['/admin/roles', 'Roles & Permissions', Shield],
            ['/admin/settings', 'Settings', Settings],
          ].map(([route, label, Icon]) => (
            <button key={route} type="button" onClick={() => navigateTo(route as any)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${currentRoute === route ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>}
      </div>

      {/* Bottom Send / Plane icon matching screenshot */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => {
            navigateTo(isAdmin ? '/admin/dashboard' : '/agent/inbox');
          }}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          title={currentUser.role === 'admin' ? 'Admin Dashboard' : 'Agent Inbox'}
        >
          {isAdmin ? (
            <Shield className="w-3.5 h-3.5 text-slate-600" />
          ) : (
            <Send className="w-3.5 h-3.5 text-slate-600 rotate-45" />
          )}
        </button>
      </div>
    </aside>
  );
};
