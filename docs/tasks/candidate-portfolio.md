# Candidate portfolio page ("Moje portfolio")

Intent: a candidate can attach evidence of competence (repository, live application, other work) on a new sub-page.

Acceptance criteria

- Sidebar link "Moje portfolio" for candidates; route `/#/app/portfolio` is candidate-only.
- Form: the type selector is the first field (repository, working app link, video, open-source contribution link, recorded agent conversation); after choosing, title, link (http/https only) and notes appear with type-specific labels; items can be added and removed.
- Data lives in local prototype state, per candidate; older saved state still loads.
- Item types come from one list in `model.ts` (`portfolioTypes`) so more can be added (case study, certificate, prompt/agent samples, written AI-use description) via `portfolioTypeConfig`.
- Not yet visible to employers.
- Video and agent-chat items accept a link or a file. localStorage (~5 MB for the whole state) cannot hold media, so file bytes go to IndexedDB (portfolio-files.ts) and state keeps metadata only. Wideo: video files only (.mp4/.webm/.mov, 50 MB). Nagrana rozmowa: text files only (.txt/.md/.json, 1 MB). Trade-off: files are not in the JSON export and are per browser.

- Link hygiene and allow-list: see src/features/prototype/portfolio-links.ts (single place to edit allowed hosts). Repo/contribution: github.com, gitlab.com, bitbucket.org; video: youtube.com, youtu.be, vimeo.com, loom.com; other types any https link marked 'niezweryfikowany'.
