
// Use GoogleGenAI from @google/genai
import { GoogleGenAI, Chat, Type, Modality } from "@google/genai";
import { Message, VocabQuestion, VocabMode } from '../types';

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

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

// --- TTS 逻辑 ---
let audioCtx: AudioContext | null = null;
let lastSource: AudioBufferSourceNode | null = null;

function decodeBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function playRawPcm(data: Uint8Array) {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  if (lastSource) {
    try { lastSource.stop(); } catch(e) {}
  }

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
  lastSource = source;
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

// --- 词汇服务：增加多样性和批量生成 ---
export const generateVocabBatch = async (mode: VocabMode): Promise<VocabQuestion[]> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            q: { type: Type.STRING, description: "题目文本" },
            a: { type: Type.STRING, description: "正确选项文本" },
            o: { type: Type.ARRAY, items: { type: Type.STRING }, description: "包含正确项在内的3个选项" },
            e: { type: Type.STRING, description: "中文解析" }
          },
          required: ["q", "a", "o", "e"]
        }
      }
    },
    required: ["items"]
  };

  const seed = Math.floor(Math.random() * 1000);
  let prompt = `随机从 TOPIK 1-4 级词库中挑选 5 个互不相同的生僻词汇或常用表达。随机种子: ${seed}。`;
  
  if (mode === VocabMode.LISTENING || mode === VocabMode.READING_K_C) {
    prompt += "模式: 韩选中。q为韩语，a为正确中文翻译，o包含a和2个干扰项。";
  } else {
    prompt += "模式: 中选韩。q为中文意思，a为正确韩语，o包含a和2个干扰项。";
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: schema,
        temperature: 0.9 // 提高随机性
      }
    });
    const data = JSON.parse(response.text || "{}");
    return (data.items || []).map((it: any, idx: number) => ({
      id: `${Date.now()}-${idx}-${seed}`,
      type: mode === VocabMode.READING_C_K ? 'C_TO_K' : 'K_TO_C',
      questionText: it.q,
      options: it.o.sort(() => Math.random() - 0.5),
      correctAnswer: it.a,
      explanation: it.e
    }));
  } catch (e) { 
    return []; 
  }
};
