import LabeledInputPo from '@/utils/components/labeled-input.po';
import LabeledSelectPo from '@/utils/components/labeled-select.po';
import { HCI } from '@/constants/types'
import CruResourcePo from '@/utils/components/cru-resource.po';

export default class VMSnapshot extends CruResourcePo {
  constructor() {
    super({
      type: 'harvesterhci.io.vmsnapshot',
      realType: HCI.BACKUP,
    });
  }

  checkState(name:  string, state: string = 'Ready', namespace: string = 'default') {
    this.censorInColumn(name, 3, namespace, 4, state, 2);
  }

  restoreNew(name: string) {
    this.clickAction(name, 'Restore New');
    new LabeledSelectPo('.labeled-select', `:contains("Namespace")`).isDisabled();
    new LabeledInputPo('.labeled-input', `:contains("Virtual Machine Name ")`).input('create-new-from-snapshot');
    this.clickFooterBtn('Create');
  }

  restoreExistingVM(name: string) {
    this.clickAction(name, 'Replace Existing');
    new LabeledSelectPo('.labeled-select', `:contains("Namespace")`).isDisabled();
    new LabeledInputPo('.labeled-input', `:contains("Virtual Machine Name")`).isDisabled();
    new LabeledSelectPo('.labeled-select', `:contains("Snapshot")`).self().contains(name);
    this.clickFooterBtn('Create');
  }

  clickFooterBtn(text: string = 'Create') {
    cy.get('.footer .buttons').find('.btn').contains(text).click();
  }

  /**
   * Bulk delete all VM snapshots in the current view using the UI
   * This method performs the following steps:
   * 1. Selects all VM snapshots using the table header checkbox
   * 2. Clicks the bulk Delete button
   * 3. Confirms the deletion
   */
  bulkDeleteAll() {
    // Step 1: Select all VM snapshots using the table header checkbox
    this.selectAllRows();
    cy.log('Selected all VM snapshots');

    // Step 2: Wait for and click the bulk Delete button
    cy.get('#promptRemove').should('not.be.disabled').click();
    cy.log('Clicked Delete button');

    // Step 3: Click final Delete confirmation button
    cy.intercept('DELETE', '**/v1/harvester/harvesterhci.io.virtualmachinebackups/**').as('deleteVmSnapshots');
    cy.get('[data-testid="prompt-remove-confirm-button"]').contains('Delete').click();
    cy.log('Confirmed deletion');
  }
}
