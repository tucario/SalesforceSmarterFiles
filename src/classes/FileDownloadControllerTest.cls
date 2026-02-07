@IsTest
private class FileDownloadControllerTest {

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
        List<FileDownloadController.FileInfo> files = FileDownloadController.getFilesList(testAccount.Id);
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
        List<FileDownloadController.FileInfo> files = FileDownloadController.getFilesList(emptyAccount.Id);
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
        FileDownloadController.FileContent content = FileDownloadController.getFileContent(cv.Id);
        Test.stopTest();

        System.assertNotEquals(null, content, 'FileContent should not be null');
        System.assertEquals('TestDocument.pdf', content.fileName, 'File name should include extension');
        System.assertNotEquals(null, content.base64Data, 'Base64 data should be populated');
        System.assert(content.contentSize > 0, 'Content size should be greater than 0');
    }

    @IsTest
    static void testGetFileContent_InvalidId() {
        // Use a fabricated ContentVersion ID that doesn't exist
        Id fakeId = ContentVersion.SObjectType.getDescribe().getKeyPrefix() + '000000000000';

        Test.startTest();
        try {
            FileDownloadController.getFileContent(fakeId);
            System.assert(false, 'Should have thrown AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertEquals('File not found or access denied.', e.getMessage(),
                'Exception message should match');
        }
        Test.stopTest();
    }
}
