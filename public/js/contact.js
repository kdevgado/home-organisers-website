// public/js/contact.js (email-only)
const toast = document.getElementById("toast");
const form = document.getElementById("booking-form");
const btn =
  document.getElementById("book-btn") ||
  document.querySelector("button[type=submit]");

function showToast(msg, { error = false } = {}) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.toggle("error", !!error);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  if (!payload.name?.trim() || !payload.email?.trim()) {
    showToast("Please enter your name and email.", { error: true });
    return;
  }

  const original = btn?.innerHTML;
  btn?.setAttribute("disabled", "true");
  if (btn) btn.innerHTML = "Sending…";

  try {
    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || "Failed to send email");
    }

    showToast("Thanks! Your message has been sent.");
    form.reset();
  } catch (err) {
    console.error(err);
    showToast("Sorry—couldn’t send email. Please try again.", { error: true });
  } finally {
    btn?.removeAttribute("disabled");
    if (btn && original) btn.innerHTML = original;
  }
});
