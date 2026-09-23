'use client'

import { useState } from 'react'

export type FatigueLevel = 0 | 1 | 2 | 3
export type MuscleEntry = { fatigueLevel: FatigueLevel; volume?: number; sets?: number; lastTrainedAt?: string }
export type MuscleData = Record<string, MuscleEntry>

// ─── Color palettes ───────────────────────────────────────────────────────────

const FATIGUE_COLORS: Record<FatigueLevel, string> = {
  0: '#E2E8F0',
  1: '#FDE68A',
  2: '#FDBA74',
  3: '#EA580C',
}

const SESSION_COLORS: Record<FatigueLevel, string> = {
  0: '#E2E8F0',
  1: '#BFDBFE',
  2: '#60A5FA',
  3: '#1E3A5F',
}

const BG      = '#EEF2F7'
const OUTLINE = '#9AADBF'

function getColor(keys: string[], data: MuscleData, mode: 'fatigue' | 'session'): string {
  const palette = mode === 'session' ? SESSION_COLORS : FATIGUE_COLORS
  let max: FatigueLevel = 0
  for (const k of keys) {
    const lvl = data[k]?.fatigueLevel ?? 0
    if (lvl > max) max = lvl as FatigueLevel
  }
  return palette[max]
}

// ─── SVG Filter: merges overlapping body-part shapes into a single silhouette ─
//
// Pipeline:
//  1. Blur SourceAlpha → merges nearby shapes into one mass
//  2. Threshold (feColorMatrix) → sharp merged body outline
//  3. Dilate merged → ring for the outer border
//  4. Flood outline color inside ring
//  5. Flood fill color inside merged
//  6. Compose: outline ring + fill body
//
// Result: one clean, seamless human silhouette — no visible segment seams.

function BodyFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-14%" y="-4%" width="128%" height="108%" colorInterpolationFilters="sRGB">
      {/* Step 1: blur alpha to bridge gaps between overlapping body parts */}
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="blurred" />
      {/* Step 2: threshold — keep only well-covered areas (merge nearby shapes) */}
      <feColorMatrix
        in="blurred" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 28 -7"
        result="merged"
      />
      {/* Step 3: dilate merged shape to get the outline ring area */}
      <feMorphology in="merged" operator="dilate" radius="0.75" result="dilated" />
      {/* Step 4: isolate the ring (dilated minus merged) */}
      <feComposite in="dilated" in2="merged" operator="out" result="outlineRing" />
      {/* Step 5: color the outline ring */}
      <feFlood floodColor={OUTLINE} result="outlineFlood" />
      <feComposite in="outlineFlood" in2="outlineRing" operator="in" result="coloredOutline" />
      {/* Step 6: fill the interior with body color */}
      <feFlood floodColor={BG} result="fillFlood" />
      <feComposite in="fillFlood" in2="merged" operator="in" result="coloredFill" />
      {/* Step 7: compose — outline border + fill interior */}
      <feMerge>
        <feMergeNode in="coloredOutline" />
        <feMergeNode in="coloredFill" />
      </feMerge>
    </filter>
  )
}

// ─── Body shapes ──────────────────────────────────────────────────────────────
// These shapes don't need precise outlines — the filter merges and re-outlines them.
// The only requirement: shapes must OVERLAP at every joint (8-12px overlap)
// so the Gaussian blur bridges the joint gaps.
//
// Shape sizes — 100×215 viewBox:
//   Head: cy=12 (r≈10), Neck: y=18-30, Torso: y=26-95
//   Arms: y=24-122, inner at x=30-32 (left) / x=68-70 (right)
//   Legs: y=88-212, inner at x=47 (left) / x=53 (right)

function BodyShapes() {
  const s = { fill: BG, stroke: 'none' } as const
  return (
    <>
      {/* ── Head ── */}
      <ellipse cx={50} cy={12} rx={9.5} ry={10.5} {...s} />

      {/* ── Neck — overlaps head (above y=22) and torso (below y=26) ── */}
      <rect x={46} y={18} width={8} height={14} rx={2} {...s} />

      {/* ── Torso: shoulders → natural waist taper → hips (y=26 to y=93) ── */}
      <path
        d="M 33,26
           C 26,29 24,36 24,44 L 24,58
           C 24,66 25,72 28,78
           C 30,82 32,86 35,89 L 42,93 L 58,93 L 65,89
           C 68,86 70,82 72,78
           C 75,72 76,66 76,58 L 76,44
           C 76,36 74,29 67,26 Z"
        {...s}
      />

      {/* ── Left arm — outer x=12, inner x=32 (overlaps torso ≥8px), tapers to wrist ── */}
      <path
        d="M 26,24
           C 20,28 14,40 12,54 L 12,76
           C 12,82 15,86 22,88 L 24,108
           C 24,116 26,120 30,120
           C 32,121 34,121 36,120
           C 36,112 35,100 34,88
           C 33,74 32,58 32,44
           C 31,34 29,26 26,24 Z"
        {...s}
      />

      {/* ── Right arm (mirror) ── */}
      <path
        d="M 74,24
           C 80,28 86,40 88,54 L 88,76
           C 88,82 85,86 78,88 L 76,108
           C 76,116 74,120 70,120
           C 68,121 66,121 64,120
           C 64,112 65,100 66,88
           C 67,74 68,58 68,44
           C 69,34 71,26 74,24 Z"
        {...s}
      />

      {/* ── Left leg — inner x=47, top overlaps torso hip area (y=87-93) ── */}
      <path
        d="M 38,87
           C 30,93 27,107 26,120 L 25,143
           C 25,151 28,157 34,161
           C 32,166 30,174 30,183 L 28,198
           C 28,206 34,210 44,210 C 46,210 47,208 47,206
           L 47,196 L 47,182 L 47,166 L 47,150 L 47,130
           C 47,118 46,106 46,96
           C 46,91 43,88 40,88 Z"
        {...s}
      />

      {/* ── Right leg (mirror) — inner x=53 ── */}
      <path
        d="M 62,87
           C 70,93 73,107 74,120 L 75,143
           C 75,151 72,157 66,161
           C 68,166 70,174 70,183 L 72,198
           C 72,206 66,210 56,210 C 54,210 53,208 53,206
           L 53,196 L 53,182 L 53,166 L 53,150 L 53,130
           C 53,118 54,106 54,96
           C 54,91 57,88 60,88 Z"
        {...s}
      />
    </>
  )
}

// ─── Front view ───────────────────────────────────────────────────────────────

function FrontBody({ data, mode, filterId }: { data: MuscleData; mode: 'fatigue' | 'session'; filterId: string }) {
  const c = (keys: string[]) => getColor(keys, data, mode)

  const delt    = c(['shoulders', 'delts'])
  const chest   = c(['chest', 'pectorals'])
  const bicep   = c(['upper arms', 'biceps'])
  const forearm = c(['lower arms', 'forearms'])
  const abs     = c(['waist', 'abs'])
  const quad    = c(['upper legs', 'quads'])
  const calf    = c(['lower legs', 'calves'])

  return (
    <svg viewBox="0 0 100 215" aria-label="Vista frontal" className="w-full h-auto">
      <defs><BodyFilter id={filterId} /></defs>

      {/* Filtered body silhouette */}
      <g filter={`url(#${filterId})`}>
        <BodyShapes />
      </g>

      {/* Muscle overlays — rendered above filter (retain their colors) */}
      <ellipse cx={19}  cy={40}  rx={7}  ry={5}  fill={delt}    opacity={0.82} />
      <ellipse cx={81}  cy={40}  rx={7}  ry={5}  fill={delt}    opacity={0.82} />
      <ellipse cx={50}  cy={55}  rx={16} ry={11} fill={chest}   opacity={0.82} />
      <ellipse cx={17}  cy={57}  rx={5}  ry={11} fill={bicep}   opacity={0.82} />
      <ellipse cx={83}  cy={57}  rx={5}  ry={11} fill={bicep}   opacity={0.82} />
      <ellipse cx={17}  cy={98}  rx={5}  ry={10} fill={forearm} opacity={0.82} />
      <ellipse cx={83}  cy={98}  rx={5}  ry={10} fill={forearm} opacity={0.82} />
      <ellipse cx={50}  cy={70}  rx={7}  ry={12} fill={abs}     opacity={0.82} />
      <ellipse cx={37}  cy={122} rx={9}  ry={16} fill={quad}    opacity={0.82} />
      <ellipse cx={63}  cy={122} rx={9}  ry={16} fill={quad}    opacity={0.82} />
      <ellipse cx={37}  cy={180} rx={8}  ry={13} fill={calf}    opacity={0.82} />
      <ellipse cx={63}  cy={180} rx={8}  ry={13} fill={calf}    opacity={0.82} />
    </svg>
  )
}

// ─── Back view ────────────────────────────────────────────────────────────────

function BackBody({ data, mode, filterId }: { data: MuscleData; mode: 'fatigue' | 'session'; filterId: string }) {
  const c = (keys: string[]) => getColor(keys, data, mode)

  const trap      = c(['neck', 'traps'])
  const upperBack = c(['back', 'upper back'])
  const lat       = c(['back', 'lats'])
  const tricep    = c(['upper arms', 'triceps'])
  const forearm   = c(['lower arms', 'forearms'])
  const lowerBack = c(['back', 'lower back'])
  const glute     = c(['upper legs', 'glutes'])
  const hamstring = c(['upper legs', 'hamstrings'])
  const calf      = c(['lower legs', 'calves'])

  return (
    <svg viewBox="0 0 100 215" aria-label="Vista posterior" className="w-full h-auto">
      <defs><BodyFilter id={filterId} /></defs>

      <g filter={`url(#${filterId})`}>
        <BodyShapes />
      </g>

      <ellipse cx={50}  cy={40}  rx={14} ry={7}  fill={trap}      opacity={0.82} />
      <ellipse cx={50}  cy={54}  rx={12} ry={8}  fill={upperBack} opacity={0.82} />
      <ellipse cx={30}  cy={66}  rx={11} ry={14} fill={lat}       opacity={0.82} />
      <ellipse cx={70}  cy={66}  rx={11} ry={14} fill={lat}       opacity={0.82} />
      <ellipse cx={17}  cy={57}  rx={5}  ry={12} fill={tricep}    opacity={0.82} />
      <ellipse cx={83}  cy={57}  rx={5}  ry={12} fill={tricep}    opacity={0.82} />
      <ellipse cx={17}  cy={98}  rx={5}  ry={10} fill={forearm}   opacity={0.82} />
      <ellipse cx={83}  cy={98}  rx={5}  ry={10} fill={forearm}   opacity={0.82} />
      <ellipse cx={50}  cy={78}  rx={10} ry={7}  fill={lowerBack} opacity={0.82} />
      <ellipse cx={37}  cy={110} rx={12} ry={9}  fill={glute}     opacity={0.82} />
      <ellipse cx={63}  cy={110} rx={12} ry={9}  fill={glute}     opacity={0.82} />
      <ellipse cx={37}  cy={130} rx={9}  ry={15} fill={hamstring} opacity={0.82} />
      <ellipse cx={63}  cy={130} rx={9}  ry={15} fill={hamstring} opacity={0.82} />
      <ellipse cx={37}  cy={180} rx={8}  ry={13} fill={calf}      opacity={0.82} />
      <ellipse cx={63}  cy={180} rx={8}  ry={13} fill={calf}      opacity={0.82} />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MuscleMapWebProps {
  data: MuscleData
  mode?: 'fatigue' | 'session'
  compact?: boolean
}

export default function MuscleMapWeb({ data, mode = 'fatigue', compact = false }: MuscleMapWebProps) {
  const [view, setView] = useState<'front' | 'back'>('front')

  const palette = mode === 'session' ? SESSION_COLORS : FATIGUE_COLORS

  const legendItems: [FatigueLevel, string][] = mode === 'session'
    ? [[0, 'Sin trabajar'], [3, 'En sesión']]
    : [[0, 'Recuperado'], [1, 'Leve'], [2, 'Moderado'], [3, 'Intenso']]

  // ── Compact ────────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-14 shrink-0">
          {view === 'front'
            ? <FrontBody data={data} mode={mode} filterId="mq-compact-f" />
            : <BackBody  data={data} mode={mode} filterId="mq-compact-b" />
          }
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 w-fit">
            {(['front', 'back'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  view === v
                    ? 'bg-white text-[#1e3a5f] shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {v === 'front' ? 'Frente' : 'Espalda'}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {legendItems.map(([level, label]) => (
              <div key={level} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm border border-slate-200"
                  style={{ backgroundColor: palette[level] }}
                />
                <span className="text-[10px] text-slate-500 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Normal: front + back side by side ─────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-end justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Frente</span>
          <div className="w-24">
            <FrontBody data={data} mode={mode} filterId="mq-normal-f" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Espalda</span>
          <div className="w-24">
            <BackBody data={data} mode={mode} filterId="mq-normal-b" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 justify-center">
        {legendItems.map(([level, label]) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm border border-slate-200"
              style={{ backgroundColor: palette[level] }}
            />
            <span className="text-xs text-slate-500 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function buildSessionMuscleData(muscleKeys: string[]): MuscleData {
  const data: MuscleData = {}
  for (const key of muscleKeys) {
    if (key) data[key.toLowerCase()] = { fatigueLevel: 3 }
  }
  return data
}
