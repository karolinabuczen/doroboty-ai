# Portfolio link in the application form

Intent: connect the apply flow with "Moje portfolio".

Acceptance criteria:

- A candidate with no portfolio items sees a "Portfolio" section below "Dlaczego pasujesz do tej roli?" with "Pokaż co potrafisz - pochwal się swoimi projektami" and a "Dodaj portfolio" button.
- The button saves the typed answer as the draft and opens `/#/app/portfolio`; returning to the offer restores the answer.
- With portfolio items: the section lists all items as checkboxes, checked by default, each uncheckable per application.
- Submitting stores the attached item ids on the application (`portfolioItemIds`); old data loads with none.
- Moje portfolio shows, per item, the applications it is attached to (or an empty text).
- Helpers `portfolioForApplication` / `applicationsForPortfolioItem` in `model.ts` are available for the recruiter view (not changed here).
- Covered by unit and e2e tests; FEATURES.md CAN-09 and CAN-19 updated.
