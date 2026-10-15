/* =====================================================================
   SITE CONFIG  (edit this file to change the basics of your website)
   ---------------------------------------------------------------------
   - Business details here are only the STARTING values. Once you save
     "Contact and settings" in the Owner dashboard, the dashboard values
     are used instead (they are stored in your browser).
   - Colors and fonts are in assets/css/style.css (see the top of that file).
   - Page wording (headlines, descriptions) is in each .html page.
   ===================================================================== */

window.SITE_CONFIG = {

  /* ---------- Business (starting values) ---------- */
  business: {
    name:    'DriveSure Auto Solutions',
    phone:   '+63 900 000 0000',
    email:   'sales@example.com',
    address: 'Quezon City, Metro Manila',
    hours:   'Mon to Sat, 9:00 AM to 6:00 PM',
    currency: '₱',                       // shown before every price
    tagline: 'Quality used and new cars. Buy, sell, or trade in with us.'   // footer text
  },

  /* ---------- Logo ---------- */
  // Path to your logo image. Replace the file assets/img/logo.png with your own,
  // or change this path. Leave it empty ('') to show the business name as text.
  logo: 'assets/img/logo.png',

  /* ---------- Home page promo banner ---------- */
  promo: {
    title: 'Big discount on selected cars',
    badge: '50%',
    text:  'Off on selected units'
  },

  /* ---------- Backend (Supabase) ---------- */
  // Paste your Supabase project details here (see SUPABASE-SETUP.md).
  // While these two are empty the site runs in "local" mode: data is saved in this browser only.
  // The anon / publishable key is meant to be public, security comes from the database rules in supabase/1-setup.sql.
  supabase: {
    url:     'https://xmtroxptnopmlvrokbcd.supabase.co',      // e.g. 'https://abcdefgh.supabase.co'
    anonKey: 'sb_publishable_FUh0QRxbAdtm9XUo4849iw_pg2NXzEs',      // e.g. 'eyJ...' or 'sb_publishable_...'
    photoBucket: 'car-photos'
  },

  /* ---------- Owner login ---------- */
  // Local mode only (no Supabase yet): first-time password. With Supabase, the owner logs in with the email and password of the account you create there.
  defaultPassword: 'admin123',

  /* ---------- Car types (shown in the navbar, filters and forms) ---------- */
  carTypes: ['SUV', 'Sedan', 'Hatchback', 'Pickup', 'Coupe', 'Van'],

  /* ---------- Brand suggestions when adding a car ---------- */
  // You can still type any brand. Brand filters on the website are built from the cars you list.
  brands: ['Toyota', 'Honda', 'Nissan', 'Mitsubishi', 'Mazda', 'Ford', 'Hyundai', 'Kia', 'Suzuki', 'Isuzu',
           'Subaru', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Lexus', 'Tesla'],

  /* ---------- Sample cars ---------- */
  // These load the very first time the site is opened so it is not empty.
  // Set showSampleCars to false to start with no cars at all.
  showSampleCars: true,
  sampleCars: [
    {brand:'Toyota',     model:'Fortuner 2.8 V',    year:2021, type:'SUV',       price:1580000, mileage:32000, transmission:'Automatic', fuel:'Diesel',   color:'Gray',   description:'Well kept, complete service records, one owner.', featured:true},
    {brand:'Honda',      model:'Civic RS Turbo',    year:2022, type:'Sedan',     price:1290000, mileage:18000, transmission:'Automatic', fuel:'Gasoline', color:'White',  description:'Low mileage, like new, casa maintained.'},
    {brand:'Toyota',     model:'Vios 1.3 XLE',      year:2020, type:'Sedan',     price:640000,  mileage:41000, transmission:'Automatic', fuel:'Gasoline', color:'Silver', description:'Fuel efficient and ready for daily use.'},
    {brand:'Mitsubishi', model:'Montero Sport GLS', year:2019, type:'SUV',       price:1150000, mileage:56000, transmission:'Automatic', fuel:'Diesel',   color:'Black',  description:'Spacious 7-seater, new tires.'},
    {brand:'Ford',       model:'Ranger Wildtrak',   year:2021, type:'Pickup',    price:1420000, mileage:37000, transmission:'Automatic', fuel:'Diesel',   color:'Orange', description:'4x4, bed liner, tow package.'},
    {brand:'Honda',      model:'Jazz 1.5 V',        year:2018, type:'Hatchback', price:520000,  mileage:60000, transmission:'Automatic', fuel:'Gasoline', color:'Red',    description:'Compact and easy to park in the city.'},
    {brand:'Nissan',     model:'Urvan NV350',       year:2020, type:'Van',       price:1050000, mileage:48000, transmission:'Manual',    fuel:'Diesel',   color:'White',  description:'15-seater, great for business or shuttle use.'},
    {brand:'BMW',        model:'420i Coupe',        year:2019, type:'Coupe',     price:1950000, mileage:29000, transmission:'Automatic', fuel:'Gasoline', color:'Blue',   description:'Sporty and well equipped.'}
  ]
};
