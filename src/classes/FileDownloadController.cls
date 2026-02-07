public with sharing class FileDownloadController {

    public class FileInfo {
        @AuraEnabled public Id contentDocumentId;
        @AuraEnabled public String title;
        @AuraEnabled public String fileType;
        @AuraEnabled public Long contentSize;
        @AuraEnabled public Id versionId;
        @AuraEnabled public Datetime lastModifiedDate;
        @AuraEnabled public String fileExtension;
    }

    public class FileContent {
        @AuraEnabled public String fileName;
        @AuraEnabled public String base64Data;
        @AuraEnabled public Long contentSize;
    }

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

            fileInfoList.add(fi);
        }

        return fileInfoList;
    }

    @AuraEnabled
    public static FileContent getFileContent(Id contentVersionId) {
        List<ContentVersion> versions = [
            SELECT Title, FileExtension, VersionData, ContentSize
            FROM ContentVersion
            WHERE Id = :contentVersionId
            LIMIT 1
        ];

        if (versions.isEmpty()) {
            AuraHandledException e = new AuraHandledException('File not found or access denied.');
            e.setMessage('File not found or access denied.');
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
