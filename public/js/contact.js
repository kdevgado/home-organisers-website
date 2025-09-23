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
      service: form.elements["service"]?.value || "General enquiry",
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
    showToast("✅ Thanks! Your message has been sent.");
  } catch (err) {
    console.error(err);
    showToast("❌ Something went wrong. Please try again.", { error: true });
  } finally {
    btn.disabled = false;
    btn.textContent = "Book consultation";
  }
});
