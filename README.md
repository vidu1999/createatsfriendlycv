# CraftCV — ATS-friendly resume builder

A responsive, browser-first resume builder inspired by clean, single-column technical resume layouts. Edit a sample or start from a blank draft, paste existing resume text to autofill common sections, review the live preview, scan for common job-description keywords, and export a plain-text copy or print-ready PDF.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To make a production build, run `npm run build`; run `npm test` to check the text parser.

## What works

- Six editable sections: contact details, summary, experience, projects, education, and skills
- Paste-to-autofill parser for common resume headings, contact links, skills, dates, projects, and education details
- Live, single-column resume preview with standard section headings
- Autosave to the current browser's local storage
- Browser print flow for **Save as PDF** and plain-text `.txt` export
- In-browser keyword overlap scan for a pasted job description
- A small, deterministic writing helper that makes a few safe wording substitutions
- Responsive layout and print styles that hide the builder UI

## AI and privacy notes

The paste importer currently uses a local, pattern-based parser; a live AI provider is not connected. It successfully maps common headings such as Professional Summary, Technical Skills, Work Experience, Key Projects, and Education, but the result should always be reviewed. The writing helper is also a lightweight local editing aid—not a live language model—and does not invent resume facts. The job scan checks a limited list of common keywords; it is not a prediction of ATS success or hiring outcomes.

Resume text and drafts are kept in this browser's local storage. The app does not send pasted content to a server or AI service. To add real AI generation, connect a server-side provider endpoint and keep provider credentials on the server; never put an API key in browser code. Ask the model to preserve facts, flag missing information rather than inventing it, and make the user review generated content.

## ATS-friendly choices

The resume preview/export uses a single text column, conventional headings, plain contact text, simple bullets, and no tables, icons, or graphics in the document itself. Always verify the exported document and tailor its wording truthfully to each role.
