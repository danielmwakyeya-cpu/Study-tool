# Set up Google sign-in for Study Hub

Study Hub works with no sign-in. Everything stays in this browser until you turn sync on. These steps are only for the private cloud copy. You do them once, in a web browser, on your Windows PC.

Version 1 is unchanged. It still uses the old shared Realtime Database path. Do not delete that path, and do not paste these new rules into the Realtime Database screen.

The Firebase project is the one already in version 1: **daniel-study-tool**.

## 1. Open the project

1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/).
2. Sign in with the Google account that owns the study tool project.
3. Click **daniel-study-tool**.

## 2. Turn on Google sign-in

1. In the left menu, click **Build**, then **Authentication**.
2. If you see a button called **Get started**, click it.
3. Open the **Sign-in method** tab.
4. Click **Google**.
5. Switch **Enable** on.
6. Choose a support email (your own Gmail is fine).
7. Click **Save**.

## 3. Allow the GitHub Pages address

1. Still in **Authentication**, open the **Settings** tab.
2. Under **Authorized domains**, click **Add domain**.
3. Type `danielmwakyeya-cpu.github.io` and save.
4. Leave `localhost` in the list. It does no harm.

The address of version 2, after you merge the update, is:

`https://danielmwakyeya-cpu.github.io/Study-tool/v2/`

## 4. Create the Firestore database

1. In the left menu, click **Build**, then **Firestore Database**.
2. Click **Create database**.
3. Choose **Standard edition** if it asks. Do not choose Realtime Database. That is the one version 1 already uses.
4. Pick a location close to the existing database. **asia-southeast1 (Singapore)** matches the current project.
5. Start in **production mode**.
6. Click **Create** and wait until the database page opens.

## 5. Paste the security rules

1. On the Firestore page, open the **Rules** tab.
2. Select all the text in the editor and delete it.
3. Open the file `v2/firestore.rules` in this project (on GitHub: the file named `firestore.rules` inside the `v2` folder).
4. Copy the whole file and paste it into the rules editor.
5. Click **Publish**.

The rules say: a signed-in person can read and write only the documents under their own user id. Nobody else, including an anonymous visitor, can open them.

## 6. Sign in from Study Hub

1. Open `https://danielmwakyeya-cpu.github.io/Study-tool/v2/`.
2. Click **Sign in**.
3. Choose the same Google account you want the notes to belong to.
4. The corner should change to **Synced** and your email.

After that, a second device signed into the same Google account receives the same units. Edits save one record at a time. If you change the same item on two devices while one is offline, Study Hub keeps both and asks you, under **Settings**, which copy to keep.

## If sign-in fails

- “This domain is not authorized” means step 3 was skipped, or the site was opened from a different address.
- “Missing or insufficient permissions” means the rules in step 5 were not published, or they were pasted into Realtime Database instead of Firestore.
- You can keep studying either way. The work stays on the device.

Images larger than about 150 KB stay on the device that added them. Links sync. Use **Download JSON** in Settings if you want a file that includes the pictures.
