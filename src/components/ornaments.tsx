import { useId, type CSSProperties } from "react";

/** Hand-drawn lantern mark — the brand glyph. */
export function LanternMark({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 64" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="24" cy="5.5" r="3.1" stroke="currentColor" strokeWidth="2" opacity="0.9" />
      <path d="M24 9.5v3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M15 17.5c2.4-3.5 5.4-5.2 9-5.2s6.6 1.7 9 5.2H15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 17.5h21l-3 29.8c-.3 2.9-2.1 5.4-7.5 5.4s-7.2-2.5-7.5-5.4l-3-29.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16.5 22.5h15" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      <path
        d="M24 24.5c-3.1 3.8-4.7 6.7-4.7 9 0 3 2.1 5.1 4.7 5.1s4.7-2.1 4.7-5.1c0-2.3-1.6-5.2-4.7-9Z"
        fill={`url(#${id})`}
        className="animate-flame"
        style={{ transformOrigin: "24px 34px" }}
      />
      <defs>
        <linearGradient id={id} x1="24" y1="24" x2="24" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE7B0" />
          <stop offset="1" stopColor="#E8A33D" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Line — diamond — eight-point star — diamond — line flourish. */
export function ArabesqueDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 24" fill="none" className={className} aria-hidden="true">
      <path d="M0 12h92" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <path d="M168 12h92" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <rect x="99" y="7" width="10" height="10" transform="rotate(45 104 12)" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <rect x="147" y="7" width="10" height="10" transform="rotate(45 152 12)" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <g transform="translate(130 12)">
        <rect x="-6.5" y="-6.5" width="13" height="13" stroke="currentColor" strokeWidth="1.2" />
        <rect x="-6.5" y="-6.5" width="13" height="13" transform="rotate(45)" stroke="currentColor" strokeWidth="1.2" />
        <circle r="2" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Bismillah rendered in the display face — the traditional opening. */
export function Bismillah({ className = "" }: { className?: string }) {
  return (
    <p dir="rtl" lang="ar" className={`font-display ${className}`}>
      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
    </p>
  );
}
