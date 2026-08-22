import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AgentStatus } from '../../types';
import {
  Menu,
  MessageSquare,
  Mail,
  Clock,
  Info,
  ChevronDown,
  LogOut,
  Shield,
  UserCheck,
  X,
  ArrowDownToLine,
  Settings,
  BarChart3,
  FileBarChart,
  MessageCircle,
  Facebook,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    updateUserStatus,
    currentRoute,
    navigateTo,
    conversations,
    waitingQueue,
    landingLimit,
    landNextQueryFromQueue,
    logout,
  } = useApp();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [waitingQueueOpen, setWaitingQueueOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const waitingCount = (channel: 'facebook' | 'email' | 'live_chat' | 'whatsapp') => waitingQueue.filter((item) => item.channelType === channel).length;

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
        {/* Hamburger Menu icon */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded transition-colors"
            title="Menu"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 stroke-[2.2]" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-8 z-50 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
              <button type="button" onClick={() => { navigateTo('/agent/inbox'); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><MessageSquare className="h-3.5 w-3.5 text-teal-600" /> Inbox</button>
              <button type="button" onClick={() => { navigateTo('/agent/summary'); setMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs font-semibold hover:bg-teal-50 ${currentRoute === '/agent/summary' ? 'bg-teal-50 text-teal-700' : 'text-slate-700'}`}><FileBarChart className="h-3.5 w-3.5 text-teal-600" /> Summary</button>
            </div>
          )}
        </div>

        {/* 3 Status pill badges strictly matching the screenshot */}
        <div className="flex items-center gap-2 relative">
          {/* Pill 1: [💬 16] in green border & green icon (Customer Waiting Queue) */}
          <button
            onClick={() => setWaitingQueueOpen(!waitingQueueOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-emerald-500/80 bg-emerald-50/40 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition-all shadow-2xs cursor-pointer ${currentUser.role === 'admin' ? 'hidden' : ''}`}
            title={`Live Chat waiting messages (${waitingCount('live_chat')})`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
            <span className="text-xs font-bold text-emerald-800">{waitingCount('live_chat')}</span>
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
          <button
            onClick={() => setWaitingQueueOpen(!waitingQueueOpen)}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-all shadow-2xs ${currentUser.role === 'admin' ? 'hidden' : ''}`}
            title={`Facebook waiting messages (${waitingCount('facebook')})`}
          >
            <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
            <span className="text-xs font-semibold text-slate-700">{waitingCount('facebook')}</span>
          </button>

          {/* Pill 3: customer support email mailbox */}
          <button
            onClick={() => setWaitingQueueOpen(!waitingQueueOpen)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 text-xs font-semibold transition-all shadow-2xs cursor-pointer relative"
            title={`Email waiting messages (${waitingCount('email')})`}
          >
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">{waitingCount('email')}</span>
          </button>
          <button
            onClick={() => setWaitingQueueOpen(!waitingQueueOpen)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            title={`WhatsApp waiting messages (${waitingCount('whatsapp')})`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">{waitingCount('whatsapp')}</span>
          </button>
        </div>
      </div>

      {/* Right side matching screenshot: Clock [🕒] + Info [ⓘ] + Profile Pill [👤 MD Rifat Molla] */}
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
              <span className="hidden sm:inline capitalize">{currentUser.status}</span>
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
                    <span className="capitalize">{status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clock icon in circle */}
        <button
          className="w-7 h-7 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-400 flex items-center justify-center transition-colors"
          title="Shift Time"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
        </button>

        {/* Info icon in circle */}
        <button
          className="w-7 h-7 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-400 flex items-center justify-center transition-colors"
          title="System Information"
        >
          <Info className="w-3.5 h-3.5 text-slate-500" />
        </button>

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

              {/* Status Selector */}
              <div className={`py-1 border-b border-slate-100 ${currentUser.role === 'admin' ? 'hidden' : ''}`}>
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Agent Availability
                </div>
                {(['online', 'away', 'break', 'offline'] as AgentStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => {
                        updateUserStatus(currentUser.id, st);
                        setProfileDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 ${
                        currentUser.status === st
                          ? 'font-bold text-teal-700 bg-teal-50/50'
                          : 'text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          st === 'online'
                            ? 'bg-emerald-500'
                            : st === 'away'
                            ? 'bg-amber-500'
                            : st === 'break'
                            ? 'bg-blue-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className="capitalize">{st.replace('_', ' ')}</span>
                    </button>
                  )
                )}
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
              <button
                onClick={() => {
                  logout();
                  setProfileDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 border-t border-slate-100"
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
