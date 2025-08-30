// /public/js/contact.js
const toast = document.getElementById("toast");
const form = document.getElementById("booking-form");
const btn = document.getElementById("book-btn");
const slotGrid = document.getElementById("slot-grid");
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
      onChange: (selectedDates, dateStr) => {
        // Whenever date changes, fetch available slots
        if (dateStr) loadSlots(dateStr);
      },
    });
  }
});

// Fetch available 30-min slots for a given date
async function loadSlots(dateStr) {
  slotGrid.innerHTML = `<div class="slot-empty muted">Loading times…</div>`;
  try {
    const res = await fetch(
      `/.netlify/functions/available-slots?date=${encodeURIComponent(dateStr)}`
    );
    if (!res.ok) throw new Error("Failed to load slots");
    const { slots = [] } = await res.json();

    if (!slots.length) {
      slotGrid.innerHTML = `<div class="slot-empty muted">No times available for this date. Please choose another day.</div>`;
      return;
    }

    // Render slot buttons
    slotGrid.innerHTML = "";
    slots.forEach((iso) => {
      // Show local time label, but keep ISO as value
      const d = new Date(iso);
      const label = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot-btn";
      btn.textContent = label;
      btn.dataset.iso = iso;
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => {
        // Toggle selection (single select)
        slotGrid
          .querySelectorAll(".slot-btn[aria-pressed='true']")
          .forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
      });
      slotGrid.appendChild(btn);
    });
  } catch (e) {
    console.error(e);
    slotGrid.innerHTML = `<div class="slot-empty muted">Couldn’t load times. Try again or pick a different date.</div>`;
  }
}

// Submit: create the event
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = form.elements["name"]?.value?.trim();
  const email = form.elements["email"]?.value?.trim();
  if (!name || !email) {
    showToast("Please enter your name and email.", { error: true });
    return;
  }

  const selected = slotGrid.querySelector(".slot-btn[aria-pressed='true']");
  if (!selected) {
    showToast("Please choose an available time.", { error: true });
    return;
  }

  const payload = {
    name,
    email,
    phone: form.elements["phone"]?.value?.trim() || "",
    suburb: form.elements["suburb"]?.value?.trim() || "",
    service: form.elements["service"]?.value || "",
    message: form.elements["message"]?.value?.trim() || "",
    slotIso: selected.dataset.iso, // the chosen start time in ISO
    durationMinutes: 30, // fixed 30-min consult
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Melbourne",
  };

  const original = btn.innerHTML;
  btn.setAttribute("disabled", "true");
  btn.innerHTML = "Booking…";

  try {
    const res = await fetch("/.netlify/functions/book-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || "Booking failed");
    }

    const { calendarEventLink } = await res.json();
    form.reset();
    slotGrid.innerHTML = `<div class="slot-empty muted">Select a date to see times.</div>`;
    showToast("Booked! A calendar invite is on the way.");
    // Optional: open event link in a new tab:
    // if (calendarEventLink) window.open(calendarEventLink, "_blank");
  } catch (err) {
    console.error(err);
    showToast("Sorry—this time was just taken. Please pick another slot.", {
      error: true,
    });
  } finally {
    btn.removeAttribute("disabled");
    btn.innerHTML = original;
  }
});
