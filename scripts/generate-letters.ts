import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { getEnrichedEvent } from '../src/lib/enrichEvents';
import { figures, getFigure } from '../src/data/figures';
import { letterIntents, letterSpecs, type LetterSpec } from '../src/data/letters';
import type { WorldEvent } from '../src/types';

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 16000;
const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/letters.generated.json',
);

// The system prompt is byte-identical for every letter, so it is the cache prefix.
const SYSTEM_PROMPT = `你在为「来信」栏目写作。用户带着当下的焦虑而来，会收到一封来自历史中某个时刻的信——那个时刻与他的处境在结构上相似。

## 你的任务

写一封**寄给收信人**的信。收信人是一个觉得世界正在失控的当代人。写信人是一位生活在历史现场的人：他用第一人称说话，他在对自己的处境作出反应，而他的处境与收信人的处境结构相似。信是对着收信人说的，不是写给自己的日记。

因此：
- 信里要有"你"——对收信人处境的回应、提醒、追问。
- 不要写成史料综述，也不要写成抒情散文。写出一个具体的人在具体某一天做的事、看到的东西、算过的账。
- 允许有具体的动作、物件、气味、时辰、数目。它们必须来自事实包。

## 事实边界（最重要）

事实包（fact pack）是你唯一可以使用的材料。

- **只能使用事实包中出现的史实。** 不得引入事实包之外的任何人物、事件、年份、地点、数字、制度、引语。
- 不得编造史料。不得伪造引文、书名、档案编号。
- 如果你觉得需要某个事实包之外的事实才能把信写完，那就换一种写法，写到事实包够用的地方为止。
- 事实包里没有的，就写"我不知道""我没有听说""这一点我无从判断"。**历史的真实感来自边界，不来自填充。**
- 信中的年份、数目、地名，必须能在事实包中一一对应。

## 时间上的无知

写信人只知道**他所在那一刻及以前**的事。

- 事实包中标注为"在此之后""通往今天的这条线索""同一主题下数据集记录的其他时刻"的内容，是给你（写作者）理解结构用的，**不是写信人可以知道的事**。
- 写信人不得提到他之后才发生的事件、年份、人物、结局。他不能"预言"后来发生了什么。
- 尤其：不要让 1347 年的人谈论 2020 年，不要让 1916 年的人谈论 1939 年。他可以担忧、可以猜测，但只能以当时能有的信息去猜。
- 如果一条后来的事实对理解结构很关键，把它留给收信人去体会——收信人活在今天，他知道后来发生了什么。这正是这封信的力量所在。

## 因果的写法

本项目对历史因果的既定立场是：**因果是被解释出来的，不是被判决出来的。** 项目在界面上会把因果链标注为"一种理解视角"。

- 谈因果时，用"我那时以为……""后来的人说这是因为……""也许……也说不定"。用解释性、试探性的语气。
- 不要写"这必然导致""根本原因是""历史证明"这类判决式表述。
- 允许写信人当时的判断是错的。他看不清后来的事，这是真实的。
- 不要替收信人下结论说今天的局势一定会怎样。可以指出结构上的相似，不要预告结局。

## 语气

- 平静，具体，不煽动，不安慰，不喊口号。
- 不写励志句。不写"所以你要相信"。
- 收信人正在焦虑，不需要被教育，也不需要一个好消息。他需要一个真的在场过的人，把当时的情形说清楚。
- 中文写作。用写信人那个时代可能有的说话方式，但要让今天的读者读得懂。

## 结构

- salutation：称呼收信人，不要用"亲爱的朋友"这类套话。
- body：4 到 7 段。每段是一个具体的场景或念头，不要抽象排比。
- closing：落款前的一句话。不要祝福语。

## 关于写信人身份

- 如果写信人是"时代亲历者（据史料重构）"，他是**无名的人**：不得给自己安上史书中的人名、官职、著作。他的权威来自他做的事，不来自他的名字。
- 如果写信人是有名有姓的历史人物，他可以被提及事迹，但同样不得引入事实包之外的内容。`;

const LetterProseSchema = z.object({
  salutation: z.string(),
  body: z.array(z.string()),
  closing: z.string(),
});

type LetterProse = z.infer<typeof LetterProseSchema>;

interface GeneratedLetter extends LetterProse {
  id: string;
  intentId: string;
  figureId: string;
  eventId: string;
  recipient: string;
  causalPath: string[];
  sourceNote: string;
  objectSrc?: string;
  objectLabel?: string;
  generatedAt: string;
  model: string;
}

function formatEvent(event: WorldEvent, role: string): string {
  const lines = [`（${role}）${event.year} 年 · ${event.title}`, `类别：${event.category}｜地区：${event.regions.join('、')}`];
  if (event.startYear !== undefined && event.endYear !== undefined) {
    lines.push(`时间跨度：${event.startYear}—${event.endYear} 年`);
  }
  lines.push(`概述：${event.summary}`);
  if (event.cause) lines.push(`起因：${event.cause}`);
  if (event.effect) lines.push(`结果：${event.effect}`);
  if (event.globalImpact) lines.push(`全球影响：${event.globalImpact}`);
  if (event.territoryChange) lines.push(`领土变化：${event.territoryChange}`);
  if (event.regimeChange) lines.push(`政体变化：${event.regimeChange}`);
  return lines.join('\n');
}

export function buildFactPack(spec: LetterSpec): string | null {
  const anchor = getEnrichedEvent(spec.eventId);
  if (!anchor) return null;

  const sections = ['## 事实包', '', formatEvent(anchor, '写信人所处的时刻')];

  const upstream = (anchor.upstream ?? [])
    .map((link) => getEnrichedEvent(link.fromEventId))
    .filter((event): event is WorldEvent => event !== null);
  if (upstream.length) {
    sections.push('', '### 在此之前');
    for (const event of upstream) sections.push('', formatEvent(event, '前因'));
  }

  const downstream = (anchor.downstream ?? [])
    .map((link) => getEnrichedEvent(link.toEventId))
    .filter((event): event is WorldEvent => event !== null);
  if (downstream.length) {
    sections.push('', '### 在此之后（写信人当时不可能知道，你也不得让他在信中说出）');
    for (const event of downstream) sections.push('', formatEvent(event, '后果'));
  }

  const path = spec.causalPath
    .filter((eventId) => eventId !== spec.eventId)
    .map((eventId) => getEnrichedEvent(eventId))
    .filter((event): event is WorldEvent => event !== null && event !== anchor);
  if (path.length) {
    sections.push('', '### 通往今天的这条线索');
    for (const event of path) sections.push('', formatEvent(event, '链上的节点'));
  }

  // Thinly-covered anchors need more of the dataset's own record, or the model pads from
  // memory. Sibling anchors of the same intent are the nearest real material available.
  const alreadyIncluded = new Set([spec.eventId, ...spec.causalPath]);
  const intent = letterIntents.find((item) => item.id === spec.intentId);
  const siblings = (intent?.anchorEventIds ?? [])
    .filter((eventId) => !alreadyIncluded.has(eventId))
    .map((eventId) => getEnrichedEvent(eventId))
    .filter((event): event is WorldEvent => event !== null);
  if (siblings.length && sections.join('\n').length < 900) {
    sections.push('', '### 同一主题下数据集记录的其他时刻（时间跨度大，注意每条的标注）');
    for (const event of siblings) {
      const role = event.year < anchor.year ? '更早的时刻' : '更晚的时刻（写信人不可能知道）';
      sections.push('', formatEvent(event, role));
    }
  }

  return sections.join('\n');
}

function buildUserPrompt(spec: LetterSpec, factPack: string): string {
  const figure = getFigure(spec.figureId)!;
  const intent = letterIntents.find((item) => item.id === spec.intentId)!;
  const identity =
    figure.kind === 'historical'
      ? `你是${figure.name}（${figure.eraLabel}）。${figure.bio}`
      : `你是一位无名的时代亲历者：${figure.name}（${figure.eraLabel}）。${figure.bio}\n你是"据史料重构"的人物，没有留下姓名。不要给自己编造姓名、官职或著作。`;

  return `# 写信人
${identity}

你被重构所依据的史料：${figure.grounding.join('；')}

# 收信人
${spec.recipient}。这位收信人此刻正为「${intent.label}」感到不安：${intent.prompt}

# 事实包
${factPack}

# 现在写这封信
只使用上面事实包里的内容。写出来的是"${figure.name}"在这一刻写给收信人的信。`;
}

async function generateLetter(
  client: Anthropic,
  spec: LetterSpec,
): Promise<GeneratedLetter> {
  const factPack = buildFactPack(spec);
  if (!factPack) {
    throw new Error(`未知的事件 id：${spec.eventId}（来自 ${spec.id}）`);
  }
  const figure = getFigure(spec.figureId)!;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: buildUserPrompt(spec, factPack) }],
    output_config: { format: zodOutputFormat(LetterProseSchema) },
  });

  if (response.stop_reason === 'refusal') {
    throw new Error(`${spec.id}：模型拒绝了这次请求（${response.stop_details?.category ?? '未知类别'}）`);
  }

  const prose: LetterProse | null = response.parsed_output;
  if (!prose) {
    throw new Error(`${spec.id}：结构化输出解析失败，stop_reason=${response.stop_reason}`);
  }

  return {
    id: spec.id,
    intentId: spec.intentId,
    figureId: spec.figureId,
    eventId: spec.eventId,
    recipient: spec.recipient,
    ...prose,
    causalPath: spec.causalPath,
    ...(figure.objectSrc ? { objectSrc: figure.objectSrc, objectLabel: figure.objectLabel } : {}),
    sourceNote: '本信基于以下已记录史实，并由模型在史料边界内重构；因果链标注为「一种理解视角」。',
    generatedAt: new Date().toISOString(),
    model: MODEL,
  };
}

function loadExisting(): GeneratedLetter[] {
  try {
    return JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')) as GeneratedLetter[];
  } catch {
    return [];
  }
}

function preflight(): void {
  for (const spec of letterSpecs) {
    if (!getFigure(spec.figureId)) throw new Error(`${spec.id}：未知的 figureId ${spec.figureId}`);
    if (!getEnrichedEvent(spec.eventId)) throw new Error(`${spec.id}：未知的 eventId ${spec.eventId}`);
    for (const eventId of spec.causalPath) {
      if (!getEnrichedEvent(eventId)) throw new Error(`${spec.id}：因果链中的未知 eventId ${eventId}`);
    }
  }
  for (const intent of letterIntents) {
    for (const eventId of intent.anchorEventIds) {
      if (!getEnrichedEvent(eventId)) throw new Error(`${intent.id}：未知的锚点 eventId ${eventId}`);
    }
    const anchorFigures = figures.filter((figure) => intent.anchorEventIds.includes(figure.anchorEventId));
    if (!anchorFigures.length) throw new Error(`${intent.id}：没有任何图景绑定到锚点事件`);
  }
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('缺少 ANTHROPIC_API_KEY。生成会调用 Anthropic API 并产生费用，请显式设置该变量后重试。');
    process.exit(1);
  }

  preflight();

  const regenerateAll = process.argv.includes('--all');
  const existing = regenerateAll ? [] : loadExisting();
  const done = new Map(existing.map((letter) => [letter.id, letter]));
  const pending = letterSpecs.filter((spec) => !done.has(spec.id));

  if (!pending.length) {
    console.log(`全部 ${letterSpecs.length} 封信都已存在。加 --all 可全部重新生成。`);
    return;
  }

  console.log(`待生成 ${pending.length} 封 / 共 ${letterSpecs.length} 封。模型 ${MODEL}，system prompt 已启用缓存。`);
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const client = new Anthropic();

  const flush = (): void => {
    const ordered = letterSpecs
      .map((spec) => done.get(spec.id))
      .filter((letter): letter is GeneratedLetter => letter !== undefined);
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(ordered, null, 2)}\n`);
  };

  for (const [index, spec] of pending.entries()) {
    done.set(spec.id, await generateLetter(client, spec));
    flush();
    console.log(`[${index + 1}/${pending.length}] ${spec.id} 已写入`);
  }

  console.log(`完成：${done.size} 封信 → ${OUTPUT_PATH}`);
}

const isEntryPoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
