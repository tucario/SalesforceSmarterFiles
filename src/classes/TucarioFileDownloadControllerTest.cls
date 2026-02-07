@IsTest
private class TucarioFileDownloadControllerTest {

    @TestSetup
    static void setupTestData() {
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;

        ContentVersion cv = new ContentVersion(
            Title = 'TestDocument',
            PathOnClient = 'TestDocument.pdf',
            VersionData = Blob.valueOf('Test file content for unit testing')
        );
        insert cv;

        Id contentDocId = [
            SELECT ContentDocumentId
            FROM ContentVersion
            WHERE Id = :cv.Id
        ].ContentDocumentId;

        ContentDocumentLink cdl = new ContentDocumentLink(
            ContentDocumentId = contentDocId,
            LinkedEntityId = testAccount.Id,
            ShareType = 'V',
            Visibility = 'AllUsers'
        );
        insert cdl;
    }

    @IsTest
    static void testGetFilesList_WithFiles() {
        Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

        Test.startTest();
        List<TucarioFileDownloadController.FileInfo> files = TucarioFileDownloadController.getFilesList(testAccount.Id);
        Test.stopTest();

        System.assertEquals(1, files.size(), 'Should return 1 file');
        System.assertEquals('TestDocument', files[0].title, 'File title should match');
        System.assertNotEquals(null, files[0].contentDocumentId, 'ContentDocumentId should be populated');
        System.assertNotEquals(null, files[0].versionId, 'VersionId should be populated');
        System.assertNotEquals(null, files[0].contentSize, 'ContentSize should be populated');
        System.assertNotEquals(null, files[0].lastModifiedDate, 'LastModifiedDate should be populated');
    }

    @IsTest
    static void testGetFilesList_EmptyRecord() {
        Account emptyAccount = new Account(Name = 'Empty Account');
        insert emptyAccount;

        Test.startTest();
        List<TucarioFileDownloadController.FileInfo> files = TucarioFileDownloadController.getFilesList(emptyAccount.Id);
        Test.stopTest();

        System.assertEquals(0, files.size(), 'Should return empty list for record with no files');
    }

    @IsTest
    static void testGetFileContent_ValidFile() {
        ContentVersion cv = [
            SELECT Id
            FROM ContentVersion
            WHERE Title = 'TestDocument'
              AND IsLatest = true
            LIMIT 1
        ];

        Test.startTest();
        TucarioFileDownloadController.FileContent content = TucarioFileDownloadController.getFileContent(cv.Id);
        Test.stopTest();

        System.assertNotEquals(null, content, 'FileContent should not be null');
        System.assertEquals('TestDocument.pdf', content.fileName, 'File name should include extension');
        System.assertNotEquals(null, content.base64Data, 'Base64 data should be populated');
        System.assert(content.contentSize > 0, 'Content size should be greater than 0');
    }

    @IsTest
    static void testUploadFile_Success() {
        Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];
        String base64Data = EncodingUtil.base64Encode(Blob.valueOf('Test upload content'));
        String fileName = 'uploaded.txt';

        Test.startTest();
        Id cvId = TucarioFileDownloadController.uploadFile(base64Data, fileName, testAccount.Id);
        Test.stopTest();

        System.assertNotEquals(null, cvId, 'Should return a ContentVersion Id');

        ContentVersion cv = [SELECT Title, PathOnClient FROM ContentVersion WHERE Id = :cvId];
        System.assertEquals('uploaded', cv.Title, 'Title should be filename without extension');
        System.assertEquals('uploaded.txt', cv.PathOnClient, 'PathOnClient should be the full filename');

        Id contentDocId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cvId].ContentDocumentId;
        List<ContentDocumentLink> links = [
            SELECT LinkedEntityId FROM ContentDocumentLink
            WHERE ContentDocumentId = :contentDocId AND LinkedEntityId = :testAccount.Id
        ];
        System.assertEquals(1, links.size(), 'Should create a ContentDocumentLink to the record');
    }

    @IsTest
    static void testUploadFile_NullBase64Data() {
        Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

        Test.startTest();
        try {
            TucarioFileDownloadController.uploadFile(null, 'test.txt', testAccount.Id);
            System.assert(false, 'Should have thrown AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertEquals('File data is required.', e.getMessage());
        }
        Test.stopTest();
    }

    @IsTest
    static void testUploadFile_NullFileName() {
        Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

        Test.startTest();
        try {
            TucarioFileDownloadController.uploadFile('SGVsbG8=', null, testAccount.Id);
            System.assert(false, 'Should have thrown AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertEquals('File name is required.', e.getMessage());
        }
        Test.stopTest();
    }

    @IsTest
    static void testUploadFile_NullRecordId() {
        Test.startTest();
        try {
            TucarioFileDownloadController.uploadFile('SGVsbG8=', 'test.txt', null);
            System.assert(false, 'Should have thrown AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertEquals('Record ID is required.', e.getMessage());
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetFileContent_InvalidId() {
        // Use a fabricated ContentVersion ID that doesn't exist
        Id fakeId = ContentVersion.SObjectType.getDescribe().getKeyPrefix() + '000000000000';

        Test.startTest();
        try {
            TucarioFileDownloadController.getFileContent(fakeId);
            System.assert(false, 'Should have thrown AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertEquals('File not found or access denied.', e.getMessage(),
                'Exception message should match');
        }
        Test.stopTest();
    }
}
