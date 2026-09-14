// Section 06 only. City changes are event-driven; no scroll work is added.
const section = document.querySelector('.find-chadoo');
if (section) {
  const tabs = [...section.querySelectorAll('.find-chadoo__city')];
  const panels = [...section.querySelectorAll('.find-chadoo__panel')];
  const actions = [...section.querySelectorAll('.find-chadoo__action')];
  const status = section.querySelector('.find-chadoo__status');
  function select(index) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].classList.toggle('is-active', i === index);
      panels[i].setAttribute('aria-hidden', String(i !== index));
    });
    // Add real destination URLs to each city's data-stores-url / data-order-url.
    actions.forEach(action => {
      const url = tabs[index].dataset[action.dataset.destination];
      if (url) { action.href = url; action.removeAttribute('aria-disabled'); }
      else { action.removeAttribute('href'); action.setAttribute('aria-disabled', 'true'); }
    });
    status.textContent = '';
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
  actions.forEach(action => action.addEventListener('click', event => {
    if (action.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      status.textContent = action.dataset.destination === 'storesUrl' ? 'Store details are coming soon.' : 'Online ordering is coming soon.';
    }
  }));
  actions.forEach(action => action.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !action.hasAttribute('href')) {
      event.preventDefault();
      action.click();
    }
  }));
  select(0);
}
