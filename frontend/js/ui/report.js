/* ============================================================
   LabWise — report.js
   Renders the full 11-section WAEC practical report.
   Free-tier users see the locked overlay instead.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  if (!Storage.requireAuth()) return;

  const session = Storage.getLabSession();
  const expName = Storage.getExperiment();
  const user    = Storage.getUser();

  if (!session || !expName) { Router.dashboard(); return; }

  /* ── Tier gate ── */
  if (user?.tier === 'free') {
    document.getElementById('report-locked')?.classList.remove('hidden');
    document.getElementById('report-body')?.classList.add('hidden');
    return;
  }

  /* ── Extract data ── */
  const report    = extractReport(session);
  const final     = session.final_result || session.final?.final_result || {};
  const graphData = session.final?.graph_data || session.graph_data || null;
  const readings  = session.readings || [];

  if (!report) {
    document.getElementById('report-locked')?.classList.remove('hidden');
    document.getElementById('report-body')?.classList.add('hidden');
    return;
  }

  /* ── Header ── */
  setText('report-exp-title',    session.experiment_title || expName);
  setText('report-exp-subtitle', 'WAEC Physics Practical Report');
  setText('rpt-student', user?.username || 'Student');
  setText('rpt-date',    formatDate(new Date()));
  setText('rpt-session', `#${session.id}`);

  /* ── Sections ── */
  setText('rpt-aim',    report.aim    || '');
  setText('rpt-theory', report.theory || '');

  buildList('rpt-apparatus',  report.apparatus,       false);
  buildList('rpt-precautions',report.precautions,      true);
  buildList('rpt-errors',     report.sources_of_error, false);

  /* Formula */
  setText('rpt-formula',          report.formula          || '');
  setText('rpt-formula-explained', report.formula_explained || '');

  /* Diagram */
  buildDiagram(expName);

  /* Procedure */
  buildProcedure(expName);

  /* Table */
  buildReportTable(readings, expName);

  /* Graph */
  if (graphData) {
    drawReportGraph('report-graph-canvas', graphData);
    setText('rpt-graph-caption',
      `Fig. 1 — ${graphData.y_label} against ${graphData.x_label}. ` +
      `Gradient = ${graphData.gradient?.toFixed(4)}, R² = ${graphData.r_squared?.toFixed(4)}.`
    );
  }

  /* Calculation */
  buildCalculation(expName, graphData, final);

  /* Conclusion */
  setText('rpt-conclusion',          report.conclusion || '');
  setText('rpt-result-label',        report.result_label || 'Result');
  setText('rpt-result-value',
    `${final.result_value?.toFixed(4) ?? '—'} ${final.unit ?? ''}`);
  setText('rpt-result-uncertainty',
    `± ${final.uncertainty?.toFixed(4) ?? '—'} ${final.unit ?? ''}`);

});

/* ════════════════════════════════════════════════════════════
   BUILDERS
════════════════════════════════════════════════════════════ */

function buildList(id, items, numbered) {
  const el = document.getElementById(id);
  if (!el || !Array.isArray(items)) return;
  el.innerHTML = '';
  if (numbered) el.classList.add('numbered');
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  });
}

function buildDiagram(expName) {
  const wrap = document.getElementById('rpt-diagram');
  if (!wrap) return;
  wrap.innerHTML = getDiagramSVG(expName);
}

function getDiagramSVG(expName) {
  if (expName === 'pendulum') return `
    <svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg" style="max-height:220px;">
      <rect x="0" y="0" width="240" height="14" fill="#1e293b"/>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#334155" stroke-width="2.5"/>
      </pattern>
      <rect x="0" y="0" width="240" height="14" fill="url(#hatch)" opacity="0.5"/>
      <rect x="100" y="4" width="40" height="22" rx="4" fill="#475569"/>
      <rect x="113" y="24" width="14" height="7" rx="3" fill="#64748b"/>
      <ellipse cx="120" cy="35" rx="9" ry="4" fill="#92400e"/>
      <line x1="120" y1="35" x2="96" y2="200" stroke="#cbd5e1" stroke-width="2"/>
      <circle cx="96" cy="213" r="16" fill="#4ade80" stroke="#22c55e" stroke-width="2"/>
      <line x1="120" y1="35" x2="120" y2="290" stroke="#4ade80" stroke-width="0.8" stroke-dasharray="5,4" opacity="0.2"/>
      <line x1="148" y1="35" x2="148" y2="200" stroke="#64748b" stroke-width="1" stroke-dasharray="3"/>
      <text x="152" y="122" fill="#64748b" font-size="12" font-family="JetBrains Mono">L</text>
      <path d="M120 80 A28 28 0 0 1 109 108" stroke="#f59e0b" stroke-width="1.2" fill="none" stroke-dasharray="3"/>
      <text x="124" y="104" fill="#f59e0b" font-size="10" font-family="JetBrains Mono">θ</text>
      <text x="28" y="272" fill="#4ade80" font-size="11" font-family="JetBrains Mono">g = 4π²L / T²</text>
    </svg>`;

  if (expName === 'hookes') return `
    <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg" style="max-height:220px;">
      <rect x="0" y="0" width="220" height="12" fill="#1e293b"/>
      <rect x="28" y="12" width="12" height="260" rx="3" fill="#334155"/>
      <rect x="28" y="30" width="80" height="8" rx="3" fill="#475569"/>
      <rect x="95" y="22" width="14" height="22" rx="3" fill="#475569"/>
      <rect x="48" y="30" width="8" height="220" rx="2" fill="#1e3a5f" stroke="#334155"/>
      <g fill="#94a3b8" font-size="8" font-family="JetBrains Mono">
        <text x="40" y="48">0</text><text x="38" y="98">5</text>
        <text x="36" y="148">10</text><text x="36" y="198">15</text>
      </g>
      <path d="M102 44 L88 58 L116 72 L88 86 L116 100 L88 114 L116 128 L88 142 L102 156"
            stroke="#22d3ee" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <line x1="56" y1="44" x2="100" y2="44" stroke="#4ade80" stroke-width="1.2" stroke-dasharray="3"/>
      <text x="104" y="48" fill="#4ade80" font-size="8" font-family="JetBrains Mono">L₀</text>
      <rect x="88" y="156" width="30" height="22" rx="4" fill="#3b82f6"/>
      <text x="103" y="172" text-anchor="middle" fill="white" font-size="9" font-family="JetBrains Mono">m</text>
      <line x1="130" y1="44" x2="130" y2="156" stroke="#94a3b8" stroke-width="1"/>
      <text x="134" y="104" fill="#94a3b8" font-size="11" font-family="JetBrains Mono">x</text>
      <text x="28" y="250" fill="#4ade80" font-size="11" font-family="JetBrains Mono">k = F / x</text>
    </svg>`;

  return `
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style="max-height:180px;">
      <rect x="110" y="140" width="100" height="12" rx="4" fill="#334155"/>
      <rect x="152" y="88" width="16" height="56" rx="3" fill="#475569"/>
      <polygon points="160,88 148,110 172,110" fill="#f59e0b"/>
      <rect x="16" y="78" width="288" height="12" rx="6"
            fill="#d97706" stroke="#b45309" stroke-width="1.5"/>
      <g fill="#78350f" font-size="8" font-family="JetBrains Mono">
        <text x="20" y="76">0</text><text x="85" y="76">25</text>
        <text x="152" y="74">50</text><text x="220" y="76">75</text>
        <text x="286" y="76">100</text>
      </g>
      <line x1="64" y1="90" x2="64" y2="108" stroke="#8b5cf6" stroke-width="1.5"/>
      <rect x="46" y="108" width="36" height="20" rx="4" fill="#8b5cf6"/>
      <text x="64" y="122" text-anchor="middle" fill="white" font-size="9" font-family="JetBrains Mono">F₁</text>
      <line x1="244" y1="90" x2="244" y2="108" stroke="#ef4444" stroke-width="1.5"/>
      <rect x="226" y="108" width="36" height="20" rx="4" fill="#ef4444"/>
      <text x="244" y="122" text-anchor="middle" fill="white" font-size="9" font-family="JetBrains Mono">F₂</text>
      <line x1="64" y1="68" x2="160" y2="68" stroke="#8b5cf6" stroke-width="1"/>
      <text x="106" y="64" text-anchor="middle" fill="#8b5cf6" font-size="9" font-family="JetBrains Mono">d₁</text>
      <line x1="160" y1="68" x2="244" y2="68" stroke="#ef4444" stroke-width="1"/>
      <text x="202" y="64" text-anchor="middle" fill="#ef4444" font-size="9" font-family="JetBrains Mono">d₂</text>
      <text x="60" y="168" fill="#4ade80" font-size="11" font-family="JetBrains Mono">F₁×d₁ = F₂×d₂</text>
    </svg>`;
}

function buildProcedure(expName) {
  const procedures = {
    pendulum: [
      'Set up the retort stand and clamp it firmly to the bench.',
      'Thread the string through the split cork and tighten. Measure the length L from the pivot (bottom of cork) to the centre of the bob using a metre rule.',
      'Displace the bob to one side through a small angle (less than 10°) and release it gently without pushing.',
      'Start the stopwatch as the bob passes the centre (equilibrium) position.',
      'Count the set number of oscillations (one oscillation = full back-and-forth) and stop the stopwatch. Record this as t₁.',
      'Repeat the timing two more times without changing the length. Record as t₂ and t₃.',
      'Calculate the average time t̄ = (t₁ + t₂ + t₃) / 3, then T = t̄ / n (where n = number of oscillations), then T².',
      'Adjust the length to the next value and repeat steps 3–7 for all trials.',
      'Plot a graph of T² (y-axis) against L (x-axis). Draw the best-fit straight line.',
      'Determine the gradient of the line. Calculate g = 4π² / gradient.',
    ],
    hookes: [
      'Set up the retort stand and clamp the spring so it hangs vertically.',
      'Attach the pointer to the lower end of the spring and position the metre rule vertically beside it.',
      'With no load attached, read the natural length L₀ from the ruler at eye level to avoid parallax.',
      'Place the mass hanger on the spring and add the first mass. Wait for the spring to stop oscillating.',
      'Read the new length from the ruler at eye level. Record it as the new length for this trial.',
      'Calculate the extension x = new length − L₀ and the applied force F = mg (g = 9.81 m/s²).',
      'Add the next mass and repeat steps 4–6 for all masses.',
      'Plot a graph of Force F (y-axis) against Extension x (x-axis).',
      'Draw the best-fit straight line through the origin. The gradient equals the spring constant k.',
    ],
    moments: [
      'Balance the metre rule on the knife-edge pivot. Confirm it is horizontal using a spirit level or by eye.',
      'Hang weight F₁ at distance d₁ from the pivot on the left side using a mass hanger.',
      'Hang weight F₂ on the right side and adjust its distance d₂ until the rule balances horizontally.',
      'Record F₁, d₁, F₂, and d₂. Calculate M₁ = F₁ × d₁ and M₂ = F₂ × d₂.',
      'Calculate the percentage difference: |M₁ − M₂| / ((M₁+M₂)/2) × 100%.',
      'Repeat with different values of F₁, d₁, F₂, and d₂ for all trials.',
      'Plot a graph of M₂ (y-axis) against M₁ (x-axis). A straight line through the origin with gradient ≈ 1.0 verifies the principle.',
    ],
  };

  const list = document.getElementById('rpt-procedure');
  if (!list) return;
  list.innerHTML = '';
  list.classList.add('numbered');
  (procedures[expName] || []).forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    list.appendChild(li);
  });
}

function buildReportTable(readings, expName) {
  const thead = document.getElementById('rpt-table-head');
  const tbody = document.getElementById('rpt-table-body');
  if (!thead || !tbody) return;

  const heads = {
    pendulum: ['#','L (cm)','t₁ (s)','t₂ (s)','t₃ (s)','Avg t (s)','T (s)','T² (s²)','g (m/s²)'],
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
      <td>${n}</td><td>${ai.length_cm}</td>
      <td>${ai.t1}</td><td>${ai.t2}</td><td>${ai.t3}</td>
      <td>${c.avg_t}</td><td>${c.T}</td><td>${c.T_squared}</td>
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

function buildCalculation(expName, graphData, final) {
  const el = document.getElementById('rpt-calculation');
  if (!el || !graphData) return;

  const g  = graphData.gradient?.toFixed(4)  ?? '—';
  const i  = graphData.intercept?.toFixed(4) ?? '—';
  const r2 = graphData.r_squared?.toFixed(4) ?? '—';
  const v  = final.result_value?.toFixed(4)  ?? '—';
  const u  = final.uncertainty?.toFixed(4)   ?? '—';
  const unit = final.unit ?? '';

  let steps = [];

  if (expName === 'pendulum') {
    steps = [
      ['From graph',  `Gradient = ΔT² / ΔL = ${g} s²/m`],
      ['Formula',     'g = 4π² / gradient'],
      ['Working',     `g = 4 × (3.14159)² / ${g}`],
      ['Result',      `g = ${v} ± ${u} ${unit}`, true],
      ['R²',          `${r2} (linearity of T² vs L graph)`],
    ];
  } else if (expName === 'hookes') {
    steps = [
      ['From graph',  `Gradient = ΔF / Δx = ${g} N/m`],
      ['Conclusion',  'Gradient of F vs x graph = spring constant k'],
      ['Result',      `k = ${v} ± ${u} ${unit}`, true],
      ['Y-intercept', `${i} (should be ≈ 0 for Hooke's Law)`],
      ['R²',          `${r2} (linearity of F vs x)`],
    ];
  } else if (expName === 'moments') {
    steps = [
      ['From graph',  `Gradient of M₂ vs M₁ = ${g} (should be ≈ 1.0)`],
      ['Avg % diff',  `${v} ± ${u} ${unit}`, true],
      ['Y-intercept', `${i} (should be ≈ 0)`],
      ['R²',          `${r2}`],
    ];
  }

  el.innerHTML = steps.map(([label, val, highlight]) => `
    <div class="calc-step">
      <span class="calc-step-label">${label}:</span>
      <span class="calc-step-val${highlight ? ' highlight' : ''}">${val}</span>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════════════════════
   REPORT GRAPH (smaller version of graph.js draw)
════════════════════════════════════════════════════════════ */

function drawReportGraph(canvasId, graphData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  const W    = canvas.width;
  const H    = canvas.height;
  const PAD  = { top:36, right:36, bottom:58, left:64 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top  - PAD.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#050c18';
  ctx.fillRect(0, 0, W, H);

  const xVals = graphData.x_values || [];
  const yVals = graphData.y_values || [];
  if (xVals.length < 2) return;

  const xMax = Math.max(...xVals) * 1.18;
  const yMax = Math.max(...yVals) * 1.18;
  const xMin = 0, yMin = 0;

  function toX(v) { return PAD.left  + ((v-xMin)/(xMax-xMin))*plotW; }
  function toY(v) { return PAD.top   + plotH - ((v-yMin)/(yMax-yMin))*plotH; }

  /* Grid */
  ctx.strokeStyle='rgba(30,58,138,0.5)'; ctx.lineWidth=0.8;
  for (let i=0; i<=5; i++) {
    ctx.beginPath(); ctx.moveTo(PAD.left+(i/5)*plotW, PAD.top); ctx.lineTo(PAD.left+(i/5)*plotW, PAD.top+plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD.left, PAD.top+(i/5)*plotH); ctx.lineTo(PAD.left+plotW, PAD.top+(i/5)*plotH); ctx.stroke();
  }

  /* Axes */
  ctx.strokeStyle='#475569'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(PAD.left,PAD.top+plotH); ctx.lineTo(PAD.left+plotW,PAD.top+plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD.left,PAD.top);       ctx.lineTo(PAD.left,PAD.top+plotH); ctx.stroke();

  /* Axis labels */
  ctx.fillStyle='#64748b'; ctx.font='9px JetBrains Mono,monospace'; ctx.textAlign='center';
  for (let i=0;i<=5;i++){
    ctx.fillText((xMin+(i/5)*(xMax-xMin)).toFixed(3), PAD.left+(i/5)*plotW, PAD.top+plotH+14);
    ctx.textAlign='right';
    ctx.fillText((yMin+((5-i)/5)*(yMax-yMin)).toFixed(3), PAD.left-5, PAD.top+(i/5)*plotH+3);
    ctx.textAlign='center';
  }

  /* Axis titles */
  ctx.fillStyle='#94a3b8'; ctx.font='11px Space Grotesk,sans-serif';
  ctx.fillText(graphData.x_label||'x', PAD.left+plotW/2, H-10);
  ctx.save(); ctx.translate(13, PAD.top+plotH/2); ctx.rotate(-Math.PI/2);
  ctx.fillText(graphData.y_label||'y', 0, 0); ctx.restore();

  /* Best-fit line */
  const grad=graphData.gradient||0, intc=graphData.intercept||0;
  ctx.strokeStyle='#22d3ee'; ctx.lineWidth=1.5; ctx.setLineDash([5,3]);
  ctx.beginPath(); ctx.moveTo(toX(xMin),toY(grad*xMin+intc)); ctx.lineTo(toX(xMax),toY(grad*xMax+intc)); ctx.stroke();
  ctx.setLineDash([]);

  /* Data points */
  xVals.forEach((x,i)=>{
    const y=yVals[i];
    ctx.beginPath(); ctx.arc(toX(x),toY(y),6,0,Math.PI*2);
    ctx.fillStyle='rgba(74,222,128,0.12)'; ctx.strokeStyle='#4ade80'; ctx.lineWidth=1.5;
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(toX(x),toY(y),2.5,0,Math.PI*2);
    ctx.fillStyle='#4ade80'; ctx.fill();
  });
}

/* ── Helpers ── */
function extractReport(session) {
  return session.final?.report || session.result?.report || null;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB',
    { day:'2-digit', month:'long', year:'numeric' });
}
