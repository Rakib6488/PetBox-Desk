import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AgentStatus } from '../../types';
import {
  MessageSquare,
  Mail,
  ChevronDown,
  LogOut,
  Shield,
  X,
  ArrowDownToLine,
  Settings,
  BarChart3,
  MessageCircle,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    updateUserStatus,
    currentRoute,
    conversations,
    navigateTo,
    waitingQueue,
    landingLimit,
    landNextQueryFromQueue,
    setChannelFilter,
    logout,
  } = useApp();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [waitingQueueOpen, setWaitingQueueOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [logoutBlockedNotice, setLogoutBlockedNotice] = useState(false);
  const statusLabel = (status: AgentStatus) => status === 'away' ? 'Meeting' : status;
  const activeAssignedQueries = conversations.filter((conversation) =>
    conversation.assignedAgentId === currentUser.id
    && (conversation.status === 'open' || conversation.status === 'pending')
  ).length;
  const realMessageCount = (channel: 'email' | 'whatsapp') => {
    // Channel badges represent only queries waiting to be landed. Once a
    // query is landed, it must not keep inflating the top-level badge.
    const queuedKeys = new Set<string>();
    const queued = waitingQueue.filter((item) => {
      if (item.channelType !== channel) return false;
      const key = item.sourceEmailId
        || (item.channelType === 'whatsapp' ? `${item.whatsappJid || item.email}:${item.createdAt}` : item.id);
      if (queuedKeys.has(key)) return false;
      queuedKeys.add(key);
      return true;
    });
    return queued.length;
  };

  const openChannel = (channel: 'email' | 'whatsapp') => {
    navigateTo('/agent/inbox');
    setChannelFilter(channel);
  };

  // Timer for status duration
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentUser.statusStartedAt) {
        const diff = Math.floor(
          (Date.now() - new Date(currentUser.statusStartedAt).getTime()) / 1000
        );
        setElapsedSeconds(Math.max(0, diff));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentUser.statusStartedAt]);

  return (
    <header className="h-11 border-b border-slate-200 bg-white px-3 flex items-center justify-between select-none shrink-0 z-20">
      {currentUser.role === 'admin' && (
        <div className="flex min-w-0 items-center gap-2 text-slate-800">
          <Settings className="h-4 w-4 shrink-0 text-slate-600" />
          <span className="truncate text-sm font-bold tracking-tight">Admin Management Portal</span>
        </div>
      )}
      {/* Left side matching screenshot: Hamburger Menu [☰] + [💬 16] + [💬 0] + [✉ 4k+] */}
      <div className={`flex items-center gap-2 sm:gap-3 ${currentUser.role === 'admin' ? 'hidden' : ''}`}>
        {/* 3 Status pill badges strictly matching the screenshot */}
        <div className="flex items-center gap-2 relative">
          {/* Pill 1: [💬 16] in green border & green icon (Customer Waiting Queue) */}
          <button
            onClick={() => setWaitingQueueOpen(!waitingQueueOpen)}
            className="flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            title={`Customer waiting queue (${waitingQueue.length})`}
            aria-label={`Customer waiting queue: ${waitingQueue.length}`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
            <span className="text-xs font-bold text-emerald-800">{waitingQueue.length}</span>
          </button>

          {/* Customer Waiting Queue Popover / Dropdown */}
          {waitingQueueOpen && (
            <div className="absolute left-0 top-8 mt-1 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="font-bold text-slate-800 text-xs">Customer Waiting Queue</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    {waitingQueue.length} Waiting
                  </span>
                </div>
                <button
                  onClick={() => setWaitingQueueOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {waitingQueue.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No waiting queries in the queue right now.
                  </div>
                ) : (
                  waitingQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            item.name.charAt(0)
                          )}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center text-[8px] font-bold border border-white ${item.channelType === 'email' ? 'bg-sky-600' : item.channelType === 'whatsapp' ? 'bg-emerald-600' : 'bg-[#1877F2]'}`}>
                          {item.channelType === 'email' ? '@' : item.channelType === 'whatsapp' ? <MessageCircle className="h-2.5 w-2.5" /> : 'f'}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            #{idx + 1}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {waitingQueue.length > 0 && (
                <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Auto-routes to agents (Max {landingLimit} active)</span>
                  <button
                    onClick={() => {
                      landNextQueryFromQueue();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs transition-colors"
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    <span>Land Next Query</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pill 2: [💬 0] in light border */}
          {/* Pill 3: customer support email mailbox */}
          <button
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 text-xs font-semibold transition-all shadow-2xs cursor-pointer relative"
            onClick={() => openChannel('email')}
            title={`Unread email messages (${realMessageCount('email')})`}
            aria-label={`Unread email messages: ${realMessageCount('email')}`}
          >
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">{realMessageCount('email')}</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            onClick={() => openChannel('whatsapp')}
            title={`Unread WhatsApp messages (${realMessageCount('whatsapp')})`}
            aria-label={`Unread WhatsApp messages: ${realMessageCount('whatsapp')}`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">{realMessageCount('whatsapp')}</span>
          </button>
        </div>
      </div>

      {/* Right-side account and availability controls */}
      <div className="ml-auto flex items-center gap-2">
        {(currentUser.role === 'admin' || currentUser.role === 'supervisor') && !currentRoute.startsWith('/bi/') && (
          <button onClick={() => navigateTo('/bi/summary')} className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100" title="Customer Summary Reports">
            <BarChart3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">BI Reports</span>
          </button>
        )}
        {/* Agent availability dropdown */}
        {currentUser.role !== 'admin' && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setAvailabilityOpen((open) => !open)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              title="Agent Availability"
            >
              <span className={`h-2 w-2 rounded-full ${currentUser.status === 'online' ? 'bg-emerald-500' : currentUser.status === 'away' ? 'bg-amber-500' : currentUser.status === 'break' ? 'bg-blue-500' : 'bg-slate-400'}`} />
              <span className="hidden sm:inline capitalize">{statusLabel(currentUser.status)}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            {availabilityOpen && (
              <div className="absolute right-0 top-9 z-50 w-40 rounded-lg border border-slate-200 bg-white py-1.5 shadow-xl">
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Agent Availability</p>
                {(['online', 'away', 'break', 'offline'] as AgentStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => { updateUserStatus(status); setAvailabilityOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${currentUser.status === status ? 'bg-slate-50 font-bold text-teal-700' : 'text-slate-700'}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${status === 'online' ? 'bg-emerald-500' : status === 'away' ? 'bg-amber-500' : status === 'break' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                    <span className="capitalize">{statusLabel(status)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Profile Pill button matching screenshot */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all shadow-2xs"
          >
            <div className="relative w-4.5 h-4.5 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-600 text-[10px]">
              {currentUser.avatar && <img src={currentUser.avatar} alt={currentUser.name} className="absolute inset-0 h-full w-full object-cover" />}
              👤
            </div>
            <span className="text-xs font-medium text-slate-800">{currentUser.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {/* Profile & Switcher Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500">{currentUser.email}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                    {String(currentUser.role || 'agent').toUpperCase()}
                  </span>
                  <span className="text-slate-400">
                    Status: <strong className="text-emerald-600">{currentUser.status}</strong> (
                    {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s)
                  </span>
                </div>
              </div>

              {/* Admin Dashboard shortcut if admin */}
              {currentUser.role === 'admin' && !currentRoute.startsWith('/admin') && (
                <button
                  onClick={() => {
                    navigateTo(
                      currentRoute.startsWith('/admin') ? '/agent/inbox' : '/admin/dashboard'
                    );
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-teal-700 hover:bg-slate-50 flex items-center gap-1.5 font-medium"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>
                    {currentRoute.startsWith('/admin')
                      ? 'Back to Agent CRM'
                      : 'Supervisor Admin Panel'}
                  </span>
                </button>
              )}

              {/* Logout */}
              {logoutBlockedNotice && activeAssignedQueries > 0 && (
                <p className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800">
                  Finish or close your active conversation before signing out.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (activeAssignedQueries > 0) {
                    setLogoutBlockedNotice(true);
                    return;
                  }
                  logout();
                  setProfileDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-1.5 border-t border-slate-100 ${activeAssignedQueries > 0 ? 'cursor-not-allowed text-slate-400' : 'text-rose-600 hover:bg-rose-50'}`}
                aria-disabled={activeAssignedQueries > 0}
                title={activeAssignedQueries > 0 ? 'Finish or close active conversations before signing out' : 'Sign out'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </header>
  );
};
