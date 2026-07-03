/* ============================================================
   LabWise — hookesLaw.js
   Spring stretch animation, live extension preview,
   and input handling for the Hooke's Law experiment.
   ============================================================ */

const HookesLaw = (() => {

  const SPRING_TOP_Y   = 36;   /* y where spring attaches to ceiling bracket */
  const NATURAL_BOT_Y  = 178;  /* spring bottom with no load */
  const PX_PER_CM      = 10;   /* scale: 1 cm extension = 10 px */

  let naturalLengthCm = 10;
  let currentMassG    = 0;
  let massIndex       = 0;

  /* ════════════════════════════════
     INIT
  ════════════════════════════════ */

  function init(LabState) {
    naturalLengthCm = LabState.config?.natural_length_cm || 10;

    /* Position the natural-length marker */
    const naturalMarker = document.getElementById('natural-marker');
    if (naturalMarker) naturalMarker.setAttribute('y1', NATURAL_BOT_Y);
    if (naturalMarker) naturalMarker.setAttribute('y2', NATURAL_BOT_Y);
    const naturalLabel = document.getElementById('natural-label');
    if (naturalLabel) naturalLabel.setAttribute('y', NATURAL_BOT_Y - 4);

    /* Draw spring at natural length */
    drawSpring(0);

    /* Live preview: update spring as student types new length */
    document.getElementById('hookes-new-length')
      ?.addEventListener('input', e => {
        const newLen = parseFloat(e.target.value);
        if (!isNaN(newLen) && newLen > naturalLengthCm) {
          const extCm = newLen - naturalLengthCm;
          setText('hookes-ext-preview', `${extCm.toFixed(1)} cm`);
          drawSpring(extCm);
          updateMassBlock(newLen);
        } else {
          setText('hookes-ext-preview', '— cm');
          drawSpring(0);
          hideMassBlock();
        }
      });

    updateForTrial(LabState);
  }

  /* ════════════════════════════════
     UPDATE FOR TRIAL
  ════════════════════════════════ */

  function updateForTrial(LabState) {
    const masses = LabState.config?.masses_g || [];
    massIndex    = LabState.readings.length;
    currentMassG = masses[massIndex] || 0;

    setText('hookes-current-mass',   `${currentMassG} g`);
    setText('hookes-natural-display', `${naturalLengthCm} cm`);

    drawSpring(0);
    hideMassBlock();

    /* Clear new length input */
    const el = document.getElementById('hookes-new-length');
    if (el) el.value = '';
    setText('hookes-ext-preview', '— cm');
    setText('hookes-new-len-display', '— cm');
    setText('hookes-ext-display', 'ext: — cm');

    /* Show the mass on the block */
    if (currentMassG > 0) {
      const massLabel = document.getElementById('hookes-mass-label');
      if (massLabel) {
        massLabel.textContent = currentMassG >= 1000
          ? `${(currentMassG/1000).toFixed(1)} kg`
          : `${currentMassG} g`;
      }
    }
  }

  /* ════════════════════════════════
     SPRING DRAWING
  ════════════════════════════════ */

  function drawSpring(extensionCm) {
    const pathEl = document.getElementById('spring-path');
    if (!pathEl) return;

    const bottomY = NATURAL_BOT_Y + extensionCm * PX_PER_CM;
    const coils   = 8;
    const d       = buildSpringPath(200, SPRING_TOP_Y, 200, bottomY, coils);
    pathEl.setAttribute('d', d);

    /* Move pointer */
    const pointer = document.getElementById('spring-pointer');
    if (pointer) {
      pointer.setAttribute('y1', bottomY);
      pointer.setAttribute('y2', bottomY);
    }

    /* Update readings display */
    if (extensionCm > 0) {
      const newLen = naturalLengthCm + extensionCm;
      setText('hookes-new-len-display', `${newLen.toFixed(1)} cm`);
      setText('hookes-ext-display',     `ext: ${extensionCm.toFixed(1)} cm`);
    }
  }

  function buildSpringPath(x, topY, _x2, bottomY, coils) {
    const height = bottomY - topY;
    const coilH  = height / coils;
    const amp    = 18;
    let d = `M ${x} ${topY}`;
    for (let i = 0; i < coils; i++) {
      const y1  = topY + i * coilH;
      const y2  = y1 + coilH;
      const mid = (y1 + y2) / 2;
      const dir = i % 2 === 0 ? 1 : -1;
      d += ` L ${x + dir * amp} ${mid} L ${x} ${y2}`;
    }
    return d;
  }

  /* ════════════════════════════════
     MASS BLOCK
  ════════════════════════════════ */

  function updateMassBlock(newLengthCm) {
    const extCm   = newLengthCm - naturalLengthCm;
    const blockY  = NATURAL_BOT_Y + extCm * PX_PER_CM;
    const rectEl  = document.getElementById('hookes-mass-rect');
    const labelEl = document.getElementById('hookes-mass-label');
    if (rectEl)  { rectEl.setAttribute('y', blockY); rectEl.setAttribute('opacity', '1'); }
    if (labelEl) {
      labelEl.setAttribute('y', blockY + 28);
      labelEl.setAttribute('opacity', '1');
      labelEl.textContent = currentMassG >= 1000
        ? `${(currentMassG/1000).toFixed(1)} kg`
        : `${currentMassG} g`;
    }
  }

  function hideMassBlock() {
    document.getElementById('hookes-mass-rect')?.setAttribute('opacity', '0');
    document.getElementById('hookes-mass-label')?.setAttribute('opacity', '0');
  }

  /* ════════════════════════════════
     INPUTS
  ════════════════════════════════ */

  function getInputs(LabState) {
    const masses = LabState.config?.masses_g || [];
    const massG  = masses[LabState.readings.length];
    const newLen = parseFloat(document.getElementById('hookes-new-length')?.value);

    if (!massG || massG <= 0)
      return { error: 'No mass configured for this trial.' };
    if (isNaN(newLen))
      return { error: 'Enter the new length of the spring after adding the mass.' };
    if (newLen <= naturalLengthCm)
      return { error: `New length must be greater than the natural length (${naturalLengthCm} cm).` };
    if (newLen > 60)
      return { error: 'New length seems too large. Check your reading.' };

    return { inputs: { mass_g: massG, new_length_cm: newLen } };
  }

  function clearInputs() {
    const el = document.getElementById('hookes-new-length');
    if (el) el.value = '';
    setText('hookes-ext-preview',    '— cm');
    setText('hookes-new-len-display','— cm');
    setText('hookes-ext-display',    'ext: — cm');
    drawSpring(0);
    hideMassBlock();
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '';
  }

  return { init, updateForTrial, getInputs, clearInputs };

})();
