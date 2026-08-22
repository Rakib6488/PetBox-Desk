import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, MessageSquare, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const { conversations, setSelectedConversationId, setActiveTab } = useApp();

  const unreadConversations = conversations.filter((c) => (c.unreadCount || 0) > 0);

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-6 flex flex-col gap-6 select-none">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Bell className="w-5 h-5 text-teal-600" />
          Real-time Notifications & Queue Alerts
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Unread incoming messages, SLA escalation warnings, and conversation assignments.
        </p>
      </div>

      <div className="space-y-3">
        {unreadConversations.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700 text-sm">All caught up!</p>
            <p>There are no pending unread notifications in your queue.</p>
          </div>
        ) : (
          unreadConversations.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setSelectedConversationId(c.id);
                setActiveTab('inbox');
              }}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-500 shadow-2xs cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-xs shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">{c.contact.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                      {c.unreadCount} new messages
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{c.lastMessageText}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
