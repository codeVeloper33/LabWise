/* ============================================================
   LabWise — upgrade.js
   Renders tier cards, handles Flutterwave payment flow,
   verifies payment on return, shows payment history.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  if (!Storage.requireAuth()) return;

  const user = Storage.getUser();
  const currentTier = user?.tier || 'free';

  /* ── Check for Flutterwave callback (transaction_id in URL) ── */
  const params         = new URLSearchParams(window.location.search);
  const status          = params.get('status');           // successful | cancelled | failed
  const transactionId   = params.get('transaction_id');
  const txRef           = params.get('tx_ref');
  if (transactionId && status === 'successful') {
    await handlePaymentReturn(transactionId, txRef);
  } else if (status === 'cancelled' || status === 'failed') {
    window.history.replaceState({}, '', window.location.pathname);
  }

  /* ── Load plans ── */
  const [plansRes, histRes] = await Promise.all([
    SubscriptionApi.getPlans(),
    SubscriptionApi.getHistory(),
  ]);

  if (plansRes.ok) {
    buildUpgradeGrid(plansRes.data.data.plans, currentTier);
  }

  if (histRes.ok) {
    buildPaymentHistory(histRes.data.data.subscriptions || []);
  }
});

/* ── Build upgrade cards ── */
function buildUpgradeGrid(plans, currentTier) {
  const grid = document.getElementById('upgrade-grid');
  if (!grid) return;

  const features = {
    free:  ['✅ Simple Pendulum only','✅ Length up to 50 cm','✅ 3 trials / session',
            '✅ 2 sessions / month','✅ Graph','❌ Full report','❌ PDF export'],
    tier1: ['✅ All 3 experiments','✅ Length up to 100 cm','✅ 5 trials / session',
            '✅ 10 sessions / month','✅ Graph','✅ Basic report','❌ PDF export'],
    tier2: ['✅ All 3 experiments','✅ Length up to 150 cm','✅ 8 trials / session',
            '✅ 30 sessions / month','✅ Graph','✅ Full report','❌ PDF export'],
    tier3: ['✅ All 3 experiments','✅ Length up to 200 cm','✅ Unlimited trials',
            '✅ Unlimited sessions','✅ Graph','✅ Full report','✅ PDF export'],
  };
  const names = { free:'Free', tier1:'Tier 1 — Basic', tier2:'Tier 2 — Standard', tier3:'Tier 3 — Premium' };

  plans.forEach(plan => {
    const isCurrent  = plan.tier === currentTier;
    const isFeatured = plan.tier === 'tier2';
    const isFree     = plan.tier === 'free';

    const card = document.createElement('div');
    card.className = `upgrade-card${isCurrent ? ' current-plan' : ''}${isFeatured && !isCurrent ? ' featured' : ''}`;

    const badge = isCurrent
      ? '<div class="upgrade-current-badge">✅ Current Plan</div>'
      : isFeatured ? '<div class="upgrade-badge">Most Popular</div>' : '';

    const priceText = isFree
      ? '₦0<span>/forever</span>'
      : `₦${plan.price_ngn.toLocaleString()}<span>/month</span>`;

    const btnHtml = isCurrent || isFree
      ? `<button class="btn-secondary btn-full" disabled>${isCurrent ? 'Current Plan' : 'Free'}</button>`
      : `<button class="btn-primary btn-full" onclick="startPayment('${plan.tier}')">
           Upgrade to ${names[plan.tier].split('—')[0].trim()} →
         </button>`;

    const featuresList = (features[plan.tier] || []).map(f => {
      const no = f.startsWith('❌');
      return `<li class="${no ? 'no' : ''}">${f}</li>`;
    }).join('');

    card.innerHTML = `
      ${badge}
      <div class="upgrade-card-name">${names[plan.tier]}</div>
      <div class="upgrade-card-price">${priceText}</div>
      <div class="upgrade-divider"></div>
      <ul class="upgrade-features">${featuresList}</ul>
      ${btnHtml}
    `;
    grid.appendChild(card);
  });
}

/* ── Start Flutterwave payment ── */
async function startPayment(tier) {
  const alertEl = document.getElementById('upgrade-alert');

  const callbackUrl = `${window.location.origin}${window.location.pathname}`;
  const res = await SubscriptionApi.initialize(tier, callbackUrl);

  if (!res.ok) {
    if (alertEl) {
      alertEl.className = 'form-error';
      alertEl.textContent = res.data?.error || 'Could not initialize payment. Try again.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  /* Redirect to Flutterwave's hosted checkout */
  window.location.href = res.data.data.authorization_url;
}

/* ── Handle return from Flutterwave ── */
async function handlePaymentReturn(transactionId, txRef) {
  const alertEl = document.getElementById('upgrade-alert');
  if (alertEl) {
    alertEl.className = 'form-success';
    alertEl.textContent = '⏳ Verifying your payment…';
    alertEl.classList.remove('hidden');
  }

  const res = await SubscriptionApi.verify(transactionId, txRef);

  /* Clean URL */
  window.history.replaceState({}, '', window.location.pathname);

  if (!res.ok) {
    if (alertEl) {
      alertEl.className = 'form-error';
      alertEl.textContent = res.data?.error || 'Payment verification failed. Contact support.';
    }
    return;
  }

  /* Update stored user with new tier */
  const updatedUser = res.data.data.user;
  if (updatedUser) Storage.setUser(updatedUser);

  if (alertEl) {
    alertEl.className = 'form-success';
    alertEl.textContent = `✅ ${res.data.data.message || 'Upgrade successful!'}`;
  }

  /* Refresh sidebar tier badge */
  if (window.Sidebar) Sidebar.refresh();
}

/* ── Payment history ── */
function buildPaymentHistory(subs) {
  const listEl  = document.getElementById('payment-history-list');
  const emptyEl = document.getElementById('payment-history-empty');
  if (!listEl) return;

  const successful = subs.filter(s => s.paystack_status === 'success');

  if (!successful.length) {
    emptyEl?.classList.remove('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');

  const tierNames = { tier1:'Tier 1', tier2:'Tier 2', tier3:'Tier 3' };

  successful.forEach(sub => {
    const row = document.createElement('div');
    row.className = 'session-row';
    row.innerHTML = `
      <div class="session-row-left">
        <div>
          <div class="session-title">${tierNames[sub.tier] || sub.tier}</div>
          <div class="session-date">Paid on ${formatDate(sub.started_at)}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:var(--font-mono);color:var(--green);font-weight:700;">
          ₦${Number(sub.amount_ngn).toLocaleString()}
        </div>
        <div style="font-size:11px;color:var(--text-muted);">
          Expires ${formatDate(sub.expires_at)}
        </div>
      </div>
    `;
    listEl.appendChild(row);
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB',
    { day:'2-digit', month:'short', year:'numeric' });
}
