# DriveSure Auto Solutions: website

Open `index.html` to start. Keep all files and folders together.

## What is where

| File | What it controls |
|---|---|
| `SUPABASE-SETUP.md` | Step-by-step guide to connect the online database. |
| `supabase/` | SQL files to run once in Supabase. |
| `assets/js/db.js` | Talks to Supabase (or the browser in local mode). |
| `assets/js/config.js` | **Start here.** Business name, phone, email, address, currency, logo path, promo banner, car types, brand list, sample cars, first password. |
| `assets/css/style.css` | Colors and font (top of file), then one section per part of the site. |
| `assets/img/logo.png` | Your logo. Replace this file to change it (or change the path in `config.js`). |
| `index.html` | Home page text (hero headline, perks, sell banner). |
| `cars.html` | All cars, filters and search. |
| `car.html` | One car's details and inquiry form. |
| `sell.html` | "Sell your car" page. |
| `contact.html` | Contact details and inquiry form. |
| `admin.html` | Owner page (login, cars, receipts, inquiries, settings). |
| `apply.html` | Application form (fields are listed at the top of `assets/js/apply.js`). |
| `account.html` | Customer account: sign up, log in, saved cars, my inquiries (needs Supabase). |

## Scripts

Each page has its own script in `assets/js/` with the same name (`home.js`, `cars.js`, `car.js`, `sell.js`, `contact.js`, `admin.js`, `account.js`, `apply.js`, `chat.js`).
`app.js` is shared by every page: data storage, helpers, the sticky navbar and the footer.
`config.js` loads first, then `app.js`, then the page's own script.

## Common edits

- **Change colors:** top of `assets/css/style.css` (`--brand`, `--accent`, ...).
- **Change menu links:** the `header()` function in `assets/js/app.js`.
- **Change car types:** `carTypes` in `config.js`.
- **Change footer text:** `business.tagline` in `config.js`.
- **Change page wording:** open that page's `.html` file and edit the text.
- **Contact info / promo / password:** Owner dashboard > Contact and settings (no code needed).

## Notes

- Cars, receipts, inquiries and settings are saved in the browser. Use "Download backup" in the owner dashboard regularly.
- The sample cars in `config.js` load only the first time. To remove them later, delete them in the owner dashboard.
- The site needs internet for Bootstrap, icons and the font.
