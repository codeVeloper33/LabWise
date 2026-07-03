/* ============================================================
   LabWise — storage.js
   Thin wrapper around localStorage. Every other JS file
   reads/writes through this — never touches localStorage directly.
   ============================================================ */

const Storage = (() => {

  const KEYS = {
    TOKEN:       'lw_token',
    USER:        'lw_user',
    LAB_SESSION: 'lw_lab_session',
    EXPERIMENT:  'lw_experiment',
    PENDING_EMAIL: 'lw_pending_email',   // email waiting for verification
  };

  /* ── Token ── */
  function getToken()          { return localStorage.getItem(KEYS.TOKEN); }
  function setToken(token)     { localStorage.setItem(KEYS.TOKEN, token); }
  function removeToken()       { localStorage.removeItem(KEYS.TOKEN); }

  /* ── User ── */
  function getUser() {
    const raw = localStorage.getItem(KEYS.USER);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function setUser(user) {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  }
  function removeUser() { localStorage.removeItem(KEYS.USER); }

  /* ── Lab session (in-progress experiment) ── */
  function getLabSession() {
    const raw = localStorage.getItem(KEYS.LAB_SESSION);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function setLabSession(session) {
    localStorage.setItem(KEYS.LAB_SESSION, JSON.stringify(session));
  }
  function clearLabSession() { localStorage.removeItem(KEYS.LAB_SESSION); }

  /* ── Current experiment name ── */
  function getExperiment()       { return localStorage.getItem(KEYS.EXPERIMENT); }
  function setExperiment(name)   { localStorage.setItem(KEYS.EXPERIMENT, name); }
  function clearExperiment()     { localStorage.removeItem(KEYS.EXPERIMENT); }

  /* ── Pending email (verification flow) ── */
  function getPendingEmail()     { return localStorage.getItem(KEYS.PENDING_EMAIL); }
  function setPendingEmail(e)    { localStorage.setItem(KEYS.PENDING_EMAIL, e); }
  function clearPendingEmail()   { localStorage.removeItem(KEYS.PENDING_EMAIL); }

  /* ── Auth check helpers ── */
  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function requireGuest() {
    if (isLoggedIn()) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }

  /* ── Logout ── */
  function logout() {
    localStorage.removeItem(KEYS.TOKEN);
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.LAB_SESSION);
    localStorage.removeItem(KEYS.EXPERIMENT);
    localStorage.removeItem(KEYS.PENDING_EMAIL);
  }

  return {
    getToken, setToken, removeToken,
    getUser,  setUser,  removeUser,
    getLabSession, setLabSession, clearLabSession,
    getExperiment, setExperiment, clearExperiment,
    getPendingEmail, setPendingEmail, clearPendingEmail,
    isLoggedIn, requireAuth, requireGuest,
    logout,
  };

})();
