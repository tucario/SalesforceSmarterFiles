// Static labels — File component
import Files_Card_Title from '@salesforce/label/c.Tucario_Files_Card_Title';
import Files_Download_All from '@salesforce/label/c.Tucario_Files_Download_All';
import Files_Preparing_Download from '@salesforce/label/c.Tucario_Files_Preparing_Download';
import Files_Uploading from '@salesforce/label/c.Tucario_Files_Uploading';
import Files_Upload_Label from '@salesforce/label/c.Tucario_Files_Upload_Label';
import Files_Empty_State from '@salesforce/label/c.Tucario_Files_Empty_State';
import Files_No_Archive_Warning from '@salesforce/label/c.Tucario_Files_No_Archive_Warning';
import Files_Upload_Success from '@salesforce/label/c.Tucario_Files_Upload_Success';

// Dynamic labels — File component
import Files_Zip_Library_Error from '@salesforce/label/c.Tucario_Files_Zip_Library_Error';
import Files_Download_Warnings from '@salesforce/label/c.Tucario_Files_Download_Warnings';
import Files_Download_Success from '@salesforce/label/c.Tucario_Files_Download_Success';
import Files_Zip_Create_Error from '@salesforce/label/c.Tucario_Files_Zip_Create_Error';
import Files_Upload_Multi_Success from '@salesforce/label/c.Tucario_Files_Upload_Multi_Success';
import Files_Upload_Blocked_Single from '@salesforce/label/c.Tucario_Files_Upload_Blocked_Single';
import Files_Upload_Blocked_Multiple from '@salesforce/label/c.Tucario_Files_Upload_Blocked_Multiple';
import Files_Upload_Failed from '@salesforce/label/c.Tucario_Files_Upload_Failed';

// Common labels
import Common_Error from '@salesforce/label/c.Tucario_Common_Error';
import Common_Success from '@salesforce/label/c.Tucario_Common_Success';
import Common_Warning from '@salesforce/label/c.Tucario_Common_Warning';
import Common_Upload_Blocked from '@salesforce/label/c.Tucario_Common_Upload_Blocked';
import Common_Download_Warnings from '@salesforce/label/c.Tucario_Common_Download_Warnings';
import Common_Upload_Errors from '@salesforce/label/c.Tucario_Common_Upload_Errors';
import Common_Unknown_Error from '@salesforce/label/c.Tucario_Common_Unknown_Error';

const LABELS = {
    // File component — static
    Files_Card_Title,
    Files_Download_All,
    Files_Preparing_Download,
    Files_Uploading,
    Files_Upload_Label,
    Files_Empty_State,
    Files_No_Archive_Warning,
    Files_Upload_Success,

    // File component — dynamic
    Files_Zip_Library_Error,
    Files_Download_Warnings,
    Files_Download_Success,
    Files_Zip_Create_Error,
    Files_Upload_Multi_Success,
    Files_Upload_Blocked_Single,
    Files_Upload_Blocked_Multiple,
    Files_Upload_Failed,

    // Common
    Common_Error,
    Common_Success,
    Common_Warning,
    Common_Upload_Blocked,
    Common_Download_Warnings,
    Common_Upload_Errors,
    Common_Unknown_Error
};

function formatLabel(label, ...args) {
    return label.replace(/\{(\d+)\}/g, (match, index) => {
        return args[index] !== undefined ? args[index] : match;
    });
}

export { LABELS, formatLabel };
