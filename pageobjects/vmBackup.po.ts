import LabeledInputPo from '@/utils/components/labeled-input.po';
import LabeledSelectPo from '@/utils/components/labeled-select.po';
import { HCI } from '@/constants/types'
import CruResourcePo from '@/utils/components/cru-resource.po';

import { Constants } from "@/constants/constants";
const constants = new Constants();

export default class VMBackup extends CruResourcePo {
  constructor() {
    super({
      type: HCI.BACKUP,
    });
  }

  checkState(name:  string, state: string = 'Ready',  namespace: string = 'default') {
    this.censorInColumn(name, 3, namespace, 4, state, 2, { timeout: constants.timeout.uploadTimeout });
  }

  restoreNew(name: string, newVMName: string, namespace?: string) {
    this.clickAction(name, 'Restore New');
    if (namespace) {
      new LabeledSelectPo('.labeled-select', `:contains("Namespace")`).select({option: namespace});
    }

    new LabeledInputPo('.labeled-input', `:contains("Virtual Machine Name ")`).input(newVMName);
    new LabeledSelectPo('.labeled-select', `:contains("Backup")`).self().contains(name);
    this.clickFooterBtn('Create');
  }

  restoreExistingVM(name: string) {
    this.clickAction(name, 'Replace Existing');
    new LabeledSelectPo('.labeled-select', `:contains("Namespace")`).isDisabled();
    new LabeledInputPo('.labeled-input', `:contains("Virtual Machine Name")`).isDisabled();
    new LabeledSelectPo('.labeled-select', `:contains("Backup")`).self().contains(name);
    this.clickFooterBtn('Create');
  }

  clickFooterBtn(text: string = 'Create') {
    cy.get('.footer .buttons').find('.btn').contains(text).click();
  }

  /**
   * Get the count of all VM backups in the store
   * @returns Cypress chainable that resolves to the number of VM backups
   */
  getVmBackupCount() {
    // Wait for the page to be fully loaded and store to initialize
    return cy.get('.sortable-table', { timeout: constants.timeout.timeout })
      .should('be.visible')
      .wait(1000) // Wait for Vue/Nuxt store to initialize
      .window()
      .then((win) => {
        const nuxt = (win as any).$nuxt;
        if (!nuxt || !nuxt.$store) {
          return 0;
        }
        
        const vmBackupList = nuxt.$store.getters['harvester/all'](HCI.BACKUP);
        return vmBackupList ? vmBackupList.length : 0;
      });
  }

  /**
   * Bulk delete all VM backups in the current view using the UI
   * This method performs the following steps:
   * 1. Selects all VM backups using the table header checkbox
   * 2. Clicks the bulk Delete button
   * 3. Confirms the deletion
   */
  bulkDeleteAll() {
    // Step 1: Select all VM backups using the table header checkbox
    this.selectAllRows();
    cy.log('Selected all VM backups');

    // Step 2: Wait for and click the bulk Delete button
    cy.get('#promptRemove').should('not.be.disabled').click();
    cy.log('Clicked Delete button');

    // Step 3: Click final Delete confirmation button
    cy.intercept('DELETE', '**/v1/harvester/harvesterhci.io.virtualmachinebackups/**').as('deleteVmBackups');
    cy.get('[data-testid="prompt-remove-confirm-button"]').contains('Delete').click();
    cy.log('Confirmed deletion');
  }
}
