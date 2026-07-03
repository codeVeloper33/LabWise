/* ============================================================
   LabWise — experiments.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  if (!Storage.requireAuth()) return;

  const res = await ExperimentApi.listExperiments();
  if (!res.ok) return;

  const experiments = res.data.data.experiments || [];
  const tierInfo    = res.data.data.tier_info   || {};

  /* ── Tier banner ── */
  const tierNames = { free:'Free', tier1:'Tier 1', tier2:'Tier 2', tier3:'Tier 3' };
  setText('tier-banner-name',   tierNames[tierInfo.tier] || 'Free');
  setText('tier-banner-detail', tierInfo.tier === 'free'
    ? 'Simple Pendulum only. Upgrade for Hooke\'s Law and Moments.'
    : `All 3 experiments available. Up to ${tierInfo.max_trials} trials per session.`
  );

  /* ── Experiment cards ── */
  const grid = document.getElementById('exp-grid');
  if (!grid) return;

  const descs = {
    pendulum: 'Suspend a bob from a string of varying lengths. Time oscillations with a virtual stopwatch that auto-counts. Plot T² vs L and determine the acceleration due to gravity g.',
    hookes:   'Add masses to a spring and watch it stretch in real time. Record extensions for each mass, plot F vs x, and determine the spring constant k.',
    moments:  'Balance a virtual metre rule with weights on both sides of a pivot. Record forces and distances, plot M₂ vs M₁, and verify the Principle of Moments.',
  };
  const headers = { pendulum:'pendulum-bg', hookes:'hookes-bg', moments:'moments-bg' };
  const icons   = { pendulum:'🔵', hookes:'🟢', moments:'🟡' };
  const formulas= { pendulum:'g = 4π²L / T²', hookes:'k = F / x', moments:'F₁×d₁ = F₂×d₂' };
  const minTier = { pendulum:'Free', hookes:'Tier 1+', moments:'Tier 1+' };

  experiments.forEach(exp => {
    const accessible = tierInfo.experiments?.includes(exp.name);
    const card = document.createElement('div');
    card.className = `exp-full-card${accessible ? '' : ' locked'}`;

    card.innerHTML = `
      <div class="exp-full-card-header ${headers[exp.name]}">
        ${icons[exp.name]}
        ${!accessible ? `
          <div class="lock-overlay">
            <div class="lock-overlay-icon">🔒</div>
            <div class="lock-overlay-text">Requires Tier 1 or above</div>
          </div>` : ''}
      </div>
      <div class="exp-full-card-body">
        <h3>${exp.title}</h3>
        <p>${descs[exp.name]}</p>
        <div class="exp-full-formula">${formulas[exp.name]}</div>
        <div class="exp-full-card-footer">
          <span class="tier-tag ${accessible ? 'tier-free' : 'tier-paid'}">
            ${minTier[exp.name]}
          </span>
          ${accessible
            ? `<a href="create-experiment.html" class="btn-secondary"
                  style="padding:6px 14px;font-size:12px;">
                 Start →
               </a>`
            : `<a href="upgrade.html" class="btn-secondary"
                  style="padding:6px 14px;font-size:12px;">
                 ⭐ Upgrade
               </a>`
          }
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
});

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}
