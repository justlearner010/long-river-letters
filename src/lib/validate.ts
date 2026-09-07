import type { Chapter, EraSlice, WorldEvent } from '../types';

export function validateWorldData(
  chapters: Chapter[],
  slices: EraSlice[],
  events: WorldEvent[],
): string[] {
  const errors: string[] = [];
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const sliceIds = new Set(slices.map((s) => s.id));
  const eventIds = new Set<string>();

  chapters.forEach((chapter, index) => {
    if (index > 0 && chapter.order !== chapters[index - 1].order + 1) {
      errors.push(`章节 ${chapter.id} 的 order 不连续`);
    }
    if (chapter.startYear > chapter.endYear) {
      errors.push(`章节 ${chapter.id} 年份范围错误`);
    }
    chapter.sliceIds.forEach((sliceId) => {
      if (!sliceIds.has(sliceId)) {
        errors.push(`章节 ${chapter.id} 引用了不存在的切片 ${sliceId}`);
      }
    });
  });

  slices.forEach((slice) => {
    const chapter = chapterById.get(slice.chapterId);
    if (!chapter) {
      errors.push(`切片 ${slice.id} 缺少章节引用`);
      return;
    }
    if (slice.year < chapter.startYear || slice.year > chapter.endYear) {
      errors.push(`切片 ${slice.id}（${slice.year}）不在章节 ${chapter.id} 范围内`);
    }
    if (!chapter.sliceIds.includes(slice.id)) {
      errors.push(`切片 ${slice.id} 未列在章节 ${chapter.id} 的 sliceIds 中`);
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
