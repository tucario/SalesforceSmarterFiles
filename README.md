<p align="center">
  <img src="docs/images/tucario-logo.svg" alt="Tucario" width="120">
</p>

# Salesforce Smarter Files

A Lightning Web Component that enhances the native Salesforce file experience on record pages. Drop it onto any record page via Lightning App Builder to get file preview, bulk download as ZIP, per-file actions, and configurable upload restrictions.

<img src="docs/images/record-page.png" alt="Files with Download All component on a Salesforce record page" width="800">

## Features

- **List & Tile views** — Switch between a compact list and a visual tile grid, configured per page
- **File preview** — Click any file to open the standard Salesforce file preview
- **Download All as ZIP** — One-click download of all record files into a ZIP archive (small files via JSZip, large files via a server-generated ZIP) — no file size limits
- **Per-file actions** — Dropdown menu on each file with Download, Share, Public Link, View Details, Edit Details, Delete, and Remove from Record
- **Public link creation** — Generate a public download link for any file and automatically copy it to the clipboard
- **Edit details with auto-refresh** — Edit file details in a modal and see the file list update automatically after saving
- **Large file support** — Files of any size can be downloaded individually or in bulk, bypassing Apex heap limits via the Salesforce file servlet
- **Platform license support** — Full compatibility with Salesforce Platform Starter and Platform Plus licenses, with accurate ownership-based permission checks for Delete actions
- **Allowed file extensions** — Optionally restrict uploads to specific file types (e.g., `pdf,docx,png`), configured per page by an admin
- **Max file size** — Set a maximum upload size in MB per page
- **Display limit** — Control how many files are shown initially with a "Show All" toggle
- **Custom Labels** — Every user-visible string is stored as a Salesforce Custom Label, allowing admins to customize all text via Setup without touching code

## Deploy to Salesforce

[![Deploy to Salesforce](https://raw.githubusercontent.com/afawcett/githubsfdeploy/master/src/main/webapp/resources/img/deploy.png)](https://githubsfdeploy.herokuapp.com?owner=tucario&repo=SalesforceSmarterFiles&ref=main)

Click the button above to deploy directly to your Salesforce org (Sandbox or Production).

## Documentation

| Guide | Description |
|-------|-------------|
| [Installation](docs/INSTALLATION.md) | Deploy to your org, CLI fallback, post-deploy setup, permissions |
| [Configuration](docs/CONFIGURATION.md) | Component properties, display modes, upload restrictions, deployed components |
| [Architecture](docs/ARCHITECTURE.md) | Project structure, how file display, download, and upload filtering work |

## License

MIT
