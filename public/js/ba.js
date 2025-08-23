// Initializes all .ba sliders on the page (works with multiple instances)
function initBA(root) {
  const range = root.querySelector(".ba-range");
  if (!range) return;

  const clamp = (v) => Math.max(0, Math.min(100, v));
  const update = () => {
    const v = clamp(Number(range.value) || 0);
    root.style.setProperty("--pos", v + "%");
  };

  const setFromEvent = (ev) => {
    const rect = root.getBoundingClientRect();
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const pct = clamp(Math.round(((clientX - rect.left) / rect.width) * 100));
    range.value = String(pct);
    update();
  };

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

  range.addEventListener("input", update, { passive: true });
  range.addEventListener("change", update, { passive: true });
  root.addEventListener("mousedown", startDrag);
  root.addEventListener("touchstart", startDrag, { passive: true });
  update();
}

const start = () => document.querySelectorAll(".ba").forEach(initBA);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
