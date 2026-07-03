/* ============================================================
   LabWise — lab.js
   Main lab bench controller. Loads the session from storage,
   wires up the correct experiment module, manages the data
   table, and handles record / undo / finalize API calls.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  if (!Storage.requireAuth()) return;

  const session = Storage.getLabSession();
  const expName = Storage.getExperiment();

  if (!session || !expName) { Router.dashboard(); return; }

  /* ── State ─────────────────────────────────────────────── */
  const LabState = {
    session,
    expName,
    config:       session.config   || {},
    readings:     session.readings || [],
    totalTrials:  getTotalTrials(session, expName),
  };

  /* ── UI init ────────────────────────────────────────────── */
  initTitles(expName);
  showSimPanel(expName);
  showInputPanel(expName);
  loadQuestion(session);
  buildTableHead(expName);
  preDrawTable(expName, LabState.totalTrials);
  renderExistingReadings(LabState);
  updateProgress(LabState);

  /* ── Init experiment module ─────────────────────────────── */
  if (expName === 'pendulum') Pendulum.init(LabState);
  if (expName === 'hookes')   HookesLaw.init(LabState);
  if (expName === 'moments')  Moments.init(LabState);

  /* ── Question panel toggle ──────────────────────────────── */
  document.getElementById('question-toggle')
    ?.addEventListener('click', () => {
      document.getElementById('question-panel')
        ?.classList.toggle('collapsed');
    });

  /* ── Record button ──────────────────────────────────────── */
  document.getElementById('record-btn')
    ?.addEventListener('click', () => recordReading(LabState));

  /* ── Undo button ────────────────────────────────────────── */
  document.getElementById('undo-btn')
    ?.addEventListener('click', () => undoReading(LabState));

  /* ── Finalize button ────────────────────────────────────── */
  document.getElementById('finalize-btn')
    ?.addEventListener('click', () => finalizeLab(LabState));

});

/* ════════════════════════════════════════════════════════════
   TITLES + PANELS
════════════════════════════════════════════════════════════ */

function initTitles(expName) {
  const titles = {
    pendulum: 'Simple Pendulum Lab',
    hookes:   "Hooke's Law Lab",
    moments:  'Principle of Moments Lab',
  };
  setText('lab-title', titles[expName] || 'Lab Bench');
  setText('sim-title', titles[expName] || 'Simulation');
}

function showSimPanel(expName) {
  document.querySelectorAll('.sim-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`sim-${expName}`)?.classList.add('active');

  /* Stopwatch bar only for pendulum */
  const swBar = document.getElementById('stopwatch-bar');
  if (swBar) swBar.classList.toggle('hidden', expName !== 'pendulum');
}

function showInputPanel(expName) {
  document.querySelectorAll('.exp-inputs').forEach(p => p.classList.remove('active'));
  document.getElementById(`inputs-${expName}`)?.classList.add('active');
}

function loadQuestion(session) {
  const q = session.question;
  if (!q) return;
  setText('q-formula', q.formula || '');
  setText('q-text',    q.text    || '');
}

/* ════════════════════════════════════════════════════════════
   PROGRESS
════════════════════════════════════════════════════════════ */

function updateProgress(LabState) {
  const done  = LabState.readings.length;
  const total = LabState.totalTrials;

  setText('trial-badge',      `Trial ${Math.min(done + 1, total)} of ${total}`);
  setText('input-trial-num',  Math.min(done + 1, total));
  setText('readings-count',   `${done} reading${done !== 1 ? 's' : ''}`);
  setText('sim-info',         `Trial ${Math.min(done + 1, total)} of ${total}`);

  /* Undo button */
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) undoBtn.disabled = done === 0;

  /* Finalize area */
  updateFinalizeArea(done, total);

  /* Notify experiment module */
  if (LabState.expName === 'pendulum') Pendulum.updateForTrial(LabState);
  if (LabState.expName === 'hookes')   HookesLaw.updateForTrial(LabState);
  if (LabState.expName === 'moments')  Moments.updateForTrial(LabState);
}

function updateFinalizeArea(done, total) {
  const statusEl    = document.getElementById('finalize-status');
  const finalizeBtn = document.getElementById('finalize-btn');
  if (!statusEl || !finalizeBtn) return;

  if (done < 3) {
    statusEl.textContent = `Record at least 3 readings to finish. (${done}/3 done)`;
    finalizeBtn.classList.add('hidden');
  } else if (done < total) {
    statusEl.textContent = `${done}/${total} readings done. You can finish now or complete all ${total}.`;
    finalizeBtn.classList.remove('hidden');
    finalizeBtn.disabled = false;
  } else {
    statusEl.textContent = `All ${total} readings complete ✅`;
    finalizeBtn.classList.remove('hidden');
    finalizeBtn.disabled = false;
  }
}

/* ════════════════════════════════════════════════════════════
   RECORD READING
════════════════════════════════════════════════════════════ */

async function recordReading(LabState) {
  const errEl  = document.getElementById('input-error');
  const recBtn = document.getElementById('record-btn');

  /* Gather inputs from the experiment module */
  let result;
  if (LabState.expName === 'pendulum') result = Pendulum.getInputs(LabState);
  if (LabState.expName === 'hookes')   result = HookesLaw.getInputs(LabState);
  if (LabState.expName === 'moments')  result = Moments.getInputs(LabState);

  if (result?.error) {
    errEl.textContent = result.error;
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');

  recBtn.disabled    = true;
  recBtn.textContent = 'Recording…';

  const res = await ExperimentApi.submitReading(LabState.session.id, result.inputs);

  recBtn.disabled    = false;
  recBtn.textContent = 'Record ✓';

  if (!res.ok) {
    errEl.textContent = res.data?.error || 'Failed to record. Try again.';
    errEl.classList.remove('hidden');
    return;
  }

  const reading = res.data.data.reading;
  LabState.readings.push(reading);

  /* Update stored session */
  Storage.setLabSession({ ...LabState.session, readings: LabState.readings });

  /* Fill table row */
  fillTableRow(reading, LabState.expName);

  /* Clear inputs for next trial */
  if (LabState.expName === 'pendulum') Pendulum.clearInputs();
  if (LabState.expName === 'hookes')   HookesLaw.clearInputs();
  if (LabState.expName === 'moments')  Moments.clearInputs();

  updateProgress(LabState);
}

/* ════════════════════════════════════════════════════════════
   UNDO
════════════════════════════════════════════════════════════ */

async function undoReading(LabState) {
  if (LabState.readings.length === 0) return;

  const undoBtn = document.getElementById('undo-btn');
  undoBtn.disabled    = true;
  undoBtn.textContent = 'Undoing…';

  const res = await ExperimentApi.undoLastReading(LabState.session.id);

  undoBtn.disabled    = false;
  undoBtn.textContent = '↩ Undo';

  if (!res.ok) return;

  const removedTrial = LabState.readings.length;
  LabState.readings.pop();
  Storage.setLabSession({ ...LabState.session, readings: LabState.readings });

  /* Reset the pre-drawn row for that trial */
  resetTableRow(removedTrial, LabState.expName);
  updateProgress(LabState);
}

/* ════════════════════════════════════════════════════════════
   FINALIZE
════════════════════════════════════════════════════════════ */

async function finalizeLab(LabState) {
  const btn = document.getElementById('finalize-btn');
  btn.disabled    = true;
  btn.textContent = 'Calculating…';

  const res = await ExperimentApi.finalizeSession(LabState.session.id);

  btn.disabled    = false;
  btn.textContent = 'Finish & View Graph →';

  if (!res.ok) {
    const statusEl = document.getElementById('finalize-status');
    if (statusEl) statusEl.textContent = res.data?.error || 'Failed to finalize. Try again.';
    return;
  }

  Storage.setLabSession(res.data.data.session);
  Router.graph();
}

/* ════════════════════════════════════════════════════════════
   DATA TABLE
════════════════════════════════════════════════════════════ */

function buildTableHead(expName) {
  const thead = document.getElementById('table-head');
  if (!thead) return;
  const heads = {
    pendulum: ['#','L (cm)','t (s)','T = t/N (s)','T² (s²)','g (m/s²)'],
    hookes:   ['#','Mass (g)','Mass (kg)','F (N)','New L (cm)','Ext (cm)','Ext (m)','k (N/m)'],
    moments:  ['#','F₁ (N)','d₁ (cm)','M₁ (N·m)','F₂ (N)','d₂ (cm)','M₂ (N·m)','% Diff'],
  };
  thead.innerHTML = `<tr>${(heads[expName]||[]).map(h=>`<th>${h}</th>`).join('')}</tr>`;
}

function preDrawTable(expName, totalTrials) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  const cols = { pendulum:6, hookes:8, moments:8 }[expName] || 8;
  for (let i = 1; i <= totalTrials; i++) {
    const tr = document.createElement('tr');
    tr.id        = `row-${i}`;
    tr.className = 'pre-row';
    tr.innerHTML = `<td>${i}</td>${'<td>—</td>'.repeat(cols - 1)}`;
    tbody.appendChild(tr);
  }
}

function fillTableRow(reading, expName) {
  const tr = document.getElementById(`row-${reading.trial_number}`);
  if (!tr) return;
  tr.innerHTML  = buildRowCells(reading, expName);
  tr.className  = 'filled-row';
  tr.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function resetTableRow(trialNum, expName) {
  const tr = document.getElementById(`row-${trialNum}`);
  if (!tr) return;
  const cols = { pendulum:6, hookes:8, moments:8 }[expName] || 8;
  tr.innerHTML = `<td>${trialNum}</td>${'<td>—</td>'.repeat(cols - 1)}`;
  tr.className = 'pre-row';
}

function buildRowCells(r, expName) {
  const ai = r.adjusted_inputs;
  const c  = r.calculated;
  const n  = r.trial_number;

  if (expName === 'pendulum') {
    const tOk  = c.T_correct  ? 'cell-correct' : 'cell-wrong';
    const t2Ok = c.T2_correct ? 'cell-correct' : 'cell-wrong';
    return `
    <td class="col-trial">${n}</td>
    <td>${ai.length_cm}</td>
    <td>${ai.t}</td>
    <td class="${tOk}">${c.T}</td>
    <td class="${t2Ok}">${c.T_squared}</td>
    <td class="col-result">${c.g}</td>`;
  }

  if (expName === 'hookes') return `
    <td class="col-trial">${n}</td>
    <td>${ai.mass_g}</td><td>${ai.mass_kg}</td>
    <td>${c.force_N}</td><td>${ai.new_length_cm}</td>
    <td>${c.extension_cm}</td><td>${c.extension_m}</td>
    <td class="col-result">${c.k}</td>`;

  if (expName === 'moments') return `
    <td class="col-trial">${n}</td>
    <td>${ai.f1}</td><td>${ai.d1_cm}</td><td>${c.moment1_Nm}</td>
    <td>${ai.f2}</td><td>${ai.d2_cm}</td><td>${c.moment2_Nm}</td>
    <td class="col-result">${c.difference_pct}%</td>`;

  return '';
}

function renderExistingReadings(LabState) {
  LabState.readings.forEach(r => fillTableRow(r, LabState.expName));
}

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */

function getTotalTrials(session, expName) {
  const c = session.config || {};
  if (expName === 'pendulum') return c.num_trials || 5;
  if (expName === 'hookes')   return c.masses_g?.length || c.num_trials || 5;
  if (expName === 'moments')  return c.num_trials || 5;
  return 5;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}
