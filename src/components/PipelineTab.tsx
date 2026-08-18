import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Download } from "lucide-react";
import { COLAB_SCRIPT } from "../data/colabScript";

const STEPS = [
  {
    title: "Run it in Google Colab",
    body: "Open colab.research.google.com, paste the script into a cell and run it. It lists every video on the channel, then pulls the captions with youtube-transcript-api.",
  },
  {
    title: "transcripts.json downloads",
    body: "Each transcript is split into 40-word overlapping blocks, stamped with its start time, and saved as one JSON file that downloads automatically.",
  },
  {
    title: "Drop it into /public",
    body: "Replace the sample transcripts.json in the project's public folder. That file is the entire data layer — nothing else to configure.",
  },
  {
    title: "Reload the app",
    body: "On load, the browser downloads the file and rebuilds the Orama index in memory in milliseconds. Deploy anywhere static, including Netlify.",
  },
];

const KEYWORD_RE =
  /("[^"]*"|'[^']*')|(#.*)|\b(def|import|from|for|while|in|if|elif|else|try|except|return|with|as|not|None|True|False|pass|break|continue|class|lambda)\b|(\b\d+(?:\.\d+)?\b)/g;

function highlightLine(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  const re = new RegExp(KEYWORD_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    if (match[1]) {
      parts.push(
        <span key={key++} className="text-brass">
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="italic text-ink-faint">
          {match[2]}
        </span>,
      );
      re.lastIndex = line.length;
    } else if (match[3]) {
      parts.push(
        <span key={key++} className="text-teal">
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-ink-soft">
          {match[4]}
        </span>,
      );
    }
    last = re.lastIndex;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

export function PipelineTab() {
  const [copied, setCopied] = useState(false);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(COLAB_SCRIPT);
    } catch {
      const area = document.createElement("textarea");
      area.value = COLAB_SCRIPT;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadScript = () => {
    const blob = new Blob([COLAB_SCRIPT], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "generate_transcripts.py";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-6xl px-4 pt-10 sm:pt-14"
    >
      <h2 className="max-w-2xl font-display text-4xl leading-tight text-ink sm:text-5xl">
        Index the whole channel in one Colab cell.
      </h2>
      <p className="mt-4 max-w-2xl text-ink-soft">
        The app ships with a small sample index. To search the real library, run this script once
        in a free Google Colab notebook — it produces the exact{" "}
        <code className="rounded bg-card-hi px-1.5 py-0.5 font-mono text-[13px] text-brass">
          transcripts.json
        </code>{" "}
        the search engine consumes.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Steps + schema */}
        <div>
          <ol className="space-y-6">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.09, duration: 0.45 }}
                className="flex gap-4"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center">
                  <span className="grid h-8 w-8 rotate-45 place-items-center rounded-[6px] border border-brass/40 bg-brass-soft">
                    <span className="-rotate-45 font-mono text-xs font-semibold text-brass">
                      {i + 1}
                    </span>
                  </span>
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-faint">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>

          <div className="mt-8 rounded-xl border border-line bg-card/60 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-faint">
              The data contract
            </p>
            <pre className="code-scroll mt-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-ink-soft">
              {`{
  "id": "1",
  "video_id": "dQw4w9WgXcQ",
  "title": "Video title",
  "thumbnail": "https://i.ytimg.com/vi/…/hqdefault.jpg",
  "chunks": [
    { "start_time": 145, "text": "Transcript block…" }
  ]
}`}
            </pre>
          </div>

          <p className="mt-6 rounded-lg border border-teal/25 bg-teal-soft p-4 text-sm leading-relaxed text-teal">
            <strong className="font-semibold">Why static?</strong> The whole search engine lives in
            the visitor's browser, so the JSON file is the only artifact. Host it anywhere static —
            Netlify, GitHub Pages, Vercel or S3.
          </p>
        </div>

        {/* Code panel */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-bg-soft/80 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.45)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-card/80 px-4 py-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <i className="h-2.5 w-2.5 rounded-full bg-ember/70" />
              <i className="h-2.5 w-2.5 rounded-full bg-brass/70" />
              <i className="h-2.5 w-2.5 rounded-full bg-teal/70" />
            </span>
            <span className="font-mono text-xs text-ink-soft">generate_transcripts.py</span>
            <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Google Colab · Python
            </span>
            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={copyScript}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1.5 font-mono text-[11px] text-ink-soft transition hover:border-brass/50 hover:text-brass"
              >
                {copied ? <Check size={12} className="text-teal" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={downloadScript}
                className="inline-flex items-center gap-1.5 rounded-md border border-brass/40 bg-brass-soft px-2.5 py-1.5 font-mono text-[11px] text-brass transition hover:border-brass/70"
              >
                <Download size={12} />
                Download .py
              </button>
            </span>
          </div>
          <pre className="code-scroll max-h-[620px] overflow-auto p-4 font-mono text-[12px] leading-[1.65] text-ink-soft sm:p-5">
            {COLAB_SCRIPT.split("\n").map((line, i) => (
              <span key={i} className="block min-h-[1.65em]">
                {highlightLine(line)}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </motion.section>
  );
}
