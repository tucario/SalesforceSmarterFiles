public with sharing class TucarioFileDownloadController {

    /**
     * Wrapper class containing metadata for a file attached to a record.
     */
    public class FileInfo {
        @AuraEnabled public Id contentDocumentId;
        @AuraEnabled public String title;
        @AuraEnabled public String fileType;
        @AuraEnabled public Long contentSize;
        @AuraEnabled public Id versionId;
        @AuraEnabled public Datetime lastModifiedDate;
        @AuraEnabled public String fileExtension;
        @AuraEnabled public Boolean hasEditAccess;
        @AuraEnabled public Boolean hasDeleteAccess;
    }

    /**
     * Wrapper class containing file content data for download operations.
     */
    public class FileContent {
        @AuraEnabled public String fileName;
        @AuraEnabled public String base64Data;
        @AuraEnabled public Long contentSize;
    }

    /**
     * Retrieves all files linked to a record, sorted by last modified date (newest first).
     * Returns file metadata including title, type, size, and version information.
     * @param recordId The ID of the record to retrieve files for
     * @return List of FileInfo objects containing file metadata, empty list if no files found
     */
    @AuraEnabled(cacheable=true)
    public static List<FileInfo> getFilesList(Id recordId) {
        List<FileInfo> fileInfoList = new List<FileInfo>();

        List<ContentDocumentLink> docLinks = [
            SELECT ContentDocumentId,
                   ContentDocument.Title,
                   ContentDocument.FileType,
                   ContentDocument.ContentSize,
                   ContentDocument.LatestPublishedVersionId,
                   ContentDocument.LastModifiedDate
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :recordId
            ORDER BY ContentDocument.LastModifiedDate DESC
        ];

        if (docLinks.isEmpty()) {
            return fileInfoList;
        }

        Set<Id> docIds = new Set<Id>();
        for (ContentDocumentLink link : docLinks) {
            docIds.add(link.ContentDocumentId);
        }

        Map<Id, ContentVersion> versionsByDocId = new Map<Id, ContentVersion>();
        for (ContentVersion cv : [
            SELECT Id, ContentDocumentId, FileExtension
            FROM ContentVersion
            WHERE ContentDocumentId IN :docIds
              AND IsLatest = true
        ]) {
            versionsByDocId.put(cv.ContentDocumentId, cv);
        }

        Map<Id, UserRecordAccess> accessMap = new Map<Id, UserRecordAccess>();
        for (UserRecordAccess ura : [
            SELECT RecordId, HasEditAccess, HasDeleteAccess
            FROM UserRecordAccess
            WHERE UserId = :UserInfo.getUserId()
              AND RecordId IN :docIds
        ]) {
            accessMap.put(ura.RecordId, ura);
        }

        for (ContentDocumentLink link : docLinks) {
            FileInfo fi = new FileInfo();
            fi.contentDocumentId = link.ContentDocumentId;
            fi.title = link.ContentDocument.Title;
            fi.fileType = link.ContentDocument.FileType;
            fi.contentSize = link.ContentDocument.ContentSize;
            fi.versionId = link.ContentDocument.LatestPublishedVersionId;
            fi.lastModifiedDate = link.ContentDocument.LastModifiedDate;

            ContentVersion cv = versionsByDocId.get(link.ContentDocumentId);
            if (cv != null) {
                fi.fileExtension = cv.FileExtension;
            }

            UserRecordAccess access = accessMap.get(link.ContentDocumentId);
            if (access != null) {
                fi.hasEditAccess = access.HasEditAccess;
                fi.hasDeleteAccess = access.HasDeleteAccess;
            } else {
                fi.hasEditAccess = false;
                fi.hasDeleteAccess = false;
            }

            fileInfoList.add(fi);
        }

        return fileInfoList;
    }

    /**
     * Returns the file sizes (in bytes) for the specified ContentDocuments.
     * Used for post-upload validation against a configurable maximum file size.
     * @param contentDocumentIds List of ContentDocument IDs to query sizes for
     * @return Map of ContentDocument ID to ContentSize in bytes
     */
    @AuraEnabled
    public static Map<Id, Long> getUploadedFileSizes(List<Id> contentDocumentIds) {
        Map<Id, Long> sizeMap = new Map<Id, Long>();
        if (contentDocumentIds == null || contentDocumentIds.isEmpty()) {
            return sizeMap;
        }
        for (ContentDocument doc : [
            SELECT Id, ContentSize
            FROM ContentDocument
            WHERE Id IN :contentDocumentIds
        ]) {
            sizeMap.put(doc.Id, doc.ContentSize);
        }
        return sizeMap;
    }

    /**
     * Permanently deletes a file from Salesforce.
     * Cascades to all ContentDocumentLinks and ContentVersions.
     * @param contentDocumentId The ID of the ContentDocument to delete
     * @throws AuraHandledException if the file cannot be deleted (insufficient access or not found)
     */
    @AuraEnabled
    public static void deleteFile(Id contentDocumentId) {
        try {
            delete [SELECT Id FROM ContentDocument WHERE Id = :contentDocumentId LIMIT 1];
        } catch (DmlException e) {
            AuraHandledException ex = new AuraHandledException(e.getMessage());
            ex.setMessage(e.getMessage());
            throw ex;
        }
    }

    /**
     * Removes a file from a record by deleting the ContentDocumentLink.
     * The file itself is not deleted and remains accessible from other linked records.
     * @param contentDocumentId The ID of the ContentDocument to unlink
     * @param recordId The ID of the record to remove the file from
     * @throws AuraHandledException if the link cannot be found or deleted
     */
    @AuraEnabled
    public static void removeFileFromRecord(Id contentDocumentId, Id recordId) {
        try {
            ContentDocumentLink link = [
                SELECT Id
                FROM ContentDocumentLink
                WHERE ContentDocumentId = :contentDocumentId
                  AND LinkedEntityId = :recordId
                LIMIT 1
            ];
            delete link;
        } catch (QueryException e) {
            AuraHandledException ex = new AuraHandledException(System.Label.Tucario_Files_Error_File_Not_Found);
            ex.setMessage(System.Label.Tucario_Files_Error_File_Not_Found);
            throw ex;
        } catch (DmlException e) {
            AuraHandledException ex = new AuraHandledException(e.getMessage());
            ex.setMessage(e.getMessage());
            throw ex;
        }
    }

    /**
     * Checks if Content Deliveries (Public Links) are enabled and the current user can create them.
     * @return true if ContentDistribution is createable by the current user, false otherwise
     */
    @AuraEnabled(cacheable=true)
    public static Boolean isContentDeliveryEnabled() {
        SObjectType cdType = Schema.getGlobalDescribe().get('ContentDistribution');
        return cdType != null && cdType.getDescribe().isCreateable();
    }

    /**
     * Uploads a file and links it to the specified record.
     * Creates a ContentVersion from base64-encoded data and a ContentDocumentLink to associate it.
     * @param base64Data Base64-encoded file content
     * @param fileName Full filename including extension (e.g., "report.pdf")
     * @param recordId The ID of the record to link the file to
     * @return The ContentVersion ID of the created file
     * @throws AuraHandledException if base64Data, fileName, or recordId is blank/null
     */
    @AuraEnabled
    public static Id uploadFile(String base64Data, String fileName, Id recordId) {
        if (String.isBlank(base64Data)) {
            throw new AuraHandledException(System.Label.Tucario_Files_Error_File_Data_Required);
        }
        if (String.isBlank(fileName)) {
            throw new AuraHandledException(System.Label.Tucario_Files_Error_File_Name_Required);
        }
        if (recordId == null) {
            throw new AuraHandledException(System.Label.Tucario_Files_Error_Record_Id_Required);
        }

        ContentVersion cv = new ContentVersion();
        cv.Title = fileName.substringBeforeLast('.');
        cv.PathOnClient = fileName;
        cv.VersionData = EncodingUtil.base64Decode(base64Data);
        insert cv;

        Id contentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

        ContentDocumentLink cdl = new ContentDocumentLink();
        cdl.ContentDocumentId = contentDocumentId;
        cdl.LinkedEntityId = recordId;
        cdl.ShareType = 'V';
        insert cdl;

        return cv.Id;
    }

    /**
     * Deletes ContentDocuments by their IDs.
     * Used to remove files that were uploaded with excluded extensions.
     * @param contentDocumentIds List of ContentDocument IDs to delete
     */
    @AuraEnabled
    public static void deleteFiles(List<Id> contentDocumentIds) {
        if (contentDocumentIds == null || contentDocumentIds.isEmpty()) {
            return;
        }
        delete [SELECT Id FROM ContentDocument WHERE Id IN :contentDocumentIds];
    }

    /**
     * Retrieves the content of a specific file version for download.
     * Returns the file name, base64-encoded data, and size.
     * @param contentVersionId The ID of the ContentVersion to retrieve
     * @return FileContent object with fileName, base64Data, and contentSize
     * @throws AuraHandledException if the file is not found or the user lacks access
     */
    @AuraEnabled
    public static FileContent getFileContent(Id contentVersionId) {
        List<ContentVersion> versions = [
            SELECT Title, FileExtension, VersionData, ContentSize
            FROM ContentVersion
            WHERE Id = :contentVersionId
            LIMIT 1
        ];

        if (versions.isEmpty()) {
            AuraHandledException e = new AuraHandledException(System.Label.Tucario_Files_Error_File_Not_Found);
            e.setMessage(System.Label.Tucario_Files_Error_File_Not_Found);
            throw e;
        }

        ContentVersion cv = versions[0];
        FileContent fc = new FileContent();

        if (String.isNotBlank(cv.FileExtension)) {
            fc.fileName = cv.Title + '.' + cv.FileExtension;
        } else {
            fc.fileName = cv.Title;
        }

        fc.base64Data = EncodingUtil.base64Encode(cv.VersionData);
        fc.contentSize = cv.ContentSize;

        return fc;
    }
}
