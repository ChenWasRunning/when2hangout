# When2Hangout

A date-range availability poll inspired by When2Meet. Instead of selecting hourly blocks, the event creator chooses a start date and end date, shares a generated link, and invitees drag across dates to mark availability.

## What works now

- Create an event with a title, start date, and end date.
- Generate a shareable link and short event code.
- Invitees enter a name and drag across dates to mark availability.
- Results show best dates and a heatmap across the interval.
- The app is static and can run on GitHub Pages.

By default, `config.js` uses local demo storage. That lets you test the UI immediately, but responses are only saved in the current browser. Shared cross-device availability requires Firebase Realtime Database.

## Enable shared availability

1. Create a Firebase project.
2. Add a web app in Firebase and copy its config.
3. Create a Realtime Database.
4. Replace `config.js` with your Firebase config:

```js
window.WHEN2HANGOUT_CONFIG = {
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    appId: "YOUR_FIREBASE_APP_ID"
  }
};
```

For quick open-access testing, these database rules allow public event creation and public response edits:

```json
{
  "rules": {
    "events": {
      "$eventId": {
        ".read": true,
        ".write": true
      }
    },
    "responses": {
      "$eventId": {
        ".read": true,
        "$participantId": {
          ".write": true
        }
      }
    }
  }
}
```

Those rules are intentionally permissive. For a public production site, add Firebase App Check, anonymous auth, rate limits, and validation rules.

## GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`. Push to `main`, then enable GitHub Pages from GitHub Actions in the repository settings if it is not already enabled.

The site has no build step; `index.html`, `styles.css`, `app.js`, and `config.js` are served directly.
