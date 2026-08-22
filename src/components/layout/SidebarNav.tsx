import React from 'react';
import { useApp } from '../../context/AppContext';
import { Camera, Send, MessageSquare, Shield, LogOut } from 'lucide-react';

export const SidebarNav: React.FC = () => {
  const { currentRoute, navigateTo, currentUser, logout } = useApp();

  if (currentUser.role === 'admin' || currentUser.role === 'bi') return null;

  return (
    <aside className="w-10 border-r border-slate-200 bg-white flex flex-col items-center py-2.5 justify-between select-none shrink-0 z-10">
      {/* Top Camera / Snapshot icon matching screenshot */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => {
            if (currentUser.role === 'admin') {
              navigateTo('/admin/dashboard');
            } else {
              navigateTo('/agent/inbox');
            }
          }}
          className="w-7 h-7 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors shadow-2xs"
          title={currentUser.role === 'admin' ? 'Admin Dashboard' : 'Agent Inbox'}
        >
          <Camera className="w-4 h-4 text-slate-600 stroke-[1.8]" />
        </button>
      </div>

      {/* Bottom Send / Plane icon matching screenshot */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => {
            if (currentUser.role === 'admin') {
              navigateTo('/admin/dashboard');
            } else {
              navigateTo('/agent/inbox');
            }
          }}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          title={currentUser.role === 'admin' ? 'Admin Dashboard' : 'Agent Inbox'}
        >
          {currentUser.role === 'admin' ? (
            <Shield className="w-3.5 h-3.5 text-slate-600" />
          ) : (
            <Send className="w-3.5 h-3.5 text-slate-600 rotate-45" />
          )}
        </button>
      </div>
    </aside>
  );
};
