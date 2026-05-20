/**
 * Fixed warm-up template (not picked from the exercise bank).
 * Three steps: pulse raiser → focus-specific mobility → ramp-up set before main work.
 */

import type { ScheduledExercise, WorkoutFocus, WorkoutInputs } from './types';

/** Second warm-up row; movement prep varies by the user’s workout focus */
function mobilityForFocus(focus: WorkoutFocus): ScheduledExercise {
  switch (focus) {
    case 'legs':
      return {
        block: 'warmup',
        name: 'Lower-body prep',
        prescription: '1 round (~90s)',
        detail:
          '6 hip circles each direction, 6 slow bodyweight squats, 6 walking knee hugs per leg',
      };
    case 'core':
      return {
        block: 'warmup',
        name: 'Trunk prep',
        prescription: '1 round (~90s)',
        detail: '6 cat-cow, 4 slow dead bugs (small range), 15s easy front plank',
      };
    case 'arms':
      return {
        block: 'warmup',
        name: 'Arm and shoulder prep',
        prescription: '1 round (~90s)',
        detail:
          '8 arm circles each direction, 8 very light curls + tricep pulses (band or light DB), shoulder rolls',
      };
    case 'upper':
      return {
        block: 'warmup',
        name: 'Upper-body prep',
        prescription: '1 round (~90s)',
        detail: '8 shoulder rolls, 10 band pull-aparts or light reverse flyes, 6 wall slides',
      };
    default:
      return {
        block: 'warmup',
        name: 'Full-body prep',
        prescription: '1 round (~90s)',
        detail:
          '15s marching or jumping jacks, 4 inchworms, 6 bodyweight squats, 8 arm circles',
      };
  }
}

/** Always prepended; ~5 min total before main work budget */
export function buildWarmup(inputs: WorkoutInputs): ScheduledExercise[] {
  const pulse: ScheduledExercise = {
    block: 'warmup',
    name: 'Pulse raiser',
    prescription: '2–3 min easy',
    detail: 'Walk, light jog, bike, or easy jump rope until you feel warm',
  };
  const mobility = mobilityForFocus(inputs.focus);
  const ramp: ScheduledExercise = {
    block: 'warmup',
    name: 'Ramp-up sets',
    prescription: '1 light set',
    detail: 'Before your first heavier set, smooth reps and add load gradually',
  };
  return [pulse, mobility, ramp];
}
