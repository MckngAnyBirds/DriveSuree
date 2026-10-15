/* ===== home.html page script =====
   Runs after assets/js/app.js (shared code) has loaded. */
Site.ready.then(() => {
  const {D, TYPES, esc, available, imgOf, placeholder, brandsInStock, cardHTML} = Site;
  document.title = D.S.name + ' | Cars for Sale';

  // hero visual
  const f = available().find(c => c.featured && c.img) || available().find(c => c.img);
  document.getElementById('heroVisual').innerHTML = f
    ? `<img class="hero-img" src="${f.img}" alt="${esc(Site.carName(f))}">`
    : `<i class="bi bi-car-front-fill hero-icon" aria-hidden="true"></i>`;

  // quick search
  document.getElementById('hBrand').innerHTML = '<option value="">All brands</option>' + brandsInStock().map(([n]) => `<option>${esc(n)}</option>`).join('');
  document.getElementById('hType').innerHTML = '<option value="">All types</option>' + TYPES.map(t => `<option>${t}</option>`).join('');

  // type cards
  document.getElementById('typeCards').innerHTML = TYPES.map(t => {
    const list = available().filter(c => c.type === t);
    const pic = list.find(c => c.img);
    return `<div class="col-6 col-lg-4 col-xl-2"><a class="type-card" href="cars.html?type=${encodeURIComponent(t)}" aria-label="Show ${t} cars">
      <img src="${pic ? pic.img : placeholder({brand: t, model: ''})}" alt="" loading="lazy">
      <span class="t">${t}</span><span class="n">${list.length} available</span>
      <span class="go"><i class="bi bi-arrow-up-right"></i></span></a></div>`;
  }).join('');

  // latest cars (featured first, then newest)
  const latest = [...available()].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.created - a.created).slice(0, 4);
  document.getElementById('latest').innerHTML = latest.length
    ? latest.map(c => cardHTML(c)).join('')
    : '<div class="col-12"><div class="empty bg-white border">No cars listed yet. Please check back soon.</div></div>';

  // promo
  document.getElementById('promoTitle').textContent = D.S.promoTitle;
  document.getElementById('promoBadge').textContent = D.S.promoBadge;
  document.getElementById('promoText').textContent = D.S.promoText;
});
