import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Conversation, ChannelType } from '../../types';
import {
  UserCheck,
  Bookmark,
  Users,
  Info,
  Pause,
  Play,
  Paperclip,
  X,
  Check,
} from 'lucide-react';

export const ConversationList: React.FC = () => {
  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    waitingQueue,
    landingLimit,
    isAgentPaused,
    toggleAgentPause,
    currentUser,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'assigned' | 'bookmarked'>('all');

  const filteredConversations = conversations.filter((c) => {
    if (activeFilter === 'bookmarked') return c.isBookmarked && c.status !== 'closed';
    if (activeFilter === 'assigned') return c.assignedAgentId === currentUser.id && (c.status === 'open' || c.status === 'pending');
    return c.status === 'open' || c.status === 'pending';
  });

  const getSlaLabel = (conversation: Conversation) => {
    const elapsed = Math.max(0, Date.now() - new Date(conversation.lastMessageAt).getTime());
    const remaining = Math.max(0, 5 * 60 * 1000 - elapsed);
    if (remaining === 0) return 'SLA due';
    const minutes = Math.floor(remaining / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="w-56 lg:w-64 xl:w-72 border-r border-slate-200 bg-white flex flex-col h-full shrink-0 select-none">
      {/* Top Sub-Filter Row matching screenshot */}
      <div className="p-2 border-b border-slate-200 flex items-center justify-between bg-white">
        {/* Filter Icons */}
        <div className="flex items-center gap-1.5 text-slate-500">
          {/* UserCheck in teal circle */}
          <button
            onClick={() => setActiveFilter('all')}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              activeFilter === 'all'
                ? 'bg-teal-100 text-teal-700'
                : 'hover:bg-slate-100 text-slate-400'
            }`}
            title={`All Active Landed Conversations (Max ${landingLimit})`}
          >
            <UserCheck className="w-3.5 h-3.5" />
          </button>

          {/* Bookmark */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'bookmarked' ? 'all' : 'bookmarked')}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              activeFilter === 'bookmarked'
                ? 'bg-amber-100 text-amber-700'
                : 'hover:bg-slate-100 text-slate-400'
            }`}
            title="Bookmarked Chats"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>

          {/* Users */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'assigned' ? 'all' : 'assigned')}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${activeFilter === 'assigned' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-400'}`}
            title="Assigned to me"
          >
            <Users className="w-3.5 h-3.5" />
          </button>

          {/* Info */}
          <button
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
            title={`Active: ${filteredConversations.length} / ${landingLimit} Landed | Waiting Queue: ${waitingQueue.length}`}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1-Click Direct Pause / Resume Toggle (No Modal Popup) */}
        <button
          onClick={toggleAgentPause}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white transition-all shadow-xs cursor-pointer ${
            isAgentPaused
              ? 'bg-[#059669] hover:bg-emerald-700'
              : 'bg-[#E11D48] hover:bg-rose-700'
          }`}
          title={isAgentPaused ? 'Click to Resume incoming queries' : 'Click to Pause incoming queries'}
        >
          {isAgentPaused ? (
            <>
              <Play className="w-3 h-3 fill-white" />
              <span>Resume</span>
            </>
          ) : (
            <>
              <span>Pause</span>
              <Pause className="w-3 h-3 fill-white" />
            </>
          )}
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No active landed conversations.
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversationId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className={`relative p-2.5 flex items-start gap-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#E6F7F3]'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                {/* Active Green Indicator Line on the left */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#059669]" />
                )}

                {/* Avatar with Facebook Badge */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 font-bold text-sm overflow-hidden">
                    {conv.contact.avatar ? (
                      <img
                        src={conv.contact.avatar}
                        alt={conv.contact.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      String(conv.contact?.name || 'C').charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Channel badge */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-bold border border-white shadow-2xs ${conv.channelType === 'facebook' ? 'bg-[#1877F2]' : conv.channelType === 'email' ? 'bg-sky-600' : 'bg-orange-500'}`}>
                    {conv.channelType === 'facebook' ? 'f' : conv.channelType === 'email' ? '@' : '•'}
                  </div>
                </div>

                {/* Name, Timer, and Last Message with Paperclip */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {conv.contact.name}
                    </h4>
                    {/* Red timer 04:29 matching screenshot */}
                    <span className="text-[11px] font-mono font-semibold text-[#E11D48] shrink-0 ml-1">
                      {getSlaLabel(conv)}
                    </span>
                  </div>

                  {/* Last message with paperclip icon matching screenshot */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5 truncate">
                    <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{conv.lastMessageText}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Subtle Bottom Waiting Queue Bar */}
      {waitingQueue.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <span className="font-medium">Waiting in queue:</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
            {waitingQueue.length} queries
          </span>
        </div>
      )}
    </div>
  );
};
