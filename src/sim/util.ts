import type { SimEvent, SimState } from './types';

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export function moveToward(current: number, target: number, rate: number): number {
  if (current < target) return Math.min(target, current + rate);
  return Math.max(target, current - rate);
}

const MAX_EVENTS = 30;

export function pushEvent(state: SimState, type: SimEvent['type'], message: string): void {
  state.events.push({ tick: state.tick, type, message });
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
}
