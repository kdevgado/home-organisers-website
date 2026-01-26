// /public/js/contact.js
const toast = document.getElementById("toast");
const form = document.getElementById("booking-form");
const btn = document.getElementById("book-btn");
const dateInput = document.getElementById("booking-date");

// Show a toast
function showToast(msg, { error = false } = {}) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.toggle("error", !!error);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

// Init date picker
window.addEventListener("load", () => {
  if (window.flatpickr) {
    flatpickr("#booking-date", {
      minDate: "today",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "D, d M Y",
      weekNumbers: true,
    });
  }
});

// Service chips selection
const chips = document.querySelectorAll(".chip");
const servicesInput = document.getElementById("servicesInput");

const defaultChip = document.querySelector('.chip[data-default="true"]');

let selected = [];

function setSelected(value, isOn) {
  const chip = Array.from(chips).find((c) => c.dataset.value === value);
  if (!chip) return;

  if (isOn) {
    if (!selected.includes(value)) selected.push(value);
    chip.classList.add("is-selected");
    // subtle animation trigger (restarts each time)
    chip.classList.remove("chip-pop");
    void chip.offsetWidth; // reflow
    chip.classList.add("chip-pop");
  } else {
    selected = selected.filter((v) => v !== value);
    chip.classList.remove("is-selected");
  }
  servicesInput.value = selected.join(", ");
}

function ensureDefaultIfEmpty() {
  if (selected.length === 0 && defaultChip) {
    setSelected(defaultChip.dataset.value, true);
  }
}

// 1) Default selected on load
ensureDefaultIfEmpty();

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const value = chip.dataset.value;
    const isDefault = chip.hasAttribute("data-default");

    const isAlreadySelected = selected.includes(value);

    // Toggle clicked chip
    if (isAlreadySelected) {
      setSelected(value, false);
    } else {
      // If user selects a real service, remove default
      if (!isDefault && defaultChip) {
        setSelected(defaultChip.dataset.value, false);
      }

      // If user selects default, clear others (optional but usually clearer UX)
      if (isDefault) {
        // Clear all others
        selected.slice().forEach((v) => setSelected(v, false));
      }

      setSelected(value, true);
    }

    // If nothing selected, re-enable default
    ensureDefaultIfEmpty();
  });
});


// Submit handler
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = form.elements["name"]?.value?.trim();
  const email = form.elements["email"]?.value?.trim();
  if (!name || !email) {
    showToast("Please enter your name and email.", { error: true });
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = "Sending...";

    // Collect form data
    const formData = {
      name: form.elements["name"].value,
      email: form.elements["email"].value,
      phone: form.elements["phone"]?.value || "",
      suburb: form.elements["suburb"]?.value || "",
      service: servicesInput?.value || "Not sure yet",
      services: servicesInput?.value || "Not sure yet",
      message: form.elements["message"]?.value || "",
      booking_date: form.elements["booking_date"]?.value || "",
    };

    // Send to Netlify Function
    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) throw new Error("Form submission failed");

    form.reset();
    // Reset chip UI
    selected = [];
    chips.forEach((chip) => chip.classList.remove("is-selected"));
    ensureDefaultIfEmpty();
    showToast("✅ Thanks! Your message has been sent.");
  } catch (err) {
    console.error(err);
    showToast("❌ Something went wrong. Please try again.", { error: true });
  } finally {
    btn.disabled = false;
    btn.textContent = "Book consultation";
  }
});
