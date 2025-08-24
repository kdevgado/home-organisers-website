// public/js/ba.js
const clamp = (v) => Math.max(0, Math.min(100, v));

const attach = (root) => {
  if (!root) return;
  const range = root.querySelector(".ba-range");
  const start = Number(root.dataset.start || range?.value || 50);

  const update = (v) => {
    const val = clamp(Number(v));
    range.value = String(val);
    root.style.setProperty("--pos", val + "%");
  };

  const setFromEvent = (ev) => {
    const rect = root.getBoundingClientRect();
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const pct = clamp(Math.round(((clientX - rect.left) / rect.width) * 100));
    update(pct);
  };

  // Init
  update(start);

  // Drag anywhere
  const startDrag = (ev) => {
    setFromEvent(ev);
    const move = (e) => setFromEvent(e);
    const end = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchend", end);
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("mouseup", end, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
  };

  root.addEventListener("mousedown", startDrag);
  root.addEventListener("touchstart", startDrag, { passive: true });

  // Range input (keeps keyboard support)
  range.addEventListener("input", (e) => update(e.target.value), {
    passive: true,
  });
  range.addEventListener("change", (e) => update(e.target.value), {
    passive: true,
  });

  // Keyboard nudge with arrows for precision
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      update(Number(range.value) - 2);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      update(Number(range.value) + 2);
    }
  });
};

// Attach to all sliders on DOM ready
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".ba").forEach(attach);
});
