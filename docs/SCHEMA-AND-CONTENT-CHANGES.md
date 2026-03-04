# Schema and Content/Image Changes

When we add **preview + fine-tuning** (edit text, replace image, highlight sentence, change CTA, reorder sections), the stored **schema** (JSON-LD for SEO) can get out of sync because it was generated from the original content and image.

## Why schema is affected

Schema is derived from:

- **Title / headline** → `headline`, `name`
- **Body content** → `description`, `articleSection`, `hasPart` (headings)
- **Image** → `image.url`
- **Keywords** → `keywords`
- **Meta description** → `description`

So: **schema = f(content, image, title, …)**. Any change to those should be reflected in schema.

## Approach: regenerate schema at commit time

1. **Do not treat schema as fixed** – Treat it as derived from the **current** content and image.
2. **Regenerate at a single moment** – When the user commits to going live:
   - **"Approve for Preview"** or **"Publish"** / **"Schedule"**
   - Use the **current** content (after all edits): title, body, image URL, CTA, keywords.
   - Call schema generation **once** with that payload.
   - Save the returned schema into `content_strategy.metadata.schema` (and into any platform-specific records if needed).
   - Then proceed with preview or publish.

3. **Optional UI hint** – When the user edits content or image in staging/fine-tuning, show:
   - *"Content or image changed – schema will be updated when you publish."*

## How to implement

### Existing API

- **POST `/api/geo-core/content-generate`** already supports:
  - `schemaOnly: true`
  - `skipGeneration: true`
  - `generatedContent`, `topic`, `imageUrl`, `targetKeywords`, `targetPlatform`
- It returns `schema: { jsonLd, scriptTags }` (and optionally `structuredSEO`). The caller is responsible for saving it to the content record.

### Flow in the app

1. **Staging / fine-tuning**  
   User edits text, replaces image, changes CTA, reorders sections.  
   Optionally set a flag like `contentOrImageChangedSinceLastSchema: true` (or simply never persist schema until commit).

2. **On "Approve for Preview" or "Publish" / "Schedule"**  
   - Build payload from **current** state:
     - `topic` = current title
     - `generatedContent` = current body (after reorder, highlights, etc.)
     - `imageUrl` = current image URL
     - `targetKeywords` = current keywords
     - `targetPlatform` = primary platform (or first selected)
   - Call:
     ```http
     POST /api/geo-core/content-generate
     { schemaOnly: true, skipGeneration: true, topic, generatedContent, imageUrl, targetKeywords, targetPlatform }
     ```
   - Take response `schema` and update the content record:
     - `content_strategy.metadata.schema` = `{ jsonLd, scriptTags, generatedAt }`
   - Then continue with preview or publish (orchestrator / scheduled-publish already read `metadata.schema` when publishing).

3. **Publish path**  
   Orchestrator and scheduled-publish already use `content.metadata.schema`. No change needed there as long as the content row’s `metadata.schema` is updated in step 2.

## Summary

- **Problem:** Changing content or image makes the previously generated schema outdated.
- **Tackle:** Regenerate schema **once** when the user commits (Approve for Preview / Publish / Schedule) using the **current** content and image, and save it back to the content record. No need to regenerate on every keystroke; one regeneration at commit time keeps schema correct and avoids extra load.
