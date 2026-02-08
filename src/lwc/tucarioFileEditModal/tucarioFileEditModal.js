import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import { LABELS } from 'c/tucarioLabels';

export default class TucarioFileEditModal extends LightningModal {
    @api contentDocumentId;

    get labels() {
        return LABELS;
    }

    handleSuccess() {
        this.close('success');
    }

    handleCancel() {
        this.close();
    }

    handleSave() {
        this.template.querySelector('lightning-record-edit-form').submit();
    }
}
