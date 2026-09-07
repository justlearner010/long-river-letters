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
  chapterId: string;
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
  cause?: string;
  effect?: string;
  globalImpact?: string;
  territoryChange?: string;
  regimeChange?: string;
  links?: GlobalLink[];
  category: EventCategory;
  regions: Region[];
  polityIds: string[];
  chapterId: string;
  importance: 1 | 2 | 3;
  featured?: boolean;
}

export interface GlobalLink {
  from: string;
  to: string;
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
