
import { Scenario, VocabQuestion } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'coffee',
    title: '点咖啡',
    description: '在首尔的咖啡馆点单，询问推荐。',
    emoji: '☕',
    contextPrompt: 'User is at a cafe ordering coffee. Act as the barista. Ask about hot/ice, size, and loyalty points.'
  },
  {
    id: 'taxi',
    title: '打车回家',
    description: '向司机说明目的地 and 路线偏好。',
    emoji: '🚕',
    contextPrompt: 'User is in a taxi. Act as the driver. Ask for destination, clarify directions, and make small talk about the traffic.'
  },
  {
    id: 'shopping',
    title: '买衣服',
    description: '询问尺码、颜色并试穿。',
    emoji: '👕',
    contextPrompt: 'User is in a clothing store. Act as the shop assistant. Help with sizes and compliment their choice.'
  },
  {
    id: 'feelings',
    title: '表达烦恼',
    description: '向朋友倾诉最近的压力。',
    emoji: '🌧️',
    contextPrompt: 'User is your close friend. They look sad. Ask what is wrong and listen empathetically.'
  },
  {
    id: 'opinion',
    title: '讨论电影',
    description: '简单评价最近看过的一部电影。',
    emoji: '🎬',
    contextPrompt: 'User and you just watched a movie. Ask them how they liked it and what they thought of the ending.'
  }
];

export const MOCK_STATS = {
  scenariosCompleted: 12,
  vocabMastered: 85,
  fluencyScore: 68,
  examCoverage: {
    grammar: 65,
    vocabulary: 72,
    listening: 60
  }
};

// 兜底本地题库 (Fallback Data)
export const FALLBACK_QUESTIONS: VocabQuestion[] = [
  {
    id: 'local-1',
    type: 'K_TO_C',
    questionText: '사과',
    options: ['苹果', '葡萄', '香蕉', '西瓜'],
    correctAnswer: '苹果',
    explanation: '사과 (苹果) 是初级最常用的名词之一，也可以表示“谢罪/道歉”。'
  },
  {
    id: 'local-2',
    type: 'C_TO_K',
    questionText: '学校',
    options: ['학교', '병원', '은행', '공원'],
    correctAnswer: '학교',
    explanation: '学校对应韩语汉字词“학교”。'
  },
  {
    id: 'local-3',
    type: 'K_TO_C',
    questionText: '공부하다',
    options: ['学习', '玩耍', '睡觉', '跑步'],
    correctAnswer: '学习',
    explanation: '공부 (工夫/学习) + 하다 (做) = 学习。'
  },
  {
    id: 'local-4',
    type: 'C_TO_K',
    questionText: '谢谢',
    options: ['감사합니다', '미안합니다', '괜찮습니다', '반갑습니다'],
    correctAnswer: '감사합니다',
    explanation: '这是最标准的敬语谢词。'
  },
  {
    id: 'local-5',
    type: 'K_TO_C',
    questionText: '의사',
    options: ['医生', '老师', '学生', '厨师'],
    correctAnswer: '医生',
    explanation: '의사 对应汉字词“医师”，意为医生。'
  },
  {
    id: 'local-6',
    type: 'C_TO_K',
    questionText: '现在几点？',
    options: ['지금 몇 시예요?', '이름이 뭐예요?', '어디에 가요?', '얼마예요?'],
    correctAnswer: '지금 몇 시예요?',
    explanation: '지금 (现在) + 몇 (几) + 시 (点)。'
  },
  {
    id: 'local-7',
    type: 'K_TO_C',
    questionText: '한국어',
    options: ['韩语', '中文', '日语', '英语'],
    correctAnswer: '韩语',
    explanation: '한국 (韩国) + 어 (语)。'
  },
  {
    id: 'local-8',
    type: 'C_TO_K',
    questionText: '很好/我喜欢',
    options: ['좋아요', '싫어요', '슬퍼요', '더워요'],
    correctAnswer: '좋아요',
    explanation: '좋다 意为好，常用语表达喜欢或赞同。'
  },
  {
    id: 'local-9',
    type: 'K_TO_C',
    questionText: '밥을 먹다',
    options: ['吃饭', '喝水', '看书', '写字'],
    correctAnswer: '吃饭',
    explanation: '밥 (饭) + 을 (助词) + 먹다 (吃)。'
  },
  {
    id: 'local-10',
    type: 'C_TO_K',
    questionText: '再见 (对留下的人说)',
    options: ['안녕히 계세요', '안녕히 가세요', '어서 오세요', '실례합니다'],
    correctAnswer: '안녕히 계세요',
    explanation: '当你要离开，对方留下时，使用“계세요 (请留步)”。'
  }
];
