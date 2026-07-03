/* ============================================================
   LabWise — forgot-password.js
   Forgot password page controller.
   Step 1: user enters email → backend sends reset code
   Step 2: user enters code + new password → password reset
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  let resetEmail = '';

  const togglePwd = document.getElementById('toggle-new-password');
  const newPwdEl  = document.getElementById('new-password');

  togglePwd?.addEventListener('click', () => {
    const isText = newPwdEl.type === 'text';
    newPwdEl.type = isText ? 'password' : 'text';
    togglePwd.textContent = isText ? '👁️' : '🙈';
  });

  // ── Step 1: Request code ────────────────────────────────────
  document.getElementById('request-form')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('req-email').value.trim();

      Validator.clearError('req-email');
      Validator.clearFormError('request-error');
      document.getElementById('request-success')?.classList.add('hidden');

      if (!email) {
        Validator.showError('req-email', 'Email is required');
        return;
      }
      if (!Validator.isValidEmail(email)) {
        Validator.showError('req-email', 'Enter a valid email address');
        return;
      }

      Validator.setLoading('request-btn', true);

      const res = await AuthApi.forgotPassword(email);

      Validator.setLoading('request-btn', false);

      // Always show success (don't reveal if email exists)
      const successEl = document.getElementById('request-success');
      if (successEl) {
        successEl.textContent = res.data?.data?.message ||
          'If this email exists, a reset code has been sent.';
        successEl.classList.remove('hidden');
      }

      // Move to step 2
      resetEmail = email;
      const resetEmailEl = document.getElementById('reset-email');
      if (resetEmailEl) resetEmailEl.textContent = email;

      setTimeout(() => {
        document.getElementById('step-request').classList.add('hidden');
        document.getElementById('step-reset').classList.remove('hidden');
        // Focus first digit
        document.querySelector('#reset-code-inputs .code-digit')?.focus();
      }, 1200);
    });

  // ── Step 2: Code digits wiring ──────────────────────────────
  const digits = Array.from(
    document.querySelectorAll('#reset-code-inputs .code-digit')
  );

  digits.forEach((input, idx) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digits[idx - 1].focus();
        digits[idx - 1].value = '';
        digits[idx - 1].classList.remove('filled');
      }
    });

    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value) {
        input.classList.add('filled');
        if (idx < digits.length - 1) digits[idx + 1].focus();
      } else {
        input.classList.remove('filled');
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((ch, i) => {
        if (digits[i]) { digits[i].value = ch; digits[i].classList.add('filled'); }
      });
      (digits.find(d => !d.value) || digits[5]).focus();
    });
  });

  // ── Step 2: Reset submit ─────────────────────────────────────
  document.getElementById('reset-form')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const code        = digits.map(d => d.value).join('');
      const newPassword = newPwdEl?.value || '';

      Validator.clearFormError('reset-error');
      Validator.clearError('new-password');
      document.getElementById('reset-success')?.classList.add('hidden');

      if (code.length < 6) {
        Validator.showFormError('reset-error', 'Please enter all 6 digits.');
        return;
      }
      if (!Validator.isValidPassword(newPassword)) {
        Validator.showError('new-password', 'Password must be at least 6 characters');
        return;
      }

      Validator.setLoading('reset-btn', true);

      const res = await AuthApi.resetPassword(resetEmail, code, newPassword);

      Validator.setLoading('reset-btn', false);

      if (!res.ok) {
        Validator.showFormError('reset-error',
          res.data?.error || 'Invalid or expired code. Try again.');
        digits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
        digits[0]?.focus();
        return;
      }

      const successEl = document.getElementById('reset-success');
      if (successEl) {
        successEl.textContent = '✅ Password reset successfully! Redirecting to login…';
        successEl.classList.remove('hidden');
      }

      setTimeout(() => Router.login(), 1500);
    });

});
