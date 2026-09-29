const drawer = document.getElementById('mobile-nav');
const openButton = document.querySelector('.menu-toggle');
const overlay = document.querySelector('.mobile-overlay');
const background = document.querySelectorAll('.site-header, .site-main, .site-footer, .floating-cta, .skip-link');
let lastFocus;
function closeMenu() {
  drawer.classList.remove('open');
  drawer.inert = true;
  drawer.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('show');
  openButton.setAttribute('aria-expanded', 'false');
  background.forEach(element => { element.inert = false; });
  document.body.style.overflow = '';
  lastFocus?.focus();
}
openButton.addEventListener('click', () => {
  lastFocus = document.activeElement;
  drawer.inert = false;
  drawer.setAttribute('aria-hidden', 'false');
  drawer.classList.add('open');
  overlay.classList.add('show');
  openButton.setAttribute('aria-expanded', 'true');
  drawer.querySelector('button').focus();
  background.forEach(element => { element.inert = true; });
  document.body.style.overflow = 'hidden';
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closeMenu));
drawer.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
drawer.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
  if (event.key !== 'Tab') return;
  const items = [...drawer.querySelectorAll('a, button')];
  const first = items[0]; const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
window.matchMedia('(min-width: 1101px)').addEventListener('change', event => {
  if (event.matches && drawer.classList.contains('open')) closeMenu();
});
