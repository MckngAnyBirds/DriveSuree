/* ===== contact.html page script =====
   Runs after assets/js/app.js (shared code) has loaded. */
Site.ready.then(() => {
  const {D, saveInquiry, toast} = Site, S = D.S, $ = s => document.querySelector(s);
  document.title = 'Contact | ' + S.name;
  $('#cPhone').textContent = S.phone; $('#cPhone').href = 'tel:' + S.phone.replace(/[^\d+]/g, '');
  $('#cEmail').textContent = S.email; $('#cEmail').href = 'mailto:' + S.email;
  $('#cAddress').textContent = S.address; $('#cHours').textContent = S.hours;
  const pf = Site.prefill();
  if (pf) { $('#iName').value = pf.name; $('#iContact').value = pf.contact; }
  $('#inqForm').addEventListener('submit', async e => {
    e.preventDefault();
    try { await saveInquiry($('#iName').value, $('#iContact').value, $('#iType').value, $('#iMsg').value); }
    catch (err) { console.error(err); return toast('Sorry, your inquiry could not be sent. Please try again or call us.'); }
    e.target.reset(); toast('Thank you! Your inquiry was sent.');
  });
});
