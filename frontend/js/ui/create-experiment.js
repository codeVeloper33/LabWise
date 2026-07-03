/* ============================================================
   LabWise — create-experiment.js
   Controls the 3-step Create Experiment flow:
     Step 1 — Choose experiment
     Step 2 — Set parameters (tier-limited)
     Step 3 — Review auto-generated question → Start
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  if (!Storage.requireAuth()) return;

  /* ── State ──────────────────────────────────────────────── */
  let tierInfo       = null;   // from /api/experiments/ response
  let experiments    = [];     // all 3 experiment objects
  let selectedExp    = null;   // 'pendulum' | 'hookes' | 'moments'
  let generatedConfig = null;  // params built in step 2
  let generatedQuestion = null;// question from step 3 response

  /* Pendulum-specific state */
  let pendTrials  = 5;
  let pendOsc     = null;   // selected oscillation count

  /* Hooke's-specific state */
  let hookesTrials    = 5;
  let hookesIncrement = 50;   // g

  /* Moments-specific state */
  let momentsTrials = 5;

  /* ── Load experiments + tier info ─────────────────────── */
  const res = await ExperimentApi.listExperiments();
  if (!res.ok) {
    showError(res.data?.error || 'Could not load experiments.');
    return;
  }
  experiments = res.data.data.experiments;
  tierInfo    = res.data.data.tier_info;

  buildStep1();

  /* ════════════════════════════════════════════════════════
     STEP 1 — Choose experiment
  ════════════════════════════════════════════════════════ */

  function buildStep1() {
    const grid = document.getElementById('exp-choose-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const icons   = { pendulum: '🔵', hookes: '🟢', moments: '🟡' };
    const descs   = {
      pendulum: 'Vary pendulum length, time oscillations, plot T² vs L, find g.',
      hookes:   'Add masses to a spring, measure extension, plot F vs x, find k.',
      moments:  'Balance a metre rule, record forces and distances, plot M₂ vs M₁.',
    };
    const formulas = { pendulum: 'g = 4π²L / T²', hookes: 'k = F / x', moments: 'F₁d₁ = F₂d₂' };
    const headers  = { pendulum: 'pendulum-bg', hookes: 'hookes-bg', moments: 'moments-bg' };

    experiments.forEach(exp => {
      const accessible = tierInfo.experiments.includes(exp.name);
      const card = document.createElement('div');
      card.className = `ce-exp-card${accessible ? '' : ' locked'}`;
      card.dataset.exp = exp.name;
      card.innerHTML = `
        <div class="ce-exp-card-header ${headers[exp.name]}">
          ${icons[exp.name]}
          ${!accessible ? '<div class="lock-overlay">🔒</div>' : ''}
        </div>
        <div class="ce-exp-card-body">
          <h3>${exp.title}</h3>
          <p>${descs[exp.name]}</p>
        </div>
        <div class="ce-exp-card-footer">
          <span class="tier-tag ${accessible ? 'tier-free' : 'tier-paid'}">
            ${accessible ? 'Available' : 'Upgrade needed'}
          </span>
          <span style="font-family:var(--font-mono);font-size:12px;
                       color:var(--cyan);">${formulas[exp.name]}</span>
        </div>
      `;

      if (accessible) {
        card.addEventListener('click', () => {
          document.querySelectorAll('.ce-exp-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedExp = exp.name;
          document.getElementById('step1-next-btn').disabled = false;
        });
      }
      grid.appendChild(card);
    });
  }

  document.getElementById('step1-next-btn')?.addEventListener('click', () => {
    if (!selectedExp) return;
    goToStep(2);
    buildStep2();
  });

  /* ════════════════════════════════════════════════════════
     STEP 2 — Parameters
  ════════════════════════════════════════════════════════ */

  function buildStep2() {
    /* Show the right params panel */
    ['pendulum','hookes','moments'].forEach(exp => {
      const el = document.getElementById(`params-${exp}`);
      if (el) el.style.display = exp === selectedExp ? 'block' : 'none';
    });

    if (selectedExp === 'pendulum') buildPendulumParams();
    if (selectedExp === 'hookes')   buildHookesParams();
    if (selectedExp === 'moments')  buildMomentsParams();

    updateSummary();
  }

  /* ── Pendulum ── */
  function buildPendulumParams() {
    const maxTrials = tierInfo.max_trials;
    pendTrials = Math.min(5, maxTrials);
    setText('pend-trials-val', pendTrials);
    setText('pend-trials-hint', `Min 3 · Max ${maxTrials} on your plan`);
    setText('pend-max-length', tierInfo.max_length_cm);

    document.getElementById('pend-trials-dec')?.addEventListener('click', () => {
      if (pendTrials > 3) { pendTrials--; setText('pend-trials-val', pendTrials); updateSummary(); }
    });
    document.getElementById('pend-trials-inc')?.addEventListener('click', () => {
      if (pendTrials < maxTrials) { pendTrials++; setText('pend-trials-val', pendTrials); updateSummary(); }
    });

    /* Oscillation chips */
    const oscContainer = document.getElementById('pend-osc-chips');
    oscContainer.innerHTML = '';
    const allOscOptions = [5,10,20,30,50,100];
    allOscOptions.forEach(val => {
      const allowed = tierInfo.oscillation_options.includes(val);
      const chip = document.createElement('div');
      chip.className = `param-chip${allowed ? '' : ' locked-chip'}`;
      chip.textContent = val;
      chip.dataset.value = val;
      if (!allowed) {
        chip.title = 'Upgrade to unlock';
      } else {
        chip.addEventListener('click', () => {
          document.querySelectorAll('#pend-osc-chips .param-chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          pendOsc = val;
          updateSummary();
        });
      }
      oscContainer.appendChild(chip);
    });

    /* Default: select first allowed */
    pendOsc = tierInfo.oscillation_options[0];
    const defaultChip = oscContainer.querySelector(`[data-value="${pendOsc}"]`);
    if (defaultChip) defaultChip.classList.add('selected');
  }

  /* ── Hooke's ── */
  function buildHookesParams() {
    const maxTrials = tierInfo.max_trials;
    hookesTrials = Math.min(5, maxTrials);
    setText('hookes-trials-val', hookesTrials);
    setText('hookes-trials-hint', `Min 3 · Max ${maxTrials} on your plan`);
    setText('hookes-max-mass', tierInfo.max_mass_g);

    document.getElementById('hookes-trials-dec')?.addEventListener('click', () => {
      if (hookesTrials > 3) { hookesTrials--; setText('hookes-trials-val', hookesTrials); updateSummary(); }
    });
    document.getElementById('hookes-trials-inc')?.addEventListener('click', () => {
      if (hookesTrials < maxTrials) { hookesTrials++; setText('hookes-trials-val', hookesTrials); updateSummary(); }
    });

    document.querySelectorAll('#hookes-increment-chips .param-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#hookes-increment-chips .param-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        hookesIncrement = parseInt(chip.dataset.value);
        /* Check max mass */
        const maxMass = tierInfo.max_mass_g;
        const finalMass = hookesIncrement * hookesTrials;
        const hintEl = document.getElementById('hookes-mass-hint');
        if (hintEl) {
          if (finalMass > maxMass) {
            hintEl.innerHTML = `⚠️ Final mass (${finalMass}g) exceeds your plan's limit of ${maxMass}g. Reduce trials or increment.`;
            hintEl.classList.add('warn');
          } else {
            hintEl.innerHTML = `Max mass your plan allows: <strong id="hookes-max-mass">${maxMass}</strong> g`;
            hintEl.classList.remove('warn');
          }
        }
        updateSummary();
      });
    });
  }

  /* ── Moments ── */
  function buildMomentsParams() {
    const maxTrials = tierInfo.max_trials;
    momentsTrials = Math.min(5, maxTrials);
    setText('moments-trials-val', momentsTrials);
    setText('moments-trials-hint', `Min 3 · Max ${maxTrials} on your plan`);
    setText('moments-max-force', tierInfo.max_force_n);

    document.getElementById('moments-trials-dec')?.addEventListener('click', () => {
      if (momentsTrials > 3) { momentsTrials--; setText('moments-trials-val', momentsTrials); updateSummary(); }
    });
    document.getElementById('moments-trials-inc')?.addEventListener('click', () => {
      if (momentsTrials < maxTrials) { momentsTrials++; setText('moments-trials-val', momentsTrials); updateSummary(); }
    });
  }

  /* ── Summary panel ── */
  function updateSummary() {
    const el = document.getElementById('summary-content');
    if (!el) return;

    let rows = [];

    if (selectedExp === 'pendulum') {
      rows = [
        ['Experiment', 'Simple Pendulum'],
        ['Trials', pendTrials],
        ['Oscillations', pendOsc ?? '—'],
        ['Max length', `${tierInfo.max_length_cm} cm`],
        ['Timings per trial', '3 (t₁, t₂, t₃)'],
      ];
    } else if (selectedExp === 'hookes') {
      const masses = Array.from({length: hookesTrials}, (_, i) => hookesIncrement * (i + 1));
      rows = [
        ['Experiment', "Hooke's Law"],
        ['Trials', hookesTrials],
        ['First mass', `${hookesIncrement} g`],
        ['Last mass', `${hookesIncrement * hookesTrials} g`],
        ['Natural length', `${document.getElementById('hookes-natural-len')?.value || 10} cm`],
      ];
    } else if (selectedExp === 'moments') {
      const pivot = document.getElementById('moments-pivot')?.value || 50;
      rows = [
        ['Experiment', 'Principle of Moments'],
        ['Trials', momentsTrials],
        ['Pivot', `${pivot} cm`],
        ['Max force', `${tierInfo.max_force_n} N`],
      ];
    }

    el.innerHTML = rows.map(([k, v]) => `
      <div class="summary-row">
        <span>${k}</span>
        <span>${v}</span>
      </div>
    `).join('');
  }

  /* ── Step 2 navigation ── */
  document.getElementById('step2-back-btn')?.addEventListener('click', () => goToStep(1));

  document.getElementById('step2-next-btn')?.addEventListener('click', async () => {
    clearError();
    generatedConfig = buildConfig();
    if (!generatedConfig) return;

    /* Create the session — backend generates the WAEC question */
    Validator.setLoading('step2-next-btn', true);
    const res = await ExperimentApi.createSession(selectedExp, generatedConfig);
    Validator.setLoading('step2-next-btn', false);

    if (!res.ok) {
      showError(res.data?.error || 'Could not create session. Try again.');
      return;
    }

    const session = res.data.data.session;
    Storage.setLabSession(session);
    Storage.setExperiment(selectedExp);

    /* Display the generated question */
    const question = session.question;
    setText('q-experiment-label', session.experiment_title || selectedExp);
    setText('q-title',   question?.title   || 'Practical Question');
    setText('q-formula', question?.formula || '');
    setText('q-text',    question?.text    || '');

    goToStep(3);
  });

  function buildConfig() {
    if (selectedExp === 'pendulum') {
      if (!pendOsc) { showError('Please select the number of oscillations.'); return null; }
      return {
        num_trials:   pendTrials,
        oscillations: pendOsc,
      };
    }

    if (selectedExp === 'hookes') {
      const naturalLen = parseFloat(document.getElementById('hookes-natural-len')?.value) || 10;
      const masses = Array.from({length: hookesTrials}, (_, i) => hookesIncrement * (i + 1));
      /* Validate max mass */
      const maxMass = tierInfo.max_mass_g;
      if (masses[masses.length - 1] > maxMass) {
        showError(`Final mass (${masses[masses.length-1]}g) exceeds your plan's limit of ${maxMass}g. Reduce trials or mass increment.`);
        return null;
      }
      return {
        num_trials:         hookesTrials,
        natural_length_cm:  naturalLen,
        masses_g:           masses,
        mass_increment_g:   hookesIncrement,
      };
    }

    if (selectedExp === 'moments') {
      const pivot = parseInt(document.getElementById('moments-pivot')?.value) || 50;
      return {
        num_trials: momentsTrials,
        pivot_cm:   pivot,
        forces:     [],   /* entered per-trial in the lab */
      };
    }

    return null;
  }

  /* ── Step 3 navigation ── */
  document.getElementById('step3-back-btn')?.addEventListener('click', () => goToStep(2));

  document.getElementById('start-exp-btn')?.addEventListener('click', () => {
    Router.lab();
  });

  /* ════════════════════════════════════════════════════════
     Step progress helpers
  ════════════════════════════════════════════════════════ */

  function goToStep(n) {
    /* Update panels */
    [1, 2, 3].forEach(i => {
      const panel = document.getElementById(`panel-${i}`);
      if (panel) panel.classList.toggle('active', i === n);
    });

    /* Update step indicators */
    [1, 2, 3].forEach(i => {
      const ind = document.getElementById(`step-ind-${i}`);
      const num = document.getElementById(`step-num-${i}`);
      if (!ind || !num) return;
      ind.classList.remove('active', 'done');
      if (i < n)  { ind.classList.add('done');   num.textContent = '✓'; }
      if (i === n) { ind.classList.add('active'); num.textContent = i;   }
      if (i > n)  { num.textContent = i; }
    });

    /* Update connector lines */
    [1, 2].forEach(i => {
      const line = document.getElementById(`step-line-${i}`);
      if (line) line.classList.toggle('done', i < n);
    });

    /* Rebuild summary whenever entering step 2 */
    if (n === 2) updateSummary();
  }

  /* ════════════════════════════════════════════════════════
     Helpers
  ════════════════════════════════════════════════════════ */

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '';
  }

  function showError(msg) {
    const el = document.getElementById('ce-error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearError() {
    const el = document.getElementById('ce-error');
    if (el) el.classList.add('hidden');
  }

});
