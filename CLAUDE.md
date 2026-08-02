# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This is a **documentation-only Obsidian vault** for the planning/design/testing lifecycle of **ALIGN** — a CLO/PLO teaching-alignment tracker — there is no application source code, build tooling, or test suite here yet. All content lives under `docs/` as Markdown notes written in Thai, cross-linked with Obsidian `[[wikilink]]` syntax. There are no build, lint, or test commands to run.

If application code is added later, prefer following whatever technical design gets recorded in `docs/02-design/02-technical/` rather than inventing a stack from scratch.

## Documentation workflow and structure

The vault encodes a fixed project workflow, and each stage's folder feeds the next. Every folder has an `index.md` describing its purpose and linking forward/backward to related stages — read the relevant `index.md` before adding a note to understand where it fits and what it should link to:

```
01-requirements/01-spec    → requirements/specs (source of truth)
01-requirements/02-plan    → roadmap derived from specs
01-requirements/03-task    → concrete task breakdown derived from the plan
02-design/01-prototypes    → UI/UX mockups, wireframes, user flow (from specs)
02-design/02-technical     → architecture, DB schema, API design (from prototypes)
03-testing/01-test-plan    → test cases/scenarios (from technical design)
03-testing/02-test-result  → actual pass/fail results and bugs (from test plan)
04-retrospectives          → lessons learned per phase/sprint (from test results + log)
05-log                     → chronological changelog / decision log
00-archived                → superseded/cancelled documents
```

Key conventions:
- **Never delete a document outright.** Move superseded or cancelled docs into `00-archived/` instead, to preserve decision history.
- New notes should link back to the folder(s) they were derived from and forward to the folder(s) that consume them, matching the existing `index.md` link style (e.g. `[[../02-plan/index|02-plan]]`).
- Keep documentation content in Thai, consistent with the existing notes.
