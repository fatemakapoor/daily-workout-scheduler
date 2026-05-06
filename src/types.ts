export type WorkoutFocus = 'upper' | 'arms' | 'legs' | 'total' | 'core';

export type Location = 'gym' | 'home';

export type LoadType = 'weights' | 'bodyweight' | 'combination';

export type Equipment =
  | 'none'
  | 'dumbbells'
  | 'barbell'
  | 'bench'
  | 'pullup_bar'
  | 'kettlebell'
  | 'bands'
  | 'cable'
  | 'machines';

export interface WorkoutInputs {
  focus: WorkoutFocus;
  location: Location;
  durationMinutes: number;
  loadType: LoadType;
  equipment: Equipment[];
}

/** Drives default RPE text when `rpeTarget` is not set on the exercise */
export type EffortCategory = 'primary' | 'secondary' | 'accessory' | 'core';

export interface ExerciseDef {
  id: string;
  name: string;
  /** Which focus filters include this exercise */
  focusTags: WorkoutFocus[];
  /** Minimum equipment needed (all must be satisfied by user selection) */
  requires: Equipment[];
  /** Compatible load styles */
  loadTypes: LoadType[];
  /** Rough minutes per exercise including short rest */
  slotMinutes: number;
  gymPreferred: boolean;
  defaultOutput: 'reps' | 'time';
  reps?: { sets: number; reps: string; note?: string };
  time?: { sets: number; secondsPerSet: number; note?: string };
  /** Override inferred RPE line (e.g. "RPE 8–9") */
  rpeTarget?: string;
  /** If omitted, effort is inferred in the scheduler */
  effort?: EffortCategory;
}

export interface ScheduledExercise {
  name: string;
  prescription: string;
  detail?: string;
  /** Main work only; warm-up rows omit this */
  rpe?: string;
  block?: 'warmup' | 'main';
  /** Instructional video (typically YouTube) */
  videoUrl?: string;
}

export interface BuiltWorkout {
  warmup: ScheduledExercise[];
  main: ScheduledExercise[];
}
