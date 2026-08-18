import { useCallback, useEffect, useRef, useState } from "react";
import { create, insertMultiple, search } from "@orama/orama";
import type { AnyOrama } from "@orama/orama";
import {
  buildSegments,
  expandQueryTerms,
  youtubeUrl,
  type SearchOutcome,
  type TranscriptVideo,
  type VideoGroup,
} from "../lib/search";

export type IndexStatus = "loading" | "ready" | "error";

export interface IndexStats {
  videos: number;
  chunks: number;
  indexMs: number;
}

interface UseSearchResult {
  status: IndexStatus;
  error: string | null;
  stats: IndexStats | null;
  outcome: SearchOutcome | null;
  runSearch: (rawQuery: string) => Promise<SearchOutcome | null>;
  clearResults: () => void;
}

interface RawHit {
  document: unknown;
  score?: number;
  positions?: unknown;
}
interface RawResults {
  count: number;
  hits: RawHit[];
}

const MAX_VIDEO_GROUPS = 5;
const MAX_CHUNKS_PER_VIDEO = 3;
const TOTAL_CHUNK_CAP = 12;
const WEAK_RESULT_THRESHOLD = 5;

/**
 * Zero-database search engine: fetches /transcripts.json once, builds an
 * Orama index entirely in browser memory, and answers every query locally.
 *
 * Quality strategy — three passes, merged and deduped:
 *  1. Fuzzy full-text (tolerance 1, title boosted) — the main net.
 *  2. Exact-phrase pass for multi-word questions when pass 1 is weak.
 *  3. Islamic-term synonym expansion (wudu→ablution, salah→prayer…) when
 *     the first two passes still leave thin results.
 *
 * Uses @orama/plugin-match-highlight (v3 API: afterInsert +
 * searchWithHighlight) for exact token positions; degrades gracefully.
 */
export function useSearch(): UseSearchResult {
  const [status, setStatus] = useState<IndexStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);

  const dbRef = useRef<AnyOrama | null>(null);
  const metaRef = useRef<Map<string, TranscriptVideo>>(new Map());
  const highlightSearchRef = useRef<
    ((db: AnyOrama, params: Record<string, unknown>) => Promise<unknown>) | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    async function buildIndex() {
      const t0 = performance.now();
      try {
        const response = await fetch("/transcripts.json");
        if (!response.ok) {
          throw new Error(`Could not load /transcripts.json (HTTP ${response.status}).`);
        }
        const videos: unknown = await response.json();
        if (!Array.isArray(videos)) {
          throw new Error("transcripts.json must be an array of video objects.");
        }

        // English stemmer ON, stop-word removal OFF — so Islamic terms like
        // Sabr, Taqwa, Salah, Dhikr are indexed verbatim instead of being
        // filtered out as noise words.
        // Validate and normalize so a malformed transcripts.json degrades
        // gracefully instead of breaking the page.
        const clean = (videos as TranscriptVideo[]).filter(
          (video) =>
            video &&
            typeof video.video_id === "string" &&
            video.video_id.length > 0 &&
            Array.isArray(video.chunks),
        );
        const docs = clean.flatMap((video) =>
          (video.chunks ?? [])
            .filter(
              (chunk) =>
                chunk &&
                typeof chunk.text === "string" &&
                chunk.text.trim().length > 0 &&
                Number.isFinite(chunk.start_time),
            )
            .map((chunk) => ({
              video_id: video.video_id,
              title: typeof video.title === "string" ? video.title : video.video_id,
              start_time: Math.max(0, Math.floor(chunk.start_time)),
              text: chunk.text,
            })),
        );

        const db = create({
          schema: {
            video_id: "string",
            title: "string",
            start_time: "number",
            text: "string",
          },
          components: {
            tokenizer: { language: "english", stopWords: false },
          },
        }) as AnyOrama;

        const ids = insertMultiple(db, docs) as unknown as string[];

        // Match-highlight plugin (v3 API): record token positions per doc,
        // then swap the query path to searchWithHighlight.
        try {
          const plugin = (await import("@orama/plugin-match-highlight")) as {
            afterInsert?: (db: AnyOrama, id: string) => Promise<void>;
            searchWithHighlight?: (
              db: AnyOrama,
              params: Record<string, unknown>,
            ) => Promise<unknown>;
          };
          if (plugin.afterInsert && plugin.searchWithHighlight) {
            for (const id of ids) {
              await plugin.afterInsert(db, id);
            }
            highlightSearchRef.current = plugin.searchWithHighlight;
          }
        } catch {
          /* positions unavailable — regex highlighting still works */
        }

        if (cancelled) return;
        metaRef.current = new Map(clean.map((v) => [v.video_id, v]));
        dbRef.current = db;
        setStats({
          videos: clean.length,
          chunks: docs.length,
          indexMs: Math.round(performance.now() - t0),
        });
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    }

    buildIndex();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSearch = useCallback(
    async (rawQuery: string): Promise<SearchOutcome | null> => {
      const db = dbRef.current;
      const query = rawQuery.trim();
      if (!db || query.length < 2) {
        setOutcome(null);
        return null;
      }

      // Strict matching only: tolerance stays 0 on every pass. Fuzzy typo
      // guessing was removed on purpose so a search for "Moses" can never
      // surface "nose". Relevance comes from stemming, title boosts and the
      // Islamic-term synonym map instead.
      const params = (term: string, exact: boolean): Record<string, unknown> => ({
        term,
        tolerance: 0,
        exact,
        limit: 60,
        boost: { title: 2.4, text: 1 },
        properties: ["title", "text"],
      });

      const runQuery = async (term: string, exact: boolean): Promise<RawResults> => {
        try {
          if (highlightSearchRef.current) {
            return (await highlightSearchRef.current(db, params(term, exact))) as RawResults;
          }
          return search(db, params(term, exact) as never) as unknown as RawResults;
        } catch {
          return { count: 0, hits: [] };
        }
      };

      const t0 = performance.now();

      /* ── Pass 1: fuzzy ─────────────────────────────────────── */
      let res = await runQuery(query, false);
      const wordCount = query.split(/\s+/).length;

      /* ── Pass 2: exact phrase (multi-word questions) ───────── */
      if (res.count < WEAK_RESULT_THRESHOLD && wordCount > 1) {
        const exact = await runQuery(query, true);
        res = mergeResults(res, exact);
      }

      /* ── Pass 3: Islamic-term synonym expansion ────────────── */
      /* Always merged, even when base results exist, so "Moses" also finds
         chunks that say "Musa" and "Jesus" finds "Isa". */
      const expanded = expandQueryTerms(query);
      const expandedTerm = expanded.join(" ");
      if (expandedTerm && expandedTerm.toLowerCase() !== query.toLowerCase()) {
        const expandedRes = await runQuery(expandedTerm, false);
        res = mergeResults(res, expandedRes);
      }

      const elapsedMs = Math.max(0.01, performance.now() - t0);

      const groups = new Map<string, VideoGroup>();
      let chunkCount = 0;

      for (const hit of res.hits ?? []) {
        if (chunkCount >= TOTAL_CHUNK_CAP) break;
        const doc = hit.document as {
          video_id: string;
          title: string;
          start_time: number;
          text: string;
        };
        const meta = metaRef.current.get(doc.video_id);
        const score = typeof hit.score === "number" ? hit.score : 0;

        let group = groups.get(doc.video_id);
        if (!group) {
          if (groups.size >= MAX_VIDEO_GROUPS) continue;
          group = {
            videoId: doc.video_id,
            title: meta?.title ?? doc.title,
            thumbnail: meta?.thumbnail ?? "",
            watchUrl: youtubeUrl(doc.video_id),
            hits: [],
            bestScore: 0,
          };
          groups.set(doc.video_id, group);
        }
        if (group.hits.length >= MAX_CHUNKS_PER_VIDEO) continue;

        group.hits.push({
          key: `${doc.video_id}:${doc.start_time}:${group.hits.length}`,
          videoId: doc.video_id,
          startTime: doc.start_time,
          text: doc.text,
          score,
          segments: buildSegments(doc.text, hit.positions, query),
        });
        group.bestScore = Math.max(group.bestScore, score);
        chunkCount += 1;
      }

      const ordered = [...groups.values()]
        .sort((a, b) => b.bestScore - a.bestScore)
        .map((group) => ({
          ...group,
          hits: [...group.hits].sort((a, b) => a.startTime - b.startTime),
        }));

      const result: SearchOutcome = {
        query,
        groups: ordered,
        totalMatches: res.count,
        elapsedMs,
      };
      setOutcome(result);
      return result;
    },
    [],
  );

  const clearResults = useCallback(() => setOutcome(null), []);

  return { status, error, stats, outcome, runSearch, clearResults };
}

/** Merge two result sets, deduped by video+timestamp, keeping the best score. */
function mergeResults(base: RawResults, extra: RawResults): RawResults {
  const seen = new Map<string, RawHit>();
  const add = (hits: RawHit[]) => {
    for (const hit of hits) {
      const doc = hit.document as { video_id?: string; start_time?: number };
      const key = `${doc?.video_id}:${doc?.start_time}`;
      const prev = seen.get(key);
      if (!prev || (hit.score ?? 0) > (prev.score ?? 0)) seen.set(key, hit);
    }
  };
  add(base.hits ?? []);
  add(extra.hits ?? []);
  const hits = [...seen.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return { count: hits.length, hits };
}
