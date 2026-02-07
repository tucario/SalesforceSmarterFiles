# Configuration Guide

## Component Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| Card Title | String | `Files` | Header text displayed on the component card |
| Excluded File Extensions | String | *(empty)* | Comma-separated list of file extensions to block (e.g., `docx,exe,pdf`) |
| Initial Files Displayed | Integer | *(none)* | Maximum number of files to display initially |

When **Excluded File Extensions** is empty or not set, all file types are allowed — the component behaves like a standard file uploader.

### How Excluded Extensions Work

File upload always uses the standard Salesforce `lightning-file-upload` component, which supports files of any size. When excluded extensions are configured, the component validates files **after** upload completes:

1. User selects and uploads file(s) through the standard Salesforce file picker
2. Once upload finishes, the component checks each file's extension against the excluded list
3. Files with excluded extensions are **automatically deleted** from the org and the user sees an "Upload Blocked" error toast
4. Files with allowed extensions are kept and a success toast is shown
5. A spinner is displayed while blocked files are being removed

This approach ensures full compatibility with large files (no size limit) while still enforcing extension restrictions.

## Extension Format

The parser is flexible. All of these are equivalent:

```
docx,exe,pdf
.docx, .exe, .pdf
DOCX , EXE , PDF
.DOCX,  exe  ,  .Pdf
```

Leading dots are stripped, whitespace is trimmed, and matching is case-insensitive.

## What Gets Deployed

| Category | Components |
|----------|-----------|
| Apex Classes | FileDownloadController, TucarioMetadataExplorerController, TucarioMetadataService, TucarioSetupController |
| Apex Test Classes | FileDownloadControllerTest, TucarioMetadataServiceTest, TucarioSetupControllerTest |
| Lightning Web Components | filesWithDownloadAll, tucarioMetadataExplorer, tucarioSetupWizard, tucarioSetupWizardV2 |
| Static Resources | JSZip (3.10.1) |
| Permission Set | Tucario_Files |

## Customizing Displayed Text

All user-visible text (button labels, messages, toast titles) is stored in Salesforce Custom Labels. To customize any text:

1. Navigate to **Setup > Custom Labels**
2. Search for **Tucario** to find all labels
3. Edit the label value and save
4. Refresh the page to see the updated text
