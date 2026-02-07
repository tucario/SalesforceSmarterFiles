# Salesforce Smarter Files

A Lightning Web Component that enhances the native Salesforce file experience on record pages. Drop it onto any record page via Lightning App Builder to get file preview, bulk download as ZIP, and configurable upload restrictions.

## Features

- **File list with preview** -- Click any file to open the standard Salesforce file preview with navigation between files
- **Download All as ZIP** -- One-click download of all record files into a single ZIP archive (powered by JSZip)
- **Excluded file extensions** -- Optionally block specific file types from being uploaded (e.g., `docx,exe,pdf`), configured per page by an admin
- **Mixed upload handling** -- When some selected files are blocked and others aren't, allowed files upload normally and the user gets a clear toast listing what was rejected
- **Custom Labels** -- Every user-visible string is stored as a Salesforce Custom Label, allowing admins to customize all displayed text via Setup without touching code

## Deploy to Salesforce

[![Deploy to Salesforce](https://raw.githubusercontent.com/afawcett/githubsfdeploy/master/src/main/webapp/resources/img/deploy.png)](https://githubsfdeploy.herokuapp.com?owner=tucario&repo=SalesforceSmarterFiles&ref=main)

Click the button above to deploy this component directly to your Salesforce org. The deploy page lets you choose between **Sandbox** and **Production** as the target environment.

### What gets deployed

| Category | Components |
|----------|-----------|
| Apex Classes | FileDownloadController, TucarioMetadataExplorerController, TucarioMetadataService, TucarioSetupController |
| Apex Test Classes | FileDownloadControllerTest, TucarioMetadataServiceTest, TucarioSetupControllerTest |
| Lightning Web Components | filesWithDownloadAll, tucarioMetadataExplorer, tucarioSetupWizard, tucarioSetupWizardV2 |
| Static Resources | JSZip (3.10.1) |

> **Production note:** Production orgs may require Apex test execution during deployment. If the one-click deploy fails for this reason, use the CLI fallback below:
>
> ```bash
> sf project deploy start --source-dir src --target-org <your-org-alias> --test-level RunLocalTests
> ```

> **Fallback:** If the deploy tool is unavailable, use the CLI commands in the [Installation](#installation) section below. Minimum org requirements: Lightning Experience enabled, API version 60.0+.

## Installation

### Prerequisites

- Salesforce org with Lightning Experience enabled
- API version 60.0+ (Spring '24 or later)
- "Modify All Data" or equivalent metadata deployment permissions
- Salesforce CLI (`sf`) installed locally (for CLI deployment only)

### Deploy to an org

```bash
sf project deploy start --source-dir src --target-org <your-org-alias>
```

### Post-deploy setup

1. Upload the **TucarioJSZip** static resource (`src/staticresources/TucarioJSZip.resource`) if not already present
2. Open **Lightning App Builder** on any record page
3. Drag the **Files with Download All** component onto the page
4. Configure properties as needed (see below)
5. Save and activate the page

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| Card Title | String | `Files` | Header text displayed on the component card |
| Excluded File Extensions | String | *(empty)* | Comma-separated list of file extensions to block (e.g., `docx,exe,pdf`) |

When **Excluded File Extensions** is empty or not set, all file types are allowed -- the component behaves like a standard file uploader.

### Extension format

The parser is flexible. All of these are equivalent:

```
docx,exe,pdf
.docx, .exe, .pdf
DOCX , EXE , PDF
.DOCX,  exe  ,  .Pdf
```

Leading dots are stripped, whitespace is trimmed, and matching is case-insensitive.

### Customizing displayed text

All user-visible text (button labels, messages, toast titles) is stored in Salesforce Custom Labels. To customize any text:

1. Navigate to **Setup > Custom Labels**
2. Search for **Tucario** to find all labels
3. Edit the label value and save
4. Refresh the page to see the updated text

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
  staticresources/
    TucarioJSZip.resource                   -- JSZip 3.10.1 library
```

## How It Works

### File display & download

The component queries `ContentDocumentLink` records tied to the current record, maps file types to SLDS icons, and renders a scrollable list. "Download All" fetches each file's base64 content via Apex, builds a ZIP in-browser with JSZip, and triggers a download.

### Upload with extension filtering

When excluded extensions are configured, the component swaps `lightning-file-upload` for a standard `lightning-input[type=file]`. This enables client-side validation *before* any file reaches Salesforce:

1. User selects files
2. Each file's extension is checked against the exclusion set
3. Blocked files trigger an error toast with file names and extensions
4. Allowed files are read as base64 via `FileReader`, sent to Apex (`uploadFile`), and stored as `ContentVersion` + `ContentDocumentLink`
5. The file list refreshes automatically

When no extensions are excluded, the original `lightning-file-upload` is used -- zero overhead, native Salesforce behavior.

## Breaking Changes

### v2.0 — Tucario Branding Rename

All metadata elements have been renamed to use the **Tucario** prefix. If you previously deployed the old-named components, the renamed components will be created as **new metadata** in your org. The old components will remain and must be removed manually.

| Old Name | New Name | Type |
|----------|----------|------|
| `FileDownloadController` | `TucarioFileDownloadController` | Apex Class |
| `FileDownloadControllerTest` | `TucarioFileDownloadControllerTest` | Apex Test Class |
| `filesWithDownloadAll` | `tucarioFilesWithDownloadAll` | LWC Component |
| `JSZip` | `TucarioJSZip` | Static Resource |

**To clean up old components** after deploying the updated version:

```bash
sf project delete source --metadata ApexClass:FileDownloadController ApexClass:FileDownloadControllerTest LightningComponentBundle:filesWithDownloadAll StaticResource:JSZip --target-org <your-org-alias>
```

## License

MIT
