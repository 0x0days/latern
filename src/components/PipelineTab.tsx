import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Download } from "lucide-react";
import { COLAB_SCRIPT } from "../data/colabScript";

const STEPS = [
  {
    title: "Run it in Google Colab",
    body: "Open colab.research.google.com, paste the script into a cell and run it. yt-dlp lists every video on the channel, then youtube-transcript-api pulls the captions.",
  },
  {
    title: "transcripts.json downloads",
    body: "The notebook chunks every transcript into 40-word overlapping blocks, each stamped with its start_time, and saves one JSON file, then hands it to you.",
  },
  {
    title: "Drop it into /public",
    body: "Replace the sample transcripts.json in the project public folder. That single file is the entire data layer; there is nothing else to configure.",
  },
  {
    title: "Reload the app",
    body: "On load, the browser fetches the JSON and rebuilds the Orama index in memory in milliseconds. No servers, no API keys, no migrations.",
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
        <span key={key++} style={{ color: "#ffd98a" }}>
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="italic" style={{ color: "#5b6b8c" }}>
          {match[2]}
        </span>,
      );
      re.lastIndex = line.length;
    } else if (match[3]) {
      parts.push(
        <span key={key++} style={{ color: "#7fd6c6" }}>
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} style={{ color: "#ffe7b0" }}>
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
      <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-brass/80">
        Data ingestion · phase three
      </p>
      <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-ink sm:text-5xl">
        From YouTube to your browser, <em className="text-brass">in one cell.</em>
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
        The app ships with a sample index. To index the real channel, run this script once in a
        free Google Colab notebook. It generates the exact{" "}
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

          <div className="mt-8 rounded-xl border border-line bg-card/70 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-faint">
              The contract, one video object
            </p>
            <pre className="code-scroll mt-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-ink-soft">
              {`{
  "id": "1",
  "video_id": "cvMC08Nnc-o",
  "title": "Christian Lady In Total Shock…",
  "thumbnail": "https://i.ytimg.com/vi/…/hqdefault.jpg",
  "chunks": [
    { "start_time": 38, "text": "She stops me on the street…" }
  ]
}`}
            </pre>
          </div>

          <p className="mt-6 rounded-lg border border-teal/25 bg-teal-soft p-4 text-sm leading-relaxed text-teal">
            <strong className="font-semibold">Why static?</strong> Because the whole search engine
            lives in the visitor's browser. The JSON file is the only artifact, so it can be hosted
            anywhere static: GitHub Pages, Netlify, Vercel, S3.
          </p>
        </div>

        {/* Code panel — a fixed dark editor surface in both themes */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-[#0a0e18] shadow-[0_24px_70px_-30px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#1c2a45] bg-[#0d1220] px-4 py-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <i className="h-2.5 w-2.5 rounded-full bg-ember/80" />
              <i className="h-2.5 w-2.5 rounded-full bg-brass/80" />
              <i className="h-2.5 w-2.5 rounded-full bg-teal/80" />
            </span>
            <span className="font-mono text-xs text-[#cfd6e6]">generate_transcripts.py</span>
            <span className="rounded border border-[#2a3d60] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8a94ad]">
              Google Colab · Python
            </span>
            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={copyScript}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2a3d60] bg-[#121c31] px-2.5 py-1.5 font-mono text-[11px] text-[#cfd6e6] transition hover:border-brass/60 hover:text-brass"
              >
                {copied ? <Check size={12} className="text-teal" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={downloadScript}
                className="inline-flex items-center gap-1.5 rounded-md border border-brass/40 bg-brass/15 px-2.5 py-1.5 font-mono text-[11px] text-brass transition hover:bg-brass/25"
              >
                <Download size={12} />
                Download .py
              </button>
            </span>
          </div>
          <pre
            className="code-scroll max-h-[620px] overflow-auto p-4 font-mono text-[12px] leading-[1.65] text-[#cfd6e6] sm:p-5"
          >
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
