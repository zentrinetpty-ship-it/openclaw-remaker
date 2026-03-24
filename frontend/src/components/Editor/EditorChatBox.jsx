import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, User } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function EditorChatBox({ project, updateSlide, onAction }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your AI editor assistant. Tell me what you'd like to change — e.g. \"change slide 2 transition to zoom\", \"delete slide 3\", \"add a title card to slide 1\", or \"set all durations to 8 seconds\"." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);

    try {
      const slides = (project?.slides || []).map((s, i) => ({
        index: i + 1,
        id: s.id,
        title: s.title,
        duration: s.duration,
        transition: s.transition,
        narration: s.narration?.slice(0, 80),
        hasImage: !!s.assetUrl,
        hasVoice: !!s.voiceUrl,
        graphicsCount: (s.graphics || []).length,
        vfx: s.vfx || 'none',
      }));

      const res = await axios.post(`${API}/editor/chat`, {
        message: msg,
        projectContext: {
          title: project?.title,
          slideCount: slides.length,
          slides,
          bgmUrl: project?.bgmUrl || null,
          captionStyle: project?.captionStyleId || null,
        }
      });

      if (res.data.success) {
        const { reply, actions } = res.data;
        setMessages(prev => [...prev, { role: 'assistant', text: reply }]);

        if (actions && actions.length > 0) {
          for (const action of actions) {
            onAction(action);
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I couldn\'t process that. Try rephrasing.' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Toggle Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-16 right-6 z-[9999] w-12 h-12 rounded-sm flex items-center justify-center shadow-lg border-2 border-indigo-500/20 bg-indigo-500 btn-sharp"
            data-testid="chat-toggle-btn"
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-16 right-6 z-[9999] w-96 h-[480px] rounded-md border-2 border-white/[0.08] bg-[#0a0f1a] shadow-[0_20px_60px_-12px_rgba(129,140,248,0.15)] flex flex-col overflow-hidden"
            data-testid="chat-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-indigo-500">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">AI Editor Assistant</p>
                  <p className="text-[9px] text-slate-500">Modify your video with natural language</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-sm text-slate-500 hover:text-slate-300 hover:bg-white/5" data-testid="chat-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide bg-[#0a0f1a]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0 bg-indigo-500/10">
                      <Bot className="w-3 h-3 text-indigo-400" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-md rounded-br-none'
                      : 'bg-white/[0.04] text-slate-300 rounded-md rounded-bl-none border border-white/[0.06]'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0 bg-white/[0.04] border border-white/[0.06]">
                      <User className="w-3 h-3 text-slate-400" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0 bg-indigo-500/10">
                    <Bot className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="px-3 py-2 rounded-md bg-white/[0.04] text-slate-500 text-xs rounded-bl-none border border-white/[0.06]">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Tell me what to change..."
                  className="flex-1 px-3 py-2 rounded-sm bg-[#0d1117] border-2 border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0a0f1a]"
                  disabled={loading}
                  data-testid="chat-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="px-3 py-2 rounded-none bg-indigo-500 text-white disabled:opacity-40 transition btn-sharp"
                  data-testid="chat-send-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Generate all images', 'Set transitions to zoom', 'Add title card to slide 1', 'Change all durations to 6s'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); }}
                    className="px-2 py-0.5 rounded-none text-[9px] bg-white/[0.03] text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 border-2 border-white/[0.06] font-bold transition"
                    data-testid={`chat-suggestion-${suggestion.slice(0, 15).replace(/\s/g, '-')}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
