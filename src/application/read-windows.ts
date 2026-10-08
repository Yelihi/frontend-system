type ReadWindow = {content: string; totalCharacters: number; nextOffset: number | null};

// Spend unused space from short entries on longer entries, without changing the
// caller's per-entry limit, hashes, ordering, or aggregate output budget.
export function boundReadWindows<T extends ReadWindow>(windows: T[], offset: number, budget = 24000): T[] {
  const sizes = new Array<number>(windows.length);
  let remaining = budget;
  const shortestFirst = windows.map((window, index) => ({index, length: window.content.length}))
    .sort((a, b) => a.length - b.length);
  shortestFirst.forEach(({index, length}, rank) => {
    sizes[index] = Math.min(length, Math.floor(remaining / (windows.length - rank)));
    remaining -= sizes[index]!;
  });
  return windows.map((window, index) => {
    const content = window.content.slice(0, sizes[index]);
    const end = offset + content.length;
    return {...window, content, nextOffset: end < window.totalCharacters ? end : null};
  });
}
