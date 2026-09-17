export interface QuizPrompt {
  eventId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const quizPrompts: QuizPrompt[] = [
  {
    eventId: 'e117',
    question: '哥伦布首航最直接开启了什么？',
    options: ['跨大西洋殖民时代', '工业革命', '宗教改革', '拿破仑战争'],
    correctIndex: 0,
    explanation: '1492 年哥伦布抵达美洲，开启欧洲对美洲的殖民与全球联系。',
  },
  {
    eventId: 'e121',
    question: '印刷术普及后，哪场运动最先被加速？',
    options: ['宗教改革', '启蒙运动', '法国大革命', '科学革命'],
    correctIndex: 0,
    explanation: '谷登堡印刷术大幅降低书籍成本，使路德宗教改革思想迅速传播。',
  },
  {
    eventId: 'e134',
    question: '三十年战争的和平条约为现代国际体系奠定了什么原则？',
    options: ['主权国家', '君主专制', '帝国统一', '宗教独裁'],
    correctIndex: 0,
    explanation: '威斯特伐利亚和约确立了主权国家与宗教共存原则。',
  },
  {
    eventId: 'e143',
    question: '1763 年巴黎条约后，哪个国家取得全球殖民优势？',
    options: ['英国', '法国', '西班牙', '荷兰'],
    correctIndex: 0,
    explanation: '七年战争后，法国将加拿大与印度殖民地让给英国。',
  },
  {
    eventId: 'e146',
    question: '法国大革命最直接的政治后果是什么？',
    options: ['推翻君主制', '建立帝国', '殖民扩张', '宗教统一'],
    correctIndex: 0,
    explanation: '1789 年革命推翻法国旧制度，君主制崩溃。',
  },
  {
    eventId: 'e158',
    question: '黑船来航后，日本发生了哪场变革？',
    options: ['明治维新', '大化改新', '锁国体制', '战国时代'],
    correctIndex: 0,
    explanation: '1853 年美国舰队迫使日本开港，幕府倒台后明治政府推行西化改革。',
  },
  {
    eventId: 'e178',
    question: '凡尔赛条约对德国的严厉处置，最有助于谁上台？',
    options: ['希特勒', '斯大林', '罗斯福', '丘吉尔'],
    correctIndex: 0,
    explanation: '战后制裁与经济动荡为纳粹崛起创造条件。',
  },
  {
    eventId: 'e190',
    question: '1941 年德国入侵苏联与日本偷袭珍珠港，使战争变成什么性质？',
    options: ['真正的全球战争', '地区冲突', '冷战前奏', '殖民战争'],
    correctIndex: 0,
    explanation: '苏联与美国全面参战，二战成为真正的全球战争。',
  },
  {
    eventId: 'e208',
    question: '1989 年柏林墙倒塌最直接预示着什么？',
    options: ['冷战结束', '欧盟成立', '苏联解体完成', '两德统一实现'],
    correctIndex: 0,
    explanation: '柏林墙倒塌是冷战结束的象征，两年后苏联正式解体。',
  },
  {
    eventId: 'e213',
    question: '2001 年中国加入世贸组织，最直接推动了什么？',
    options: ['加速全球化整合', '冷战重启', '中东战争', '欧洲一体化'],
    correctIndex: 0,
    explanation: '中国入世标志着其深度融入全球经济，加速全球化。',
  },
];

export function getQuizPrompt(eventId: string): QuizPrompt | null {
  return quizPrompts.find((q) => q.eventId === eventId) ?? null;
}
