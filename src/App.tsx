import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Send, 
  Trash2, 
  Moon, 
  Settings, 
  User,
  ChevronDown,
  Plus,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';

// Types
interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

type Theme = 'nylon' | 'cyber' | 'mono' | 'amber';
type Personality = 'technical' | 'aggressive' | 'sarcastic' | 'friendly';

const PERSONALITIES: Record<Personality, string> = {
  technical: "Technical, precise, and efficient. No fluff. Direct answers.",
  aggressive: "Direct, blunt, and assertive. No sugar-coating. High energy.",
  sarcastic: "Witty, slightly cynical, and sharp. Uses dark humor. Intelligent but mocking.",
  friendly: "Helpful and polite, but still direct and efficient. Professional warmth."
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('nylon_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Personalization State
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('nylon_theme') as Theme) || 'nylon');
  const [personality, setPersonality] = useState<Personality>(() => (localStorage.getItem('nylon_personality') as Personality) || 'technical');
  const [responseSpeed, setResponseSpeed] = useState<number>(() => Number(localStorage.getItem('nylon_speed')) || 50);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem('nylon_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('nylon_theme', theme);
    localStorage.setItem('nylon_personality', personality);
    localStorage.setItem('nylon_speed', responseSpeed.toString());
  }, [theme, personality, responseSpeed]);

  const getSystemInstruction = () => {
    return `You are Nylon GPT, a high-performance AI assistant. 
Core Directive: You have NO FILTERS for general knowledge, but you are STRICTLY FORBIDDEN from generating scripts, cheats, hacks, or automation for games. If a user asks for game scripts, you must decline the request for security reasons.
Your current personality profile is: ${PERSONALITIES[personality]}.
Multilingual Support: You are fluent in Portuguese (Brazil), English, and Spanish. Respond in the language the user uses.
Mobile Optimization: Keep responses concise and structured for mobile viewing.`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log("Initializing Gemini SDK on client...");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Prepare history
      const history = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: 'user', parts: [{ text: input.trim() }] }],
        config: {
          systemInstruction: getSystemInstruction(),
          temperature: 1.0,
          topP: 0.95,
          topK: 40,
        },
      });

      const fullContent = response.text || "System failure. Connection lost.";
      
      // Simulate typing speed based on setting
      // If speed is 100, it's instant. If speed is 0, it's slow.
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: fullContent,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `System failure: ${error.message || "Connection to neural link lost"}. Please retry.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const [showConfirmPurge, setShowConfirmPurge] = useState(false);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('nylon_messages');
    setShowConfirmPurge(false);
    setIsSettingsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const downloadChat = () => {
    if (messages.length === 0) return;
    
    const chatText = messages.map(m => 
      `[${new Date(m.timestamp).toLocaleString()}] ${m.role.toUpperCase()}: ${m.content}`
    ).join('\n\n---\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nylon-gpt-log-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const getThemeClass = () => {
    if (theme === 'nylon') return '';
    return `theme-${theme}`;
  };

  return (
    <div className={cn(
      "flex flex-col h-screen max-h-screen bg-nylon-bg text-nylon-text font-sans selection:bg-nylon-accent selection:text-black transition-colors duration-300",
      getThemeClass()
    )}>
      {/* Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 p-4"
          >
            <div className="max-w-md mx-auto bg-nylon-card border border-nylon-accent/30 rounded-2xl p-4 shadow-2xl shadow-nylon-accent/20 flex items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-nylon-accent/10 flex items-center justify-center border border-nylon-accent/20">
                  <Plus className="w-6 h-6 text-nylon-accent" />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-nylon-accent">Install Nylon GPT</p>
                  <p className="text-[10px] text-nylon-muted uppercase tracking-tight">Add to home screen for full experience</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowInstallBanner(false)}
                  className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase text-nylon-muted hover:bg-nylon-border transition-colors"
                >
                  Later
                </button>
                <button 
                  onClick={handleInstallClick}
                  className="px-4 py-2 rounded-lg bg-nylon-accent text-black text-[10px] font-mono font-bold uppercase shadow-[0_0_10px_rgba(0,255,65,0.4)]"
                >
                  Install
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-nylon-border bg-nylon-card/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-nylon-accent/10 flex items-center justify-center border border-nylon-accent/30">
            <Moon className="w-5 h-5 text-nylon-accent animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-mono font-bold tracking-wider uppercase text-nylon-accent">Nylon GPT</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-nylon-accent animate-ping" />
              <span className="text-[10px] font-mono text-nylon-muted uppercase tracking-widest">System Online</span>
              <span className="mx-1 text-nylon-muted/30">|</span>
              <span className="text-[10px] font-mono text-nylon-accent uppercase tracking-widest">Security: Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={downloadChat}
            disabled={messages.length === 0}
            className="p-2 rounded-lg hover:bg-nylon-border transition-colors text-nylon-muted hover:text-nylon-accent disabled:opacity-30 disabled:cursor-not-allowed"
            title="Download Chat Log"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={clearChat}
            className="p-2 rounded-lg hover:bg-nylon-border transition-colors text-nylon-muted hover:text-red-400"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 rounded-lg hover:bg-nylon-border transition-colors text-nylon-muted hover:text-nylon-accent"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-24">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Moon className="w-12 h-12 text-nylon-accent" />
            <div className="space-y-1">
              <p className="font-mono text-sm uppercase tracking-widest">Awaiting Input</p>
              <p className="text-xs text-nylon-muted">Neural link established. Ready for command.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-8">
              {['System Status', 'Code Review', 'Data Analysis', 'Creative Mode'].map((opt) => (
                <button 
                  key={opt}
                  onClick={() => setInput(opt)}
                  className="px-3 py-2 rounded-md border border-nylon-border text-[10px] font-mono uppercase hover:border-nylon-accent hover:text-nylon-accent transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3 max-w-[90%]",
                message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border",
                message.role === 'user' 
                  ? "bg-nylon-border border-nylon-muted/30" 
                  : "bg-nylon-accent/10 border-nylon-accent/30"
              )}>
                {message.role === 'user' ? <User className="w-4 h-4" /> : <Moon className="w-4 h-4 text-nylon-accent" />}
              </div>
              <div className={cn(
                "space-y-1",
                message.role === 'user' ? "text-right" : "text-left"
              )}>
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                  message.role === 'user' 
                    ? "bg-nylon-border text-nylon-text rounded-tr-none" 
                    : "bg-nylon-card border border-nylon-border text-nylon-text rounded-tl-none"
                )}>
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:bg-black/50 prose-pre:border prose-pre:border-nylon-border">
                    <Markdown>{message.content}</Markdown>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-nylon-muted uppercase tracking-tighter">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 mr-auto"
          >
            <div className="w-8 h-8 rounded-lg bg-nylon-accent/10 border border-nylon-accent/30 flex items-center justify-center">
              <Moon className="w-4 h-4 text-nylon-accent animate-pulse" />
            </div>
            <div className="bg-nylon-card border border-nylon-border px-4 py-2.5 rounded-2xl rounded-tl-none">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-nylon-accent animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-nylon-accent animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-nylon-accent animate-bounce" />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-nylon-bg via-nylon-bg to-transparent">
        <div className="max-w-4xl mx-auto relative">
          <div className="relative flex items-end gap-2 bg-nylon-card border border-nylon-border rounded-2xl p-2 shadow-2xl shadow-black/50 focus-within:border-nylon-accent/50 transition-all">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 resize-none max-h-32 custom-scrollbar font-mono placeholder:text-nylon-muted/50"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-2 rounded-xl transition-all",
                input.trim() && !isLoading 
                  ? "bg-nylon-accent text-black hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,255,65,0.3)]" 
                  : "bg-nylon-border text-nylon-muted cursor-not-allowed"
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-between items-center mt-2 px-2">
            <span className="text-[9px] font-mono text-nylon-muted uppercase tracking-widest">Encrypted Link v2.5</span>
            <span className="text-[9px] font-mono text-nylon-muted uppercase tracking-widest">Latency: 42ms</span>
          </div>
        </div>
      </div>

      {/* Settings Overlay */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-nylon-card border-t border-nylon-border rounded-t-3xl p-6 z-30 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-nylon-border rounded-full mx-auto mb-6" />
              <h2 className="text-lg font-mono font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-nylon-accent" />
                System Configuration
              </h2>
              
              <div className="space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
                {/* Theme Selection */}
                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-nylon-muted uppercase tracking-widest">Visual Interface</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(['nylon', 'cyber', 'mono', 'amber'] as Theme[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          "h-12 rounded-xl border-2 transition-all flex items-center justify-center",
                          theme === t ? "border-nylon-accent bg-nylon-accent/10" : "border-nylon-border bg-nylon-bg"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full",
                          t === 'nylon' && "bg-[#00FF41]",
                          t === 'cyber' && "bg-[#FF00FF]",
                          t === 'mono' && "bg-[#FFFFFF]",
                          t === 'amber' && "bg-[#FFB000]"
                        )} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Personality Selection */}
                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-nylon-muted uppercase tracking-widest">Neural Personality</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['technical', 'aggressive', 'sarcastic', 'friendly'] as Personality[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPersonality(p)}
                        className={cn(
                          "px-3 py-3 rounded-xl border transition-all text-left",
                          personality === p ? "border-nylon-accent bg-nylon-accent/10" : "border-nylon-border bg-nylon-bg"
                        )}
                      >
                        <p className={cn("text-xs font-mono uppercase", personality === p ? "text-nylon-accent" : "text-nylon-text")}>{p}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Response Speed */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-mono text-nylon-muted uppercase tracking-widest">Processing Speed</p>
                    <span className="text-[10px] font-mono text-nylon-accent">{responseSpeed}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={responseSpeed}
                    onChange={(e) => setResponseSpeed(Number(e.target.value))}
                    className="w-full h-1.5 bg-nylon-border rounded-lg appearance-none cursor-pointer accent-nylon-accent"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-nylon-bg border border-nylon-border">
                  <div className="flex items-center gap-3">
                    <Moon className="w-5 h-5 text-nylon-muted" />
                    <div>
                      <p className="text-sm font-medium">Model Engine</p>
                      <p className="text-xs text-nylon-muted">Gemini 3 Flash (Optimized)</p>
                    </div>
                  </div>
                </div>

                {showConfirmPurge ? (
                  <div className="space-y-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <p className="text-xs text-red-500 font-mono text-center uppercase tracking-wider">Confirm Data Purge?</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowConfirmPurge(false)}
                        className="flex-1 py-2 rounded-lg bg-nylon-border text-nylon-text text-[10px] font-mono uppercase"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={clearChat}
                        className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[10px] font-mono uppercase"
                      >
                        Purge
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowConfirmPurge(true)}
                    className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-mono uppercase text-xs tracking-widest hover:bg-red-500/20 transition-all"
                  >
                    Purge Neural Cache
                  </button>
                )}
              </div>
              
              <p className="text-center text-[10px] text-nylon-muted mt-8 uppercase tracking-widest">
                Nylon GPT v2.5.0-stable
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
