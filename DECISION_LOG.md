# Decision log

Decisions taken while implementing features in this repo, newest section last. Each entry records the choice, the alternatives rejected, and why.

The backend has its own log at `ai-uc-rpa-guidance/DECISION_LOG.md`. The section-update API contract this feature consumes is specified there (decisions D1–D3); it is not restated here.

---

## Editing guidance sections (`markdown-editing-by-section`)

Goal: let editors correct imported guidance content from the section view page, without re-importing the Word document.

### D1 — The textarea is the form's source of truth; TipTap is an enhancement on top

The form posts a plain `<textarea name="markdown">`. TipTap mounts over it, hides it, and serialises back into it on submit.

**Why:** with no JavaScript the page is still a working markdown editor, by construction rather than by a separate fallback path. It also means the whole feature can be built and acceptance-tested before the editor exists, which is how the work is sequenced.

**Rejected:** posting editor JSON or HTML and converting server-side. That would make the no-JS path a second, differently-shaped implementation and put a markdown serialiser on the server as well as the client.

### D2 — No Content Security Policy change

The inherited plan called for a per-route blankie override (`styleSrc: ['self', 'unsafe-inline']`) on the grounds that ProseMirror injects a runtime `<style>` element.

**It does not.** `prosemirror-view` 1.42.2 ships `style/prosemirror.css` for the consumer to import; there is no `createElement('style')` in its dist. Inline `style` *attributes* on nodes are not governed by `style-src` (no `style-src-attr` is set in `src/server/plugins/content-security-policy.js`).

So the override is unnecessary — and it would have been this codebase's first `options.plugins` route configuration, added for nothing. The policy stays as it is.

Related correction to the inherited plan's reasoning: the CSP plugin is **not** "skipped locally". It is skipped only when `CDP_UPLOADER_BROWSER_URL` is set, which defaults to `null` (`src/server/server.js:90-94`), so CSP is active in local development and in tests. Any CSP breakage would have shown up everywhere, not just in production.

### D3 — ProseMirror's base CSS is inlined into the SCSS component

The 54 rules of `prosemirror-view/style/prosemirror.css` are copied into `src/client/stylesheets/components/_guidance-editor.scss` rather than imported from the package in `editor.js`.

**Why:** importing CSS from a JS entry makes Vite emit a second CSS file, recorded in the manifest under the entry's `css` array — which `getAssetPath` (`src/server/plugins/views.js:29-42`) does not expose, since it only returns `.file`. Inlining keeps all styling in the single existing stylesheet and needs no helper change. The rules are self-contained with no imports or dependencies.

### D4 — Only three TipTap extensions are added beyond StarterKit

StarterKit 3.30.0 already bundles Link, Heading, Bold, Italic, Strike, Code, Blockquote, the list extensions, HardBreak and HorizontalRule. Only Image, Table and Markdown are additional.

**Rejected:** the inherited plan's separate `@tiptap/extension-link` dependency — redundant, and a second copy of an extension already in the bundle risks a duplicate-extension warning.

All TipTap packages are pinned to `3.30.0` exactly, matching `.npmrc` `save-exact=true`.

### D5 — TipTap WYSIWYG is enabled, with a known round-trip defect accepted

TipTap is mounted over the textarea as progressive enhancement. **This ships with a known defect: saving through the WYSIWYG corrupts some real guidance text.** The evidence below was put to the product owner, who decided to ship anyway; it is recorded here so nobody rediscovers it as a surprise.

Round-trip testing against the **real** imported document (`SFI23-Parcel-ID-not-linked-to-SBI.docx`, section 7.2) shows the damage is not the "harmless normalisation" the plan assumed.

Method: parse the stored section body with `@tiptap/markdown`, serialise it back with `editor.getMarkdown()`, render both through this repo's own pipeline (`marked` + `govukRenderer` + sanitiser), and compare the **rendered visible text** — what a reader would actually see.

Findings at `@tiptap/*` 3.29.2 (the newest release satisfying `.npmrc` `min-release-age=7`; 3.30.0 is refused as too new):

| Symptom | Detail |
|---|---|
| Words merged, stray emphasis | `agreed that the land parcel` → `agreed thatthe****land parcel` |
| Non-standard underline syntax | `Continue here.` → `Continue ++here.++`, which `marked` renders literally as visible `++` characters |
| Placeholder text destroyed | `v<input the version number of the guide used>` loses the words entirely |
| Raw HTML rewritten | all 36 `<strong>` tags become `**` (harmless in itself) |
| Size | body shrank 6632 → 6069 characters |

Root difficulty: these documents are Word conversions containing substantial raw HTML, and a ProseMirror schema drops what it does not model. Isolated constructs (paragraphs, bold/italic, links, images, bullet and numbered lists, nested lists, headings, U+00A0) round-trip exactly; tables differ only by cell padding. It is the real-world mixture that breaks.

**Mitigation applied:** `StarterKit.configure({ underline: false })`. Underline's serialiser emits `++text++`, which is not Markdown and which `marked` renders as literal plus signs visible to readers; disabling it removes that symptom at no cost, since the source documents' underlining carries no meaning the guidance relies on.

**Not fixable by configuration:** the word-merging (`agreed that the land` → `agreed thatthe****land`) is a serialiser defect around adjacent marks. `strike: false` does not help.

**Residual risk, accepted:** an editor who opens a section in the WYSIWYG and saves may silently alter text they did not touch, and has no indication of what changed. The blast radius is one section per save, and the damage is visible on the section page afterwards.

**The safe path remains available and is the no-JS default:** the textarea is the form's source of truth and is byte-lossless — verified end to end by correcting one word in the real document and diffing `content.md`, where the only change was the intended word, and by repeated no-change saves reproducing the stored bytes exactly.

Ways out, for when this is revisited: a guard that mounts the WYSIWYG only when a parse/serialise round trip is provably lossless for that section, falling back to the textarea otherwise; `prosemirror-markdown` behind the same editor (shares the schema-drops-unknown-HTML problem); or a later `@tiptap/markdown` once the serialiser is fixed. Note also the parser-version mismatch carried today: `@tiptap/markdown` depends on `marked ^17` while this repo pins `marked 18.0.5`; the extension's `marked` option would allow injecting ours.

Version note: `@tiptap/*` is pinned at **3.29.2**, not the current 3.30.0, because `.npmrc` sets `min-release-age=7` and npm refuses releases younger than a week. `jsdom` is a dev dependency solely so the editor's mount behaviour can be tested.

### D6 — Image paths are mapped in both directions

Stored markdown uses the backend path `/guidance/documents/{id}/images/{f}`; this app serves images at `/guidance-documents/{id}/assets/{f}`. The existing `rewriteImagePaths` (`src/infra/markdown/rewrite-image-paths.js`) is view-only and one-directional, so the editor needs a forward map on load and an exact inverse on serialise.

**Why:** without the inverse, saving would rewrite every image URL in stored markdown to a frontend route the backend does not serve, silently breaking images for every other consumer of that markdown.

### D6a — Only ASCII whitespace is trimmed, never U+00A0

`splitSectionMarkdown` trims layout whitespace from the body it puts in the textarea. It must **not** use `String.trim()`, which also strips U+00A0.

Found by end-to-end testing: correcting one word in a real imported document also silently deleted a non-breaking space from the end of a section. A non-breaking space is a content character the author chose, and Word-derived guidance is full of them; dropping one on every round trip through the editor is data loss.

Trimming is therefore restricted to `[ \t\r\n]`. The backend had the identical bug via `str.strip()` and was fixed the same way (see its D6c). With both fixed, opening a section in the editor and saving it unchanged reproduces the stored bytes exactly.

### D7 — Rendered guidance HTML is sanitised

`sanitize-html` runs as the final step of the render pipeline (`src/pages/guidance-documents/viewer/view-model.js`), allow-listing what `govuk-renderer.js` emits.

**Why:** marked passes raw HTML straight through, and this feature makes humans the authors of that markdown. The inherited plan deferred this as a fast-follow; it was pulled into scope because the feature is precisely what opens the injection path, and a follow-up may not happen.

### D8 — A `pageScripts` block is added to the layout

`src/pages/common/layout.njk` has no extension point inside `bodyEnd`, and no page currently overrides `head` or `bodyEnd`.

**Chosen:** add `{% block pageScripts %}{% endblock %}` inside the layout's `bodyEnd`.

**Rejected:** overriding `bodyEnd` in the page with `{{ super() }}`. It needs no layout change but has no precedent here, and silently drops the shared script if a future edit forgets `super()`.

### D9 — No CSRF protection is added

This is the service's first state-changing form POST. There is no crumb plugin registered, despite a comment in `src/server/server.js` about a stripped `_csrf` field.

Consistent with the feature's agreed "no auth" scope: with no authenticated session to ride and no privilege to escalate, CSRF protection buys little. Flagged as a required follow-up if authentication is ever introduced.
