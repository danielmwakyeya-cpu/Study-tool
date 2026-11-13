# Study tool

Two apps live in this repository. Both are static sites for GitHub Pages. There is no server to run.

| | Where it opens | What it is |
| --- | --- | --- |
| Version 1 | [the site root](https://danielmwakyeya-cpu.github.io/Study-tool/) | The original single-page planner. Left as it is. |
| Version 2 | [Study Hub](https://danielmwakyeya-cpu.github.io/Study-tool/v2/) | A Canvas-style study hub: units, modules, assignments, calendar, grades, and revision. |

Version 2 appears at that address after this update is merged into `main`. Until then, open it from a local copy (see below).

## Why version 2 has no build step

The pages are plain HTML, CSS, and ES modules. GitHub Pages serves the files in `v2/` as they are. A build-and-deploy workflow is not used, so a deploy job cannot replace the version 1 page at the root.

You can edit a file, commit, and push. Refresh the site. No Node install is required to use the app.

## Version 2 layout

```
v2/index.html              the app
v2/css/app.css             layout, including the phone layout and dark mode
v2/sw.js                   service worker (offline shell)
v2/manifest.webmanifest    installable app details
v2/js/main.js              startup
v2/js/pages/render.js      each screen
v2/js/pages/actions.js     buttons, editing, import
v2/js/db.js                IndexedDB
v2/js/store.js             records on this device
v2/js/sync.js              Google sign-in and per-record Firestore sync
v2/js/migrate.js           version 1 JSON → courses, modules, items, books
v2/js/seed.js              optional COU6508 example unit
v2/js/backup.js            daily snapshots, export, import
v2/firestore.rules         paste into the Firebase console
v2/SETUP.md                click-by-click Firebase steps
v2/sample/v1-export.json   a realistic version 1 file for trying the importer
```

Deep links use the URL hash (`#/course/.../item/...`). Refresh and Back stay on that page.

## Data

- On this device, records live in IndexedDB (`studyhub-v2`), not one localStorage blob. Pictures are stored as separate records so a large image does not have to sit inside the unit.
- A daily snapshot is kept on the device for 14 days. Settings also downloads a JSON file, or imports one. Import merges unless you choose Replace, and Replace asks again before it deletes anything.
- Sign-in is optional. With no Google account, the app is complete on one device.
- With Google sign-in, each record is saved under that user’s id in Cloud Firestore. The rules in `v2/firestore.rules` allow only that user to read or write it. Version 1’s Realtime Database path `counsellingStudyToolkit` is not used.
- If the same record changes on two devices, the newer one is shown and the other is kept under Settings so you can choose.
- There is no AI key. Version 1’s Anthropic key is not copied.

The steps to turn on Google sign-in, authorise `danielmwakyeya-cpu.github.io`, and publish the rules are in [v2/SETUP.md](v2/SETUP.md). Those clicks have to be done in the Firebase console. This repository cannot do them.

## Try it on your PC

From the project folder:

```bash
python -m http.server 8080
```

Open `http://localhost:8080/v2/`.

On the dashboard, **Load example course** adds a marked example of COU6508 (Weeks 1–3, A1 Photoyarn, A2). Delete it from Settings when you want it gone.

To bring version 1 across, either:

- open version 1 in the same browser, then in Study Hub use Settings → **Import from version 1 on this device**, or
- export JSON from version 1 and use **Import JSON**.

Checks for the importer, grades, and Perth/Adelaide times:

```bash
node --test v2/test/studyhub.test.js
```

## What you do yourself

1. Merge the Study Hub update into `main` when you are happy with it. GitHub Pages will then serve `v2/` beside the original page.
2. Follow [v2/SETUP.md](v2/SETUP.md) if you want Google sync. Skip it if this device is enough.
3. Load your real units, or import version 1, and delete the example course.
