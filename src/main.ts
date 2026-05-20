import './style.css';
import { buildWorkout, summarizeInputs } from './scheduler';
import type { Equipment, LoadType, Location, ScheduledExercise, WorkoutFocus, WorkoutInputs } from './types';

const FOCUS_OPTIONS: { value: WorkoutFocus; label: string }[] = [
  { value: 'upper', label: 'Upper body' },
  { value: 'arms', label: 'Arms' },
  { value: 'legs', label: 'Legs' },
  { value: 'total', label: 'Total body' },
  { value: 'core', label: 'Core' },
];

const EQUIP_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'none', label: 'No equipment' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'bench', label: 'Bench' },
  { value: 'pullup_bar', label: 'Pull-up bar' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'bands', label: 'Resistance bands' },
  { value: 'cable', label: 'Cable station' },
  { value: 'machines', label: 'Machines' },
];

function readInputs(root: HTMLElement): WorkoutInputs | { error: string } {
  const focus = root.querySelector<HTMLInputElement>('input[name="focus"]:checked')?.value as
    | WorkoutFocus
    | undefined;
  const location = root.querySelector<HTMLInputElement>('input[name="location"]:checked')?.value as
    | Location
    | undefined;
  const loadType = root.querySelector<HTMLInputElement>('input[name="load"]:checked')?.value as
    | LoadType
    | undefined;
  const durationRaw = root.querySelector<HTMLInputElement>('#duration')?.value;

  if (!focus || !location || !loadType) {
    return { error: 'Select workout type, location, and load style.' };
  }

  const durationMinutes = Math.min(120, Math.max(10, Number(durationRaw) || 30));

  const equipment: Equipment[] = [];
  root.querySelectorAll<HTMLInputElement>('input[name="equip"]:checked').forEach((el) => {
    equipment.push(el.value as Equipment);
  });

  if (equipment.length === 0) {
    equipment.push('none');
  }
  if (equipment.includes('none') && equipment.length > 1) {
    return {
      focus,
      location,
      durationMinutes,
      loadType,
      equipment: equipment.filter((e) => e !== 'none'),
    };
  }

  return { focus, location, durationMinutes, loadType, equipment };
}

function syncEquipmentUI(root: HTMLElement): void {
  const loadType = root.querySelector<HTMLInputElement>('input[name="load"]:checked')?.value;
  const isBodyweight = loadType === 'bodyweight';
  const equipInputs = [...root.querySelectorAll<HTMLInputElement>('input[name="equip"]')];
  const noneInput = equipInputs.find((el) => el.value === 'none');
  const otherInputs = equipInputs.filter((el) => el.value !== 'none');

  const setDisabled = (input: HTMLInputElement, disabled: boolean) => {
    input.disabled = disabled;
    input.closest('label.equip')?.classList.toggle('equip--disabled', disabled);
  };

  if (isBodyweight) {
    if (noneInput) {
      noneInput.checked = true;
      setDisabled(noneInput, false);
    }
    for (const el of otherInputs) {
      el.checked = false;
      setDisabled(el, true);
    }
    return;
  }

  const noneChecked = noneInput?.checked ?? false;

  if (noneInput) setDisabled(noneInput, false);

  if (noneChecked) {
    for (const el of otherInputs) {
      el.checked = false;
      setDisabled(el, true);
    }
  } else {
    for (const el of otherInputs) {
      setDisabled(el, false);
    }
  }
}

function bindEquipmentConstraints(root: HTMLElement, onChange: () => void): void {
  root.querySelectorAll<HTMLInputElement>('input[name="load"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      syncEquipmentUI(root);
      onChange();
    });
  });

  root.querySelectorAll<HTMLInputElement>('input[name="equip"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const noneInput = root.querySelector<HTMLInputElement>('input[name="equip"][value="none"]');
      if (checkbox.value !== 'none' && checkbox.checked && noneInput) {
        noneInput.checked = false;
      }
      syncEquipmentUI(root);
      onChange();
    });
  });

  syncEquipmentUI(root);
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <header>
      <h1>Daily workout scheduler</h1>
      <p>Choose your constraints and get a warm-up, main work, sets or times, and RPE targets.</p>
    </header>
    <form class="card" id="workout-form" aria-label="Workout parameters">
      <fieldset>
        <legend>Workout type</legend>
        <div class="row">
          ${FOCUS_OPTIONS.map(
            (o) => `
            <label class="choice">
              <input type="radio" name="focus" value="${o.value}" ${o.value === 'upper' ? 'checked' : ''} />
              ${o.label}
            </label>`,
          ).join('')}
        </div>
      </fieldset>
      <fieldset>
        <legend>Location</legend>
        <div class="row">
          <label class="choice">
            <input type="radio" name="location" value="home" checked /> Home
          </label>
          <label class="choice">
            <input type="radio" name="location" value="gym" /> Gym
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Time (minutes)</legend>
        <div class="time-row">
          <input type="number" id="duration" min="10" max="120" value="35" step="5" />
          <span class="muted" style="color:var(--muted);font-size:0.85rem">Approx. working time budget</span>
        </div>
      </fieldset>
      <fieldset>
        <legend>Load</legend>
        <div class="row">
          <label class="choice">
            <input type="radio" name="load" value="bodyweight" /> Bodyweight
          </label>
          <label class="choice">
            <input type="radio" name="load" value="weights" /> Weights
          </label>
          <label class="choice">
            <input type="radio" name="load" value="combination" checked /> Combination
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Equipment you have</legend>
        <div class="equip-grid">
          ${EQUIP_OPTIONS.map(
            (o) => `
            <label class="equip">
              <input type="checkbox" name="equip" value="${o.value}" ${o.value === 'none' ? 'checked' : ''} />
              ${o.label}
            </label>`,
          ).join('')}
        </div>
      </fieldset>
      <button type="submit" class="primary">Build today’s workout</button>
      <div id="form-error" class="error" role="alert" hidden></div>
    </form>
    <section class="output" id="output" aria-live="polite">
      <h2>Your session</h2>
      <p class="summary" id="summary"></p>
      <div id="blocks"></div>
    </section>
  `;

  const form = app.querySelector<HTMLFormElement>('#workout-form');
  const blocksEl = app.querySelector<HTMLDivElement>('#blocks');
  const summaryEl = app.querySelector<HTMLParagraphElement>('#summary');
  const errEl = app.querySelector<HTMLDivElement>('#form-error');

  blocksEl?.addEventListener('toggle', (e) => {
    const details = e.target;
    if (!(details instanceof HTMLDetailsElement) || !details.classList.contains('ex-embed-details')) return;
    if (!details.open) return;
    const iframe = details.querySelector('iframe');
    if (!(iframe instanceof HTMLIFrameElement)) return;
    const src = iframe.dataset.src;
    if (src && !iframe.getAttribute('src')) iframe.src = src;
  });

  const renderRows = (items: ScheduledExercise[], listClass: string): string => {
    if (items.length === 0) {
      return `<ol class="${listClass}"><li class="empty-hint">No exercises matched. Try adding equipment or switching to combination load.</li></ol>`;
    }
    return `<ol class="${listClass}">
      ${items
        .map(
          (w) => `
        <li${w.videoUrl ? ' class="has-video"' : ''}>
          <span class="ex-name">${escapeHtml(w.name)}</span>
          <span class="ex-dose">${escapeHtml(w.prescription)}</span>
          ${w.rpe ? `<span class="ex-rpe">${escapeHtml(w.rpe)}</span>` : ''}
          ${w.detail ? `<span class="ex-note">${escapeHtml(w.detail)}</span>` : ''}
          ${renderYoutubeEmbed(w.videoUrl, w.name)}
        </li>`,
        )
        .join('')}
    </ol>`;
  };

  const run = () => {
    const parsed = readInputs(app);
    if ('error' in parsed) {
      if (errEl) {
        errEl.textContent = parsed.error;
        errEl.hidden = false;
      }
      return;
    }
    if (errEl) errEl.hidden = true;

    const { warmup, main } = buildWorkout(parsed);
    if (summaryEl) summaryEl.textContent = summarizeInputs(parsed);
    if (blocksEl) {
      blocksEl.innerHTML = `
        <div class="workout-block">
          <h3 class="block-title">Warm-up</h3>
          ${renderRows(warmup, 'workout workout-warmup')}
        </div>
        <div class="workout-block">
          <h3 class="block-title">Main work</h3>
          ${renderRows(main, 'workout')}
        </div>
      `;
    }
  };

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    run();
  });

  bindEquipmentConstraints(app, run);

  // Initial plan
  run();
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) {
        return u.pathname.slice(7).split('/')[0] || null;
      }
      const v = u.searchParams.get('v');
      if (v) return v;
    }
  } catch {
    return null;
  }
  return null;
}

function renderYoutubeEmbed(videoUrl: string | undefined, exerciseName: string): string {
  if (!videoUrl) return '';
  const id = extractYouTubeId(videoUrl);
  if (!id) {
    return `<a class="ex-video-fallback" href="${escapeAttr(videoUrl)}" target="_blank" rel="noopener noreferrer">Watch form · YouTube</a>`;
  }
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  const title = escapeAttr(`How to: ${exerciseName}`);
  return `<details class="ex-embed-details">
    <summary class="ex-embed-summary" aria-label="Show or hide form video for ${escapeAttr(exerciseName)}">
      <span class="ex-embed-summary-main">Form video</span>
      <span class="ex-embed-summary-hint">YouTube · loads when opened</span>
    </summary>
    <div class="ex-embed-wrap">
      <div class="ex-embed">
        <iframe
          data-src="${src}"
          title="${title}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
      <a class="ex-video-out" href="${escapeAttr(videoUrl)}" target="_blank" rel="noopener noreferrer">Open on YouTube</a>
    </div>
  </details>`;
}

render();
