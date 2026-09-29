const dialog = document.getElementById('lightbox');
const content = document.getElementById('lightboxContent');
const statusElement = document.getElementById('gallery-status');
const photos = [...document.querySelectorAll('.gallery-photo')];
const video = document.querySelector('.video-thumb');
const items = [];
if (video?.dataset.id) items.push({ type: 'video', id: video.dataset.id, trigger: video });
photos.forEach(link => items.push({ type: 'image', src: link.href, alt: link.querySelector('img').alt, trigger: link }));
let index = 0;
function render() {
  content.replaceChildren();
  const item = items[index];
  if (item.type === 'video') {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.id)}?autoplay=1&rel=0`;
    iframe.title = 'HomeOrg house staging video';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.className = 'lightbox-video';
    content.append(iframe);
  } else {
    const img = new Image(); img.src = item.src; img.alt = item.alt; img.className = 'lightbox-image'; content.append(img);
  }
  statusElement.textContent = `${index + 1} of ${items.length}`;
}
items.forEach((item, i) => item.trigger.addEventListener('click', event => {
  event.preventDefault(); index = i; render(); dialog.showModal(); document.body.style.overflow = 'hidden';
}));
function step(direction) { index = (index + direction + items.length) % items.length; render(); }
if (dialog) {
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.next').addEventListener('click', () => step(1));
  dialog.querySelector('.prev').addEventListener('click', () => step(-1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { content.replaceChildren(); document.body.style.overflow = ''; });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); }
  });
}
