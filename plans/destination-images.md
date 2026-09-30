# Destination images implementation plan

## Confirmed scope

- Multiple images per destination, with optional names shared across Vietnamese and English.
- One cover image when images exist; destinations without images remain valid.
- Support creation and editing in the existing destination drawer, plus destination API responses.
- Reuse the existing image storage and picker infrastructure, rather than introduce a second media system.
- No automatic copying of images from linked tours and no cross-destination media-library picker.

## Current findings

- [Destination schema](../libs/database/src/schema/tour-media.ts:146) has no image relationship.
- [Shared image metadata](../libs/database/src/schema/tour-media.ts:292) already provides URL, optional display name through alt text, physical filename, MIME type, size, and timestamps.
- [Tour image links](../libs/database/src/schema/tour-media.ts:324) provide the relationship pattern for cover/gallery and ordering.
- [Image-name validation](../apps/admin/src/features/admin-tours/tour-form-schema.ts:10) allows blank names; nonblank names must have 2–500 characters after trimming.
- [Tour image upload field](../apps/admin/src/components/admin/tours/image-upload-field.tsx:15) wraps the shared picker and already supports naming and cover selection.
- [Destination persistence](../apps/admin/src/features/admin-tours/repository.ts:144) currently saves only the destination, translations, and wards, then reloads after commit.
- [A second destination save action](../apps/admin/src/app/admin/tours/actions.ts:44) also calls that repository and must not accidentally clear media.
- [Destination API mapping](../apps/api/src/app/content/content.service.ts:478) currently includes linked tours and their images, but no destination-owned images.

## 1. Additive database design

Add a destination-image link table beside the [existing media link tables](../libs/database/src/schema/tour-media.ts:324), with four columns:

| Column | Type | Rule |
|---|---|---|
| Destination ID | UUID | Required foreign key to destination; cascade links on destination deletion |
| Image ID | UUID | Required foreign key to shared image; restrict deletion while referenced |
| Role | Destination-specific cover/gallery enum | Required; do not rename or migrate the existing tour enum |
| Sort order | Integer | Required, nonnegative |

Constraints and indexes:

- Composite primary key on destination ID and image ID.
- Unique destination ID plus sort order.
- Partial unique index allowing at most one cover per destination.
- Index on image ID for reverse lookup and cleanup.
- Add forward and reverse Drizzle relations for destinations, links, and images.
- Reuse the shared alt-text column for the UI name, exactly as tours do; do not add another name or translation column.
- Store empty names as database null, not empty strings. Physical filenames stay server-generated.

Application rules complement database constraints: a nonempty image collection must have exactly one cover. The first added image becomes cover; removing the cover promotes the first remaining image. Reject multiple covers server-side; normalize a missing cover deterministically. Preserve insertion order and normalize order values before persistence. Manual drag reordering is not part of this request.

Generate a new additive migration with journal/snapshot updates using the [database migration targets](../libs/database/project.json:20). Existing destinations naturally have empty image collections; no data backfill is required. Apply the migration before deploying code that queries the relationship.

## 2. Contracts and validation

- Extend [admin destination types](../apps/admin/src/features/admin-tours/tour-types.ts) with an image collection matching tour image metadata.
- Extend [destination form validation](../apps/admin/src/features/admin-tours/tour-form-schema.ts:51) for retained images, and reuse image-name and pending-image validation where appropriate.
- Introduce a destination-specific save contract rather than expanding the tour aggregate's responsibility for destination media.
- Distinguish omitted media in legacy metadata-only saves from an explicitly empty collection: omitted means preserve; empty means remove all.
- Validate duplicate retained IDs, duplicate pending IDs, image roles, file-to-metadata matching, and combined cover rules.
- Validate retained image ownership against stored destination links; never trust client URLs, filenames, or physical paths.
- A supplied destination ID that no longer exists must fail as an update, not recreate the deleted destination.

## 3. Upload and transactional persistence

- Extend the [destination save action](../apps/admin/src/app/admin/destinations/actions.ts:38) to accept multipart form data for metadata and new files.
- Authenticate before writes; parse and validate all metadata and file presence/type/size before starting uploads.
- Use the [shared upload writer](../apps/admin/src/features/shared/image-upload.ts:28) with a server-selected destination subdirectory and relative public URLs.
- Lock an existing destination inside the transaction, recheck retained image ownership, and save destination metadata, translations, wards, new image metadata, name edits, and the final ordered links atomically.
- Replace links safely within the transaction so cover swaps and ordering do not collide with uniqueness constraints.
- Collect removed-image candidates before replacing links; only delete image records with no remaining references.
- Mark the commit boundary before post-commit reload or cache invalidation. Refactor the current repository/action contract so reload failures cannot be mistaken for transaction failures.
- On a pre-commit failure, roll back database changes and remove newly written files. On a post-commit refresh failure, retain files and report saved state with a refresh warning.
- Update [destination deletion](../apps/admin/src/features/admin-tours/repository.ts:194) to collect image candidates and delete links transactionally; preserve the rule preventing deletion while linked to tours.
- Audit the [legacy destination action](../apps/admin/src/app/admin/tours/actions.ts:44): keep it metadata-only with explicit preservation of media, or consolidate through the same save service without adding a second upload workflow.

## 4. Safe media cleanup

- Extend [unreferenced-image deletion](../apps/admin/src/features/shared/media-cleanup.ts:15) to check destination links alongside tour, itinerary, and service references.
- Extend the [managed upload path allowlist](../apps/admin/src/features/shared/media-cleanup.ts:10) for destination image files.
- Delete physical files only after commit and only when shared metadata/settings references no longer use the URL.
- Preserve existing path-containment checks and best-effort cleanup logging.
- Verify that removing a tour/service image cannot delete a destination-referenced image, even though this release does not expose a cross-entity reuse picker.

## 5. Admin experience

- Add a Hình ảnh section outside language tabs in [the destination drawer](../apps/admin/src/components/admin/destinations/destination-management.tsx:244).
- Extract the reusable cover/gallery adapter from [the tour image field](../apps/admin/src/components/admin/tours/image-upload-field.tsx:15) into shared UI, keeping a thin tour wrapper and destination-specific helper text. Do not duplicate the picker implementation.
- Support selection, drag/drop of files, paste, preview, optional name editing, cover selection, and removal for both pending and saved images.
- Retain the existing optimization, allowed formats, and upload limits; use the shared submit wrapper and processing blocker.
- Upload only when saving. Disable edits/closure while saving; show per-image errors and focus the first invalid field.
- Reset pending files, error state, form values, and preview URLs on cancel, successful save, destination changes, and unmount. Ensure reopening a new destination does not retain the old draft.
- Load and display saved images on edit. Show the cover thumbnail in the destination list, with the existing map icon as fallback.
- Keep tour behavior stable when extracting the shared adapter; cover fallback behavior can remain destination-specific.

## 6. API additions

- Load ordered destination image links for both destination list and detail in [the content service](../apps/api/src/app/content/content.service.ts:200).
- Add an image collection to [destination mapping](../apps/api/src/app/content/content.service.ts:478), with image ID, URL, alt text, cover/gallery role, and sort order, following [the existing image contract](../apps/api/src/app/content/content.service.ts:550).
- Return an empty array for destinations without images; keep unnamed-image alt text null. Names do not change with requested locale.
- Also load image links for destinations embedded in tour list/detail, since those responses use the same destination mapper. Avoid returning misleading empty image collections merely because the relation was not loaded.
- Keep destination-owned images separate from linked-tour images. Preserve existing text localization, wards, linked tours, pagination, and API authentication.
- Fetch through relational/batched queries, not one additional query per destination. Keep the API read-only.

## 7. Verification and release gates

- Before implementation, read relevant installed Next.js guides required by [project rules](../AGENTS.md).
- Migration tests: old data remains intact; duplicate links/orders and multiple covers are rejected; foreign-key deletion behavior is correct.
- Validation tests: blank/trimmed/too-short/too-long names, duplicate IDs, missing/empty/unsupported/oversized files, combined cover rules, and unauthorized image reuse.
- Persistence/action tests: create, edit names without new uploads, add/remove images, cover switch/removal, remove all, metadata-only preservation, nonexistent update, transaction rollback, and post-commit reload failure.
- Cleanup tests: last-reference removal, destination deletion, references from other content, destination references protecting images during tour/service cleanup, and safe destination-path handling.
- API tests in [the existing content tests](../apps/api/src/app/content/content.service.spec.ts): list/detail/embedded destinations, ordered images, cover role, unnamed images, no-image destinations, and unchanged linked-tour/localization behavior.
- Browser checks: select/drop/paste, cancel/reopen, save/reopen, validation focus, processing/save blocking, thumbnail fallback, mobile layout, and keyboard-accessible controls.
- Run relevant admin/API/database tests, type checks, lint, and builds. Smoke-test uploads and image serving under the actual deployment configuration.

## Implementation order

1. Database link table, relations, and migration.
2. Shared image contracts and destination validation.
3. Cleanup reference protection and destination upload wrapper.
4. Transactional save/delete and commit-safe action handling.
5. Shared adapter and destination create/edit/list UI.
6. API query and mapping changes.
7. Automated tests, migration verification, and browser checks.

This document is a design handoff only; no application code or database migration has been changed or applied.
