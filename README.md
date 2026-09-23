# Semester 7 Study Tracker

A simple personal tracker for the supplied 7th-semester plan.

## Plan structure
- Overall roadmap: 180 days.
- Segment 1: 90 days, 20 September 2026 to 18 December 2026.
- Segment 2: intentionally shown as "not filled yet".
- The app uses only the task details supplied in the PDF. Weeks 3–13 of the BAU roadmap were blank in the source, so the app does not invent their contents.

## Features
- Today view with the current day’s tasks.
- 90-day week/day view.
- One-tap completion tracking.
- Progress percentage, remaining tasks and streak.
- Area monitoring for Academic, BAU, BCS, Scientific Officer and Agri-Pedia.
- Plan notes preserving the supplied academic roadmap.
- Firebase Authentication + private per-user Firestore progress.
- Local storage fallback for offline use.

## Firebase
The project config is already filled with the Firebase project used by the supplied starter project. Deploy the included `firestore.rules` before using cloud sync.

```bash
firebase login
firebase deploy
```

The app is static and uses Firebase's browser SDK from `gstatic.com`; serve it through Firebase Hosting or another HTTP(S) server.
