/* ============================================================
   LabWise — moments.js
   Beam tilt animation, live moment preview, and input handling
   for the Principle of Moments experiment.
   ============================================================ */

const Moments = (() => {

  const PIVOT_X    = 240;
  const PIVOT_Y    = 154;
  const PX_PER_CM  = 4;    /* 4px per cm along the rule */

  let animFrame    = null;
  let targetAngle  = 0;
  let currentAngle = 0;

  /* ════════════════════════════════
     INIT
  ════════════════════════════════ */

  function init(LabState) {
    /* Live updates as student types forces/distances */
    ['moments-f1','moments-d1','moments-f2','moments-d2'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateLivePreview);
    });
    updateForTrial(LabState);
  }

  /* ════════════════════════════════
     UPDATE FOR TRIAL
  ════════════════════════════════ */

  function updateForTrial(LabState) {
    clearInputs();
    setAngle(0);
    hideMasses();
    setText('balance-status', '⚖️ —');
    document.getElementById('balance-status')?.setAttribute('fill', '#94a3b8');
    const previewEl = document.getElementById('balance-preview');
    if (previewEl) previewEl.classList.add('hidden');
  }

  /* ════════════════════════════════
     LIVE PREVIEW
  ════════════════════════════════ */

  function updateLivePreview() {
    const f1 = parseFloat(document.getElementById('moments-f1')?.value);
    const d1 = parseFloat(document.getElementById('moments-d1')?.value);
    const f2 = parseFloat(document.getElementById('moments-f2')?.value);
    const d2 = parseFloat(document.getElementById('moments-d2')?.value);

    /* Moment previews in input panel */
    setText('m1-preview', (!isNaN(f1) && !isNaN(d1)) ? (f1 * d1).toFixed(2) : '—');
    setText('m2-preview', (!isNaN(f2) && !isNaN(d2)) ? (f2 * d2).toFixed(2) : '—');

    if (!isNaN(f1) && !isNaN(d1) && !isNaN(f2) && !isNaN(d2)) {
      updateSVG(f1, d1, f2, d2);
      updateBalancePreview(f1 * d1, f2 * d2);
    }
  }

  /* ════════════════════════════════
     SVG UPDATE
  ════════════════════════════════ */

  function updateSVG(f1, d1Cm, f2, d2Cm) {
    /* Position masses on the rule */
    const leftX  = PIVOT_X - d1Cm * PX_PER_CM;
    const rightX = PIVOT_X + d2Cm * PX_PER_CM;

    const leftRect  = document.getElementById('left-mass-rect');
    const leftLabel = document.getElementById('left-mass-label');
    const rightRect = document.getElementById('right-mass-rect');
    const rightLabel= document.getElementById('right-mass-label');

    if (leftRect)  { leftRect.setAttribute('x',  leftX - 22);  leftRect.setAttribute('opacity',  '1'); }
    if (leftLabel) { leftLabel.setAttribute('x',  leftX);       leftLabel.setAttribute('opacity', '1'); leftLabel.textContent = `${f1}N`; }
    if (rightRect) { rightRect.setAttribute('x',  rightX - 22); rightRect.setAttribute('opacity', '1'); }
    if (rightLabel){ rightLabel.setAttribute('x', rightX);      rightLabel.setAttribute('opacity','1'); rightLabel.textContent = `${f2}N`; }

    /* Update moment displays */
    setText('moment1-display', `${(f1*d1Cm/100).toFixed(3)} N·m`);
    setText('moment2-display', `${(f2*d2Cm/100).toFixed(3)} N·m`);

    /* Tilt based on imbalance */
    const m1 = f1 * d1Cm;
    const m2 = f2 * d2Cm;
    const avg = (m1 + m2) / 2 || 1;
    const raw = ((m1 - m2) / avg) * 14;
    targetAngle = Math.max(-14, Math.min(14, raw));
    animateTilt();

    /* Balance status */
    const diff    = Math.abs(m1 - m2) / avg * 100;
    const statusEl = document.getElementById('balance-status');
    if (statusEl) {
      if (diff < 5) {
        statusEl.textContent = '⚖️ Balanced!';
        statusEl.setAttribute('fill', '#4ade80');
      } else if (diff < 15) {
        statusEl.textContent = '⚠️ Almost balanced';
        statusEl.setAttribute('fill', '#f59e0b');
      } else {
        statusEl.textContent = m1 > m2 ? '↙ Left heavy' : '↘ Right heavy';
        statusEl.setAttribute('fill', '#ef4444');
      }
    }
  }

  /* ════════════════════════════════
     BEAM TILT ANIMATION
  ════════════════════════════════ */

  function animateTilt() {
    if (animFrame) cancelAnimationFrame(animFrame);
    function step() {
      const diff = targetAngle - currentAngle;
      if (Math.abs(diff) < 0.05) { currentAngle = targetAngle; setAngle(currentAngle); return; }
      currentAngle += diff * 0.12;
      setAngle(currentAngle);
      animFrame = requestAnimationFrame(step);
    }
    animFrame = requestAnimationFrame(step);
  }

  function setAngle(deg) {
    const group = document.getElementById('moments-rule-group');
    if (group) group.setAttribute('transform', `rotate(${deg}, ${PIVOT_X}, ${PIVOT_Y})`);
  }

  /* ════════════════════════════════
     BALANCE PREVIEW
  ════════════════════════════════ */

  function updateBalancePreview(m1, m2) {
    const el = document.getElementById('balance-preview');
    if (!el) return;
    const diff = Math.abs(m1 - m2) / ((m1+m2)/2) * 100;
    el.classList.remove('hidden','balanced','unbalanced');
    if (diff < 5) {
      el.classList.add('balanced');
      el.textContent = `✅ Balanced! Difference: ${diff.toFixed(1)}%`;
    } else {
      el.classList.add('unbalanced');
      const side = m1 > m2 ? 'Left side heavier' : 'Right side heavier';
      el.textContent = `⚠️ ${side}. Difference: ${diff.toFixed(1)}%`;
    }
  }

  /* ════════════════════════════════
     INPUTS
  ════════════════════════════════ */

  function getInputs(LabState) {
    const f1 = parseFloat(document.getElementById('moments-f1')?.value);
    const d1 = parseFloat(document.getElementById('moments-d1')?.value);
    const f2 = parseFloat(document.getElementById('moments-f2')?.value);
    const d2 = parseFloat(document.getElementById('moments-d2')?.value);

    if (isNaN(f1) || f1 <= 0) return { error: 'Enter Force F₁ (left side).' };
    if (isNaN(d1) || d1 <= 0) return { error: 'Enter Distance d₁ from pivot.' };
    if (isNaN(f2) || f2 <= 0) return { error: 'Enter Force F₂ (right side).' };
    if (isNaN(d2) || d2 <= 0) return { error: 'Enter Distance d₂ from pivot.' };

    const maxForce = LabState.config?.max_force_n ||
                     (LabState.session?.config?.max_force_n) || 15;
    if (f1 > maxForce || f2 > maxForce)
      return { error: `Forces must not exceed ${maxForce} N on your current plan.` };

    const pivot = LabState.config?.pivot_cm || 50;
    if (d1 >= pivot)       return { error: `d₁ must be less than the pivot position (${pivot} cm).` };
    if (d2 >= 100 - pivot) return { error: `d₂ must be less than ${100 - pivot} cm.` };

    return { inputs: { f1, d1_cm: d1, f2, d2_cm: d2 } };
  }

  function clearInputs() {
    ['moments-f1','moments-d1','moments-f2','moments-d2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    setText('m1-preview', '—');
    setText('m2-preview', '—');
    setText('moment1-display', '— N·m');
    setText('moment2-display', '— N·m');
    const previewEl = document.getElementById('balance-preview');
    if (previewEl) previewEl.classList.add('hidden');
    hideMasses();
    targetAngle = 0;
    animateTilt();
  }

  function hideMasses() {
    ['left-mass-rect','right-mass-rect'].forEach(id =>
      document.getElementById(id)?.setAttribute('opacity','0'));
    ['left-mass-label','right-mass-label'].forEach(id =>
      document.getElementById(id)?.setAttribute('opacity','0'));
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '';
  }

  return { init, updateForTrial, getInputs, clearInputs };

})();
