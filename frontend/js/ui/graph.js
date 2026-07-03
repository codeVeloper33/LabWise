/* ============================================================
   LabWise — graph.js
   Draws the experiment graph on an HTML canvas, populates
   the stats sidebar, and builds the readings summary table.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  if (!Storage.requireAuth()) return;

  const session = Storage.getLabSession();
  const expName = Storage.getExperiment();

  if (!session || !expName) { Router.dashboard(); return; }

  /* ── Extract data ── */
  // finalize returns { ...session.to_dict(), final: { result_value, graph_data, ... } }
  // stored session in localStorage after finalize is the full object
  const finalObj  = session.final  || {};
  const final     = {
    result_value: finalObj.result_value ?? session.final_result?.result_value,
    uncertainty:  finalObj.uncertainty  ?? session.final_result?.uncertainty,
    unit:         finalObj.unit         ?? session.final_result?.unit,
  };
  const graphData = finalObj.graph_data || null;
  const readings  = session.readings || [];

  if (!graphData || readings.length < 2) {
    showError('Graph data not found. Please complete the experiment first.');
    return;
  }

  /* ── Titles ── */
  const titles = {
    pendulum: { title: 'Graph of T² against L',           sub: 'Gradient = 4π²/g' },
    hookes:   { title: 'Graph of Force F against Extension x', sub: 'Gradient = k (spring constant)' },
    moments:  { title: 'Graph of M₂ against M₁',          sub: 'Gradient ≈ 1.0 verifies the principle' },
  };
  const t = titles[expName] || {};
  setText('graph-page-title', t.title || 'Graph');
  setText('graph-title',      t.title || 'Graph');
  setText('graph-subtitle',   t.sub   || '');
  setText('graph-exp-badge',  session.experiment_title || expName);

  /* ── Result ── */
  const labels = { pendulum:'g (m/s²)', hookes:'k (N/m)', moments:'Avg % diff' };
  setText('result-label',       labels[expName] || 'Result');
  setText('result-value',       final.result_value?.toFixed(3) ?? '—');
  setText('result-unit',        final.unit       ?? '');
  setText('result-uncertainty', `± ${final.uncertainty?.toFixed(3) ?? '—'} ${final.unit ?? ''}`);

  /* ── Stats ── */
  setText('stat-gradient',  graphData.gradient?.toFixed(4)  ?? '—');
  setText('stat-intercept', graphData.intercept?.toFixed(4) ?? '—');
  setText('stat-r2',        graphData.r_squared?.toFixed(4) ?? '—');
  setText('stat-points',    graphData.x_values?.length      ?? '—');

  /* ── Quick summary ── */
  buildQuickSummary(expName, final, graphData);

  /* ── Draw graph ── */
  drawGraph('graph-canvas', graphData);

  /* ── Data table ── */
  buildGraphTable(readings, expName);

  /* ── Report button: hide if tier doesn't allow ── */
  const user = Storage.getUser();
  if (user?.tier === 'free') {
    document.getElementById('report-btn')?.classList.add('hidden');
    document.getElementById('view-report-btn')?.classList.add('hidden');
  }
});

/* ════════════════════════════════════════════════════════════
   QUICK SUMMARY
════════════════════════════════════════════════════════════ */

function buildQuickSummary(expName, final, graphData) {
  const el = document.getElementById('quick-summary-content');
  if (!el) return;
  const rows = [];

  if (expName === 'pendulum') {
    const g = final.result_value;
    const pctErr = g ? Math.abs(g - 9.81) / 9.81 * 100 : null;
    rows.push(['g from graph', `${g?.toFixed(3)} m/s²`]);
    rows.push(['Standard g', '9.81 m/s²']);
    rows.push(['% Error', pctErr != null ? `${pctErr.toFixed(2)}%` : '—']);
  } else if (expName === 'hookes') {
    rows.push(['k from graph', `${final.result_value?.toFixed(3)} N/m`]);
    rows.push(['Linearity (R²)', graphData.r_squared?.toFixed(4)]);
    rows.push(['Hooke\'s Law', graphData.r_squared > 0.99 ? '✅ Verified' : '⚠️ Check data']);
  } else if (expName === 'moments') {
    rows.push(['Avg % diff', `${final.result_value?.toFixed(2)}%`]);
    rows.push(['Gradient', graphData.gradient?.toFixed(4)]);
    rows.push(['Principle', final.result_value < 5 ? '✅ Verified' : '⚠️ Large error']);
  }

  el.innerHTML = rows.map(([k,v]) => `
    <div class="graph-stat-row">
      <span>${k}</span>
      <span>${v ?? '—'}</span>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════════════════════
   CANVAS GRAPH
════════════════════════════════════════════════════════════ */

function drawGraph(canvasId, graphData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  const W    = canvas.width;
  const H    = canvas.height;
  const PAD  = { top: 48, right: 44, bottom: 72, left: 76 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top  - PAD.bottom;

  /* Clear */
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#050c18';
  ctx.fillRect(0, 0, W, H);

  const xVals = graphData.x_values || [];
  const yVals = graphData.y_values || [];
  if (xVals.length < 2) return;

  /* Axis ranges — always include origin */
  const xMax = Math.max(...xVals) * 1.18;
  const yMax = Math.max(...yVals) * 1.18;
  const xMin = 0;
  const yMin = 0;

  function toX(v) { return PAD.left  + ((v - xMin) / (xMax - xMin)) * plotW; }
  function toY(v) { return PAD.top   + plotH - ((v - yMin) / (yMax - yMin)) * plotH; }

  /* ── Grid ── */
  const GRID = 5;
  ctx.strokeStyle = 'rgba(30,58,138,0.5)';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= GRID; i++) {
    const gx = PAD.left + (i / GRID) * plotW;
    const gy = PAD.top  + (i / GRID) * plotH;
    ctx.beginPath(); ctx.moveTo(gx, PAD.top);       ctx.lineTo(gx, PAD.top + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD.left, gy);       ctx.lineTo(PAD.left + plotW, gy); ctx.stroke();
  }

  /* ── Axes ── */
  ctx.strokeStyle = '#475569';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(PAD.left, PAD.top + plotH); ctx.lineTo(PAD.left + plotW, PAD.top + plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD.left, PAD.top);         ctx.lineTo(PAD.left, PAD.top + plotH); ctx.stroke();

  /* ── Axis labels ── */
  ctx.fillStyle = '#64748b';
  ctx.font      = '11px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i <= GRID; i++) {
    const xv = (xMin + (i / GRID) * (xMax - xMin));
    const yv = (yMin + (1 - i / GRID) * (yMax - yMin));
    ctx.fillText(xv.toFixed(3), PAD.left + (i / GRID) * plotW, PAD.top + plotH + 18);
    ctx.textAlign = 'right';
    ctx.fillText(yv.toFixed(3), PAD.left - 8, PAD.top + (i / GRID) * plotH + 4);
    ctx.textAlign = 'center';
  }

  /* ── Axis titles ── */
  ctx.fillStyle = '#94a3b8';
  ctx.font      = '13px Space Grotesk, sans-serif';
  ctx.fillText(graphData.x_label || 'x', PAD.left + plotW / 2, H - 12);
  ctx.save();
  ctx.translate(16, PAD.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(graphData.y_label || 'y', 0, 0);
  ctx.restore();

  /* ── Best-fit line ── */
  const grad = graphData.gradient  || 0;
  const intc = graphData.intercept || 0;
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth   = 2;
  ctx.setLineDash([7, 4]);
  ctx.beginPath();
  ctx.moveTo(toX(xMin), toY(grad * xMin + intc));
  ctx.lineTo(toX(xMax), toY(grad * xMax + intc));
  ctx.stroke();
  ctx.setLineDash([]);

  /* ── Gradient label on line ── */
  const midX = (xMin + xMax) / 2;
  const midY = grad * midX + intc;
  ctx.fillStyle  = '#22d3ee';
  ctx.font       = '11px JetBrains Mono, monospace';
  ctx.textAlign  = 'left';
  ctx.fillText(`gradient = ${grad.toFixed(4)}`, toX(midX) + 8, toY(midY) - 10);

  /* ── Data points ── */
  xVals.forEach((x, i) => {
    const y  = yVals[i];
    const cx = toX(x);
    const cy = toY(y);

    /* Outer glow ring */
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(74,222,128,0.12)';
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth   = 2;
    ctx.fill(); ctx.stroke();

    /* Inner dot */
    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();

    /* Coordinate label */
    ctx.fillStyle  = 'rgba(148,163,184,0.7)';
    ctx.font       = '10px JetBrains Mono, monospace';
    ctx.textAlign  = 'left';
    ctx.fillText(`(${x.toFixed(3)}, ${y.toFixed(3)})`, cx + 10, cy - 6);
  });

  /* ── Legend ── */
  const lx = PAD.left + plotW - 186;
  const ly = PAD.top  + 14;
  ctx.fillStyle = 'rgba(5,12,24,0.88)';
  ctx.beginPath(); ctx.roundRect(lx - 8, ly - 12, 194, 52, 6); ctx.fill();

  ctx.beginPath(); ctx.arc(lx + 6, ly + 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#4ade80'; ctx.fill();
  ctx.fillStyle = '#94a3b8'; ctx.font = '11px Space Grotesk, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('Data points', lx + 16, ly + 6);

  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.setLineDash([5,3]);
  ctx.beginPath(); ctx.moveTo(lx, ly + 24); ctx.lineTo(lx + 20, ly + 24); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#94a3b8'; ctx.fillText('Best-fit line', lx + 28, ly + 28);
}

/* ════════════════════════════════════════════════════════════
   DATA TABLE
════════════════════════════════════════════════════════════ */

function buildGraphTable(readings, expName) {
  const thead = document.getElementById('graph-table-head');
  const tbody = document.getElementById('graph-table-body');
  if (!thead || !tbody) return;

  const heads = {
    pendulum: ['#','L (cm)','L (m)','t (s)','T (s)','T² (s²)','g (m/s²)'],
    hookes:   ['#','Mass (g)','Mass (kg)','F (N)','New L (cm)','Ext (cm)','Ext (m)','k (N/m)'],
    moments:  ['#','F₁ (N)','d₁ (cm)','M₁ (N·m)','F₂ (N)','d₂ (cm)','M₂ (N·m)','% Diff'],
  };
  thead.innerHTML = `<tr>${(heads[expName]||[]).map(h=>`<th>${h}</th>`).join('')}</tr>`;
  tbody.innerHTML = '';

  readings.forEach(r => {
    const ai = r.adjusted_inputs;
    const c  = r.calculated;
    const n  = r.trial_number;
    let cells = '';

    if (expName === 'pendulum') cells = `
      <td>${n}</td>
      <td>${ai.length_cm}</td>
      <td>${ai.length_m}</td>
      <td>${ai.t}</td>
      <td>${c.correct_T}</td>
      <td>${c.correct_T2}</td>
      <td class="col-result">${c.g}</td>`;

    if (expName === 'hookes') cells = `
      <td>${n}</td><td>${ai.mass_g}</td><td>${ai.mass_kg}</td>
      <td>${c.force_N}</td><td>${ai.new_length_cm}</td>
      <td>${c.extension_cm}</td><td>${c.extension_m}</td>
      <td class="col-result">${c.k}</td>`;

    if (expName === 'moments') cells = `
      <td>${n}</td><td>${ai.f1}</td><td>${ai.d1_cm}</td>
      <td>${c.moment1_Nm}</td><td>${ai.f2}</td><td>${ai.d2_cm}</td>
      <td>${c.moment2_Nm}</td><td class="col-result">${c.difference_pct}%</td>`;

    const tr = document.createElement('tr');
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  });
}

/* ── Helpers ── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}

function showError(msg) {
  document.querySelector('.main-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;
                min-height:80vh;font-family:Space Grotesk,sans-serif;
                color:#ef4444;text-align:center;padding:20px;">
      <div>
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <p style="font-size:16px;">${msg}</p>
        <a href="dashboard.html" style="color:#3b82f6;margin-top:16px;display:block;">
          ← Dashboard
        </a>
      </div>
    </div>`;
}
