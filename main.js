// Mobile nav toggle
document.querySelectorAll('.nav-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const menu = document.getElementById('nav-mobile');
    if (!menu) return;
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    btn.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
    menu.hidden = open;
  });
});

// Blog category filter
const filterButtons = document.querySelectorAll('[data-category-filter]');
if (filterButtons.length) {
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.categoryFilter;
      filterButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
      document.querySelectorAll('[data-post-card]').forEach((card) => {
        card.hidden = cat !== 'all' && card.dataset.category !== cat;
      });
    });
  });
}
