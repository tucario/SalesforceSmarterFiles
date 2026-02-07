// Static labels — File component
import Files_Card_Title from '@salesforce/label/c.Tucario_Files_Card_Title';
import Files_Download_All from '@salesforce/label/c.Tucario_Files_Download_All';
import Files_Preparing_Download from '@salesforce/label/c.Tucario_Files_Preparing_Download';
import Files_Uploading from '@salesforce/label/c.Tucario_Files_Uploading';
import Files_Upload_Label from '@salesforce/label/c.Tucario_Files_Upload_Label';
import Files_Empty_State from '@salesforce/label/c.Tucario_Files_Empty_State';
import Files_No_Archive_Warning from '@salesforce/label/c.Tucario_Files_No_Archive_Warning';
import Files_Upload_Success from '@salesforce/label/c.Tucario_Files_Upload_Success';

// Static labels — File component (row actions)
import Files_Action_Download from '@salesforce/label/c.Tucario_Files_Action_Download';
import Files_Action_Share from '@salesforce/label/c.Tucario_Files_Action_Share';
import Files_Action_Public_Link from '@salesforce/label/c.Tucario_Files_Action_Public_Link';
import Files_Action_View_Details from '@salesforce/label/c.Tucario_Files_Action_View_Details';
import Files_Action_Edit_Details from '@salesforce/label/c.Tucario_Files_Action_Edit_Details';
import Files_Action_Delete from '@salesforce/label/c.Tucario_Files_Action_Delete';
import Files_Action_Remove from '@salesforce/label/c.Tucario_Files_Action_Remove';
import Files_Action_Menu_Alt from '@salesforce/label/c.Tucario_Files_Action_Menu_Alt';
import Files_Delete_Confirm from '@salesforce/label/c.Tucario_Files_Delete_Confirm';
import Files_Remove_Confirm from '@salesforce/label/c.Tucario_Files_Remove_Confirm';
import Files_Delete_Success from '@salesforce/label/c.Tucario_Files_Delete_Success';
import Files_Remove_Success from '@salesforce/label/c.Tucario_Files_Remove_Success';

// Static labels — File component (display limit)
import Files_Show_All from '@salesforce/label/c.Tucario_Files_Show_All';

// Static labels — File component (Apex error labels)
import Files_Error_File_Data_Required from '@salesforce/label/c.Tucario_Files_Error_File_Data_Required';
import Files_Error_File_Name_Required from '@salesforce/label/c.Tucario_Files_Error_File_Name_Required';
import Files_Error_Record_Id_Required from '@salesforce/label/c.Tucario_Files_Error_Record_Id_Required';
import Files_Error_File_Not_Found from '@salesforce/label/c.Tucario_Files_Error_File_Not_Found';

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
import Common_Confirm from '@salesforce/label/c.Tucario_Common_Confirm';
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

    // File component — row actions
    Files_Action_Download,
    Files_Action_Share,
    Files_Action_Public_Link,
    Files_Action_View_Details,
    Files_Action_Edit_Details,
    Files_Action_Delete,
    Files_Action_Remove,
    Files_Action_Menu_Alt,
    Files_Delete_Confirm,
    Files_Remove_Confirm,
    Files_Delete_Success,
    Files_Remove_Success,

    // File component — display limit
    Files_Show_All,

    // File component — Apex error labels
    Files_Error_File_Data_Required,
    Files_Error_File_Name_Required,
    Files_Error_Record_Id_Required,
    Files_Error_File_Not_Found,

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
    Common_Confirm,
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
