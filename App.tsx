
import React, { useState, useEffect, useRef } from 'react';
import { Send, Book, MessageCircle, ChevronRight, X, User, RefreshCw, Volume2, ArrowLeft, Check, BookOpen, Headphones, Languages, AlertCircle } from 'lucide-react';
import { ViewState, Message, Scenario, VocabMode, VocabQuestion } from './types';
import { SCENARIOS, MOCK_STATS } from './constants';
import { initChatSession, sendMessageToGemini, speakKorean, generateVocabBatch } from './services/geminiService';

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

const HomeView = ({ onStartFree }: { onStartFree: () => void }) => (
  <div className="p-6 pt-safe pb-32 h-dvh overflow-y-auto no-scrollbar">
    <header className="mb-8">
      <h1 className="text-2xl font-bold text-slate-900">你好, Learner</h1>
      <p className="text-slate-500 text-sm mt-1">今天也要开心学韩语 ✨</p>
    </header>
    <div onClick={onStartFree} className="bg-sapphire-600 rounded-3xl p-6 text-white mb-6 shadow-xl cursor-pointer active:scale-95 transition-all flex items-center justify-between">
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
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'model' && !loading) speakKorean(lastMsg.text);
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
    <div className="flex flex-col h-dvh bg-slate-50 pt-safe overflow-hidden">
      <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-100 shrink-0">
        <button onClick={onExit} className="p-2 text-slate-400"><X size={20} /></button>
        <span className="font-bold text-slate-800 text-sm leading-tight">{scenario.title}</span>
        <div className="w-8" />
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm relative group ${m.role === 'user' ? 'bg-sapphire-600 text-white' : 'bg-white text-slate-800'}`}>
              <p className="text-sm">{m.text}</p>
              {m.role === 'model' && (
                <button onClick={() => speakKorean(m.text)} className="absolute -right-10 top-2 p-2 bg-white rounded-full shadow-sm text-sapphire-500">
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs italic text-slate-400 animate-pulse">对方正在说话...</div>}
      </div>
      <div className="p-4 bg-white border-t border-slate-100 pb-safe shrink-0">
        <div className="flex space-x-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="用韩语回复..." className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 outline-none" />
          <button onClick={handleSend} className="bg-sapphire-600 text-white p-3 rounded-xl"><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
};

const VocabView = () => {
  const [mode, setMode] = useState<VocabMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sel, setSel] = useState<string | null>(null);

  const startQuiz = async (m: VocabMode) => {
    setMode(m);
    setLoading(true);
    setError(false);
    setQuestions([]);
    setCurrentIndex(0);
    setSel(null);
    try {
      const res = await generateVocabBatch(m);
      if (res.length > 0) {
        setQuestions(res);
        if (m === VocabMode.LISTENING) speakKorean(res[0].questionText);
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questions.length) {
      startQuiz(mode!);
      return;
    }
    setSel(null);
    setCurrentIndex(nextIdx);
    if (mode === VocabMode.LISTENING) speakKorean(questions[nextIdx].questionText);
  };

  if (!mode) return (
    <div className="p-6 pt-safe h-dvh overflow-y-auto no-scrollbar pb-32">
      <h2 className="text-2xl font-bold mb-6">词汇挑战</h2>
      <div className="space-y-4">
        {[
          { m: VocabMode.LISTENING, t: '听音辨义', d: '听发音，选正确翻译', i: <Headphones className="text-sapphire-500" /> },
          { m: VocabMode.READING_K_C, t: '韩语选义', d: '看韩语，选正确翻译', i: <BookOpen className="text-sapphire-500" /> },
          { m: VocabMode.READING_C_K, t: '中选韩语', d: '看意思，选正确韩语', i: <Languages className="text-sapphire-500" /> }
        ].map((item) => (
          <button key={item.m} onClick={() => startQuiz(item.m)} className="w-full bg-white p-6 rounded-3xl border border-slate-100 flex items-center space-x-4 shadow-sm active:scale-95 transition-all text-left">
            <div className="p-3 bg-sapphire-50 rounded-2xl shrink-0">{item.i}</div>
            <div><h4 className="font-bold text-slate-800">{item.t}</h4><p className="text-xs text-slate-400">{item.d}</p></div>
          </button>
        ))}
      </div>
    </div>
  );

  const currentQ = questions[currentIndex];

  return (
    <div className="h-dvh flex flex-col bg-slate-50 pt-safe overflow-hidden">
      <div className="px-6 h-16 flex items-center shrink-0">
        <button onClick={() => setMode(null)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
        <span className="ml-2 font-bold text-slate-400">词汇练习 - {currentIndex + 1}/5</span>
      </div>
      
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <RefreshCw className="animate-spin text-sapphire-500 mb-4" size={32} />
          <p className="text-slate-400 text-sm">正在获取精选题目...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h3 className="font-bold text-slate-800 mb-2">加载失败</h3>
          <p className="text-sm text-slate-400 mb-6">暂时无法连接到知识库，请检查网络或重试。</p>
          <button onClick={() => startQuiz(mode)} className="bg-sapphire-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-sapphire-100">点击重试</button>
        </div>
      ) : currentQ ? (
        <div className="flex-1 flex flex-col overflow-hidden px-6 pb-32">
          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm text-center mb-6 shrink-0 relative border border-slate-50 animate-fade-in">
            <h2 className={`text-3xl font-black text-slate-800 transition-opacity ${mode === VocabMode.LISTENING && !sel ? 'opacity-0' : 'opacity-100'}`}>{currentQ.questionText}</h2>
            {mode === VocabMode.LISTENING && (
              <button onClick={() => speakKorean(currentQ.questionText)} className="mt-4 mx-auto flex items-center space-x-2 p-3 bg-sapphire-50 rounded-full text-sapphire-600 font-bold px-6">
                <Volume2 size={24} /><span>播放发音</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar min-h-0">
            {currentQ.options.map((opt, i) => (
              <button key={i} onClick={() => !sel && setSel(opt)} className={`w-full py-4 px-6 rounded-2xl font-bold text-left border transition-all ${sel === opt ? (opt === currentQ.correctAnswer ? 'bg-green-500 text-white border-green-500' : 'bg-red-400 text-white border-red-400') : (sel && opt === currentQ.correctAnswer ? 'bg-green-500 text-white border-green-500' : 'bg-white border-slate-100 text-slate-600')}`}>
                {opt}
              </button>
            ))}
            {sel && (
              <div className="animate-fade-in mt-4 bg-white p-5 rounded-2xl border border-sapphire-100">
                <p className="text-xs text-sapphire-700 leading-relaxed font-medium">💡 解析：{currentQ.explanation}</p>
              </div>
            )}
          </div>

          <div className={`fixed bottom-24 left-6 right-6 transition-all duration-300 ${sel ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
             <button onClick={nextQuestion} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold shadow-2xl active:scale-95 transition-transform">下一题</button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [activeScen, setActiveScen] = useState<Scenario | null>(null);

  return (
    <div className="h-dvh bg-slate-50 text-slate-900 overflow-hidden relative font-sans">
      {view === ViewState.HOME && <HomeView onStartFree={() => { setActiveScen({ id: 'free', title: '自由通话', description: '', emoji: '💬', contextPrompt: 'Casual chat.' }); setView(ViewState.CHAT); }} />}
      {view === ViewState.SCENARIO_SELECT && (
        <div className="p-6 pt-safe h-dvh overflow-y-auto no-scrollbar pb-32">
          <h2 className="text-2xl font-bold mb-6">场景练习</h2>
          <div className="space-y-4">
            {SCENARIOS.map(s => (
              <button key={s.id} onClick={() => { setActiveScen(s); setView(ViewState.CHAT); }} className="w-full bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all">
                <div className="flex items-center space-x-4"><span className="text-2xl">{s.emoji}</span><div className="text-left font-bold">{s.title}</div></div>
                <ChevronRight size={20} className="text-slate-200 group-hover:text-sapphire-400" />
              </button>
            ))}
          </div>
        </div>
      )}
      {view === ViewState.CHAT && activeScen && <ChatInterface scenario={activeScen} onExit={() => { setView(ViewState.HOME); setActiveScen(null); }} />}
      {view === ViewState.VOCAB_QUIZ && <VocabView />}
      {view !== ViewState.CHAT && <BottomNav currentView={view} setView={setView} />}
    </div>
  );
}
