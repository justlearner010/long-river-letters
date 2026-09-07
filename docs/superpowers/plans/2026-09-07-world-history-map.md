# 世界格局变化交互地图实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个本地可运行的羊皮纸风格交互历史地图，覆盖 1300–2026 年约 40 个年代切片、13 个章节与约 120 个事件。

**Architecture:** Vite + React + TypeScript 静态应用；地图用 D3-geo 在 SVG 中渲染现代世界底图，按“历史归属规则”为每个国家着色；章节、切片、事件、国家档案与归属规则全部放在 `src/data/`，运行时只读并由 Vitest 校验。

**Tech Stack:** React 18、TypeScript、Vite、D3-geo、D3-zoom、world-atlas、topojson-client、Vitest、Testing Library、Playwright。

---

## 文件结构

```text
package.json
tsconfig.json
vite.config.ts
index.html
src/
  main.tsx
  App.tsx
  types.ts
  styles/theme.css
  data/
    chapters.ts
    slices.ts
    polities.ts
    events.ts
    worldRegions.ts
    polityRules.ts
  lib/
    world.ts
    attribution.ts
    filter.ts
    storage.ts
    validate.ts
  state/
    appReducer.ts
  components/
    TopBar.tsx
    ChapterRail.tsx
    WorldMap.tsx
    TimeScrubber.tsx
    EventCards.tsx
    InfoDrawer.tsx
    AboutModal.tsx
tests/
  setup.ts
  data.test.ts
  appReducer.test.ts
  app.test.tsx
  e2e.spec.ts
scripts/
  validate-data.ts
README.md
```

## Task 1: 初始化项目与测试环境

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/theme.css`
- Create: `tests/setup.ts`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "world-history-map",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "validate": "tsx scripts/validate-data.ts",
    "e2e": "playwright test"
  },
  "dependencies": {
    "d3-geo": "^3.1.1",
    "d3-zoom": "^3.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "topojson-client": "^3.1.0",
    "world-atlas": "^2.0.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/d3-geo": "^3.1.0",
    "@types/d3-zoom": "^3.0.8",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/topojson-client": "^3.1.5",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "playwright": "^1.49.1",
    "@playwright/test": "^1.49.1",
    "tsx": "^4.19.2",
    "typescript": "~5.6.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: installs successfully; `node_modules/` and `package-lock.json` created.

- [ ] **Step 3: 创建 TypeScript 与 Vite 配置**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "tests", "scripts", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    globals: true,
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>世界格局变化 1300–2026</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 创建最小应用入口与羊皮纸主题基线**

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>世界格局变化</h1>
        <span className="topbar-year">1300–2026</span>
      </header>
      <section className="map-stage" aria-label="世界地图占位">
        <p className="placeholder-text">地图待接入</p>
      </section>
    </main>
  );
}
```

`src/styles/theme.css`:

```css
:root {
  color-scheme: light;
  --ocean: #d8c8a3;
  --paper: #f0e4c7;
  --paper-deep: #d9c9a6;
  --ink: #463522;
  --ink-soft: #6f5b3e;
  --accent: #9f3e2b;
  --accent-2: #2e5f78;
  --gold: #a97f2f;
  font-family: "Songti SC", "Noto Serif CJK SC", "PingFang SC", serif;
}

* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; }
body {
  background: var(--ocean);
  color: var(--ink);
}

.app-shell {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  min-height: 560px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: var(--paper);
  border-bottom: 2px solid var(--ink-soft);
}

.topbar h1 { margin: 0; font-size: 20px; letter-spacing: 0; }
.topbar-year { font-size: 14px; color: var(--ink-soft); }

.map-stage {
  position: relative;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, var(--ocean), #cbb98f);
  overflow: hidden;
}

.placeholder-text {
  margin: 0;
  font-size: 18px;
  color: var(--ink-soft);
  border: 1px solid var(--ink-soft);
  padding: 10px 18px;
  background: rgba(240, 228, 199, 0.75);
}
```

`tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

`tests/app.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App';

describe('App', () => {
  it('renders the top bar and map stage', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '世界格局变化' })).toBeInTheDocument();
    expect(screen.getByText('地图待接入')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test`
Expected: 1 test passes.

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src tests
git commit -m "chore: scaffold vite react app with parchment theme"
```

## Task 2: 定义类型与校验工具

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/validate.ts`
- Test: `tests/data.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateWorldData } from '../src/lib/validate';
import { chapters } from '../src/data/chapters';
import { slices } from '../src/data/slices';
import { events } from '../src/data/events';

describe('world data validation', () => {
  it('reports errors when slices have invalid chapters', () => {
    const errors = validateWorldData(chapters, slices, events);
    expect(errors).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/data.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 创建类型**

`src/types.ts`:

```ts
export type Region =
  | '东亚' | '东南亚' | '南亚' | '西亚' | '中亚' | '欧洲'
  | '北非' | '撒哈拉以南非洲' | '北美' | '拉美' | '大洋洲' | '全球';

export type EventCategory =
  | 'war' | 'treaty' | 'revolution' | 'colonization'
  | 'economy' | 'tech' | 'culture' | 'organization';

export interface Chapter {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  startYear: number;
  endYear: number;
  summary: string;
  sliceIds: string[];
}

export interface EraSlice {
  id: string;
  year: number;
  label: string;
  summary: string;
  featuredEventIds: string[];
}

export interface Polity {
  id: string;
  nameZh: string;
  nameEn?: string;
  type: 'empire' | 'kingdom' | 'republic' | 'colonial' | 'union' | 'cityState' | 'other';
  startYear?: number;
  endYear?: number;
  color: string;
  summary: string;
  relatedEventIds: string[];
}

export interface WorldEvent {
  id: string;
  year: number;
  title: string;
  summary: string;
  category: EventCategory;
  regions: Region[];
  polityIds: string[];
  chapterId: string;
  importance: 1 | 2 | 3;
  featured?: boolean;
}

export interface PolityRule {
  polityId: string;
  countryNames: string[];
  from: number;
  to: number;
  priority?: number;
  note?: string;
}

export interface AttributionFrame {
  year: number;
  ownership: Record<string, string | null>;
}

export interface NamedArea {
  id: string;
  name: string;
}
```

`src/lib/validate.ts`:

```ts
import type { Chapter, EraSlice, WorldEvent } from '../types';

export function validateWorldData(
  chapters: Chapter[],
  slices: EraSlice[],
  events: WorldEvent[],
): string[] {
  const errors: string[] = [];
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const sliceById = new Map(slices.map((s) => [s.id, s]));
  const eventIds = new Set<string>();

  chapters.forEach((chapter, index) => {
    if (index > 0 && chapter.order !== chapters[index - 1].order + 1) {
      errors.push(`章节 ${chapter.id} 的 order 不连续`);
    }
    if (chapter.startYear > chapter.endYear) {
      errors.push(`章节 ${chapter.id} 年份范围错误`);
    }
  });

  slices.forEach((slice) => {
    const chapter = chapterById.get(slice.chapterId ?? '');
    if (!chapter) {
      errors.push(`切片 ${slice.id} 缺少章节引用`);
      return;
    }
    if (slice.year < chapter.startYear || slice.year > chapter.endYear) {
      errors.push(`切片 ${slice.id}（${slice.year}）不在章节 ${chapter.id} 范围内`);
    }
    slice.featuredEventIds.forEach((eventId) => {
      if (!eventIds.has(eventId) && !events.some((e) => e.id === eventId)) {
        errors.push(`切片 ${slice.id} 引用了不存在的事件 ${eventId}`);
      }
    });
  });

  events.forEach((event) => {
    if (eventIds.has(event.id)) errors.push(`事件 id 重复：${event.id}`);
    eventIds.add(event.id);
    const chapter = chapterById.get(event.chapterId);
    if (!chapter) {
      errors.push(`事件 ${event.id} 缺少章节引用`);
    } else if (event.year < chapter.startYear || event.year > chapter.endYear) {
      errors.push(`事件 ${event.id}（${event.year}）不在章节 ${chapter.id} 范围内`);
    }
    if (!event.title || !event.summary) {
      errors.push(`事件 ${event.id} 缺少标题或说明`);
    }
  });

  return errors;
}
```

注意：`EraSlice` 需要增加 `chapterId: string;` 字段，否则校验无法定位章节。本任务结束前更新 `src/types.ts`：

```ts
export interface EraSlice {
  id: string;
  year: number;
  label: string;
  summary: string;
  chapterId: string;
  featuredEventIds: string[];
}
```

- [ ] **Step 4: 创建空数据文件让测试通过前先失败于真实校验**

在后续 Task 3 填入数据；本步骤先创建以下文件并让测试暂时跳过：

`tests/data.test.ts` 末尾增加：

```ts
it.skip('data files are wired in later tasks', () => true);
```

- [ ] **Step 5: 运行测试**

Run: `npm test`
Expected: 2 个用例，1 个通过，1 个 skip，无编译错误。

- [ ] **Step 6: 提交**

```bash
git add src/types.ts src/lib/validate.ts tests/data.test.ts
git commit -m "feat: add data types and validation helper"
```

## Task 3: 章节与年代切片数据

**Files:**
- Create: `src/data/chapters.ts`
- Create: `src/data/slices.ts`
- Modify: `tests/data.test.ts`

- [ ] **Step 1: 创建章节数据**

`src/data/chapters.ts`:

```ts
import type { Chapter } from '../types';

export const chapters: Chapter[] = [
  {
    id: 'c1', order: 1, title: '1300 蒙元余晖', subtitle: '中古尾声',
    startYear: 1300, endYear: 1399,
    summary: '蒙古遗产仍在重塑欧亚，黑死病、百年战争与明朝建立拉开新格局。',
    sliceIds: ['s1300', 's1368'],
  },
  {
    id: 'c2', order: 2, title: '1400 海洋前夜', subtitle: '帝国与航路',
    startYear: 1400, endYear: 1499,
    summary: '奥斯曼攻陷君士坦丁堡，欧洲走向大航海，亚洲帝国相继重组。',
    sliceIds: ['s1405', 's1453', 's1492'],
  },
  {
    id: 'c3', order: 3, title: '1500 征服与全球连接', subtitle: '全球帝国初现',
    startYear: 1500, endYear: 1599,
    summary: '西葡跨洋扩张、萨法维与莫卧儿建立、宗教改革撕裂欧洲。',
    sliceIds: ['s1500', 's1555', 's1592'],
  },
  {
    id: 'c4', order: 4, title: '1600 帝国重整', subtitle: '威斯特伐利亚时代',
    startYear: 1600, endYear: 1699,
    summary: '东印度公司连接全球、明清易代、三十年战争催生主权国家体系。',
    sliceIds: ['s1600', 's1644', 's1648'],
  },
  {
    id: 'c5', order: 5, title: '1700 欧陆均势与启蒙', subtitle: '启蒙与前夜',
    startYear: 1700, endYear: 1799,
    summary: '俄普奥崛起、七年战争重划殖民版图、美国独立与法国大革命。',
    sliceIds: ['s1700', 's1756', 's1776', 's1789'],
  },
  {
    id: 'c6', order: 6, title: '1800 革命与民族国家', subtitle: '拿破仑与1848',
    startYear: 1800, endYear: 1870,
    summary: '拿破仑战争、维也纳体系、民族主义与明治维新塑造现代国家。',
    sliceIds: ['s1815', 's1848', 's1868'],
  },
  {
    id: 'c7', order: 7, title: '1871 瓜分与失衡', subtitle: '帝国主义时代',
    startYear: 1871, endYear: 1913,
    summary: '德意志统一、非洲瓜分、亚洲觉醒与联盟体系埋下一战伏笔。',
    sliceIds: ['s1871', 's1885', 's1905'],
  },
  {
    id: 'c8', order: 8, title: '1914 一战', subtitle: '大战与革命',
    startYear: 1914, endYear: 1918,
    summary: '奥匈、奥斯曼、德意志与沙俄四大帝国在一战中走向瓦解。',
    sliceIds: ['s1914', 's1917', 's1918'],
  },
  {
    id: 'c9', order: 9, title: '1919 凡尔赛与大萧条', subtitle: '两次大战之间',
    startYear: 1919, endYear: 1938,
    summary: '凡尔赛体系短暂平衡，大萧条与极权兴起摧毁国际秩序。',
    sliceIds: ['s1919', 's1933', 's1938'],
  },
  {
    id: 'c10', order: 10, title: '1939 二战', subtitle: '全球战争',
    startYear: 1939, endYear: 1945,
    summary: '轴心国挑战旧秩序，同盟国胜利并建立联合国与核时代。',
    sliceIds: ['s1939', 's1941', 's1945'],
  },
  {
    id: 'c11', order: 11, title: '1946 冷战与去殖民化', subtitle: '两极世界',
    startYear: 1946, endYear: 1990,
    summary: '美苏阵营对峙、亚非去殖民化、中国改革与欧洲一体同步推进。',
    sliceIds: ['s1946', 's1955', 's1962', 's1989'],
  },
  {
    id: 'c12', order: 12, title: '1991 单极后的转变', subtitle: '全球化时代',
    startYear: 1991, endYear: 2010,
    summary: '苏联解体、欧盟扩大、9·11与金融危机重塑世界权力分布。',
    sliceIds: ['s1991', 's2001', 's2008'],
  },
  {
    id: 'c13', order: 13, title: '2011 多极竞争', subtitle: '今日世界',
    startYear: 2011, endYear: 2026,
    summary: '区域冲突、技术竞争、气候议程与全球南方共同塑造多极秩序。',
    sliceIds: ['s2011', 's2022', 's2026'],
  },
];
```

- [ ] **Step 2: 创建年代切片数据**

`src/data/slices.ts`:

```ts
import type { EraSlice } from '../types';

export const slices: EraSlice[] = [
  { id: 's1300', year: 1300, label: '诸汗国与元朝', chapterId: 'c1', summary: '蒙古诸汗国名义和解，元朝控制东亚与蒙古高原。', featuredEventIds: ['e101'] },
  { id: 's1368', year: 1368, label: '大明肇建', chapterId: 'c1', summary: '明朝建立，元廷退回草原，东亚秩序进入新阶段。', featuredEventIds: ['e104'] },
  { id: 's1405', year: 1405, label: '郑和首航与帖木儿之死', chapterId: 'c2', summary: '明代下西洋开启海洋往来，帖木儿帝国随之收缩。', featuredEventIds: ['e110'] },
  { id: 's1453', year: 1453, label: '君士坦丁堡陷落', chapterId: 'c2', summary: '奥斯曼攻陷拜占庭都城，地中海与欧亚秩序改变。', featuredEventIds: ['e114'] },
  { id: 's1492', year: 1492, label: '大航海新纪元', chapterId: 'c2', summary: '西班牙完成再征服，哥伦布首航开启跨洋连接。', featuredEventIds: ['e117'] },
  { id: 's1500', year: 1500, label: '全球帝国初现', chapterId: 'c3', summary: '葡萄牙抵达巴西，西葡帝国网络成型。', featuredEventIds: ['e119'] },
  { id: 's1555', year: 1555, label: '宗教分裂与奥斯曼巅峰', chapterId: 'c3', summary: '奥格斯堡和约承认欧洲宗教分裂，奥斯曼处于扩张顶点。', featuredEventIds: ['e125'] },
  { id: 's1592', year: 1592, label: '东亚大战', chapterId: 'c3', summary: '壬辰战争牵动中日朝三方，也影响明末东亚格局。', featuredEventIds: ['e128'] },
  { id: 's1600', year: 1600, label: '东印度公司与江户幕府', chapterId: 'c4', summary: '英国东印度公司成立，德川家康统一日本。', featuredEventIds: ['e129'] },
  { id: 's1644', year: 1644, label: '明清易代', chapterId: 'c4', summary: '清军入关，明朝灭亡，东亚大陆进入清朝时代。', featuredEventIds: ['e133'] },
  { id: 's1648', year: 1648, label: '威斯特伐利亚', chapterId: 'c4', summary: '三十年战争结束，欧洲主权国家体系开始确立。', featuredEventIds: ['e134'] },
  { id: 's1700', year: 1700, label: '欧陆新均势', chapterId: 'c5', summary: '西班牙王位继承战争与北方大战同时改变欧洲版图。', featuredEventIds: ['e138'] },
  { id: 's1756', year: 1756, label: '七年战争', chapterId: 'c5', summary: '英法全球争霸决定北美与印度殖民版图。', featuredEventIds: ['e142'] },
  { id: 's1776', year: 1776, label: '美国独立', chapterId: 'c5', summary: '北美殖民地宣布独立，现代共和政体进入世界舞台。', featuredEventIds: ['e144'] },
  { id: 's1789', year: 1789, label: '法国大革命', chapterId: 'c5', summary: '巴黎革命推翻旧制度，欧洲进入革命与战争年代。', featuredEventIds: ['e146'] },
  { id: 's1815', year: 1815, label: '维也纳体系', chapterId: 'c6', summary: '拿破仑战争结束，欧洲列强重建保守均势。', featuredEventIds: ['e150'] },
  { id: 's1848', year: 1848, label: '革命年代', chapterId: 'c6', summary: '革命浪潮席卷欧洲，民族主义与社会主义思想加速传播。', featuredEventIds: ['e154'] },
  { id: 's1868', year: 1868, label: '明治维新', chapterId: 'c6', summary: '日本开启近代化改革，亚洲出现第一个成功转型的列强。', featuredEventIds: ['e158'] },
  { id: 's1871', year: 1871, label: '德意志统一', chapterId: 'c7', summary: '德国统一改变欧洲力量对比，新一轮瓜分随之展开。', featuredEventIds: ['e159'] },
  { id: 's1885', year: 1885, label: '瓜分非洲', chapterId: 'c7', summary: '柏林会议为列强瓜分非洲划定规则。', featuredEventIds: ['e162'] },
  { id: 's1905', year: 1905, label: '日俄战争与亚洲觉醒', chapterId: 'c7', summary: '日本战胜俄国，亚洲民族自觉与帝国主义失衡同步增强。', featuredEventIds: ['e166'] },
  { id: 's1914', year: 1914, label: '大战爆发', chapterId: 'c8', summary: '萨拉热窝事件点燃欧洲同盟体系，一战全面爆发。', featuredEventIds: ['e170'] },
  { id: 's1917', year: 1917, label: '革命与参战', chapterId: 'c8', summary: '俄国革命推翻沙皇，美国参战改变战争天平。', featuredEventIds: ['e174', 'e175'] },
  { id: 's1918', year: 1918, label: '帝国瓦解与停战', chapterId: 'c8', summary: '德国停战，奥匈与奥斯曼解体，欧洲地图被重绘。', featuredEventIds: ['e177'] },
  { id: 's1919', year: 1919, label: '凡尔赛体系', chapterId: 'c9', summary: '巴黎和会签订凡尔赛条约并创建国际联盟。', featuredEventIds: ['e178'] },
  { id: 's1933', year: 1933, label: '危机与极权兴起', chapterId: 'c9', summary: '大萧条背景下希特勒上台，罗斯福新政重塑美国。', featuredEventIds: ['e184'] },
  { id: 's1938', year: 1938, label: '慕尼黑与战争前夜', chapterId: 'c9', summary: '慕尼黑协定牺牲捷克斯洛伐克，绥靖政策走向破产。', featuredEventIds: ['e187'] },
  { id: 's1939', year: 1939, label: '二战爆发', chapterId: 'c10', summary: '德国入侵波兰，英法对德宣战，二战全面开始。', featuredEventIds: ['e188'] },
  { id: 's1941', year: 1941, label: '全球战火', chapterId: 'c10', summary: '苏德战争与太平洋战争爆发，冲突扩展为全球战争。', featuredEventIds: ['e190'] },
  { id: 's1945', year: 1945, label: '胜利与联合国', chapterId: 'c10', summary: '德日投降，联合国成立，世界进入核时代。', featuredEventIds: ['e194', 'e196'] },
  { id: 's1946', year: 1946, label: '铁幕落下', chapterId: 'c11', summary: '丘吉尔铁幕演说标志美苏冷战对峙成形。', featuredEventIds: ['e197'] },
  { id: 's1955', year: 1955, label: '阵营对峙与万隆', chapterId: 'c11', summary: '华约建立，亚非国家在万隆表达不结盟诉求。', featuredEventIds: ['e202'] },
  { id: 's1962', year: 1962, label: '导弹危机', chapterId: 'c11', summary: '古巴导弹危机把世界带到核战边缘，随后美苏开始管控对抗。', featuredEventIds: ['e204'] },
  { id: 's1989', year: 1989, label: '柏林墙倒塌', chapterId: 'c11', summary: '东欧剧变与柏林墙倒塌预示苏联阵营终结。', featuredEventIds: ['e208'] },
  { id: 's1991', year: 1991, label: '苏联解体', chapterId: 'c12', summary: '苏联解体，两极格局结束，美国成为唯一超级大国。', featuredEventIds: ['e209'] },
  { id: 's2001', year: 2001, label: '全球化与9·11', chapterId: 'c12', summary: '中国加入世贸，9·11 事件改变美国安全战略。', featuredEventIds: ['e213'] },
  { id: 's2008', year: 2008, label: '金融危机与G20', chapterId: 'c12', summary: '全球金融危机让 G20 成为主要协调平台，新兴经济体权重上升。', featuredEventIds: ['e215'] },
  { id: 's2011', year: 2011, label: '阿拉伯之春', chapterId: 'c13', summary: '中东北非运动浪潮引发政权更迭与区域战争。', featuredEventIds: ['e217'] },
  { id: 's2022', year: 2022, label: '俄乌战争', chapterId: 'c13', summary: '俄乌全面战争冲击欧洲安全秩序，全球阵营加速分化。', featuredEventIds: ['e224'] },
  { id: 's2026', year: 2026, label: '多极现状', chapterId: 'c13', summary: '技术竞争、区域集团与全球南方构成当前多极图景。', featuredEventIds: ['e226'] },
];
```

- [ ] **Step 3: 更新数据测试，移除 skip**

删除 `tests/data.test.ts` 中的 `it.skip(...)`，并在 `validateWorldData(chapters, slices, events)` 调用前引入：

```ts
import { slices } from '../src/data/slices';
```

- [ ] **Step 4: 运行校验测试**

Run: `npm test`
Expected: 数据测试失败，因为 `events.ts` 与 `polities.ts` 尚不存在；Task 4 补齐后通过。

- [ ] **Step 5: 提交**

```bash
git add src/data/chapters.ts src/data/slices.ts tests/data.test.ts
git commit -m "feat: add chapter and slice data"
```

## Task 4: 国家档案与事件数据

**Files:**
- Create: `src/data/polities.ts`
- Create: `src/data/events.ts`
- Modify: `tests/data.test.ts`

- [ ] **Step 1: 创建国家档案**

`src/data/polities.ts` 使用以下紧凑定义（可直接复制）：

```ts
import type { Polity } from '../types';

export const polities: Polity[] = [
  { id: 'yuan', nameZh: '元朝', nameEn: 'Yuan Dynasty', type: 'empire', startYear: 1271, endYear: 1368, color: '#9d7a4f', summary: '蒙古帝国东亚继承政权，统治中国与蒙古高原。', relatedEventIds: ['e101', 'e104'] },
  { id: 'mongol-khanates', nameZh: '蒙古汗国', nameEn: 'Mongol Khanates', type: 'empire', startYear: 1206, endYear: 1635, color: '#8f7b52', summary: '金帐汗国、察合台汗国等蒙古政权在欧亚陆续演变。', relatedEventIds: ['e101', 'e106'] },
  { id: 'ming', nameZh: '明朝', nameEn: 'Ming Dynasty', type: 'empire', startYear: 1368, endYear: 1644, color: '#b25338', summary: '汉人重建的统一王朝，以海禁与郑和远航并存著称。', relatedEventIds: ['e104', 'e110', 'e128'] },
  { id: 'qing', nameZh: '清朝', nameEn: 'Qing Dynasty', type: 'empire', startYear: 1644, endYear: 1912, color: '#3f6f5d', summary: '最后一个大一统王朝，19 世纪在内外压力下衰败。', relatedEventIds: ['e133', 'e153', 'e168'] },
  { id: 'china-republic', nameZh: '中华民国', nameEn: 'Republic of China', type: 'republic', startYear: 1912, endYear: 2026, color: '#4d7d4a', summary: '辛亥革命后建立的共和政体，1949 年后有效管辖台湾地区。', relatedEventIds: ['e168'] },
  { id: 'china-prc', nameZh: '中华人民共和国', nameEn: "People's Republic of China", type: 'republic', startYear: 1949, endYear: 2026, color: '#a2352b', summary: '1949 年成立于中国大陆，改革开放后成为重要世界力量。', relatedEventIds: ['e200', 'e213', 'e222'] },
  { id: 'joseon', nameZh: '朝鲜王朝', nameEn: 'Joseon', type: 'kingdom', startYear: 1392, endYear: 1897, color: '#8b7f9a', summary: '李氏朝鲜，经历壬辰战争与近代开港。', relatedEventIds: ['e128'] },
  { id: 'korean-empire', nameZh: '大韩帝国', nameEn: 'Korean Empire', type: 'empire', startYear: 1897, endYear: 1910, color: '#9a8d6b', summary: '朝鲜王朝改称帝国，随即被日本吞并。', relatedEventIds: [] },
  { id: 'japan-shogunate', nameZh: '日本幕府', nameEn: 'Tokugawa Japan', type: 'kingdom', startYear: 1603, endYear: 1868, color: '#6d5d8c', summary: '德川幕府长期统治，实行锁国政策。', relatedEventIds: ['e130'] },
  { id: 'japan-empire', nameZh: '大日本帝国', nameEn: 'Empire of Japan', type: 'empire', startYear: 1868, endYear: 1945, color: '#7b4d67', summary: '明治维新后扩张的帝国，二战中最终战败。', relatedEventIds: ['e158', 'e166', 'e196'] },
  { id: 'japan', nameZh: '日本国', nameEn: 'Japan', type: 'republic', startYear: 1945, endYear: 2026, color: '#556f8f', summary: '战后日本确立和平宪法，成为主要经济体。', relatedEventIds: ['e206'] },
  { id: 'vietnam', nameZh: '越南', nameEn: 'Vietnam', type: 'kingdom', startYear: 1300, endYear: 2026, color: '#7d8c4a', summary: '从大越到越南社会主义共和国，经历殖民、分治与统一。', relatedEventIds: ['e203'] },
  { id: 'siam', nameZh: '暹罗', nameEn: 'Siam', type: 'kingdom', startYear: 1351, endYear: 1939, color: '#a98e4c', summary: '东南亚保持独立的王国，后更名为泰国。', relatedEventIds: [] },
  { id: 'thailand', nameZh: '泰国', nameEn: 'Thailand', type: 'kingdom', startYear: 1939, endYear: 2026, color: '#9a774a', summary: '二战前后数度更名的君主立宪国。', relatedEventIds: [] },
  { id: 'byzantine', nameZh: '拜占庭帝国', nameEn: 'Byzantine Empire', type: 'empire', startYear: 395, endYear: 1453, color: '#6c5f86', summary: '罗马帝国东部继承者，最终被奥斯曼攻灭。', relatedEventIds: ['e114'] },
  { id: 'ottoman', nameZh: '奥斯曼帝国', nameEn: 'Ottoman Empire', type: 'empire', startYear: 1299, endYear: 1922, color: '#8a3f33', summary: '横跨欧亚非的伊斯兰帝国，一战崩溃后建立土耳其共和国。', relatedEventIds: ['e107', 'e114', 'e125', 'e136', 'e181'] },
  { id: 'mamluk', nameZh: '马木留克苏丹国', nameEn: 'Mamluk Sultanate', type: 'kingdom', startYear: 1250, endYear: 1517, color: '#8a7742', summary: '控制埃及与黎凡特的军事寡头政权。', relatedEventIds: [] },
  { id: 'timurid', nameZh: '帖木儿帝国', nameEn: 'Timurid Empire', type: 'empire', startYear: 1370, endYear: 1507, color: '#7d6a4f', summary: '中亚征服帝国，短暂整合波斯与河中地区。', relatedEventIds: ['e105', 'e108', 'e109'] },
  { id: 'safavid', nameZh: '萨法维王朝', nameEn: 'Safavid Iran', type: 'empire', startYear: 1501, endYear: 1736, color: '#4f7d52', summary: '以什叶派立国的波斯帝国，与奥斯曼长期对抗。', relatedEventIds: ['e120', 'e125'] },
  { id: 'qajar', nameZh: '恺加王朝', nameEn: 'Qajar Iran', type: 'empire', startYear: 1796, endYear: 1925, color: '#5f7d78', summary: '十九世纪波斯王朝，在英俄压力下丧失部分领土。', relatedEventIds: [] },
  { id: 'iran-pahlavi', nameZh: '巴列维王朝', nameEn: 'Pahlavi Iran', type: 'empire', startYear: 1925, endYear: 1979, color: '#557d99', summary: '推行现代化与西方化的波斯君主制。', relatedEventIds: [] },
  { id: 'iran-islamic', nameZh: '伊朗伊斯兰共和国', nameEn: 'Islamic Republic of Iran', type: 'republic', startYear: 1979, endYear: 2026, color: '#3f7d5b', summary: '伊斯兰革命后建立的共和国，影响中东地缘格局。', relatedEventIds: [] },
  { id: 'mughal', nameZh: '莫卧儿帝国', nameEn: 'Mughal Empire', type: 'empire', startYear: 1526, endYear: 1858, color: '#b06a3f', summary: '统治南亚大部的大帝国，后期被英国东印度公司蚕食。', relatedEventIds: ['e108', 'e123'] },
  { id: 'british-raj', nameZh: '英属印度', nameEn: 'British Raj', type: 'colonial', startYear: 1858, endYear: 1947, color: '#8f5f55', summary: '英国直接统治印度次大陆，1947 年分治为印度与巴基斯坦。', relatedEventIds: ['e198'] },
  { id: 'india', nameZh: '印度共和国', nameEn: 'India', type: 'republic', startYear: 1947, endYear: 2026, color: '#e09a4e', summary: '独立后的最大民主国家，21 世纪快速崛起。', relatedEventIds: ['e198'] },
  { id: 'pakistan', nameZh: '巴基斯坦', nameEn: 'Pakistan', type: 'republic', startYear: 1947, endYear: 2026, color: '#4f8f5b', summary: '英属印度分治产生的伊斯兰共和国。', relatedEventIds: ['e198'] },
  { id: 'moscow-rus', nameZh: '莫斯科公国', nameEn: 'Grand Duchy of Moscow', type: 'kingdom', startYear: 1283, endYear: 1547, color: '#6f6a52', summary: '从金帐汗国治下崛起的罗斯政权。', relatedEventIds: ['e106'] },
  { id: 'russia-tsardom', nameZh: '俄罗斯沙皇国', nameEn: 'Tsardom of Russia', type: 'empire', startYear: 1547, endYear: 1721, color: '#7d6a4f', summary: '伊凡四世加冕后的罗斯帝国，向东快速扩张。', relatedEventIds: ['e140'] },
  { id: 'russia-empire', nameZh: '俄罗斯帝国', nameEn: 'Russian Empire', type: 'empire', startYear: 1721, endYear: 1917, color: '#8a8a4a', summary: '彼得一世称帝后的跨欧亚帝国，一战中崩溃。', relatedEventIds: ['e140', 'e149', 'e175', 'e176'] },
  { id: 'ussr', nameZh: '苏联', nameEn: 'Soviet Union', type: 'union', startYear: 1922, endYear: 1991, color: '#a13c34', summary: '布尔什维克建立的社会主义联盟，冷战中的超级大国。', relatedEventIds: ['e175', 'e180', 'e201', 'e204', 'e208', 'e209'] },
  { id: 'russia-federation', nameZh: '俄罗斯联邦', nameEn: 'Russia', type: 'republic', startYear: 1991, endYear: 2026, color: '#6f8f8f', summary: '苏联解体后的主要继承国，21 世纪重塑欧亚安全议程。', relatedEventIds: ['e209', 'e219', 'e224'] },
  { id: 'poland-lithuania', nameZh: '波兰-立陶宛', nameEn: 'Polish-Lithuanian Commonwealth', type: 'union', startYear: 1569, endYear: 1795, color: '#9a8d6b', summary: '东欧重要联邦，最终被俄普奥瓜分。', relatedEventIds: ['e143'] },
  { id: 'sweden-empire', nameZh: '瑞典帝国', nameEn: 'Swedish Empire', type: 'empire', startYear: 1611, endYear: 1721, color: '#4f7d99', summary: '波罗的海霸主，北方大战后衰落。', relatedEventIds: ['e138'] },
  { id: 'holy-roman', nameZh: '神圣罗马帝国', nameEn: 'Holy Roman Empire', type: 'empire', startYear: 962, endYear: 1806, color: '#8c774f', summary: '中欧松散帝国，三十年战争后主权碎片化。', relatedEventIds: ['e131', 'e134'] },
  { id: 'habsburg', nameZh: '哈布斯堡王朝', nameEn: 'Habsburg Monarchy', type: 'empire', startYear: 1526, endYear: 1867, color: '#8f5f55', summary: '以奥地利为中心的王朝领地，后转为奥匈帝国。', relatedEventIds: ['e142'] },
  { id: 'austria-hungary', nameZh: '奥匈帝国', nameEn: 'Austria-Hungary', type: 'empire', startYear: 1867, endYear: 1918, color: '#6f5f8c', summary: '二元君主国，一战后解体。', relatedEventIds: ['e170', 'e177'] },
  { id: 'france', nameZh: '法国', nameEn: 'France', type: 'kingdom', startYear: 1300, endYear: 2026, color: '#3f6f9f', summary: '从瓦卢瓦到法兰西共和国，欧洲革命与殖民帝国的核心力量。', relatedEventIds: ['e102', 'e111', 'e112', 'e132', 'e146', 'e148', 'e150', 'e153'] },
  { id: 'england', nameZh: '英格兰', nameEn: 'England', type: 'kingdom', startYear: 927, endYear: 1707, color: '#8f4f4f', summary: '百年战争与玫瑰战争后的岛国，随后与苏格兰联合。', relatedEventIds: ['e102', 'e111', 'e116'] },
  { id: 'britain', nameZh: '大不列颠王国', nameEn: 'Kingdom of Great Britain', type: 'kingdom', startYear: 1707, endYear: 1801, color: '#a14f4f', summary: '英苏联合后的王国，七年战争中取得全球殖民优势。', relatedEventIds: ['e142', 'e143'] },
  { id: 'united-kingdom', nameZh: '英国', nameEn: 'United Kingdom', type: 'republic', startYear: 1801, endYear: 2026, color: '#7d4f5f', summary: '工业革命与不列颠治世的核心，二战后逐步退为区域强国。', relatedEventIds: ['e117', 'e137', 'e150', 'e198', 'e211', 'e221'] },
  { id: 'spain', nameZh: '西班牙', nameEn: 'Spain', type: 'kingdom', startYear: 1479, endYear: 2026, color: '#b56a3f', summary: '再征服与跨洋帝国的建立者，17 世纪后逐步衰落。', relatedEventIds: ['e115', 'e117', 'e118', 'e122', 'e124', 'e127', 'e139'] },
  { id: 'portugal', nameZh: '葡萄牙', nameEn: 'Portugal', type: 'kingdom', startYear: 1300, endYear: 2026, color: '#3f8f7d', summary: '大航海先驱，建立巴西与非洲-亚洲殖民据点。', relatedEventIds: ['e110', 'e119', 'e151'] },
  { id: 'dutch-republic', nameZh: '荷兰共和国', nameEn: 'Dutch Republic', type: 'republic', startYear: 1581, endYear: 1795, color: '#7d8f4f', summary: '全球贸易与殖民竞争者，17 世纪海上霸权。', relatedEventIds: ['e135'] },
  { id: 'netherlands', nameZh: '荷兰', nameEn: 'Netherlands', type: 'kingdom', startYear: 1815, endYear: 2026, color: '#9f8f4f', summary: '拿破仑战争后恢复的立宪王国。', relatedEventIds: [] },
  { id: 'prussia', nameZh: '普鲁士', nameEn: 'Prussia', type: 'kingdom', startYear: 1701, endYear: 1871, color: '#6f7d8f', summary: '军国化德意志邦国，主导德国统一。', relatedEventIds: ['e138', 'e141', 'e142'] },
  { id: 'german-empire', nameZh: '德意志帝国', nameEn: 'German Empire', type: 'empire', startYear: 1871, endYear: 1918, color: '#4f6f8f', summary: '统一后的德国，挑战欧洲均势并发动一战。', relatedEventIds: ['e159', 'e160', 'e161', 'e170', 'e177'] },
  { id: 'germany', nameZh: '德国', nameEn: 'Germany', type: 'republic', startYear: 1918, endYear: 2026, color: '#8f8f4f', summary: '魏玛、纳粹与战后联邦德国共同构成的现代德国。', relatedEventIds: ['e184', 'e187', 'e189', 'e191', 'e210'] },
  { id: 'italy', nameZh: '意大利', nameEn: 'Italy', type: 'kingdom', startYear: 1861, endYear: 2026, color: '#3f8f6f', summary: '统一后的半岛国家，两次世界大战中扮演关键角色。', relatedEventIds: ['e160', 'e185'] },
  { id: 'usa', nameZh: '美国', nameEn: 'United States of America', type: 'republic', startYear: 1776, endYear: 2026, color: '#2e5f78', summary: '从殖民地到超级大国，主导 20 世纪后半叶国际秩序。', relatedEventIds: ['e144', 'e145', 'e147', 'e164', 'e174', 'e194', 'e213', 'e214', 'e222'] },
  { id: 'mexico', nameZh: '墨西哥', nameEn: 'Mexico', type: 'republic', startYear: 1821, endYear: 2026, color: '#4f8f4f', summary: '新西班牙总督区独立的联邦共和国。', relatedEventIds: ['e152'] },
  { id: 'brazil', nameZh: '巴西', nameEn: 'Brazil', type: 'republic', startYear: 1822, endYear: 2026, color: '#3f9f7d', summary: '葡萄牙巴西独立的南美大国。', relatedEventIds: ['e151'] },
  { id: 'gran-colombia', nameZh: '大哥伦比亚', nameEn: 'Gran Colombia', type: 'republic', startYear: 1819, endYear: 1831, color: '#8fa14f', summary: '玻利瓦尔领导的南美联邦，后分裂为多国。', relatedEventIds: ['e152'] },
  { id: 'aztec', nameZh: '阿兹特克帝国', nameEn: 'Aztec Empire', type: 'empire', startYear: 1428, endYear: 1521, color: '#9f6f4f', summary: '中美洲军事联盟，被西班牙征服。', relatedEventIds: ['e122'] },
  { id: 'inca', nameZh: '印加帝国', nameEn: 'Inca Empire', type: 'empire', startYear: 1438, endYear: 1533, color: '#b58f4f', summary: '安第斯山脉的庞大帝国，西班牙殖民后灭亡。', relatedEventIds: ['e124'] },
  { id: 'mali', nameZh: '马里帝国', nameEn: 'Mali Empire', type: 'empire', startYear: 1235, endYear: 1600, color: '#8f8f3f', summary: '西非黄金帝国，廷巴克图学术中心。', relatedEventIds: [] },
  { id: 'songhai', nameZh: '桑海帝国', nameEn: 'Songhai Empire', type: 'empire', startYear: 1464, endYear: 1591, color: '#b59f4f', summary: '西非最大帝国之一，被摩洛哥火器部队重创。', relatedEventIds: [] },
  { id: 'kongo', nameZh: '刚果王国', nameEn: 'Kingdom of Kongo', type: 'kingdom', startYear: 1390, endYear: 1857, color: '#7f8f6f', summary: '中非刚果河口的贸易王国，与葡萄牙关系密切。', relatedEventIds: [] },
  { id: 'ethiopia', nameZh: '埃塞俄比亚', nameEn: 'Ethiopia', type: 'kingdom', startYear: 1300, endYear: 2026, color: '#8f7d3f', summary: '非洲之角的古老基督教国家，成功抵抗殖民瓜分。', relatedEventIds: ['e185'] },
];
```

- [ ] **Step 2: 创建事件数据**

`src/data/events.ts` 使用以下 126 个事件（每行一个对象）：

```ts
import type { WorldEvent } from '../types';

export const events: WorldEvent[] = [
  // c1 蒙元余晖
  { id: 'e101', year: 1304, title: '蒙古诸汗国名义和解', summary: '元朝与四大汗国短暂恢复名义上的宗藩关系，蒙古世界体系最后一次整合。', category: 'organization', regions: ['东亚', '中亚'], polityIds: ['yuan', 'mongol-khanates'], chapterId: 'c1', importance: 2 },
  { id: 'e102', year: 1337, title: '百年战争爆发', summary: '英法因王位继承与领土争端开战，战争持续一个多世纪并塑造民族意识。', category: 'war', regions: ['欧洲'], polityIds: ['england', 'france'], chapterId: 'c1', importance: 2, featured: true },
  { id: 'e103', year: 1347, title: '黑死病登陆欧洲', summary: '鼠疫大流行造成欧洲人口锐减，劳动力、地租与社会结构剧烈改变。', category: 'culture', regions: ['欧洲'], polityIds: [], chapterId: 'c1', importance: 3, featured: false },
  { id: 'e104', year: 1368, title: '明朝建立', summary: '朱元璋建立明朝，元廷退回草原，东亚政治版图进入新周期。', category: 'revolution', regions: ['东亚'], polityIds: ['yuan', 'ming'], chapterId: 'c1', importance: 3, featured: true },
  { id: 'e105', year: 1370, title: '帖木儿帝国兴起', summary: '帖木儿以撒马尔罕为中心建立横跨中亚与波斯的征服帝国。', category: 'war', regions: ['中亚', '西亚'], polityIds: ['timurid'], chapterId: 'c1', importance: 2 },
  { id: 'e106', year: 1380, title: '库利科沃战役', summary: '莫斯科大公击败金帐汗国军队，罗斯政治重心朝莫斯科转移。', category: 'war', regions: ['欧洲'], polityIds: ['mongol-khanates', 'moscow-rus'], chapterId: 'c1', importance: 2 },
  { id: 'e107', year: 1396, title: '尼科波利斯战役', summary: '奥斯曼击败欧洲十字军，巴尔干局势进一步倒向奥斯曼。', category: 'war', regions: ['欧洲', '西亚'], polityIds: ['ottoman'], chapterId: 'c1', importance: 2 },
  { id: 'e108', year: 1398, title: '帖木儿攻陷德里', summary: '帖木儿洗劫德里，削弱德里苏丹国并影响北印度未来权力结构。', category: 'war', regions: ['南亚'], polityIds: ['timurid'], chapterId: 'c1', importance: 2 },
  // c2 海洋前夜
  { id: 'e109', year: 1402, title: '安卡拉战役', summary: '帖木儿击败奥斯曼苏丹巴耶济德，暂缓奥斯曼对拜占庭的攻势。', category: 'war', regions: ['西亚'], polityIds: ['timurid', 'ottoman'], chapterId: 'c2', importance: 2 },
  { id: 'e110', year: 1405, title: '郑和首航', summary: '明朝船队从南京出发下西洋，海上朝贡网络一度扩展至印度洋。', category: 'economy', regions: ['东亚', '东南亚', '南亚', '西亚'], polityIds: ['ming'], chapterId: 'c2', importance: 3, featured: true },
  { id: 'e111', year: 1415, title: '阿金库尔战役与休达', summary: '英格兰重创法国骑兵，葡萄牙则占领北非休达，开启欧洲海外扩张。', category: 'war', regions: ['欧洲', '北非'], polityIds: ['england', 'france', 'portugal'], chapterId: 'c2', importance: 2 },
  { id: 'e112', year: 1431, title: '圣女贞德就义', summary: '法国民族情感因贞德而强化，百年战争向法国胜利方向转变。', category: 'culture', regions: ['欧洲'], polityIds: ['france', 'england'], chapterId: 'c2', importance: 2 },
  { id: 'e113', year: 1450, title: '谷登堡印刷术', summary: '活字印刷在欧洲普及，知识传播速度改变宗教、科学与政治。', category: 'tech', regions: ['欧洲'], polityIds: [], chapterId: 'c2', importance: 3, featured: true },
  { id: 'e114', year: 1453, title: '君士坦丁堡陷落', summary: '奥斯曼攻陷拜占庭首都，结束千年帝国并控制黑海与地中海贸易要道。', category: 'war', regions: ['欧洲', '西亚'], polityIds: ['byzantine', 'ottoman'], chapterId: 'c2', importance: 3, featured: true },
  { id: 'e115', year: 1469, title: '伊莎贝拉与斐迪南联姻', summary: '卡斯蒂利亚与阿拉贡联合，为统一西班牙和海外扩张奠基。', category: 'treaty', regions: ['欧洲'], polityIds: ['spain'], chapterId: 'c2', importance: 2 },
  { id: 'e116', year: 1485, title: '都铎王朝建立', summary: '博斯沃思战役结束玫瑰战争，英格兰进入中央集权时代。', category: 'revolution', regions: ['欧洲'], polityIds: ['england'], chapterId: 'c2', importance: 2 },
  { id: 'e117', year: 1492, title: '格拉纳达陷落与哥伦布首航', summary: '西班牙完成再征服，哥伦布抵达美洲开启跨大西洋殖民时代。', category: 'colonization', regions: ['欧洲', '北美', '拉美'], polityIds: ['spain'], chapterId: 'c2', importance: 3, featured: true },
  { id: 'e118', year: 1494, title: '托尔德西里亚斯条约', summary: '西葡在教皇调停下划分新世界势力范围，全球殖民分蛋糕由此开端。', category: 'treaty', regions: ['拉美', '全球'], polityIds: ['spain', 'portugal'], chapterId: 'c2', importance: 3, featured: true },
  // c3 征服与全球连接
  { id: 'e119', year: 1500, title: '葡萄牙抵达巴西', summary: '卡布拉尔船队到达巴西海岸，葡萄牙在南美建立殖民地。', category: 'colonization', regions: ['拉美'], polityIds: ['portugal'], chapterId: 'c3', importance: 2 },
  { id: 'e120', year: 1501, title: '萨法维王朝建立', summary: '伊斯玛仪建立什叶派王朝，波斯重新成为独立帝国并影响中东教派版图。', category: 'revolution', regions: ['西亚'], polityIds: ['safavid'], chapterId: 'c3', importance: 3, featured: true },
  { id: 'e121', year: 1517, title: '宗教改革开始', summary: '马丁·路德发布《九十五条论纲》，欧洲基督教世界开始分裂。', category: 'culture', regions: ['欧洲'], polityIds: ['holy-roman'], chapterId: 'c3', importance: 3, featured: true },
  { id: 'e122', year: 1519, title: '麦哲伦启航与科尔特斯登陆', summary: '麦哲伦船队开始环球航行，科尔特斯入侵阿兹特克帝国。', category: 'colonization', regions: ['全球', '拉美'], polityIds: ['spain', 'aztec'], chapterId: 'c3', importance: 3, featured: true },
  { id: 'e123', year: 1526, title: '莫卧儿帝国建立', summary: '巴布尔在帕尼帕特击败德里苏丹，建立统治南亚数百年的莫卧儿帝国。', category: 'war', regions: ['南亚'], polityIds: ['mughal'], chapterId: 'c3', importance: 3, featured: true },
  { id: 'e124', year: 1533, title: '印加帝国灭亡', summary: '皮萨罗处死印加皇帝，西班牙完成对安第斯核心区的征服。', category: 'colonization', regions: ['拉美'], polityIds: ['spain', 'inca'], chapterId: 'c3', importance: 2 },
  { id: 'e125', year: 1555, title: '奥格斯堡和约', summary: '德意志诸侯获得宗教自主权，路德宗被承认，欧洲国家体系正式容纳宗教分裂。', category: 'treaty', regions: ['欧洲'], polityIds: ['holy-roman'], chapterId: 'c3', importance: 3, featured: true },
  { id: 'e126', year: 1571, title: '勒班陀海战', summary: '神圣同盟舰队击败奥斯曼海军，地中海霸权竞争出现关键转折。', category: 'war', regions: ['欧洲', '西亚'], polityIds: ['spain', 'ottoman'], chapterId: 'c3', importance: 2 },
  { id: 'e127', year: 1588, title: '西班牙无敌舰队失败', summary: '英国击败西班牙无敌舰队，海洋霸权开始从西班牙向英荷转移。', category: 'war', regions: ['欧洲'], polityIds: ['spain', 'england'], chapterId: 'c3', importance: 2 },
  { id: 'e128', year: 1592, title: '壬辰战争爆发', summary: '日本入侵朝鲜，明朝出兵救援，东亚三国卷入大规模战争。', category: 'war', regions: ['东亚'], polityIds: ['japan-shogunate', 'joseon', 'ming'], chapterId: 'c3', importance: 3, featured: true },
  // c4 帝国重整
  { id: 'e129', year: 1600, title: '英国东印度公司成立', summary: '特许贸易公司成为英国进入亚洲的先锋，最终演变为殖民帝国机构。', category: 'economy', regions: ['南亚', '东南亚'], polityIds: ['england'], chapterId: 'c4', importance: 3, featured: true },
  { id: 'e130', year: 1603, title: '江户幕府建立', summary: '德川家康统一日本并建立幕府，日本进入长期锁国稳定期。', category: 'revolution', regions: ['东亚'], polityIds: ['japan-shogunate'], chapterId: 'c4', importance: 3, featured: true },
  { id: 'e131', year: 1618, title: '三十年战争爆发', summary: '波西米亚反抗哈布斯堡的战争扩大为全欧冲突，最终重塑欧洲政治。', category: 'war', regions: ['欧洲'], polityIds: ['holy-roman', 'habsburg'], chapterId: 'c4', importance: 3, featured: true },
  { id: 'e132', year: 1640, title: '葡萄牙复国与英国革命', summary: '葡萄牙摆脱西班牙统治，英国长期议会挑战王权，革命时代开启。', category: 'revolution', regions: ['欧洲'], polityIds: ['portugal', 'spain', 'france', 'england'], chapterId: 'c4', importance: 2 },
  { id: 'e133', year: 1644, title: '清军入关', summary: '明朝灭亡后清军进入北京，东亚大陆进入清朝统治。', category: 'war', regions: ['东亚'], polityIds: ['ming', 'qing'], chapterId: 'c4', importance: 3, featured: true },
  { id: 'e134', year: 1648, title: '威斯特伐利亚和约', summary: '三十年战争结束，主权国家与宗教共存原则成为现代国际体系基础。', category: 'treaty', regions: ['欧洲'], polityIds: ['holy-roman', 'habsburg', 'france', 'sweden-empire'], chapterId: 'c4', importance: 3, featured: true },
  { id: 'e135', year: 1652, title: '第一次英荷战争', summary: '英荷争夺海洋贸易霸权，开启一系列商业战争。', category: 'war', regions: ['欧洲', '全球'], polityIds: ['england', 'dutch-republic'], chapterId: 'c4', importance: 2 },
  { id: 'e136', year: 1683, title: '维也纳之战', summary: '波兰-神圣同盟联军击败奥斯曼，奥斯曼在欧洲扩张就此终止。', category: 'war', regions: ['欧洲'], polityIds: ['ottoman', 'holy-roman', 'poland-lithuania'], chapterId: 'c4', importance: 3, featured: true },
  { id: 'e137', year: 1689, title: '权利法案与英国君主立宪', summary: '光荣革命确立议会至上，英国开始走向宪政与全球扩张。', category: 'revolution', regions: ['欧洲'], polityIds: ['england', 'united-kingdom'], chapterId: 'c4', importance: 3, featured: true },
  // c5 欧陆均势与启蒙
  { id: 'e138', year: 1700, title: '西班牙王位继承战争', summary: '波旁与哈布斯堡争夺西班牙王位，欧洲列强开始以均势遏制霸权。', category: 'war', regions: ['欧洲'], polityIds: ['spain', 'prussia', 'sweden-empire', 'france'], chapterId: 'c5', importance: 2 },
  { id: 'e139', year: 1713, title: '乌得勒支条约', summary: '西班牙王位继承战结束，英国取得直布罗陀与殖民地贸易权益。', category: 'treaty', regions: ['欧洲', '全球'], polityIds: ['spain', 'united-kingdom', 'france'], chapterId: 'c5', importance: 2 },
  { id: 'e140', year: 1721, title: '俄罗斯帝国建立', summary: '彼得一世在北方大战后称帝，俄国成为欧亚帝国并进入欧洲政治。', category: 'revolution', regions: ['欧洲'], polityIds: ['russia-tsardom', 'russia-empire'], chapterId: 'c5', importance: 3, featured: true },
  { id: 'e141', year: 1740, title: '西里西亚战争与普鲁士崛起', summary: '腓特烈大帝夺取西里西亚，普鲁士跻身欧洲列强。', category: 'war', regions: ['欧洲'], polityIds: ['prussia', 'habsburg'], chapterId: 'c5', importance: 2 },
  { id: 'e142', year: 1756, title: '七年战争爆发', summary: '英法在北美、印度与欧洲全面对抗，全球性帝国战争开启。', category: 'war', regions: ['全球'], polityIds: ['france', 'britain', 'prussia', 'habsburg'], chapterId: 'c5', importance: 3, featured: true },
  { id: 'e143', year: 1763, title: '巴黎条约', summary: '法国交出加拿大与印度殖民地，英国取得全球殖民优势。', category: 'treaty', regions: ['全球'], polityIds: ['britain', 'france', 'spain', 'poland-lithuania'], chapterId: 'c5', importance: 3, featured: true },
  { id: 'e144', year: 1776, title: '美国独立宣言', summary: '北美十三殖民地宣布独立，现代共和革命进入世界历史。', category: 'revolution', regions: ['北美'], polityIds: ['usa', 'britain'], chapterId: 'c5', importance: 3, featured: true },
  { id: 'e145', year: 1783, title: '巴黎和约', summary: '英国承认美国独立，新国家正式进入国际体系。', category: 'treaty', regions: ['北美', '全球'], polityIds: ['usa', 'britain'], chapterId: 'c5', importance: 2 },
  { id: 'e146', year: 1789, title: '法国大革命', summary: '三级会议转向国民议会，旧制度崩溃，人权与共和理念席卷欧洲。', category: 'revolution', regions: ['欧洲'], polityIds: ['france'], chapterId: 'c5', importance: 3, featured: true },
  { id: 'e147', year: 1799, title: '拿破仑政变', summary: '拿破仑发动雾月政变，法国进入军事独裁并向欧洲扩张。', category: 'revolution', regions: ['欧洲'], polityIds: ['france'], chapterId: 'c5', importance: 3, featured: true },
  // c6 革命与民族国家
  { id: 'e148', year: 1804, title: '拿破仑称帝与海地独立', summary: '法国国内走向帝国，海地奴隶革命成功建立独立国家。', category: 'revolution', regions: ['欧洲', '拉美'], polityIds: ['france'], chapterId: 'c6', importance: 3, featured: true },
  { id: 'e149', year: 1812, title: '拿破仑远征俄国', summary: '法军进攻俄国失败，拿破仑帝国开始崩溃。', category: 'war', regions: ['欧洲'], polityIds: ['france', 'russia-empire'], chapterId: 'c6', importance: 2 },
  { id: 'e150', year: 1815, title: '维也纳体系', summary: '滑铁卢后列强建立保守均势，欧洲协调机制维持近四十年和平。', category: 'treaty', regions: ['欧洲'], polityIds: ['france', 'united-kingdom', 'russia-empire', 'habsburg', 'prussia'], chapterId: 'c6', importance: 3, featured: true },
  { id: 'e151', year: 1823, title: '门罗宣言', summary: '美国宣布反对欧洲在美洲恢复殖民，形成西半球势力边界。', category: 'treaty', regions: ['北美', '拉美'], polityIds: ['usa', 'spain', 'portugal', 'brazil'], chapterId: 'c6', importance: 2 },
  { id: 'e152', year: 1830, title: '七月革命与拉美独立', summary: '法国七月革命推翻复辟王朝，大哥伦比亚解体推动南美多国格局。', category: 'revolution', regions: ['欧洲', '拉美'], polityIds: ['france', 'gran-colombia', 'mexico'], chapterId: 'c6', importance: 2 },
  { id: 'e153', year: 1842, title: '南京条约', summary: '鸦片战争后清廷割让香港并开放五口通商，中国进入条约体系。', category: 'treaty', regions: ['东亚'], polityIds: ['qing', 'united-kingdom'], chapterId: 'c6', importance: 3, featured: true },
  { id: 'e154', year: 1848, title: '欧洲革命年', summary: '革命从巴黎蔓延至维也纳、柏林与意大利，民族主义力量全面爆发。', category: 'revolution', regions: ['欧洲'], polityIds: ['france', 'habsburg', 'prussia', 'holy-roman'], chapterId: 'c6', importance: 3, featured: true },
  { id: 'e155', year: 1848, title: '共产党宣言发表', summary: '马克思与恩格斯发表宣言，社会主义成为影响世界的重要思想。', category: 'culture', regions: ['欧洲', '全球'], polityIds: [], chapterId: 'c6', importance: 3, featured: true },
  { id: 'e156', year: 1853, title: '黑船来航', summary: '美国舰队迫使日本开港，日本被迫进入近代国际体系。', category: 'treaty', regions: ['东亚'], polityIds: ['japan-shogunate', 'usa'], chapterId: 'c6', importance: 2 },
  { id: 'e157', year: 1861, title: '美国内战与俄国农奴制改革', summary: '美国内战决定联邦与废奴方向，俄国废除农奴制开启近代改革。', category: 'war', regions: ['北美', '欧洲'], polityIds: ['usa', 'russia-empire'], chapterId: 'c6', importance: 3, featured: true },
  { id: 'e158', year: 1868, title: '明治维新', summary: '日本推翻幕府并推行西化改革，成为亚洲第一个近代列强。', category: 'revolution', regions: ['东亚'], polityIds: ['japan-shogunate', 'japan-empire'], chapterId: 'c6', importance: 3, featured: true },
  // c7 瓜分与失衡
  { id: 'e159', year: 1871, title: '德意志帝国成立', summary: '普鲁士在普法战争后统一德国，欧洲力量平衡被彻底改写。', category: 'revolution', regions: ['欧洲'], polityIds: ['prussia', 'german-empire'], chapterId: 'c7', importance: 3, featured: true },
  { id: 'e160', year: 1878, title: '柏林会议', summary: '列强重划巴尔干与奥斯曼领土，欧洲协调进入帝国主义博弈。', category: 'treaty', regions: ['欧洲', '西亚'], polityIds: ['ottoman', 'russia-empire', 'austria-hungary', 'german-empire', 'italy'], chapterId: 'c7', importance: 2 },
  { id: 'e161', year: 1882, title: '三国同盟成立', summary: '德奥意缔结同盟，欧洲联盟体系开始走向敌对阵营。', category: 'treaty', regions: ['欧洲'], polityIds: ['german-empire', 'austria-hungary', 'italy'], chapterId: 'c7', importance: 2 },
  { id: 'e162', year: 1885, title: '柏林会议瓜分非洲', summary: '列强划定非洲殖民规则，欧洲在几年内完成对非洲大陆的瓜分。', category: 'treaty', regions: ['撒哈拉以南非洲', '北非'], polityIds: ['france', 'united-kingdom', 'german-empire', 'spain', 'portugal'], chapterId: 'c7', importance: 3, featured: true },
  { id: 'e163', year: 1894, title: '甲午战争爆发', summary: '中日争夺朝鲜与东北亚主导权，日本击败清朝并改变东亚秩序。', category: 'war', regions: ['东亚'], polityIds: ['qing', 'japan-empire'], chapterId: 'c7', importance: 3, featured: true },
  { id: 'e164', year: 1898, title: '美西战争', summary: '美国击败西班牙并取得菲律宾、波多黎各与古巴保护权，成为新殖民强国。', category: 'war', regions: ['拉美', '东南亚'], polityIds: ['usa', 'spain'], chapterId: 'c7', importance: 2 },
  { id: 'e165', year: 1900, title: '义和团运动与八国联军', summary: '华北反帝运动遭八国联军镇压，清廷被迫接受更大让步。', category: 'war', regions: ['东亚'], polityIds: ['qing', 'japan-empire', 'united-kingdom', 'france', 'german-empire', 'usa'], chapterId: 'c7', importance: 2 },
  { id: 'e166', year: 1904, title: '日俄战争爆发', summary: '日俄在中国东北交战，日本胜利动摇欧洲列强不可战胜的印象。', category: 'war', regions: ['东亚'], polityIds: ['japan-empire', 'russia-empire'], chapterId: 'c7', importance: 3, featured: true },
  { id: 'e167', year: 1905, title: '俄国革命', summary: '血腥星期日引发全国抗议，沙皇被迫设立国家杜马。', category: 'revolution', regions: ['欧洲'], polityIds: ['russia-empire'], chapterId: 'c7', importance: 2 },
  { id: 'e168', year: 1911, title: '辛亥革命', summary: '武昌起义推翻清朝，中华民国建立，两千余年帝制终结。', category: 'revolution', regions: ['东亚'], polityIds: ['qing', 'china-republic'], chapterId: 'c7', importance: 3, featured: true },
  { id: 'e169', year: 1913, title: '第二次巴尔干战争', summary: '巴尔干国家互斗，奥斯曼几乎退出欧洲，欧洲火药桶进一步点燃。', category: 'war', regions: ['欧洲'], polityIds: ['ottoman'], chapterId: 'c7', importance: 2 },
  // c8 一战
  { id: 'e170', year: 1914, title: '萨拉热窝事件与一战爆发', summary: '奥匈皇储遇刺成为导火索，同盟与协约体系迅速把大国拖入战争。', category: 'war', regions: ['欧洲', '全球'], polityIds: ['austria-hungary', 'german-empire', 'russia-empire', 'france', 'united-kingdom', 'ottoman'], chapterId: 'c8', importance: 3, featured: true },
  { id: 'e171', year: 1915, title: '加里波利战役', summary: '协约国进攻奥斯曼海峡失败，民族主义在土耳其进一步觉醒。', category: 'war', regions: ['西亚', '欧洲'], polityIds: ['ottoman'], chapterId: 'c8', importance: 2 },
  { id: 'e172', year: 1916, title: '凡尔登与索姆河战役', summary: '西线消耗战造成百万伤亡，战争进入工业屠杀阶段。', category: 'war', regions: ['欧洲'], polityIds: ['france', 'german-empire'], chapterId: 'c8', importance: 3, featured: true },
  { id: 'e173', year: 1917, title: '俄国二月革命', summary: '彼得格勒起义推翻沙皇，罗曼诺夫王朝结束。', category: 'revolution', regions: ['欧洲'], polityIds: ['russia-empire'], chapterId: 'c8', importance: 2 },
  { id: 'e174', year: 1917, title: '美国参战', summary: '美国加入协约国，工业与人力优势决定战争最终走向。', category: 'war', regions: ['全球'], polityIds: ['usa', 'german-empire'], chapterId: 'c8', importance: 3, featured: true },
  { id: 'e175', year: 1917, title: '俄国十月革命', summary: '布尔什维克夺取政权，建立世界上第一个社会主义国家。', category: 'revolution', regions: ['欧洲'], polityIds: ['russia-empire', 'ussr'], chapterId: 'c8', importance: 3, featured: true },
  { id: 'e176', year: 1918, title: '布列斯特和约', summary: '俄国退出大战，割让西部领土，苏联暂时失去大片东欧土地。', category: 'treaty', regions: ['欧洲'], polityIds: ['ussr', 'german-empire'], chapterId: 'c8', importance: 2 },
  { id: 'e177', year: 1918, title: '德意志帝国崩溃与停战', summary: '德国革命推翻帝制，协约国与德国停战，四大帝国随之瓦解。', category: 'treaty', regions: ['欧洲'], polityIds: ['german-empire', 'austria-hungary', 'ottoman', 'united-kingdom'], chapterId: 'c8', importance: 3, featured: true },
  // c9 凡尔赛与大萧条
  { id: 'e178', year: 1919, title: '凡尔赛条约', summary: '巴黎和会对德严苛清算并重绘东欧版图，埋下下一轮冲突种子。', category: 'treaty', regions: ['欧洲', '全球'], polityIds: ['germany', 'france', 'united-kingdom', 'usa'], chapterId: 'c9', importance: 3, featured: true },
  { id: 'e179', year: 1920, title: '国际联盟成立', summary: '人类首次建立普遍性国际组织，但因列强缺席与缺乏强制力而脆弱。', category: 'organization', regions: ['全球'], polityIds: [], chapterId: 'c9', importance: 3, featured: true },
  { id: 'e180', year: 1922, title: '苏联成立与墨索里尼上台', summary: '苏维埃联盟成立，意大利法西斯政权建立，极权主义登上舞台。', category: 'revolution', regions: ['欧洲'], polityIds: ['ussr', 'italy'], chapterId: 'c9', importance: 3, featured: true },
  { id: 'e181', year: 1923, title: '土耳其共和国成立', summary: '洛桑条约承认土耳其新边界，奥斯曼帝国正式终结。', category: 'revolution', regions: ['西亚'], polityIds: ['ottoman'], chapterId: 'c9', importance: 2 },
  { id: 'e182', year: 1929, title: '华尔街股灾', summary: '纽约股市崩盘引发全球大萧条，自由放任经济模式受到根本质疑。', category: 'economy', regions: ['北美', '全球'], polityIds: ['usa'], chapterId: 'c9', importance: 3, featured: true },
  { id: 'e183', year: 1931, title: '九一八事变', summary: '日本侵占中国东北并建立伪满洲国，远东国际秩序受到公开挑战。', category: 'war', regions: ['东亚'], polityIds: ['japan-empire', 'china-republic'], chapterId: 'c9', importance: 3, featured: true },
  { id: 'e184', year: 1933, title: '希特勒上台与罗斯福新政', summary: '德国转向纳粹专政，美国推行新政应对危机，两国走向相反道路。', category: 'revolution', regions: ['欧洲', '北美'], polityIds: ['germany', 'usa'], chapterId: 'c9', importance: 3, featured: true },
  { id: 'e185', year: 1935, title: '意大利入侵埃塞俄比亚', summary: '法西斯意大利吞并埃塞俄比亚，国联制裁失败暴露体系无能。', category: 'war', regions: ['撒哈拉以南非洲'], polityIds: ['italy', 'ethiopia'], chapterId: 'c9', importance: 2 },
  { id: 'e186', year: 1936, title: '西班牙内战与德日同盟', summary: '西班牙内战成为意识形态预演场，德日缔约加速轴心形成。', category: 'war', regions: ['欧洲', '东亚'], polityIds: ['spain', 'germany', 'japan-empire'], chapterId: 'c9', importance: 2 },
  { id: 'e187', year: 1938, title: '慕尼黑协定', summary: '英法允德国吞并苏台德区，绥靖政策达到顶点并鼓励德国扩张。', category: 'treaty', regions: ['欧洲'], polityIds: ['germany', 'france', 'united-kingdom'], chapterId: 'c9', importance: 3, featured: true },
  // c10 二战
  { id: 'e188', year: 1939, title: '德苏条约与二战爆发', summary: '纳粹德国与苏联瓜分东欧后入侵波兰，英法对德宣战。', category: 'treaty', regions: ['欧洲'], polityIds: ['germany', 'ussr'], chapterId: 'c10', importance: 3, featured: true },
  { id: 'e189', year: 1940, title: '法国陷落与不列颠空战', summary: '德国闪击法国，英国独自抵抗并赢得空战胜利。', category: 'war', regions: ['欧洲'], polityIds: ['france', 'germany', 'united-kingdom'], chapterId: 'c10', importance: 3, featured: true },
  { id: 'e190', year: 1941, title: '巴巴罗萨与珍珠港', summary: '德国进攻苏联，日本偷袭珍珠港，战争扩展为真正的全球战争。', category: 'war', regions: ['欧洲', '东亚', '全球'], polityIds: ['germany', 'ussr', 'japan-empire', 'usa'], chapterId: 'c10', importance: 3, featured: true },
  { id: 'e191', year: 1942, title: '斯大林格勒与中途岛', summary: '苏德战场与太平洋战场同时出现转折，轴心国攻势开始衰竭。', category: 'war', regions: ['欧洲', '大洋洲'], polityIds: ['ussr', 'germany', 'japan-empire', 'usa'], chapterId: 'c10', importance: 3, featured: true },
  { id: 'e192', year: 1943, title: '开罗会议与意大利投降', summary: '同盟国规划战后亚洲秩序，意大利退出轴心，欧洲轴心开始崩溃。', category: 'treaty', regions: ['欧洲', '东亚'], polityIds: ['usa', 'united-kingdom', 'china-republic', 'italy'], chapterId: 'c10', importance: 2 },
  { id: 'e193', year: 1944, title: '诺曼底登陆', summary: '盟军登陆法国开辟第二战场，德国在西线转入败退。', category: 'war', regions: ['欧洲'], polityIds: ['usa', 'united-kingdom', 'germany'], chapterId: 'c10', importance: 3, featured: true },
  { id: 'e194', year: 1945, title: '雅尔塔与联合国成立', summary: '美苏英规划战后秩序，联合国宪章在旧金山签署。', category: 'treaty', regions: ['全球'], polityIds: ['usa', 'ussr', 'united-kingdom', 'france', 'china-republic'], chapterId: 'c10', importance: 3, featured: true },
  { id: 'e195', year: 1945, title: '德国投降与波茨坦', summary: '欧洲胜利日结束后，波茨坦会议确定战后德国与亚洲秩序议题。', category: 'treaty', regions: ['欧洲'], polityIds: ['germany', 'usa', 'ussr', 'united-kingdom'], chapterId: 'c10', importance: 2 },
  { id: 'e196', year: 1945, title: '广岛长崎与日本投降', summary: '原子弹与苏联参战迫使日本无条件投降，核时代开始。', category: 'war', regions: ['东亚', '全球'], polityIds: ['usa', 'japan-empire'], chapterId: 'c10', importance: 3, featured: true },
  // c11 冷战与去殖民化
  { id: 'e197', year: 1946, title: '铁幕演说', summary: '丘吉尔在美国发表演说，美苏阵营边界开始被明确宣示。', category: 'treaty', regions: ['欧洲'], polityIds: ['usa', 'ussr'], chapterId: 'c11', importance: 2 },
  { id: 'e198', year: 1947, title: '马歇尔计划与印巴分治', summary: '美国援助欧洲重建，英属印度分治为印度与巴基斯坦。', category: 'economy', regions: ['欧洲', '南亚'], polityIds: ['usa', 'united-kingdom', 'british-raj', 'india', 'pakistan'], chapterId: 'c11', importance: 3, featured: true },
  { id: 'e199', year: 1948, title: '以色列建国与柏林封锁', summary: '以色列宣布建国并随即爆发中东战争，苏联封锁柏林使冷战第一次直面对抗。', category: 'war', regions: ['西亚', '欧洲'], polityIds: ['usa', 'ussr', 'united-kingdom'], chapterId: 'c11', importance: 3, featured: true },
  { id: 'e200', year: 1949, title: '北约成立与中华人民共和国成立', summary: '北约将美欧安全绑定，中华人民共和国成立改变亚洲政治版图。', category: 'organization', regions: ['欧洲', '东亚'], polityIds: ['usa', 'united-kingdom', 'france', 'china-prc'], chapterId: 'c11', importance: 3, featured: true },
  { id: 'e201', year: 1950, title: '朝鲜战争爆发', summary: '朝鲜半岛战争使冷战在亚洲热战化，并固化东北亚分裂。', category: 'war', regions: ['东亚'], polityIds: ['usa', 'china-prc', 'ussr'], chapterId: 'c11', importance: 3, featured: true },
  { id: 'e202', year: 1955, title: '华约与万隆会议', summary: '苏联阵营成立华约，亚非国家在万隆提出和平共处与不结盟。', category: 'organization', regions: ['欧洲', '全球'], polityIds: ['ussr', 'usa'], chapterId: 'c11', importance: 3, featured: true },
  { id: 'e203', year: 1956, title: '苏伊士危机与匈牙利事件', summary: '英法以入侵埃及受阻，苏联镇压匈牙利改革，去殖民化与冷战同时加剧。', category: 'war', regions: ['北非', '欧洲'], polityIds: ['united-kingdom', 'france', 'ussr', 'usa'], chapterId: 'c11', importance: 3, featured: true },
  { id: 'e204', year: 1962, title: '古巴导弹危机', summary: '苏联在古巴部署导弹，美苏在核战边缘对峙后达成妥协。', category: 'war', regions: ['拉美', '全球'], polityIds: ['usa', 'ussr'], chapterId: 'c11', importance: 3, featured: true },
  { id: 'e205', year: 1969, title: '阿波罗登月', summary: '美国实现载人登月，科技竞赛成为冷战价值观竞争的一部分。', category: 'tech', regions: ['全球'], polityIds: ['usa', 'ussr'], chapterId: 'c11', importance: 2 },
  { id: 'e206', year: 1972, title: '尼克松访华与中日建交', summary: '中美关系破冰，日本迅速与中国建交，亚洲冷战格局出现三角化。', category: 'treaty', regions: ['东亚', '北美'], polityIds: ['usa', 'china-prc', 'japan'], chapterId: 'c11', importance: 3, featured: true },
  { id: 'e207', year: 1975, title: '越战结束与西贡陷落', summary: '美国撤军后北越统一越南，东南亚冷战阵线随之调整。', category: 'treaty', regions: ['东南亚'], polityIds: ['usa', 'vietnam'], chapterId: 'c11', importance: 2 },
  { id: 'e208', year: 1989, title: '柏林墙倒塌', summary: '东欧公民运动与苏联改革汇聚，柏林墙倒塌成为冷战结束象征。', category: 'revolution', regions: ['欧洲'], polityIds: ['germany', 'ussr'], chapterId: 'c11', importance: 3, featured: true },
  // c12 单极后的转变
  { id: 'e209', year: 1991, title: '苏联解体与海湾战争', summary: '苏联正式解散，冷战结束；美国领导联军击败伊拉克并主导中东秩序。', category: 'revolution', regions: ['全球', '西亚'], polityIds: ['ussr', 'russia-federation', 'usa'], chapterId: 'c12', importance: 3, featured: true },
  { id: 'e210', year: 1993, title: '欧盟成立', summary: '马斯特里赫特条约生效，欧洲一体化进入共同市场与共同货币时代。', category: 'organization', regions: ['欧洲'], polityIds: ['france', 'germany', 'italy', 'netherlands'], chapterId: 'c12', importance: 3, featured: true },
  { id: 'e211', year: 1997, title: '香港回归与亚洲金融危机', summary: '香港主权移交中国，亚洲金融危机冲击泰国、韩国与印尼等经济体。', category: 'economy', regions: ['东亚', '东南亚'], polityIds: ['china-prc', 'united-kingdom'], chapterId: 'c12', importance: 3, featured: true },
  { id: 'e212', year: 1999, title: '澳门回归与科索沃战争', summary: '澳门移交中国，北约对南斯拉夫军事干预重塑欧洲安全规则。', category: 'war', regions: ['东亚', '欧洲'], polityIds: ['china-prc', 'usa'], chapterId: 'c12', importance: 2 },
  { id: 'e213', year: 2001, title: '9·11事件与中国入世', summary: '恐怖袭击改变美国战略方向，中国加入世贸加速全球化整合。', category: 'war', regions: ['北美', '全球'], polityIds: ['usa', 'china-prc'], chapterId: 'c12', importance: 3, featured: true },
  { id: 'e214', year: 2003, title: '伊拉克战争', summary: '美国领导联军推翻萨达姆政权，中东秩序进入长期动荡。', category: 'war', regions: ['西亚'], polityIds: ['usa', 'united-kingdom'], chapterId: 'c12', importance: 3, featured: true },
  { id: 'e215', year: 2008, title: '全球金融危机与G20', summary: '美国次贷危机演变为全球衰退，G20 升格为国际经济协调平台。', category: 'economy', regions: ['北美', '全球'], polityIds: ['usa', 'china-prc'], chapterId: 'c12', importance: 3, featured: true },
  { id: 'e216', year: 2010, title: '中国GDP超过日本', summary: '中国经济总量升至世界第二，东亚经济重心进一步向中国转移。', category: 'economy', regions: ['东亚', '全球'], polityIds: ['china-prc', 'japan'], chapterId: 'c12', importance: 2 },
  // c13 多极竞争
  { id: 'e217', year: 2011, title: '阿拉伯之春', summary: '北非中东的抗议浪潮推翻多个政权，也引发利比亚、叙利亚等长期冲突。', category: 'revolution', regions: ['北非', '西亚'], polityIds: [], chapterId: 'c13', importance: 3, featured: true },
  { id: 'e218', year: 2013, title: '一带一路倡议', summary: '中国提出跨境基础设施与贸易网络，全球基础设施格局出现新轴线。', category: 'economy', regions: ['全球'], polityIds: ['china-prc'], chapterId: 'c13', importance: 3, featured: true },
  { id: 'e219', year: 2014, title: '克里米亚危机', summary: '俄罗斯并吞克里米亚并支持东乌分离，欧洲安全秩序受到直接挑战。', category: 'war', regions: ['欧洲'], polityIds: ['russia-federation', 'usa'], chapterId: 'c13', importance: 3, featured: true },
  { id: 'e220', year: 2015, title: '巴黎气候协定', summary: '近两百个国家通过气候协定，气候治理成为多极世界关键议题。', category: 'treaty', regions: ['全球'], polityIds: ['china-prc', 'usa', 'france'], chapterId: 'c13', importance: 3, featured: true },
  { id: 'e221', year: 2016, title: '英国脱欧公投', summary: '英国公投决定退出欧盟，欧洲一体化遭遇重大挫折。', category: 'treaty', regions: ['欧洲'], polityIds: ['united-kingdom', 'france', 'germany'], chapterId: 'c13', importance: 3, featured: true },
  { id: 'e222', year: 2018, title: '中美贸易战', summary: '美国对华加征关税并限制技术流转，两大经济体进入竞争性并行时代。', category: 'economy', regions: ['北美', '东亚', '全球'], polityIds: ['usa', 'china-prc'], chapterId: 'c13', importance: 3, featured: true },
  { id: 'e223', year: 2020, title: '新冠疫情', summary: '疫情冲击全球供应链与公共财政，各国治理能力与国际合作受到考验。', category: 'economy', regions: ['全球'], polityIds: ['china-prc', 'usa', 'france', 'germany'], chapterId: 'c13', importance: 2 },
  { id: 'e224', year: 2022, title: '俄乌战争', summary: '俄罗斯全面入侵乌克兰，欧洲安全、能源与全球阵营结构发生剧变。', category: 'war', regions: ['欧洲'], polityIds: ['russia-federation', 'usa', 'germany', 'france', 'united-kingdom'], chapterId: 'c13', importance: 3, featured: true },
  { id: 'e225', year: 2023, title: '巴以冲突升级', summary: '新一轮中东战争使地区和平进程受挫，多极博弈更趋复杂。', category: 'war', regions: ['西亚'], polityIds: ['usa'], chapterId: 'c13', importance: 2 },
  { id: 'e226', year: 2026, title: '多极世界格局', summary: '技术竞争、区域集团与全球南方同时崛起，国际秩序呈现多中心状态。', category: 'organization', regions: ['全球'], polityIds: ['usa', 'china-prc', 'russia-federation', 'india'], chapterId: 'c13', importance: 1, featured: true },
];
```

- [ ] **Step 3: 更新校验测试**

在 `tests/data.test.ts` 中为 `validateWorldData` 调用加入真实数据并断言无错误：

```ts
import { polities } from '../src/data/polities';

const polityIds = new Set(polities.map((p) => p.id));
const missing = events.flatMap((e) => e.polityIds.filter((id) => !polityIds.has(id)));
expect(missing).toEqual([]);
```

同时把 `expect(errors).toEqual([])` 后的 `errors` 按失败原因打印：

```ts
if (errors.length) {
  throw new Error(errors.join('\n'));
}
```

- [ ] **Step 4: 运行测试修正数据**

Run: `npm test`
Expected: 数据中所有事件年份、章节引用与政体引用通过校验。

- [ ] **Step 5: 提交**

```bash
git add src/data/polities.ts src/data/events.ts tests/data.test.ts
git commit -m "feat: add polity registry and 126 curated events"
```

## Task 5: 世界区域与领土归属规则

**Files:**
- Create: `src/data/worldRegions.ts`
- Create: `src/data/polityRules.ts`
- Modify: `tests/data.test.ts`

- [ ] **Step 1: 创建区域宏**

`src/data/worldRegions.ts`:

```ts
export const REGION_COUNTRIES: Record<string, string[]> = {
  ANATOLIA: ['Turkey'],
  BALKANS: ['Greece', 'Bulgaria', 'Serbia', 'Albania', 'North Macedonia', 'Bosnia and Herzegovina', 'Croatia', 'Romania', 'Moldova'],
  LEVANT: ['Syria', 'Lebanon', 'Israel', 'Jordan'],
  MESOPOTAMIA: ['Iraq'],
  EGYPT: ['Egypt'],
  MAGHREB: ['Libya', 'Tunisia', 'Algeria', 'Morocco'],
  ARABIA: ['Saudi Arabia', 'Yemen', 'Oman', 'United Arab Emirates', 'Qatar', 'Kuwait'],
  PERSIA: ['Iran'],
  CAUCASUS: ['Armenia', 'Azerbaijan', 'Georgia'],
  CENTRAL_ASIA: ['Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan'],
  INDIAN_SUBCONTINENT: ['India', 'Pakistan', 'Bangladesh', 'Afghanistan', 'Nepal', 'Bhutan', 'Sri Lanka'],
  MAINLAND_SEA: ['Myanmar', 'Thailand', 'Cambodia', 'Laos', 'Vietnam'],
  MALAY_ARCH: ['Indonesia', 'Malaysia', 'Philippines'],
  EAST_ASIA: ['China', 'Taiwan'],
  KOREA: ['South Korea', 'North Korea'],
  SCANDINAVIA: ['Sweden', 'Norway', 'Denmark', 'Finland'],
  EASTERN_EUROPE: ['Poland', 'Ukraine', 'Belarus', 'Lithuania', 'Latvia', 'Estonia'],
  RUSSIA_CORE: ['Russia'],
  GERMANY_AREA: ['Germany'],
  ALPS: ['Austria', 'Switzerland'],
  BENELUX: ['Netherlands', 'Belgium', 'Luxembourg'],
  FRANCE_AREA: ['France'],
  IBERIA: ['Spain', 'Portugal'],
  BRITISH_ISLES: ['United Kingdom', 'Ireland'],
  ITALY_AREA: ['Italy'],
  HUNGARY_BASIN: ['Hungary', 'Slovakia', 'Czechia'],
  NORTH_AMERICA: ['United States of America', 'Canada'],
  MESOAMERICA: ['Mexico', 'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama'],
  ANDES: ['Colombia', 'Venezuela', 'Ecuador', 'Peru', 'Bolivia'],
  SOUTHERN_AMERICA: ['Chile', 'Argentina', 'Uruguay', 'Paraguay'],
  BRAZIL_AREA: ['Brazil'],
  SAHEL: ['Mali', 'Niger', 'Chad', 'Sudan', 'Burkina Faso'],
  EAST_AFRICA: ['Ethiopia', 'Somalia', 'Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Burundi'],
  CONGO_BASIN: ['Dem. Rep. Congo', 'Congo', 'Angola', 'Gabon', 'Equatorial Guinea', 'Central African Rep.'],
  SOUTH_AFRICA: ['South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'Mozambique', 'Zambia', 'Malawi'],
  OCEANIA: ['Australia', 'New Zealand'],
};
```

- [ ] **Step 2: 创建归属规则**

`src/data/polityRules.ts`:

```ts
import { REGION_COUNTRIES as R } from './worldRegions';
import type { PolityRule } from '../types';

const areas = (regionKeys: (keyof typeof R | string)[]) =>
  regionKeys.flatMap((key) => R[key as keyof typeof R] ?? []);

export const polityRules: PolityRule[] = [
  { polityId: 'yuan', countryNames: ['China', 'Mongolia'], from: 1300, to: 1368, priority: 5, note: '中国与蒙古高原的元朝控制范围' },
  { polityId: 'mongol-khanates', countryNames: ['Mongolia'], from: 1300, to: 1644, priority: 4 },
  { polityId: 'ming', countryNames: ['China'], from: 1368, to: 1644, priority: 5 },
  { polityId: 'qing', countryNames: ['China', 'Mongolia', 'Taiwan'], from: 1644, to: 1912, priority: 5 },
  { polityId: 'china-republic', countryNames: ['China', 'Taiwan'], from: 1912, to: 1949, priority: 5 },
  { polityId: 'china-prc', countryNames: ['China'], from: 1949, to: 2026, priority: 5 },
  { polityId: 'china-republic', countryNames: ['Taiwan'], from: 1949, to: 2026, priority: 5, note: '1949 年后有效管辖台湾地区' },
  { polityId: 'joseon', countryNames: areas(['KOREA']), from: 1300, to: 1897, priority: 5 },
  { polityId: 'korean-empire', countryNames: areas(['KOREA']), from: 1897, to: 1910, priority: 5 },
  { polityId: 'japan-shogunate', countryNames: ['Japan'], from: 1300, to: 1868, priority: 5 },
  { polityId: 'japan-empire', countryNames: ['Japan', 'Taiwan', ...areas(['KOREA'])], from: 1868, to: 1945, priority: 5, note: '台湾 1895–1945、朝鲜 1910–1945' },
  { polityId: 'japan', countryNames: ['Japan'], from: 1945, to: 2026, priority: 5 },
  { polityId: 'vietnam', countryNames: ['Vietnam'], from: 1300, to: 1887, priority: 5 },
  { polityId: 'france', countryNames: ['Vietnam'], from: 1887, to: 1954, priority: 3, note: '法属印度支那的越南部分' },
  { polityId: 'vietnam', countryNames: ['Vietnam'], from: 1954, to: 2026, priority: 5 },
  { polityId: 'siam', countryNames: ['Thailand'], from: 1300, to: 1939, priority: 5 },
  { polityId: 'thailand', countryNames: ['Thailand'], from: 1939, to: 2026, priority: 5 },
  { polityId: 'byzantine', countryNames: ['Turkey'], from: 1300, to: 1340, priority: 2, note: '仅概括拜占庭残余控制区' },
  { polityId: 'ottoman', countryNames: [...areas(['ANATOLIA', 'BALKANS'])], from: 1453, to: 1922, priority: 5 },
  { polityId: 'ottoman', countryNames: [...areas(['LEVANT', 'MESOPOTAMIA', 'EGYPT', 'ARABIA', 'MAGHREB'])], from: 1517, to: 1922, priority: 5, note: '16 世纪后逐步控制' },
  { polityId: 'mamluk', countryNames: [...areas(['EGYPT', 'LEVANT'])], from: 1300, to: 1517, priority: 5 },
  { polityId: 'timurid', countryNames: [...areas(['CENTRAL_ASIA', 'PERSIA', 'MESOPOTAMIA'])], from: 1370, to: 1507, priority: 4 },
  { polityId: 'safavid', countryNames: [...areas(['PERSIA', 'CAUCASUS', 'MESOPOTAMIA'])], from: 1501, to: 1736, priority: 5 },
  { polityId: 'qajar', countryNames: [...areas(['PERSIA', 'CAUCASUS'])], from: 1796, to: 1925, priority: 5 },
  { polityId: 'iran-pahlavi', countryNames: areas(['PERSIA']), from: 1925, to: 1979, priority: 5 },
  { polityId: 'iran-islamic', countryNames: areas(['PERSIA']), from: 1979, to: 2026, priority: 5 },
  { polityId: 'mughal', countryNames: areas(['INDIAN_SUBCONTINENT']), from: 1526, to: 1858, priority: 5 },
  { polityId: 'british-raj', countryNames: ['India', 'Pakistan', 'Bangladesh', 'Myanmar'], from: 1858, to: 1947, priority: 5 },
  { polityId: 'india', countryNames: ['India'], from: 1947, to: 2026, priority: 5 },
  { polityId: 'pakistan', countryNames: ['Pakistan'], from: 1947, to: 2026, priority: 5 },
  { polityId: 'moscow-rus', countryNames: ['Russia'], from: 1300, to: 1547, priority: 2, note: '以现代俄罗斯版图概括莫斯科公国扩张' },
  { polityId: 'russia-tsardom', countryNames: ['Russia'], from: 1547, to: 1721, priority: 5 },
  { polityId: 'russia-empire', countryNames: [...areas(['RUSSIA_CORE', 'EASTERN_EUROPE', 'CENTRAL_ASIA', 'CAUCASUS'])], from: 1721, to: 1917, priority: 5 },
  { polityId: 'ussr', countryNames: [...areas(['RUSSIA_CORE', 'EASTERN_EUROPE', 'CENTRAL_ASIA', 'CAUCASUS'])], from: 1922, to: 1991, priority: 5 },
  { polityId: 'russia-federation', countryNames: ['Russia'], from: 1991, to: 2026, priority: 5 },
  { polityId: 'poland-lithuania', countryNames: ['Poland', 'Lithuania', 'Belarus', 'Ukraine'], from: 1569, to: 1795, priority: 5 },
  { polityId: 'sweden-empire', countryNames: [...areas(['SCANDINAVIA'])], from: 1611, to: 1721, priority: 4, note: '芬兰与波罗的海属地' },
  { polityId: 'holy-roman', countryNames: [...areas(['GERMANY_AREA', 'ALPS', 'HUNGARY_BASIN'])], from: 1300, to: 1806, priority: 4 },
  { polityId: 'habsburg', countryNames: [...areas(['ALPS', 'HUNGARY_BASIN'])], from: 1526, to: 1867, priority: 5 },
  { polityId: 'austria-hungary', countryNames: [...areas(['ALPS', 'HUNGARY_BASIN'])], from: 1867, to: 1918, priority: 5 },
  { polityId: 'france', countryNames: areas(['FRANCE_AREA']), from: 1300, to: 2026, priority: 5 },
  { polityId: 'england', countryNames: ['United Kingdom'], from: 1300, to: 1707, priority: 4, note: '含英格兰与威尔士' },
  { polityId: 'britain', countryNames: ['United Kingdom'], from: 1707, to: 1801, priority: 5 },
  { polityId: 'united-kingdom', countryNames: ['United Kingdom'], from: 1801, to: 2026, priority: 5 },
  { polityId: 'united-kingdom', countryNames: ['India', 'Pakistan', 'Bangladesh', 'Myanmar'], from: 1757, to: 1858, priority: 3, note: '东印度公司统治阶段' },
  { polityId: 'spain', countryNames: [...areas(['IBERIA'])], from: 1479, to: 2026, priority: 5 },
  { polityId: 'spain', countryNames: [...areas(['MESOAMERICA', 'ANDES'])], from: 1535, to: 1821, priority: 4, note: '西属美洲' },
  { polityId: 'spain', countryNames: ['Philippines'], from: 1565, to: 1898, priority: 4 },
  { polityId: 'mexico', countryNames: ['Mexico'], from: 1821, to: 2026, priority: 5 },
  { polityId: 'gran-colombia', countryNames: ['Colombia', 'Venezuela', 'Ecuador', 'Panama'], from: 1819, to: 1831, priority: 5 },
  { polityId: 'portugal', countryNames: ['Portugal'], from: 1300, to: 2026, priority: 5 },
  { polityId: 'portugal', countryNames: ['Brazil'], from: 1500, to: 1822, priority: 4 },
  { polityId: 'brazil', countryNames: ['Brazil'], from: 1822, to: 2026, priority: 5 },
  { polityId: 'dutch-republic', countryNames: ['Netherlands'], from: 1581, to: 1795, priority: 5 },
  { polityId: 'netherlands', countryNames: ['Netherlands'], from: 1815, to: 2026, priority: 5 },
  { polityId: 'dutch-republic', countryNames: ['Indonesia'], from: 1602, to: 1795, priority: 3 },
  { polityId: 'netherlands', countryNames: ['Indonesia'], from: 1815, to: 1949, priority: 3, note: '荷属东印度' },
  { polityId: 'prussia', countryNames: ['Germany'], from: 1701, to: 1871, priority: 5, note: '以现代德国概括普鲁士主导范围' },
  { polityId: 'german-empire', countryNames: ['Germany'], from: 1871, to: 1918, priority: 5 },
  { polityId: 'germany', countryNames: ['Germany'], from: 1918, to: 2026, priority: 5 },
  { polityId: 'italy', countryNames: ['Italy'], from: 1861, to: 2026, priority: 5 },
  { polityId: 'usa', countryNames: ['United States of America'], from: 1776, to: 2026, priority: 5 },
  { polityId: 'aztec', countryNames: ['Mexico'], from: 1428, to: 1521, priority: 4 },
  { polityId: 'inca', countryNames: ['Peru', 'Ecuador', 'Bolivia'], from: 1438, to: 1533, priority: 4 },
  { polityId: 'mali', countryNames: ['Mali'], from: 1300, to: 1600, priority: 4 },
  { polityId: 'songhai', countryNames: ['Mali', 'Niger'], from: 1464, to: 1591, priority: 4 },
  { polityId: 'kongo', countryNames: ['Angola', 'Dem. Rep. Congo'], from: 1390, to: 1857, priority: 4 },
  { polityId: 'ethiopia', countryNames: ['Ethiopia'], from: 1300, to: 2026, priority: 5 },
];
```

- [ ] **Step 3: 增加规则一致性测试**

在 `tests/data.test.ts` 末尾加入：

```ts
import { polityRules } from '../src/data/polityRules';

it('polity rules use only registered polities', () => {
  const ids = new Set(polities.map((p) => p.id));
  const bad = polityRules.filter((r) => !ids.has(r.polityId));
  expect(bad.map((r) => r.polityId)).toEqual([]);
});
```

- [ ] **Step 4: 运行测试**

Run: `npm test`
Expected: 校验与规则测试均通过。

- [ ] **Step 5: 提交**

```bash
git add src/data/worldRegions.ts src/data/polityRules.ts tests/data.test.ts
git commit -m "feat: add region macros and historical territory rules"
```

## Task 6: 世界底图与归属帧构建

**Files:**
- Modify: `package.json`
- Create: `src/lib/world.ts`
- Create: `src/lib/attribution.ts`
- Test: `tests/data.test.ts`

- [ ] **Step 1: 增加 geojson 与 d3-selection 依赖**

修改 `package.json` 的 `dependencies` 增加：

```json
"d3-selection": "^3.0.0"
```

`devDependencies` 增加：

```json
"@types/geojson": "^7946.0.14"
```

Run: `npm install`
Expected: 安装成功。

- [ ] **Step 2: 写归属函数测试**

在 `tests/data.test.ts` 末尾增加：

```ts
import { ownerForYear } from '../src/lib/attribution';
import { polityRules } from '../src/data/polityRules';

it('attributes China to the right polity in key years', () => {
  expect(ownerForYear(polityRules, 1360, 'China')).toBe('yuan');
  expect(ownerForYear(polityRules, 1600, 'China')).toBe('ming');
  expect(ownerForYear(polityRules, 1900, 'China')).toBe('qing');
  expect(ownerForYear(polityRules, 1990, 'China')).toBe('china-prc');
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run tests/data.test.ts`
Expected: FAIL，`attribution` 模块不存在。

- [ ] **Step 4: 创建世界底图加载模块**

`src/lib/world.ts`:

```ts
import world from 'world-atlas/countries-110m.json';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';

export interface BaseCountry {
  id: string;
  name: string;
  geometry: Geometry;
}

export function loadCountries(): BaseCountry[] {
  const topology = world as unknown as { objects: { countries: unknown } };
  const fc = feature(topology, topology.objects.countries) as FeatureCollection;
  return fc.features.map((f) => ({
    id: String(f.id),
    name: String((f.properties as Record<string, unknown> | null)?.name ?? f.id),
    geometry: f.geometry as Geometry,
  }));
}
```

- [ ] **Step 5: 创建归属帧模块**

`src/lib/attribution.ts`:

```ts
import type { AttributionFrame, PolityRule } from '../types';

export function ownerForYear(
  rules: PolityRule[],
  year: number,
  countryName: string,
): string | null {
  const matches = rules.filter(
    (rule) =>
      rule.countryNames.includes(countryName) &&
      year >= rule.from &&
      year <= rule.to,
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0].polityId;
}

export function buildAttributionFrame(
  year: number,
  rules: PolityRule[],
  countryNames: string[],
): AttributionFrame {
  const ownership: Record<string, string | null> = {};
  for (const name of countryNames) {
    ownership[name] = ownerForYear(rules, year, name);
  }
  return { year, ownership };
}
```

- [ ] **Step 6: 运行测试**

Run: `npm test`
Expected: 新测试通过；若某些规则国名不在世界底图中，Task 9 地图渲染会出现灰块，由地图测试补查。

- [ ] **Step 7: 提交**

```bash
git add package.json package-lock.json src/lib/world.ts src/lib/attribution.ts tests/data.test.ts
git commit -m "feat: add world basemap loader and attribution builder"
```

## Task 7: 羊皮纸世界地图组件

**Files:**
- Create: `src/components/WorldMap.tsx`
- Create: `src/lib/mapRenderer.ts`
- Modify: `src/styles/theme.css`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: 创建地图渲染工具**

`src/lib/mapRenderer.ts`:

```ts
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { BaseCountry } from './world';
import type { AttributionFrame } from '../types';

export function createPathGenerator(width: number, height: number) {
  const projection = geoNaturalEarth1().fitExtent(
    [[12, 12], [width - 12, height - 12]],
    { type: 'Sphere' } as never,
  );
  const path = geoPath(projection);
  const labelPoint = (country: BaseCountry) => {
    const sphere = { type: 'Sphere' } as never;
    const p = projection.invert?.([width / 2, height / 2]);
    void sphere;
    return p ? [width / 2, height / 2] : [width / 2, height / 2];
  };
  return { projection, path, labelPoint };
}
```

说明：`labelPoint` 保留给未来放置固定点位标签；当前地图不使用单点投影标签，避免误标。

- [ ] **Step 2: 写地图组件测试**

在 `tests/app.test.tsx` 增加：

```tsx
import WorldMap from '../src/components/WorldMap';

it('renders a map svg even without attribution data', () => {
  render(<WorldMap frame={{ year: 1300, ownership: {} }} highlightIds={[]} onSelectPolity={() => undefined} />);
  expect(screen.getByTestId('world-map')).toBeInTheDocument();
});
```

- [ ] **Step 3: 创建地图组件**

`src/components/WorldMap.tsx`:

```tsx
import { useEffect, useMemo, useRef } from 'react';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { loadCountries } from '../lib/world';
import { createPathGenerator } from '../lib/mapRenderer';
import type { AttributionFrame } from '../types';

interface WorldMapProps {
  frame: AttributionFrame;
  highlightIds: string[];
  onSelectPolity: (polityId: string, countryName: string) => void;
}

export default function WorldMap({ frame, highlightIds, onSelectPolity }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const countries = useMemo(() => loadCountries(), []);
  const { path } = useMemo(
    () => createPathGenerator(containerRef.current?.clientWidth ?? 900, containerRef.current?.clientHeight ?? 560),
    [],
  );

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        select(svg).select('g.map-zoom').attr('transform', event.transform.toString());
      });
    select(svg).call(zoomBehavior).on('dblclick.zoom', null);
    return () => {
      select(svg).on('.zoom', null);
    };
  }, []);

  useEffect(() => {
    select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoom().scaleExtent([1, 8]).on('zoom', (event) => {
        select(svgRef.current).select('g.map-zoom').attr('transform', event.transform.toString());
      }).transform, zoomIdentity);
  }, [frame.year]);

  return (
    <div ref={containerRef} className="map-canvas">
      <svg ref={svgRef} data-testid="world-map" role="img" aria-label={`${frame.year} 年世界领土归属`}>
        <g className="map-zoom">
          <path className="ocean-sphere" d={path({ type: 'Sphere' } as never) ?? ''} />
          {countries.map((country) => {
            const owner = frame.ownership[country.name] ?? null;
            const isHighlight = highlightIds.includes(owner ?? '');
            return (
              <path
                key={country.id}
                className={`country ${owner ? 'owned' : 'unowned'} ${isHighlight ? 'highlight' : ''}`}
                d={path(country.geometry as never) ?? ''}
                data-country={country.name}
                data-owner={owner ?? ''}
                onClick={() => owner && onSelectPolity(owner, country.name)}
              >
                <title>{`${country.name}${owner ? ` · ${owner}` : ' · 无明确归属'}`}</title>
              </path>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: 添加地图样式**

在 `src/styles/theme.css` 末尾追加：

```css
.map-canvas { position: absolute; inset: 0; }
.map-canvas svg { width: 100%; height: 100%; display: block; cursor: grab; }
.ocean-sphere { fill: var(--ocean); stroke: #8d7a56; stroke-width: 1.4; }
.country { stroke: #57452f; stroke-width: .45; transition: fill .25s ease, opacity .25s ease; }
.country.owned { fill: #b6a27a; opacity: .88; }
.country.unowned { fill: #cfc2a4; stroke-dasharray: 2 1.5; opacity: .72; }
.country:hover { opacity: 1; stroke-width: .9; }
.country.highlight { fill: var(--accent); stroke: #6f2a1f; stroke-width: .8; }
```

- [ ] **Step 5: 运行测试**

Run: `npm test`
Expected: 地图测试通过。

- [ ] **Step 6: 提交**

```bash
git add src/lib/mapRenderer.ts src/components/WorldMap.tsx src/styles/theme.css tests/app.test.tsx
git commit -m "feat: render parchment world map with attribution colors"
```

## Task 8: 应用状态、筛选与持久化

**Files:**
- Create: `src/state/appReducer.ts`
- Create: `src/lib/filter.ts`
- Create: `src/lib/storage.ts`
- Test: `tests/appReducer.test.ts`

- [ ] **Step 1: 写 reducer 测试**

`tests/appReducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { appReducer, initialAppState } from '../src/state/appReducer';
import { slices } from '../src/data/slices';

describe('appReducer', () => {
  it('selects first slice of a chapter', () => {
    const next = appReducer(initialAppState, { type: 'SELECT_CHAPTER', chapterId: 'c2' });
    const firstSlice = slices.find((s) => s.chapterId === 'c2')!;
    expect(next.chapterId).toBe('c2');
    expect(next.sliceId).toBe(firstSlice.id);
  });

  it('toggles play', () => {
    const next = appReducer(initialAppState, { type: 'TOGGLE_PLAY' });
    expect(next.playing).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/appReducer.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 创建 reducer**

`src/state/appReducer.ts`:

```ts
import type { EventCategory, Region } from '../types';
import { chapters } from '../data/chapters';
import { slices } from '../data/slices';

export type CategoryFilter = EventCategory | 'all';

export interface AppState {
  chapterId: string;
  sliceId: string;
  playing: boolean;
  category: CategoryFilter;
  region: Region | 'all';
  search: string;
  selectedPolityId: string | null;
  selectedEventId: string | null;
  drawerOpen: boolean;
}

export type AppAction =
  | { type: 'SELECT_CHAPTER'; chapterId: string }
  | { type: 'SELECT_SLICE'; sliceId: string }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_CATEGORY'; category: CategoryFilter }
  | { type: 'SET_REGION'; region: Region | 'all' }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'SELECT_POLITY'; polityId: string }
  | { type: 'SELECT_EVENT'; eventId: string }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'RESTORE'; state: Partial<AppState> };

export const initialAppState: AppState = {
  chapterId: chapters[0].id,
  sliceId: chapters[0].sliceIds[0],
  playing: false,
  category: 'all',
  region: 'all',
  search: '',
  selectedPolityId: null,
  selectedEventId: null,
  drawerOpen: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_CHAPTER': {
      const chapter = chapters.find((c) => c.id === action.chapterId) ?? chapters[0];
      return { ...state, chapterId: chapter.id, sliceId: chapter.sliceIds[0], playing: false, selectedEventId: null };
    }
    case 'SELECT_SLICE':
      return { ...state, sliceId: action.sliceId, playing: false, selectedEventId: null };
    case 'TOGGLE_PLAY':
      return { ...state, playing: !state.playing };
    case 'SET_CATEGORY':
      return { ...state, category: action.category };
    case 'SET_REGION':
      return { ...state, region: action.region };
    case 'SET_SEARCH':
      return { ...state, search: action.search };
    case 'SELECT_POLITY':
      return { ...state, selectedPolityId: action.polityId, selectedEventId: null, drawerOpen: true };
    case 'SELECT_EVENT':
      return { ...state, selectedEventId: action.eventId, selectedPolityId: null, drawerOpen: true };
    case 'CLOSE_DRAWER':
      return { ...state, drawerOpen: false, selectedPolityId: null, selectedEventId: null };
    case 'RESTORE':
      return {
        ...state,
        chapterId: action.state.chapterId ?? state.chapterId,
        sliceId: action.state.sliceId ?? state.sliceId,
        category: action.state.category ?? state.category,
        region: action.state.region ?? state.region,
      };
    default:
      return state;
  }
}

export function chapterSlices(chapterId: string) {
  return slices.filter((s) => s.chapterId === chapterId);
}
```

- [ ] **Step 4: 创建筛选模块**

`src/lib/filter.ts`:

```ts
import type { Region, WorldEvent } from '../types';
import type { CategoryFilter } from '../state/appReducer';

export function filterEvents(
  events: WorldEvent[],
  category: CategoryFilter,
  region: Region | 'all',
  search: string,
): WorldEvent[] {
  const query = search.trim().toLowerCase();
  return events.filter((event) => {
    if (category !== 'all' && event.category !== category) return false;
    if (region !== 'all' && !event.regions.includes(region)) return false;
    if (!query) return true;
    return [event.title, event.summary, event.id].join(' ').toLowerCase().includes(query);
  });
}
```

- [ ] **Step 5: 创建持久化模块**

`src/lib/storage.ts`:

```ts
import type { AppState } from '../state/appReducer';

const KEY = 'world-history-map:v1';

export function saveState(state: Pick<AppState, 'chapterId' | 'sliceId' | 'category' | 'region'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 无痕模式或存储不可用时忽略
  }
}

export function loadState(): Partial<Pick<AppState, 'chapterId' | 'sliceId' | 'category' | 'region'>> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
```

- [ ] **Step 6: 运行测试**

Run: `npm test`
Expected: reducer 测试通过。

- [ ] **Step 7: 提交**

```bash
git add src/state/appReducer.ts src/lib/filter.ts src/lib/storage.ts tests/appReducer.test.ts
git commit -m "feat: add app state, filters, and local persistence"
```

## Task 9: 界面组件

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/ChapterRail.tsx`
- Create: `src/components/TimeScrubber.tsx`
- Create: `src/components/EventCards.tsx`
- Create: `src/components/InfoDrawer.tsx`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: 创建 TopBar**

`src/components/TopBar.tsx`:

```tsx
const CATEGORY_LABELS: Record<string, string> = {
  all: '全部',
  war: '战争',
  treaty: '条约/体系',
  revolution: '革命/政变',
  colonization: '殖民/去殖民化',
  economy: '经济/科技',
  tech: '经济/科技',
  culture: '文化/思想',
  organization: '国际组织',
};

interface TopBarProps {
  year: number;
  chapterTitle: string;
  search: string;
  filter: string;
  region: string;
  onSearch: (value: string) => void;
  onFilter: (category: string) => void;
  onRegion: (region: string) => void;
  onOpenAbout: () => void;
}

export default function TopBar({ year, chapterTitle, search, filter, region, onSearch, onFilter, onRegion, onOpenAbout }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <h1>世界格局变化</h1>
        <span className="chapter-title">{chapterTitle}</span>
      </div>
      <label className="search-field">
        <span className="sr-only">搜索事件与国家</span>
        <input
          type="search"
          value={search}
          placeholder="搜索事件与国家"
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      <div className="filter-chips" role="group" aria-label="主题筛选">
        {Object.keys(CATEGORY_LABELS).map((key) => (
          <button
            type="button"
            key={key}
            className={`filter-chip ${key === filter ? 'active' : ''}`}
            onClick={() => onFilter(key)}
          >
            {CATEGORY_LABELS[key]}
          </button>
        ))}
      </div>
      <label className="region-field">
        <span className="sr-only">区域筛选</span>
        <select value={region} onChange={(event) => onRegion(event.target.value)}>
          <option value="all">全部地区</option>
          <option value="东亚">东亚</option>
          <option value="东南亚">东南亚</option>
          <option value="南亚">南亚</option>
          <option value="西亚">西亚</option>
          <option value="中亚">中亚</option>
          <option value="欧洲">欧洲</option>
          <option value="北非">北非</option>
          <option value="撒哈拉以南非洲">撒哈拉以南非洲</option>
          <option value="北美">北美</option>
          <option value="拉美">拉美</option>
          <option value="大洋洲">大洋洲</option>
          <option value="全球">全球</option>
        </select>
      </label>
      <button type="button" className="about-button" onClick={onOpenAbout}>说明</button>
      <span className="year-badge">{year}</span>
    </header>
  );
}
```

- [ ] **Step 2: 创建 ChapterRail**

`src/components/ChapterRail.tsx`:

```tsx
import type { Chapter, EraSlice } from '../types';

interface ChapterRailProps {
  chapters: Chapter[];
  activeChapterId: string;
  activeSliceId: string;
  slicesByChapter: (chapterId: string) => EraSlice[];
  onSelectChapter: (chapterId: string) => void;
  onSelectSlice: (sliceId: string) => void;
}

export default function ChapterRail({
  chapters,
  activeChapterId,
  activeSliceId,
  slicesByChapter,
  onSelectChapter,
  onSelectSlice,
}: ChapterRailProps) {
  return (
    <nav className="chapter-rail" aria-label="历史章节">
      {chapters.map((chapter) => {
        const active = chapter.id === activeChapterId;
        return (
          <div key={chapter.id} className={`chapter-item ${active ? 'active' : ''}`}>
            <button
              type="button"
              className="chapter-button"
              onClick={() => onSelectChapter(chapter.id)}
              aria-expanded={active}
            >
              <span className="chapter-year">{chapter.startYear}</span>
              <span className="chapter-name">{chapter.title}</span>
            </button>
            {active && (
              <div className="slice-list">
                {slicesByChapter(chapter.id).map((slice) => (
                  <button
                    type="button"
                    key={slice.id}
                    className={`slice-button ${slice.id === activeSliceId ? 'active' : ''}`}
                    onClick={() => onSelectSlice(slice.id)}
                  >
                    {slice.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: 创建 TimeScrubber**

`src/components/TimeScrubber.tsx`:

```tsx
import type { EraSlice } from '../types';

interface TimeScrubberProps {
  slices: EraSlice[];
  activeSliceId: string;
  playing: boolean;
  onSelectSlice: (sliceId: string) => void;
  onTogglePlay: () => void;
}

export default function TimeScrubber({ slices, activeSliceId, playing, onSelectSlice, onTogglePlay }: TimeScrubberProps) {
  const index = Math.max(0, slices.findIndex((slice) => slice.id === activeSliceId));
  return (
    <div className="time-scrubber">
      <button type="button" className="play-button" onClick={onTogglePlay} aria-label={playing ? '暂停' : '播放'}>
        {playing ? '暂停' : '播放'}
      </button>
      <input
        type="range"
        min={0}
        max={slices.length - 1}
        value={index}
        aria-label="年代切片"
        onChange={(event) => onSelectSlice(slices[Number(event.target.value)]?.id ?? activeSliceId)}
      />
      <span className="scrubber-year">{slices[index]?.year ?? ''}</span>
    </div>
  );
}
```

- [ ] **Step 4: 创建 EventCards**

`src/components/EventCards.tsx`:

```tsx
import type { WorldEvent } from '../types';

const categoryLabel: Record<WorldEvent['category'], string> = {
  war: '战争',
  treaty: '条约/体系',
  revolution: '革命/政变',
  colonization: '殖民/去殖民化',
  economy: '经济/科技',
  tech: '经济/科技',
  culture: '文化/思想',
  organization: '国际组织',
};

interface EventCardsProps {
  events: WorldEvent[];
  onSelectEvent: (eventId: string) => void;
}

export default function EventCards({ events, onSelectEvent }: EventCardsProps) {
  if (events.length === 0) {
    return <p className="empty-events">没有符合筛选的事件</p>;
  }
  return (
    <div className="event-cards" aria-label="本时代事件">
      {events.slice(0, 6).map((event) => (
        <button type="button" key={event.id} className="event-card" onClick={() => onSelectEvent(event.id)}>
          <span className="event-year">{event.year}</span>
          <span className="event-body">
            <strong>{event.title}</strong>
            <span className="event-category">{categoryLabel[event.category]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: 创建 InfoDrawer**

`src/components/InfoDrawer.tsx`:

```tsx
import { useEffect } from 'react';
import type { Polity, WorldEvent } from '../types';

interface InfoDrawerProps {
  open: boolean;
  polity: Polity | null;
  event: WorldEvent | null;
  onClose: () => void;
}

export default function InfoDrawer({ open, polity, event, onClose }: InfoDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const title = event?.title ?? polity?.nameZh ?? '';
  const summary = event?.summary ?? polity?.summary ?? '';
  return (
    <aside className="info-drawer" role="dialog" aria-label="详情">
      <button type="button" className="drawer-close" onClick={onClose} aria-label="关闭">×</button>
      <h2 tabIndex={0}>{title}</h2>
      {polity?.nameEn && <p className="drawer-sub">{polity.nameEn} · {polity.type}</p>}
      {event && <p className="drawer-sub">{event.year} · {event.regions.join(' / ')}</p>}
      <p className="drawer-summary">{summary}</p>
    </aside>
  );
}
```

- [ ] **Step 6: 添加组件样式**

`src/styles/theme.css` 追加：

```css
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.brand-block { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
.chapter-title { font-size: 13px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.search-field input { border: 1px solid var(--ink-soft); background: rgba(255,251,235,.7); color: var(--ink); padding: 6px 10px; border-radius: 4px; min-width: 180px; }
.about-button, .play-button, .drawer-close { border: 1px solid var(--ink-soft); background: var(--paper-deep); color: var(--ink); padding: 6px 10px; border-radius: 4px; cursor: pointer; }
.year-badge { font-size: 22px; font-weight: 700; color: var(--gold); min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; }
.chapter-rail { position: absolute; left: 14px; top: 14px; bottom: 14px; width: 218px; overflow-y: auto; background: rgba(240,228,199,.92); border: 1px solid var(--ink-soft); border-radius: 6px; padding: 10px; z-index: 4; }
.chapter-item { margin-bottom: 4px; }
.chapter-button { display: flex; width: 100%; gap: 8px; padding: 8px 9px; border: 0; background: transparent; color: var(--ink); cursor: pointer; text-align: left; font-size: 13px; }
.chapter-item.active .chapter-button { background: rgba(57,95,120,.16); border-left: 3px solid var(--accent-2); }
.chapter-year { color: var(--accent-2); font-weight: 700; min-width: 34px; }
.slice-list { display: flex; flex-direction: column; gap: 2px; padding-left: 42px; }
.slice-button { border: 0; background: transparent; color: var(--ink-soft); cursor: pointer; font-size: 12px; padding: 4px 6px; text-align: left; }
.slice-button.active { color: var(--accent); font-weight: 700; }
.time-scrubber { position: absolute; left: 250px; right: 18px; bottom: 16px; display: flex; align-items: center; gap: 12px; background: rgba(240,228,199,.94); border: 1px solid var(--ink-soft); border-radius: 6px; padding: 10px 14px; z-index: 4; }
.scrubber-year { min-width: 54px; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
.event-cards { position: absolute; left: 250px; right: 18px; bottom: 76px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; z-index: 3; }
.event-card { display: flex; gap: 8px; border: 1px solid var(--ink-soft); background: rgba(248,238,214,.9); color: var(--ink); border-radius: 6px; padding: 8px 10px; cursor: pointer; text-align: left; min-height: 56px; }
.event-year { color: var(--accent); font-weight: 700; font-variant-numeric: tabular-nums; }
.event-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.event-category { font-size: 11px; color: var(--ink-soft); }
.empty-events { position: absolute; left: 250px; right: 18px; bottom: 76px; z-index: 3; background: rgba(240,228,199,.9); padding: 10px; border-radius: 6px; }
.info-drawer { position: absolute; top: 14px; right: 14px; bottom: 14px; width: min(330px, 34vw); background: rgba(250,242,220,.97); border: 1px solid var(--ink-soft); border-radius: 6px; padding: 18px; box-shadow: 0 6px 24px rgba(60,40,20,.22); z-index: 6; overflow-y: auto; }
.info-drawer h2 { margin-top: 0; }
.drawer-sub { color: var(--ink-soft); font-size: 13px; }
.drawer-summary { line-height: 1.7; }
```

- [ ] **Step 7: 运行测试**

Run: `npm test`
Expected: 现有测试全部通过。

- [ ] **Step 8: 提交**

```bash
git add src/components src/styles/theme.css
git commit -m "feat: add chapter rail, timeline, event cards, and info drawer"
```

## Task 10: App 集成、播放与筛选

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/theme.css`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: 扩展应用测试**

`tests/app.test.tsx` 顶部 import 增加：

```tsx
import userEvent from '@testing-library/user-event';
```

并将测试改为：

```tsx
it('switches chapters and shows a new slice', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /1500 征服与全球连接/ }));
  expect(screen.getByRole('heading', { name: /世界格局变化/ })).toBeInTheDocument();
  expect(screen.getByText(/全球帝国初现/)).toBeInTheDocument();
});
```

如果 `@testing-library/user-event` 未安装，先加入 devDependencies：

```json
"@testing-library/user-event": "^14.5.2"
```

运行 `npm install`。

- [ ] **Step 2: 重写 App 组件**

`src/App.tsx`:

```tsx
import { useEffect, useMemo, useReducer, useState } from 'react';
import { chapters } from './data/chapters';
import { slices } from './data/slices';
import { events } from './data/events';
import { polities } from './data/polities';
import { polityRules } from './data/polityRules';
import { loadCountries } from './lib/world';
import { buildAttributionFrame } from './lib/attribution';
import { filterEvents } from './lib/filter';
import { saveState, loadState } from './lib/storage';
import { appReducer, chapterSlices, initialAppState } from './state/appReducer';
import TopBar from './components/TopBar';
import ChapterRail from './components/ChapterRail';
import TimeScrubber from './components/TimeScrubber';
import EventCards from './components/EventCards';
import InfoDrawer from './components/InfoDrawer';
import WorldMap from './components/WorldMap';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState, (initial) => ({
    ...initial,
    ...loadState(),
  }));
  const [aboutOpen, setAboutOpen] = useState(false);

  const chapter = chapters.find((c) => c.id === state.chapterId) ?? chapters[0];
  const chapterSlicesList = useMemo(() => chapterSlices(chapter.id), [chapter.id]);
  const slice = chapterSlicesList.find((s) => s.id === state.sliceId) ?? chapterSlicesList[0];
  const countryNames = useMemo(() => loadCountries().map((country) => country.name), []);
  const frame = useMemo(
    () => buildAttributionFrame(slice.year, polityRules, countryNames),
    [slice.year, countryNames, polityRules],
  );
  const visibleEvents = useMemo(
    () => filterEvents(events, state.category, state.region, state.search).filter((e) => e.chapterId === chapter.id),
    [events, state.category, state.region, state.search, chapter.id],
  );
  const featuredEvents = useMemo(
    () =>
      events.filter(
        (event) => slice.featuredEventIds.includes(event.id) || (event.featured && event.chapterId === chapter.id),
      ).slice(0, 6),
    [slice, chapter, events],
  );
  const selectedEvent = events.find((e) => e.id === state.selectedEventId) ?? null;
  const selectedPolity = polities.find((p) => p.id === state.selectedPolityId) ?? null;

  useEffect(() => {
    saveState({ chapterId: state.chapterId, sliceId: state.sliceId, category: state.category, region: state.region });
  }, [state.chapterId, state.sliceId, state.category, state.region]);

  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setInterval(() => {
      const index = chapterSlicesList.findIndex((s) => s.id === slice.id);
      const next = chapterSlicesList[index + 1];
      if (next) {
        dispatch({ type: 'SELECT_SLICE', sliceId: next.id });
      } else {
        dispatch({ type: 'TOGGLE_PLAY' });
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [state.playing, chapterSlicesList, slice.id]);

  const highlightIds =
    state.selectedEventId
      ? selectedEvent?.polityIds
      : state.selectedPolityId
        ? [state.selectedPolityId]
        : [];

  return (
    <main className="app-shell">
      <TopBar
        year={slice.year}
        chapterTitle={`${chapter.title} · ${slice.label}`}
        search={state.search}
        filter={state.category}
        region={state.region}
        onSearch={(search) => dispatch({ type: 'SET_SEARCH', search })}
        onFilter={(category) => dispatch({ type: 'SET_CATEGORY', category: category as typeof state.category })}
        onRegion={(region) => dispatch({ type: 'SET_REGION', region: region as typeof state.region })}
        onOpenAbout={() => setAboutOpen(true)}
      />
      <section className="map-stage">
        <WorldMap
          frame={frame}
          highlightIds={highlightIds ?? []}
          onSelectPolity={(polityId) => dispatch({ type: 'SELECT_POLITY', polityId })}
        />
        <ChapterRail
          chapters={chapters}
          activeChapterId={chapter.id}
          activeSliceId={slice.id}
          slicesByChapter={chapterSlices}
          onSelectChapter={(chapterId) => dispatch({ type: 'SELECT_CHAPTER', chapterId })}
          onSelectSlice={(sliceId) => dispatch({ type: 'SELECT_SLICE', sliceId })}
        />
        <TimeScrubber
          slices={chapterSlicesList}
          activeSliceId={slice.id}
          playing={state.playing}
          onSelectSlice={(sliceId) => dispatch({ type: 'SELECT_SLICE', sliceId })}
          onTogglePlay={() => dispatch({ type: 'TOGGLE_PLAY' })}
        />
        <EventCards events={state.search || state.category !== 'all' || state.region !== 'all' ? visibleEvents : featuredEvents} onSelectEvent={(eventId) => dispatch({ type: 'SELECT_EVENT', eventId })} />
        <InfoDrawer
          open={state.drawerOpen}
          polity={selectedPolity}
          event={selectedEvent}
          onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
        />
        {aboutOpen && (
          <div className="about-overlay" role="dialog" aria-label="说明">
            <div className="about-panel">
              <button type="button" className="drawer-close" onClick={() => setAboutOpen(false)}>×</button>
              <h2>数据与边界说明</h2>
              <p>地图使用现代世界底图按历史控制者着色，主要帝国边界以近似覆盖表达；争议地带采用中性描述，具体来源与精度在数据文件中标记。</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: 传递筛选状态与添加样式**

`TopBar` 已在 Task 9 内含筛选控件；在 `App.tsx` 中传给 `TopBar`：

```tsx
filter={state.category}
onFilter={(category) => dispatch({ type: 'SET_CATEGORY', category: category as typeof state.category })}
```

`src/styles/theme.css` 追加：

```css
.filter-chips { display: flex; gap: 6px; overflow-x: auto; max-width: 46vw; }
.filter-chip { flex: none; border: 1px solid var(--ink-soft); background: var(--paper-deep); color: var(--ink); border-radius: 4px; padding: 5px 9px; font-size: 12px; cursor: pointer; }
.filter-chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.region-field select { border: 1px solid var(--ink-soft); background: rgba(255,251,235,.7); color: var(--ink); padding: 5px 8px; border-radius: 4px; font-size: 12px; }
.about-overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(70,53,34,.45); z-index: 10; }
.about-panel { width: min(620px, 90vw); max-height: 80vh; overflow-y: auto; background: var(--paper); border: 1px solid var(--ink-soft); border-radius: 8px; padding: 24px; }
```

- [ ] **Step 4: 运行测试与构建**

Run: `npm test`
Expected: 所有测试通过。

Run: `npm run build`
Expected: TypeScript 与 Vite 构建成功。

- [ ] **Step 5: 提交**

```bash
git add src/App.tsx src/components/TopBar.tsx src/styles/theme.css tests/app.test.tsx package.json package-lock.json
git commit -m "feat: wire app with timeline playback, filters, and details"
```

## Task 11: 响应式、无障碍与说明页完善

**Files:**
- Modify: `src/styles/theme.css`
- Modify: `src/components/InfoDrawer.tsx`

- [ ] **Step 1: 添加响应式规则**

`src/styles/theme.css` 末尾追加：

```css
@media (max-width: 1180px) {
  .chapter-rail { width: 176px; }
  .time-scrubber, .event-cards, .empty-events { left: 200px; }
  .info-drawer { width: min(300px, 42vw); }
}
@media (max-width: 760px) {
  .app-shell { height: auto; min-height: 100vh; }
  .topbar { flex-wrap: wrap; gap: 8px; }
  .filter-chips { max-width: 100%; order: 5; }
  .chapter-rail { position: static; width: 100%; max-height: 190px; border-radius: 0; border-left: 0; border-right: 0; }
  .map-stage { height: 58vh; min-height: 420px; }
  .time-scrubber, .event-cards, .empty-events { left: 10px; right: 10px; }
  .time-scrubber { bottom: 10px; }
  .event-cards { bottom: 68px; grid-template-columns: 1fr; }
  .info-drawer { position: fixed; inset: 0; width: 100%; height: 100%; border-radius: 0; }
  .year-badge { min-width: 52px; }
}
@media (max-width: 480px) {
  .search-field input { min-width: 120px; }
  .chapter-title { max-width: 120px; }
}
```

- [ ] **Step 2: 为信息抽屉与说明增加键盘关闭**

确认 `src/components/InfoDrawer.tsx` 已包含 Task 9 的 `useEffect` 与 `h2 tabIndex={0}`；如实现时被合并覆盖，恢复为 Task 9 的代码。

- [ ] **Step 3: 运行测试与构建**

Run: `npm test && npm run build`
Expected: 全部通过。

- [ ] **Step 4: 提交**

```bash
git add src/styles/theme.css src/components/InfoDrawer.tsx
git commit -m "feat: add responsive layout and keyboard accessibility"
```

## Task 12: 构建校验、端到端测试与 README

**Files:**
- Create: `scripts/validate-data.ts`
- Create: `playwright.config.ts`
- Create: `tests/e2e.spec.ts`
- Create: `README.md`
- Modify: `package.json`

- [ ] **Step 1: 创建构建校验脚本**

`scripts/validate-data.ts`:

```ts
import { chapters } from '../src/data/chapters';
import { slices } from '../src/data/slices';
import { events } from '../src/data/events';
import { validateWorldData } from '../src/lib/validate';

const errors = validateWorldData(chapters, slices, events);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`OK: ${chapters.length} chapters, ${slices.length} slices, ${events.length} events`);
```

修改 `package.json` 的 `scripts`：

```json
"build": "npm run validate && tsc -b && vite build"
```

- [ ] **Step 2: 创建 Playwright 配置**

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/e2e.spec.ts',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
});
```

`tests/e2e.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('map renders and chapters switch', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('world-map')).toBeVisible();
  await page.getByRole('button', { name: /1500 征服与全球连接/ }).click();
  await expect(page.getByText(/全球帝国初现/)).toBeVisible();
  await expect(page.getByTestId('world-map')).not.toBeEmpty();
});
```

- [ ] **Step 3: 创建 README**

`README.md`:

```md
# 世界格局变化 1300–2026

本地可运行的交互历史地图。使用 `npm run dev` 启动，`npm run build` 构建离线静态版本。

数据位于 `src/data/`，包括章节、年代切片、事件、国家档案与领土归属规则；运行前由校验脚本检查一致性。

边界说明：地图基于现代国家轮廓按历史控制者着色，主要帝国边界以近似覆盖表达，争议地带保持中性描述。
```

- [ ] **Step 4: 安装 Playwright 浏览器并运行端到端测试**

Run: `npx playwright install chromium`
Expected: 安装 Chromium 成功（需要网络）。

Run: `npm run e2e`
Expected: 地图加载与章节切换通过。

- [ ] **Step 5: 完整验收**

Run: `npm run validate && npm test && npm run build`
Expected: 三个命令全部成功。

- [ ] **Step 6: 提交**

```bash
git add scripts/validate-data.ts playwright.config.ts tests/e2e.spec.ts README.md package.json package-lock.json
git commit -m "test: add data validation, e2e smoke test, and readme"
```

## 自查结果

- 规格覆盖：章节、切片、事件、国家档案、归属规则、地图、时间轴、播放、筛选、搜索、抽屉、说明、响应式、测试、构建均分配到任务。
- 无占位符：所有数据与代码均写在本计划内。
- 类型一致性：`WorldEvent`、`EraSlice.chapterId`、`PolityRule.countryNames`、`AppState` 在各任务间保持一致。
