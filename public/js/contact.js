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

// Init date picker (keep for convenience)
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

// Submit: let Netlify handle the form
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = form.elements["name"]?.value?.trim();
  const email = form.elements["email"]?.value?.trim();
  if (!name || !email) {
    showToast("Please enter your name and email.", { error: true });
    return;
  }

  // Submit directly to Netlify
  try {
    const formData = new FormData(form);
    const res = await fetch("/", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Form submission failed");

    form.reset();
    showToast("Thanks! Your message has been sent.");
  } catch (err) {
    console.error(err);
    showToast("Something went wrong. Please try again.", { error: true });
  }
});
