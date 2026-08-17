const MOTES = [
  { left: "8%", top: "22%", size: 3, dur: 6, delay: 0 },
  { left: "16%", top: "58%", size: 2, dur: 7.5, delay: 1.2 },
  { left: "28%", top: "36%", size: 2, dur: 5.5, delay: 2.1 },
  { left: "52%", top: "18%", size: 3, dur: 8, delay: 0.6 },
  { left: "68%", top: "42%", size: 2, dur: 6.5, delay: 1.8 },
  { left: "79%", top: "26%", size: 3, dur: 7, delay: 0.3 },
  { left: "88%", top: "62%", size: 2, dur: 5.8, delay: 2.6 },
  { left: "42%", top: "72%", size: 2, dur: 8.5, delay: 1.5 },
];

/** Layered ambient background: theme-aware washes, drifting girih lattice,
 *  a breathing lantern halo, and floating gold dust. Pure CSS/SVG. */
export function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      {/* Theme-resolving radial washes */}
      <div className="ambient-washes absolute inset-0" />

      {/* Drifting Islamic lattice — two depths */}
      <div className="girih-layer absolute -inset-[240px] animate-drift-slow opacity-[0.09] dark:opacity-[0.055]" />
      <div
        className="girih-layer absolute -inset-[240px] animate-drift-slower opacity-[0.05] dark:opacity-[0.03]"
        style={{ backgroundSize: "140px 140px" }}
      />

      {/* The lantern's breathing halo behind the search stage */}
      <div
        className="absolute left-1/2 top-[120px] h-[420px] w-[min(760px,92vw)] -translate-x-1/2 animate-lantern-breathe rounded-full blur-[110px]"
        style={{ backgroundColor: "var(--halo-1)" }}
      />

      {/* Floating brass dust */}
      {MOTES.map((mote, i) => (
        <span
          key={i}
          className="absolute animate-lantern-breathe rounded-full"
          style={{
            left: mote.left,
            top: mote.top,
            width: mote.size,
            height: mote.size,
            animationDuration: `${mote.dur}s`,
            animationDelay: `${mote.delay}s`,
            backgroundColor: "var(--brass)",
            opacity: 0.45,
            boxShadow: "0 0 6px var(--glow)",
          }}
        />
      ))}

      {/* Vignette to focus the eye on the content column */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_40%,transparent_55%,var(--vignette))]"
      />
    </div>
  );
}
