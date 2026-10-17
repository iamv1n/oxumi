// The driver status flow drawn as a graph, with a pulse travelling the path a
// delayed trip takes. Pure SVG and CSS; no client code.

const NODES = [
  { id: "start", x: 40, y: 150, label: "Greeting", kind: "Start" },
  { id: "loc", x: 230, y: 150, label: "Where are you?", kind: "Ask" },
  { id: "sched", x: 440, y: 150, label: "On schedule?", kind: "Ask" },
  { id: "delay", x: 650, y: 50, label: "Reason + new ETA", kind: "Ask" },
  { id: "help", x: 860, y: 150, label: "Need any help?", kind: "Ask" },
  { id: "end", x: 1070, y: 150, label: "Goodbye", kind: "End" },
] as const;

const W = 150;
const H = 60;

const EDGES = [
  "M190 180 H230",
  "M380 180 H440",
  "M590 180 H860",
  "M515 150 C515 80 590 80 650 80",
  "M800 80 C870 80 935 100 935 150",
  "M1010 180 H1070",
];

// The route taken when the driver says they are running late.
const PULSE_PATH =
  "M115 180 H515 M515 150 C515 80 590 80 650 80 H800 C870 80 935 100 935 150 M935 180 H1145";

export default function FlowGraph() {
  return (
    <div className="glass overflow-x-auto rounded-3xl p-6">
      <svg
        viewBox="0 0 1260 250"
        className="min-w-[760px]"
        role="img"
        aria-label="Call flow: greeting, location, schedule, an optional delay branch, help check, goodbye"
      >
        <defs>
          <linearGradient id="edge" x1="0" x2="1">
            <stop offset="0" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#ff8f29" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {EDGES.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="url(#edge)"
            strokeWidth="1.5"
            strokeOpacity="0.45"
            className="draw"
          />
        ))}
        <text x="530" y="118" className="fill-zinc-500 text-[11px]">
          late
        </text>
        <text x="700" y="172" className="fill-zinc-500 text-[11px]">
          on time
        </text>

        <circle r="5" fill="#ffb347" filter="url(#glow)">
          <animateMotion dur="7s" repeatCount="indefinite" path={PULSE_PATH} />
        </circle>

        {NODES.map((node) => (
          <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
            <rect
              width={W}
              height={H}
              rx="14"
              className="fill-zinc-950 stroke-white/15"
            />
            <text x="14" y="24" className="fill-zinc-500 text-[10px] uppercase">
              {node.kind}
            </text>
            <text x="14" y="44" className="fill-zinc-100 text-[13px]">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
