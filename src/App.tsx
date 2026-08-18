import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Database, ExternalLink, Moon, SearchX, Sparkles, Sun, X } from "lucide-react";
import { BackgroundFX } from "./components/BackgroundFX";
import { SearchBar } from "./components/SearchBar";
import { ResultGroup } from "./components/ResultGroup";
import { PipelineTab } from "./components/PipelineTab";
import { LanternMark } from "./components/ornaments";
import { useSearch, type IndexStatus, type IndexStats } from "./hooks/useSearch";
import { useTheme } from "./hooks/useTheme";

type Tab = "search" | "pipeline";

const SUGGESTIONS = [
  "Why is Islam the truth?",
  "Proof of the prophethood",
  "Women in Islam",
  "Answer to an atheist",
  "Is the Quran preserved?",
  "Patience when provoked",
];

function StatusPill({ status, stats }: { status: IndexStatus; stats: IndexStats | null }) {
  if (status === "loading") {
    return (
      <span className="hidden items-center gap-2 rounded-full border border-brass/30 bg-brass-soft px-3 py-1.5 font-mono text-[11px] text-brass sm:inline-flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brass" />
        Indexing…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="hidden items-center gap-2 rounded-full border border-ember/40 bg-ember-soft px-3 py-1.5 font-mono text-[11px] text-ember sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-ember" />
        Index error
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-2 rounded-full border border-teal/30 bg-teal-soft px-3 py-1.5 font-mono text-[11px] text-teal sm:inline-flex">
      <span
        className="h-1.5 w-1.5 rounded-full bg-teal"
        style={{ boxShadow: "0 0 8px currentColor" }}
      />
      Ready · {stats?.chunks ?? 0} moments
    </span>
  );
}

export default function App() {
  const { status, error, stats, outcome, runSearch, clearResults } = useSearch();
  const [theme, toggleTheme] = useTheme();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("search");
  const inputRef = useRef<HTMLInputElement>(null);

  /* Deep links: Google sitelinks (?q=…) and footer links (#pipeline) */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuery(q);
    if (window.location.hash === "#pipeline") setTab("pipeline");

    const onHash = () => setTab(window.location.hash === "#pipeline" ? "pipeline" : "search");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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
      <header className="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => {
              setTab("search");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 text-left"
          >
            <LanternMark
              className="h-10 w-8 shrink-0 text-brass"
              style={{ filter: "drop-shadow(0 0 10px var(--glow))" }}
            />
            <span>
              <span className="block font-display text-[21px] leading-none text-ink">
                TheMuslimLantern
              </span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.3em] text-brass/80">
                Moment Search
              </span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <StatusPill status={status} stats={stats} />
            <nav
              aria-label="Sections"
              className="flex items-center rounded-full border border-line bg-card/80 p-1"
            >
              {([["search", "Search"], ["pipeline", "Data Pipeline"]] as const).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    if (t === "pipeline") window.history.replaceState(null, "", "#pipeline");
                    else window.history.replaceState(null, "", window.location.pathname);
                  }}
                  className={
                    tab === t
                      ? "rounded-full border border-brass/40 bg-brass-soft px-3.5 py-1.5 text-[13px] font-semibold text-brass transition"
                      : "rounded-full border border-transparent px-3.5 py-1.5 text-[13px] font-medium text-ink-faint transition hover:text-ink"
                  }
                >
                  {label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="grid h-9 w-9 place-items-center rounded-full border border-line bg-card/80 text-ink-soft transition hover:border-brass/50 hover:text-brass"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
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
                <h1
                  className="animate-rise mx-auto max-w-3xl text-center font-display text-[40px] leading-[1.08] text-ink sm:text-[56px] lg:text-[62px]"
                  style={{ animationDelay: "0.1s" }}
                >
                  Find the exact second it was answered.
                </h1>

                <p
                  className="animate-rise mx-auto mt-5 max-w-xl text-center text-[15px] leading-relaxed text-ink-soft sm:text-base"
                  style={{ animationDelay: "0.18s" }}
                >
                  Search across{" "}
                  <a
                    href="https://www.youtube.com/@TheMuslimLantern"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brass underline decoration-brass/40 underline-offset-2 hover:decoration-brass"
                  >
                    TheMuslimLantern
                  </a>{" "}
                  videos, and every result opens on YouTube at the precise moment it was discussed.
                </p>

                <div className="animate-rise mt-8" style={{ animationDelay: "0.26s" }}>
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
                    style={{ animationDelay: "0.32s" }}
                  >
                    <span className="text-teal">●</span>
                    {stats.videos} videos · {stats.chunks} moments · indexed in {stats.indexMs} ms
                  </p>
                ) : null}

                {/* Suggestions */}
                {!outcome && (
                  <div
                    className="animate-rise mx-auto mt-7 flex max-w-2xl flex-wrap justify-center gap-2"
                    style={{ animationDelay: "0.38s" }}
                  >
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => pickSuggestion(s)}
                        disabled={status !== "ready"}
                        className="rounded-full border border-line bg-card/60 px-4 py-2 text-[13px] text-ink-soft transition duration-200 hover:-translate-y-0.5 hover:border-brass/50 hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Results / states ─────────────────────────── */}
              <section className="mx-auto w-full max-w-3xl px-4 pb-8">
                {status === "loading" && (
                  <div className="space-y-5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-44 rounded-xl border border-line bg-card/50 skeleton-sheen"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}

                {status === "error" && (
                  <div className="animate-rise flex items-start gap-3 rounded-xl border border-ember/40 bg-ember-soft p-4 text-ember">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-ink">The transcript index could not be loaded.</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {error ?? "Unknown error"}. Make sure{" "}
                        <code className="rounded bg-card-hi px-1.5 py-0.5 font-mono text-[12px] text-brass">
                          public/transcripts.json
                        </code>{" "}
                        exists and is valid JSON.
                      </p>
                    </div>
                  </div>
                )}

                {/* Idle — the lantern waits */}
                {status === "ready" && !outcome && (
                  <div className="animate-rise flex flex-col items-center py-14 text-center">
                    <LanternMark
                      className="h-20 w-16 animate-flame text-brass"
                      style={{ filter: "drop-shadow(0 0 18px var(--glow))" }}
                    />
                    <p className="mt-6 font-display text-2xl text-ink">The lantern is lit.</p>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-faint">
                      Ask about anything covered on the channel, from why Islam is the truth to
                      women in Islam or answers for skeptics, and the matching moments will gather
                      here.
                    </p>
                  </div>
                )}

                {/* Results */}
                {status === "ready" && outcome && (
                  <div className="space-y-5 pb-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 pt-2 text-sm text-ink-faint"
                    >
                      <Sparkles size={15} className="text-brass" />
                      <span>
                        <strong className="font-semibold text-ink-soft">
                          {totalSnippets} moment{totalSnippets === 1 ? "" : "s"}
                        </strong>{" "}
                        across <strong className="font-semibold text-ink-soft">{outcome.groups.length}</strong>{" "}
                        video{outcome.groups.length === 1 ? "" : "s"}
                      </span>
                      <span className="text-line-strong">·</span>
                      <span className="font-mono text-xs">
                        {outcome.totalMatches} total matches · {outcome.elapsedMs.toFixed(1)} ms
                      </span>
                      <span className="text-line-strong">·</span>
                      <span className="font-mono text-xs text-brass/80">“{outcome.query}”</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          clearResults();
                        }}
                        className="ml-auto inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-faint transition hover:border-brass/50 hover:text-brass"
                      >
                        <X size={12} /> Clear
                      </button>
                    </motion.div>

                    {outcome.groups.length > 0 ? (
                      outcome.groups.map((group, i) => (
                        <ResultGroup key={group.videoId} group={group} index={i} />
                      ))
                    ) : (
                      <div className="animate-rise rounded-xl border border-line bg-card/60 p-6 text-center">
                        <SearchX size={26} className="mx-auto text-ink-faint" />
                        <p className="mt-3 font-semibold text-ink">
                          Nothing found for “{outcome.query}”.
                        </p>
                        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-faint">
                          Try a shorter keyword, a single term like{" "}
                          <em className="text-ink-soft">prophethood</em> or{" "}
                          <em className="text-ink-soft">patience</em>, or pick a suggestion above.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Channel-only note */}
                {status === "ready" && (
                  <p className="flex flex-wrap items-center justify-center gap-2 px-4 pb-6 text-center text-[12.5px] text-ink-faint">
                    <Database size={13} className="text-teal" />
                    Results come only from transcripts of this channel. The full library can be
                    indexed with the
                    <button
                      type="button"
                      onClick={() => setTab("pipeline")}
                      className="text-teal underline decoration-teal/40 underline-offset-2 transition hover:decoration-teal"
                    >
                      Colab generator
                    </button>
                    <a
                      href="https://www.youtube.com/@TheMuslimLantern"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brass underline decoration-brass/40 underline-offset-2 transition hover:decoration-brass"
                    >
                      Visit the channel <ExternalLink size={11} />
                    </a>
                  </p>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
