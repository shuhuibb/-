import { Scenario } from './types';

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
    description: '向司机说明目的地和路线偏好。',
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
