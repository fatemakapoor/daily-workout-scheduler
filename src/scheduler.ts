/**
 * Workout generation: filter the exercise bank, pack exercises into the time budget,
 * and attach prescriptions + RPE. Warm-up content comes from warmup.ts.
 *
 * Main selection pipeline:
 * filterCandidates → (fallback if empty) → deprioritize gym-only at home → shuffle →
 * greedy pack by slotMinutes → map to ScheduledExercise rows.
 */

import { EXERCISES } from './exerciseBank';
import { EXERCISE_VIDEO_BY_ID } from './exerciseVideos';
import type {
  BuiltWorkout,
  EffortCategory,
  Equipment,
  ExerciseDef,
  LoadType,
  Location,
  ScheduledExercise,
  WorkoutFocus,
  WorkoutInputs,
} from './types';
import { buildWarmup } from './warmup';

/** Minutes held back from the user’s duration for the fixed warm-up block */
const WARMUP_RESERVE_MIN = 5;

const ACCESSORY_IDS = new Set([
  'db-curl',
  'hammer-curl',
  'tricep-pushdown',
  'oh-tricep-ext',
  'skullcrusher',
  'calf-raise',
  'cable-crunch',
  'band-pulldown-abs',
  'hanging-knee',
]);

/** Maps exercise metadata to an effort tier when rpeTarget is not set on the def */
function inferEffort(ex: ExerciseDef): EffortCategory {
  if (ex.effort) return ex.effort;
  if (ex.id === 'plank' || ex.id === 'side-plank') return 'core';
  if (ex.id === 'dead-bug') return 'core';
  if (ACCESSORY_IDS.has(ex.id)) return 'accessory';
  if (ex.slotMinutes >= 7) return 'primary';
  if (ex.slotMinutes <= 4) return 'accessory';
  return 'secondary';
}

function formatRpe(ex: ExerciseDef): string {
  if (ex.rpeTarget) return ex.rpeTarget;
  const tier = inferEffort(ex);
  switch (tier) {
    case 'primary':
      return 'RPE 7–8 (~2 reps in reserve)';
    case 'secondary':
      return 'RPE 7–8';
    case 'accessory':
      return 'RPE 8–9 (~1 RIR on tough sets)';
    case 'core':
      return 'RPE 7–8 (steady tension; stop if form slips)';
    default:
      return 'RPE 7–8';
  }
}

/** User must have every piece listed in ex.requires (AND logic) */
function hasEquipment(user: Set<Equipment>, required: Equipment[]): boolean {
  return required.every((e) => user.has(e));
}

function loadTypeMatches(ex: ExerciseDef, load: LoadType): boolean {
  if (load === 'combination') return true;
  return ex.loadTypes.includes(load);
}

function focusMatches(ex: ExerciseDef, focus: WorkoutFocus): boolean {
  if (focus === 'total') return true;
  return ex.focusTags.includes(focus);
}

/** Home sessions hide gym-only moves unless the user actually has cable/machines */
function locationAllows(ex: ExerciseDef, location: Location, userEquip: Set<Equipment>): boolean {
  if (location === 'gym') return true;
  // At home, still allow any exercise the user has equipment for; deprioritize gym-style slots in ordering
  const needsGymOnly =
    ex.requires.includes('machines') || ex.requires.includes('cable');
  if (needsGymOnly) return userEquip.has('machines') || userEquip.has('cable');
  if (ex.gymPreferred && ex.requires.includes('barbell') && !userEquip.has('barbell')) return false;
  return true;
}

/** Apply focus, equipment, load, and location gates to the exercise bank */
function filterCandidates(inputs: WorkoutInputs): ExerciseDef[] {
  const userEquip = new Set(inputs.equipment);
  if (!userEquip.has('none') && inputs.equipment.length === 0) {
    userEquip.add('none');
  }

  return EXERCISES.filter((ex) => {
    if (!focusMatches(ex, inputs.focus)) return false;
    if (!hasEquipment(userEquip, ex.requires)) return false;
    if (!loadTypeMatches(ex, inputs.loadType)) return false;
    if (!locationAllows(ex, inputs.location, userEquip)) return false;
    return true;
  });
}

/** Deterministic shuffle so the same daySeed yields the same session order */
function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Choose sets×reps vs sets×time based on load style.
 * Bodyweight prefers time-based defaults; weights prefer reps; combination uses defaultOutput.
 */
function pickPrescription(ex: ExerciseDef, load: LoadType): { prescription: string; detail?: string } {
  if (load === 'bodyweight') {
    if (ex.defaultOutput === 'time' && ex.time) {
      const { sets, secondsPerSet, note } = ex.time;
      return { prescription: `${sets} × ${secondsPerSet}s`, detail: note };
    }
    if (ex.reps) {
      const { sets, reps, note } = ex.reps;
      return { prescription: `${sets} × ${reps} reps`, detail: note };
    }
  }

  if (load === 'weights') {
    if (ex.reps) {
      const { sets, reps, note } = ex.reps;
      return { prescription: `${sets} × ${reps} reps`, detail: note };
    }
    if (ex.time) {
      const { sets, secondsPerSet, note } = ex.time;
      return { prescription: `${sets} × ${secondsPerSet}s`, detail: note };
    }
  }

  // combination: follow default output, fall back to the other
  if (ex.defaultOutput === 'time' && ex.time) {
    const { sets, secondsPerSet, note } = ex.time;
    return { prescription: `${sets} × ${secondsPerSet}s`, detail: note };
  }
  if (ex.reps) {
    const { sets, reps, note } = ex.reps;
    return { prescription: `${sets} × ${reps} reps`, detail: note };
  }
  if (ex.time) {
    const { sets, secondsPerSet, note } = ex.time;
    return { prescription: `${sets} × ${secondsPerSet}s`, detail: note };
  }

  return { prescription: '3 × 12 reps' };
}

/**
 * Builds warm-up (always) + main work. Main block uses session time minus a warm-up
 * reserve, then ~85% of that for working sets (transitions/rest implied).
 */
export function buildWorkout(inputs: WorkoutInputs, daySeed = Date.now()): BuiltWorkout {
  const session = Math.max(10, inputs.durationMinutes);
  const mainBudget = Math.max(8, session - WARMUP_RESERVE_MIN) * 0.85;
  let candidates = filterCandidates(inputs);

  // No strict match: try bodyweight-only exercises, then any exercise for this focus
  if (candidates.length === 0) {
    const relaxed = EXERCISES.filter(
      (ex) =>
        focusMatches(ex, inputs.focus) &&
        loadTypeMatches(ex, inputs.loadType) &&
        hasEquipment(new Set(['none']), ex.requires),
    );
    candidates = relaxed.length ? relaxed : EXERCISES.filter((ex) => focusMatches(ex, inputs.focus));
  }

  // Sort gym-preferred lifts later at home; shuffle within each tier for variety
  const homeBoost = (e: ExerciseDef) => (inputs.location === 'home' && e.gymPreferred ? 1 : 0);
  const sorted = [...candidates].sort((a, b) => homeBoost(a) - homeBoost(b));
  const ordered = shuffle(sorted, daySeed % 100000);
  const picked: ExerciseDef[] = [];
  let used = 0;

  // Greedy pack: add exercises in shuffled order until the main-work minute budget is full
  for (const ex of ordered) {
    if (used + ex.slotMinutes > mainBudget) continue;
    picked.push(ex);
    used += ex.slotMinutes;
    if (used >= mainBudget - 2) break;
  }

  // Guarantee at least one main exercise when the bank had any candidates
  if (picked.length === 0 && candidates[0]) {
    picked.push(candidates[0]);
  }

  const warmup = buildWarmup(inputs);
  const main: ScheduledExercise[] = picked.map((ex) => {
    const { prescription, detail } = pickPrescription(ex, inputs.loadType);
    const videoUrl = EXERCISE_VIDEO_BY_ID[ex.id];
    return {
      block: 'main',
      name: ex.name,
      prescription,
      detail,
      rpe: formatRpe(ex),
      ...(videoUrl ? { videoUrl } : {}),
    };
  });

  return { warmup, main };
}

/** One-line session header shown above the warm-up and main lists */
export function summarizeInputs(inputs: WorkoutInputs): string {
  const equip =
    inputs.equipment.length === 0
      ? 'bodyweight only'
      : inputs.equipment.join(', ');
  return `${inputs.focus} · ${inputs.location} · ${inputs.durationMinutes} min total (includes ~${WARMUP_RESERVE_MIN} min warm-up reserve) · ${inputs.loadType} · ${equip}`;
}
