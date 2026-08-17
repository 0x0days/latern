import { useState, type MouseEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Play } from "lucide-react";
import {
  formatTimestamp,
  youtubeUrl,
  type SnippetHit,
  type VideoGroup,
} from "../lib/search";
import { LanternMark } from "./ornaments";

function Thumbnail({ src, watchUrl, title }: { src: string; watchUrl: string; title: string }) {
  const [failed, setFailed] = useState(!src);
  return (
    <a
      href={watchUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Watch “${title}” on YouTube`}
      className="group/thumb relative block aspect-video w-32 shrink-0 overflow-hidden rounded-lg border border-line bg-card-hi sm:w-40"
    >
      {/* Girih fallback sits beneath every layer */}
      <span
        className="girih-layer absolute inset-0 opacity-25"
        style={{ backgroundSize: "52px 52px" }}
      />
      <span className="absolute inset-0 bg-[radial-gradient(120%_120%_at_30%_20%,var(--brass-soft),transparent_70%)]" />
      {!failed && (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/thumb:scale-[1.06]"
        />
      )}
      {failed && (
        <span className="absolute inset-0 grid place-items-center">
          <LanternMark className="h-10 w-8 text-brass/70" />
        </span>
      )}
      <span className="absolute inset-0 ring-1 ring-inset ring-line-strong/50 transition group-hover/thumb:ring-brass/60" />
      <span className="absolute inset-0 grid place-items-center bg-bg/30 opacity-0 transition duration-300 group-hover/thumb:opacity-100">
        <span
          className="grid h-9 w-9 place-items-center rounded-full bg-brass text-bg"
          style={{ boxShadow: "0 0 24px var(--glow)" }}
        >
          <Play size={15} fill="currentColor" stroke="none" className="translate-x-[1px]" />
        </span>
      </span>
    </a>
  );
}

function CopyLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const area = document.createElement("textarea");
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Link copied" : `Copy timestamped link for ${label}`}
      title="Copy timestamped link"
      className="rounded-md border border-line bg-card p-1.5 text-ink-faint transition hover:border-brass/50 hover:text-brass"
    >
      {copied ? <Check size={13} className="text-teal" /> : <Copy size={13} />}
    </button>
  );
}

function SnippetRow({ hit }: { hit: SnippetHit }) {
  const url = youtubeUrl(hit.videoId, hit.startTime);
  const pct = Math.max(1, Math.round(hit.score * 100));

  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="group/snippet -mx-3 flex items-start gap-3 rounded-lg border border-transparent px-3 py-3 transition duration-200 hover:border-line hover:bg-card-hi sm:gap-4"
      >
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brass/25 bg-brass-soft px-2 py-1 font-mono text-xs text-brass transition group-hover/snippet:border-brass/50">
          <Play size={10} fill="currentColor" stroke="none" />
          {formatTimestamp(hit.startTime)}
        </span>

        <span className="min-w-0 flex-1 text-[15px] leading-relaxed text-ink-soft transition group-hover/snippet:text-ink">
          {hit.segments.map((segment, i) =>
            segment.mark ? (
              <mark key={i} className="snippet-mark">
                {segment.text}
              </mark>
            ) : (
              <span key={i}>{segment.text}</span>
            ),
          )}
        </span>

        <span className="flex shrink-0 flex-col items-end gap-2">
          <span className="whitespace-nowrap rounded-full border border-line bg-card px-2 py-0.5 font-mono text-[10.5px] text-ink-faint">
            {pct}% match
          </span>
          <span className="opacity-70 transition group-hover/snippet:opacity-100 sm:opacity-0 sm:group-hover/snippet:opacity-100">
            <CopyLink url={url} label={formatTimestamp(hit.startTime)} />
          </span>
        </span>
      </a>
    </li>
  );
}

export function ResultGroup({ group, index }: { group: VideoGroup; index: number }): ReactNode {
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.07, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-line bg-card/70 p-4 backdrop-blur-sm transition-colors duration-300 hover:border-line-strong sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Thumbnail src={group.thumbnail} watchUrl={group.watchUrl} title={group.title} />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-brass/80">
            Video {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-1 text-lg font-bold leading-snug text-ink sm:text-xl">
            {group.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-faint">
            <span>
              <strong className="font-semibold text-ink-soft">{group.hits.length}</strong>{" "}
              matching moment{group.hits.length > 1 ? "s" : ""}
            </span>
            <span className="text-line-strong">·</span>
            <span className="font-mono text-xs text-brass">
              {Math.max(1, Math.round(group.bestScore * 100))}% relevance
            </span>
            <span className="text-line-strong">·</span>
            <a
              href={group.watchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-teal transition hover:opacity-80"
            >
              Watch full video
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-0.5 border-t border-line pt-2">
        {group.hits.map((hit) => (
          <SnippetRow key={hit.key} hit={hit} />
        ))}
      </ul>
    </motion.article>
  );
}
