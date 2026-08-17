import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Moon, SearchX, Sparkles, Sun } from "lucide-react";
import { BackgroundFX } from "./components/BackgroundFX";
import { SearchBar } from "./components/SearchBar";
import { ResultGroup } from "./components/ResultGroup";
import { PipelineTab } from "./components/PipelineTab";
import { ArabesqueDivider, Bismillah, LanternMark } from "./components/ornaments";
import { useSearch, type IndexStatus, type IndexStats } from "./hooks/useSearch";
import { useTheme } from "./hooks/useTheme";

type Tab = "search" | "pipeline";

const SUGGESTIONS = [
  "How to perform Wudu?",
  "Why do Muslims pray five times a day?",
  "Is Jesus God in Islam?",
  "Advice for new Muslims",
  "Raising Muslim children",
  "Patience when giving dawah",
];

const CHANNEL_URL = "https://www.youtube.com/@TheMuslimLantern";

function StatusPill({ status, stats }: { status: IndexStatus; stats: IndexStats | null }) {
  if (status === "loading") {
    return (
      <span className="hidden items-center gap-2 rounded-full border border-brass/30 bg-brass-soft px-3 py-1.5 font-mono text-[11px] text-brass md:inline-flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brass" />
        Indexing…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="hidden items-center gap-2 rounded-full border border-ember/40 bg-ember-soft px-3 py-1.5 font-mono text-[11px] text-ember md:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-ember" />
        Index error
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-2 rounded-full border border-teal/30 bg-teal-soft px-3 py-1.5 font-mono text-[11px] text-teal md:inline-flex">
      <span
        className="h-1.5 w-1.5 rounded-full bg-teal"
        style={{ boxShadow: "0 0 8px var(--glow)" }}
      />
      Ready · {stats?.chunks ?? 0} moments
    </span>
  );
}

function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to daylight mode" : "Switch to night mode"}
      title={dark ? "Switch to daylight mode" : "Switch to night mode"}
      className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-line bg-card text-ink-soft transition duration-300 hover:border-brass/50 hover:text-brass"
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="grid place-items-center"
      >
        {dark ? <Moon size={16} /> : <Sun size={16} />}
      </motion.span>
    </button>
  );
}

export default function App() {
  const { status, error, stats, outcome, runSearch, clearResults } = useSearch();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("search");
  const inputRef = useRef<HTMLInputElement>(null);

  /* Live debounced search */
  useEffect(() => {
    if (status !== "ready") return;
    const id = window.setTimeout(() => {
      if (query.trim().length >= 2) void runSearch(query);
      else clearResults();
    }, 280);
    return () => window.clearTimeout(id);
  }, [query, status, runSearch, clearResults]);

  /* "/" focuses the bar, Escape clears */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        clearResults();
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearResults]);

  const pickSuggestion = (s: string) => {
    setTab("search");
    setQuery(s);
    inputRef.current?.focus();
  };

  const totalSnippets = outcome?.groups.reduce((sum, g) => sum + g.hits.length, 0) ?? 0;

  return (
    <div className="min-h-screen">
      <BackgroundFX />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-md transition-colors duration-300">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => setTab("search")}
            className="flex items-center gap-3 text-left"
          >
            <LanternMark
              className="h-10 w-8 shrink-0 text-brass"
              style={{ filter: "drop-shadow(0 0 12px var(--glow))" }}
            />
            <span>
              <span className="block font-display text-[21px] leading-none text-ink">
                The Muslim Lantern
              </span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.34em] text-brass/90">
                Lecture Search
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <StatusPill status={status} stats={stats} />
            <nav
              aria-label="Sections"
              className="flex items-center rounded-full border border-line bg-card/80 p-1"
            >
              {(["search", "pipeline"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    tab === t
                      ? "rounded-full border border-brass/40 bg-brass-soft px-3.5 py-1.5 text-[13px] font-semibold text-brass transition"
                      : "rounded-full border border-transparent px-3.5 py-1.5 text-[13px] font-medium text-ink-faint transition hover:text-ink"
                  }
                >
                  {t === "search" ? "Search" : "Data Pipeline"}
                </button>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          {tab === "pipeline" ? (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PipelineTab />
            </motion.div>
          ) : (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* ── Search stage ─────────────────────────────── */}
              <section className="relative px-4 pb-12 pt-12 sm:pt-16">
                <div className="animate-rise" style={{ animationDelay: "0.05s" }}>
                  <Bismillah className="text-center text-[22px] leading-relaxed text-brass sm:text-2xl" />
                  <ArabesqueDivider className="mx-auto my-6 h-6 w-64 text-brass/80" />
                </div>

                <p
                  className="animate-rise text-center font-mono text-[10.5px] uppercase tracking-[0.32em] text-brass/80 sm:text-xs"
                  style={{ animationDelay: "0.12s" }}
                >
                  Zero-database · 100% in-browser · Orama
                </p>

                <h1
                  className="animate-rise mx-auto mt-4 max-w-3xl text-center font-display text-[42px] leading-[1.08] text-ink sm:text-6xl lg:text-[66px]"
                  style={{ animationDelay: "0.18s" }}
                >
                  Every lecture. Every second. <em className="text-brass">Found.</em>
                </h1>

                <p
                  className="animate-rise mx-auto mt-5 max-w-xl text-center text-[15px] leading-relaxed text-ink-soft sm:text-base"
                  style={{ animationDelay: "0.24s" }}
                >
                  Ask anything — from wudu to tawakkul — and land on the exact moment it was
                  discussed on{" "}
                  <a
                    href={CHANNEL_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-teal underline decoration-teal/40 underline-offset-2 transition hover:decoration-teal"
                  >
                    @TheMuslimLantern
                  </a>
                  , timestamped to the second.
                </p>

                <div className="animate-rise mt-8" style={{ animationDelay: "0.3s" }}>
                  <SearchBar
                    value={query}
                    onChange={setQuery}
                    onClear={() => {
                      setQuery("");
                      clearResults();
                      inputRef.current?.focus();
                    }}
                    inputRef={inputRef}
                    status={status}
                  />
                </div>

                {/* Index status strip */}
                {status === "loading" ? (
                  <div className="mx-auto mt-6 h-3.5 w-72 max-w-full rounded-full skeleton-sheen" />
                ) : status === "error" ? null : stats ? (
                  <p
                    className="animate-rise mt-6 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center font-mono text-[11.5px] text-ink-faint"
                    style={{ animationDelay: "0.36s" }}
                  >
                    <span className="text-teal">●</span>
                    {stats.videos} videos · {stats.chunks} moments indexed in {stats.indexMs} ms
                    <span className="text-line-strong">|</span>
                    english stemmer · stopwords disabled
                  </p>
                ) : null}

                {/* Suggestions */}
                {!outcome && (
                  <div
                    className="animate-rise mx-auto mt-7 flex max-w-2xl flex-wrap justify-center gap-2"
                    style={{ animationDelay: "0.42s" }}
                  >
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => pickSuggestion(s)}
                        disabled={status !== "ready"}
                        className="rounded-full border border-line bg-card/70 px-4 py-2 text-[13px] text-ink-soft transition duration-200 hover:-translate-y-0.5 hover:border-brass/50 hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Sample-index notice */}
                {!outcome && status === "ready" && (
                  <p
                    className="animate-rise mx-auto mt-5 max-w-xl text-center text-xs leading-relaxed text-ink-faint"
                    style={{ animationDelay: "0.48s" }}
                  >
                    <Sparkles size={12} className="mr-1 inline text-brass" />
                    Sample index with real channel videos — snippets are illustrative. Run the{" "}
                    <button
                      type="button"
                      onClick={() => setTab("pipeline")}
                      className="font-semibold text-brass underline decoration-brass/40 underline-offset-2 hover:decoration-brass"
                    >
                      Data Pipeline
                    </button>{" "}
                    script to load every real transcript.
                  </p>
                )}
              </section>

              {/* ── Results / states ─────────────────────────── */}
              <section className="mx-auto w-full max-w-3xl px-4 pb-8">
                {status === "loading" && (
                  <div className="space-y-5">
                    {[0, 1].map((i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-line bg-card/70 p-5"
                        style={{ opacity: 1 - i * 0.35 }}
                      >
                        <div className="flex gap-4">
                          <div className="skeleton-sheen h-20 w-32 shrink-0 rounded-lg sm:w-40" />
                          <div className="flex-1 space-y-2.5 py-1">
                            <div className="skeleton-sheen h-3 w-24 rounded" />
                            <div className="skeleton-sheen h-4 w-3/4 rounded" />
                            <div className="skeleton-sheen h-3 w-1/2 rounded" />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 border-t border-line pt-3">
                          <div className="skeleton-sheen h-3 w-full rounded" />
                          <div className="skeleton-sheen h-3 w-5/6 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {status === "error" && (
                  <div className="mx-auto max-w-xl rounded-xl border border-ember/40 bg-ember-soft p-6 text-center">
                    <AlertTriangle className="mx-auto text-ember" size={26} />
                    <h2 className="mt-3 font-display text-2xl text-ink">
                      The lantern could not be lit
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {error ?? "An unknown error occurred while building the local index."}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      Make sure transcripts.json is present in the /public folder.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-4 rounded-md border border-ember/40 bg-card px-4 py-2 text-sm font-semibold text-ember transition hover:bg-ember-soft"
                    >
                      Reload and retry
                    </button>
                  </div>
                )}

                {status === "ready" && outcome && outcome.groups.length === 0 && (
                  <div className="mx-auto max-w-xl rounded-xl border border-line bg-card/70 p-8 text-center">
                    <SearchX className="mx-auto text-ink-faint" size={30} />
                    <h2 className="mt-3 font-display text-2xl text-ink">
                      Nothing lit up for “{outcome.query}”
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      Try a broader keyword — wudu, salah, patience, charity — or one of the
                      suggestions below.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.slice(0, 4).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => pickSuggestion(s)}
                          className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs text-ink-soft transition hover:-translate-y-0.5 hover:border-brass/50 hover:text-brass"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {status === "ready" && outcome && outcome.groups.length > 0 && (
                  <>
                    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-display text-2xl text-ink">
                        {outcome.groups.length} video{outcome.groups.length > 1 ? "s" : ""} ·{" "}
                        {totalSnippets} moment{totalSnippets > 1 ? "s" : ""}
                      </h2>
                      <p className="font-mono text-[11.5px] text-ink-faint">
                        “{outcome.query}” · {outcome.totalMatches} hits ·{" "}
                        {outcome.elapsedMs.toFixed(1)} ms · local
                      </p>
                    </div>
                    <div className="space-y-5">
                      {outcome.groups.map((group, i) => (
                        <ResultGroup key={group.videoId} group={group} index={i} />
                      ))}
                    </div>
                  </>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-line py-8 transition-colors duration-300">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center">
          <ArabesqueDivider className="h-5 w-52 text-brass/60" />
          <p className="max-w-xl text-xs leading-relaxed text-ink-faint">
            Search runs entirely in your browser with Orama — no servers, no databases, no API
            keys. Content indexed from{" "}
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brass hover:underline"
            >
              youtube.com/@TheMuslimLantern
            </a>{" "}
            via the static transcripts.json pipeline.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-faint/70">
            The Muslim Lantern · lecture search
          </p>
        </div>
      </footer>
    </div>
  );
}
