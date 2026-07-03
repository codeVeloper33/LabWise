/* ============================================================
   LabWise — settings.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  if (!Storage.requireAuth()) return;

  const res = await UserApi.getMe();
  if (!res.ok) return;

  const user = res.data.data.user;
  Storage.setUser(user);

  /* ── Profile card ── */
  setText('profile-avatar', (user.username || 'U').charAt(0).toUpperCase());
  setText('profile-name',   user.username);
  setText('profile-email',  user.email);
  const badgeEl = document.getElementById('profile-tier-badge');
  if (badgeEl) {
    const names = { free:'Free', tier1:'Tier 1', tier2:'Tier 2', tier3:'Tier 3' };
    badgeEl.textContent = names[user.tier] || 'Free';
    badgeEl.className   = `profile-tier-badge tier-${user.tier || 'free'}`;
  }

  /* ── Theme ── */
  let currentTheme = user.theme || 'dark';
  document.querySelectorAll('.theme-option').forEach(opt => {
    if (opt.dataset.theme === currentTheme) opt.classList.add('active');
    opt.addEventListener('click', async () => {
      document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      currentTheme = opt.dataset.theme;
      await UserApi.updateSettings({ theme: currentTheme });
    });
  });

  /* ── Auto login toggle ── */
  const autoToggle = document.getElementById('auto-login-toggle');
  if (autoToggle) {
    autoToggle.checked = user.auto_login || false;
    autoToggle.addEventListener('change', async () => {
      await UserApi.updateSettings({ auto_login: autoToggle.checked });
    });
  }

  /* ── Change email ── */
  document.getElementById('email-form')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newEmail = document.getElementById('new-email')?.value.trim();
      const msgEl    = document.getElementById('email-msg');

      if (!newEmail || !Validator.isValidEmail(newEmail)) {
        showMsg('email-msg', 'Enter a valid email address.', 'error');
        return;
      }

      const res = await UserApi.updateSettings({ email: newEmail });

      if (!res.ok) {
        showMsg('email-msg', res.data?.error || 'Failed to update email.', 'error');
        return;
      }

      showMsg('email-msg', '✅ Email updated. You will need to verify your new address.', 'success');
      Storage.setUser(res.data.data.user);
      setText('profile-email', newEmail);
      document.getElementById('new-email').value = '';
    });

  /* ── Change password ── */
  document.getElementById('password-form')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = document.getElementById('current-password')?.value;
      const next    = document.getElementById('new-password')?.value;

      if (!current) { showMsg('password-msg', 'Enter your current password.', 'error'); return; }
      if (!Validator.isValidPassword(next)) {
        showMsg('password-msg', 'New password must be at least 6 characters.', 'error');
        return;
      }

      const res = await UserApi.updateSettings({
        current_password: current,
        new_password:     next,
      });

      if (!res.ok) {
        showMsg('password-msg', res.data?.error || 'Failed to update password.', 'error');
        return;
      }

      showMsg('password-msg', '✅ Password updated successfully.', 'success');
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value     = '';
    });
});

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}

function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = type === 'success' ? 'form-success' : 'form-error';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}
