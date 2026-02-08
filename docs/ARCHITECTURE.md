# Architecture & Project Structure

## Project Structure

```
src/
  labels/
    CustomLabels.labels-meta.xml            -- All Custom Label definitions
  classes/
    TucarioFileDownloadController.cls       -- Apex controller (file list, content, upload)
    TucarioFileDownloadControllerTest.cls   -- Apex test coverage
  lwc/
    tucarioLabels/
      tucarioLabels.js                      -- Shared Custom Labels module
      tucarioLabels.js-meta.xml             -- Metadata (isExposed: false)
    tucarioFilesWithDownloadAll/
      tucarioFilesWithDownloadAll.js        -- Component logic
      tucarioFilesWithDownloadAll.html      -- Template
      tucarioFilesWithDownloadAll.css       -- Styles
      tucarioFilesWithDownloadAll.js-meta.xml -- Metadata & configurable properties
  permissionsets/
    Tucario_Files.permissionset-meta.xml    -- Permission Set (Apex class access)
  staticresources/
    TucarioJSZip.resource                   -- JSZip 3.10.1 library
```

## How It Works

### File Display & Download

The component queries `ContentDocumentLink` records tied to the current record, maps file types to SLDS icons, and renders a scrollable list.

**Single-file download** uses the Salesforce file servlet URL (`/sfc/servlet.shepherd/version/download/{ContentVersionId}`) directly — no Apex call, no file size limit.

**Download All** uses a two-phase approach:

1. **Small files** (≤ 18 MB) — fetched via Apex, zipped client-side with JSZip, and downloaded as a named archive
2. **Large files** (> 18 MB) — combined into a single server-generated ZIP via the multi-file servlet URL

This results in at most two downloads per operation (one client-side ZIP + one server ZIP) and ensures no files are ever skipped.

### Upload with Extension Filtering

When excluded extensions are configured, the component swaps `lightning-file-upload` for a standard `lightning-input[type=file]`. This enables client-side validation *before* any file reaches Salesforce:

1. User selects files
2. Each file's extension is checked against the exclusion set
3. Blocked files trigger an error toast with file names and extensions
4. Allowed files are read as base64 via `FileReader`, sent to Apex (`uploadFile`), and stored as `ContentVersion` + `ContentDocumentLink`
5. The file list refreshes automatically

When no extensions are excluded, the original `lightning-file-upload` is used — zero overhead, native Salesforce behavior.
