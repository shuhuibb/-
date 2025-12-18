
import { GoogleGenAI, Chat, Type, Modality } from "@google/genai";
import { VocabQuestion, VocabMode } from '../types';

// 直接从环境变量获取 API Key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

const SYSTEM_INSTRUCTION = `你是一位友善的韩国朋友。请只用韩语交流，并在每句韩语后面用括号附带中文翻译。`;

let chatSession: Chat | null = null;

export const initChatSession = (context: string) => {
  chatSession = ai.chats.create({
    model: MODEL_TEXT,
    config: { 
      systemInstruction: `${SYSTEM_INSTRUCTION}\n当前场景: ${context}`,
      temperature: 0.7 
    },
  });
};

export const sendMessageToGemini = async (text: string): Promise<string> => {
  if (!chatSession) throw new Error("Session not initialized");
  try {
    const response = await chatSession.sendMessage({ message: text });
    return response.text || "죄송해요 (抱歉), 다시 말씀해 주시겠어요?";
  } catch (error) {
    console.error("Chat Message Error:", error);
    throw error;
  }
};

// --- TTS 音频播放逻辑 ---
let audioCtx: AudioContext | null = null;
async function playRawPcm(data: Uint8Array) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
}

export const speakKorean = async (text: string) => {
  try {
    const koreanOnly = text.split('(')[0].split('（')[0].trim();
    if (!koreanOnly) return;
    
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: koreanOnly }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    
    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioBase64) {
      const bin = atob(audioBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      await playRawPcm(bytes);
    }
  } catch (e) {
    console.error("TTS Playback Error:", e);
  }
};

// --- 词汇挑战题目生成 ---
export const generateVocabBatch = async (mode: VocabMode): Promise<VocabQuestion[]> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            q: { type: Type.STRING, description: "题目文本（韩语单词或中文意思）" },
            a: { type: Type.STRING, description: "正确答案内容" },
            o: { type: Type.ARRAY, items: { type: Type.STRING }, description: "包含正确答案在内的3个互不相同的备选项" },
            e: { type: Type.STRING, description: "详细的中文解析" }
          },
          required: ["q", "a", "o", "e"]
        }
      }
    },
    required: ["items"]
  };

  const seed = Date.now() + Math.random();
  let prompt = `你是一个专业的韩语教育专家。请随机挑选 5 个互不相同的 TOPIK 1-4 级核心词汇。
  不要生成过于简单的词。随机种子：${seed}。`;
  
  if (mode === VocabMode.LISTENING || mode === VocabMode.READING_K_C) {
    prompt += "\n模式：韩选中。q为韩语单词，a为正确中文意思，o必须包含a和另外2个中文干扰项。";
  } else {
    prompt += "\n模式：中选韩。q为中文意思，a为正确韩语单词，o必须包含a和另外2个韩语干扰项。";
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: schema,
        temperature: 0.95
      }
    });
    
    const data = JSON.parse(response.text || '{"items":[]}');
    if (!data.items || data.items.length === 0) throw new Error("Empty questions list");

    return data.items.map((it: any, idx: number) => ({
      id: `${seed}-${idx}`,
      type: mode === VocabMode.READING_C_K ? 'C_TO_K' : 'K_TO_C',
      questionText: it.q,
      options: it.o.sort(() => Math.random() - 0.5),
      correctAnswer: it.a,
      explanation: it.e
    }));
  } catch (e) {
    console.error("Vocab Generation Failed:", e);
    throw e;
  }
};
