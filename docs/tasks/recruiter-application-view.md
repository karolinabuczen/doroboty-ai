# Recruiter application view: portfolio, CV, example task

Intent: when a recruiter opens a received application, show the candidate's CV, all Moje portfolio items and an example-task placeholder together.

Acceptance criteria:

- Default "Wszystko razem" tab on `/#/app/kandydaci/:id` shows CV, portfolio items (type, title, notes, safe link, uploaded file) and a "Przykładowe zadanie" mock-up with Zadanie and Wynik placeholders.
- Only the application's candidate's items appear; unsafe links are never clickable.
- Empty portfolio and missing CV show Polish messages.
- The task section is UI only; nothing is stored.
- `portfolio.tsx` and shared button styles are untouched.

Register: FEATURES.md EMP-08 and CAN-19 updated.
