<p align="center">
  <img src="docs/images/tucario-logo.svg" alt="Tucario" width="120">
</p>

# Salesforce Smarter Files

A Lightning Web Component that enhances the native Salesforce file experience on record pages. Drop it onto any record page via Lightning App Builder to get file preview, bulk download as ZIP, and configurable upload restrictions.

## Features

- **File list with preview** — Click any file to open the standard Salesforce file preview with navigation between files
- **Download All as ZIP** — One-click download of all record files into a single ZIP archive (powered by JSZip)
- **Excluded file extensions** — Optionally block specific file types from being uploaded (e.g., `docx,exe,pdf`), configured per page by an admin
- **Mixed upload handling** — When some selected files are blocked and others aren't, allowed files upload normally and the user gets a clear toast listing what was rejected
- **Custom Labels** — Every user-visible string is stored as a Salesforce Custom Label, allowing admins to customize all displayed text via Setup without touching code

## Deploy to Salesforce

[![Deploy to Salesforce](https://raw.githubusercontent.com/afawcett/githubsfdeploy/master/src/main/webapp/resources/img/deploy.png)](https://githubsfdeploy.herokuapp.com?owner=tucario&repo=SalesforceSmarterFiles&ref=main)

Click the button above to deploy directly to your Salesforce org (Sandbox or Production).

## Documentation

| Guide | Description |
|-------|-------------|
| [Installation](docs/INSTALLATION.md) | Deploy to your org, CLI fallback, post-deploy setup, permissions |
| [Configuration](docs/CONFIGURATION.md) | Component properties, extension format, Custom Labels, deployed components |
| [Architecture](docs/ARCHITECTURE.md) | Project structure, how file display, download, and upload filtering work |

## License

MIT
