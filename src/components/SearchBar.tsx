import { Search, X, Loader2 } from "lucide-react";
import type { RefObject } from "react";
import type { IndexStatus } from "../hooks/useSearch";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  inputRef: RefObject<HTMLInputElement>;
  status: IndexStatus;
}

export function SearchBar({ value, onChange, onClear, inputRef, status }: SearchBarProps) {
  const ready = status === "ready";

  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      className={[
        "search-shell group relative mx-auto flex h-14 w-full max-w-2xl items-center gap-3 rounded-xl border bg-card/85 px-4 backdrop-blur-sm sm:h-16 sm:px-5",
        ready ? "border-line hover:border-line-strong" : "border-line opacity-80",
      ].join(" ")}
    >
      <Search
        size={20}
        className="shrink-0 text-ink-faint transition-colors duration-300 group-focus-within:text-brass"
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!ready}
        type="text"
        enterKeyHint="search"
        placeholder={
          status === "loading"
            ? "Kindling the lantern…"
            : status === "error"
              ? "Index unavailable"
              : "Ask anything, e.g. “why is Islam the truth”"
        }
        aria-label="Search TheMuslimLantern videos"
        className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint sm:text-lg"
      />

      {value.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="rounded-md p-1.5 text-ink-faint transition hover:bg-card-hi hover:text-ink"
        >
          <X size={16} />
        </button>
      )}

      <span className="flex shrink-0 items-center gap-2.5">
        {status === "loading" ? (
          <Loader2 size={16} className="animate-spin text-brass" aria-hidden="true" />
        ) : status === "ready" ? (
          <span
            className="inline-block h-2 w-2 animate-lantern-breathe rounded-full bg-brass"
            style={{ boxShadow: "0 0 10px var(--glow)" }}
            aria-hidden="true"
          />
        ) : null}
        <kbd className="kbd-key hidden sm:inline-block">/</kbd>
      </span>
    </form>
  );
}
