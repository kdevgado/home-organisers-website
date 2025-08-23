const form = document.getElementById("contact-form");
const toast = document.getElementById("toast");
const submitBtn = form?.querySelector('button[type="submit"]');

function showToast(msg, type = "ok") {
  toast.className = "";
  toast.textContent = msg;
  if (type === "error") toast.classList.add("error");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function setLoading(loading) {
  if (!submitBtn) return;
  if (loading) {
    submitBtn.dataset.orig = submitBtn.textContent;
    submitBtn.textContent = "Sending…";
    submitBtn.disabled = true;
    submitBtn.setAttribute("aria-busy", "true");
  } else {
    submitBtn.textContent = submitBtn.dataset.orig || "Send enquiry";
    submitBtn.disabled = false;
    submitBtn.removeAttribute("aria-busy");
  }
}

function encode(data) {
  return Object.keys(data)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k]))
    .join("&");
}

function parseISODate(d) {
  // expects 'YYYY-MM-DD'
  const [y, m, day] = (d || "").split("-").map(Number);
  if (!y || !m || !day) return null;
  const dt = new Date(Date.UTC(y, m - 1, day));
  // normalize to midnight local for comparison
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function parseTimeHHMM(t) {
  // expects 'HH:MM'
  const [h, m] = (t || "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m; // minutes since midnight
}

form?.addEventListener("submit", async (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
    showToast("Please complete all required fields.", "error");
    form.reportValidity?.();
    return;
  }

  // Extra validation: ensure all preferred days are today or later
  const daysRaw = form.querySelector("#preferred-days")?.value?.trim() || "";
  if (daysRaw) {
    // Flatpickr in "multiple" writes a comma-separated list using dateFormat
    const parts = daysRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const anyPast = parts.some((p) => {
      const d = parseISODate(p);
      return !d || d < today;
    });
    if (anyPast) {
      e.preventDefault();
      showToast("Preferred days cannot be in the past.", "error");
      return;
    }
  }

  // Time window validation: if both present, ensure end > start
  const tFrom = form.querySelector("#time-from")?.value?.trim() || "";
  const tTo = form.querySelector("#time-to")?.value?.trim() || "";
  if (tFrom && tTo) {
    const startMin = parseTimeHHMM(tFrom);
    const endMin = parseTimeHHMM(tTo);
    if (startMin == null || endMin == null || endMin <= startMin) {
      e.preventDefault();
      showToast(
        "Please choose a valid time window (end must be after start).",
        "error"
      );
      return;
    }
  }

  // Proceed with Netlify submission
  e.preventDefault();
  setLoading(true);

  const formData = new FormData(form);
  formData.append("form-name", form.getAttribute("name") || "enquiry");

  try {
    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(Object.fromEntries(formData.entries())),
    });
    showToast("Thank you! Your enquiry has been sent.");
    form.reset();
  } catch (err) {
    console.error(err);
    showToast("Sorry, something went wrong. Please try again.", "error");
  } finally {
    setLoading(false);
  }
});

