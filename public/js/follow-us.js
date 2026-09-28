const form = document.getElementById("follow-us-form");
const status = document.getElementById("follow-us-status");
const button = form?.querySelector('button[type="submit"]');

if (form && status && button) {
  button.disabled = false;
  let submitting = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    status.textContent = "";
    status.dataset.error = "false";
    if (!form.reportValidity()) return;
    if (!name || !email) {
      status.dataset.error = "true";
      status.textContent = "Please enter your name and email.";
      return;
    }

    submitting = true;
    button.disabled = true;
    button.textContent = "Sending...";
    form.setAttribute("aria-busy", "true");

    try {
      const response = await fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_type: "follow-us",
          name,
          email,
          phone: form.elements.phone.value.trim(),
          consent: form.elements.consent.checked,
          website: form.elements.website.value,
        }),
      });
      if (!response.ok) throw new Error("Sign-up failed");
      const result = await response.json();
      if (!result.success) throw new Error("Sign-up was not confirmed");

      form.reset();
      status.textContent = "Thank you! Your details have been sent. We'll keep you updated about freebies, organising tips and promotions.";
    } catch {
      status.dataset.error = "true";
      status.textContent = "We couldn't send your details. Please try again, or email roweedelgado@homeorg.com.au.";
    } finally {
      submitting = false;
      button.disabled = false;
      button.textContent = "Keep me updated";
      form.removeAttribute("aria-busy");
    }
  });
}
