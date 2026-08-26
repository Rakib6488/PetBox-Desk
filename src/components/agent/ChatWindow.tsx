import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Tag, SentimentType, MessageAttachment } from '../../types';
import {
  Smile,
  Pause,
  Play,
  Paperclip,
  FileText,
  ShoppingBag,
  Bookmark,
  Mic,
  Send,
  RotateCcw,
  ChevronDown,
  X,
  Maximize2,
  Mail,
  MessageCircle,
} from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const {
    selectedConversation,
    conversationMessages,
    sendMessage,
    updateConversationSentiment,
    addTagToConversation,
    endConversation,
    tags,
    currentUser,
    pauseConversation,
    resumeConversation,
    quickResponses,
    draftMessage,
    setDraftMessage,
  } = useApp();

  const [selectedSentiment, setSelectedSentiment] = useState<SentimentType>('negative');
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tagSelectionError, setTagSelectionError] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);

  // Sync conversation tags & sentiment
  useEffect(() => {
    setActiveTag(null);
    setTagSelectionError('');
    // Drafts belong to one conversation only. Never carry a sent or stale
    // reply into another customer's composer.
    setDraftMessage('');
    if (selectedConversation) {
      if (selectedConversation.sentiment) {
        setSelectedSentiment(selectedConversation.sentiment);
      }
    }
  }, [selectedConversation?.id]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-8 select-none">
        <p className="text-sm font-semibold text-slate-600">No conversation selected</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!draftMessage.trim()) return;
    const text = draftMessage.trim();
    if (!sendReplyWithCategory(text)) return;
    setDraftMessage('');

    if (textareaRef.current) {
      textareaRef.current.focus();
    }

  };

  const sendReplyWithCategory = (
    content: string,
    messageType: 'text' | 'image' | 'file' | 'audio' | 'product_card' = 'text',
    attachments?: MessageAttachment[],
  ) => {
    if (!activeTag) {
      setTagSelectionError('Select a category before sending a reply.');
      setTagDropdownOpen(true);
      return false;
    }
    sendMessage(content, messageType, attachments);
    setActiveTag(null);
    setTagSearch('');
    setTagSelectionError('');
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndTicket = () => {
    if (selectedConversation.status === 'closed') return;

    if (activeTag) {
      const ended = endConversation(selectedConversation.id, activeTag, selectedSentiment);
      if (ended) {
        setDraftMessage('');
        setTagDropdownOpen(false);
      }
      return;
    }
    setTagSelectionError('Select a category before ending the conversation.');
    setTagDropdownOpen(true);
  };

  const isConversationClosed = selectedConversation.status === 'closed';
  const filteredTags = tags
    .filter((tag) => tag.name.toLowerCase().includes(tagSearch.trim().toLowerCase()))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const handleRealVoiceRecord = () => {
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return;
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => { sendReplyWithCategory('Voice message', 'audio', [{ url: String(reader.result || ''), name: 'voice-message.webm', size: `${Math.max(1, Math.round(blob.size / 1024))} KB`, type: blob.type }]); };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        voiceRecorderRef.current = null;
        setIsRecordingVoice(false);
      };
      recorder.start();
      voiceRecorderRef.current = recorder;
      setIsRecordingVoice(true);
    }).catch(() => setIsRecordingVoice(false));
  };

  const emojis = ['👍', '🙏', '😊', '❤️', '✅', '⚠️', '🎉', '📌', '🤝', '🙌'];
  const channelMeta = selectedConversation.channelType === 'whatsapp'
    ? { label: 'WhatsApp', icon: <MessageCircle className="w-3 h-3" />, color: 'bg-emerald-600' }
    : { label: 'Email', icon: <Mail className="w-3 h-3" />, color: 'bg-sky-600' };

  return (
    <div className="min-w-0 flex-1 flex flex-col bg-[#F8FAFC] h-full overflow-hidden select-none relative">
      {/* Top Header Bar: Petbox Desk channel and agent controls */}
      <div className="h-10 bg-white border-b border-slate-200 px-3 flex items-center justify-between shrink-0 z-10">
        {/* Channel and page */}
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full ${channelMeta.color} text-white flex items-center justify-center font-bold text-xs shadow-2xs`} title={channelMeta.label}>
            {channelMeta.icon}
          </div>
          <span className="font-bold text-slate-800 text-xs tracking-tight">
            {selectedConversation.pageName || channelMeta.label}
          </span>
          <span className="text-[10px] text-slate-400">{channelMeta.label}</span>
        </div>

        {/* Right: Refresh icon in circle + "A" Agent Avatar in circle matching screenshot */}
        <div className="flex items-center gap-2">
          {/* Refresh icon */}
          <button
            onClick={() => setDraftMessage('')}
            className="w-6 h-6 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
            title="Clear message draft"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Agent Avatar Circle "A" */}
          <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 text-slate-600 font-bold text-xs flex items-center justify-center">
            A
          </div>
        </div>
      </div>

      {/* Message Timeline Area matching screenshot */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {/* Latest activity timestamp */}
        <div className="flex justify-center">
          <span className="text-[10px] text-slate-400 font-mono">
            Last activity {new Date(selectedConversation.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Date marker */}
        <div className="flex flex-col items-center gap-0.5 my-0.5">
          <div className="px-2.5 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-medium">
            {new Date(selectedConversation.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Conversation timeline</span>
        </div>

        {selectedConversation.channelType === 'email' && selectedConversation.subject && (
          <div className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Email subject</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-800">{selectedConversation.subject}</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
              {selectedConversation.lastMessageText.replace(/^\[Email:.*?\]\s*/, '')}
            </p>
          </div>
        )}

        {/* Message Bubbles */}
        {conversationMessages.map((msg) => {
          const isAgent = msg.senderType === 'agent';
          const isSystem = msg.senderType === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-1">
                <div className="px-3 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 text-[10px]">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 max-w-[85%] ${
                isAgent ? 'self-end flex-row-reverse' : 'self-start'
              }`}
            >
              {/* Avatar circle (M for customer, Agent avatar for agent) */}
              <div className="w-6 h-6 rounded-full bg-slate-300 border border-slate-300 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {isAgent ? (currentUser.avatar ? <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full rounded-full object-cover" /> : currentUser.name.charAt(0).toUpperCase()) : (selectedConversation.contact.avatar ? <img src={selectedConversation.contact.avatar} alt={selectedConversation.contact.name} className="h-full w-full rounded-full object-cover" /> : selectedConversation.contact.name.charAt(0).toUpperCase())}
              </div>

              {/* Message Bubble */}
              <div className="flex flex-col">
                <div
                  className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    isAgent
                      ? 'bg-teal-700 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Attachment image preview if present */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.attachments.map((att, idx) => (
                        <button
                          key={idx}
                          type="button"
                          aria-label={`View attachment ${att.name}`}
                          onClick={() => setLightboxImage(att.url)}
                          className="relative rounded overflow-hidden border border-slate-200 cursor-pointer group text-left"
                        >
                          {att.type?.startsWith('image/') && att.url ? (
                            <img src={att.url} alt={att.name} className="max-h-44 w-auto rounded object-cover" />
                          ) : (
                            <div className="flex items-center gap-2 p-3 text-xs text-slate-700"><FileText className="h-4 w-4" />{att.name}</div>
                          )}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold gap-1">
                            <Maximize2 className="w-3.5 h-3.5" /> View
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp below bubble matching screenshot: 12:06:56 AM */}
                <span
                  className={`text-[10px] text-slate-400 font-mono mt-0.5 ${
                    isAgent ? 'text-right mr-1' : 'text-left ml-1'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                {isAgent && msg.metadata?.deliveryStatus && (msg.metadata.deliveryStatus === 'failed' ? <><button type="button" onClick={() => sendMessage(msg.content, msg.messageType, msg.attachments)} className="block ml-auto text-[10px] font-semibold text-rose-600 underline hover:text-rose-800">Delivery failed · Retry</button>{msg.metadata.deliveryError && <span className="block max-w-[240px] text-right text-[10px] text-rose-500">{msg.metadata.deliveryError}</span>}</> : <span className={`block text-[10px] ${msg.metadata.deliveryStatus === 'pending' ? 'text-amber-600' : 'text-emerald-600'} text-right mr-1`}>{msg.metadata.deliveryStatus === 'pending' ? 'Sending…' : 'Sent'}</span>)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input Box with rich icons matching screenshot */}
      <div className="bg-white border-t border-slate-200 p-3 shrink-0 flex flex-col gap-2">
        {/* Upper Icons Toolbar matching reference screenshot: emoji, pause, clip, notepad, cart, bookmark, info, mic, EN */}
        <div className="flex items-center justify-between text-slate-400 px-0.5">
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 1. Emoji */}
            <div className="relative">
              <button
                onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                disabled={isConversationClosed}
                className="hover:text-slate-700 transition-colors"
                title="Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {emojiPickerOpen && (
                <div className="absolute bottom-6 left-0 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-50 flex gap-1 text-sm">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setDraftMessage((prev) => prev + emoji);
                        setEmojiPickerOpen(false);
                      }}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Pause */}
            <button
              onClick={() => {
                if (selectedConversation.status === 'paused') {
                  resumeConversation(selectedConversation.id);
                } else {
                  pauseConversation(selectedConversation.id, 'Paused from reply toolbar');
                }
              }}
              disabled={isConversationClosed}
              className="hover:text-slate-700 transition-colors"
              title={selectedConversation.status === 'paused' ? 'Resume conversation' : 'Pause conversation'}
            >
              {selectedConversation.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            {/* 3. Paperclip Attachment */}
            <button
              onClick={() => attachmentInputRef.current?.click()}
              disabled={isConversationClosed}
              className="hover:text-slate-700 transition-colors"
              title="Attach File"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <input
              ref={attachmentInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const isImage = file.type.startsWith('image/');
                const submitAttachment = (url: string) => {
                  const attachment: MessageAttachment = { url, name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB`, type: file.type || 'application/octet-stream' };
                  sendReplyWithCategory(`Attached file: ${file.name}`, isImage ? 'image' : 'file', [attachment]);
                };
                const reader = new FileReader();
                reader.onload = () => submitAttachment(String(reader.result || ''));
                reader.readAsDataURL(file);
                event.target.value = '';
              }}
            />

            {/* 4. Notepad / Template */}
            <button
              onClick={() => {
                setDraftMessage(
                  'প্রিয় গ্রাহক, আপনার সমস্যার বিবরণটি আমাদের জানান যাতে আমরা যাচাই করে জানাতে পারি।'
                );
              }}
              disabled={isConversationClosed}
              className="hover:text-slate-700 transition-colors"
              onClickCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const response = quickResponses[0];
                if (response) setDraftMessage(response.content);
              }}
              title="Insert saved reply"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>

            {/* 5. Cart */}
            <button
              onClick={() => {
                setDraftMessage((prev) => prev + ' [Transaction Order #PETBOX-9821]');
              }}
              className="hidden"
              title="Cart / Order"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </button>

            {/* 6. Bookmark */}
            <button
              onClick={() => {
                setDraftMessage((prev) => prev + ' *167#');
              }}
              className="hidden"
              title="Bookmark / Code"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>

            {/* 8. Voice Mic */}
            <button
              onClick={handleRealVoiceRecord}
              disabled={isConversationClosed}
              className={`hover:text-slate-700 transition-colors ${
                isRecordingVoice ? 'text-rose-600 animate-pulse' : ''
              }`}
              title="Voice Recording"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 9. Language Label "EN" on right matching screenshot */}
          <span className="text-[11px] font-bold text-slate-500" title="Translation is not configured">Original</span>
        </div>

        {/* Textarea Input: placeholder="Write your reply here..." */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={2}
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isConversationClosed}
            readOnly={isConversationClosed}
            placeholder={isConversationClosed ? 'Conversation closed' : 'Write your reply here...'}
            className="min-h-[58px] w-full rounded-lg border border-slate-200 bg-white p-3 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 resize-none font-normal"
          />

          <button
            onClick={handleSend}
            disabled={isConversationClosed || !draftMessage.trim()}
            className={`absolute right-2 bottom-2.5 p-1 rounded transition-all ${
              draftMessage.trim()
                ? 'bg-teal-700 text-white hover:bg-teal-800'
                : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {tagDropdownOpen && !isConversationClosed && (
          <div className="w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <input
              autoFocus
              value={tagSearch}
              onChange={(event) => setTagSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape') setTagDropdownOpen(false); }}
              placeholder="Search categories..."
              className="mb-2 h-8 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              aria-label="Search categories"
            />
            <div className="max-h-48 overflow-y-auto overscroll-contain">
              {filteredTags.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-slate-400">No categories found.</p>
              ) : filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setActiveTag(tag);
                    setTagSelectionError('');
                    addTagToConversation(selectedConversation.id, tag);
                    setTagSearch('');
                    setTagDropdownOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-teal-50"
                  title={tag.name}
                >
                  <span className="min-w-0 truncate">{tag.name}</span>
                  {activeTag?.id === tag.id && <span className="ml-2 text-teal-600" aria-label="Selected">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Action Bar matching screenshot: Tag selector + Sentiment dropdown + Red "End" button */}
        <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem] items-end gap-2 pt-1">
          {/* Left: Tag selector box matching screenshot: SPAM_Q » Other » und... ✖ */}
          <div className="flex min-w-0 items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 shadow-2xs transition-colors focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-700">
              <span
                className="min-w-0 truncate"
                title={activeTag?.name || 'Select category'}
              >
                {activeTag?.name || 'Select category'}
              </span>
              {activeTag && <button
                onClick={() => { setActiveTag(null); setTagSelectionError('Category is required before replying.'); }}
                disabled={isConversationClosed}
                className="text-slate-400 hover:text-slate-700"
              ><X className="w-3 h-3" /></button>}
            </div>

            {/* Dropdown toggle arrow */}
            <div className="relative shrink-0">
              <button
                onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                disabled={isConversationClosed}
                className="rounded-lg border border-slate-300 p-1.5 text-slate-500 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
              >
                <ChevronDown className="w-3 h-3" />
              </button>

            </div>
          </div>

          {/* Middle: Sentiment Dropdown matching screenshot: Negative */}
          <div className="flex min-w-0 flex-col">
            <select
              value={selectedSentiment}
              disabled={isConversationClosed}
              onChange={(e) => {
                const s = e.target.value as SentimentType;
                setSelectedSentiment(s);
                updateConversationSentiment(selectedConversation.id, s);
              }}
              className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:border-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
              <option value="positive">Positive</option>
            </select>
          </div>

          {/* Right: Solid Red "End" button matching screenshot */}
          <button
            onClick={handleEndTicket}
            disabled={isConversationClosed}
            className="h-9 w-full rounded-xl bg-[#E11D48] px-3 text-xs font-bold text-white shadow-2xs transition-all hover:bg-rose-700 hover:shadow-md cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
          >
            {isConversationClosed ? 'Closed' : 'End'}
          </button>
        </div>
        {tagSelectionError && <p className="px-1 text-[10px] font-semibold text-rose-600">{tagSelectionError}</p>}
      </div>

      {/* Lightbox for attachments */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-lg overflow-hidden p-2">
            <img
              src={lightboxImage}
              alt="Attachment"
              className="max-w-full max-h-[75vh] object-contain rounded"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white p-1 rounded-full hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
