
import React, { useState, useEffect, useRef } from 'react';
import { Send, Book, MessageCircle, ChevronRight, X, User, RefreshCw, Volume2, ArrowLeft, Check, BookOpen } from 'lucide-react';
import { ViewState, Message, Scenario, VocabMode } from './types';
import { SCENARIOS, MOCK_STATS } from './constants';
import { initChatSession, sendMessageToGemini, speakKorean, generateVocabBatch } from './services/geminiService';

// --- 底部导航 ---
const BottomNav = ({ currentView, setView }: { currentView: ViewState, setView: (v: ViewState) => void }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/95 backdrop-blur-xl border border-white/60 rounded-full shadow-lg h-[64px] flex justify-around items-center z-50">
    <button onClick={() => setView(ViewState.HOME)} className={`p-3 rounded-full ${currentView === ViewState.HOME ? 'text-sapphire-600 bg-sapphire-50' : 'text-slate-400'}`}>
      <User size={24} />
    </button>
    <button onClick={() => setView(ViewState.SCENARIO_SELECT)} className={`p-3 rounded-full ${currentView === ViewState.SCENARIO_SELECT ? 'text-sapphire-600 bg-sapphire-50' : 'text-slate-400'}`}>
      <MessageCircle size={24} />
    </button>
    <button onClick={() => setView(ViewState.VOCAB_QUIZ)} className={`p-3 rounded-full ${currentView === ViewState.VOCAB_QUIZ ? 'text-sapphire-600 bg-sapphire-50' : 'text-slate-400'}`}>
      <Book size={24} />
    </button>
  </div>
);

// --- 首页 ---
const HomeView = ({ onStartFree }: { onStartFree: () => void }) => (
  <div className="p-6 pt-safe pb-32 h-dvh overflow-y-auto no-scrollbar">
    <header className="mb-8">
      <h1 className="text-2xl font-bold text-slate-900">你好, Learner</h1>
      <p className="text-slate-500 text-sm mt-1">今天也要开心学韩语 ✨</p>
    </header>

    <div 
      onClick={onStartFree}
      className="bg-sapphire-600 rounded-3xl p-6 text-white mb-6 shadow-xl shadow-sapphire-200 cursor-pointer active:scale-95 transition-all flex items-center justify-between"
    >
      <div>
        <h3 className="text-xl font-bold mb-1">自由练习</h3>
        <p className="text-sapphire-100 text-xs opacity-90">随心所欲聊点什么</p>
      </div>
      <MessageCircle size={32} />
    </div>

    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
        <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">完成对话</div>
        <div className="text-2xl font-black text-slate-800">{MOCK_STATS.scenariosCompleted}</div>
      </div>
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
        <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">词汇量</div>
        <div className="text-2xl font-black text-slate-800">{MOCK_STATS.vocabMastered}</div>
      </div>
    </div>
  </div>
);

// --- 聊天界面 ---
const ChatInterface = ({ scenario, onExit }: { scenario: Scenario, onExit: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initChatSession(scenario.contextPrompt);
    setLoading(true);
    sendMessageToGemini(`[START] ${scenario.title}`).then(text => {
      setMessages([{ id: 'init', role: 'model', text, timestamp: Date.now() }]);
      setLoading(false);
    });
  }, [scenario]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: msg, timestamp: Date.now() }]);
    setLoading(true);
    const reply = await sendMessageToGemini(msg);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: reply, timestamp: Date.now() }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-dvh bg-slate-50 pt-safe">
      <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-100">
        <button onClick={onExit} className="p-2 text-slate-400"><X size={20} /></button>
        <span className="font-bold text-slate-800">{scenario.title}</span>
        <div className="w-8" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm relative group ${m.role === 'user' ? 'bg-sapphire-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
              <p className="text-sm">{m.text}</p>
              {m.role === 'model' && (
                <button 
                  onClick={() => speakKorean(m.text)}
                  className="absolute -right-10 top-2 p-2 bg-white rounded-full shadow-sm text-sapphire-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs italic text-slate-400 ml-2">正在思考...</div>}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 pb-safe">
        <div className="flex space-x-2">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="输入内容..." 
            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 outline-none" 
          />
          <button onClick={handleSend} className="bg-sapphire-600 text-white p-2 rounded-xl"><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
};

// --- 词汇挑战 ---
const VocabView = () => {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState<any>(null);
  const [sel, setSel] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setSel(null);
    const res = await generateVocabBatch("READING");
    if (res.length > 0) setQ(res[0]);
    setLoading(false);
  };

  if (!active) return (
    <div className="p-6 pt-safe h-dvh flex flex-col items-center justify-center">
      <div className="p-8 bg-white rounded-[3rem] shadow-sm border border-slate-100 text-center">
        <BookOpen size={48} className="mx-auto text-sapphire-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">词汇量测试</h2>
        <p className="text-sm text-slate-400 mb-6">通过小测验巩固你的韩语词汇</p>
        <button onClick={() => { setActive(true); load(); }} className="bg-sapphire-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-sapphire-100">开始挑战</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 pt-safe h-dvh flex flex-col">
      <button onClick={() => setActive(false)} className="mb-8 p-2 w-fit"><ArrowLeft size={24} /></button>
      {loading ? <RefreshCw className="animate-spin m-auto" /> : q && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="bg-white p-10 rounded-3xl shadow-sm text-center">
            <h2 className="text-3xl font-black">{q.q}</h2>
          </div>
          <div className="space-y-3 flex-1">
            {q.o.map((opt: string, i: number) => (
              <button 
                key={i} 
                onClick={() => setSel(opt)} 
                className={`w-full py-4 px-6 rounded-2xl font-bold text-left border transition-all ${sel === opt ? (opt === q.a ? 'bg-green-500 text-white border-green-500' : 'bg-red-400 text-white border-red-400') : 'bg-white border-slate-100'}`}
              >
                {opt}
              </button>
            ))}
          </div>
          {sel && (
            <div className="animate-fade-in mb-8">
              <p className="text-xs text-slate-400 italic mb-4">{q.e}</p>
              <button onClick={load} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold">下一题</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [activeScen, setActiveScen] = useState<Scenario | null>(null);

  const startFree = () => {
    setActiveScen({ id: 'free', title: '自由练习', description: '', emoji: '💬', contextPrompt: 'Casual chat.' });
    setView(ViewState.CHAT);
  };

  return (
    <div className="h-dvh bg-slate-50 text-slate-900 overflow-hidden relative font-sans">
      {view === ViewState.HOME && <HomeView onStartFree={startFree} />}
      
      {view === ViewState.SCENARIO_SELECT && (
        <div className="p-6 pt-safe h-dvh overflow-y-auto no-scrollbar">
          <h2 className="text-2xl font-bold mb-6">场景选择</h2>
          <div className="space-y-4">
            {SCENARIOS.map(s => (
              <button key={s.id} onClick={() => { setActiveScen(s); setView(ViewState.CHAT); }} className="w-full bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{s.emoji}</span>
                  <div className="text-left font-bold">{s.title}</div>
                </div>
                <ChevronRight size={20} className="text-slate-200" />
              </button>
            ))}
          </div>
        </div>
      )}

      {view === ViewState.CHAT && activeScen && (
        <ChatInterface scenario={activeScen} onExit={() => { setView(ViewState.HOME); setActiveScen(null); }} />
      )}

      {view === ViewState.VOCAB_QUIZ && <VocabView />}

      {view !== ViewState.CHAT && <BottomNav currentView={view} setView={setView} />}
    </div>
  );
}
