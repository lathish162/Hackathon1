# AlertHer Frontend

Static web app for the AlertHer women safety dashboard.

## Run locally

1. Open a terminal in `frontend`.
2. Run Python's static server:

```bash
python -m http.server 8000
```

3. Open the app in a browser:

```text
http://localhost:8000
```

## Contents

- `index.html` - app shell and React entry point
- `scripts.js` - main app logic, GPS, camera/audio, SMS UI
- `style.css` - responsive UI styles
- `manifest.json` - PWA metadata
- `sw.js` - service worker offline support

## Notes

- The frontend expects the backend API at `http://localhost:5000`
- Run both frontend and backend simultaneously for full SMS functionality
