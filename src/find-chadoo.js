// Section 06 only. City changes are event-driven; no scroll work is added.
const section = document.querySelector('.find-chadoo');
if (section) {
  const tabs = [...section.querySelectorAll('.find-chadoo__city')];
  const panels = [...section.querySelectorAll('.find-chadoo__panel')];
  function select(index) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].classList.toggle('is-active', i === index);
      panels[i].setAttribute('aria-hidden', String(i !== index));
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(next); tabs[next].focus(); }
    });
  });
  select(0);
}
