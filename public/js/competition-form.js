// /public/js/competition-form.js
const form = document.getElementById("competition-form");
const statusEl = document.getElementById("competition-status");

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#b91c1c" : "#166534";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form) return;

  const formData = new FormData(form);

  const name = (formData.get("name") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim();
  const phoneRaw = (formData.get("phone") || "").toString().trim();
  const suburbRaw = (formData.get("suburb") || "").toString().trim();
  const spaceType = (formData.get("spaceType") || "").toString().trim();
  const story = (formData.get("story") || "").toString().trim();
  const videoLink = (formData.get("videoLink") || "").toString().trim();

  if (!name || !email || !videoLink || !story || !spaceType || !suburbRaw) {
    setStatus(
      "Please fill in all required fields, including your video link and story.",
      true
    );
    return;
  }

  // Safe, non-empty defaults so the Netlify function is happy
  const phone = phoneRaw || "N/A";
  const suburb = suburbRaw || "N/A";

  setStatus("Sending your entry…", false);

  const payload = {
    name,
    email,
    phone,
    suburb,
    service: "Competition Entry", // shows up in your email subject
    booking_date: "Competition entry – no booking date", // explicit non-empty
    message: `
Competition entry

Spaces needing help:
${spaceType}

Story:
${story}

Video link:
${videoLink}
    `.trim(),
  };

  try {
    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text(); // read body for debugging / logging

    if (!res.ok) {
      console.error(
        "send-email error from competition form:",
        res.status,
        text
      );
      setStatus(
        `❌ Something went wrong (code ${res.status}). Please try again or email us directly.`,
        true
      );
      return;
    }

    console.log("send-email success from competition form:", text);

    form.reset();
    setStatus("✅ Thank you! Your competition entry has been sent.");
  } catch (err) {
    console.error("Competition form fetch error:", err);
    setStatus(
      "❌ Something went wrong – please try again or email us directly.",
      true
    );
  }
});
