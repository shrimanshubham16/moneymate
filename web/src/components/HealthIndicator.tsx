import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import "./HealthIndicator.css";

type HealthCategory = "good" | "ok" | "not_well" | "worrisome" | "unavailable";

interface HealthIndicatorProps {
  category: HealthCategory;
  remaining: number | null;
  healthPct?: number;
  currencySymbol?: string;
  onClick?: () => void;
}

// ─── Pixel Art Sprite Data ──────────────────────────────────────────
// Each sprite is a 2D array of hex color strings. Empty string = transparent.
const _ = "";

// Color palette
const R = "#E52521"; // Mario red
const B = "#0050B3"; // Mario blue / overalls
const S = "#FFB178"; // Skin tone
const H = "#6B3507"; // Hair / brown
const W = "#FFFFFF"; // White
const G = "#00A800"; // Green
const Y = "#FFB800"; // Yellow / gold
const O = "#FF8A00"; // Orange
const BK = "#1A1A2E";// Dark / black
const DG = "#374151";// Dark grey
const FR = "#FF4500"; // Fire red

// Star Mario (16x16) - triumphant pose, arm raised
const STAR_MARIO: string[][] = [
  [_,_,_,_,_,Y,Y,Y,Y,Y,_,_,_,_,_,_],
  [_,_,_,Y,Y,Y,Y,Y,Y,Y,Y,_,_,_,_,_],
  [_,_,_,H,H,H,S,S,BK,S,_,_,_,_,_,_],
  [_,_,H,S,H,S,S,S,BK,S,S,S,_,_,_,_],
  [_,_,H,S,H,H,S,S,S,BK,S,S,S,_,_,_],
  [_,_,H,H,S,S,S,S,BK,BK,BK,_,_,_,_,_],
  [_,_,_,_,S,S,S,S,S,S,_,_,_,_,_,_],
  [_,_,Y,Y,B,Y,Y,Y,B,_,_,_,_,_,_,_],
  [_,Y,Y,Y,B,Y,Y,B,Y,Y,Y,_,_,_,_,_],
  [S,S,Y,Y,B,B,B,B,Y,Y,S,S,_,_,_,_],
  [S,S,S,Y,Y,B,B,Y,Y,S,S,S,_,_,_,_],
  [S,S,Y,Y,B,B,B,B,Y,Y,_,_,_,_,_,_],
  [_,_,_,B,B,B,_,B,B,B,_,_,_,_,_,_],
  [_,_,B,B,B,_,_,_,B,B,B,_,_,_,_,_],
  [_,H,H,H,_,_,_,_,_,H,H,H,_,_,_,_],
  [_,H,H,H,_,_,_,_,_,H,H,H,_,_,_,_],
];

// Fire Mario (16x16) - standing with fire hand
const FIRE_MARIO: string[][] = [
  [_,_,_,_,_,W,W,W,W,W,_,_,_,_,_,_],
  [_,_,_,W,W,W,W,W,W,W,W,_,_,_,_,_],
  [_,_,_,H,H,H,S,S,BK,S,_,_,_,_,_,_],
  [_,_,H,S,H,S,S,S,BK,S,S,S,_,_,_,_],
  [_,_,H,S,H,H,S,S,S,BK,S,S,S,_,_,_],
  [_,_,H,H,S,S,S,S,BK,BK,BK,_,_,_,_,_],
  [_,_,_,_,S,S,S,S,S,S,_,_,_,_,_,_],
  [_,_,_,R,R,W,R,R,_,_,FR,O,_,_,_,_],
  [_,_,R,R,R,W,R,W,R,R,O,FR,O,_,_,_],
  [_,S,R,R,R,W,W,W,R,R,S,FR,_,_,_,_],
  [_,S,S,R,W,R,R,W,R,S,S,_,_,_,_,_],
  [_,_,S,R,R,R,R,R,R,S,_,_,_,_,_,_],
  [_,_,_,R,R,R,_,R,R,R,_,_,_,_,_,_],
  [_,_,R,R,R,_,_,_,R,R,R,_,_,_,_,_],
  [_,H,H,H,_,_,_,_,_,H,H,H,_,_,_,_],
  [_,H,H,H,_,_,_,_,_,H,H,H,_,_,_,_],
];

// Small Mario (12x16) - smaller, more vulnerable
const SMALL_MARIO: string[][] = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,R,R,R,R,R,_,_,_,_,_,_],
  [_,_,_,R,R,R,R,R,R,R,R,_,_,_,_,_],
  [_,_,_,H,H,H,S,S,BK,S,_,_,_,_,_,_],
  [_,_,H,S,H,S,S,S,BK,S,S,S,_,_,_,_],
  [_,_,_,_,S,S,S,S,S,S,_,_,_,_,_,_],
  [_,_,_,R,R,B,R,R,R,_,_,_,_,_,_,_],
  [_,_,R,R,R,B,R,B,R,R,_,_,_,_,_,_],
  [_,_,R,R,B,B,B,B,R,R,_,_,_,_,_,_],
  [_,_,_,_,B,B,_,B,B,_,_,_,_,_,_,_],
  [_,_,_,B,B,_,_,_,B,B,_,_,_,_,_,_],
  [_,_,H,H,H,_,_,_,H,H,H,_,_,_,_,_],
  [_,_,H,H,H,_,_,_,H,H,H,_,_,_,_,_],
];

// Hurt Mario (16x16) - falling/tumbling
const HURT_MARIO: string[][] = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,H,H,H,_,_,_,_,_,_,_,_,_],
  [_,_,_,H,H,H,_,_,_,_,_,_,_,_,_,_],
  [_,_,R,R,R,R,R,R,R,_,_,_,_,_,_,_],
  [_,R,R,R,R,R,R,R,R,R,_,_,_,_,_,_],
  [_,_,S,BK,S,S,S,H,H,H,_,_,_,_,_,_],
  [_,S,S,BK,S,S,H,S,H,S,_,_,_,_,_,_],
  [_,_,S,S,S,S,S,_,_,_,_,_,_,_,_,_],
  [_,_,_,B,B,R,R,R,_,_,_,_,_,_,_,_],
  [_,_,B,B,R,R,B,R,R,_,_,_,_,_,_,_],
  [_,_,B,B,B,B,B,R,R,_,_,_,_,_,_,_],
  [_,_,_,B,B,_,B,B,_,_,_,_,_,_,_,_],
  [_,H,H,H,_,_,_,H,H,H,_,_,_,_,_,_],
  [_,H,H,H,_,_,_,H,H,H,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
];

// Question Block (16x16)
const QUESTION_BLOCK: string[][] = [
  [BK,O,O,O,O,O,O,O,O,O,O,O,O,O,O,BK],
  [O,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,H,H,H,H,H,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,H,Y,Y,Y,Y,Y,H,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,Y,Y,H,H,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,Y,H,H,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,H,H,Y,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,H,H,Y,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,H,H,Y,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,H,H,Y,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,H],
  [O,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,H],
  [H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H],
  [BK,H,H,H,H,H,H,H,H,H,H,H,H,H,H,BK],
];

// Coin sprite (8x10)
const COIN: string[][] = [
  [_,_,_,Y,Y,_,_,_],
  [_,_,Y,O,Y,Y,_,_],
  [_,Y,O,Y,O,Y,Y,_],
  [_,Y,O,Y,O,Y,Y,_],
  [_,Y,O,Y,O,Y,Y,_],
  [_,Y,O,Y,O,Y,Y,_],
  [_,Y,O,Y,O,Y,Y,_],
  [_,Y,O,Y,O,Y,Y,_],
  [_,_,Y,O,Y,Y,_,_],
  [_,_,_,Y,Y,_,_,_],
];

// Cloud sprite (20x8)
const CLOUD: string[][] = [
  [_,_,_,_,_,_,W,W,W,_,_,_,W,W,_,_,_,_,_,_],
  [_,_,_,_,W,W,W,W,W,W,_,W,W,W,W,_,_,_,_,_],
  [_,_,_,W,W,W,W,W,W,W,W,W,W,W,W,W,_,_,_,_],
  [_,_,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,_,_,_],
  [_,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,_,_],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,_],
  [_,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,_,_],
  [_,_,_,W,W,W,W,W,W,W,W,W,W,W,W,W,_,_,_,_],
];

// Brick sprite (8x8)
const BRICK: string[][] = [
  [H,H,H,BK,H,H,H,H],
  [H,H,H,BK,H,H,H,H],
  [H,H,H,BK,H,H,H,H],
  [BK,BK,BK,BK,BK,BK,BK,BK],
  [H,H,H,H,H,BK,H,H],
  [H,H,H,H,H,BK,H,H],
  [H,H,H,H,H,BK,H,H],
  [BK,BK,BK,BK,BK,BK,BK,BK],
];

// Power block (filled)
const POWER_FILLED: string[][] = [
  [BK,G,G,G,G,G,G,BK],
  [G,G,G,G,G,G,G,G],
  [G,G,W,W,G,G,G,G],
  [G,G,W,G,G,G,G,G],
  [G,G,G,G,G,G,G,G],
  [G,G,G,G,G,G,G,G],
  [G,G,G,G,G,G,G,G],
  [BK,G,G,G,G,G,G,BK],
];

// Power block (empty)
const POWER_EMPTY: string[][] = [
  [BK,DG,DG,DG,DG,DG,DG,BK],
  [DG,DG,DG,DG,DG,DG,DG,DG],
  [DG,DG,DG,DG,DG,DG,DG,DG],
  [DG,DG,DG,DG,DG,DG,DG,DG],
  [DG,DG,DG,DG,DG,DG,DG,DG],
  [DG,DG,DG,DG,DG,DG,DG,DG],
  [DG,DG,DG,DG,DG,DG,DG,DG],
  [BK,DG,DG,DG,DG,DG,DG,BK],
];

// Star collectible (7x7)
const STAR: string[][] = [
  [_,_,_,Y,_,_,_],
  [_,_,Y,Y,Y,_,_],
  [Y,Y,Y,Y,Y,Y,Y],
  [_,Y,Y,Y,Y,Y,_],
  [_,Y,Y,Y,Y,Y,_],
  [_,Y,_,_,_,Y,_],
  [Y,_,_,_,_,_,Y],
];

// ─── Pixel Sprite Renderer ─────────────────────────────────────────

function PixelSprite({ pixels, pixelSize = 3, className = "" }: { 
  pixels: string[][];
  pixelSize?: number;
  className?: string;
}) {
  const cols = pixels[0]?.length || 0;
  return (
    <div
      className={`pixel-sprite ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${pixelSize}px)`,
        gridAutoRows: `${pixelSize}px`,
        imageRendering: 'pixelated' as any,
      }}
    >
      {pixels.flat().map((color, i) => (
        <div key={i} style={{ background: color || 'transparent' }} />
      ))}
    </div>
  );
}

// ─── Animated Coin Counter ──────────────────────────────────────────

function CoinCounter({ value, isPositive, currencySymbol, animate }: {
  value: number;
  isPositive: boolean;
  currencySymbol: string;
  animate: boolean;
}) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(Math.abs(v)).toLocaleString("en-IN"));
  const [displayText, setDisplayText] = useState("0");

  useEffect(() => {
    if (animate) {
      spring.set(value);
    } else {
      spring.set(0);
    }
  }, [animate, value, spring]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayText(v));
    return unsubscribe;
  }, [display]);

  if (!animate) return null;

  return (
    <span className="mario-score-value">
      {isPositive ? currencySymbol : `-${currencySymbol}`}{displayText}
    </span>
  );
}

// ─── Scene Config Per Health State ──────────────────────────────────

const sceneConfig: Record<string, {
  sprite: string[][];
  skyGradient: string;
  groundColor: string;
  glowColor: string;
  message: string;
  particleType: "stars" | "flames" | "none" | "danger" | "mystery";
  label: string;
}> = {
  good: {
    sprite: STAR_MARIO,
    skyGradient: "linear-gradient(180deg, #1a0a3e 0%, #2d1b69 30%, #0b1220 100%)",
    groundColor: "#00A800",
    glowColor: "#FFD700",
    message: "You're ahead. Keep the pace.",
    particleType: "stars",
    label: "STAR POWER",
  },
  ok: {
    sprite: FIRE_MARIO,
    skyGradient: "linear-gradient(180deg, #1f0f05 0%, #3d1f0a 30%, #0b1220 100%)",
    groundColor: "#8B5E3C",
    glowColor: "#FF8A00",
    message: "Track your spends to stay green.",
    particleType: "flames",
    label: "FIRE POWER",
  },
  not_well: {
    sprite: SMALL_MARIO,
    skyGradient: "linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 30%, #0b1220 100%)",
    groundColor: "#4B4B4B",
    glowColor: "#F97316",
    message: "Tighten up. Shift some spends.",
    particleType: "none",
    label: "SMALL MARIO",
  },
  worrisome: {
    sprite: HURT_MARIO,
    skyGradient: "linear-gradient(180deg, #2b0c0c 0%, #3d1111 30%, #1a0505 100%)",
    groundColor: "#8B2500",
    glowColor: "#EF4444",
    message: "Overspending! Review expenses now.",
    particleType: "danger",
    label: "GAME OVER",
  },
  unavailable: {
    sprite: QUESTION_BLOCK,
    skyGradient: "linear-gradient(180deg, #111827 0%, #1f2937 30%, #0b1220 100%)",
    groundColor: "#374151",
    glowColor: "#6B7280",
    message: "Data not synced yet. E2E encrypted.",
    particleType: "mystery",
    label: "? ? ?",
  },
};

// ─── Floating Particles ─────────────────────────────────────────────

function FloatingCoins() {
  const coins = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: 15 + i * 18,
      delay: i * 0.7,
      duration: 2.5 + Math.random() * 1.5,
    })), []);

  return (
    <div className="mario-particles">
      {coins.map((c) => (
        <motion.div
          key={c.id}
          className="floating-coin"
          style={{ left: `${c.x}%` }}
          animate={{
            y: [0, -30, -50],
            opacity: [0, 1, 0],
            rotate: [0, 20, -20, 0],
          }}
          transition={{
            duration: c.duration,
            repeat: Infinity,
            delay: c.delay,
            ease: "easeOut",
          }}
        >
          <PixelSprite pixels={COIN} pixelSize={2} />
        </motion.div>
      ))}
    </div>
  );
}

function FloatingStars() {
  const stars = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 10 + i * 16,
      delay: i * 0.5,
    })), []);

  return (
    <div className="mario-particles">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="floating-star"
          style={{ left: `${s.x}%` }}
          animate={{
            y: [0, -25, -45],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            delay: s.delay,
            ease: "easeOut",
          }}
        >
          <PixelSprite pixels={STAR} pixelSize={2} />
        </motion.div>
      ))}
    </div>
  );
}

function FloatingFlames() {
  const flames = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      x: 20 + i * 20,
      delay: i * 0.6,
    })), []);

  return (
    <div className="mario-particles">
      {flames.map((f) => (
        <motion.div
          key={f.id}
          className="floating-flame"
          style={{ left: `${f.x}%` }}
          animate={{
            y: [0, -20, -40],
            opacity: [0, 0.9, 0],
            scale: [0.8, 1.2, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: f.delay,
            ease: "easeOut",
          }}
        >
          <div className="flame-pixel" />
        </motion.div>
      ))}
    </div>
  );
}

function DangerFlashes() {
  return (
    <motion.div
      className="danger-overlay"
      animate={{ opacity: [0, 0.15, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─── Power Bar ──────────────────────────────────────────────────────

function PowerBar({ healthPct }: { healthPct: number }) {
  const totalBlocks = 10;
  const clampedPct = Math.max(0, Math.min(100, healthPct));
  const filledBlocks = Math.round((clampedPct / 100) * totalBlocks);

  const barColor = useMemo(() => {
    if (healthPct >= 20) return "#00A800";
    if (healthPct >= 10) return "#FFB800";
    if (healthPct >= 0) return "#FF8A00";
    return "#EF4444";
  }, [healthPct]);

  return (
    <div className="mario-power-bar">
      {Array.from({ length: totalBlocks }, (_, i) => (
        <motion.div
          key={i}
          className={`power-block ${i < filledBlocks ? 'filled' : 'empty'}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.06, duration: 0.3, ease: "backOut" }}
        >
          <PixelSprite
            pixels={i < filledBlocks ? POWER_FILLED : POWER_EMPTY}
            pixelSize={2}
          />
          {i < filledBlocks && (
            <div
              className="power-block-tint"
              style={{ background: barColor }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Brick Ground ───────────────────────────────────────────────────

function BrickGround({ color }: { color: string }) {
  return (
    <div className="mario-ground" style={{ background: color }}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="ground-brick">
          <PixelSprite pixels={BRICK} pixelSize={2} />
        </div>
      ))}
    </div>
  );
}

// ─── Cloud Layer ────────────────────────────────────────────────────

function CloudLayer() {
  return (
    <div className="mario-clouds">
      <div className="cloud cloud-1" style={{ top: '8%', animationDuration: '35s' }}>
        <PixelSprite pixels={CLOUD} pixelSize={2} className="cloud-sprite" />
      </div>
      <div className="cloud cloud-2" style={{ top: '18%', animationDuration: '50s', animationDelay: '-20s' }}>
        <PixelSprite pixels={CLOUD} pixelSize={1.5} className="cloud-sprite" />
      </div>
      <div className="cloud cloud-3" style={{ top: '5%', animationDuration: '42s', animationDelay: '-10s' }}>
        <PixelSprite pixels={CLOUD} pixelSize={1.5} className="cloud-sprite" />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function HealthIndicator({
  category,
  remaining,
  healthPct = 50,
  currencySymbol = "₹",
  onClick,
}: HealthIndicatorProps) {
  // Privacy-first: always start hidden on every mount (dashboard open).
  // User must explicitly tap the eye icon to reveal their score.
  const [isHidden, setIsHidden] = useState<boolean>(true);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [blockBumped, setBlockBumped] = useState(false);

  const toggleHidden = () => {
    const next = !isHidden;
    setIsHidden(next);
    setIsRevealed(!next);
    setBlockBumped(true);
    setTimeout(() => setBlockBumped(false), 300);
  };

  const scene = sceneConfig[category] || sceneConfig.unavailable;
  const isUnavailable = category === "unavailable" || remaining === null;
  const isPositive = !isUnavailable && (remaining || 0) > 0;
  const displayAmount = isUnavailable ? 0 : Math.round(Math.abs(remaining || 0));

  return (
    <motion.div
      className={`mario-health-indicator mario-state-${category}`}
      onClick={onClick}
      style={{
        background: scene.skyGradient,
        cursor: "pointer",
        boxShadow: `0 8px 32px ${scene.glowColor}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Glow accent line at top */}
      <div className="mario-glow-line" style={{ background: `linear-gradient(90deg, transparent, ${scene.glowColor}, transparent)` }} />

      {/* Cloud layer */}
      <CloudLayer />

      {/* Danger flash overlay for worrisome */}
      {category === "worrisome" && <DangerFlashes />}

      {/* Scene content */}
      <div className="mario-scene">

        {/* Category label */}
        <motion.div
          className="mario-category-label"
          style={{ color: scene.glowColor }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {scene.label}
        </motion.div>

        {/* Mario character */}
        <div className="mario-character-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={category}
              className={`mario-character ${category === "good" ? "rainbow-shimmer" : ""}`}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -6, 0],
              }}
              exit={{ opacity: 0, scale: 0.5, y: -20 }}
              transition={{
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
                y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <PixelSprite pixels={scene.sprite} pixelSize={3} />
            </motion.div>
          </AnimatePresence>

          {/* Shadow under character */}
          <motion.div
            className="mario-shadow"
            animate={{ scaleX: [1, 0.8, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Floating particles */}
        {scene.particleType === "stars" && <FloatingStars />}
        {scene.particleType === "flames" && <FloatingFlames />}
        {(scene.particleType === "stars" || scene.particleType === "flames" || scene.particleType === "mystery") && <FloatingCoins />}

        {/* Score display */}
        <div className="mario-score-row" onClick={(e) => { e.stopPropagation(); toggleHidden(); }}>
          <div className="mario-coin-icon">
            <PixelSprite pixels={COIN} pixelSize={2} />
          </div>
          <div className="mario-score-display">
            {isUnavailable ? (
              <span className="mario-score-private">? PRIVATE ?</span>
            ) : isHidden ? (
              <motion.span
                className="mario-score-hidden"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ? ? ? ? ?
              </motion.span>
            ) : (
              <CoinCounter
                value={isPositive ? displayAmount : -displayAmount}
                isPositive={isPositive}
                currencySymbol={currencySymbol}
                animate={isRevealed}
              />
            )}
          </div>
          <motion.button
            className={`mario-question-block ${blockBumped ? 'bumped' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleHidden(); }}
            animate={blockBumped ? { y: [0, -8, 0], scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.1 }}
          >
            <PixelSprite pixels={QUESTION_BLOCK} pixelSize={2} />
          </motion.button>
        </div>

        {/* Power bar */}
        {!isUnavailable && <PowerBar healthPct={healthPct} />}

        {/* Message */}
        <div className="mario-message">
          <span className="mario-message-text">{scene.message}</span>
        </div>
      </div>

      {/* Ground bricks */}
      <BrickGround color={scene.groundColor} />
    </motion.div>
  );
}
