// /public/js/contact.js
const toast = document.getElementById("toast");
const form = document.getElementById("booking-form");
const btn = document.getElementById("book-btn");
const chips = document.querySelectorAll(".chip");
const servicesInput = document.getElementById("servicesInput");
const defaultChip = document.querySelector('.chip[data-default="true"]');

let selected = [];

function showToast(message, { error = false } = {}) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 3500);
}

window.addEventListener("load", () => {
  if (!window.flatpickr) return;

  flatpickr("#booking-date", {
    minDate: "today",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "D, d M Y",
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
}

function ensureDefaultIfEmpty() {
  if (selected.length === 0 && defaultChip) {
    setSelected(defaultChip.dataset.value, true);
  }
}

ensureDefaultIfEmpty();

chips.forEach((chip) => {
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

  const name = form.elements.name?.value?.trim();
  const email = form.elements.email?.value?.trim();
  const phone = form.elements.phone?.value?.trim();
  const contactMethod = form.elements.contact_method?.value;
  const referralSource = form.elements.referral_source?.value;
  const bookingDate = form.elements.booking_date?.value?.trim();

  if (
    !name ||
    !email ||
    !phone ||
    !contactMethod ||
    !referralSource ||
    !bookingDate
  ) {
    showToast("Please fill out all required fields.", { error: true });
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = "Sending...";

    const formData = {
      name,
      email,
      phone,
      suburb: form.elements.suburb?.value?.trim() || "",
      contact_method: contactMethod,
      referral_source: referralSource,
      services: servicesInput?.value || "Not sure yet",
      message: form.elements.message?.value?.trim() || "",
      booking_date: bookingDate,
    };

    const response = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error("Form submission failed");
    }

    form.reset();
    selected = [];
    chips.forEach((chip) => chip.classList.remove("is-selected"));
    ensureDefaultIfEmpty();
    showToast("Thanks! Your consultation request has been sent.");
  } catch (error) {
    console.error(error);
    showToast("Something went wrong. Please try again.", { error: true });
  } finally {
    btn.disabled = false;
    btn.textContent = "Book consultation";
  }
});
