"use client";

import type { ReactNode } from "react";
import styled, { keyframes } from "styled-components";
import { color } from "@oxumi/ui/design/tokens";

// Small line illustrations for the use-case cards. They draw in currentColor,
// which the card sets to its tone. The few solid fills go through `style`:
// a token is a CSS variable, which an SVG presentation attribute cannot read.

const pulse = keyframes`
  0% { transform: scale(0.6); opacity: 0.7; }
  80%, 100% { transform: scale(1.9); opacity: 0; }
`;

const march = keyframes`
  to { stroke-dashoffset: -16; }
`;

const Svg = styled.svg`
  width: 100%;
  height: auto;
  color: var(--tone);
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  overflow: visible;

  .ping {
    transform-box: fill-box;
    transform-origin: center;
  }
  /* The loops play while the card is hovered; at rest the drawing is a still. */
  [data-spot]:hover & .ping {
    animation: ${pulse} 2.6s ${({ theme }) => theme.motion.ease} infinite;
  }
  [data-spot]:hover & .march {
    animation: ${march} 1.4s linear infinite;
  }
`;

function Art({ children }: { children: ReactNode }) {
  return (
    <Svg viewBox="0 0 240 132" aria-hidden="true" focusable="false">
      {children}
    </Svg>
  );
}

// Clinics: a week of slots, one given up, one newly booked.
export function ClinicArt() {
  const cols = [0, 1, 2, 3, 4];
  const rows = [0, 1, 2];
  const x = (c: number) => 14 + c * 44;
  const y = (r: number) => 32 + r * 32;
  return (
    <Art>
      {cols.map((c) => (
        <path key={c} d={`M${x(c) + 11} 16h14`} opacity={0.35} />
      ))}
      {rows.flatMap((r) =>
        cols.map((c) => {
          const old = r === 0 && c === 1;
          const next = r === 2 && c === 3;
          if (old || next) return null;
          return (
            <rect key={`${r}-${c}`} x={x(c)} y={y(r)} width={36} height={24} rx={6} opacity={0.22} />
          );
        }),
      )}
      <rect x={x(1)} y={y(0)} width={36} height={24} rx={6} strokeDasharray="3 4" opacity={0.7} />
      <path d={`M${x(1) + 14} ${y(0) + 8}l8 8m0-8l-8 8`} opacity={0.7} />
      <path d={`M${x(1) + 18} ${y(0) + 30}C${x(1) + 18} ${y(2) + 4} ${x(2) + 10} ${y(2) + 12} ${x(3) - 10} ${y(2) + 12}`} strokeDasharray="2 6" className="march" />
      <path d={`M${x(3) - 15} ${y(2) + 7}l6 5-6 5`} />
      <circle className="ping" cx={x(3) + 18} cy={y(2) + 12} r={14} />
      <rect x={x(3)} y={y(2)} width={36} height={24} rx={6} fill="currentColor" fillOpacity={0.2} />
      <path d={`M${x(3) + 12} ${y(2) + 12}l4.5 4.5 8-9`} strokeWidth={2} />
    </Art>
  );
}

// Fleets: a route, the truck part-way along it, and the revised ETA.
export function FleetArt() {
  return (
    <Art>
      <path d="M8 40h72M120 12v36M8 80h44M150 120V96M196 60h40" opacity={0.14} />
      <path d="M22 106C62 106 58 58 102 58S150 86 176 62 200 30 220 30" strokeDasharray="2 6" opacity={0.5} className="march" />
      <path d="M22 106C62 106 58 58 102 58" strokeWidth={2} />
      <circle cx={22} cy={106} r={4} style={{ fill: color.surface }} />
      <circle className="ping" cx={102} cy={58} r={9} />
      <circle cx={102} cy={58} r={5.5} fill="currentColor" />
      <path d="M220 44c-7-8-10-12-10-16a10 10 0 0 1 20 0c0 4-3 8-10 16z" fill="currentColor" fillOpacity={0.18} />
      <circle cx={220} cy={28} r={3} fill="currentColor" stroke="none" />
      <rect x={118} y={92} width={78} height={26} rx={13} style={{ fill: color.surface }} opacity={0.9} />
      <rect x={118} y={92} width={78} height={26} rx={13} opacity={0.45} />
      <circle cx={133} cy={105} r={6} />
      <path d="M133 101.5v3.5l2.5 1.5" />
      <path d="M146 105h14" opacity={0.3} strokeDasharray="1 3" />
      <path d="M166 105h20" strokeWidth={2} />
    </Art>
  );
}

// Real estate: a skyline, one property picked out, and a budget range.
export function EstateArt() {
  const buildings = [
    { x: 22, y: 50, w: 34, h: 42 },
    { x: 64, y: 32, w: 30, h: 60 },
    { x: 104, y: 58, w: 40, h: 34, picked: true },
    { x: 154, y: 24, w: 32, h: 68 },
    { x: 194, y: 54, w: 26, h: 38 },
  ];
  return (
    <Art>
      <path d="M10 92h220" opacity={0.3} />
      {buildings.map((b) => (
        <g key={b.x}>
          <rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={3}
            opacity={b.picked ? 1 : 0.3}
            fill={b.picked ? "currentColor" : "none"}
            fillOpacity={0.18}
          />
          {Array.from({ length: Math.floor((b.h - 10) / 10) }, (_, r) => (
            <path
              key={r}
              d={`M${b.x + 7} ${b.y + 9 + r * 10}h${b.w - 14}`}
              strokeDasharray="3 4"
              opacity={b.picked ? 0.7 : 0.22}
            />
          ))}
        </g>
      ))}
      <circle className="ping" cx={124} cy={30} r={10} />
      <path d="M124 50c-8-9-11-14-11-19a11 11 0 0 1 22 0c0 5-3 10-11 19z" style={{ fill: color.surface }} />
      <path d="M124 50c-8-9-11-14-11-19a11 11 0 0 1 22 0c0 5-3 10-11 19z" fill="currentColor" fillOpacity={0.25} />
      <circle cx={124} cy={31} r={3.5} fill="currentColor" stroke="none" />
      <path d="M22 114h198" opacity={0.25} />
      <path d="M82 114h84" strokeWidth={2.5} />
      <circle cx={82} cy={114} r={5} style={{ fill: color.surface }} />
      <circle cx={166} cy={114} r={5} style={{ fill: color.surface }} />
    </Art>
  );
}

// Support desks: a queue of tickets, one triaged as urgent with consent given.
export function SupportArt() {
  const tickets = [
    { y: 10, level: 1, len: 70 },
    { y: 50, level: 3, len: 92, picked: true },
    { y: 90, level: 2, len: 56 },
  ];
  return (
    <Art>
      {tickets.map((t) => (
        <g key={t.y} opacity={t.picked ? 1 : 0.38}>
          <rect
            x={t.picked ? 18 : 30}
            y={t.y}
            width={t.picked ? 196 : 180}
            height={32}
            rx={10}
            fill={t.picked ? "currentColor" : "none"}
            fillOpacity={0.14}
          />
          <circle cx={t.picked ? 36 : 48} cy={t.y + 16} r={4} fill={t.picked ? "currentColor" : "none"} />
          <path d={`M${t.picked ? 50 : 62} ${t.y + 12}h${t.len}`} />
          <path d={`M${t.picked ? 50 : 62} ${t.y + 20}h${t.len * 0.6}`} opacity={0.5} />
          {[0, 1, 2].map((bar) => (
            <path
              key={bar}
              d={`M${(t.picked ? 172 : 180) + bar * 7} ${t.y + 23}v${-(5 + bar * 4)}`}
              strokeWidth={2.5}
              opacity={bar < t.level ? 1 : 0.25}
            />
          ))}
        </g>
      ))}
      <circle className="ping" cx={214} cy={50} r={10} />
      <circle cx={214} cy={50} r={10} style={{ fill: color.surface }} />
      <circle cx={214} cy={50} r={10} fill="currentColor" fillOpacity={0.2} />
      <path d="M209.5 50.5l3 3 6-6.5" strokeWidth={2} />
    </Art>
  );
}

// ---- Second-tier calls: smaller scenes in the same hand ---------------------

export function PharmacyArt() {
  return (
    <Art>
      <path d="M72 60a21 21 0 1 0 7 28" strokeDasharray="2 6" className="march" />
      <path d="M71 96l8-8 1 11" />
      <rect x={98} y={26} width={32} height={14} rx={4} opacity={0.6} />
      <rect x={92} y={40} width={44} height={66} rx={8} />
      <rect x={100} y={58} width={28} height={28} rx={4} fill="currentColor" fillOpacity={0.2} />
      <path d="M114 65v14M107 72h14" strokeWidth={2} />
      <circle className="ping" cx={164} cy={58} r={9} />
      <circle cx={164} cy={58} r={8} fill="currentColor" fillOpacity={0.2} />
      <path d="M158 58h12" />
      <rect x={150} y={86} width={36} height={15} rx={7.5} opacity={0.6} />
      <path d="M168 86v15" opacity={0.6} />
    </Art>
  );
}

export function SchoolArt() {
  return (
    <Art>
      <rect x={62} y={22} width={74} height={92} rx={7} opacity={0.5} />
      <path d="M76 42h46M76 56h46M76 70h28" opacity={0.4} />
      <rect x={76} y={86} width={12} height={12} rx={3} fill="currentColor" fillOpacity={0.2} />
      <path d="M79 92l2.5 2.5 4-5M96 92h26" />
      <path d="M176 30l30 12-30 12-30-12z" fill="currentColor" fillOpacity={0.18} />
      <path d="M160 48v12c9 7 23 7 32 0V48M206 42v16" />
      <circle className="ping" cx={206} cy={62} r={5} />
      <circle cx={206} cy={62} r={3} fill="currentColor" stroke="none" />
      <path d="M150 92h44M150 104h28" opacity={0.3} strokeDasharray="3 5" />
    </Art>
  );
}

export function SocietyArt() {
  const flats = [0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => ({ r, c })));
  return (
    <Art>
      <path d="M40 110h160" opacity={0.3} />
      <rect x={62} y={22} width={84} height={88} rx={5} opacity={0.5} />
      {flats.map(({ r, c }) => {
        const due = r === 1 && c === 2;
        return (
          <rect
            key={`${r}-${c}`}
            x={74 + c * 22}
            y={32 + r * 19}
            width={16}
            height={12}
            rx={2.5}
            opacity={due ? 1 : 0.3}
            fill={due ? "currentColor" : "none"}
            fillOpacity={0.3}
          />
        );
      })}
      <path d="M136 57c20 0 26 6 30 16" strokeDasharray="2 6" className="march" />
      <circle className="ping" cx={178} cy={86} r={14} />
      <circle cx={178} cy={86} r={17} fill="currentColor" fillOpacity={0.18} />
      <path d="M171 78h14M171 84h14M173 78c9 0 9 12 0 12l9 8" />
    </Art>
  );
}

export function GarageArt() {
  return (
    <Art>
      <path d="M36 92h168" opacity={0.3} />
      <path d="M50 88V74l24-6 16-20h60l14 20 26 6v14z" fill="currentColor" fillOpacity={0.12} />
      <path d="M96 66h58" opacity={0.5} />
      <circle cx={86} cy={90} r={10} style={{ fill: color.surface }} />
      <circle cx={156} cy={90} r={10} style={{ fill: color.surface }} />
      <circle cx={196} cy={30} r={8} opacity={0.7} />
      <path d="M190 36l-16 16" strokeWidth={2.5} opacity={0.7} />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx={92 + i * 14}
          cy={116}
          r={4}
          fill={i < 4 ? "currentColor" : "none"}
          opacity={i < 4 ? 1 : 0.4}
        />
      ))}
      <circle className="ping" cx={134} cy={116} r={5} />
    </Art>
  );
}

export function KiranaArt() {
  return (
    <Art>
      <path d="M60 40h120l10 20H50z" fill="currentColor" fillOpacity={0.14} />
      <path d="M50 60a11.7 11.7 0 0 0 23.3 0 11.7 11.7 0 0 0 23.4 0 11.7 11.7 0 0 0 23.3 0 11.7 11.7 0 0 0 23.3 0 11.7 11.7 0 0 0 23.4 0 11.7 11.7 0 0 0 23.3 0" />
      <path d="M60 72v42h120V72" opacity={0.5} />
      <rect x={72} y={84} width={24} height={30} rx={3} opacity={0.4} />
      <rect x={110} y={82} width={58} height={9} rx={4.5} opacity={0.3} />
      <rect x={110} y={95} width={58} height={9} rx={4.5} fill="currentColor" fillOpacity={0.35} />
      <circle className="ping" cx={168} cy={99.5} r={7} />
      <circle cx={168} cy={99.5} r={7} style={{ fill: color.surface }} />
      <path d="M165 99.5l2.2 2.2 4-4.4" />
    </Art>
  );
}

export function EmiArt() {
  const days = [0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => ({ r, c })));
  return (
    <Art>
      <rect x={58} y={28} width={84} height={80} rx={9} opacity={0.5} />
      <path d="M58 48h84M80 22v12M120 22v12" opacity={0.5} />
      {days.map(({ r, c }) =>
        r === 0 && c === 1 ? null : (
          <circle key={`${r}-${c}`} cx={73 + c * 18} cy={62 + r * 16} r={2.5} opacity={0.35} />
        ),
      )}
      <circle className="ping" cx={91} cy={62} r={8} />
      <circle cx={91} cy={62} r={8} fill="currentColor" fillOpacity={0.25} />
      <rect x={122} y={70} width={66} height={42} rx={8} style={{ fill: color.surface }} />
      <rect x={122} y={70} width={66} height={42} rx={8} fill="currentColor" fillOpacity={0.12} />
      <path d="M122 84h66" strokeWidth={2.5} />
      <path d="M132 100h18" opacity={0.5} />
    </Art>
  );
}

export function RsvpArt() {
  return (
    <Art>
      <rect x={82} y={18} width={76} height={50} rx={5} fill="currentColor" fillOpacity={0.12} />
      <circle cx={104} cy={38} r={5} fill="currentColor" />
      <circle cx={120} cy={38} r={5} fill="currentColor" />
      <circle cx={136} cy={38} r={5} opacity={0.5} />
      <rect x={60} y={52} width={120} height={62} rx={7} style={{ fill: color.surface }} />
      <rect x={60} y={52} width={120} height={62} rx={7} opacity={0.6} />
      <path d="M60 58l60 34 60-34" opacity={0.6} />
      <circle className="ping" cx={180} cy={52} r={10} />
      <circle cx={180} cy={52} r={11} style={{ fill: color.surface }} />
      <circle cx={180} cy={52} r={11} fill="currentColor" fillOpacity={0.2} />
      <path d="M175 52.5l3.5 3.5 6.5-7" strokeWidth={2} />
    </Art>
  );
}

export function DonorArt() {
  return (
    <Art>
      <path d="M30 84h52l8-16 10 30 9-22 5 8" opacity={0.5} />
      <path d="M150 84h60" opacity={0.3} strokeDasharray="2 6" className="march" />
      <circle className="ping" cx={126} cy={74} r={22} />
      <path d="M126 22c-16 22-26 36-26 50a26 26 0 0 0 52 0c0-14-10-28-26-50z" style={{ fill: color.surface }} />
      <path d="M126 22c-16 22-26 36-26 50a26 26 0 0 0 52 0c0-14-10-28-26-50z" fill="currentColor" fillOpacity={0.2} />
      <path d="M126 62v20M116 72h20" strokeWidth={2} />
    </Art>
  );
}

// Lookup by the `art` key used in ./useCaseData.
export const ART = {
  clinics: ClinicArt,
  fleets: FleetArt,
  "real-estate": EstateArt,
  support: SupportArt,
  pharmacy: PharmacyArt,
  school: SchoolArt,
  society: SocietyArt,
  garage: GarageArt,
  kirana: KiranaArt,
  emi: EmiArt,
  rsvp: RsvpArt,
  donor: DonorArt,
} as const;

export type ArtKey = keyof typeof ART;
