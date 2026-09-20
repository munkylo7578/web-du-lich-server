# Codex brief: Vietnamese admin user manual with real screenshots

## 1. Assignment and boundaries

Create a Vietnamese user manual for the **existing travel administration application** in this repository. The audience is non-technical staff managing travel content, not developers. Explain how to complete real tasks through the interface.

The requested deliverable is a Word document. Use modern **DOCX** by default: [huong-dan-su-dung-admin.docx](../docs/admin-user-guide/huong-dan-su-dung-admin.docx). Only produce legacy DOC if the owner explicitly requires it; use an actual Word/LibreOffice conversion and verify the result. Never rename another format to a Word extension.

This is a **documentation-only assignment**. Do not implement guided tours, install onboarding libraries, redesign screens, alter authentication, change validation, or add missing product features. Documentation-generation helpers may be placed alongside the documentation if needed, but do not change application dependencies or lockfiles without permission.

Write the manual, screenshot checklist, captions, and handover notes in natural Vietnamese with correct diacritics. Preserve actual interface labels, including English labels where the app uses them. Do not translate a button into a label the user cannot find.

## 2. Establish facts before writing

1. Read [AGENTS.md](../AGENTS.md) and follow repository instructions. If any implementation code becomes necessary and is approved, read the relevant bundled Next.js documentation first, as that file requires.
2. Inspect current application source and then verify workflows against the running application where possible. Treat the source map below as a starting point, not a substitute for fresh inspection.
3. Existing planning documents are historical context, **not evidence that a feature exists**. Prefer current routes, rendered controls, validation, actions, and observed behavior.
4. Record the source revision if available, capture date, browser, viewport, and a safe environment label. Never expose infrastructure secrets in that record.
5. Build a feature/evidence inventory in [verification-notes.md](../docs/admin-user-guide/verification-notes.md). For each workflow, record its source references and whether it was verified in the browser, inspected in code only, or blocked.
6. If source and running UI disagree, record the discrepancy and ask which release is being documented. Do not silently merge behaviors from different releases.

### Source map

All paths below are relative to this brief. Follow imports to related actions, domain rules, and tests when necessary.

| Area | Starting sources | What to verify |
|---|---|---|
| Startup and environment | [README.md](../README.md), [package.json](../package.json), [.env.example](../.env.example) | Supported runtime, admin startup command, database and upload prerequisites. Do not copy actual credentials. |
| Navigation | [admin-shell.tsx](../apps/admin/src/components/admin/admin-shell.tsx), [admin landing page](../apps/admin/src/app/admin/page.tsx) | Actual menu labels, Settings subgroups, initial destination after login, sidebar behavior. |
| Login | [login-form.tsx](../apps/admin/src/components/auth/login-form.tsx), [login page](../apps/admin/src/app/login/page.tsx), [session.ts](../apps/admin/src/lib/auth/session.ts) | Login fields, errors, session behavior. Only document logout if a working visible control is found. |
| Tours | [tour-management.tsx](../apps/admin/src/components/admin/tours/tour-management.tsx), [tour-form-drawer.tsx](../apps/admin/src/components/admin/tours/tour-form-drawer.tsx), [tour-form-schema.ts](../apps/admin/src/features/admin-tours/tour-form-schema.ts) | Search, pagination, create/edit/delete, languages, month, descriptions, itinerary, destinations, services, images, validation. |
| Tour media and editor | [image-upload-field.tsx](../apps/admin/src/components/admin/tours/image-upload-field.tsx), [plan-image-upload-field.tsx](../apps/admin/src/components/admin/tours/plan-image-upload-field.tsx), [rich-text-editor.tsx](../apps/admin/src/components/admin/tours/rich-text-editor.tsx) | Actual toolbar controls, adding/removing images, cover/gallery behavior, naming, ordering, pending upload state. |
| Destinations | [destination-management.tsx](../apps/admin/src/components/admin/destinations/destination-management.tsx), [tour-form-schema.ts](../apps/admin/src/features/admin-tours/tour-form-schema.ts), [destination-country.ts](../libs/database/src/contracts/destination-country.ts) | Country selection, localized fields, ward selection conditions, search, deletion restrictions. |
| Services | [service-management.tsx](../apps/admin/src/components/admin/services/service-management.tsx), [service-form-schema.ts](../apps/admin/src/features/admin-services/service-form-schema.ts), [service-category.ts](../libs/database/src/contracts/service-category.ts) | Category labels and filtering, localized content, images, deletion restrictions. |
| Settings | [settings-management.tsx](../apps/admin/src/components/admin/settings/settings-management.tsx), [settings-form-schema.ts](../apps/admin/src/features/admin-settings/settings-form-schema.ts), [setting-category.ts](../libs/database/src/contracts/setting-category.ts), [settings actions](../apps/admin/src/app/admin/settings/actions.ts) | Home/general groups, field types, fixed key/type, localized values, protected settings, upload behavior. |
| Upload rules | [upload-validation.ts](../apps/admin/src/features/shared/upload-validation.ts), [image-optimization.ts](../apps/admin/src/features/shared/image-optimization.ts), [image-upload.ts](../apps/admin/src/features/shared/image-upload.ts), [settings upload.ts](../apps/admin/src/features/admin-settings/upload.ts) | Browser processing, accepted formats, image/video limits, server overrides, failure messages. |
| Shared interactions | [image-picker-field.tsx](../apps/admin/src/components/admin/shared/image-picker-field.tsx), [server-pagination.tsx](../apps/admin/src/components/admin/shared/server-pagination.tsx) | Selection/paste/drop controls, processing state, page controls and actual sizes. |

### Current findings to recheck

- Navigation currently includes Tours, Điểm đến, Dịch vụ, and Settings with two subgroups. Dashboard, Bookings, Customers, and Media entries appear commented out in the navigation; do not write operating instructions for them unless current implementation and UI prove otherwise.
- Vietnamese tour names are required. English fields are optional in the inspected tour form. Some Vietnamese rich-text fields are optional but require a minimum length when filled. Itinerary entries require Vietnamese names and descriptions; do not infer that at least one itinerary entry is mandatory.
- Tour content includes a departure start month, description, included/excluded services, itinerary images, associated destinations/services, and additional service descriptions. Verify which fields are localized versus shared instead of assuming all text uses the language tabs.
- Newly selected tour images are previewed before saving; selecting a file does not by itself prove the tour is saved. Explain the distinction between image processing, preview, and successful save.
- The inspected browser upload rules allow JPEG, PNG, WebP, and AVIF, with a 50 MB per-image limit and a request-size guard of 500 MB including overhead. Confirm deployed limits and server configuration before presenting these as universal limits. Inspect video rules separately; do not apply image rules to video.
- Destinations and services cannot be deleted while linked to tours. Tour deletion has an irreversible-operation warning. Explain removing an association versus deleting the underlying record.
- Settings include formatted text, plain text, images, and video. Their key and type are described as fixed after creation. Some settings cannot be deleted from admin. Explain these protections; never tell ordinary users to bypass them through the database.
- A newly invented setting key is not automatically used by the public website. Do not promise that creating arbitrary settings changes the website. Recommend coordinating new keys with the technical team.
- Do not assume publishing/drafts, pricing, bookings, customer management, user roles, password reset, autosave, undo, or public-site preview exist.

## 3. Deliverables

Create the documentation under [docs/admin-user-guide](../docs/admin-user-guide/):

| Deliverable | Purpose |
|---|---|
| [huong-dan-su-dung-admin.md](../docs/admin-user-guide/huong-dan-su-dung-admin.md) | Editable Vietnamese source of the manual, with relative image links. |
| [huong-dan-su-dung-admin.docx](../docs/admin-user-guide/huong-dan-su-dung-admin.docx) | Main handover document with embedded screenshots, not remotely linked images. |
| [screenshot-checklist.md](../docs/admin-user-guide/screenshot-checklist.md) | Capture instructions and inventory for automatic or manual screenshots. |
| [verification-notes.md](../docs/admin-user-guide/verification-notes.md) | Evidence, tested workflows, environment metadata, unresolved questions and tool limitations; separate from the user-facing manual. |
| [README.md](../docs/admin-user-guide/README.md) | Vietnamese instructions for updating screenshots, rebuilding Word, and completing any outstanding checks. |
| [screenshots](../docs/admin-user-guide/screenshots/) | Reviewed, sanitized screenshots included in the manual. |

An optional PDF preview is useful for layout review, but it does not replace the Word deliverable. Preserve the editable Markdown source as the basis for future updates.

## 4. Manual structure and writing requirements

Use a clear title such as **HƯỚNG DẪN SỬ DỤNG TRANG QUẢN TRỊ WEBSITE DU LỊCH**. Use the actual project/company name only if verified or supplied by the owner.

1. **Trang bìa và thông tin tài liệu:** title, product/release, version and update date. Do not invent author/company information.
2. **Mục lục:** generated from heading styles, with meaningful chapter titles.
3. **Giới thiệu và phạm vi:** audience, modules included, demonstration-data notice, basic browser/access prerequisites.
4. **Đăng nhập và làm quen giao diện:** administrator-provided URL and account, login, actual navigation, visible error states, session expiration if verified. Never print real credentials.
5. **Quy trình làm việc đề xuất:** prepare destinations and services as needed, create tour content, attach media, check translations, save, reopen to verify. Explain that this is a recommended workflow rather than a system-enforced rule unless verified.
6. **Quản lý điểm đến:** find, create, edit, country and applicable geographic selection, language fields, deletion constraints.
7. **Quản lý dịch vụ:** find/filter, categories, create, edit, descriptions, images, deletion constraints.
8. **Quản lý tour:** search and pagination; create/edit; basic information; Vietnamese/English content; included/excluded services; itinerary and itinerary images; destination/service associations; shared service descriptions; tour media; save/cancel; deletion with warnings.
9. **Quản lý cấu hình:** explain both actual Settings groups, searching, editing each supported value type, language fallback only where verified, fixed fields and protected settings. Keep advanced creation/deletion separate from routine editing.
10. **Soạn thảo nội dung và tải tệp:** actual rich-text controls, image selection methods, cover/gallery distinction where available, processing and save states, allowed formats and verified limits. Explain video separately.
11. **Lỗi thường gặp và cách xử lý:** use a table of symptom, likely cause, safe action, and when to contact support. Distinguish proven behavior from general troubleshooting advice.
12. **Checklist trước khi kết thúc công việc:** verify saved record, translations, image/itinerary order, content correctness, and important settings. Include logout only if supported in the actual UI.

For every significant procedure use this pattern:

- **Mục đích** — what the administrator achieves.
- **Điều kiện trước khi thực hiện** — required data or access, if any.
- **Các bước thực hiện** — numbered steps, one main action per step, exact visible labels in bold.
- **Kết quả mong đợi** — what the user should see and how to confirm it.
- **Lưu ý / Cảnh báo** — unsaved data, dependencies, or irreversible effects.
- **Hình minh họa** — a nearby real screenshot and meaningful caption.

For complex forms, include a field table: **Tên trường | Ý nghĩa | Bắt buộc? | Ví dụ | Lưu ý**. Resolve requirements using both UI and validation. Use a coherent fictional example, clearly marked as demonstration data. Do not force a target page count or add filler. Avoid source-code excerpts, database tables, deployment instructions, and developer jargon in the main manual.

## 5. Screenshot policy: real application only

Screenshots are required for visual handover. They must be captured from this application's running UI at the documented revision. Do not generate mock screenshots with AI, recreate the interface in an image editor, substitute another product's UI, or present an illustrative image as a real capture.

### Safe environment setup

1. Ask only for missing essentials: approved local/staging URL, secure access method, permission to create disposable test data, and any required brand/document template. Do not request that passwords be pasted into documentation or committed files.
2. If running locally, inspect the documented startup process and available tools. Confirm an isolated test database and upload storage before migrations or writes. Do not assume a local browser means a non-production database.
3. Do not modify production records, restart production services, push schema changes, send real customer email, or delete shared files to obtain screenshots.
4. Use clearly identifiable fictional records and non-sensitive, authorized demo media. Keep a record of anything created. Obtain approval before removing test records; do not delete pre-existing records or shared media.
5. Use a dedicated browser profile without personal tabs, password-manager prompts, customer information, or developer tools in view.

### Preferred capture method: browser automation

- If Codex has an approved browser tool or Playwright capability, use it to navigate and capture. First check tool availability; do not claim screenshots were taken without using a working browser.
- Use the real login flow. Do not bypass authentication, fabricate a session, or commit browser session state, cookies, videos, or traces containing secrets.
- Prefer accessible roles and visible labels for interaction. Avoid changing the application just to add screenshot selectors.
- Set a consistent desktop viewport, for example 1440 × 1000 at 100% browser zoom; record the actual values. A higher capture pixel density is acceptable for sharper Word images.
- Wait for the relevant screen, data, fonts, images, and animations to settle. Confirm success states visually; do not rely solely on a fixed delay or a button click.
- Open the actual drawer, tab, selector, or confirmation dialog relevant to each step. Capture long forms in separate viewport/section images. A full-page capture may not include content inside independently scrolling drawers.
- Capture non-destructive validation using disposable data. For deletion, capture the confirmation and cancel; execute deletion only on explicitly approved disposable records if verification requires it.
- Never claim that a successful click proves persistence. For create/edit verification, reopen or refresh the record after a successful save.

### Manual fallback: instructions for the owner

If no browser tool is available, the app cannot start, or access is unavailable, continue writing a clearly labeled draft from verified source facts. Produce the full capture checklist rather than inventing images. Mark missing evidence in the draft and verification notes, and do not call it ready for handover.

Give the owner these instructions in Vietnamese:

1. Open the approved environment with demo data and use the same browser window size and zoom for all captures.
2. Follow each inventory row to open the correct page, drawer, language tab, and scroll position.
3. On Windows, use **Win + Shift + S**, choose a rectangular region, and capture the relevant application area. Use a browser screenshot tool if it gives clearer captures. Avoid camera photos and lossy messenger images.
4. Save each capture as PNG under the reviewed [screenshots](../docs/admin-user-guide/screenshots/) folder, with the filename specified in the checklist. Use a stable numeric prefix and short unaccented description.
5. Check readable text, complete controls, no loading artifacts, and no private information. Never expose a password, even for demonstration purposes.
6. Return the images with their screenshot IDs. Codex must inspect them, map them to the correct procedures, add captions, and regenerate the Word document.

### Capture inventory to expand after inspection

For each row, assign exact filenames and record: ID, manual section, route, prerequisites, actions to reach the state, viewport/scroll position, elements that must be visible, privacy checks, Vietnamese caption, and status. Use statuses such as **Chưa chụp**, **Đã chụp**, **Đã kiểm tra**, or **Bị chặn**. If a feature is absent, record why that row is not applicable.

| ID | Required scene | Capture focus |
|---|---|---|
| S01 | Login | Empty login fields and login button; no credentials. |
| S02 | Admin overview | Actual sidebar, current page, and Settings subgroups. |
| S03 | Destination list | Search, data table, pagination and available actions. |
| S04 | Destination editor | Country, Vietnamese/English tabs, relevant geographic selection. Split into multiple images if needed. |
| S05 | Service list | Search, category filter, table and actions. |
| S06 | Service editor | Category, localized fields, descriptions and media. |
| S07 | Tour list | Search, pagination, create and row actions. |
| S08 | Tour editor: main information | Title, month, active language tab and primary fields. |
| S09 | Tour editor: translated content | English tab and included/excluded service content where located. |
| S10 | Tour editor: itinerary | A demo itinerary entry, content fields, images and actual ordering controls if present. |
| S11 | Tour editor: destinations/services | Selection controls, linked records and shared descriptions; split if necessary. |
| S12 | Tour editor: images | Preview, cover/gallery roles, naming and order where supported. |
| S13 | Save result | Verified success message or saved record reopened with the same demo content. |
| S14 | Delete confirmation | Exact warning and cancel/confirm controls for a disposable record; cancel after capture by default. |
| S15 | Settings: Home group | Actual group label, list and available actions. |
| S16 | Settings: General group | Actual group label, list, fixed/protected indicators. |
| S17 | Settings: formatted text | Localized editor, key/type behavior and save controls. |
| S18 | Settings: plain text | Actual input and language tabs; sanitized email/contact value if applicable. |
| S19 | Settings: image/video | Real upload/preview controls; use separate captures for different types. |
| S20 | Correctable validation error | Safe demo of a required field or invalid input and its actual error message. |

Reuse a screenshot when it genuinely explains multiple adjacent steps. Add captures for important missing states, including editing or blocked deletion where useful. Do not create dozens of nearly identical images just to meet a quota.

### Image quality and privacy

- Use PNG for readable interface text. Crop irrelevant blank space but retain enough context to identify the screen.
- For long forms, prefer several readable images over one extremely tall image reduced to illegible text.
- Optional numbered callouts and arrows may emphasize actual controls without covering labels. Do not modify interface text or invent controls.
- Prefer clean demo data over redaction. If redaction is necessary, use opaque, flattened redaction and inspect the exported pixels. Do not rely on movable Word shapes to conceal sensitive text.
- Keep any unsanitized originals outside the deliverable and outside Git. Embed only reviewed sanitized images in Word, source documentation, and previews.
- Place each image near the relevant procedure, with sequential captions such as **Hình 5. Nhập thông tin cơ bản của tour**, and meaningful alternative text.

## 6. Generate and inspect the Word document

1. Inspect which conversion tools are available. Prefer an existing toolchain: Pandoc with a Word reference template, python-docx, or the JavaScript docx library. Select one approach and record reproducible instructions in the documentation README.
2. Do not assume Python, Pandoc, LibreOffice, Microsoft Word, or browser tools are installed. Ask before installing dependencies. Keep any new tooling isolated from the application dependency tree where practical.
3. Use A4 pages, approximately 2 cm margins, a common Vietnamese-capable font such as Arial or Calibri, readable 11–12 pt body text, consistent numbered headings, page numbers, and a restrained professional style.
4. Use real Word heading styles and an automatic table of contents field where the toolchain supports it. Update the table of contents in a real document renderer if possible; otherwise clearly report that Word must update it. Never fabricate page numbers.
5. Embed images at their correct aspect ratio, within the printable area, with captions near the images. Make field tables readable and repeat table header rows where supported. Avoid orphaned headings and blank pages.
6. Open/render the Word document in Microsoft Word or LibreOffice, or generate a PDF preview if a suitable renderer is available. Review every page for broken Vietnamese characters, truncated tables, blurred screenshots, incorrect numbering and awkward page breaks.
7. If no renderer is available, verify document structure and embedded images with available tools, but explicitly state that visual Word review is outstanding. Do not claim the layout has been visually verified.
8. Regenerate the document after corrections and ensure Markdown, screenshots and Word describe the same version.

## 7. Acceptance checks and completion report

- [ ] All user-facing prose, image captions, and handover instructions are in Vietnamese, with exact interface labels preserved.
- [ ] The manual covers the real login, Tours, Điểm đến, Dịch vụ, and both Settings groups.
- [ ] No commented-out, planned, or invented feature is documented as available.
- [ ] Required/optional fields, supported formats, language rules, and deletion restrictions have current evidence.
- [ ] Procedures include expected results and distinguish selecting files, processing files, and successfully saving content.
- [ ] All included screenshots are authentic, relevant, readable, sanitized, and mapped to the inventory.
- [ ] Every significant procedure has suitable visual evidence or an explicitly documented reason for its absence.
- [ ] No production records were changed without explicit authorization and no secrets/session artifacts entered deliverables or Git.
- [ ] Markdown links and image paths resolve, and the Word document embeds the correct reviewed images.
- [ ] Vietnamese fonts, headings, captions, tables, page numbering, and table of contents were checked; any unperformed rendering check is disclosed.
- [ ] No unresolved placeholder appears in a document presented as final. Any intentionally incomplete document is clearly marked **BẢN NHÁP — CHƯA ĐỦ ẢNH/XÁC MINH**.
- [ ] Documentation can be updated using the recorded capture and generation procedure.

In the final Vietnamese completion report, list the actual files produced, verified modules, screenshot count, generation method, visual checks performed, and outstanding blockers. Distinguish **completed Word handover** from **draft awaiting screenshots or verification**. Never report a Word document, screenshot, or test as generated/executed unless it actually exists or was performed.

## 8. Suggested execution order

1. Inspect current sources and runtime prerequisites; record scope and evidence.
2. Identify missing access/tooling and obtain approval for a safe capture environment.
3. Draft the chapter outline, field tables, and complete screenshot checklist.
4. Prepare approved demo content and capture real UI, or collect owner-provided screenshots.
5. Write and cross-check the Vietnamese manual against screenshots and observed behavior.
6. Generate Word, inspect layout, correct issues, and regenerate.
7. Deliver the source, Word document, reviewed images, verification notes, and update instructions with an honest completion status.
