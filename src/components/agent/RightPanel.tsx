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
    setSelectedConversationId,
    quickResponses,
    addQuickResponse,
    updateQuickResponse,
    deleteQuickResponse,
    incrementQuickResponseUsage,
    addConversationNote,
    setDraftMessage,
    currentUser,
    users,
    conversations,
    customerEmails,
    assignConversation,
  } = useApp();

  const [activeQrTab, setActiveQrTab] = useState<QuickResponseCategory>('mine');
  const [qrSearch, setQrSearch] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'info' | 'history' | 'mail' | 'notes'>('info');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTitle, setQrTitle] = useState('');
  const [qrContent, setQrContent] = useState('');
  const [qrCategory, setQrCategory] = useState<QuickResponseCategory>('mine');
  const [assignOpen, setAssignOpen] = useState(false);
  const [openQrMenuId, setOpenQrMenuId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  if (!selectedConversation) {
    return (
      <div className="hidden xl:flex xl:w-80 border-l border-slate-200 bg-white p-4 text-center text-slate-400 text-xs select-none">
        No contact selected
      </div>
    );
  }

  const contact = selectedConversation.contact;
  const identity = selectedConversation.channelType === 'facebook'
    ? { label: 'Facebook ID', value: contact.facebookPsid || 'Not available' }
    : selectedConversation.channelType === 'whatsapp'
      ? { label: 'WhatsApp', value: contact.phone || contact.whatsappJid?.replace(/@s\.whatsapp\.net$/, '') || 'Not available' }
      : { label: 'Email', value: contact.email || (contact.phone ? `Phone: ${contact.phone}` : 'Not available') };
  const historyCount = conversations.filter((conversation) => conversation.contactId === selectedConversation.contactId).length;
  const mailCount = customerEmails.filter((email) => email.fromEmail === contact.email).length;
  const notesCount = selectedConversation.notes?.length || 0;
  const supportUsers = users.filter((user) => user.role === 'agent' || user.role === 'supervisor');
  const copyConvId = () => {
    navigator.clipboard.writeText(selectedConversation.convUid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleUseQuickResponse = (qr: QuickResponse) => {
    let formatted = qr.content
      .replace(/{customer_name}/g, contact.name)
      .replace(/{agent_name}/g, currentUser.name);

    setDraftMessage((previous) => `${previous}${previous ? '\n\n' : ''}${formatted}`);
    incrementQuickResponseUsage(qr.id);
  };

  const toggleQuickResponseFavorite = (qr: QuickResponse) => {
    updateQuickResponse(qr.id, { isFavorite: !qr.isFavorite });
    setOpenQrMenuId(null);
  };

  const removeQuickResponse = (qr: QuickResponse) => {
    if (window.confirm(`Delete quick response "${qr.title}"?`)) deleteQuickResponse(qr.id);
    setOpenQrMenuId(null);
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
    if (activeQrTab === 'favorite' && !qr.isFavorite) return false;
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
    <div className="hidden xl:flex xl:w-80 border-l border-slate-200 bg-white flex-col h-full shrink-0 select-none overflow-hidden text-xs">
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

        {/* Channel identity */}
        <div className="flex items-center justify-between text-slate-500 text-[11px] gap-2 pt-0.5">
          <span className="text-slate-400">{identity.label}</span>
          <span className="font-mono text-slate-700 truncate max-w-[190px]" title={identity.value}>
            {identity.value}
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

        {/* 4 Counter Buttons matching screenshot: [💬 0] [✉ 1] [✏ 0] [👤+] */}
        <div className="grid grid-cols-4 gap-1 pt-0.5">
          <button
            onClick={() => setActiveSideTab('history')}
            className="py-1 px-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 text-[11px]"
            title="History"
          >
            <MessageSquare className="w-3 h-3 text-slate-400" />
            <span>{historyCount}</span>
          </button>

          <button
            onClick={() => setActiveSideTab('mail')}
            className="py-1 px-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 text-[11px]"
            title="Mail"
          >
            <Mail className="w-3 h-3 text-slate-400" />
            <span>{mailCount}</span>
          </button>

          <button
            onClick={() => setActiveSideTab('notes')}
            className="py-1 px-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 text-[11px]"
            title="Notes"
          >
            <Edit3 className="w-3 h-3 text-slate-400" />
            <span>{notesCount}</span>
          </button>

          <div className="relative">
          <button
            onClick={() => setAssignOpen((open) => !open)}
            className="py-1 px-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 text-[11px]"
            title="Assign"
          >
            <UserPlus className="w-3 h-3 text-slate-400" />
          </button>
          {assignOpen && <div className="absolute right-0 top-8 z-30 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">{supportUsers.map((user) => <button key={user.id} onClick={() => { assignConversation(selectedConversation.id, user.id); setAssignOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-50">{user.name}</button>)}</div>}
          </div>
        </div>
      </div>

      {/* Quick Responses Section matching screenshot */}
      <div className="p-3 flex flex-col gap-2 flex-1 overflow-hidden">
        {activeSideTab === 'history' && <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px]"><p className="mb-1 font-bold text-slate-700">Conversation history</p>{conversations.filter((conversation) => conversation.contactId === selectedConversation.contactId).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)).map((conversation) => <button key={conversation.id} type="button" onClick={() => { setSelectedConversationId(conversation.id); setActiveSideTab('info'); }} className="block w-full border-t border-slate-200 py-1 text-left hover:text-teal-700"><span className="font-semibold">{conversation.convUid}</span><span className="ml-1 text-slate-400">· {conversation.status}</span><span className="block truncate text-slate-500">{conversation.lastMessageText}</span></button>)}{historyCount === 0 && <p className="text-slate-400">No history found.</p>}</div>}
        {activeSideTab === 'mail' && <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px]"><p className="mb-1 font-bold text-slate-700">Customer emails</p>{customerEmails.filter((email) => email.fromEmail === contact.email).map((email) => <div key={email.id} className="border-t border-slate-200 py-1"><p className="font-semibold text-slate-700">{email.subject}</p><p className="truncate text-slate-500">{email.status} · {email.receivedAt ? new Date(email.receivedAt).toLocaleDateString() : ''}</p></div>)}{mailCount === 0 && <p className="text-slate-400">No emails found.</p>}</div>}
        {activeSideTab === 'notes' && <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-[11px] text-amber-900"><p className="mb-1 font-bold">Conversation notes</p>{selectedConversation.notes?.length ? selectedConversation.notes.map((note, index) => <p key={`${note}-${index}`} className="border-t border-amber-100 py-1">{note}</p>) : <p>No notes added.</p>}<form onSubmit={(event) => { event.preventDefault(); if (!noteDraft.trim()) return; addConversationNote(selectedConversation.id, noteDraft.trim()); setNoteDraft(''); }} className="mt-2 flex gap-1"><input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add note" className="min-w-0 flex-1 rounded border border-amber-200 bg-white px-2 py-1 text-[11px]" /><button type="submit" className="rounded bg-amber-600 px-2 py-1 font-semibold text-white">Add</button></form></div>}
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
              className="relative py-1.5 px-1 hover:bg-slate-50 rounded flex items-center justify-between group transition-colors cursor-pointer"
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
              <button type="button" onClick={(event) => { event.stopPropagation(); setOpenQrMenuId(openQrMenuId === qr.id ? null : qr.id); }} className="text-slate-300 group-hover:text-slate-500 p-0.5" title="Quick response actions">
                <MoreVertical className="w-3 h-3" />
              </button>
              {openQrMenuId === qr.id && <div className="absolute right-1 top-7 z-50 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                <button type="button" onClick={(event) => { event.stopPropagation(); toggleQuickResponseFavorite(qr); }} className="block w-full rounded px-2 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-50">{qr.isFavorite ? 'Remove favorite' : 'Add favorite'}</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); removeQuickResponse(qr); }} className="block w-full rounded px-2 py-1.5 text-left text-[11px] text-rose-600 hover:bg-rose-50">Delete</button>
              </div>}
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
