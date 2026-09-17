export type FigureKind = 'historical' | 'archetypal';

export interface Figure {
  id: string;
  kind: FigureKind;
  name: string;
  nameEn?: string;
  eraLabel: string;
  anchorEventId: string;
  bio: string;
  grounding: string[];
  /** Path to a period artifact under public/models/. Only set when an existing model genuinely belongs to this persona. */
  objectSrc?: string;
  objectLabel?: string;
}

export const figures: Figure[] = [
  {
    id: 'fig-weltsch',
    kind: 'historical',
    name: '卡尔·冯·韦尔奇',
    nameEn: 'Karl von Weltsch',
    eraLabel: '奥匈帝国 · 第一次世界大战爆发',
    anchorEventId: 'e170',
    bio: '奥匈帝国军官，1914 年随军开赴塞尔维亚前线，其战时日记记录了一个普通军官如何被卷入一场谁也停不下来的战争。',
    grounding: [
      '《韦尔奇战时日记》1914—1916 年手稿，1916 年在维也纳出版',
      '1914 年 7 月奥匈对塞尔维亚的最后通牒与总动员令',
    ],
    objectSrc: '/models/gas-mask.glb',
    objectLabel: '民用防毒面具 · 战争第一次把毒气对准了不穿军装的人',
  },
  {
    id: 'fig-bartlett',
    kind: 'historical',
    name: '埃利斯·阿什米德-巴特利特',
    nameEn: 'Ellis Ashmead-Bartlett',
    eraLabel: '加里波利 · 协约国登陆战',
    anchorEventId: 'e171',
    bio: '英国战地记者，1915 年随协约国部队登陆加里波利，他揭露战地僵局的电讯被军事审查扣发。',
    grounding: [
      '阿什米德-巴特利特 1915 年加里波利战地电讯（被审查扣发，经基思·默多克携带出境后公开）',
      '英国达达尼尔委员会 1916 年调查报告',
    ],
  },
  {
    id: 'fig-barbusse',
    kind: 'historical',
    name: '亨利·巴比塞',
    nameEn: 'Henri Barbusse',
    eraLabel: '法国 · 凡尔登与索姆河时期',
    anchorEventId: 'e172',
    bio: '法国作家，1914 年志愿入伍，在战壕里写成《火线》，把一个士兵眼中被工业化了的战场留给后世。',
    grounding: [
      '《火线》（Le Feu，1916），取材于作者 1914—1916 年的西线步兵经历',
      '1916 年凡尔登与索姆河战役的伤亡统计与部队轮换记录',
    ],
  },
  {
    id: 'fig-trench-nco',
    kind: 'archetypal',
    name: '时代亲历者 · 西线的一名步兵班长',
    eraLabel: '西线 · 1916 年消耗战',
    anchorEventId: 'e172',
    bio: '据西线士兵书信与团史重构的一名班长，他每天点名时数到的人比昨天更少。',
    grounding: [
      '英法德三国 1916 年西线士兵书信与战地日记汇编',
      '1916 年凡尔登与索姆河战役的师团战史与伤亡清册',
      '同期战壕回忆录中关于连队日常与轮换的记录',
    ],
  },
  {
    id: 'fig-simonov',
    kind: 'historical',
    name: '康斯坦丁·西蒙诺夫',
    nameEn: 'Konstantin Simonov',
    eraLabel: '苏联 · 巴巴罗萨行动',
    anchorEventId: 'e190',
    bio: '苏联作家与战地记者，1941 年 7 月被派往西方面军，在撤退与动员交错的日子里写下前线报道。',
    grounding: [
      '西蒙诺夫 1941 年西方面军战地报道（《红星报》等）',
      '西蒙诺夫战时日记与小说《日日夜夜》的素材笔记',
      '苏联国防委员会 1941 年 6—7 月动员决议',
    ],
  },
  {
    id: 'fig-piazza',
    kind: 'historical',
    name: '米凯莱·达·皮亚扎',
    nameEn: 'Michele da Piazza',
    eraLabel: '西西里 · 黑死病初抵欧洲',
    anchorEventId: 'e103',
    bio: '方济各会修士与编年史家，1347 年 10 月记下了热那亚船队把瘟疫带进墨西拿港的那个月。',
    grounding: [
      '米凯莱·达·皮亚扎《编年史》（1347—1361），含墨西拿与巴勒莫的目击记述',
      '1347 年墨西拿港热那亚船队入港的港口记录',
    ],
  },
  {
    id: 'fig-florence-notary',
    kind: 'archetypal',
    name: '时代亲历者 · 佛罗伦萨的一名公证人',
    eraLabel: '佛罗伦萨 · 1348 年瘟疫',
    anchorEventId: 'e103',
    bio: '据佛罗伦萨档案重构的一名公证人，他的本职是登记遗嘱，而 1348 年的遗嘱多到必须增派人手。',
    grounding: [
      '佛罗伦萨 1348 年遗嘱登记簿（Archivio di Stato di Firenze）',
      '薄伽丘《十日谈》序言对 1348 年佛罗伦萨的记述',
      '1347—1351 年欧洲人口、地租与工资变化的地方档案研究',
    ],
  },
  {
    id: 'fig-wuhan-community',
    kind: 'archetypal',
    name: '时代亲历者 · 武汉的一名社区工作者',
    eraLabel: '武汉 · 2020 年新冠疫情',
    anchorEventId: 'e223',
    bio: '据 2020 年公开记录重构的一名社区工作者，她的工作是让不能出门的人每天还能拿到菜和药。',
    grounding: [
      '2020 年 1—4 月中国国务院新闻办新闻发布会记录',
      '世界卫生组织—中国联合考察报告（2020 年 2 月）',
      '2020 年 1—4 月公开媒体报道',
    ],
  },
  {
    id: 'fig-bergamo-journalist',
    kind: 'archetypal',
    name: '时代亲历者 · 贝加莫的一名地方记者',
    eraLabel: '伦巴第 · 2020 年新冠疫情',
    anchorEventId: 'e223',
    bio: '据地方公共卫生通报与同期报道重构的一名记者，他每天更新的数字从两位数变成了三位数。',
    grounding: [
      '2020 年 2—4 月意大利伦巴第大区公共卫生通报',
      '贝加莫地方媒体 2020 年 3—4 月的同期报道',
      '世界卫生组织 2020 年欧洲区域疫情周报',
    ],
  },
  {
    id: 'fig-amsterdam-merchant',
    kind: 'archetypal',
    name: '时代亲历者 · 阿姆斯特丹的一名香料商人',
    eraLabel: '荷兰 · 第一次英荷战争',
    anchorEventId: 'e135',
    bio: '据荷兰东印度公司档案重构的一名商人，他的账本上第一次出现了“被扣押”这一栏。',
    grounding: [
      '荷兰东印度公司（VOC）1650 年代账簿与船运清单',
      '1651 年英国《航海条例》原文',
      '第一次英荷战争（1652—1654）期间的海上捕获与扣押记录',
    ],
    objectSrc: '/models/brick-tea.glb',
    objectLabel: '茶砖 · 在茶马古道上，它本身就是钱',
  },
  {
    id: 'fig-hamburg-broker',
    kind: 'archetypal',
    name: '时代亲历者 · 易北河口的一名报关代理',
    eraLabel: '北德 · 大陆封锁时期',
    anchorEventId: 'e149',
    bio: '据关税档案重构的一名报关代理，他的本事是替货物找一条不经过拿破仑海关的路。',
    grounding: [
      '拿破仑大陆封锁（1806—1814）时期的关税与缉私档案',
      '1806 年柏林敕令与 1807 年米兰敕令原文',
      '1812 年远征俄国的军需补给文书',
    ],
  },
  {
    id: 'fig-berlin-loader',
    kind: 'archetypal',
    name: '时代亲历者 · 西柏林的一名机场装卸调度员',
    eraLabel: '西柏林 · 1948 年封锁',
    anchorEventId: 'e199',
    bio: '据空运档案重构的一名地面调度员，柏林被封锁的每一天，他都要在跑道上把当天的煤和面粉卸完。',
    grounding: [
      '1948—1949 年柏林空运飞行架次与货运量统计',
      '1948 年苏联封锁西柏林地面交通的通告与西方回应文件',
      '西柏林 1948—1949 年市政供应与配给记录',
    ],
  },
  {
    id: 'fig-prd-buyer',
    kind: 'archetypal',
    name: '时代亲历者 · 珠三角的一名电子元器件采购经理',
    eraLabel: '中国 · 中美贸易战时期',
    anchorEventId: 'e222',
    bio: '据公开关税清单与企业年报重构的一名采购经理，她的工作从比价变成了到处找替代料号。',
    grounding: [
      '美国贸易代表办公室 2018 年起对华加征关税清单',
      '2018—2023 年全球半导体与电子元器件贸易统计',
      '相关制造业上市公司年报中的供应链调整披露',
    ],
  },
  {
    id: 'fig-erasmus',
    kind: 'historical',
    name: '德西德里乌斯·伊拉斯谟',
    nameEn: 'Desiderius Erasmus',
    eraLabel: '尼德兰 · 活字印刷普及期',
    anchorEventId: 'e113',
    bio: '尼德兰人文主义者，他亲手把书稿交给印刷商，也在印刷术掀起的论战洪流里被反复误读。',
    grounding: [
      '伊拉斯谟 1516 年希腊文《新约》校勘本及其与印刷商的通信',
      '伊拉斯谟与马丁·路德 1524—1525 年的论战文字',
      '1450—1550 年欧洲印本书目与印坊产量统计',
    ],
    objectSrc: '/models/movable-type.glb',
    objectLabel: '金属活字 · 他就是把书稿交到这些字上的人',
  },
  {
    id: 'fig-nuremberg-compositor',
    kind: 'archetypal',
    name: '时代亲历者 · 纽伦堡印坊的一名排字工',
    eraLabel: '纽伦堡 · 16 世纪初的印坊',
    anchorEventId: 'e113',
    bio: '据印坊记录重构的一名排字工，他一天排出的字，比一个抄书人一年写下的还多。',
    grounding: [
      '16 世纪纽伦堡印坊（如科贝格印坊）的工场记录与书目',
      '1450—1550 年欧洲印本书数量统计',
      '印坊行会与排字工薪酬的市政档案',
    ],
    objectSrc: '/models/movable-type.glb',
    objectLabel: '金属活字 · 他一天排出来的字，比抄书人一年写的还多',
  },
  {
    id: 'fig-agc-programmer',
    kind: 'archetypal',
    name: '时代亲历者 · 阿波罗制导计算机的一名程序员',
    eraLabel: '美国 · 阿波罗计划',
    anchorEventId: 'e205',
    bio: '据项目档案重构的一名软件工程师，她和同事用手工编织的磁芯内存，写出了一台只有几十 KB 的飞行计算机。',
    grounding: [
      '麻省理工学院仪器实验室阿波罗制导计算机（AGC）程序档案',
      '1969 年阿波罗 11 号飞行记录与任务报告',
      '美国国家航空航天局 1961—1969 年太空竞赛相关公开文件',
    ],
  },
  {
    id: 'fig-houston-controller',
    kind: 'archetypal',
    name: '时代亲历者 · 休斯敦任务控制中心的一名飞行控制员',
    eraLabel: '美国 · 阿波罗 11 号登月',
    anchorEventId: 'e205',
    bio: '据任务控制中心值班记录重构的一名控制员，在着陆前最后几分钟，他手里只剩下一台计算机的报警灯和一条判断。',
    grounding: [
      '阿波罗 11 号任务控制中心（MCC）值班记录与通话记录',
      '1969 年 7 月阿波罗 11 号着陆阶段的机载计算机报警记录',
      '美国国家航空航天局阿波罗计划任务报告',
    ],
  },
  {
    id: 'fig-yiwu-seller',
    kind: 'archetypal',
    name: '时代亲历者 · 义乌的一名跨境电商店主',
    eraLabel: '中国 · 疫情后的全球供应链',
    anchorEventId: 'e223',
    bio: '据同期贸易与平台数据重构的一名小店主，她的生意从整柜发到港口，变成了一件一件代发的包裹。',
    grounding: [
      '2020—2023 年中国海关跨境电商进出口统计',
      '2020—2023 年全球海运运价与港口拥堵公开数据',
      '义乌市场 2020 年以来的公开贸易报道',
    ],
  },
];

export function getFigure(figureId: string): Figure | null {
  return figures.find((figure) => figure.id === figureId) ?? null;
}
