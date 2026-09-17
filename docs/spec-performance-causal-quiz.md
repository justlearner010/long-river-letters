# 世界格局变化交互地图：性能优化 + 因果链/测验模式 技术规格

## 目标

1. 让动画和事件播放达到 60fps 丝滑体验。
2. 引入“因果链视图”和“预测测验模式”，把被动观看变成主动学习。

---

## 一、性能优化

### 1.1 当前问题诊断

- React 状态每次切事件都会触发整棵地图组件树重渲染。
- 国家高亮通过 JS 重新计算 fill/stroke，导致大量 SVG 属性更新。
- migration flow 虚线动画由 React key/interval 驱动，切换事件时重启/抖动。
- 播放间隔 2000ms 与 React render 强耦合，容易出现掉帧。

### 1.2 改动方案

#### A. 国家多边形渲染优化

- 用 `React.memo` 包裹 `MapCountry` 组件，props 只有 `countryId`、`isHighlighted`、`isDimmed`、`path`。
- 高亮状态通过 CSS class 切换（`.highlighted` / `.dimmed`），利用 CSS `transition: fill 300ms ease, stroke 300ms ease` 完成补间。
- 颜色仍由 `polityRules` 计算，但只在初始化或规则变化时计算一次，避免每次事件重算。

#### B. Flow 线条动画优化

- 将虚线流动从 JS 定时器改为 SVG `<animate>` 或 CSS `@keyframes dash`。
- 事件切换时只改变 `opacity` 和 `stroke-width`，不销毁路径元素，避免动画重启。
- 全局 connection 线和 migration flow 统一为 `MapLinkLayer`，只接收当前 activeLinkIds / activeFlowIds，内部 diff 最小更新。

#### C. 播放引擎重构

- 新增 `PlaybackScheduler`（基于 `requestAnimationFrame` 或单调时钟），统一控制时间推进。
- 调度器只向 reducer 发送“该切到下一个事件/切片了”，不直接参与渲染。
- 支持可调播放速度：0.5x / 1x / 2x / 4x。
- 章节切换时再做地图 zoom 重置；事件内部切换只更新高亮和面板，保持视图稳定。

#### D. 侧边栏虚拟化（可选，视事件量而定）

- 当前 126 个事件，普通渲染尚可；若未来扩展到 300+，引入 `react-window` 或简单分页。
- 本次先实现固定高度容器 + `overflow-y: auto`，确保长列表不撑破布局。

### 1.3 文件变更

- `src/components/WorldMap.tsx`：拆分 `MapCountry`、`MapLinkLayer`，使用 CSS 过渡。
- `src/components/MapCountry.tsx`：新增 memoized 国家多边形组件。
- `src/hooks/usePlaybackScheduler.ts`：新增 RAF 播放调度 hook。
- `src/state/appReducer.ts`：新增 `playbackSpeed`、`SYNC_FRAME` 支持。
- `src/index.css`：新增 `.map-country`、`.flow-line`、`.connection-line` 动画样式。
- `tests/perf.test.ts`：新增测试——切换事件时地图重渲染次数 ≤ N。

### 1.4 验收标准

- Chrome DevTools Performance：事件连续播放时 main thread 长时间任务 < 50ms。
- 地图高亮切换无明显闪烁；flow 虚线连续滚动不中断。
- 播放速度 2x 下仍能稳定推进，不丢事件。

---

## 二、因果链与测验模式

### 2.1 设计原则

- 历史不是孤立事件的罗列，而是因果网络。
- 用户先预测，再揭晓，记忆和理解更深刻。
- 每个事件都可以追问“它导致了什么？”和“它被什么导致？”。

### 2.2 数据结构

新增 `src/data/causalLinks.ts`：

```ts
export interface CausalLink {
  fromEventId: string;   // 原因事件
  toEventId: string;     // 结果事件
  relation: 'direct' | 'enables' | 'contributes' | 'trigger';
  description: string;   // 一句话解释因果，例如“白银流入使中国物价上涨，削弱明朝财政”
}

export const causalLinks: CausalLink[] = [
  {
    fromEventId: 'columbian-exchange',
    toEventId: 'silver-inflation-ming',
    relation: 'contributes',
    description: '美洲白银通过马尼拉帆船大量流入中国，推高物价，加剧明朝财政危机。'
  },
  // ...
];
```

新增 `src/data/quizPrompts.ts`：

```ts
export interface QuizPrompt {
  eventId: string;       // 触发测验的事件
  question: string;      // 预测问题
  options: string[];     // 3-4 个选项
  correctIndex: number;  // 正确答案索引
  explanation: string;   // 揭晓后解释
}
```

### 2.3 因果链视图

- 新增视图模式切换按钮：地图 / 因果链。
- 因果链视图使用 `reactflow` 或自研 SVG 力导向图，节点=事件，边=因果关系。
- 节点按时间从左到右排列，同一时期事件纵向分布。
- 点击节点跳回地图视图对应时刻，并打开详情。
- 支持按章节/主题筛选子图。

### 2.4 测验模式

- 在设置或播放面板开启“预测模式”。
- 播放时，在事件结果出现前 1 个事件暂停，弹出测验卡片。
- 用户选择答案后：
  - 正确：继续播放并显示绿色反馈 + 简短解释。
  - 错误：显示正确答案和解释，用户点击“继续”。
- 测验卡片只覆盖右下角或底部，不遮挡地图主体。
- 记录本轮得分（答对/总题数），结束时显示总结。

### 2.5 与现有功能的结合

- 事件详情面板新增“前因”和“后果”两个标签/列表，直接关联因果链。
- 地图上的 global connection 线可与因果链重叠：因果链是抽象关系，地图线是地理关系。
- 播放模式下，因果链视图仍可高亮当前事件节点及其直接因果邻居。

### 2.6 文件变更

- `src/data/causalLinks.ts`：新增因果关系数据（先覆盖 15-20 条核心因果）。
- `src/data/quizPrompts.ts`：新增测验题目（先覆盖 10-15 个关键转折点）。
- `src/lib/enrichEvents.ts`：合并因果上下游到事件对象。
- `src/components/CausalGraph.tsx`：新增因果链可视化组件。
- `src/components/QuizCard.tsx`：新增测验卡片组件。
- `src/components/ViewToggle.tsx`：新增地图/因果链切换控件。
- `src/state/appReducer.ts`：新增 `viewMode: 'map' | 'causal'`、`quizState`。
- `tests/causal.test.ts`：测试因果图无环、每个 link 指向真实事件等。

### 2.7 验收标准

- 至少 15 条跨洲/跨时代的核心因果关系可展示。
- 因果图无环、无孤立节点。
- 测验模式能正常暂停、评分、揭晓解释。
- 因果视图与地图视图双向跳转可用。

---

## 三、开发顺序

1. **性能优化先做**：它是体验基础，也能让后续因果链视图更流畅。
2. **因果链数据 + 视图**：建立抽象关系层。
3. **测验模式接入播放流**：在前两步完成后实现最自然。

---

## 四、风险与假设

- 历史因果关系存在学术争议；本实现采用“主流简明解释”，并在 UI 中标注为“一种理解视角”。
- 因果链布局算法若事件过多可能拥挤；初期只展示核心事件，支持筛选。
- 测验题目需要人工审核史实准确性，首批题目聚焦无争议的因果（如技术传播、战争触发）。

---

## 五、是否开始实施

请确认：
1. 上述范围是否 OK？
2. 因果链视图想用 `reactflow` 库还是自研 SVG？（自研更轻，reactflow 功能更全）
3. 测验模式是否默认关闭，只在设置中开启？
