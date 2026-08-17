/* Shared search types + text utilities for the Lantern search engine. */

export interface TranscriptChunk {
  start_time: number;
  text: string;
}

export interface TranscriptVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  chunks: TranscriptChunk[];
}

export interface Segment {
  text: string;
  mark: boolean;
}

export interface SnippetHit {
  key: string;
  videoId: string;
  startTime: number;
  text: string;
  score: number;
  segments: Segment[];
}

export interface VideoGroup {
  videoId: string;
  title: string;
  thumbnail: string;
  watchUrl: string;
  hits: SnippetHit[];
  bestScore: number;
}

export interface SearchOutcome {
  query: string;
  groups: VideoGroup[];
  totalMatches: number;
  elapsedMs: number;
}

/**
 * Synonym map for Islamic terminology so a query like "how do I pray"
 * also lights up "salah", "namaz" and "salat" in the highlights, and so
 * zero-result queries get a second chance with expanded terms.
 */
const SYNONYMS: Record<string, string[]> = {
  wudu: ["wudu", "wudhu", "ablution"],
  ablution: ["wudu", "wudhu"],
  ghusl: ["ghusl", "shower", "bath"],
  salah: ["salah", "salat", "namaz", "prayer", "prayers"],
  prayer: ["prayer", "prayers", "salah", "salat", "namaz"],
  pray: ["pray", "prayer", "salah"],
  fasting: ["fasting", "fast", "sawm", "ramadan"],
  ramadan: ["ramadan", "fasting", "iftar", "suhoor"],
  zakat: ["zakat", "charity", "sadaqah"],
  charity: ["charity", "sadaqah", "zakat"],
  sabr: ["sabr", "patience", "patient", "hardship"],
  patience: ["patience", "sabr", "patient"],
  taqwa: ["taqwa", "god-consciousness", "consciousness"],
  dhikr: ["dhikr", "zikr", "remembrance", "adkar", "istighfar"],
  remembrance: ["remembrance", "dhikr", "zikr", "adkar"],
  tawakkul: ["tawakkul", "trust", "reliance", "anxiety"],
  trust: ["trust", "tawakkul", "reliance"],
  hajj: ["hajj", "pilgrimage", "umrah", "kaaba"],
  umrah: ["umrah", "hajj", "pilgrimage"],
  pilgrimage: ["pilgrimage", "hajj", "umrah"],
  seerah: ["seerah", "sirah", "prophet", "muhammad"],
  prophet: ["prophet", "muhammad", "seerah"],
  dua: ["dua", "duas", "supplication"],
  quran: ["quran", "recitation", "mushaf"],
  khushu: ["khushu", "focus", "concentration"],
  jannah: ["jannah", "paradise", "heaven"],
};

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06FF']+/)
    .filter((t) => t.length > 1);
}

export function expandQueryTerms(query: string): string[] {
  const out = new Set<string>();
  for (const token of tokenize(query)) {
    out.add(token);
    for (const syn of SYNONYMS[token] ?? []) out.add(syn);
  }
  return [...out];
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Cheap English suffix stripper to mirror the stemmer in highlights. */
function lightStem(word: string): string | null {
  const w = word.toLowerCase();
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ied")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return null;
}

/**
 * Defensive walker: Orama's match-highlight plugin records positions as
 * { [property]: { [word]: [{ start, length }] } } — this flattens any
 * nesting depth into raw ranges, and simply yields nothing if absent.
 */
function collectRanges(node: unknown, ranges: Array<[number, number]>, depth = 0): void {
  if (!node || depth > 4) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (
        item &&
        typeof item === "object" &&
        "start" in item &&
        "length" in item
      ) {
        const start = Number((item as { start: unknown }).start);
        const length = Number((item as { length: unknown }).length);
        if (Number.isFinite(start) && Number.isFinite(length) && length > 0) {
          ranges.push([start, start + length]);
        }
      } else {
        collectRanges(item, ranges, depth + 1);
      }
    }
    return;
  }
  if (typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectRanges(value, ranges, depth + 1);
    }
  }
}

/**
 * Merge exact token positions from the Orama highlighter with regex
 * coverage of the query terms (+ synonyms + light stems) and split the
 * text into marked/plain segments safe to render as React nodes.
 */
export function buildSegments(text: string, positions: unknown, query: string): Segment[] {
  const ranges: Array<[number, number]> = [];
  collectRanges(positions, ranges);

  const terms = new Set<string>();
  for (const term of expandQueryTerms(query)) {
    terms.add(term);
    const stem = lightStem(term);
    if (stem) terms.add(stem);
  }
  for (const term of terms) {
    const re = new RegExp(`\\b${escapeRegExp(term)}`, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      ranges.push([match.index, match.index + match[0].length]);
      if (re.lastIndex === match.index) re.lastIndex += 1;
    }
  }

  if (ranges.length === 0) return [{ text, mark: false }];

  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, rawEnd] of merged) {
    if (start < cursor || start >= text.length) continue;
    const end = Math.min(rawEnd, text.length);
    if (end <= start) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), mark: false });
    segments.push({ text: text.slice(start, end), mark: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), mark: false });
  return segments.length > 0 ? segments : [{ text, mark: false }];
}

/** 145 -> "2:25", 3725 -> "1:02:05" */
export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function youtubeUrl(videoId: string, startTime?: number): string {
  return startTime != null
    ? `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}s`
    : `https://www.youtube.com/watch?v=${videoId}`;
}
