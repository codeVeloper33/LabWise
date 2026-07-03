/* ============================================================
   LabWise — userApi.js
   HTTP calls to /api/users/*
   ============================================================ */

const UserApi = (() => {

  const BASE = 'http://localhost:5000/api/users';

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

  const getMe         = ()       => _req('GET', '/me');
  const getMySessions = ()       => _req('GET', '/me/sessions');
  const updateSettings = (body)  => _req('PUT', '/me/settings', body);

  return { getMe, getMySessions, updateSettings };

})();
