# ============================================================
#  TheMuslimLantern — Transcript Index Generator (Google Colab)
# ------------------------------------------------------------
#  HOW TO RUN
#  1. Open https://colab.research.google.com and paste this file
#     into a single code cell (free tier is fine).
#  2. Run the cell. It may take a few minutes for large channels.
#  3. transcripts.json downloads automatically at the end.
#  4. Drop transcripts.json into your project's /public folder
#     and reload the app — the Orama index rebuilds in-browser.
# ============================================================

# --- Cell 1: dependencies -----------------------------------
# !pip install -q yt-dlp "youtube-transcript-api>=1.0"

# --- Cell 2: configuration ----------------------------------
CHANNEL_VIDEOS_URL = "https://www.youtube.com/@TheMuslimLantern/videos"
TRANSCRIPT_LANGS = ["en", "en-US", "en-GB", "ar"]
CHUNK_WORDS = 40        # words per chunk (the "40-word overlapping blocks")
OVERLAP_WORDS = 10      # words shared between consecutive chunks
OUTPUT_FILE = "transcripts.json"
MAX_VIDEOS = None       # set to e.g. 10 while testing on a subset

# --- Cell 3: collect every video id + title from the channel
import json
import re

from yt_dlp import YoutubeDL


def fetch_channel_videos(url):
    """Flatten a channel's /videos tab into a list of entries."""
    opts = {
        "extract_flat": "in_playlist",
        "quiet": True,
        "skip_download": True,
        "ignoreerrors": True,
    }
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)

    entries = []

    def walk(node):
        if not node:
            return
        for entry in node.get("entries") or []:
            if entry and entry.get("entries"):
                walk(entry)  # nested playlist (channel tabs)
            elif entry and entry.get("id"):
                entries.append(entry)

    walk(info)
    return entries


entries = fetch_channel_videos(CHANNEL_VIDEOS_URL)
if MAX_VIDEOS:
    entries = entries[:MAX_VIDEOS]
print(f"Found {len(entries)} videos on the channel.")

# --- Cell 4: pull transcripts + chunk into 40-word blocks ----
from youtube_transcript_api import YouTubeTranscriptApi

# NOTE: youtube-transcript-api >= 1.0 uses the instance API below.
# On 0.6.x replace with:
#   YouTubeTranscriptApi.get_transcript(video_id, languages=TRANSCRIPT_LANGS)
ytt = YouTubeTranscriptApi()


def chunk_transcript(snippets):
    """Split the transcript into CHUNK_WORDS blocks with OVERLAP_WORDS
    overlap. Each chunk carries the start_time of its first word, so
    clicking it deep-links into the video at the right second."""
    words = []
    times = []
    for snippet in snippets:  # snippet: .text, .start, .duration
        for word in snippet.text.split():
            words.append(word)
            times.append(snippet.start)
    if not words:
        return []

    chunks = []
    pos = 0
    step = max(1, CHUNK_WORDS - OVERLAP_WORDS)
    while pos < len(words):
        block = words[pos : pos + CHUNK_WORDS]
        chunks.append(
            {
                "start_time": int(times[pos]),
                "text": " ".join(block).strip(),
            }
        )
        if pos + CHUNK_WORDS >= len(words):
            break
        pos += step
    return chunks


videos = []
skipped = []
for index, entry in enumerate(entries, 1):
    video_id = entry["id"]
    title = entry.get("title") or video_id
    print(f"[{index}/{len(entries)}] {title}")
    try:
        transcript = ytt.fetch(video_id=video_id, languages=TRANSCRIPT_LANGS)
        snippets = transcript.snippets  # 1.x API
    except Exception as exc:  # no captions / disabled / private
        print(f"    -> skipped ({type(exc).__name__})")
        skipped.append({"video_id": video_id, "title": title, "reason": str(exc)})
        continue

    chunks = chunk_transcript(snippets)
    if not chunks:
        continue

    videos.append(
        {
            "id": str(len(videos) + 1),
            "video_id": video_id,
            "title": re.sub(r"\s+", " ", title).strip(),
            "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "chunks": chunks,
        }
    )

total_chunks = sum(len(v["chunks"]) for v in videos)
print(f"\nIndexed {len(videos)} videos | {total_chunks} chunks | {len(skipped)} skipped")
if skipped:
    print("Skipped videos (usually missing captions):")
    for item in skipped:
        print(f"  - {item['video_id']}: {item['reason']}")

# --- Cell 5: save + download ---------------------------------
with open(OUTPUT_FILE, "w", encoding="utf-8") as handle:
    json.dump(videos, handle, ensure_ascii=False, indent=2)

from google.colab import files  # noqa: E402

files.download(OUTPUT_FILE)
print(
    "\nDone! Place transcripts.json in your project's /public folder "
    "and reload the app. The search index rebuilds entirely in the browser."
)
