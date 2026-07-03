/* ============================================================
   LabWise — pendulum.js  (WAEC-corrected)

   WAEC format:
     - Student enters length L
     - Clicks "Release Bob" ONCE per length
     - Simulation counts N oscillations, auto-fills t
     - Student manually types T = t/N  and  T² = T×T
     - System validates their entries silently
     - Record button submits length, t, student_T, student_T2
   ============================================================ */

const Pendulum = (() => {

  /* ── Physics constants ── */
  const DAMPING    = 0.025;  // amplitude loss per half-swing
  const AMPLITUDE0 = 22;     // initial angle degrees

  /* ── State ── */
  let currentLength    = 40;
  let numOscillations  = 20;
  let currentAmplitude = AMPLITUDE0;
  let animFrame        = null;
  let animStart        = null;

  /* Stopwatch */
  let swRunning  = false;
  let swStart    = 0;
  let swInterval = null;
  let tFilled    = false;   // true once simulation fills t

  /* Oscillation counting */
  let halfSwings = 0;
  let oscCount   = 0;
  let lastSign   = 1;

  /* DOM refs */
  let stringEl, bobEl, lenLabelEl, oscDisplayEl;

  /* ════════════════════════════════
     INIT
  ════════════════════════════════ */

  function init(LabState) {
    stringEl     = document.getElementById('pend-string');
    bobEl        = document.getElementById('pend-bob');
    lenLabelEl   = document.getElementById('pend-len-label');
    oscDisplayEl = document.getElementById('osc-display');

    numOscillations = LabState.config?.oscillations || 20;
    setText('pend-osc-display', numOscillations);

    /* Update string visually when student types length */
    document.getElementById('pend-length')
      ?.addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v >= 10 && v <= 200) {
          currentLength = v;
          updateStringVisual(v);
          if (lenLabelEl) lenLabelEl.textContent = `L = ${v} cm`;
        }
      });

    /* Release Bob — single timing per trial */
    document.getElementById('release-bob-btn')
      ?.addEventListener('click', releaseBob);

    /* Live validation when student types T or T² */
    document.getElementById('pend-T')
      ?.addEventListener('input', validateStudentCalcs);
    document.getElementById('pend-T2')
      ?.addEventListener('input', validateStudentCalcs);

    updateForTrial(LabState);
  }

  /* ════════════════════════════════
     UPDATE FOR TRIAL
  ════════════════════════════════ */

  function updateForTrial(LabState) {
    stopAnimation();
    resetTiming();

    const lenEl = document.getElementById('pend-length');
    if (lenEl) lenEl.value = '';
    if (lenLabelEl) lenLabelEl.textContent = 'L = — cm';
    currentLength = 40;
    applyAngle(0, 40);

    setText('timing-slot-info', 'Enter length above, then click Release Bob');

    /* Reset release button */
    const btn = document.getElementById('release-bob-btn');
    if (btn) { btn.disabled = false; btn.textContent = '🔵 Release Bob'; }
  }

  /* ════════════════════════════════
     RELEASE BOB (single timing)
  ════════════════════════════════ */

  function releaseBob() {
    const lenVal = parseFloat(document.getElementById('pend-length')?.value);
    if (isNaN(lenVal) || lenVal < 10 || lenVal > 200) {
      showErr('Enter a valid pendulum length (10–200 cm) first.');
      return;
    }
    clearErr();

    currentLength    = lenVal;
    currentAmplitude = AMPLITUDE0;
    halfSwings       = 0;
    oscCount         = 0;
    lastSign         = 1;
    tFilled          = false;

    /* Clear previous calculated entries */
    ['pend-t', 'pend-T', 'pend-T2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('calc-correct', 'calc-wrong'); }
    });
    clearValidationMsg();

    updateStringVisual(currentLength);
    startStopwatch();
    startAnimation(currentLength);

    const btn = document.getElementById('release-bob-btn');
    if (btn) { btn.disabled = true; btn.textContent = '🔄 Swinging…'; }

    setText('timing-slot-info', `Counting ${numOscillations} oscillations…`);
  }

  /* ════════════════════════════════
     ANIMATION
  ════════════════════════════════ */

  function startAnimation(lengthCm) {
    if (animFrame) cancelAnimationFrame(animFrame);
    animStart = null;

    const L      = lengthCm / 100;
    const period = 2 * Math.PI * Math.sqrt(L / 9.81) * 1000; // ms

    function frame(ts) {
      if (!animStart) animStart = ts;
      const elapsed  = ts - animStart;
      const rawAngle = Math.sin((2 * Math.PI * elapsed) / period);
      const angle    = currentAmplitude * rawAngle;

      applyAngle(angle, lengthCm);

      if (swRunning) {
        const sign = rawAngle >= 0 ? 1 : -1;
        if (sign !== lastSign) {
          halfSwings++;
          lastSign = sign;
          currentAmplitude *= (1 - DAMPING);

          if (halfSwings % 2 === 0) {
            oscCount = halfSwings / 2;
            if (oscDisplayEl)
              oscDisplayEl.textContent = `Swings: ${oscCount} / ${numOscillations}`;

            if (oscCount >= numOscillations) {
              stopAnimation();
              stopStopwatch();
              return;
            }
          }
        }
      }

      animFrame = requestAnimationFrame(frame);
    }

    animFrame = requestAnimationFrame(frame);
  }

  function stopAnimation() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }

  function applyAngle(angleDeg, lengthCm) {
    const pivotX = 200, pivotY = 48;
    const pixLen = lengthToPx(lengthCm);
    const rad    = angleDeg * Math.PI / 180;
    const bx     = pivotX + pixLen * Math.sin(rad);
    const by     = pivotY + pixLen * Math.cos(rad);
    if (stringEl) { stringEl.setAttribute('x2', bx.toFixed(1)); stringEl.setAttribute('y2', by.toFixed(1)); }
    if (bobEl)    { bobEl.setAttribute('cx', bx.toFixed(1));    bobEl.setAttribute('cy', (by + 20).toFixed(1)); }
  }

  function updateStringVisual(lengthCm) {
    const px = lengthToPx(lengthCm);
    if (stringEl) { stringEl.setAttribute('x2', 200); stringEl.setAttribute('y2', 48 + px); }
    if (bobEl)    { bobEl.setAttribute('cx', 200);    bobEl.setAttribute('cy', 48 + px + 20); }
    const lenLine = document.getElementById('pend-len-line');
    if (lenLine)  lenLine.setAttribute('y2', 48 + px);
  }

  function lengthToPx(cm) {
    return 50 + ((cm - 10) / 190) * 240;
  }

  /* ════════════════════════════════
     STOPWATCH
  ════════════════════════════════ */

  function startStopwatch() {
    swRunning  = true;
    swStart    = performance.now();
    swInterval = setInterval(updateSwDisplay, 50);
  }

  function stopStopwatch() {
    if (!swRunning) return;
    swRunning = false;
    clearInterval(swInterval);

    const elapsed = (performance.now() - swStart) / 1000;
    const tEl = document.getElementById('pend-t');
    if (tEl) tEl.value = elapsed.toFixed(2);
    tFilled = true;

    setText('timing-slot-info',
      `t = ${elapsed.toFixed(2)} s for ${numOscillations} oscillations. Now calculate T and T² below.`);

    const btn = document.getElementById('release-bob-btn');
    if (btn) { btn.disabled = true; btn.textContent = '✅ Timing done'; }
  }

  function updateSwDisplay() {
    const elapsed = (performance.now() - swStart) / 1000;
    const m = Math.floor(elapsed / 60);
    const s = (elapsed % 60).toFixed(2).padStart(5, '0');
    setText('sw-time', m > 0 ? `${m}:${s}` : s);
  }

  function resetTiming() {
    swRunning = false;
    clearInterval(swInterval);
    stopAnimation();
    halfSwings       = 0;
    oscCount         = 0;
    tFilled          = false;
    currentAmplitude = AMPLITUDE0;
    lastSign         = 1;
    setText('sw-time', '00.00');
    if (oscDisplayEl) oscDisplayEl.textContent = `Swings: 0 / ${numOscillations}`;
    ['pend-t', 'pend-T', 'pend-T2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('calc-correct', 'calc-wrong'); }
    });
    clearValidationMsg();
  }

  /* ════════════════════════════════
     LIVE VALIDATION OF STUDENT CALCS
  ════════════════════════════════ */

  function validateStudentCalcs() {
    const t  = parseFloat(document.getElementById('pend-t')?.value);
    const sT  = parseFloat(document.getElementById('pend-T')?.value);
    const sT2 = parseFloat(document.getElementById('pend-T2')?.value);

    if (!tFilled || isNaN(t)) return;

    const correctT  = parseFloat((t / numOscillations).toFixed(2));
    const correctT2 = parseFloat((correctT * correctT).toFixed(2));

    const tolPct = 2; // 2% tolerance

    function check(studentVal, correctVal, fieldId) {
      const el = document.getElementById(fieldId);
      if (!el || isNaN(studentVal)) return;
      const pct = Math.abs(studentVal - correctVal) / correctVal * 100;
      el.classList.remove('calc-correct', 'calc-wrong');
      el.classList.add(pct <= tolPct ? 'calc-correct' : 'calc-wrong');
    }

    if (!isNaN(sT))  check(sT,  correctT,  'pend-T');
    if (!isNaN(sT2)) check(sT2, correctT2, 'pend-T2');

    /* Show hint if both filled and at least one wrong */
    if (!isNaN(sT) && !isNaN(sT2)) {
      const tOk  = Math.abs(sT  - correctT)  / correctT  * 100 <= tolPct;
      const t2Ok = Math.abs(sT2 - correctT2) / correctT2 * 100 <= tolPct;
      const msgEl = document.getElementById('calc-validation-msg');
      if (msgEl) {
        if (tOk && t2Ok) {
          msgEl.textContent = '✅ Correct! Click Record ✓';
          msgEl.className   = 'calc-msg correct';
        } else {
          const hint = !tOk
            ? `Hint: T = t ÷ ${numOscillations} = ${t} ÷ ${numOscillations}`
            : `Hint: T² = T × T = ${sT} × ${sT}`;
          msgEl.textContent = `⚠️ Check your calculation. ${hint}`;
          msgEl.className   = 'calc-msg wrong';
        }
      }
    }
  }

  function clearValidationMsg() {
    const msgEl = document.getElementById('calc-validation-msg');
    if (msgEl) { msgEl.textContent = ''; msgEl.className = 'calc-msg'; }
  }

  /* ════════════════════════════════
     INPUTS — what gets sent to backend
  ════════════════════════════════ */

  function getInputs(LabState) {
    const length    = parseFloat(document.getElementById('pend-length')?.value);
    const t         = parseFloat(document.getElementById('pend-t')?.value);
    const student_T  = parseFloat(document.getElementById('pend-T')?.value);
    const student_T2 = parseFloat(document.getElementById('pend-T2')?.value);

    if (isNaN(length) || length < 10 || length > 200)
      return { error: 'Enter a valid pendulum length (10–200 cm).' };

    if (!tFilled || isNaN(t) || t <= 0)
      return { error: 'Click Release Bob to time the oscillations first.' };

    if (isNaN(student_T) || student_T <= 0)
      return { error: 'Calculate and enter T = t ÷ ' + numOscillations + '.' };

    if (isNaN(student_T2) || student_T2 <= 0)
      return { error: 'Calculate and enter T² = T × T.' };

    return {
      inputs: {
        length_cm:  length,
        t:          t,
        student_T:  student_T,
        student_T2: student_T2,
      }
    };
  }

  function clearInputs() {
    const lenEl = document.getElementById('pend-length');
    if (lenEl) lenEl.value = '';
    if (lenLabelEl) lenLabelEl.textContent = 'L = — cm';
    currentLength    = 40;
    currentAmplitude = AMPLITUDE0;
    stopAnimation();
    applyAngle(0, 40);
    resetTiming();

    const btn = document.getElementById('release-bob-btn');
    if (btn) { btn.disabled = false; btn.textContent = '🔵 Release Bob'; }
  }

  /* ── Helpers ── */
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '';
  }
  function showErr(msg) {
    const el = document.getElementById('input-error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  }
  function clearErr() {
    document.getElementById('input-error')?.classList.add('hidden');
  }

  return { init, updateForTrial, getInputs, clearInputs };

})();
