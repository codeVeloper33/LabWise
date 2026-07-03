/* ============================================================
   LabWise — experimentApi.js
   HTTP calls to /api/experiments/* and /api/sessions/*
   ============================================================ */

const ExperimentApi = (() => {

  const BASE = 'https://labwise-t1s8.onrender.com/api';;

  function _headers() {
    return {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${Storage.getToken()}`
    };
  }

  async function _req(method, path, body) {
    try {
      const opts = { method, headers: _headers() };
      if (body) opts.body = JSON.stringify(body);
      const res  = await fetch(`${BASE}${path}`, opts);
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: { error: 'Network error.' } };
    }
  }

  /* ── Experiments ── */
  const listExperiments  = ()     => _req('GET',  '/experiments/');
  const getExperiment    = (name) => _req('GET',  `/experiments/${name}`);

  /* ── Sessions ── */
  const createSession    = (expName, config) =>
    _req('POST', '/sessions/', { experiment_name: expName, config });

  const listSessions     = ()    => _req('GET', '/sessions/');
  const getSession       = (id)  => _req('GET', `/sessions/${id}`);

  const submitReading    = (id, inputs) =>
    _req('POST',   `/sessions/${id}/readings`, inputs);

  const undoLastReading  = (id)  =>
    _req('DELETE', `/sessions/${id}/readings/last`);

  const finalizeSession  = (id)  =>
    _req('POST',   `/sessions/${id}/finalize`);

  return {
    listExperiments, getExperiment,
    createSession, listSessions, getSession,
    submitReading, undoLastReading, finalizeSession,
  };

})();
