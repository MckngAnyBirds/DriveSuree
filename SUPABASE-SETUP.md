# Connect the website to Supabase (one-time setup, about 15 minutes)

Free plan is enough to start. No card needed.

## 1. Create the project
1. Go to **supabase.com** and sign up.
2. **New project**. Name it `drivesure`, choose a strong database password (save it somewhere), and pick the region **Southeast Asia (Singapore)**.
3. Wait about 2 minutes for it to finish.

## 2. Create the tables and rules
1. Left menu: **SQL Editor** > **New query**.
2. Open `supabase/1-setup.sql`, copy everything, paste it, press **Run**. You should see "Success".

## 3. Create your owner login
1. Left menu: **Authentication** > **Users** > **Add user** > **Create new user**.
2. Enter your email and a strong password. Tick **Auto Confirm User**. Create.
3. (Sign-up settings are covered in section 6 below, "Customer accounts".)
4. **SQL Editor** > New query. Open `supabase/2-make-owner.sql`, replace `PUT-YOUR-OWNER-EMAIL-HERE` with your email, **Run**. The last line should show your email.

## 4. Connect the website
1. **Project Settings** > **API** (or **Data API**). Copy the **Project URL** and the **anon / publishable key**.
2. Open `assets/js/config.js` and paste them into the `supabase` block:
   ```js
   supabase: {
     url:     'https://xxxxxxxx.supabase.co',
     anonKey: 'eyJ...your key...',
     photoBucket: 'car-photos'
   },
   ```
   The anon / publishable key is safe to have in the website. **Never** paste the `service_role` / secret key.

## 5. Try it
1. Open `admin.html` (see "Run it" below), log in with your email and password.
2. Add a car with a photo. Open `index.html`: the car should show.
3. Optional: in the dashboard, **Contact and settings** > save your business details (they are now stored online).

## Run it / put it online
- On your computer: in the site folder run `python -m http.server 8000` and open `http://localhost:8000`.
- Online (free): drag the whole folder onto **app.netlify.com/drop**. Cars you add in the owner page now appear for every visitor.

## 6. Customer accounts and car condition (new / second hand)
1. **SQL Editor** > New query. Open `supabase/3-customers.sql`, paste everything, **Run**. (Safe to run again. Your existing cars become "Second hand"; change any of them in the owner page.)
2. **Authentication** > **Sign In / Providers** (or **Settings**) > make sure **"Allow new users to sign up"** is **ON**.
3. Email confirmation: by default Supabase emails each new customer a confirm link. The free built-in email is limited to a few emails per hour. Easiest for now: **Authentication** > **Sign In / Providers** > **Email** > turn **off** "Confirm email". Later you can add your own email service (SMTP) and turn it back on.
4. **Authentication** > **URL Configuration**: set **Site URL** to your website link (for example your Netlify link) and add it under **Redirect URLs**. This makes password-reset emails open your site.
5. Customers can only save cars, send inquiries and see their own inquiries. They cannot open the owner dashboard or change anything. You can see registered customers in **Authentication** > **Users**.
6. Owner login is `admin.html` (or "Owner login" in the footer). The navbar person icon now opens the customer account page.

## 7. Application form ("Apply here")
1. **SQL Editor** > New query. Open `supabase/4-applications.sql`, paste everything, **Run**.
2. Applications sent from the website appear in the owner page under **Applications**. Open one with **View**, then **Print** or **Mark as reviewed**.
3. Only owners can read applications. Visitors can only send one. The form holds personal details (SSS, TIN, bank account name and number), so share your owner login only with people you trust, and delete applications you no longer need.
4. To add, remove or rename a question, edit the `SECTIONS` list at the top of `assets/js/apply.js`.

## 8. Live chat (chat bubble)
1. **SQL Editor** > New query. Open `supabase/5-chat.sql`, paste everything, **Run**.
2. Visitors see a chat bubble in the lower-left corner of every page. They type their name once, then send messages. The car page has a **Chat with us** button that opens the bubble with a message about that car.
3. Owners: open the **Chats** tab in the owner page to read and reply. If you are logged in as owner and open any page of the website, the bubble shows your inbox instead (with a red number for unread messages).
4. The chat checks for new messages every few seconds, so replies show up without refreshing. It is not instant like a phone call, and visitors only see replies in the same browser they used to ask.
5. To delete a conversation, open it in the Chats tab and press the trash icon.

## Good to know
- Moving your earlier test data: in the old (local) version, press **Download backup**. In the new version's owner page, press **Restore backup**. It adds those cars, receipts and inquiries.
- Free projects pause after 7 days with no activity. Open the Supabase dashboard and press **Restore** if it happens. Visiting the site now and then avoids it.
- If you forget the owner password: Supabase > Authentication > Users > your user > **Send password recovery** or set a new password.
- Deleting a car does not delete its photo file. Photos can be removed in Supabase > Storage > `car-photos`.
- Inquiries from visitors have no spam protection beyond length limits. If you get spam, tell me and I'll add a CAPTCHA.
