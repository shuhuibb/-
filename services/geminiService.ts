
import { GoogleGenAI, Chat, Type, Modality } from "@google/genai";
import { VocabQuestion, VocabMode } from '../types';

// 严格遵循初始化规则：直接使用 process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

// --- TTS 音频处理 ---
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

// --- 词汇生成 ---
export const generateVocabBatch = async (mode: VocabMode): Promise<VocabQuestion[]> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            q: { type: Type.STRING, description: "题目内容" },
            a: { type: Type.STRING, description: "正确答案内容" },
            o: { type: Type.ARRAY, items: { type: Type.STRING }, description: "包含正确答案在内的3个选项列表" },
            e: { type: Type.STRING, description: "中文解析或用法说明" }
          },
          required: ["q", "a", "o", "e"]
        }
      }
    },
    required: ["items"]
  };

  const seed = Date.now();
  let prompt = `请随机从 TOPIK 1-4 级词库中生成 5 个互不相同的词汇练习题。避免生成简单的打招呼词汇。种子值: ${seed}。`;
  
  if (mode === VocabMode.LISTENING || mode === VocabMode.READING_K_C) {
    prompt += "模式为韩选中：q字段必须是韩语单词，a字段是其中文翻译。";
  } else {
    prompt += "模式为中选韩：q字段必须是中文意思，a字段是其韩语单词。";
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
    
    const responseText = response.text;
    if (!responseText) throw new Error("No response from AI");
    
    const data = JSON.parse(responseText);
    if (!data.items || !Array.isArray(data.items)) throw new Error("Invalid response format");
    
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
