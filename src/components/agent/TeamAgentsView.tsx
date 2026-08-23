import React from 'react';
import { useApp } from '../../context/AppContext';
import { Users } from 'lucide-react';

export const TeamAgentsView: React.FC = () => {
  const { users, conversations, setSelectedConversationId, setActiveTab } = useApp();

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-6 flex flex-col gap-6 select-none">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          Active Team Roster & Queue Distribution
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Monitor agent availability, shift duration, handling speed, and active workload assignments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => {
          const agentConvs = conversations.filter((c) => c.assignedAgentId === u.id);
          const openConvs = agentConvs.filter((c) => c.status === 'open');

          return (
            <div
              key={u.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{u.name}</h4>
                    <span className="text-[11px] text-slate-400 capitalize">{u.role}</span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize flex items-center gap-1 ${
                    u.status === 'online'
                      ? 'bg-emerald-100 text-emerald-700'
                      : u.status === 'away'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {u.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Active Chats</span>
                  <p className="font-bold text-slate-800 text-sm">{openConvs.length}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Avg Handle</span>
                  <p className="font-bold text-slate-800 text-sm">{u.avgHandleTimeMinutes || 3.5}m</p>
                </div>
              </div>

              {openConvs.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Assigned Queues:</p>
                  {openConvs.slice(0, 2).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedConversationId(c.id);
                        setActiveTab('inbox');
                      }}
                      className="w-full text-left p-1.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 rounded text-[11px] flex items-center justify-between text-slate-700 hover:text-teal-900 transition-colors"
                    >
                      <span className="truncate max-w-[160px] font-medium">{c.contact.name}</span>
                      <span className="text-[10px] text-slate-400">{c.channelType}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
