/* ============================================================
   LabWise — subscriptionApi.js
   HTTP calls to /api/subscriptions/*
   ============================================================ */

const SubscriptionApi = (() => {

  const BASE = 'https://labwise-t1s8.onrender.com/api/subscriptions';

  function _headers(auth = false) {
    const h = { 'Content-Type': 'application/json' };
    if (auth) h['Authorization'] = `Bearer ${Storage.getToken()}`;
    return h;
  }

  async function _req(method, path, body, auth = true) {
    try {
      const opts = { method, headers: _headers(auth) };
      if (body) opts.body = JSON.stringify(body);
      const res  = await fetch(`${BASE}${path}`, opts);
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: { error: 'Network error.' } };
    }
  }

  /* Public — no auth needed */
  const getPlans      = ()          => _req('GET',  '/plans', null, false);

  /* Auth required */
  const initialize    = (tier, callbackUrl) =>
    _req('POST', '/initialize', { tier, callback_url: callbackUrl });

  const verify        = (transactionId, txRef) =>
    _req('GET',  `/verify/${transactionId}?tx_ref=${encodeURIComponent(txRef || '')}`);
  const getHistory    = ()           => _req('GET',  '/history');

  return { getPlans, initialize, verify, getHistory };

})();
