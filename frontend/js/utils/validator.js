/* ============================================================
   LabWise — validator.js
   Form validation helpers used by auth pages.
   ============================================================ */

const Validator = (() => {

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function isValidUsername(username) {
    // 3-30 chars, letters/numbers/underscores/hyphens
    return /^[a-zA-Z0-9_-]{3,30}$/.test(username.trim());
  }

  function isValidPassword(password) {
    return password.length >= 6;
  }

  function isValidPhone(phone) {
    // optional — allow empty or a basic phone pattern
    if (!phone || !phone.trim()) return true;
    return /^[+\d\s()-]{7,20}$/.test(phone.trim());
  }

  /* Show or clear a field error */
  function showError(fieldId, message) {
    const el = document.getElementById(`${fieldId}-error`);
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
  }

  function clearError(fieldId) {
    const el = document.getElementById(`${fieldId}-error`);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  }

  function clearAll(fieldIds) {
    fieldIds.forEach(clearError);
  }

  /* Show / hide the main form-level error */
  function showFormError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
  }

  function clearFormError(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
  }

  function showFormSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
  }

  /* Button loading state */
  function setLoading(btnId, loading) {
    const btn    = document.getElementById(btnId);
    if (!btn) return;
    const text   = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (text)   text.classList.toggle('hidden', loading);
    if (loader) loader.classList.toggle('hidden', !loading);
  }

  return {
    isValidEmail, isValidUsername, isValidPassword, isValidPhone,
    showError, clearError, clearAll,
    showFormError, clearFormError, showFormSuccess,
    setLoading,
  };

})();
