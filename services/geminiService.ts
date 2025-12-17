
import { GoogleGenAI, Chat, Type, Schema, LiveServerMessage, Modality } from "@google/genai";
import { Message, PartnerPersona, VocabQuestion, VocabMode } from '../types';

// Ensure API Key string is handled safely even if process.env is polyfilled strangely
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

const MODEL_CHAT = 'gemini-2.5-flash';
const MODEL_VOCAB = 'gemini-2.5-flash';
const MODEL_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

// --- Helper Functions for Audio Processing (Live API) ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): any {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Text Chat Service ---

const SCENARIO_SYSTEM_INSTRUCTION = `
You are a friendly, patient native Korean speaker helping an intermediate learner.
Rules:
1. Speak in natural, modern Korean.
2. Keep responses concise (1-3 sentences).
3. If user speaks Chinese/broken Korean, reply in natural Korean.
4. Correct implicitly.
`;

let chatSession: Chat | null = null;

const getFreeChatInstruction = (persona: PartnerPersona) => `
You are ${persona.name}, a warm Korean friend.
Rules:
1. Casual conversation.
2. Allow code-switching.
3. Act like a real person, not AI.
4. Tone: Supportive, calm.
`;

export const initChatSession = (mode: 'SCENARIO' | 'FREE', contextOrPersona: string | PartnerPersona) => {
  let instruction = "";
  if (mode === 'SCENARIO') {
    instruction = `${SCENARIO_SYSTEM_INSTRUCTION}\n\nCurrent Scenario: ${contextOrPersona}`;
  } else {
    instruction = getFreeChatInstruction(contextOrPersona as PartnerPersona);
  }

  chatSession = ai.chats.create({
    model: MODEL_CHAT,
    config: { systemInstruction: instruction, temperature: 0.8 },
  });
};

export const sendMessageToGemini = async (text: string): Promise<string> => {
  if (!chatSession) throw new Error("Chat session not initialized");
  try {
    const response = await chatSession.sendMessage({ message: text });
    return response.text || "죄송해요, 다시 말씀해 주시겠어요?";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Network error.";
  }
};

// --- TTS Service (Voice Output) ---

let playbackContext: AudioContext | null = null;

export const generateTTS = async (text: string): Promise<string | null> => {
  try {
    // Generate speech using the TTS model
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
             prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    
    // The API returns raw PCM data in base64
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) return null;
    
    const audioData = candidates[0].content?.parts?.[0]?.inlineData?.data;
    return audioData || null;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    return null;
  }
};

export const playAudioData = async (base64String: string) => {
  try {
    if (!playbackContext) {
      playbackContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    if (playbackContext.state === 'suspended') {
      await playbackContext.resume();
    }

    const bytes = decode(base64String);
    const buffer = await decodeAudioData(bytes, playbackContext, 24000, 1);
    
    const source = playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackContext.destination);
    source.start(0);
  } catch (e) {
    console.error("Audio Playback Error:", e);
  }
};


export const translateText = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_CHAT,
      contents: `Translate Korean to Chinese. Output ONLY translation.\nText: ${text}`
    });
    return response.text || "翻译失败";
  } catch (e) { return "无法连接翻译服务"; }
};

export const generateReview = async (history: Message[]): Promise<string> => {
  try {
    const conversation = history.map(h => `${h.role}: ${h.text}`).join('\n');
    const prompt = `
      Review this conversation (TOPIK 3-4 level). 
      Provide 2 very brief, friendly tips in Chinese.
      Conversation:
      ${conversation}
    `;
    const response = await ai.models.generateContent({
      model: MODEL_CHAT,
      contents: prompt,
    });
    return response.text || "对话结束。做得很好！";
  } catch (e) { return "本次对话结束，你表现得很棒！"; }
};

// --- Vocab Service ---

export const generateVocabBatch = async (count: number = 5, mode: VocabMode): Promise<VocabQuestion[]> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      quizItems: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionText: { type: Type.STRING },
            correctAnswer: { type: Type.STRING },
            distractor1: { type: Type.STRING },
            distractor2: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["questionText", "correctAnswer", "distractor1", "distractor2", "explanation"]
        }
      }
    },
    required: ["quizItems"]
  };

  let prompt = `Generate ${count} intermediate Korean vocabulary quiz items (TOPIK 3-4). 
  explanation field: Briefly explain the word's meaning and usage in Chinese (max 20 words).`;

  let type: 'K_TO_C' | 'C_TO_K' = 'K_TO_C';

  if (mode === VocabMode.LISTENING) {
    prompt += `
      Task: Korean Listening.
      field "questionText": The Korean word/phrase (User will listen to this).
      field "correctAnswer": The Chinese meaning.
      field "distractor1": Incorrect Chinese meaning.
      field "distractor2": Incorrect Chinese meaning.
    `;
    type = 'K_TO_C';
  } else if (mode === VocabMode.READING_K_C) {
    prompt += `
      Task: Korean Reading.
      field "questionText": The Korean word/phrase.
      field "correctAnswer": The Chinese meaning.
      field "distractor1": Incorrect Chinese meaning.
      field "distractor2": Incorrect Chinese meaning.
    `;
    type = 'K_TO_C';
  } else {
    // READING_C_K
    prompt += `
      Task: Recall Korean word.
      field "questionText": The Chinese meaning.
      field "correctAnswer": The Korean word/phrase.
      field "distractor1": Incorrect Korean word.
      field "distractor2": Incorrect Korean word.
    `;
    type = 'C_TO_K';
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_VOCAB,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema }
    });
    
    // Ensure response.text exists before parsing
    const responseText = response.text || "{}";
    const data = JSON.parse(responseText);
    
    if (!data.quizItems) return [];
    return data.quizItems.map((item: any, index: number) => {
      const options = [item.correctAnswer, item.distractor1, item.distractor2].sort(() => Math.random() - 0.5);
      return {
        id: Date.now().toString() + index,
        type: type,
        questionText: item.questionText,
        options: options,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation
      };
    });
  } catch (e) { 
    console.error("Vocab Generation Error", e);
    return []; 
  }
};

// --- Live API Service (Real-time Audio) ---

export interface LiveSessionController {
  disconnect: () => void;
  mute: (muted: boolean) => void;
}

export const startLiveSession = async (
  persona: PartnerPersona,
  onTranscript: (userText: string, modelText: string) => void,
  onAudioLevel: (level: number) => void
): Promise<LiveSessionController> => {
  
  // Audio Contexts
  const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  let stream: MediaStream | null = null;
  let scriptProcessor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  
  // Playback state
  let nextStartTime = 0;
  const sources = new Set<AudioBufferSourceNode>();
  
  // Transcription State
  let currentInputTranscription = '';
  let currentOutputTranscription = '';

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    source = inputAudioContext.createMediaStreamSource(stream);
    
    // Connect to Live API
    const sessionPromise = ai.live.connect({
      model: MODEL_LIVE,
      callbacks: {
        onopen: () => {
          console.log("Live Session Connected");
          
          // Setup Audio Input Streaming
          scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate simple audio level for UI
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            onAudioLevel(Math.sqrt(sum / inputData.length));

            const pcmBlob = createBlob(inputData);
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source?.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle Audio Output
          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(
              decode(audioData),
              outputAudioContext,
              24000,
              1
            );
            const sourceNode = outputAudioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(outputAudioContext.destination);
            sourceNode.addEventListener('ended', () => sources.delete(sourceNode));
            sourceNode.start(nextStartTime);
            nextStartTime += audioBuffer.duration;
            sources.add(sourceNode);
          }

          // Handle Interruption
          if (message.serverContent?.interrupted) {
            sources.forEach(s => s.stop());
            sources.clear();
            nextStartTime = 0;
            currentOutputTranscription = ''; // Clear stale transcription on interrupt
          }

          // Handle Transcription
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription += message.serverContent.outputTranscription.text;
          }
          if (message.serverContent?.inputTranscription) {
            currentInputTranscription += message.serverContent.inputTranscription.text;
          }
          
          if (message.serverContent?.turnComplete) {
            if (currentInputTranscription || currentOutputTranscription) {
               onTranscript(currentInputTranscription, currentOutputTranscription);
               currentInputTranscription = '';
               currentOutputTranscription = '';
            }
          }
        },
        onclose: () => console.log("Live Session Closed"),
        onerror: (e) => console.error("Live Session Error", e),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Kore is a good KR voice
        },
        systemInstruction: getFreeChatInstruction(persona),
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });

    return {
      disconnect: () => {
        sessionPromise.then(s => s.close());
        scriptProcessor?.disconnect();
        source?.disconnect();
        stream?.getTracks().forEach(t => t.stop());
        inputAudioContext.close();
        outputAudioContext.close();
      },
      mute: (muted: boolean) => {
        if (stream) {
          stream.getAudioTracks().forEach(t => t.enabled = !muted);
        }
      }
    };

  } catch (err) {
    console.error("Failed to start live session", err);
    throw err;
  }
};
