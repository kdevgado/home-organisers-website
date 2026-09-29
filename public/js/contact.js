// /public/js/contact.js
const toast = document.getElementById("toast");
const form = document.getElementById("booking-form");
const btn = document.getElementById("book-btn");
const chips = document.querySelectorAll(".chip");
const servicesInput = document.getElementById("servicesInput");
const defaultChip = document.querySelector('.chip[data-default="true"]');
const statusElement = document.getElementById('enquiry-status');

let selected = [];
let submitting = false;
let toastTimer;
if (btn) btn.disabled = false;
const dateInput = document.getElementById('booking-date');
if (dateInput) dateInput.min = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function showToast(message, { error = false } = {}) {
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.dataset.error = String(error);
    statusElement.focus();
  }
  if (!toast) return;

  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

window.addEventListener("load", () => {
  if (!window.flatpickr) return;

  window.flatpickr("#booking-date", {
    minDate: dateInput.min,
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "D, d M Y",
    ariaDateFormat: "l, j F Y",
    weekNumbers: true,
  });
});

function setSelected(value, isSelected) {
  const chip = Array.from(chips).find((item) => item.dataset.value === value);
  if (!chip || !servicesInput) return;

  if (isSelected) {
    if (!selected.includes(value)) selected.push(value);
    chip.classList.add("is-selected");
    chip.classList.remove("chip-pop");
    void chip.offsetWidth;
    chip.classList.add("chip-pop");
  } else {
    selected = selected.filter((item) => item !== value);
    chip.classList.remove("is-selected");
  }

  servicesInput.value = selected.join(", ");
  chip.setAttribute('aria-pressed', String(isSelected));
}

function ensureDefaultIfEmpty() {
  if (selected.length === 0 && defaultChip) {
    setSelected(defaultChip.dataset.value, true);
  }
}

ensureDefaultIfEmpty();

chips.forEach((chip) => {
  chip.setAttribute('aria-pressed', String(selected.includes(chip.dataset.value)));
  chip.addEventListener("click", () => {
    const { value } = chip.dataset;
    const isDefault = chip.hasAttribute("data-default");
    const isAlreadySelected = selected.includes(value);

    if (isAlreadySelected) {
      setSelected(value, false);
      ensureDefaultIfEmpty();
      return;
    }

    if (isDefault) {
      selected.slice().forEach((item) => setSelected(item, false));
    } else if (defaultChip) {
      setSelected(defaultChip.dataset.value, false);
    }

    setSelected(value, true);
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitting || !form.reportValidity()) return;

  const name = form.elements.name?.value?.trim();
  const email = form.elements.email?.value?.trim();
  const phone = form.elements.phone?.value?.trim();
  const address = form.elements.address?.value?.trim();
  const contactMethod = form.elements.contact_method?.value;
  const referralSource = form.elements.referral_source?.value;
  const bookingDate = form.elements.booking_date?.value?.trim();

  if (
    !name ||
    !email ||
    !phone ||
    !address ||
    !contactMethod ||
    !referralSource ||
    !bookingDate
  ) {
    showToast("Please fill out all required fields.", { error: true });
    return;
  }

  try {
    submitting = true;
    btn.disabled = true;
    btn.textContent = "Sending...";
    form.setAttribute('aria-busy', 'true');
    if (statusElement) { statusElement.textContent = 'Sending your request...'; statusElement.dataset.error = 'false'; }

    const formData = {
      name,
      email,
      phone,
      address,
      contact_method: contactMethod,
      referral_source: referralSource,
      services: servicesInput?.value || "Not sure yet",
      message: form.elements.message?.value?.trim() || "",
      booking_date: bookingDate,
      website: form.elements.website?.value || '',
    };

    const response = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
      signal: AbortSignal.timeout(25000),
    });

    if (response.status === 429) throw new Error('rate-limit');
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error('submission');

    form.reset();
    selected = [];
    dateInput._flatpickr?.clear();
    chips.forEach((chip) => { chip.classList.remove('is-selected'); chip.setAttribute('aria-pressed', 'false'); });
    ensureDefaultIfEmpty();
    showToast("Thanks! Your consultation request has been sent. We'll contact you to confirm a date and time." + (result.acknowledgementSent === false ? " We couldn't send an email acknowledgement, but your enquiry reached us. You don't need to submit it again." : ''));
  } catch (error) {
    showToast(error.message === 'rate-limit'
      ? 'Too many requests. Please wait a few minutes, then try again, or call 0415 640 352.'
      : "We couldn't confirm your request was sent. Your details are still here. Please try again, or call 0415 640 352. If you received an acknowledgement, you don't need to submit again.", { error: true });
  } finally {
    submitting = false;
    btn.disabled = false;
    btn.textContent = "Book consultation";
    form.removeAttribute('aria-busy');
  }
});
