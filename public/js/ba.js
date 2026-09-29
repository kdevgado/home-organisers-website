// The native range supplies keyboard, pointer and touch interaction.
document.querySelectorAll('.ba').forEach(root => {
  const range = root.querySelector('.ba-range');
  const update = () => {
    root.style.setProperty('--pos', `${range.value}%`);
    range.setAttribute('aria-valuetext', `${range.value}% before, ${100 - Number(range.value)}% after`);
  };
  range.addEventListener('input', update);
  update();
});
