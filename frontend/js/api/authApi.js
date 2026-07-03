/* ============================================================
   LabWise — authApi.js
   Handles all HTTP calls to /api/auth/* endpoints.
   ============================================================ */

const AuthApi = (() => {

  const BASE = 'http://localhost:5000/api/auth';

  async function _post(endpoint, body) {
    try {
      const res  = await fetch(`${BASE}${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { error: 'Network error. Check your connection.' } };
    }
  }

  async function signup(username, email, phone, password) {
    return _post('/signup', { username, email, phone, password });
  }

  async function verify(email, code) {
    return _post('/verify', { email, code });
  }

  async function resendCode(email) {
    return _post('/resend-code', { email });
  }

  async function login(email, password) {
    return _post('/login', { email, password });
  }

  async function forgotPassword(email) {
    return _post('/forgot-password', { email });
  }

  async function resetPassword(email, code, newPassword) {
    return _post('/reset-password', { email, code, new_password: newPassword });
  }

  return { signup, verify, resendCode, login, forgotPassword, resetPassword };

})();
