/* ===== car.html page script =====
   Runs after assets/js/app.js (shared code) has loaded. */
Site.ready.then(() => {
  const {D, esc, money, carName, imgOf, available, cardHTML} = Site;
  const id = new URLSearchParams(location.search).get('id');
  const c = D.cars.find(x => x.id === id);
  const box = document.getElementById('content');

  if (!c) {
    document.getElementById('title').textContent = 'Car not found';
    box.innerHTML = '<div class="empty">This car is no longer listed.<br><a class="btn btn-accent mt-3" href="cars.html">See available cars</a></div>';
  } else {
    document.title = carName(c) + ' | ' + D.S.name;
    document.getElementById('title').textContent = carName(c);
    const tel = D.S.phone.replace(/[^\d+]/g, '');
    const sold = c.status === 'sold';
    const similar = available().filter(x => x.type === c.type && x.id !== c.id).slice(0, 4);
    box.innerHTML = `
      <div class="row g-5">
        <div class="col-lg-7"><img src="${imgOf(c)}" class="img-fluid rounded w-100" alt="${esc(carName(c))}"></div>
        <div class="col-lg-5">
          ${sold ? '<span class="badge text-bg-secondary mb-2">Sold</span>' : ''}
          <div class="d-flex align-items-center justify-content-between gap-2 mb-3"><div class="price fs-2">${money(c.price)}</div>${Site.db.customer ? `<button type="button" class="btn btn-outline-dark btn-pill btn-fav ${Site.D.favs.has(c.id) ? 'on' : ''}" data-fav="${esc(c.id)}" aria-pressed="${Site.D.favs.has(c.id)}"><i class="bi ${Site.D.favs.has(c.id) ? 'bi-heart-fill' : 'bi-heart'}"></i> <span class="fav-text">${Site.D.favs.has(c.id) ? 'Saved' : 'Save'}</span></button>` : ''}</div>
          <table class="table table-sm table-borderless mb-3">
            <tr><td class="text-secondary">Condition</td><td><b>${Site.condLabel(c)}</b></td></tr>
            <tr><td class="text-secondary">Type</td><td>${esc(c.type)}</td></tr>
            <tr><td class="text-secondary">Year</td><td>${c.year}</td></tr>
            <tr><td class="text-secondary">Transmission</td><td>${esc(c.transmission)}</td></tr>
            <tr><td class="text-secondary">Fuel</td><td>${esc(c.fuel)}</td></tr>
            <tr><td class="text-secondary">Mileage</td><td>${Number(c.mileage || 0).toLocaleString()} km</td></tr>
            <tr><td class="text-secondary">Color</td><td>${esc(c.color || '-')}</td></tr>
          </table>
          <p>${esc(c.description || '')}</p>
          <div class="d-flex flex-wrap gap-2 mb-4">
            <a class="btn btn-accent px-4" href="tel:${tel}"><i class="bi bi-telephone me-1"></i>Call us</a>
            <a class="btn btn-outline-dark" href="mailto:${esc(D.S.email)}?subject=${encodeURIComponent('Inquiry: ' + carName(c))}"><i class="bi bi-envelope me-1"></i>Email</a>
          </div>
          <div class="bg-light p-3 rounded-3">
            <div class="fw-semibold mb-1">Interested in this car?</div>
            <p class="small text-secondary mb-3">Chat with us to ask questions${sold ? '' : ', or apply for it right away'}.</p>
            <div class="d-grid gap-2">
              <button type="button" id="chatBtn" class="btn btn-dark"><i class="bi bi-chat-dots me-1"></i>Chat with us</button>
              ${sold ? '' : `<a class="btn btn-accent" href="apply.html?car=${encodeURIComponent(c.id)}"><i class="bi bi-file-earmark-text me-1"></i>Apply</a>`}
            </div>
          </div>
        </div>
      </div>
      ${similar.length ? `<h2 class="h3 mt-5 mb-3">More ${esc(c.type)} cars</h2><div class="row g-3">${similar.map(x => cardHTML(x)).join('')}</div>` : ''}`;

    document.getElementById('chatBtn').addEventListener('click', () => Site.openChat({car: carName(c), message: 'I would like to know more about the ' + carName(c) + '.'}));
  }
});
