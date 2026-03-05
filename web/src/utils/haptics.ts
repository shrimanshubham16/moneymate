// Unified feedback engine: haptic vibration + Mario 8-bit sounds.
// Vibration works on Android Chrome; iOS gets audio feedback as substitute.
// Preserves original function signatures for backward compatibility.

import {
  soundCoin, soundOneUp, soundPowerUp, soundFireball,
  soundPipe, soundBump, soundStar, soundGameOver,
} from './sounds';

function vibrate(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch { /* some browsers throw on background tabs */ }
}

function triggerBounce(el: HTMLElement) {
  el.style.transition = 'transform 0.15s ease';
  el.style.transform = 'scale(0.95)';
  setTimeout(() => {
    el.style.transform = 'scale(1)';
    setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 150);
  }, 80);
}

function triggerShake(el: HTMLElement) {
  el.style.transition = 'transform 0.1s ease';
  el.style.transform = 'translateX(-4px)';
  setTimeout(() => { el.style.transform = 'translateX(4px)'; }, 80);
  setTimeout(() => { el.style.transform = 'translateX(-2px)'; }, 160);
  setTimeout(() => { el.style.transform = ''; el.style.transition = ''; }, 240);
}

// ─── Original API (backward compatible) ─────────────────────────────

export function hapticLight(element?: HTMLElement | null) {
  vibrate(10);
  soundCoin();
  if (element) triggerBounce(element);
}

export function hapticMedium(element?: HTMLElement | null) {
  vibrate(25);
  soundPipe();
  if (element) triggerBounce(element);
}

export function hapticSuccess(element?: HTMLElement | null) {
  vibrate([10, 50, 10]);
  soundOneUp();
  if (element) triggerBounce(element);
}

export function hapticError(element?: HTMLElement | null) {
  vibrate([50, 30, 50]);
  soundBump();
  if (element) triggerShake(element);
}

// ─── Extended API (Mario-themed) ────────────────────────────────────

/** Coin bling — expense logged, quick add */
export function feedbackCoin(element?: HTMLElement | null) {
  vibrate(10);
  soundCoin();
  if (element) triggerBounce(element);
}

/** 1-UP — due paid, bill paid */
export function feedbackOneUp(element?: HTMLElement | null) {
  vibrate([10, 50, 10]);
  soundOneUp();
  if (element) triggerBounce(element);
}

/** Power-up — investment/income added, settings saved */
export function feedbackPowerUp(element?: HTMLElement | null) {
  vibrate([10, 30, 10, 30, 10]);
  soundPowerUp();
  if (element) triggerBounce(element);
}

/** Fireball — item deleted */
export function feedbackFireball(element?: HTMLElement | null) {
  vibrate(20);
  soundFireball();
  if (element) triggerBounce(element);
}

/** Pipe warp — skip, toggle, navigation */
export function feedbackPipe(element?: HTMLElement | null) {
  vibrate(25);
  soundPipe();
  if (element) triggerBounce(element);
}

/** Block bump — error / warning */
export function feedbackBump(element?: HTMLElement | null) {
  vibrate([50, 30, 50]);
  soundBump();
  if (element) triggerShake(element);
}

/** Star power — export, sharing approved */
export function feedbackStar(element?: HTMLElement | null) {
  vibrate([10, 20, 10, 20, 10, 20, 10]);
  soundStar();
  if (element) triggerBounce(element);
}

/** Game over — critical error */
export function feedbackGameOver(element?: HTMLElement | null) {
  vibrate([80, 40, 80]);
  soundGameOver();
  if (element) triggerShake(element);
}
