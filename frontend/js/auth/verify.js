/* ============================================================
   LabWise — verify.js
   Email verification page controller.
   - Shows the email address the code was sent to
   - Auto-advances focus between the 6 digit boxes
   - Auto-submits when all 6 digits are filled
   - Resend button with 60-second cooldown
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Show the email we are verifying
  const email = Storage.getPendingEmail();
  if (!email) { Router.login(); return; }

  const emailEl = document.getElementById('user-email');
  if (emailEl) emailEl.textContent = email;

  // ── Code digit boxes ────────────────────────────────────────
  const digits = Array.from(document.querySelectorAll('.code-digit'));

  digits.forEach((input, idx) => {

    input.addEventListener('keydown', (e) => {
      // Allow backspace to move back
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digits[idx - 1].focus();
        digits[idx - 1].value = '';
        digits[idx - 1].classList.remove('filled');
      }
    });

    input.addEventListener('input', () => {
      // Only allow digits
      input.value = input.value.replace(/\D/g, '').slice(-1);

      if (input.value) {
        input.classList.add('filled');
        if (idx < digits.length - 1) {
          digits[idx + 1].focus();
        } else {
          // Last digit filled — auto submit
          submitCode();
        }
      } else {
        input.classList.remove('filled');
      }
    });

    // Handle paste (paste full 6-digit code)
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((ch, i) => {
        if (digits[i]) {
          digits[i].value = ch;
          digits[i].classList.add('filled');
        }
      });
      const nextEmpty = digits.find(d => !d.value);
      (nextEmpty || digits[5]).focus();
      if (pasted.length === 6) submitCode();
    });
  });

  digits[0]?.focus();

  // ── Form submit ─────────────────────────────────────────────
  document.getElementById('verify-form')
    ?.addEventListener('submit', (e) => { e.preventDefault(); submitCode(); });

  async function submitCode() {
    const code = digits.map(d => d.value).join('');

    Validator.clearFormError('form-error');
    document.getElementById('form-success')?.classList.add('hidden');

    if (code.length < 6) {
      Validator.showFormError('form-error', 'Please enter all 6 digits.');
      return;
    }

    Validator.setLoading('verify-btn', true);

    const res = await AuthApi.verify(email, code);

    Validator.setLoading('verify-btn', false);

    if (!res.ok) {
      Validator.showFormError('form-error', res.data?.error || 'Invalid or expired code.');
      // Clear digits and refocus
      digits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
      digits[0]?.focus();
      return;
    }

    // Success
    const { token, user } = res.data.data;
    Storage.setToken(token);
    Storage.setUser(user);
    Storage.clearPendingEmail();

    const successEl = document.getElementById('form-success');
    if (successEl) {
      successEl.textContent = '✅ Email verified! Redirecting…';
      successEl.classList.remove('hidden');
    }

    setTimeout(() => Router.dashboard(), 1000);
  }

  // ── Resend with cooldown ─────────────────────────────────────
  const resendBtn   = document.getElementById('resend-btn');
  const timerEl     = document.getElementById('resend-timer');
  let   cooldown    = 0;
  let   timerHandle = null;

  function startCooldown(seconds = 60) {
    cooldown = seconds;
    resendBtn.disabled = true;
    updateTimer();
    timerHandle = setInterval(() => {
      cooldown--;
      if (cooldown <= 0) {
        clearInterval(timerHandle);
        resendBtn.disabled = false;
        if (timerEl) timerEl.textContent = '';
      } else {
        updateTimer();
      }
    }, 1000);
  }

  function updateTimer() {
    if (timerEl) timerEl.textContent = `(${cooldown}s)`;
  }

  resendBtn?.addEventListener('click', async () => {
    Validator.clearFormError('form-error');

    const res = await AuthApi.resendCode(email);

    if (!res.ok) {
      Validator.showFormError('form-error', res.data?.error || 'Could not resend code.');
      return;
    }

    const successEl = document.getElementById('form-success');
    if (successEl) {
      successEl.textContent = '📧 A new code has been sent to your email.';
      successEl.classList.remove('hidden');
    }

    startCooldown(60);
  });

});
