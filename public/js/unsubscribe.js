const form = document.getElementById('unsubscribe-form');
const statusElement = document.getElementById('unsubscribe-status');
const button = form?.querySelector('button');
const token = new URLSearchParams(window.location.search).get('unsubscribe');
if (form && statusElement && button) {
  button.disabled = false;
  if (token) {
    form.elements.email.required = false;
    document.getElementById('unsubscribe-email').hidden = true;
    button.textContent = 'Confirm unsubscribe';
    form.scrollIntoView();
    // Keep the confirmation token out of subsequent navigation and referrers.
    window.history.replaceState(null, '', window.location.pathname);
  }
  let busy = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    busy = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    statusElement.dataset.error = 'false';
    statusElement.textContent = 'Processing your request…';
    try {
      const response = await fetch('/.netlify/functions/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(25000), body: JSON.stringify(token ? { token } : { email: form.elements.email.value.trim(), website: form.elements.website.value }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Please try again in a few minutes.');
      statusElement.textContent = result.unsubscribed ? 'You have been unsubscribed. Your signup details have been removed.' : 'Check your email for a confirmation link. Open it and select Confirm unsubscribe.';
      if (result.unsubscribed) { button.hidden = true; } else { form.reset(); }
    } catch (error) {
      statusElement.dataset.error = 'true';
      statusElement.textContent = error.message || 'We could not confirm your request. Please try again or email roweedelgado@homeorg.com.au.';
    } finally {
      busy = false;
      button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}
