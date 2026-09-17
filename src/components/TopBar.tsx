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
  onOpenLetters: () => void;
}

export default function TopBar({
  year,
  chapterTitle,
  search,
  filter,
  region,
  onSearch,
  onFilter,
  onRegion,
  onOpenAbout,
  onOpenLetters,
}: TopBarProps) {
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
      <button type="button" className="letters-button" onClick={onOpenLetters}>来信</button>
      <button type="button" className="about-button" onClick={onOpenAbout}>说明</button>
      <span className="year-badge">{year}</span>
    </header>
  );
}
