// CSS owns the entire cup motion. JavaScript only toggles the accessible state.
const productWindows = [...document.querySelectorAll('.signature-drinks .drink-window')];
const hoverAvailable = matchMedia('(any-hover: hover)');
let selectedCup = null;

function setCupOpen(button, open) {
  if (!open && selectedCup === button) selectedCup = null;
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${button.querySelector('img').alt}`);
}

productWindows.forEach(button => {
  button.querySelector('img').draggable = false;
  setCupOpen(button, false);
  button.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' || !hoverAvailable.matches) return;
    productWindows.forEach(other => setCupOpen(other, other === button));
  });
  button.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && selectedCup !== button) setCupOpen(button, false);
  });
  button.addEventListener('click', () => {
    // Hover previews the enlargement; click, tap or keyboard can keep it open.
    const open = selectedCup !== button;
    productWindows.forEach(other => setCupOpen(other, other === button && open));
    selectedCup = open ? button : null;
  });
  button.addEventListener('keydown', event => {
    if (event.key === 'Escape') setCupOpen(button, false);
  });
});

// Reset a departing product without intercepting or changing horizontal scrolling.
const departingProducts = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.intersectionRatio < .5) {
      const button = entry.target.querySelector('.drink-window');
      if (button) setCupOpen(button, false);
    }
  });
}, { threshold: .5 });
document.querySelectorAll('.signature-drinks__panel').forEach(panel => departingProducts.observe(panel));
