# Installation Guide

## Prerequisites

- Salesforce org with Lightning Experience enabled
- API version 60.0+ (Spring '24 or later)
- "Modify All Data" or equivalent metadata deployment permissions
- Salesforce CLI (`sf`) installed locally (for CLI deployment only)

## One-Click Deploy

[![Deploy to Salesforce](https://raw.githubusercontent.com/afawcett/githubsfdeploy/master/src/main/webapp/resources/img/deploy.png)](https://githubsfdeploy.herokuapp.com?owner=tucario&repo=SalesforceSmarterFiles&ref=main)

Click the button to open the GitHub Salesforce Deploy Tool. Follow the three steps below:

### Step 1: Choose your environment

Select **Production** or **Sandbox** and confirm the Owner, Repository, and Branch fields.

<img src="images/deploy-tool-settings.png" alt="Deploy tool settings — choose Production or Sandbox" width="700">

### Step 2: Authorize Salesforce access

Log in to your Salesforce org and click **Allow** to authorize the deploy tool.

<img src="images/deploy-allow-access.png" alt="Salesforce OAuth — Allow Access" width="500">

### Step 3: Review and deploy

Review the list of components to be deployed, then click **Deploy**.

<img src="images/deploy-tool-confirmation.png" alt="Deploy confirmation with component list" width="700">

## CLI Deployment

If the one-click deploy tool is unavailable, use the Salesforce CLI:

```bash
sf project deploy start --source-dir src --target-org <your-org-alias>
```

> **Production note:** Production orgs may require Apex test execution during deployment:
>
> ```bash
> sf project deploy start --source-dir src --target-org <your-org-alias> --test-level RunLocalTests
> ```

## Post-Deploy Setup

1. Upload the **TucarioJSZip** static resource (`src/staticresources/TucarioJSZip.resource`) if not already present
2. Open **Lightning App Builder** on any record page
3. Drag the **Files with Download All** component onto the page
4. Configure properties as needed (see [Configuration](CONFIGURATION.md))
5. Save and activate the page
6. Assign the **Tucario Files** permission set to users who need the component (see [Permissions](#permissions) below)

## Permissions

### Option 1: Use the included permission set

1. Navigate to **Setup > Permission Sets**
2. Find **Tucario Files**
3. Assign to users who need the component

### Option 2: Add to your own permission set

If you manage access through your own permission sets, add:

- **Apex Class Access**: `TucarioFileDownloadController` — enabled

### Notes

- System Administrators already have access (implicit Apex class access via "Modify All Data" / "Author Apex")
- Users need standard Files access (included in all standard profiles)
- File visibility is governed by your org's sharing rules

## Removal

> **Warning:** This operation **permanently deletes** all Tucario Files components from your org. Any Lightning pages using the component will lose it, and any custom code referencing the Apex classes or Custom Labels will break. This cannot be undone — back up any customizations before proceeding.

### Sandbox

```bash
sf project deploy start --metadata-dir destructive --target-org <your-org-alias>
```

### Production

```bash
sf project deploy start --metadata-dir destructive --target-org <your-org-alias> --test-level RunLocalTests
```

> **Note:** Production deployments require Apex test execution. The `--test-level RunLocalTests` flag runs all local Apex tests in your org (excluding managed package tests). If the Tucario Files package is the **only** Apex in your org and there are no other local tests to run, you may need to create a temporary dummy test class, deploy it, then run the removal command.

### What happens

- All 66 package components are removed: Apex classes, LWC components, Custom Labels, Static Resource, and Permission Set
- Components that have already been manually deleted are safely skipped — the deployment will not fail
- Permission Set assignments are automatically removed when the Permission Set is deleted
- Uploaded files (ContentVersion records) are **not** affected — they are data, not metadata

### Keeping the manifest current

If future versions of the package add new components, the `destructive/destructiveChanges.xml` manifest should be updated to include them. The manifest must list every component for complete removal.
