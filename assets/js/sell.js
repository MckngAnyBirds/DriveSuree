/* ===== sell.html page script =====
   Runs after assets/js/app.js (shared code) has loaded. */
Site.ready.then(() => {
  const {D, BRANDS, saveInquiry, toast, money} = Site;
  document.title = 'Sell your car | ' + D.S.name;
  document.getElementById('brands').innerHTML = BRANDS.map(b => `<option value="${b}">`).join('');
  const v = id => document.getElementById(id).value.trim();
  const pf = Site.prefill();
  if (pf) { document.getElementById('sName').value = pf.name; document.getElementById('sContact').value = pf.contact; }
  document.getElementById('sellForm').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = `Selling: ${v('sYear')} ${v('sBrand')} ${v('sModel')}` +
      (v('sMile') ? ', ' + Number(v('sMile')).toLocaleString() + ' km' : '') +
      (v('sPrice') ? ', asking ' + money(v('sPrice')) : '') +
      (v('sMsg') ? '. ' + v('sMsg') : '');
    try { await saveInquiry(v('sName'), v('sContact'), 'Sell my car', msg); }
    catch (err) { console.error(err); return toast('Sorry, your details could not be sent. Please try again or call us.'); }
    e.target.reset(); toast('Thank you! We will contact you about your car.');
  });
});
