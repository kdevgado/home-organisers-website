document.querySelectorAll('.tabs').forEach(list => {
  const tabs = [...list.querySelectorAll('.tab')];
  const panels = tabs.map(tab => document.getElementById(tab.dataset.target));
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', 'Explore this service');
  const activate = index => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      tab.classList.toggle('is-active', i === index);
      panels[i].hidden = i !== index;
      panels[i].classList.toggle('is-active', i === index);
    });
  };
  tabs.forEach((tab, index) => {
    tab.id = `tab-${tab.dataset.target}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', event => {
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : -1;
      if (target < 0) return;
      event.preventDefault(); activate(target); tabs[target].focus();
    });
  });
  activate(0);
  list.hidden = false;
});
