
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Book, MessageCircle, ChevronRight, X, Volume2, User, RefreshCw, Trophy, Settings, Languages, Edit2, Phone, PhoneOff, MicOff, Image as ImageIcon, Check, ArrowRight, Ear, BookOpen, ArrowLeft, Play, Sparkles, Heart, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ViewState, ChatMode, Message, Scenario, UserStats, PartnerPersona, VocabQuestion, VocabMode } from './types';
import { SCENARIOS, MOCK_STATS } from './constants';
import { initChatSession, sendMessageToGemini, generateReview, generateVocabBatch, translateText, startLiveSession, LiveSessionController, generateTTS, playAudioData } from './services/geminiService';

// --- Sub-components ---

// Floating Island Bottom Nav
const BottomNav = ({ currentView, setView }: { currentView: ViewState, setView: (v: ViewState) => void }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] sm:w-[85%] max-w-sm bg-white/95 backdrop-blur-xl border border-white/60 rounded-full shadow-[0_8px_30px_rgba(15,82,186,0.12)] h-[64px] sm:h-[72px] flex justify-around items-center z-50 px-2 transition-all ring-1 ring-sapphire-50">
    <button 
      onClick={() => setView(ViewState.HOME)}
      className={`relative p-3 rounded-full transition-all duration-300 group ${currentView === ViewState.HOME ? 'text-sapphire-600 bg-sapphire-50 scale-105 shadow-inner' : 'text-slate-400 hover:text-sapphire-400'}`}
    >
      <User size={24} strokeWidth={currentView === ViewState.HOME ? 2.5 : 2} className="group-active:scale-90 transition-transform" />
      {currentView === ViewState.HOME && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sapphire-500 rounded-full animate-bounce"></span>}
    </button>
    <button 
      onClick={() => setView(ViewState.SCENARIO_SELECT)}
      className={`relative p-3 rounded-full transition-all duration-300 group ${currentView === ViewState.SCENARIO_SELECT ? 'text-sapphire-600 bg-sapphire-50 scale-105 shadow-inner' : 'text-slate-400 hover:text-sapphire-400'}`}
    >
      <MessageCircle size={24} strokeWidth={currentView === ViewState.SCENARIO_SELECT ? 2.5 : 2} className="group-active:scale-90 transition-transform" />
      {currentView === ViewState.SCENARIO_SELECT && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sapphire-500 rounded-full animate-bounce"></span>}
    </button>
    <button 
      onClick={() => setView(ViewState.VOCAB_QUIZ)}
      className={`relative p-3 rounded-full transition-all duration-300 group ${currentView === ViewState.VOCAB_QUIZ ? 'text-sapphire-600 bg-sapphire-50 scale-105 shadow-inner' : 'text-slate-400 hover:text-sapphire-400'}`}
    >
      <Book size={24} strokeWidth={currentView === ViewState.VOCAB_QUIZ ? 2.5 : 2} className="group-active:scale-90 transition-transform" />
      {currentView === ViewState.VOCAB_QUIZ && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sapphire-500 rounded-full animate-bounce"></span>}
    </button>
  </div>
);

const AudioWaveLoader = () => (
  <div className="flex items-center space-x-1 h-4 px-1">
    <div className="w-1 h-3 bg-sapphire-400 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
    <div className="w-1 h-3 bg-sapphire-400 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
    <div className="w-1 h-3 bg-sapphire-400 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
  </div>
);

const ChatBubble: React.FC<{ 
  msg: Message, 
  persona?: PartnerPersona,
  onTranslate: (id: string, text: string) => void,
  onPlayAudio: (audioData: string) => void
}> = ({ msg, persona, onTranslate, onPlayAudio }) => {
  const isUser = msg.role === 'user';
  
  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      {!isUser && (
        <div className="flex flex-col items-center mr-2 sm:mr-3 flex-shrink-0 relative">
          {persona?.avatarUrl ? (
             <img src={persona.avatarUrl} alt="avatar" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover shadow-sapphire-200 shadow-md border-2 border-white" />
          ) : (
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-sapphire-100 to-sapphire-200 flex items-center justify-center text-lg sm:text-xl shadow-sapphire-200 shadow-md border-2 border-white text-slate-700">
              {persona ? persona.emoji : '🤖'}
            </div>
          )}
          {/* Cute name tag */}
          <span className="text-[9px] sm:text-[10px] text-sapphire-800/70 font-bold mt-1.5 bg-white px-2 py-0.5 rounded-full shadow-sm border border-sapphire-50 max-w-[60px] truncate">{persona?.name || 'AI'}</span>
        </div>
      )}
      <div className={`max-w-[85%] sm:max-w-[80%] flex flex-col items-start ${isUser ? 'items-end' : ''}`}>
        <div className={`px-4 py-3 sm:px-5 sm:py-4 shadow-sm relative group transition-all duration-300 ${
          isUser 
            ? 'bg-sapphire-600 text-white rounded-[1.5rem] rounded-tr-sm sm:rounded-[2rem] sm:rounded-tr-lg shadow-sapphire-200/50 shadow-lg' 
            : 'bg-white border border-slate-50 text-slate-700 rounded-[1.5rem] rounded-tl-sm sm:rounded-[2rem] sm:rounded-tl-lg shadow-[0_4px_15px_rgba(0,0,0,0.03)]'
        }`}>
          <div className="flex items-start gap-2 sm:gap-3">
             {/* Audio Controls for AI */}
             {!isUser && (
               <div className="mt-0.5">
                  {msg.isAudioLoading ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sapphire-50 flex items-center justify-center">
                      <AudioWaveLoader />
                    </div>
                  ) : msg.audioUrl ? (
                    <button 
                      onClick={() => onPlayAudio(msg.audioUrl!)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sapphire-50 text-sapphire-600 flex items-center justify-center hover:bg-sapphire-100 active:scale-90 transition-all shadow-sm"
                    >
                      <Volume2 size={14} fill="currentColor" className="opacity-90 sm:w-4 sm:h-4" />
                    </button>
                  ) : null}
               </div>
             )}

             <p className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap pt-0.5 font-medium tracking-wide">{msg.text}</p>
          </div>
          
          {msg.translation && (
            <div className="mt-2 sm:mt-3 pt-2 border-t border-dashed border-slate-100/50 text-xs text-sapphire-800/80 italic pl-9 sm:pl-11">
              {msg.translation}
            </div>
          )}

          {!isUser && !msg.translation && (
            <button 
              onClick={() => onTranslate(msg.id, msg.text)}
              className="absolute -right-8 bottom-2 p-1.5 sm:p-2 bg-white rounded-full shadow-sm border border-slate-100 text-slate-300 hover:text-sapphire-500 active:scale-90 transition-all"
            >
              <Languages size={14} className="sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
        {msg.suggestion && !isUser && (
           <div className="mt-2 ml-4 text-xs text-slate-500 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-sapphire-50 shadow-sm inline-flex items-center gap-1">
             <Sparkles size={12} className="text-yellow-400 fill-current" />
             {msg.suggestion}
           </div>
        )}
      </div>
    </div>
  );
};

// --- Live Call Interface (Real-time Audio) ---

const LiveCallView = ({ 
  persona, 
  onEndCall 
}: { 
  persona: PartnerPersona, 
  onEndCall: (transcript: Message[]) => void 
}) => {
  const [session, setSession] = useState<LiveSessionController | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcriptHistory, setTranscriptHistory] = useState<Message[]>([]);
  const [status, setStatus] = useState("正在呼叫...");

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const sess = await startLiveSession(
          persona,
          (userText, modelText) => {
            if (!mounted) return;
            // Accumulate transcript
            const newMsgs: Message[] = [];
            if (userText.trim()) {
              newMsgs.push({ id: Date.now().toString()+'u', role: 'user', text: userText, timestamp: Date.now() });
            }
            if (modelText.trim()) {
               newMsgs.push({ id: Date.now().toString()+'m', role: 'model', text: modelText, timestamp: Date.now() });
            }
            setTranscriptHistory(prev => [...prev, ...newMsgs]);
          },
          (level) => {
            if(mounted) setAudioLevel(level);
          }
        );
        if (mounted) {
          setSession(sess);
          setStatus("通话中");
        }
      } catch (e) {
        if(mounted) setStatus("连接失败");
      }
    };
    start();

    return () => {
      mounted = false;
      session?.disconnect();
    };
  }, []);

  const toggleMute = () => {
    if (session) {
      const newVal = !isMuted;
      session.mute(newVal);
      setIsMuted(newVal);
    }
  };

  const handleHangup = () => {
    session?.disconnect();
    onEndCall(transcriptHistory);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-sapphire-900 z-50 flex flex-col items-center justify-between pb-safe pt-safe text-white overflow-hidden h-dvh">
       {/* Background Ambience */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute top-1/4 -left-10 w-64 h-64 bg-sapphire-400 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
          <div className="absolute top-1/3 -right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
       </div>

       <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
          {/* Avatar Ripple Effect */}
          <div className="relative mb-8 sm:mb-0">
             <div className="absolute inset-0 bg-sapphire-400/30 rounded-full blur-2xl transform scale-150 transition-all duration-100" style={{ opacity: 0.3 + Math.min(0.7, audioLevel * 8), transform: `scale(${1.2 + audioLevel * 2})` }}></div>
             <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-[3rem] border-4 border-white/20 overflow-hidden relative z-10 shadow-2xl bg-slate-800/50 backdrop-blur">
               {persona.avatarUrl ? (
                 <img src={persona.avatarUrl} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-7xl">
                    {persona.emoji}
                 </div>
               )}
             </div>
          </div>
          <h2 className="text-3xl font-bold mt-6 sm:mt-10 tracking-tight">{persona.name}</h2>
          <div className="flex items-center space-x-2 mt-3 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
             <div className={`w-2 h-2 rounded-full ${status === "通话中" ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}></div>
             <p className="text-sapphire-100 text-sm font-medium">{status}</p>
          </div>
       </div>

       <div className="w-full px-10 pb-16 flex justify-between items-center max-w-sm mx-auto z-10">
          <button 
            onClick={toggleMute}
            className={`p-5 rounded-full backdrop-blur-xl transition-all shadow-lg active:scale-95 ${isMuted ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          
          <button 
            onClick={handleHangup}
            className="p-7 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/40 transform hover:scale-105 active:scale-95 transition-all"
          >
            <PhoneOff size={32} fill="white" />
          </button>

          <button className="p-5 rounded-full bg-white/10 text-white/30 cursor-not-allowed">
            <Volume2 size={28} />
          </button>
       </div>
    </div>
  );
};

// --- Main Views ---

const HomeView = ({ stats, onOpenFreeSettings }: { stats: UserStats, onOpenFreeSettings: () => void }) => {
  const data = [
    { name: 'Grammar', value: stats.examCoverage.grammar, fill: '#0F52BA' },
    { name: 'Vocab', value: stats.examCoverage.vocabulary, fill: '#6d9cdf' },
    { name: 'Listening', value: stats.examCoverage.listening, fill: '#9bbbe9' },
  ];

  return (
    <div className="p-4 sm:p-6 pb-32 pt-safe animate-fade-in h-dvh overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-center mt-2 sm:mt-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">你好, Learner</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">今天也是积累的一天 ✨</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] bg-white flex items-center justify-center border border-slate-100 shadow-sm text-xl sm:text-2xl rotate-3 hover:rotate-6 transition-transform">
           🇰🇷
        </div>
      </header>

      {/* Natural Ability Map */}
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-7 shadow-[0_10px_40px_rgb(15,82,186,0.06)] border border-white mb-6 sm:mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sapphire-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex justify-between items-center mb-4 sm:mb-6 relative z-10">
          <h3 className="font-bold text-slate-800 text-base sm:text-lg">自然能力积累</h3>
          <span className="text-[10px] font-bold text-sapphire-600 bg-sapphire-50 px-3 py-1.5 rounded-full uppercase tracking-wide">TOPIK 3-4</span>
        </div>
        
        <div className="h-44 sm:h-52 w-full flex items-center justify-center relative z-10">
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={6} dataKey="value" stroke="none" cornerRadius={6}>
                 {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
               </Pie>
             </PieChart>
           </ResponsiveContainer>
           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-2xl sm:text-3xl font-black text-slate-800">{stats.fluencyScore}%</span>
             <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Stability</span>
           </div>
        </div>
      </div>

      {/* Quick Action: Free Talk */}
      <div 
        onClick={onOpenFreeSettings}
        className="relative overflow-hidden bg-gradient-to-br from-sapphire-600 to-sapphire-800 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-7 text-white shadow-xl shadow-sapphire-200/50 cursor-pointer active:scale-[0.98] transition-all mb-6 sm:mb-8 group"
      >
        <div className="relative z-10 flex flex-col h-full justify-between min-h-[120px] sm:min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:bg-white/30 transition-colors">
              <Phone size={20} className="text-white fill-white/20 sm:w-6 sm:h-6" />
            </div>
            <div className="bg-white/20 p-2 rounded-full backdrop-blur-md">
              <Settings size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <div>
             <h3 className="text-xl sm:text-2xl font-bold mb-1 tracking-tight">自由通话</h3>
             <p className="text-sapphire-100 text-xs sm:text-sm opacity-90 font-medium">随时随地，开口即练</p>
          </div>
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute -right-6 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
        <div className="absolute top-10 right-10 w-20 h-20 bg-sapphire-400/30 rounded-full blur-xl"></div>
      </div>

       <div className="grid grid-cols-2 gap-4 sm:gap-5">
          <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white hover:shadow-lg transition-shadow">
             <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 sm:mb-4">
                <MessageCircle size={18} className="sm:w-5 sm:h-5" />
             </div>
             <div className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">对话</div>
             <div className="text-xl sm:text-2xl font-black text-slate-800">{stats.scenariosCompleted} <span className="text-xs sm:text-sm font-medium text-slate-400">次</span></div>
          </div>
          <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white hover:shadow-lg transition-shadow">
             <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 sm:mb-4">
                <Trophy size={18} className="sm:w-5 sm:h-5" />
             </div>
             <div className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">掌握</div>
             <div className="text-xl sm:text-2xl font-black text-slate-800">{stats.vocabMastered} <span className="text-xs sm:text-sm font-medium text-slate-400">个</span></div>
          </div>
       </div>
    </div>
  );
};

const ScenarioSelectView = ({ onSelect }: { onSelect: (s: Scenario) => void }) => {
  return (
    <div className="p-4 sm:p-6 pb-32 pt-safe h-dvh overflow-y-auto no-scrollbar space-y-4 sm:space-y-6 animate-fade-in">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 sm:mt-4 px-2">选择对话场景</h2>
      <div className="grid grid-cols-1 gap-4 sm:gap-5">
        {SCENARIOS.map((scenario) => (
          <div 
            key={scenario.id}
            onClick={() => onSelect(scenario)}
            className="bg-white p-5 sm:p-6 rounded-[2rem] border border-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer hover:border-sapphire-200 hover:shadow-sapphire-100/50 hover:shadow-lg transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center space-x-4 sm:space-x-5">
              <div className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">{scenario.emoji}</div>
              <div>
                <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">{scenario.title}</h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">{scenario.description}</p>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-sapphire-50 group-hover:text-sapphire-600 transition-colors">
               <ChevronRight size={18} className="text-slate-300 group-hover:text-sapphire-600 sm:w-5 sm:h-5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChatInterface = ({ 
  mode, 
  scenario, 
  persona,
  initialMessages = [],
  onExit 
}: { 
  mode: ChatMode, 
  scenario?: Scenario, 
  persona?: PartnerPersona,
  initialMessages?: Message[],
  onExit: () => void 
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewContent, setReviewContent] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to attach voice to model messages
  const attachVoice = async (text: string, msgId: string) => {
    const audioData = await generateTTS(text);
    
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { 
          ...m, 
          audioUrl: audioData || undefined,
          isAudioLoading: false // Stop loading animation whether success or fail
        };
      }
      return m;
    }));

    if (audioData) {
      playAudioData(audioData);
    }
  };

  // Initial Logic for Text Chat Mode (Scenario)
  useEffect(() => {
    if (mode === ChatMode.SCENARIO && messages.length === 0) {
      initChatSession('SCENARIO', scenario?.contextPrompt || '');
      setIsLoading(true);
      sendMessageToGemini(`[SYSTEM] Start roleplay: ${scenario?.contextPrompt}`)
        .then(text => {
          const id = 'init';
          // Show message with audio loading state true immediately
          setMessages([{ id, role: 'model', text: text, timestamp: Date.now(), isAudioLoading: true }]);
          setIsLoading(false);
          // Auto generate voice
          attachVoice(text, id);
        });
    }
  }, [mode, scenario]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    
    // Ensure AudioContext is ready on user interaction
    // We can call a dummy resume here if needed, but playAudioData handles it
    
    const responseText = await sendMessageToGemini(userMsg.text);
    
    const modelMsgId = (Date.now() + 1).toString();
    // Add message with isAudioLoading: true
    setMessages(prev => [...prev, { 
      id: modelMsgId, 
      role: 'model', 
      text: responseText, 
      timestamp: Date.now(),
      isAudioLoading: true 
    }]);
    setIsLoading(false);

    // Generate Audio
    attachVoice(responseText, modelMsgId);
  };

  const handleTranslate = async (msgId: string, text: string) => {
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex >= 0 && messages[msgIndex].translation) return;
    const translation = await translateText(text);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, translation } : m));
  };
  
  const handlePlayAudio = (audioData: string) => {
    playAudioData(audioData);
  };

  // Immediate exit to review screen, load content async
  const handleEnd = () => {
    setShowReview(true);
    // Async generation
    generateReview(messages).then(text => setReviewContent(text));
  };

  if (showReview) {
    return (
      <div className="flex flex-col h-dvh bg-[#f0f4fc] p-4 sm:p-6 justify-center items-center animate-fade-in pt-safe pb-safe">
         <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl shadow-sapphire-200/20 max-w-sm w-full h-[75vh] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sapphire-300 to-sapphire-600"></div>
            
            <div className="text-center mb-5 sm:mb-6 mt-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-sapphire-50 text-sapphire-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm transform -rotate-6">
                <Trophy size={28} fill="currentColor" className="opacity-20 sm:w-8 sm:h-8" />
                <Trophy size={28} className="absolute sm:w-8 sm:h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">对话回顾</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">Excellent work today!</p>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 sm:space-y-5 mb-5 sm:mb-6 bg-slate-50/50 p-4 sm:p-5 rounded-[1.5rem] border border-slate-100">
               <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chat History</h4>
                  {messages.map(m => (
                    <div key={m.id} className={`text-xs sm:text-sm py-1 ${m.role === 'user' ? 'text-right text-sapphire-700' : 'text-left text-slate-600'}`}>
                       {m.text}
                    </div>
                  ))}
               </div>
               
               <div className="pt-5 border-t border-dashed border-slate-200">
                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">AI Suggestions</h4>
                 {reviewContent ? (
                   <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
                     <p className="text-slate-700 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{reviewContent}</p>
                   </div>
                 ) : (
                   <div className="flex items-center justify-center space-x-2 text-sapphire-500 text-sm py-4">
                     <RefreshCw size={16} className="animate-spin" />
                     <span>正在生成建议...</span>
                   </div>
                 )}
               </div>
            </div>

            <button 
              onClick={onExit}
              className="w-full py-3.5 sm:py-4 bg-sapphire-600 text-white font-bold rounded-2xl shadow-lg shadow-sapphire-200 active:scale-95 transition-all"
            >
              完成练习
            </button>
         </div>
      </div>
    );
  }

  const displayPersona = persona || { name: 'AI Partner', emoji: scenario?.emoji || '🤖' };

  return (
    <div className="flex flex-col h-dvh bg-white pt-safe relative">
      <div className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-50 shadow-sm z-20 bg-white/80 backdrop-blur-md sticky top-0 shrink-0">
        <button onClick={handleEnd} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 active:scale-90 transition-all">
          <X size={18} className="sm:w-5 sm:h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-slate-800 text-sm sm:text-base">
              {scenario ? scenario.title : displayPersona.name}
          </span>
          <span className="text-[9px] sm:text-[10px] text-green-500 font-medium flex items-center gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Online
          </span>
        </div>
        <div className="w-9 sm:w-10" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#fcfdff] scroll-smooth pb-24 sm:pb-28">
        {messages.map(m => (
          <ChatBubble 
            key={m.id} 
            msg={m} 
            persona={m.role === 'model' ? displayPersona : undefined} 
            onTranslate={handleTranslate} 
            onPlayAudio={handlePlayAudio}
          />
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4 animate-fade-in">
             <div className="bg-white border border-slate-50 px-4 py-3 sm:px-5 sm:py-4 rounded-[2rem] rounded-tl-lg flex items-center space-x-1.5 shadow-sm ml-12 sm:ml-14">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sapphire-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sapphire-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sapphire-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
             </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 pb-safe bg-white/90 backdrop-blur-xl border-t border-slate-100 z-30">
        {mode === ChatMode.SCENARIO && (
          <div className="flex items-end space-x-2 bg-slate-50 p-1 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-inner max-w-lg mx-auto">
             <textarea
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               placeholder="输入韩语..."
               className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 resize-none py-3 px-3 sm:py-3.5 sm:px-4 h-11 sm:h-12 max-h-24 text-sm sm:text-base font-medium"
               rows={1}
             />
             <button 
               onClick={handleSend}
               disabled={!inputValue.trim() || isLoading}
               className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full transition-all shadow-md ${inputValue.trim() ? 'text-white bg-sapphire-600 shadow-sapphire-200 active:scale-90' : 'text-slate-300 bg-white'}`}
             >
               <Send size={18} className={`sm:w-5 sm:h-5 ${inputValue.trim() ? 'ml-0.5' : ''}`} />
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

const VocabView = () => {
  const [selectedMode, setSelectedMode] = useState<VocabMode | null>(null);
  const [currentCard, setCurrentCard] = useState<VocabQuestion | null>(null);
  const [queue, setQueue] = useState<VocabQuestion[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // TTS Helper
  const speakKorean = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const fetchMore = async (mode: VocabMode) => {
    setIsLoading(true);
    const newItems = await generateVocabBatch(5, mode);
    setQueue(prev => [...prev, ...newItems]);
    setIsLoading(false);
  };

  // Initial load when mode is selected
  useEffect(() => {
    if (selectedMode && queue.length === 0 && !currentCard && !isLoading) {
      fetchMore(selectedMode);
    }
  }, [selectedMode]);

  // Queue consumer
  useEffect(() => {
    if (selectedMode && !currentCard && queue.length > 0) {
      const next = queue[0];
      setCurrentCard(next);
      setQueue(prev => prev.slice(1));
      
      // Auto-play audio for listening mode
      if (selectedMode === VocabMode.LISTENING) {
        setTimeout(() => speakKorean(next.questionText), 300);
      }
    }
  }, [queue, currentCard, selectedMode]);

  const handleNext = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setResult(null);
    setCurrentCard(null); // Triggers queue consumer
    
    // Prefetch if low
    if (selectedMode && queue.length < 2) {
      generateVocabBatch(5, selectedMode).then(items => setQueue(prev => [...prev, ...items]));
    }
  };

  const handleSubmit = () => {
    if(!selectedOption || isSubmitted) return;
    setIsSubmitted(true);
    if(selectedOption === currentCard?.correctAnswer) {
      setResult('CORRECT');
    } else {
      setResult('WRONG');
    }

    // Play audio on reveal for listening mode or reading mode reinforcement
    if (selectedMode === VocabMode.LISTENING || selectedMode === VocabMode.READING_K_C) {
      speakKorean(currentCard!.questionText);
    } else if (selectedMode === VocabMode.READING_C_K) {
       speakKorean(currentCard!.correctAnswer);
    }
  };

  const resetMode = () => {
    setSelectedMode(null);
    setQueue([]);
    setCurrentCard(null);
    setIsSubmitted(false);
    setSelectedOption(null);
  }

  // --- MENU VIEW ---
  if (!selectedMode) {
    return (
      <div className="p-4 sm:p-6 pb-32 pt-safe h-dvh overflow-y-auto no-scrollbar animate-fade-in">
         <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 sm:mb-8 mt-2 sm:mt-4 px-2">词汇测验</h2>
         <div className="grid gap-4 sm:gap-6">
           
           <div 
             onClick={() => setSelectedMode(VocabMode.LISTENING)}
             className="bg-white p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-white flex items-center space-x-5 sm:space-x-6 cursor-pointer hover:border-sapphire-200 hover:shadow-lg hover:shadow-sapphire-100 transition-all active:scale-[0.98] group"
           >
             <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.2rem] bg-sapphire-50 text-sapphire-600 flex items-center justify-center group-hover:bg-sapphire-600 group-hover:text-white transition-colors shrink-0">
               <Ear size={28} className="sm:w-8 sm:h-8" />
             </div>
             <div>
               <h3 className="font-bold text-base sm:text-lg text-slate-800">听音辨义</h3>
               <p className="text-slate-400 text-xs sm:text-sm mt-1">听韩语单词，选择中文含义</p>
             </div>
           </div>

           <div 
             onClick={() => setSelectedMode(VocabMode.READING_K_C)}
             className="bg-white p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-white flex items-center space-x-5 sm:space-x-6 cursor-pointer hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100 transition-all active:scale-[0.98] group"
           >
             <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.2rem] bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
               <BookOpen size={28} className="sm:w-8 sm:h-8" />
             </div>
             <div>
               <h3 className="font-bold text-base sm:text-lg text-slate-800">韩语选义</h3>
               <p className="text-slate-400 text-xs sm:text-sm mt-1">阅读韩语单词，选择中文含义</p>
             </div>
           </div>

           <div 
             onClick={() => setSelectedMode(VocabMode.READING_C_K)}
             className="bg-white p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-white flex items-center space-x-5 sm:space-x-6 cursor-pointer hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100 transition-all active:scale-[0.98] group"
           >
             <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
               <Languages size={28} className="sm:w-8 sm:h-8" />
             </div>
             <div>
               <h3 className="font-bold text-base sm:text-lg text-slate-800">中文选词</h3>
               <p className="text-slate-400 text-xs sm:text-sm mt-1">看中文含义，选择正确韩语</p>
             </div>
           </div>

         </div>
      </div>
    );
  }

  // --- QUIZ VIEW ---
  if (!currentCard) {
    return (
      <div className="p-6 h-dvh flex flex-col justify-center items-center text-sapphire-300 relative">
         <button onClick={resetMode} className="absolute top-6 left-6 p-3 bg-white shadow-sm rounded-full text-slate-400 pt-safe hover:text-slate-600 transition-colors">
            <ArrowLeft size={24} />
         </button>
         <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-sapphire-100 mb-6 animate-bounce-gentle">
            <RefreshCw className="animate-spin text-sapphire-500" size={32}/>
         </div>
         <p className="font-medium text-sapphire-400">正在为你准备题目...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh pt-safe pb-safe relative max-w-md mx-auto w-full overflow-hidden">
       {/* Inner Container to manage flex spacing */}
       <div className="flex-1 flex flex-col p-4 sm:p-6 pb-28 sm:pb-32 overflow-hidden">
          
           {/* Header */}
           <div className="mt-2 mb-4 flex justify-between items-center relative z-10 shrink-0">
              <button onClick={resetMode} className="p-2 sm:p-3 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-all">
                 <ArrowLeft size={24} className="sm:w-[26px] sm:h-[26px]" />
              </button>
              <span className="bg-white shadow-sm border border-slate-50 text-sapphire-700 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-wide uppercase">
                {selectedMode === VocabMode.LISTENING && '听力 Listening'}
                {selectedMode === VocabMode.READING_K_C && '阅读 Reading'}
                {selectedMode === VocabMode.READING_C_K && '回忆 Recall'}
              </span>
              <div className="w-6" />
           </div>
           
           {/* Card Area (Shrinkable on mobile, Fixed min height) */}
           <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-white text-center mb-4 sm:mb-8 min-h-[160px] sm:min-h-[220px] flex flex-col items-center justify-center relative transition-all group overflow-hidden shrink-0">
              {/* Decorative blobs */}
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-slate-50 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 z-0"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-sapphire-50 rounded-full -ml-10 -mb-10 sm:-ml-12 sm:-mb-12 z-0"></div>

              <div className="relative z-10 flex flex-col items-center w-full">
                {selectedMode === VocabMode.LISTENING ? (
                   // Listening UI
                   <div className="flex flex-col items-center">
                      <button 
                        onClick={() => speakKorean(currentCard.questionText)}
                        className="w-20 h-20 sm:w-24 sm:h-24 bg-sapphire-50 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-sapphire-500 mb-3 sm:mb-5 shadow-inner active:scale-95 transition-transform"
                      >
                         <Volume2 size={40} className="sm:w-[48px] sm:h-[48px] ml-1" />
                      </button>
                      {/* Reveal text only after submission */}
                      {isSubmitted ? (
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 animate-slide-up">{currentCard.questionText}</h2>
                      ) : (
                        <div className="text-xs sm:text-sm font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">点击图标播放</div>
                      )}
                   </div>
                ) : (
                   // Reading UI
                   <>
                     <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-2 sm:mb-3 leading-tight tracking-tight break-words max-w-full">{currentCard.questionText}</h2>
                     {/* Audio button for Reading K->C */}
                     {selectedMode === VocabMode.READING_K_C && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); speakKorean(currentCard.questionText); }}
                         className="mt-1 sm:mt-2 p-2 sm:p-3 rounded-full bg-slate-50 text-slate-400 hover:text-sapphire-500 hover:bg-sapphire-50 transition-colors"
                       >
                         <Volume2 size={20} className="sm:w-[24px] sm:h-[24px]" />
                       </button>
                     )}
                   </>
                )}

                {isSubmitted && currentCard.explanation && (
                   <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-dashed border-slate-200 w-full animate-slide-up">
                     <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">
                       {currentCard.explanation}
                     </p>
                   </div>
                )}
              </div>
           </div>

           {/* Options Area (Scrollable flex area) */}
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 sm:space-y-3 min-h-0">
              {currentCard.options.map((opt, idx) => {
                 let btnClass = "w-full py-3.5 px-5 sm:py-4 sm:px-6 rounded-[1.2rem] sm:rounded-[1.5rem] font-bold text-sm sm:text-base text-slate-600 bg-white border border-slate-100 shadow-sm transition-all text-left relative hover:shadow-md";
                 
                 if (isSubmitted) {
                    if (opt === currentCard.correctAnswer) {
                       btnClass = "w-full py-3.5 px-5 sm:py-4 sm:px-6 rounded-[1.2rem] sm:rounded-[1.5rem] font-bold text-sm sm:text-base text-white bg-green-500 border border-green-500 shadow-lg shadow-green-200 text-left scale-[1.02] sm:scale-105";
                    } else if (selectedOption === opt && opt !== currentCard.correctAnswer) {
                       btnClass = "w-full py-3.5 px-5 sm:py-4 sm:px-6 rounded-[1.2rem] sm:rounded-[1.5rem] font-bold text-sm sm:text-base text-white bg-red-400 border border-red-400 shadow-lg shadow-red-200 opacity-90 text-left";
                    } else {
                       btnClass += " opacity-40 bg-slate-50";
                    }
                 } else {
                    if (selectedOption === opt) {
                       btnClass = "w-full py-3.5 px-5 sm:py-4 sm:px-6 rounded-[1.2rem] sm:rounded-[1.5rem] font-bold text-sm sm:text-base text-sapphire-700 bg-sapphire-50 border border-sapphire-200 shadow-md ring-1 ring-sapphire-200 text-left scale-[1.01] sm:scale-102";
                    }
                 }

                 return (
                   <button 
                     key={idx} 
                     onClick={() => !isSubmitted && setSelectedOption(opt)}
                     disabled={isSubmitted}
                     className={btnClass}
                   >
                     <span>{opt}</span>
                     {isSubmitted && opt === currentCard.correctAnswer && <Check size={18} className="absolute right-5 top-1/2 -translate-y-1/2 sm:w-[20px] sm:h-[20px]" />}
                   </button>
                 );
              })}
           </div>

           {/* Action Button (Fixed to bottom of flow, but above bottom nav) */}
           <div className="mt-4 shrink-0 h-16 sm:h-20">
             {!isSubmitted ? (
               <button 
                 onClick={handleSubmit}
                 disabled={!selectedOption}
                 className={`w-full py-3.5 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] font-bold text-base sm:text-lg shadow-xl transition-all flex items-center justify-center space-x-2 ${selectedOption ? 'bg-sapphire-600 text-white shadow-sapphire-200 hover:bg-sapphire-700 hover:scale-105' : 'bg-slate-100 text-slate-300 shadow-none'}`}
               >
                 <Check size={20} className="sm:w-[24px] sm:h-[24px]" /> <span>确认答案</span>
               </button>
             ) : (
               <button 
                 onClick={handleNext}
                 className="w-full py-3.5 sm:py-4 bg-slate-800 text-white rounded-[1.5rem] sm:rounded-[2rem] font-bold text-base sm:text-lg shadow-xl hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center space-x-2"
               >
                 <span>下一个单词</span> <ArrowRight size={20} className="sm:w-[24px] sm:h-[24px]" />
               </button>
             )}
           </div>
       </div>
    </div>
  );
};

// --- Persona Setup Modal ---

const PersonaSetup = ({ 
  onComplete, 
  onCancel 
}: { 
  onComplete: (p: PartnerPersona) => void,
  onCancel: () => void 
}) => {
  const [name, setName] = useState("智秀");
  const [emoji, setEmoji] = useState("👩🏻");
  const [image, setImage] = useState<string | null>(null);
  
  const emojis = ["👩🏻", "🧑🏻", "🦊", "🐶", "🐰"];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if(ev.target?.result) setImage(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[85dvh] pb-safe relative">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">设置通话对象</h3>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-400 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="mb-6 relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] flex items-center justify-center border-4 border-slate-50 bg-slate-50 overflow-hidden shadow-lg">
               {image ? (
                 <img src={image} className="w-full h-full object-cover" />
               ) : (
                 <span className="text-6xl sm:text-7xl">{emoji}</span>
               )}
            </div>
            <label className="absolute -bottom-2 -right-2 bg-sapphire-600 text-white p-2.5 sm:p-3 rounded-2xl cursor-pointer shadow-lg hover:bg-sapphire-700 active:scale-90 transition-all border-4 border-white">
               <ImageIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
               <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          
          <div className="flex gap-2 sm:gap-3 flex-wrap justify-center bg-slate-50 p-2 rounded-[1.5rem]">
            {emojis.map(e => (
              <button 
                key={e} 
                onClick={() => { setEmoji(e); setImage(null); }}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all ${emoji === e && !image ? 'bg-white shadow-md scale-110 ring-2 ring-sapphire-200' : 'hover:bg-white/50'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
          <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">昵称 / Name</label>
          <div className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 focus-within:ring-2 focus-within:ring-sapphire-200 transition-all">
            <Edit2 size={18} className="text-slate-400 mr-3 sm:w-5 sm:h-5" />
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-slate-800 font-bold text-base sm:text-lg placeholder:font-medium"
              placeholder="Name..."
            />
          </div>
        </div>

        <button 
          onClick={() => onComplete({ name, emoji, avatarUrl: image || undefined })}
          className="w-full py-3.5 sm:py-4 bg-sapphire-600 text-white font-bold rounded-[1.5rem] shadow-xl shadow-sapphire-200 hover:bg-sapphire-700 active:scale-[0.98] transition-all mb-4 text-base sm:text-lg flex items-center justify-center space-x-2"
        >
          <Phone size={18} fill="currentColor" className="opacity-50 sm:w-5 sm:h-5" />
          <span>开始通话</span>
        </button>
      </div>
    </div>
  );
};

// --- App Container ---

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [activeScenario, setActiveScenario] = useState<Scenario | undefined>(undefined);
  const [showPersonaSetup, setShowPersonaSetup] = useState(false);
  const [userPersona, setUserPersona] = useState<PartnerPersona>({ name: '朋友', emoji: '🧑🏻' });
  const [pastTranscript, setPastTranscript] = useState<Message[]>([]);
  
  const [userStats] = useState<UserStats>(MOCK_STATS);

  const startScenario = (s: Scenario) => {
    setActiveScenario(s);
    setView(ViewState.CHAT);
  };

  const openFreeChatSetup = () => {
    setShowPersonaSetup(true);
  };

  const startLiveCall = (persona: PartnerPersona) => {
    setUserPersona(persona);
    setShowPersonaSetup(false);
    setView(ViewState.LIVE_CALL);
  };

  const endLiveCall = (transcript: Message[]) => {
    setPastTranscript(transcript);
    setView(ViewState.CHAT); // Go to chat view to see history/review
  };

  const exitChat = () => {
    setView(ViewState.HOME);
    setActiveScenario(undefined);
    setPastTranscript([]);
  };

  return (
    <div className="h-dvh text-slate-900 font-sans antialiased selection:bg-sapphire-200 selection:text-sapphire-900 overflow-hidden relative">
      
      {showPersonaSetup && (
        <PersonaSetup onComplete={startLiveCall} onCancel={() => setShowPersonaSetup(false)} />
      )}

      {view === ViewState.HOME && (
        <HomeView stats={userStats} onOpenFreeSettings={openFreeChatSetup} />
      )}

      {view === ViewState.SCENARIO_SELECT && (
        <ScenarioSelectView onSelect={startScenario} />
      )}

      {view === ViewState.VOCAB_QUIZ && (
        <VocabView />
      )}

      {view === ViewState.LIVE_CALL && (
        <LiveCallView persona={userPersona} onEndCall={endLiveCall} />
      )}

      {view === ViewState.CHAT && (
        <ChatInterface 
          mode={activeScenario ? ChatMode.SCENARIO : ChatMode.FREE} 
          scenario={activeScenario} 
          persona={userPersona}
          initialMessages={pastTranscript}
          onExit={exitChat} 
        />
      )}

      {(view !== ViewState.CHAT && view !== ViewState.LIVE_CALL) && (
        <BottomNav currentView={view} setView={setView} />
      )}
      
    </div>
  );
}