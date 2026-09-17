import type { WorldEvent } from '../types';

export interface CausalLink {
  fromEventId: string;
  toEventId: string;
  relation: 'direct' | 'enables' | 'contributes' | 'trigger';
  description: string;
}

export const causalLinks: CausalLink[] = [
  { fromEventId: 'e113', toEventId: 'e121', relation: 'enables', description: '活字印刷降低书籍成本，使宗教改革思想得以迅速传播。' },
  { fromEventId: 'e117', toEventId: 'e119', relation: 'contributes', description: '西班牙在美洲的成功刺激葡萄牙加快在南美建立殖民地。' },
  { fromEventId: 'e117', toEventId: 'e122', relation: 'enables', description: '哥伦布首航证明跨洋航行可行，推动麦哲伦环球航行与更深入的美洲征服。' },
  { fromEventId: 'e122', toEventId: 'e124', relation: 'direct', description: '科尔特斯征服阿兹特克的模式被复制，皮萨罗以更少兵力瓦解印加帝国。' },
  { fromEventId: 'e121', toEventId: 'e131', relation: 'contributes', description: '宗教改革撕裂欧洲基督教世界，三十年战争成为教派与王朝冲突的总爆发。' },
  { fromEventId: 'e131', toEventId: 'e134', relation: 'direct', description: '三十年战争的惨烈消耗迫使各方接受主权国家并存的威斯特伐利亚原则。' },
  { fromEventId: 'e134', toEventId: 'e150', relation: 'contributes', description: '威斯特伐利亚确立的主权与均势思想，为维也纳协调体系提供法理基础。' },
  { fromEventId: 'e142', toEventId: 'e143', relation: 'direct', description: '七年战争以英普胜利告终，巴黎条约重新划分全球殖民地。' },
  { fromEventId: 'e143', toEventId: 'e144', relation: 'contributes', description: '英国为弥补战争开销向北美征税，激化殖民地独立诉求。' },
  { fromEventId: 'e146', toEventId: 'e147', relation: 'direct', description: '法国大革命推翻旧制度，督政府危机为拿破仑军事独裁铺平道路。' },
  { fromEventId: 'e147', toEventId: 'e149', relation: 'direct', description: '拿破仑称帝后推行大陆封锁并远征俄国，帝国由盛转衰。' },
  { fromEventId: 'e149', toEventId: 'e150', relation: 'direct', description: '拿破仑侵俄失败导致帝国崩溃，维也纳会议重建欧洲秩序。' },
  { fromEventId: 'e154', toEventId: 'e155', relation: 'contributes', description: '1848 年革命浪潮中工人运动与激进思想活跃，《共产党宣言》应运而生。' },
  { fromEventId: 'e156', toEventId: 'e158', relation: 'direct', description: '黑船来航打破锁国体制，幕府权威崩溃，明治政府上台推行改革。' },
  { fromEventId: 'e158', toEventId: 'e163', relation: 'contributes', description: '明治维新后日本迅速工业化，开始挑战清朝在东亚的宗主地位。' },
  { fromEventId: 'e163', toEventId: 'e166', relation: 'contributes', description: '日本击败清朝确立了亚洲强国地位，十年后又挑战俄国。' },
  { fromEventId: 'e178', toEventId: 'e184', relation: 'contributes', description: '凡尔赛条约对德国的严厉制裁与经济动荡，为纳粹上台创造条件。' },
  { fromEventId: 'e182', toEventId: 'e184', relation: 'contributes', description: '大萧条加剧社会绝望，分别推动德国转向纳粹与美国推行新政。' },
  { fromEventId: 'e187', toEventId: 'e188', relation: 'trigger', description: '慕尼黑协定鼓励希特勒进一步扩张，次年德国入侵波兰引爆二战。' },
  { fromEventId: 'e190', toEventId: 'e191', relation: 'direct', description: '巴巴罗萨与珍珠港把苏联和美国全面拖入战争，1942 年出现关键转折。' },
  { fromEventId: 'e194', toEventId: 'e197', relation: 'contributes', description: '雅尔塔划分势力范围，丘吉尔次年发表铁幕演说，冷战轮廓显现。' },
  { fromEventId: 'e197', toEventId: 'e201', relation: 'contributes', description: '冷战格局形成后，朝鲜半岛成为美苏代理冲突的前沿。' },
  { fromEventId: 'e198', toEventId: 'e199', relation: 'contributes', description: '马歇尔计划标志美国全面介入欧洲重建，同年柏林封锁与以色列建国相继发生。' },
  { fromEventId: 'e208', toEventId: 'e209', relation: 'direct', description: '东欧剧变与柏林墙倒塌瓦解苏联阵营，两年后苏联正式解体。' },
  { fromEventId: 'e209', toEventId: 'e213', relation: 'contributes', description: '冷战结束后的单极格局与中国入世，共同推动全球化进入新阶段。' },
  { fromEventId: 'e213', toEventId: 'e222', relation: 'contributes', description: '中国深度融入全球经济后，与美国的结构性竞争演变为贸易战。' },
  { fromEventId: 'e219', toEventId: 'e224', relation: 'contributes', description: '2014 年克里米亚危机后俄西关系持续恶化，2022 年俄乌战争全面爆发。' },
  { fromEventId: 'e222', toEventId: 'e226', relation: 'contributes', description: '中美竞争与多组区域力量崛起，使世界向多极格局演化。' },
];

export function buildCausalIndex(events: WorldEvent[], links: CausalLink[]) {
  const upstream = new Map<string, CausalLink[]>();
  const downstream = new Map<string, CausalLink[]>();
  const eventIds = new Set(events.map((e) => e.id));

  for (const event of events) {
    upstream.set(event.id, []);
    downstream.set(event.id, []);
  }

  for (const link of links) {
    if (!eventIds.has(link.fromEventId) || !eventIds.has(link.toEventId)) continue;
    downstream.get(link.fromEventId)!.push(link);
    upstream.get(link.toEventId)!.push(link);
  }

  return { upstream, downstream };
}
