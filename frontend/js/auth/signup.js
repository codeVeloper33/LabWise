/* ============================================================
   LabWise — signup.js
   Signup page controller.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  if (!Storage.requireGuest()) return;

  const form         = document.getElementById('signup-form');
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

    const username        = document.getElementById('username').value.trim();
    const email           = document.getElementById('email').value.trim();
    const phone           = document.getElementById('phone').value.trim();
    const password        = passwordEl.value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Clear previous errors
    Validator.clearAll(['username', 'email', 'password', 'confirm-password']);
    Validator.clearFormError('form-error');

    let hasError = false;

    if (!username) {
      Validator.showError('username', 'Username is required');
      hasError = true;
    } else if (!Validator.isValidUsername(username)) {
      Validator.showError('username', 'Username must be 3-30 characters (letters, numbers, _ or -)');
      hasError = true;
    }

    if (!email) {
      Validator.showError('email', 'Email is required');
      hasError = true;
    } else if (!Validator.isValidEmail(email)) {
      Validator.showError('email', 'Enter a valid email address');
      hasError = true;
    }

    if (phone && !Validator.isValidPhone(phone)) {
      Validator.showError('phone', 'Enter a valid phone number');
      hasError = true;
    }

    if (!password) {
      Validator.showError('password', 'Password is required');
      hasError = true;
    } else if (!Validator.isValidPassword(password)) {
      Validator.showError('password', 'Password must be at least 6 characters');
      hasError = true;
    }

    if (password !== confirmPassword) {
      Validator.showError('confirm-password', 'Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    Validator.setLoading('signup-btn', true);

    const res = await AuthApi.signup(username, email, phone, password);

    Validator.setLoading('signup-btn', false);

    if (!res.ok) {
      Validator.showFormError('form-error', res.data?.error || 'Signup failed. Try again.');
      return;
    }

    // Success — store pending email and go to verify page
    Storage.setPendingEmail(email);
    Router.verify();
  });

});
