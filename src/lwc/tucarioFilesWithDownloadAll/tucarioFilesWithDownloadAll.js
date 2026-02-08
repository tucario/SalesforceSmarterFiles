import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningConfirm from 'lightning/confirm';
import { refreshApex } from '@salesforce/apex';
import { getRecord } from 'lightning/uiRecordApi';
import { loadScript } from 'lightning/platformResourceLoader';
import getFilesList from '@salesforce/apex/TucarioFileDownloadController.getFilesList';
import getFileContent from '@salesforce/apex/TucarioFileDownloadController.getFileContent';
import deleteFiles from '@salesforce/apex/TucarioFileDownloadController.deleteFiles';
import getUploadedFileSizes from '@salesforce/apex/TucarioFileDownloadController.getUploadedFileSizes';
import deleteFile from '@salesforce/apex/TucarioFileDownloadController.deleteFile';
import removeFileFromRecord from '@salesforce/apex/TucarioFileDownloadController.removeFileFromRecord';
import isContentDeliveryEnabledApex from '@salesforce/apex/TucarioFileDownloadController.isContentDeliveryEnabled';
import createPublicLink from '@salesforce/apex/TucarioFileDownloadController.createPublicLink';
import JSZIP_RESOURCE from '@salesforce/resourceUrl/TucarioJSZip';
import { LABELS, formatLabel } from 'c/tucarioLabels';
import TucarioFileEditModal from 'c/tucarioFileEditModal';

const FILE_TYPE_ICON_MAP = {
    'AI':        'doctype:ai',
    'ATTACHMENT': 'doctype:attachment',
    'AUDIO':     'doctype:audio',
    'BMP':       'doctype:image',
    'CSV':       'doctype:csv',
    'EPS':       'doctype:eps',
    'EXCEL':     'doctype:excel',
    'EXCEL_X':   'doctype:excel',
    'EXE':       'doctype:exe',
    'FLASH':     'doctype:flash',
    'GIF':       'doctype:image',
    'GPRES':     'doctype:slides',
    'HTML':      'doctype:html',
    'JPEG':      'doctype:image',
    'JPG':       'doctype:image',
    'KEYNOTE':   'doctype:keynote',
    'LINK':      'doctype:link',
    'MOV':       'doctype:video',
    'MP4':       'doctype:mp4',
    'PACK':      'doctype:pack',
    'PAGES':     'doctype:pages',
    'PDF':       'doctype:pdf',
    'PNG':       'doctype:image',
    'POWER_POINT': 'doctype:ppt',
    'POWER_POINT_X': 'doctype:ppt',
    'PSD':       'doctype:psd',
    'RTF':       'doctype:rtf',
    'SLIDE':     'doctype:slides',
    'SNOTE':     'doctype:stypi',
    'SVG':       'doctype:image',
    'TEXT':      'doctype:txt',
    'TIFF':      'doctype:image',
    'TIF':       'doctype:image',
    'UNKNOWN':   'doctype:unknown',
    'VISIO':     'doctype:visio',
    'VIDEO':     'doctype:video',
    'WORD':      'doctype:word',
    'WORD_X':    'doctype:word',
    'XML':       'doctype:xml',
    'ZIP':       'doctype:zip'
};

const MAX_FILE_SIZE_BYTES = 18 * 1024 * 1024; // 18 MB

export default class TucarioFilesWithDownloadAll extends NavigationMixin(LightningElement) {
    @api recordId;
    @api cardTitle = LABELS.Files_Card_Title;

    _initialFilesDisplayed = 0;
    isExpanded = false;

    @api
    get initialFilesDisplayed() {
        return this._initialFilesDisplayed;
    }
    set initialFilesDisplayed(value) {
        const parsed = parseInt(value, 10);
        this._initialFilesDisplayed = (Number.isFinite(parsed) && parsed > 0) ? parsed : 0;
    }

    _excludedExtensionsSet = new Set();

    @api
    get excludedFileExtensions() {
        return this._excludedFileExtensions;
    }
    set excludedFileExtensions(value) {
        this._excludedFileExtensions = value;
        if (!value || !value.trim()) {
            this._excludedExtensionsSet = new Set();
        } else {
            this._excludedExtensionsSet = new Set(
                value.split(',')
                    .map(ext => ext.trim().toLowerCase().replace(/^\.+/, ''))
                    .filter(ext => ext.length > 0)
            );
        }
    }

    get excludedExtensionsSet() {
        return this._excludedExtensionsSet;
    }

    get hasExcludedExtensions() {
        return this._excludedExtensionsSet.size > 0;
    }

    _allowedExtensionsSet = new Set();

    @api
    get allowedFileExtensions() {
        return this._allowedFileExtensions;
    }
    set allowedFileExtensions(value) {
        this._allowedFileExtensions = value;
        if (!value || !value.trim()) {
            this._allowedExtensionsSet = new Set();
        } else {
            this._allowedExtensionsSet = new Set(
                value.split(',')
                    .map(ext => ext.trim().toLowerCase().replace(/^\.+/, ''))
                    .filter(ext => ext.length > 0)
            );
        }
    }

    get hasAllowedExtensions() {
        return this._allowedExtensionsSet.size > 0;
    }

    get acceptedFormats() {
        if (this._allowedExtensionsSet.size === 0) {
            return undefined;
        }
        return [...this._allowedExtensionsSet].map(ext => '.' + ext);
    }

    _maxFileSize = 0;
    _maxFileSizeBytes = 0;

    @api
    get maxFileSize() {
        return this._maxFileSize;
    }
    set maxFileSize(value) {
        const parsed = parseInt(value, 10);
        this._maxFileSize = (Number.isFinite(parsed) && parsed > 0) ? parsed : 0;
        this._maxFileSizeBytes = this._maxFileSize * 1024 * 1024;
    }

    get hasMaxFileSize() {
        return this._maxFileSize > 0;
    }

    get hasUploadHints() {
        return this.hasAllowedExtensions || this.hasMaxFileSize;
    }

    get uploadHintAllowed() {
        if (!this.hasAllowedExtensions) {
            return null;
        }
        const list = [...this._allowedExtensionsSet].map(ext => '.' + ext).join(', ');
        return formatLabel(LABELS.Files_Upload_Hint_Allowed, list);
    }

    get uploadHintMaxSize() {
        if (!this.hasMaxFileSize) {
            return null;
        }
        return formatLabel(LABELS.Files_Upload_Hint_Max_Size, this._maxFileSize);
    }

    @api displayMode = 'List';

    get isTileView() {
        return this.displayMode === 'Tiles';
    }

    get isListView() {
        return !this.isTileView;
    }

    get label() {
        return LABELS;
    }

    files = [];
    error;
    isLoading = false;
    isDownloading = false;
    isContentDeliveryEnabled = false;
    isProcessingUpload = false;
    jsZipInitialized = false;
    wiredFilesResult;
    recordName;

    handleVisibilityChange = () => {
        if (!document.hidden) {
            refreshApex(this.wiredFilesResult);
        }
    };

    connectedCallback() {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    disconnectedCallback() {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    get hasFiles() {
        return this.files && this.files.length > 0;
    }

    get fileCount() {
        return this.files ? this.files.length : 0;
    }

    get showEmptyState() {
        return !this.hasFiles && !this.error && this.wiredFilesResult && this.wiredFilesResult.data !== undefined;
    }

    get hasDisplayLimit() {
        return this._initialFilesDisplayed > 0;
    }

    get displayedFiles() {
        if (this.isExpanded || !this.hasDisplayLimit) {
            return this.files;
        }
        return this.files.slice(0, this._initialFilesDisplayed);
    }

    get remainingFilesCount() {
        return this.files.length - this._initialFilesDisplayed;
    }

    get showExpandButton() {
        return this.hasDisplayLimit && !this.isExpanded && this.files.length > this._initialFilesDisplayed;
    }

    get expandButtonLabel() {
        return formatLabel(LABELS.Files_Show_All, this.remainingFilesCount);
    }

    get headerTitle() {
        return this.cardTitle + ' (' + this.fileCount + ')';
    }

    get zipFileName() {
        return this.recordName ? 'Files - ' + this.recordName + '.zip' : 'Files.zip';
    }

    renderedCallback() {
        if (this.jsZipInitialized) {
            return;
        }
        this.jsZipInitialized = true;
        loadScript(this, JSZIP_RESOURCE)
            .catch(error => {
                this.showToast(LABELS.Common_Error, formatLabel(LABELS.Files_Zip_Library_Error, this.reduceErrors(error)), 'error');
            });
    }

    @wire(getRecord, { recordId: '$recordId', layoutTypes: ['Compact'] })
    wiredRecord({ data, error }) {
        if (data) {
            const nameField = data.fields.Name;
            this.recordName = nameField ? nameField.value : null;
        } else if (error) {
            this.recordName = null;
        }
    }

    @wire(getFilesList, { recordId: '$recordId' })
    wiredFiles(result) {
        this.wiredFilesResult = result;
        if (result.data) {
            this.isExpanded = false;
            this.files = result.data.map(file => {
                const displayName = file.fileExtension
                    ? file.title + '.' + file.fileExtension
                    : file.title;
                return {
                    ...file,
                    iconName: this.getIconName(file.fileType),
                    formattedSize: this.formatFileSize(file.contentSize),
                    formattedDate: this.formatDate(file.lastModifiedDate),
                    displayName,
                    tileActionAlt: formatLabel(LABELS.Files_Tile_Action_Alt, displayName)
                };
            });
            this.error = undefined;
        } else if (result.error) {
            this.error = this.reduceErrors(result.error);
            this.files = [];
        }
    }

    @wire(isContentDeliveryEnabledApex)
    wiredContentDelivery({ data, error }) {
        if (data !== undefined) {
            this.isContentDeliveryEnabled = data;
        } else if (error) {
            this.isContentDeliveryEnabled = false;
        }
    }

    handleShowAll() {
        this.isExpanded = true;
    }

    handleRowAction(event) {
        const action = event.detail.value;
        const contentDocumentId = event.currentTarget.dataset.id;
        const file = this.files.find(f => f.contentDocumentId === contentDocumentId);

        switch (action) {
            case 'download':
                this.handleDownloadSingle(file);
                break;
            case 'publiclink':
                this.handlePublicLink(file);
                break;
            case 'details':
                this.navigateToFileDetail(contentDocumentId);
                break;
            case 'edit':
                this.navigateToFileEdit(contentDocumentId);
                break;
            case 'delete':
                this.confirmAndDeleteFile(contentDocumentId);
                break;
            case 'remove':
                this.confirmAndRemoveFile(contentDocumentId);
                break;
            default:
                break;
        }
    }

    handlePreviewFile(event) {
        const contentDocumentId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                selectedRecordId: contentDocumentId,
                recordIds: this.files.map(f => f.contentDocumentId).join(',')
            }
        });
    }

    async handleDownloadAll() {
        if (!this.hasFiles || this.isDownloading) {
            return;
        }

        this.isDownloading = true;
        const skippedFiles = [];
        const failedFiles = [];
        const nameCount = new Map();

        try {
            // eslint-disable-next-line no-undef
            const zip = new JSZip();

            for (const file of this.files) {
                if (file.contentSize > MAX_FILE_SIZE_BYTES) {
                    skippedFiles.push(file.displayName + ' (exceeds 18 MB limit)');
                    continue;
                }

                try {
                    const content = await getFileContent({ contentVersionId: file.versionId });
                    const uniqueName = this.getUniqueFileName(content.fileName, nameCount);
                    zip.file(uniqueName, content.base64Data, { base64: true });
                } catch (error) {
                    failedFiles.push(file.displayName + ' (' + this.reduceErrors(error) + ')');
                }
            }

            const addedCount = Object.keys(zip.files).length;
            if (addedCount === 0) {
                this.showToast(LABELS.Common_Warning, LABELS.Files_No_Archive_Warning, 'warning');
                return;
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            this.downloadBlob(blob, this.zipFileName);

            if (skippedFiles.length > 0 || failedFiles.length > 0) {
                const messages = [];
                if (skippedFiles.length > 0) {
                    messages.push('Skipped: ' + skippedFiles.join(', '));
                }
                if (failedFiles.length > 0) {
                    messages.push('Failed: ' + failedFiles.join(', '));
                }
                this.showToast(
                    LABELS.Common_Download_Warnings,
                    formatLabel(LABELS.Files_Download_Warnings, addedCount, messages.join('. ')),
                    'warning'
                );
            } else {
                this.showToast(LABELS.Common_Success, formatLabel(LABELS.Files_Download_Success, addedCount), 'success');
            }
        } catch (error) {
            this.showToast(LABELS.Common_Error, formatLabel(LABELS.Files_Zip_Create_Error, this.reduceErrors(error)), 'error');
        } finally {
            this.isDownloading = false;
        }
    }

    async handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        const extensionBlocked = [];
        const sizeCandidates = [];

        // Step 1: Extension validation (allowed + excluded)
        for (const file of uploadedFiles) {
            const ext = this.getFileExtension(file.name);
            let blocked = false;

            if (this.hasAllowedExtensions && ext && !this._allowedExtensionsSet.has(ext)) {
                blocked = true;
            }
            if (!blocked && this.hasExcludedExtensions && ext && this._excludedExtensionsSet.has(ext)) {
                blocked = true;
            }
            // Files without an extension: block only if allowed list is configured (no match possible)
            if (!blocked && this.hasAllowedExtensions && !ext) {
                blocked = true;
            }

            if (blocked) {
                extensionBlocked.push(file);
            } else {
                sizeCandidates.push(file);
            }
        }

        // Step 2: Size validation for files that passed extension checks
        const sizeBlocked = [];
        if (this.hasMaxFileSize && sizeCandidates.length > 0) {
            try {
                const candidateDocIds = sizeCandidates.map(f => f.documentId);
                const sizeMap = await getUploadedFileSizes({ contentDocumentIds: candidateDocIds });
                for (const file of sizeCandidates) {
                    const fileSize = sizeMap[file.documentId];
                    if (fileSize && fileSize > this._maxFileSizeBytes) {
                        file._fileSize = fileSize;
                        sizeBlocked.push(file);
                    }
                }
            } catch (error) {
                console.error('Error checking file sizes:', this.reduceErrors(error));
            }
        }

        // Step 3: Delete all blocked files in a single call
        const allBlocked = [...extensionBlocked, ...sizeBlocked];
        if (allBlocked.length > 0) {
            this.isProcessingUpload = true;
            try {
                await deleteFiles({ contentDocumentIds: allBlocked.map(f => f.documentId) });
            } catch (error) {
                this.showToast(LABELS.Common_Error, this.reduceErrors(error), 'error');
            } finally {
                this.isProcessingUpload = false;
            }

            // Step 4: Show appropriate error toasts
            const hasExtBlocked = extensionBlocked.length > 0;
            const hasSizeBlocked = sizeBlocked.length > 0;

            if (hasExtBlocked && hasSizeBlocked) {
                // Combined rejection — use combined toast title
                const extMsg = this.buildAllowedBlockedMessage(extensionBlocked);
                const sizeMsg = this.buildSizeBlockedMessage(sizeBlocked);
                this.showToast(LABELS.Common_Upload_Validation, extMsg + ' ' + sizeMsg, 'error');
            } else if (hasExtBlocked) {
                // Extension-only rejection
                if (this.hasAllowedExtensions) {
                    this.showToast(LABELS.Common_Upload_Blocked, this.buildAllowedBlockedMessage(extensionBlocked), 'error');
                } else {
                    this.showToast(LABELS.Common_Upload_Blocked, this.buildBlockedMessage(extensionBlocked), 'error');
                }
            } else if (hasSizeBlocked) {
                // Size-only rejection
                this.showToast(LABELS.Common_Upload_Size_Blocked, this.buildSizeBlockedMessage(sizeBlocked), 'error');
            }

            if (allBlocked.length === uploadedFiles.length) {
                refreshApex(this.wiredFilesResult);
                return;
            }
        }

        refreshApex(this.wiredFilesResult);
        this.showToast(LABELS.Common_Success, LABELS.Files_Upload_Success, 'success');
    }

    getFileExtension(fileName) {
        if (!fileName) return '';
        const dotIndex = fileName.lastIndexOf('.');
        if (dotIndex === -1 || dotIndex === fileName.length - 1) {
            return '';
        }
        return fileName.substring(dotIndex + 1).toLowerCase();
    }

    buildBlockedMessage(blockedFiles) {
        if (blockedFiles.length === 1) {
            const file = blockedFiles[0];
            const ext = this.getFileExtension(file.name);
            return formatLabel(LABELS.Files_Upload_Blocked_Single, file.name, ext);
        }
        const details = blockedFiles.map(file => {
            const ext = this.getFileExtension(file.name);
            return file.name + ' (.' + ext + ')';
        }).join(', ');
        return formatLabel(LABELS.Files_Upload_Blocked_Multiple, blockedFiles.length, details);
    }

    buildAllowedBlockedMessage(blockedFiles) {
        const allowedList = [...this._allowedExtensionsSet].map(ext => '.' + ext).join(', ');
        if (blockedFiles.length === 1) {
            return formatLabel(LABELS.Files_Upload_Allowed_Blocked_Single, blockedFiles[0].name, allowedList);
        }
        const names = blockedFiles.map(f => f.name).join(', ');
        return formatLabel(LABELS.Files_Upload_Allowed_Blocked_Multiple, blockedFiles.length, names, allowedList);
    }

    buildSizeBlockedMessage(blockedFiles) {
        if (blockedFiles.length === 1) {
            const file = blockedFiles[0];
            const formattedSize = this.formatFileSize(file._fileSize);
            return formatLabel(LABELS.Files_Upload_Size_Blocked_Single, file.name, formattedSize, this._maxFileSize);
        }
        const names = blockedFiles.map(f => f.name).join(', ');
        return formatLabel(LABELS.Files_Upload_Size_Blocked_Multiple, blockedFiles.length, this._maxFileSize, names);
    }

    // --- Row Action Handlers ---

    async handleDownloadSingle(file) {
        try {
            const content = await getFileContent({ contentVersionId: file.versionId });
            const byteCharacters = atob(content.base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);
            this.downloadBlob(blob, content.fileName);
        } catch (error) {
            this.showToast(LABELS.Common_Error, this.reduceErrors(error), 'error');
        }
    }

    navigateToFileDetail(contentDocumentId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: contentDocumentId,
                objectApiName: 'ContentDocument',
                actionName: 'view'
            }
        });
    }

    async navigateToFileEdit(contentDocumentId) {
        const result = await TucarioFileEditModal.open({
            size: 'small',
            contentDocumentId: contentDocumentId
        });
        if (result === 'success') {
            this.showToast(LABELS.Common_Success, LABELS.Files_Edit_Details_Success, 'success');
            await refreshApex(this.wiredFilesResult);
        }
    }

    async handlePublicLink(file) {
        try {
            const publicUrl = await createPublicLink({ contentVersionId: file.versionId });
            await this.copyToClipboard(publicUrl);
            this.showToast(LABELS.Common_Success, formatLabel(LABELS.Files_Public_Link_Success, publicUrl), 'success');
        } catch (error) {
            this.showToast(LABELS.Common_Error, this.reduceErrors(error), 'error');
        }
    }

    async copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        // Fallback for Lightning Locker
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        this.template.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } finally {
            textArea.remove();
        }
    }

    async confirmAndDeleteFile(contentDocumentId) {
        const result = await LightningConfirm.open({
            message: LABELS.Files_Delete_Confirm,
            variant: 'headerless',
            label: LABELS.Common_Confirm
        });
        if (result) {
            try {
                await deleteFile({ contentDocumentId });
                this.showToast(LABELS.Common_Success, LABELS.Files_Delete_Success, 'success');
                await refreshApex(this.wiredFilesResult);
            } catch (error) {
                this.showToast(LABELS.Common_Error, this.reduceErrors(error), 'error');
            }
        }
    }

    async confirmAndRemoveFile(contentDocumentId) {
        const result = await LightningConfirm.open({
            message: LABELS.Files_Remove_Confirm,
            variant: 'headerless',
            label: LABELS.Common_Confirm
        });
        if (result) {
            try {
                await removeFileFromRecord({ contentDocumentId, recordId: this.recordId });
                this.showToast(LABELS.Common_Success, LABELS.Files_Remove_Success, 'success');
                await refreshApex(this.wiredFilesResult);
            } catch (error) {
                this.showToast(LABELS.Common_Error, this.reduceErrors(error), 'error');
            }
        }
    }

    // --- Helpers ---

    getIconName(fileType) {
        return FILE_TYPE_ICON_MAP[fileType] || 'doctype:unknown';
    }

    formatFileSize(bytes) {
        if (bytes == null || bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let unitIndex = 0;
        let size = bytes;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return (unitIndex === 0 ? size : size.toFixed(1)) + ' ' + units[unitIndex];
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    }

    getUniqueFileName(fileName, nameCount) {
        if (!nameCount.has(fileName)) {
            nameCount.set(fileName, 1);
            return fileName;
        }
        const count = nameCount.get(fileName);
        nameCount.set(fileName, count + 1);

        const dotIndex = fileName.lastIndexOf('.');
        if (dotIndex === -1) {
            return fileName + ' (' + count + ')';
        }
        return fileName.substring(0, dotIndex) + ' (' + count + ')' + fileName.substring(dotIndex);
    }

    downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    reduceErrors(error) {
        if (typeof error === 'string') return error;
        if (error?.body?.message) return error.body.message;
        if (error?.message) return error.message;
        if (Array.isArray(error?.body)) return error.body.map(e => e.message).join(', ');
        return LABELS.Common_Unknown_Error;
    }
}
