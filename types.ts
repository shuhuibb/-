
export enum ViewState {
  HOME = 'HOME',
  SCENARIO_SELECT = 'SCENARIO_SELECT',
  CHAT = 'CHAT',
  LIVE_CALL = 'LIVE_CALL', // New view for real-time calling
  VOCAB_QUIZ = 'VOCAB_QUIZ',
}

export enum ChatMode {
  SCENARIO = 'SCENARIO',
  FREE = 'FREE',
}

export enum VocabMode {
  LISTENING = 'LISTENING', // Listen to KR, choose CN
  READING_K_C = 'READING_K_C', // Read KR, choose CN
  READING_C_K = 'READING_C_K', // Read CN, choose KR
}

export interface PartnerPersona {
  name: string;
  emoji: string;
  avatarUrl?: string; // Support for user-uploaded images
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  translation?: string;
  suggestion?: string;
  audioUrl?: string;
  isAudioLoading?: boolean; // New field for UI loading state
  timestamp: number;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  emoji: string;
  contextPrompt: string;
}

export interface VocabQuestion {
  id: string;
  type: 'K_TO_C' | 'C_TO_K'; // Kept for data structure compatibility, logic handled by Mode
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string; // Added explanation
}

export interface UserStats {
  scenariosCompleted: number;
  vocabMastered: number;
  fluencyScore: number;
  examCoverage: {
    grammar: number;
    vocabulary: number;
    listening: number;
  };
}
