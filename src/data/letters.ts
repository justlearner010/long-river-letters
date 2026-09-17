export interface LetterIntent {
  id: string;
  label: string;
  labelEn: string;
  prompt: string;
  anchorEventIds: string[];
}

export interface LetterProse {
  salutation: string;
  body: string[];
  closing: string;
}

export interface Letter extends LetterProse {
  id: string;
  intentId: string;
  figureId: string;
  eventId: string;
  recipient: string;
  causalPath: string[];
  sourceNote: string;
  /** Copied from the figure so the UI has one place to read from. Absent when no existing model fits this persona. */
  objectSrc?: string;
  objectLabel?: string;
  generatedAt?: string;
  model?: string;
}

export interface LetterSpec {
  id: string;
  intentId: string;
  figureId: string;
  eventId: string;
  recipient: string;
  causalPath: string[];
}

export const letterIntents: LetterIntent[] = [
  {
    id: 'intent-war',
    label: '战争',
    labelEn: 'War',
    prompt: '如果你觉得一场战争正在逼近，那些真的身处其中的人，当时看见了什么？',
    anchorEventIds: ['e170', 'e171', 'e172', 'e190'],
  },
  {
    id: 'intent-plague',
    label: '瘟疫',
    labelEn: 'Plague',
    prompt: '当一种疾病开始改写所有人的日常，经历过的人是怎么把日子过下去的？',
    anchorEventIds: ['e103', 'e223'],
  },
  {
    id: 'intent-trade',
    label: '贸易封锁',
    labelEn: 'Trade blockade',
    prompt: '当贸易被关税、封锁和制裁切断，被卡住的人后来怎么样了？',
    anchorEventIds: ['e135', 'e149', 'e199', 'e222'],
  },
  {
    id: 'intent-tech',
    label: '技术冲击',
    labelEn: 'Technological disruption',
    prompt: '当一项新技术开始重排所有人的位置，站在当时的人是怎样理解它的？',
    anchorEventIds: ['e113', 'e205'],
  },
];

export const letterSpecs: LetterSpec[] = [
  {
    id: 'lib-war-vienna-1914',
    intentId: 'intent-war',
    figureId: 'fig-weltsch',
    eventId: 'e170',
    recipient: '送给觉得战争随时会烧到自己门口的人',
    causalPath: ['e170', 'e188', 'e190', 'e191'],
  },
  {
    id: 'lib-war-gallipoli-1915',
    intentId: 'intent-war',
    figureId: 'fig-bartlett',
    eventId: 'e171',
    recipient: '送给以为一场战役很快就会结束的人',
    causalPath: ['e171'],
  },
  {
    id: 'lib-war-somme-writer',
    intentId: 'intent-war',
    figureId: 'fig-barbusse',
    eventId: 'e172',
    recipient: '送给觉得伤亡数字太大就无法感受的人',
    causalPath: ['e172', 'e170', 'e187', 'e188', 'e190'],
  },
  {
    id: 'lib-war-somme-nco',
    intentId: 'intent-war',
    figureId: 'fig-trench-nco',
    eventId: 'e172',
    recipient: '送给觉得自己只是一个统计数字的人',
    causalPath: ['e172', 'e170', 'e187', 'e188', 'e190'],
  },
  {
    id: 'lib-war-barbarossa',
    intentId: 'intent-war',
    figureId: 'fig-simonov',
    eventId: 'e190',
    recipient: '送给在坏消息里强撑着过日子的人',
    causalPath: ['e190', 'e191', 'e194', 'e197', 'e201'],
  },
  {
    id: 'lib-trade-dutch-wars',
    intentId: 'intent-trade',
    figureId: 'fig-amsterdam-merchant',
    eventId: 'e135',
    recipient: '送给靠一条海路吃饭的人',
    causalPath: ['e135'],
  },
  {
    id: 'lib-trade-continental-system',
    intentId: 'intent-trade',
    figureId: 'fig-hamburg-broker',
    eventId: 'e149',
    recipient: '送给忽然发现生意做不下去的人',
    causalPath: ['e149', 'e150'],
  },
  {
    id: 'lib-trade-berlin-airlift',
    intentId: 'intent-trade',
    figureId: 'fig-berlin-loader',
    eventId: 'e199',
    recipient: '送给被围住却还要照常过日子的人',
    causalPath: ['e199', 'e198'],
  },
  {
    id: 'lib-trade-tariff-war',
    intentId: 'intent-trade',
    figureId: 'fig-prd-buyer',
    eventId: 'e222',
    recipient: '送给每天在重新安排供应链的人',
    causalPath: ['e222', 'e213', 'e209', 'e208'],
  },
  {
    id: 'lib-plague-messina',
    intentId: 'intent-plague',
    figureId: 'fig-piazza',
    eventId: 'e103',
    recipient: '送给觉得灾难来得毫无道理的人',
    causalPath: ['e103'],
  },
  {
    id: 'lib-plague-florence',
    intentId: 'intent-plague',
    figureId: 'fig-florence-notary',
    eventId: 'e103',
    recipient: '送给失去亲人却来不及悲伤的人',
    causalPath: ['e103', 'e138'],
  },
  {
    id: 'lib-plague-wuhan',
    intentId: 'intent-plague',
    figureId: 'fig-wuhan-community',
    eventId: 'e223',
    recipient: '送给被困在一座城里的人',
    causalPath: ['e223', 'e222'],
  },
  {
    id: 'lib-plague-bergamo',
    intentId: 'intent-plague',
    figureId: 'fig-bergamo-journalist',
    eventId: 'e223',
    recipient: '送给每天盯着数字看的人',
    causalPath: ['e223', 'e222'],
  },
  {
    id: 'lib-plague-yiwu',
    intentId: 'intent-plague',
    figureId: 'fig-yiwu-seller',
    eventId: 'e223',
    recipient: '送给生意一夜之间换了规则的人',
    causalPath: ['e223', 'e222'],
  },
  {
    id: 'lib-tech-print-erasmus',
    intentId: 'intent-tech',
    figureId: 'fig-erasmus',
    eventId: 'e113',
    recipient: '送给觉得信息太多、判断太难的人',
    causalPath: ['e113', 'e121'],
  },
  {
    id: 'lib-tech-print-compositor',
    intentId: 'intent-tech',
    figureId: 'fig-nuremberg-compositor',
    eventId: 'e113',
    recipient: '送给靠手艺吃饭、却看见机器替代自己的人',
    causalPath: ['e113', 'e121'],
  },
  {
    id: 'lib-tech-apollo-programmer',
    intentId: 'intent-tech',
    figureId: 'fig-agc-programmer',
    eventId: 'e205',
    recipient: '送给在做一件没人相信能做成的事的人',
    causalPath: ['e205', 'e204'],
  },
  {
    id: 'lib-tech-apollo-control',
    intentId: 'intent-tech',
    figureId: 'fig-houston-controller',
    eventId: 'e205',
    recipient: '送给把全部把握押在一次尝试上的人',
    causalPath: ['e205', 'e204'],
  },
];

export function getLetterIntent(intentId: string): LetterIntent | null {
  return letterIntents.find((intent) => intent.id === intentId) ?? null;
}

export function getLetterSpec(specId: string): LetterSpec | null {
  return letterSpecs.find((spec) => spec.id === specId) ?? null;
}

export function getLetterSpecsForIntent(intentId: string): LetterSpec[] {
  return letterSpecs.filter((spec) => spec.intentId === intentId);
}
