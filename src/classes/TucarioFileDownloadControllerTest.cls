@IsTest
private class TucarioFileDownloadControllerTest {

    @TestSetup
    static void setupTestData() {
        Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User testUser = new User(
            Alias = 'tuctest',
            Email = 'tucariotest@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Test',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = stdProfile.Id,
            TimeZoneSidKey = 'America/New_York',
            Username = 'tucariotest' + DateTime.now().getTime() + '@test.com'
        );
        insert testUser;

        PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'Tucario_Files' LIMIT 1];
        insert new PermissionSetAssignment(AssigneeId = testUser.Id, PermissionSetId = ps.Id);

        // Separate DML context to avoid MIXED_DML_OPERATION
        System.runAs(testUser) {
            Account testAccount = new Account(Name = 'Test Account');
            insert testAccount;

            ContentVersion cv1 = new ContentVersion(
                Title = 'TestDocument',
                PathOnClient = 'TestDocument.pdf',
                VersionData = Blob.valueOf('Test file content for unit testing')
            );
            insert cv1;

            Id contentDocId1 = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv1.Id].ContentDocumentId;
            insert new ContentDocumentLink(
                ContentDocumentId = contentDocId1,
                LinkedEntityId = testAccount.Id,
                ShareType = 'V',
                Visibility = 'AllUsers'
            );

            ContentVersion cv2 = new ContentVersion(
                Title = 'Makefile',
                PathOnClient = 'Makefile',
                VersionData = Blob.valueOf('build: all')
            );
            insert cv2;

            Id contentDocId2 = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv2.Id].ContentDocumentId;
            insert new ContentDocumentLink(
                ContentDocumentId = contentDocId2,
                LinkedEntityId = testAccount.Id,
                ShareType = 'V',
                Visibility = 'AllUsers'
            );
        }
    }

    // --- getFilesList Tests ---

    @IsTest
    static void testGetFilesList_WithFiles() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

            Test.startTest();
            List<TucarioFileDownloadController.FileInfo> files = TucarioFileDownloadController.getFilesList(testAccount.Id);
            Test.stopTest();

            System.assertEquals(2, files.size(), 'Should return 2 files for record with two attachments');
            System.assertNotEquals(null, files[0].title, 'File title should not be null');
            System.assertNotEquals(null, files[0].contentDocumentId, 'ContentDocumentId should be populated');
            System.assertNotEquals(null, files[0].versionId, 'VersionId should be populated');
            System.assertNotEquals(null, files[0].contentSize, 'ContentSize should be populated');
            System.assertNotEquals(null, files[0].lastModifiedDate, 'LastModifiedDate should be populated');
        }
    }

    @IsTest
    static void testGetFilesList_MultipleFiles() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

            Test.startTest();
            List<TucarioFileDownloadController.FileInfo> files = TucarioFileDownloadController.getFilesList(testAccount.Id);
            Test.stopTest();

            System.assertEquals(2, files.size(), 'Should return 2 files for record with two attachments');
            System.assert(files[0].lastModifiedDate >= files[1].lastModifiedDate,
                'Files should be ordered by last modified date (newest first)');
        }
    }

    @IsTest
    static void testGetFilesList_EmptyRecord() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account emptyAccount = new Account(Name = 'Empty Account');
            insert emptyAccount;

            Test.startTest();
            List<TucarioFileDownloadController.FileInfo> files = TucarioFileDownloadController.getFilesList(emptyAccount.Id);
            Test.stopTest();

            System.assertEquals(0, files.size(), 'Should return empty list for record with no files');
        }
    }

    @IsTest
    static void testGetFilesList_FileExtensionPopulated() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

            Test.startTest();
            List<TucarioFileDownloadController.FileInfo> files = TucarioFileDownloadController.getFilesList(testAccount.Id);
            Test.stopTest();

            TucarioFileDownloadController.FileInfo pdfFile = null;
            for (TucarioFileDownloadController.FileInfo fi : files) {
                if (fi.title == 'TestDocument') {
                    pdfFile = fi;
                    break;
                }
            }
            System.assertNotEquals(null, pdfFile, 'Should find TestDocument in the returned files');
            System.assertEquals('pdf', pdfFile.fileExtension, 'FileExtension should be pdf for TestDocument.pdf');
        }
    }

    // --- getFileContent Tests ---

    @IsTest
    static void testGetFileContent_ValidFile() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            ContentVersion cv = [
                SELECT Id
                FROM ContentVersion
                WHERE Title = 'TestDocument' AND IsLatest = true
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
    }

    @IsTest
    static void testGetFileContent_FileWithoutExtension() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            ContentVersion cv = [
                SELECT Id
                FROM ContentVersion
                WHERE Title = 'Makefile' AND IsLatest = true
                LIMIT 1
            ];

            Test.startTest();
            TucarioFileDownloadController.FileContent content = TucarioFileDownloadController.getFileContent(cv.Id);
            Test.stopTest();

            System.assertEquals('Makefile', content.fileName, 'File name should be title only with no extension');
            System.assertNotEquals(null, content.base64Data, 'Base64 data should be populated');
            System.assert(content.contentSize > 0, 'Content size should be greater than 0');
        }
    }

    @IsTest
    static void testGetFileContent_InvalidId() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Id fakeId = ContentVersion.SObjectType.getDescribe().getKeyPrefix() + '000000000000';

            Test.startTest();
            try {
                TucarioFileDownloadController.getFileContent(fakeId);
                System.assert(false, 'Should have thrown AuraHandledException for invalid content version ID');
            } catch (AuraHandledException e) {
                System.assertEquals(System.Label.Tucario_Files_Error_File_Not_Found, e.getMessage(),
                    'Exception message should indicate file not found or access denied');
            }
            Test.stopTest();
        }
    }

    // --- getFilesList Permission Tests ---

    @IsTest
    static void testGetFilesList_PermissionFieldsPopulated() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

            Test.startTest();
            List<TucarioFileDownloadController.FileInfo> files = TucarioFileDownloadController.getFilesList(testAccount.Id);
            Test.stopTest();

            System.assertEquals(2, files.size(), 'Should return 2 files');
            for (TucarioFileDownloadController.FileInfo fi : files) {
                System.assertNotEquals(null, fi.hasEditAccess, 'hasEditAccess should be populated');
                System.assertNotEquals(null, fi.hasDeleteAccess, 'hasDeleteAccess should be populated');
            }
        }
    }

    // --- deleteFile Tests ---

    @IsTest
    static void testDeleteFile_Success() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            ContentVersion cv = new ContentVersion(
                Title = 'ToDeleteSingle',
                PathOnClient = 'ToDeleteSingle.txt',
                VersionData = Blob.valueOf('delete me single')
            );
            insert cv;

            Id contentDocId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

            Test.startTest();
            TucarioFileDownloadController.deleteFile(contentDocId);
            Test.stopTest();

            List<ContentDocument> remaining = [SELECT Id FROM ContentDocument WHERE Id = :contentDocId];
            System.assertEquals(0, remaining.size(), 'ContentDocument should be deleted');
        }
    }

    @IsTest
    static void testDeleteFile_InvalidId() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Id fakeId = ContentDocument.SObjectType.getDescribe().getKeyPrefix() + '000000000000';

            Test.startTest();
            try {
                TucarioFileDownloadController.deleteFile(fakeId);
                System.assert(false, 'Should have thrown AuraHandledException for invalid ContentDocument ID');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
            }
            Test.stopTest();
        }
    }

    // --- removeFileFromRecord Tests ---

    @IsTest
    static void testRemoveFileFromRecord_Success() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

            ContentVersion cv = new ContentVersion(
                Title = 'ToRemove',
                PathOnClient = 'ToRemove.txt',
                VersionData = Blob.valueOf('remove me from record')
            );
            insert cv;

            Id contentDocId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;
            insert new ContentDocumentLink(
                ContentDocumentId = contentDocId,
                LinkedEntityId = testAccount.Id,
                ShareType = 'V',
                Visibility = 'AllUsers'
            );

            Test.startTest();
            TucarioFileDownloadController.removeFileFromRecord(contentDocId, testAccount.Id);
            Test.stopTest();

            List<ContentDocumentLink> links = [
                SELECT Id FROM ContentDocumentLink
                WHERE ContentDocumentId = :contentDocId AND LinkedEntityId = :testAccount.Id
            ];
            System.assertEquals(0, links.size(), 'ContentDocumentLink should be deleted');

            List<ContentDocument> docs = [SELECT Id FROM ContentDocument WHERE Id = :contentDocId];
            System.assertEquals(1, docs.size(), 'ContentDocument should still exist');
        }
    }

    @IsTest
    static void testRemoveFileFromRecord_InvalidLink() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];
            Id fakeDocId = ContentDocument.SObjectType.getDescribe().getKeyPrefix() + '000000000000';

            Test.startTest();
            try {
                TucarioFileDownloadController.removeFileFromRecord(fakeDocId, testAccount.Id);
                System.assert(false, 'Should have thrown AuraHandledException for invalid link');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
            }
            Test.stopTest();
        }
    }

    // --- isContentDeliveryEnabled Tests ---

    @IsTest
    static void testIsContentDeliveryEnabled_ReturnsBoolean() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Test.startTest();
            Boolean result = TucarioFileDownloadController.isContentDeliveryEnabled();
            Test.stopTest();

            System.assertNotEquals(null, result, 'isContentDeliveryEnabled should return a Boolean value');
        }
    }

    // --- deleteFiles Tests ---

    @IsTest
    static void testDeleteFiles_Success() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            ContentVersion cv = new ContentVersion(
                Title = 'ToDelete',
                PathOnClient = 'ToDelete.txt',
                VersionData = Blob.valueOf('delete me')
            );
            insert cv;

            Id contentDocId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

            Test.startTest();
            TucarioFileDownloadController.deleteFiles(new List<Id>{ contentDocId });
            Test.stopTest();

            List<ContentDocument> remaining = [SELECT Id FROM ContentDocument WHERE Id = :contentDocId];
            System.assertEquals(0, remaining.size(), 'ContentDocument should be deleted');
        }
    }

    @IsTest
    static void testDeleteFiles_EmptyList() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Test.startTest();
            TucarioFileDownloadController.deleteFiles(new List<Id>());
            Test.stopTest();
            // No exception expected
        }
    }

    @IsTest
    static void testDeleteFiles_NullList() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Test.startTest();
            TucarioFileDownloadController.deleteFiles(null);
            Test.stopTest();
            // No exception expected
        }
    }

    // --- uploadFile Tests ---

    @IsTest
    static void testUploadFile_Success() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];
            String base64Data = EncodingUtil.base64Encode(Blob.valueOf('Test upload content'));

            Test.startTest();
            Id cvId = TucarioFileDownloadController.uploadFile(base64Data, 'uploaded.txt', testAccount.Id);
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
    }

    @IsTest
    static void testUploadFile_NullBase64Data() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

            Test.startTest();
            try {
                TucarioFileDownloadController.uploadFile(null, 'test.txt', testAccount.Id);
                System.assert(false, 'Should have thrown AuraHandledException for null base64 data');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e.getMessage(),
                    'AuraHandledException should be thrown for null base64 data');
            }
            Test.stopTest();
        }
    }

    @IsTest
    static void testUploadFile_EmptyBase64Data() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

            Test.startTest();
            try {
                TucarioFileDownloadController.uploadFile('', 'test.txt', testAccount.Id);
                System.assert(false, 'Should have thrown AuraHandledException for empty base64 data');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e.getMessage(),
                    'AuraHandledException should be thrown for empty base64 data');
            }
            Test.stopTest();
        }
    }

    @IsTest
    static void testUploadFile_NullFileName() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

            Test.startTest();
            try {
                TucarioFileDownloadController.uploadFile('SGVsbG8=', null, testAccount.Id);
                System.assert(false, 'Should have thrown AuraHandledException for null file name');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e.getMessage(),
                    'AuraHandledException should be thrown for null file name');
            }
            Test.stopTest();
        }
    }

    @IsTest
    static void testUploadFile_EmptyFileName() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Account testAccount = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];

            Test.startTest();
            try {
                TucarioFileDownloadController.uploadFile('SGVsbG8=', '', testAccount.Id);
                System.assert(false, 'Should have thrown AuraHandledException for empty file name');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e.getMessage(),
                    'AuraHandledException should be thrown for empty file name');
            }
            Test.stopTest();
        }
    }

    @IsTest
    static void testUploadFile_NullRecordId() {
        User testUser = [SELECT Id FROM User WHERE Alias = 'tuctest' LIMIT 1];

        System.runAs(testUser) {
            Test.startTest();
            try {
                TucarioFileDownloadController.uploadFile('SGVsbG8=', 'test.txt', null);
                System.assert(false, 'Should have thrown AuraHandledException for null record ID');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e.getMessage(),
                    'AuraHandledException should be thrown for null record ID');
            }
            Test.stopTest();
        }
    }
}
