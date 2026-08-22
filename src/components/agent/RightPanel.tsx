import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QuickResponse, QuickResponseCategory } from '../../types';
import {
  Copy,
  Check,
  MessageSquare,
  Mail,
  Edit3,
  UserPlus,
  Search,
  MoreVertical,
  GripVertical,
  X,
  Plus,
} from 'lucide-react';

export const RightPanel: React.FC = () => {
  const {
    selectedConversation,
    conversationMessages,
    quickResponses,
    addQuickResponse,
    sendMessage,
    currentUser,
  } = useApp();

  const [activeQrTab, setActiveQrTab] = useState<QuickResponseCategory>('mine');
  const [qrSearch, setQrSearch] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'info' | 'notes'>('info');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTitle, setQrTitle] = useState('');
  const [qrContent, setQrContent] = useState('');
  const [qrCategory, setQrCategory] = useState<QuickResponseCategory>('mine');

  if (!selectedConversation) {
    return (
      <div className="w-72 sm:w-80 border-l border-slate-200 bg-white p-4 text-center text-slate-400 text-xs select-none">
        No contact selected
      </div>
    );
  }

  const contact = selectedConversation.contact;
  const customerMessages = conversationMessages.filter((message) => message.senderType === 'contact');
  const summaryText = selectedConversation.summary?.text || (customerMessages.length
    ? `${contact.name} contacted support about: ${customerMessages.at(-1)?.content.slice(0, 180)}`
    : 'No customer message summary is available yet.');

  const copyConvId = () => {
    navigator.clipboard.writeText(selectedConversation.convUid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleUseQuickResponse = (qr: QuickResponse) => {
    let formatted = qr.content
      .replace(/{customer_name}/g, contact.name)
      .replace(/{agent_name}/g, currentUser.name);

    sendMessage(formatted);
  };

  const handleSaveNewQr = () => {
    if (!qrTitle.trim() || !qrContent.trim()) return;
    addQuickResponse({
      title: qrTitle.trim(),
      content: qrContent.trim(),
      category: qrCategory,
      createdBy: currentUser.id,
    });
    setQrModalOpen(false);
    setQrTitle('');
    setQrContent('');
  };

  const filteredQuickResponses = quickResponses.filter((qr) => {
    if (activeQrTab === 'favorite' && qr.category !== 'favorite') return false;
    if (activeQrTab === 'admin' && qr.category !== 'admin') return false;

    if (qrSearch.trim()) {
      const q = String(qrSearch || '').toLowerCase();
      return (
        String(qr.title || '').toLowerCase().includes(q) ||
        String(qr.content || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-72 sm:w-80 border-l border-slate-200 bg-white flex flex-col h-full shrink-0 select-none overflow-hidden text-xs">
      {/* Contact Profile Header matching screenshot */}
      <div className="p-3 border-b border-slate-200 flex flex-col gap-2">
        {/* Customer name and avatar */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
            {contact.avatar ? (
              <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              String(contact?.name || 'C').charAt(0).toUpperCase()
            )}
          </div>
          <h4 className="font-bold text-slate-900 text-xs truncate">{contact.name}</h4>
        </div>

        {/* Email Field matching screenshot: Email | 24517170204544759@facebook.com */}
        <div className="flex items-center justify-between text-slate-500 text-[11px] gap-2 pt-0.5">
          <span className="text-slate-400">Email</span>
          <span className="font-mono text-slate-700 truncate max-w-[190px]" title={contact.email}>
            {contact.email || `${contact.facebookPsid}@facebook.com`}
          </span>
        </div>

        {/* Conv ID Field matching screenshot: Conv ID | 4d3f0e448b9042ac8fd81564 [❐] */}
        <div className="flex items-center justify-between gap-1 p-1 bg-white border border-slate-200 rounded">
          <div className="flex items-center gap-2 min-w-0 pl-1">
            <span className="text-[10px] text-slate-400 font-medium">Conv ID</span>
            <span className="font-mono text-[11px] text-slate-800 truncate">
              {selectedConversation.convUid}
            </span>
          </div>

          <button
            onClick={copyConvId}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
            title="Copy ID"
          >
            {copiedId ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-teal-700">Customer Summary</span><span className="text-[10px] font-semibold text-teal-600">{selectedConversation.summary?.customerMessageCount || customerMessages.length} messages</span></div>
          <div className="mb-2 flex justify-end"><span className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">{selectedConversation.status === 'closed' ? 'Complete Summary' : 'Incomplete Summary'}</span></div>
          <p className="text-[11px] leading-4 text-slate-700">{summaryText}</p>
        </div>

        {/* 4 Counter Buttons matching screenshot: [💬 0] [✉ 1] [✏ 0] [👤+] */}
        <div className="grid grid-cols-4 gap-1 pt-0.5">
          <button
            className="py-1 px-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 text-[11px]"
            title="History"
          >
            <MessageSquare className="w-3 h-3 text-slate-400" />
            <span>0</span>
          </button>

          <button
            className="py-1 px-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 text-[11px]"
            title="Mail"
          >
            <Mail className="w-3 h-3 text-slate-400" />
            <span>1</span>
          </button>

          <button
            className="py-1 px-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 text-[11px]"
            title="Notes"
          >
            <Edit3 className="w-3 h-3 text-slate-400" />
            <span>0</span>
          </button>

          <button
            className="py-1 px-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 text-[11px]"
            title="Assign"
          >
            <UserPlus className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Quick Responses Section matching screenshot */}
      <div className="p-3 flex flex-col gap-2 flex-1 overflow-hidden">
        {/* Title */}
        <span className="font-bold text-slate-900 text-xs">Quick responses</span>

        {/* Category Tabs matching screenshot: Favorite | Admin | Mine (active in teal/mint) | "+" */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg flex-1">
            <button
              onClick={() => setActiveQrTab('favorite')}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                activeQrTab === 'favorite'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Favorite
            </button>

            <button
              onClick={() => setActiveQrTab('admin')}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                activeQrTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Admin
            </button>

            <button
              onClick={() => setActiveQrTab('mine')}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                activeQrTab === 'mine'
                  ? 'bg-[#D1FAE5] text-teal-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Mine
            </button>
          </div>

          {/* "+" Add Button */}
          <button
            onClick={() => setQrModalOpen(true)}
            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors shrink-0"
            title="Add Template"
          >
            +
          </button>
        </div>

        {/* Search input: Q Search matching screenshot */}
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={qrSearch}
            onChange={(e) => setQrSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>

        {/* List of 12 Quick Responses matching screenshot */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mt-1 pr-0.5">
          {filteredQuickResponses.map((qr) => (
            <div
              key={qr.id}
              onClick={() => handleUseQuickResponse(qr)}
              className="py-1.5 px-1 hover:bg-slate-50 rounded flex items-center justify-between group transition-colors cursor-pointer"
              title={qr.content}
            >
              {/* Left: ≡ icon + Title */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-slate-400 font-bold text-xs shrink-0 select-none">≡</span>
                <span className="text-slate-800 text-[11px] font-normal truncate group-hover:text-teal-700">
                  {qr.title}
                </span>
              </div>

              {/* Right: 3-dots icon matching screenshot */}
              <div className="text-slate-300 group-hover:text-slate-500 p-0.5">
                <MoreVertical className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add QR Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 shadow-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add Quick Response</h3>
              <button onClick={() => setQrModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={qrTitle}
                  onChange={(e) => setQrTitle(e.target.value)}
                  placeholder="e.g. Pin Policy B"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message Content</label>
                <textarea
                  rows={3}
                  value={qrContent}
                  onChange={(e) => setQrContent(e.target.value)}
                  placeholder="Type template message text..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setQrModalOpen(false)}
                className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewQr}
                className="px-3 py-1.5 rounded bg-teal-600 text-white font-bold hover:bg-teal-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
