// public/js/contact.js
const form = document.getElementById("contact-form");
const toast = document.getElementById("toast");
const btn = form?.querySelector('button[type="submit"]');
const days = document.getElementById("preferred-days");
const tFrom = document.getElementById("time-from");
const tTo = document.getElementById("time-to");

const showToast = (msg, { error = false } = {}) => {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.toggle("error", !!error);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
};

const encode = (data) =>
  Object.keys(data)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k]))
    .join("&");

// Guard: ensure preferred dates are today or later, even if typed
const isValidDateList = (value) => {
  if (!value) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return value.split(",").every((str) => {
    const d = new Date(str.trim());
    return !isNaN(d) && d >= today;
  });
};

// Guard: time-window logic (From <= To)
const isValidTimeWindow = (from, to) => {
  if (!from || !to) return true; // allow single time
  // HH:MM 24h
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  if ([fh, fm, th, tm].some((n) => Number.isNaN(n))) return true;
  const fv = fh * 60 + fm;
  const tv = th * 60 + tm;
  return fv <= tv;
};

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Basic requireds
  const name = form.elements["name"]?.value?.trim();
  const email = form.elements["email"]?.value?.trim();
  const message = form.elements["message"]?.value?.trim();
  if (!name || !email || !message) {
    showToast("Please fill in your name, email, and a short message.", {
      error: true,
    });
    return;
  }

  // Validate date list
  if (!isValidDateList(days?.value || "")) {
    showToast("Preferred days cannot include past dates.", { error: true });
    return;
  }

  // Validate time window
  if (!isValidTimeWindow(tFrom?.value || "", tTo?.value || "")) {
    showToast("Time window looks inverted. Please check From/To.", {
      error: true,
    });
    return;
  }

  // Button loading state
  const original = btn?.innerHTML;
  btn?.setAttribute("disabled", "true");
  btn && (btn.innerHTML = "Sending…");

  try {
    const data = new FormData(form);
    // Netlify requires form-name in payload as well
    if (!data.get("form-name"))
      data.set("form-name", form.getAttribute("name") || "enquiry");

    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(Object.fromEntries(data)),
    });

    if (res.ok) {
      // Build a plain object to post to the function
      const payload = Object.fromEntries(new FormData(form).entries());
      // Fire-and-forget to the function (don't block UI)
      fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        /* ignore */
      });

      form.reset();
      showToast("Thanks! Your enquiry has been sent. I'll reply soon.");
    } else {
      throw new Error("Form submission failed");
    }
  } catch (err) {
    console.error(err);
    showToast("Sorry—something went wrong. Please try again or text/call.", {
      error: true,
    });
  } finally {
    btn?.removeAttribute("disabled");
    btn && (btn.innerHTML = original);
  }
});
