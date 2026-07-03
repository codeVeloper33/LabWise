/* ============================================================
   LabWise — login.js
   Login page controller.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Redirect if already logged in
  if (!Storage.requireGuest()) return;

  const form         = document.getElementById('login-form');
  const togglePwdBtn = document.getElementById('toggle-password');
  const passwordEl   = document.getElementById('password');

  // ── Toggle password visibility ──────────────────────────────
  togglePwdBtn?.addEventListener('click', () => {
    const isText = passwordEl.type === 'text';
    passwordEl.type = isText ? 'password' : 'text';
    togglePwdBtn.textContent = isText ? '👁️' : '🙈';
  });

  // ── Form submit ─────────────────────────────────────────────
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = passwordEl.value;

    // Clear previous errors
    Validator.clearAll(['email', 'password']);
    Validator.clearFormError('form-error');

    // Validate
    let hasError = false;

    if (!email) {
      Validator.showError('email', 'Email is required');
      hasError = true;
    } else if (!Validator.isValidEmail(email)) {
      Validator.showError('email', 'Enter a valid email address');
      hasError = true;
    }

    if (!password) {
      Validator.showError('password', 'Password is required');
      hasError = true;
    }

    if (hasError) return;

    // Submit
    Validator.setLoading('login-btn', true);

    const res = await AuthApi.login(email, password);

    Validator.setLoading('login-btn', false);

    if (!res.ok) {
      // Account not verified — redirect to verify page
      if (res.status === 403 && res.data?.data?.verification_required) {
        Storage.setPendingEmail(email);
        Router.verify();
        return;
      }
      Validator.showFormError('form-error', res.data?.error || 'Login failed. Try again.');
      return;
    }

    // Success
    const { token, user } = res.data.data;
    Storage.setToken(token);
    Storage.setUser(user);
    Router.dashboard();
  });

});
