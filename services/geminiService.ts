
import { GoogleGenAI, Chat, Type, Schema, Modality } from "@google/genai";
import { Message, VocabQuestion, VocabMode } from '../types';

// 根据您的要求，使用 VITE_ 环境变量获取密钥
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

// --- 系统指令：要求 AI 在回复中直接带翻译 ---
const SYSTEM_INSTRUCTION = `
你是一位友善的韩国朋友。
1. 请只用韩语交流。
2. 必须在每句韩语后面用括号附带中文翻译。
   示例：안녕하세요 (你好)。
3. 保持回复简洁，每次 1-2 句话。
`;

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
    return response.text || "죄송해요 (抱歉), 다시 말씀해 주시겠어요? (能请你再说一遍吗？)";
  } catch (error) {
    console.error("Chat Error:", error);
    return "网络错误，请稍后再试。";
  }
};

// --- TTS 语音播报 ---
let audioCtx: AudioContext | null = null;

function decodeBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function playRawPcm(data: Uint8Array) {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
    // 提取括号前的韩文原文用于播报
    const koreanOnly = text.split('(')[0].trim();
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: koreanOnly }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioBase64) {
      await playRawPcm(decodeBase64(audioBase64));
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
};

// --- 词汇服务 ---
export const generateVocabBatch = async (mode: VocabMode): Promise<VocabQuestion[]> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            q: { type: Type.STRING },
            a: { type: Type.STRING },
            o: { type: Type.ARRAY, items: { type: Type.STRING } },
            e: { type: Type.STRING }
          },
          required: ["q", "a", "o", "e"]
        }
      }
    },
    required: ["items"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: `生成3个韩语练习题。模式: ${mode}。o 字段必须包含 a 和 2 个干扰项。e 字段是中文解释。`,
      config: { responseMimeType: "application/json", responseSchema: schema }
    });
    const data = JSON.parse(response.text || "{}");
    return (data.items || []).map((it: any, idx: number) => ({
      id: Date.now().toString() + idx,
      type: 'K_TO_C',
      questionText: it.q,
      options: it.o.sort(() => Math.random() - 0.5),
      correctAnswer: it.a,
      explanation: it.e
    }));
  } catch (e) { 
    console.error("Vocab Error", e);
    return []; 
  }
};
