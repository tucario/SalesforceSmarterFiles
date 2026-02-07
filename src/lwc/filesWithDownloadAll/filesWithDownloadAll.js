import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { getRecord } from 'lightning/uiRecordApi';
import { loadScript } from 'lightning/platformResourceLoader';
import getFilesList from '@salesforce/apex/FileDownloadController.getFilesList';
import getFileContent from '@salesforce/apex/FileDownloadController.getFileContent';
import uploadFile from '@salesforce/apex/FileDownloadController.uploadFile';
import JSZIP_RESOURCE from '@salesforce/resourceUrl/JSZip';

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

export default class FilesWithDownloadAll extends NavigationMixin(LightningElement) {
    @api recordId;
    @api cardTitle = 'Files';

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

    files = [];
    error;
    isLoading = false;
    isDownloading = false;
    isUploading = false;
    jsZipInitialized = false;
    wiredFilesResult;
    recordName;

    get hasFiles() {
        return this.files && this.files.length > 0;
    }

    get fileCount() {
        return this.files ? this.files.length : 0;
    }

    get showEmptyState() {
        return !this.hasFiles && !this.error && this.wiredFilesResult && this.wiredFilesResult.data !== undefined;
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
                this.showToast('Error', 'Failed to load ZIP library: ' + this.reduceErrors(error), 'error');
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
            this.files = result.data.map(file => ({
                ...file,
                iconName: this.getIconName(file.fileType),
                formattedSize: this.formatFileSize(file.contentSize),
                formattedDate: this.formatDate(file.lastModifiedDate),
                displayName: file.fileExtension
                    ? file.title + '.' + file.fileExtension
                    : file.title
            }));
            this.error = undefined;
        } else if (result.error) {
            this.error = this.reduceErrors(result.error);
            this.files = [];
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
                this.showToast('Warning', 'No files could be added to the archive.', 'warning');
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
                    'Download Complete (with warnings)',
                    addedCount + ' file(s) downloaded. ' + messages.join('. '),
                    'warning'
                );
            } else {
                this.showToast('Success', addedCount + ' file(s) downloaded successfully.', 'success');
            }
        } catch (error) {
            this.showToast('Error', 'Failed to create ZIP archive: ' + this.reduceErrors(error), 'error');
        } finally {
            this.isDownloading = false;
        }
    }

    handleUploadFinished() {
        refreshApex(this.wiredFilesResult);
        this.showToast('Success', 'File(s) uploaded successfully.', 'success');
    }

    async handleFilesSelected(event) {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }

        const { allowed, blocked } = this.validateFiles(files);

        if (blocked.length > 0) {
            this.showToast('Upload Blocked', this.buildBlockedMessage(blocked), 'error');
        }

        if (allowed.length > 0) {
            await this.uploadFiles(allowed);
        }

        // Reset file input so the same file can be re-selected
        event.target.value = '';
    }

    validateFiles(files) {
        const allowed = [];
        const blocked = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = this.getFileExtension(file.name);
            if (ext && this._excludedExtensionsSet.has(ext)) {
                blocked.push(file);
            } else {
                allowed.push(file);
            }
        }

        return { allowed, blocked };
    }

    getFileExtension(fileName) {
        if (!fileName) return '';
        const dotIndex = fileName.lastIndexOf('.');
        if (dotIndex === -1 || dotIndex === fileName.length - 1) {
            return '';
        }
        return fileName.substring(dotIndex + 1).toLowerCase();
    }

    async uploadFiles(allowedFiles) {
        this.isUploading = true;
        const failedFiles = [];

        try {
            for (const file of allowedFiles) {
                try {
                    const base64Data = await this.readFileAsBase64(file);
                    await uploadFile({
                        base64Data: base64Data,
                        fileName: file.name,
                        recordId: this.recordId
                    });
                } catch (error) {
                    failedFiles.push(file.name + ' (' + this.reduceErrors(error) + ')');
                }
            }

            await refreshApex(this.wiredFilesResult);

            if (failedFiles.length > 0) {
                this.showToast(
                    'Upload Complete (with errors)',
                    'Failed: ' + failedFiles.join(', '),
                    'warning'
                );
            } else {
                this.showToast('Success', allowedFiles.length + ' file(s) uploaded successfully.', 'success');
            }
        } catch (error) {
            this.showToast('Error', 'Upload failed: ' + this.reduceErrors(error), 'error');
        } finally {
            this.isUploading = false;
        }
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read file: ' + file.name));
            reader.readAsDataURL(file);
        });
    }

    buildBlockedMessage(blockedFiles) {
        if (blockedFiles.length === 1) {
            const file = blockedFiles[0];
            const ext = this.getFileExtension(file.name);
            return '"' + file.name + '" cannot be uploaded. The .' + ext + ' file type is not allowed on this page.';
        }
        const details = blockedFiles.map(file => {
            const ext = this.getFileExtension(file.name);
            return file.name + ' (.' + ext + ')';
        }).join(', ');
        return blockedFiles.length + ' file(s) could not be uploaded: ' + details + '. These file types are not allowed on this page.';
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
        return 'Unknown error';
    }
}
