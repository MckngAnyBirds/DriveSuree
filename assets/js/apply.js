/* ===== apply.html page script: application form =====
   TO EDIT THE FORM: change the SECTIONS list below (add, remove or rename fields).
   Each field is:  [key, 'Label', type, options]   type: text, date, tel, email, url, number, select, textarea
   Add 'req' to the options to make a field required, 'half' for a half-width box, 'third' for a third.
   The form is saved section by section, so the owner page shows whatever you list here. */

const INCOME_FIELDS = [
  ['inc_type', 'Source of income', 'select', {opts: ['Employed', 'Self-employed', 'Business owner', 'OFW', 'Pensioner', 'Other'], half: 1}],
  ['inc_name', 'Employer / business name', 'text', {half: 1}],
  ['inc_addr', 'Employer / business address', 'text', {}],
  ['inc_pos', 'Position / nature of business', 'text', {half: 1}],
  ['inc_tel', 'Office tel. no.', 'tel', {half: 1}],
  ['inc_years', 'Length of service (years)', 'text', {half: 1}],
  ['inc_amount', 'Monthly income', 'number', {half: 1}]
];
const withPrefix = (pre, list) => list.map(([k, l, t, o]) => [pre + k, l, t, o]);

const REFERENCES = [1, 2, 3].map(n => ({
  title: 'Character reference ' + n,
  fields: [['ref' + n + '_name', 'Full name', 'text', {half: 1}], ['ref' + n + '_rel', 'Relationship', 'text', {half: 1}],
           ['ref' + n + '_mobile', 'Mobile no.', 'tel', {half: 1}], ['ref' + n + '_addr', 'Address', 'text', {half: 1}]]
}));

const SECTIONS = [
  {title: 'Personal information', fields: [
    ['first', 'First name', 'text', {req: 1, third: 1}], ['middle', 'Middle name', 'text', {third: 1}], ['last', 'Last name', 'text', {req: 1, third: 1}],
    ['birthdate', 'Birthdate', 'date', {req: 1, third: 1}],
    ['gender', 'Gender', 'select', {opts: ['Male', 'Female', 'Prefer not to say'], third: 1}],
    ['birthplace', 'Birthplace', 'text', {third: 1}],
    ['religion', 'Religion', 'text', {third: 1}], ['nationality', 'Nationality', 'text', {third: 1}],
    ['fb', 'Facebook link', 'url', {third: 1}],
    ['civil', 'Civil status', 'select', {req: 1, opts: ['Single', 'Married', 'Common-law', 'Widowed', 'Separated'], third: 1}],
    ['dependents', 'Number of dependents', 'number', {third: 1}],
    ['maiden', "Mother's full maiden name", 'text', {third: 1}]
  ]},
  {title: 'Address', fields: [
    ['present', 'Present address', 'text', {req: 1}],
    ['present_stay', 'Length of stay', 'text', {half: 1}],
    ['present_status', 'Residence status', 'select', {opts: ['Owned', 'Rented'], half: 1}],
    ['same', 'Permanent address is the same as my present address', 'check', {}],
    ['permanent', 'Permanent address', 'text', {}],
    ['permanent_stay', 'Length of stay', 'text', {half: 1}]
  ]},
  {title: 'Contact details', fields: [
    ['tel', 'Tel. no.', 'tel', {half: 1}], ['mobile', 'Mobile no.', 'tel', {req: 1, half: 1}],
    ['sss', 'SSS no.', 'text', {half: 1}], ['tin', 'TIN no.', 'text', {half: 1}],
    ['email', 'Email address', 'email', {req: 1}]
  ]},
  {title: 'Education', fields: [
    ['edu', 'Educational attainment', 'select', {opts: ['Elementary', 'High school', 'Vocational', 'College undergraduate', 'College graduate', 'Post graduate'], third: 1}],
    ['course', 'Degree / course', 'text', {third: 1}], ['gradyear', 'Year graduated', 'number', {third: 1}]
  ]},
  {title: 'Source of income', fields: INCOME_FIELDS},
  {title: 'Spouse / common-law information', id: 'spouseSec', hidden: 1,
   note: 'Shown only when your civil status is Married or Common-law.',
   fields: [['sp_name', 'Full name', 'text', {half: 1}], ['sp_birth', 'Birthdate', 'date', {half: 1}], ['sp_mobile', 'Mobile no.', 'tel', {half: 1}],
            ...withPrefix('sp_', INCOME_FIELDS)]},
  ...REFERENCES,
  {title: 'Borrower bank details', note: 'Do not enter passwords, PINs or card numbers. Only the account details we need to verify you.', fields: [
    ['bank', 'Bank name', 'text', {half: 1}], ['bank_branch', 'Branch', 'text', {half: 1}],
    ['bank_holder', 'Account name', 'text', {half: 1}], ['bank_no', 'Account number', 'text', {half: 1}],
    ['bank_type', 'Account type', 'select', {opts: ['Savings', 'Checking', 'Other'], half: 1}]
  ]}
];

Site.ready.then(() => {
  const {D, esc, db, toast, money} = Site;
  document.title = 'Apply here | ' + D.S.name;
  const $ = s => document.querySelector(s);
  const id = k => 'f_' + k;

  /* ---------- build the form ---------- */
  const col = o => o.third ? 'col-md-4' : o.half ? 'col-md-6' : 'col-12';
  const field = ([k, label, type, o]) => {
    if (type === 'check') return `<div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" id="${id(k)}"><label class="form-check-label" for="${id(k)}">${esc(label)}</label></div></div>`;
    const lab = `<label class="form-label" for="${id(k)}">${esc(label)}${o.req ? ' <span class="text-danger">*</span>' : ''}</label>`;
    let inp;
    if (type === 'select') inp = `<select class="form-select" id="${id(k)}"${o.req ? ' required' : ''}><option value="">Select</option>${o.opts.map(x => `<option>${esc(x)}</option>`).join('')}</select>`;
    else if (type === 'textarea') inp = `<textarea class="form-control" rows="3" id="${id(k)}"${o.req ? ' required' : ''}></textarea>`;
    else inp = `<input class="form-control" id="${id(k)}" type="${type}"${o.req ? ' required' : ''}${type === 'number' ? ' min="0" step="any"' : ''}${type === 'date' ? ' max="' + Site.today() + '"' : ''}>`;
    return `<div class="${col(o)}">${lab}${inp}</div>`;
  };
  const carField = `<div class="col-12"><label class="form-label" for="f_car">Car you are applying for</label>
    <select class="form-select" id="f_car"><option value="">Not sure yet / any car</option>${Site.available().map(c => `<option value="${esc(c.id)}">${esc(Site.carName(c))} (${money(c.price)})</option>`).join('')}</select></div>`;
  $('#appSections').innerHTML = `<div class="bg-white p-4 rounded-3 border mb-3"><h2 class="h5 mb-3">Application details</h2><div class="row g-3">${carField}</div></div>` +
    SECTIONS.map((s, i) => `<section class="bg-white p-4 rounded-3 border mb-3${s.hidden ? ' d-none' : ''}" ${s.id ? 'id="' + s.id + '"' : ''}>
      <h2 class="h5 mb-1">${esc(s.title)}</h2>${s.note ? `<p class="small text-secondary mb-3">${esc(s.note)}</p>` : '<div class="mb-3"></div>'}
      <div class="row g-3">${s.fields.map(field).join('')}</div></section>`).join('');

  const pf = Site.prefill();
  if (pf && pf.contact.includes('@')) $('#' + id('email')).value = pf.contact;
  const want = new URLSearchParams(location.search).get('car');
  if (want && [...$('#f_car').options].some(o => o.value === want)) $('#f_car').value = want;

  /* ---------- small behaviours ---------- */
  const syncCivil = () => { $('#spouseSec').classList.toggle('d-none', !['Married', 'Common-law'].includes($('#' + id('civil')).value)); };
  const syncSame = () => {
    const on = $('#' + id('same')).checked;
    ['permanent', 'permanent_stay'].forEach(k => { const e = $('#' + id(k)); e.disabled = on; if (on) e.value = ''; });
  };
  $('#' + id('civil')).addEventListener('change', syncCivil);
  $('#' + id('same')).addEventListener('change', syncSame);

  /* ---------- send ---------- */
  const val = k => { const e = $('#' + id(k)); return e ? (e.type === 'checkbox' ? e.checked : e.value.trim()) : ''; };
  $('#appForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#appErr'); err.textContent = '';
    if ($('#website').value) { $('#appForm').classList.add('d-none'); return $('#appDone').classList.remove('d-none'); }   // spam trap
    const form = e.target;
    const visibleBad = [...form.querySelectorAll('[required]')].find(x => !x.closest('.d-none') && !x.disabled && (x.type === 'checkbox' ? !x.checked : !x.value.trim()));
    if (visibleBad) { visibleBad.focus(); visibleBad.reportValidity && visibleBad.reportValidity(); return err.textContent = 'Please fill in the required fields marked *.'; }
    if (!$('#agree').checked) return err.textContent = 'Please tick the box to confirm and agree.';
    const spouseOn = ['Married', 'Common-law'].includes(val('civil')), same = val('same');
    const data = [];
    SECTIONS.forEach(s => {
      if (s.id === 'spouseSec' && !spouseOn) return;
      const rows = [];
      s.fields.forEach(([k, label, type]) => {
        if (type === 'check') return;
        let v = val(k);
        if (same && (k === 'permanent' || k === 'permanent_stay')) v = val(k === 'permanent' ? 'present' : 'present_stay');
        if (v !== '' && /monthly income/i.test(label)) v = money(v);
        if (v !== '' && type === 'date') v = Site.fmtLong(v + 'T00:00');
        if (v !== '') rows.push([label, String(v)]);
      });
      if (rows.length) data.push({title: s.title, rows});
    });
    const carSel = $('#f_car'), car = carSel.value ? carSel.options[carSel.selectedIndex].text : '';
    const name = [val('first'), val('middle'), val('last')].filter(Boolean).join(' ');
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try { await db.addApplication({name, mobile: val('mobile'), email: val('email'), car, data}); }
    catch (ex) { console.error(ex); btn.disabled = false; return err.textContent = 'Sorry, your application could not be sent. Please try again or call us.'; }
    form.classList.add('d-none'); $('#appDone').classList.remove('d-none'); window.scrollTo({top: 0, behavior: 'smooth'});
  });
});
