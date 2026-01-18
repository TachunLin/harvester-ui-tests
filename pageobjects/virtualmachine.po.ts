import { Constants } from "@/constants/constants";
import { HCI } from '@/constants/types';
import LabeledSelectPo from '@/utils/components/labeled-select.po';
import LabeledInputPo from '@/utils/components/labeled-input.po';
import LabeledTextAreaPo from '@/utils/components/labeled-textarea.po';
import RadioButtonPo from '@/utils/components/radio-button.po';
import CheckboxPo from '@/utils/components/checkbox.po';
import { ImagePage } from "@/pageobjects/image.po";
import CruResourcePo from '@/utils/components/cru-resource.po';
import YamlEditorPo from '@/utils/components/yaml-editor.po';

const constants = new Constants();
const image = new ImagePage();

interface Network {
  network?: string,
}

interface ValueInterface {
  namespace?: string,
  name?: string,
  description?: string,
  cpu?: string,
  memory?: string,
  image?: string,
  networks?: Array<Network>,
  createRunning?: boolean,
  usbTablet?: boolean,
  efiEnabled?: boolean,
  userData?: string,
  networkData?: string,
}

interface Volume {
  buttonText: string,
  create?: boolean,
  [index: string]: any
}

export class VmsPage extends CruResourcePo {
  constructor() {
    super({
      type: HCI.VM
    });
  }

  setBasics(cpu?: string, memory?: string, ssh?: { id?: string, createNew?: boolean, value?: string }) {
    this.clickTab('basics');
    this.cpu().input(cpu);
    this.memory().input(memory);

    if (ssh && ssh.id) {
      new LabeledSelectPo('.labeled-select', `:contains("SSHKey")`).select({ option: ssh.id });
    } else if (ssh && ssh.createNew) {
      new LabeledSelectPo('.labeled-select', `:contains("SSHKey")`).select({ option: 'Create a New...' });
      new LabeledTextAreaPo('.v--modal-box .card-container .labeled-input', `:contains("SSH-Key")`).input(ssh.value, {
        delay: 0,
      });

      cy.get('.v--modal-box .card-container').contains('Create').click();
    }
  }

  setVolumes(volumes: Array<Volume>) {
    this.clickTab('Volume');
    cy.wrap('async').then(() => {
      volumes.map((volume) => {
        if (volume.create) {
          cy.get('.tab-container button').contains(volume.buttonText).click()
        }
      });

      volumes.map((volume, index) => {
        let imageEl: any;
        let volumeEl: any;
        cy.get('.info-box').eq(index).within(() => {
          if (volume.image) {
            imageEl = new LabeledSelectPo('.labeled-select', `:contains("Image")`);
          }

          if (volume.size) {
            new LabeledInputPo('.labeled-input', `:contains("Size")`).input(volume.size);
          }

          if (volume.volume) {
            volumeEl = new LabeledSelectPo('.labeled-select', `:contains("Volume")`);
          }
        }).then(() => {
          if (imageEl) {
            imageEl.select({ option: volume.image });
          }

          if (volumeEl) {
            volumeEl.select({ option: volume.volume });
          }
        })
      })
    })
  }

  selectSchedulingType({ type = 'any' }: { type: string }) {
    const map: any = {
      any: 'Run virtual machine on any available node',
      specific: 'Run virtual machine on specific node - (Live migration is not supported)',
      rules: 'Run virtual machine on node(s) matching scheduling rules'
    }

    this.clickTab('nodeScheduling');

    cy.get('.tab-container section#nodeScheduling').within(() => {
      const scheduling = new RadioButtonPo('.radio-group');

      scheduling.input(map[type]);
    })
  }

  checkSpecificNodes({ includeNodes = [], excludeNodes = [] }: { includeNodes: Array<string>, excludeNodes?: Array<string> }) {
    this.specificNode().self().click();
    includeNodes.forEach((node) => cy.get('.vs__dropdown-menu').should('contain', node));
    excludeNodes.forEach((node) => cy.get('.vs__dropdown-menu').should('not.contain', node));
  }

  setAdvancedOption(option: { [index: string]: any }) {
    this.clickTab('advanced');

    if (option.runStrategy) {
      new LabeledSelectPo('.labeled-select', `:contains("Run Strategy")`).select({ option: option.runStrategy });
    }

    if ([true, false].includes(option.efiEnabled)) {
      this.efiEnabled().check(option.efiEnabled)
    }

    if (option.userData) {
      this.userData().input(option?.userData)
    }

    if (option.networkData) {
      this.networkData().input(option?.networkData)
    }
  }

  checkVMState(name: string, state: string = 'Running', namespace: string = 'default') {
    this.goToList();
    this.censorInColumn(name, 3, namespace, 4, state, 2, { timeout: constants.timeout.provisionTimeout, nameSelector: '.name-console a' });
  }

  clickCloneAction(name: string) {
    this.clickAction(name, 'Clone');
    new CheckboxPo('.v--modal-box .checkbox-container', `:contains("clone volume data")`).check(false);
    cy.get('.v--modal-box button').contains('Clone').click();
  }

  clickVMSnapshotAction(name: string, snapshotName: string) {
    this.clickAction(name, 'Take Virtual Machine Snapshot');
    cy.get('.modal-container .card-title').find('h4').contains('Take Virtual Machine Snapshot');

    new LabeledInputPo('.modal-container .labeled-input', `:contains("Name *")`).input(snapshotName)
    cy.get('.modal-container button').contains('Create').click();
    cy.get('.growl-container .growl-list').find('.growl-text div').contains('Succeed');
  }


  clickVMBackupAction(name: string, backupName: string) {
    this.clickAction(name, 'Take Backup');
    cy.get('.modal-container .card-title').find('h4').contains('Add Backup');

    new LabeledInputPo('.modal-container .labeled-input', `:contains("Name")`).input(backupName)
    cy.get('.modal-container button').contains('Create').click();
    cy.get('.growl-container .growl-list').find('.growl-text div').contains('Succeed');
  }

  clickMigrateAction(name: string, targetNode: string) {
    this.clickAction(name, 'Migrate');
    cy.get('[data-testid="card-title-slot"]').contains('Migration');

    const nodeNameSelector = new LabeledSelectPo('.labeled-select', `:contains("Target Node")`)
    nodeNameSelector.select({ option: targetNode, selector: '.vs__dropdown-menu' });

    cy.get('.modal-container button').contains('Apply').click();
  }

  public setValue(value: ValueInterface) {
    this.namespace().select({ option: value?.namespace })
    this.name().input(value?.name)
    this.description().input(value?.description)
    this.cpu().input(value?.cpu)
    this.memory().input(value?.memory)
    cy.get('.tab#Volume').click()
    this.image().select({ option: value?.image })
    this.networks(value?.networks)
    cy.get('.tab#advanced').click()
    this.usbTablet().check(value?.usbTablet)
    this.efiEnabled().check(value?.efiEnabled)
    this.userData().input(value?.userData)
    this.networkData().input(value?.networkData)
  }

  public save({
    edit = false,
  } = {}) {
    if (edit) {
      cy.intercept('PUT', '**/v1/harvester/kubevirt.io.virtualmachines/*/*').as('createVM');
      cy.get('.cru-resource-footer').contains('Save').click()
      cy.get('.card-actions').contains('Save and Restart').click()
    } else {
      cy.intercept('POST', '**/v1/harvester/kubevirt.io.virtualmachines/*').as('createVM');
      cy.get('.cru-resource-footer').contains('Create').click()
    }

    cy.wait('@createVM').then(res => {
      expect(res.response?.statusCode).to.be.oneOf([201, 200]);
    })
  }

  public cpu() {
    return new LabeledInputPo('.labeled-input', `:contains("CPU")`)
  }

  public memory() {
    return new LabeledInputPo('.labeled-input', `:contains("Memory")`)
  }

  public image() {
    return new LabeledSelectPo('.labeled-select', `:contains("Image")`)
  }

  deleteVMFromStore(id: string) {
    this.deleteFromStore(id); // Delete the previously created vm
    this.deleteFromStore(id, HCI.VMI); // You need to wait for the vmi to be deleted as well, because it will not be deleted until the vm is deleted
  }

  /**
   * Get the count of all VMs in the store
   * @returns Cypress chainable that resolves to the number of VMs
   */
  getVmCount() {
    return cy.window().then((win) => {
      const vmList = (win as any).$nuxt.$store.getters['harvester/all'](HCI.VM);
      return vmList ? vmList.length : 0;
    });
  }

  /**
   * Bulk delete all VMs in the current view using the UI
   * This method performs the following steps:
   * 1. Selects all VMs using the table header checkbox
   * 2. Clicks the bulk Delete button
   * 3. Checks the "Delete All" checkbox in the confirmation dialog
   * 4. Confirms the deletion
   */
  bulkDeleteAll() {
    // Step 1: Select all VMs using the table header checkbox
    this.selectAllRows();
    cy.log('Selected all VMs');

    // Step 2: Wait for and click the bulk Delete button
    cy.get('#promptRemove').should('not.be.disabled').click();
    cy.log('Clicked Delete button');

    // Step 3: Check "Delete All" checkbox in confirmation dialog
    cy.get('.checkbox-container').contains('Delete All').parent().find('input[type="checkbox"]').click({ force: true });
    cy.log('Checked Delete All option');

    // Step 4: Click final Delete confirmation button
    cy.intercept('DELETE', '**/v1/harvester/kubevirt.io.virtualmachines/**').as('deleteVMs');
    cy.get('[data-testid="prompt-remove-confirm-button"]').contains('Delete').click();
    cy.log('Confirmed deletion');
  }

  deleteVMFromUI(namespace: string, name: string) {
    this.goToList();
    this.clickAction(name, 'Delete');
    cy.get('[data-testid="card"]').get('[type="checkbox"]').each(($checkbox) => {
      if (!$checkbox.is(':checked')) {
        $checkbox.click();
      }
    });

    cy.get('[data-testid="prompt-remove-confirm-button"]').contains('Delete').click();
  }

  network() {
    return new LabeledSelectPo('section .labeled-select.hoverable', `:contains("Network")`)
  }

  rootDisk() {
    return cy.get(this.confirmRemove).find('.checkbox-container span[role="checkbox"].checkbox-custom');
  }

  template() {
    return new LabeledSelectPo(cy.get('.labeled-select').contains('Template').eq(0));
  }

  version() {
    return new LabeledSelectPo(cy.get('.labeled-select').contains('Version'));
  }

  multipleInstance() {
    return new RadioButtonPo('.radio-group', ':contains("Multiple Instance")')
  }

  namePrefix() {
    return new LabeledInputPo('.labeled-input', `:contains("Name Prefix")`)
  }

  count() {
    return new LabeledInputPo('.labeled-input', `:contains("Count")`)
  }

  plugVolumeCustomName() {
    return new LabeledInputPo('.labeled-input', `:contains("Name")`);
  }

  plugVolumeName() {
    return new LabeledSelectPo('.labeled-select', `:contains("Volume")`);
  }

  specificNode() {
    return new LabeledSelectPo('.labeled-select', `:contains("Node Name")`);
  }

  networks(networks: Array<Network> = []) {
    if (networks.length === 0) {
      return
    } else {
      cy.get('.tab#Network').click()

      cy.get('[data-testid="input-hen-networkName"]').then(elms => {
        if (elms?.length < networks?.length) {
          for (let i = 0; i < networks?.length - elms?.length; i++) {
            cy.contains('Add Network').click()
          }
        }

        networks.map((n, idx) => {
          this.network().select({ option: n?.network, index: idx })
        })
      })
    }
  }

  goToConfigDetail(name: string) {
    this.goToList();
    cy.get('.search').type(name)
    const vm = cy.contains(name)
    expect(vm.should('be.visible'))
    vm.click()

    const config = cy.get('[data-testid="show-configuration-cta"]').contains('Show Configuration')
    expect(config.should('be.visible'));
    config.click()
  }

  public openDetailPanel(name: string) {
    this.goToList();
    cy.get('.search').type(name);

    const vm = cy.contains('.name-console a', name);
    expect(vm.should('be.visible'));
    vm.click();
  }

  public clickMigrationTab() {
    cy.get('[data-testid="btn-migration"]').click();
  }

  public readDetailLabelValue(label: string): Cypress.Chainable<string> {
    return cy.contains('.label .text-label', label)
      .parent()
      .find('.value')
      .invoke('text')
      .then((text) => text.trim());
  }

  /**
   * Check if the node value from an alias matches the expected detail label value
   * @param nodeName - The Cypress alias (e.g., '@sourceNode', '@targetNode')
   * @param labelValue - The label text to read from the detail panel (e.g., 'Source Node', 'Target Node')
   */
  public checkNode(nodeName: string, labelValue: string) {
    cy.get(nodeName).then((node) => {
      const expectedNode = String(node).trim();

      this.readDetailLabelValue(labelValue).then((nodeDetailValue) => {
        const detailNode = nodeDetailValue.replace(/\s+/g, ' ').trim();
        expect(detailNode).to.eq(expectedNode);
      });
    });
  }

  /**
   * Verify that a VM has successfully migrated to a target node
   * Checks that the VM is now running on the target node and not on the original node
   * @param vmName - The name of the virtual machine
   * @param targetNodeName - The target node where the VM should have migrated
   * @param originalNode - The original node where the VM was running
   */
  public verifyMigrationSuccess(vmName: string, targetNodeName: string, originalNode: string) {
    cy.contains('tr', vmName)
      .find('td')
      .eq(7)
      .invoke('text')
      .then((newNodeName) => {
        const currentNode = newNodeName.trim();
        expect(currentNode).to.equal(targetNodeName);
        expect(currentNode).to.not.equal(originalNode);
        cy.log(`Migration successful: ${originalNode} → ${currentNode}`);
      });
  }

  goToYamlEdit(name: string) {
    this.goToList();

    this.clickAction(name, 'Edit YAML')
  }

  /**
   * Click the Config tab in the configuration panel
   */
  public clickConfigTab() {
    cy.get('[data-testid="btn-config-tab"]').click();
  }

  /**
   * Click the YAML tab in the configuration panel
   */
  public clickYamlTab() {
    cy.get('[data-testid="btn-yaml-tab"]').click();
  }

  /**
   * Click the Close button in the configuration panel
   */
  public clickCloseConfigPanel() {
    cy.get('.footer .btn.role-secondary').contains('Close').click();
  }

  /**
   * Click the Edit Config button in the configuration panel
   */
  public clickEditConfig() {
    cy.get('.footer .btn.role-primary').contains('Edit Config').click();
  }

  /**
   * Click the Edit YAML button in the configuration panel (when on YAML tab)
   */
  public clickEditYaml() {
    cy.get('.footer .btn.role-primary').contains('Edit YAML').click();
  }

  /**
   * Close the YAML panel by clicking the Close button
   */
  public closeYamlPanel() {
    cy.get('.footer .btn.role-secondary').contains('Close').click();
  }

  public init() {
    cy.intercept('GET', `v1/harvester/${HCI.IMAGE}s*`).as('imageList');
    image.goToList();

    cy.wait('@imageList').should((res: any) => {
      expect(res.response?.statusCode, 'Check Image list').to.equal(200);
      const images = res?.response?.body?.data || []

      const imageEnv = Cypress.env('image');

      const name = Cypress._.toLower(imageEnv.name)
      const url = imageEnv.url
      const imageFound = images.find((i: any) => i?.spec?.displayName === name)

      if (imageFound) {
        return
      } else {
        const namespace = 'default';

        image.goToCreate();
        image.setNameNsDescription(name, namespace);
        image.setBasics({ url });
        image.save();
        image.checkState({ name, namespace });
      }
    })
  }

  public checkState({ name = '', namespace = 'default', state = 'Running' }: { name?: string, namespace?: string, state?: string }) {
    this.censorInColumn(name, 3, namespace, 4, state, 2, { timeout: constants.timeout.maxTimeout, nameSelector: '.name-console a' });
  }

  public goToEdit(name: string) {
    this.goToList()
    cy.get('.search').type(name)
    const vm = cy.contains(name)
    expect(vm.should('be.visible'))
    vm.parentsUntil('tbody', 'tr').find('.icon-actions').click()

    cy.get('.dropdownTarget').contains('Edit Config').click()
  }

  public edit(name: string, value: ValueInterface) {
    this.init()
    this.goToEdit(name);
    this.setValue(value);
    this.save({ edit: true });
  }

  public delete(namespace: string, name: string, displayName?: string, { removeRootDisk, id }: { removeRootDisk?: boolean, id?: string } = { removeRootDisk: true }) {
    cy.then(() => {
      const clusterId = Cypress.config('clusterId') || Cypress.env('clusterId') || 'local';
      cy.visit(`/harvester/c/${clusterId}/${this.type}`)

      this.clickAction(name, 'Delete').then((_) => {
        if (!removeRootDisk) {
          this.rootDisk().click();
        }
      })

      cy.intercept('DELETE', `**/v1/harvester/${this.realType}s/${namespace}/${name}*`).as('delete');
      cy.get(this.confirmRemove).contains('Delete').click();
      cy.wait('@delete').then(res => {
        cy.window().then((win) => {
          const id = `${namespace}/${name}`;
          super.checkDelete(this.type, id, 240)
          expect(res.response?.statusCode, `Delete ${this.type}`).to.be.oneOf([200, 204]);
        })
      })
    });
  }

  public plugVolume(vmName: string, volumeNames: Array<string>, namespace: string) {
    this.goToList();
    cy.wait(2000);
    cy.wrap(volumeNames).each((V: string) => {
      // reload the page before plugging a new volume
      cy.wait(5000);
      cy.reload()
      this.clickAction(vmName, 'Add Volume').then((_) => {
        cy.get('.modal-container .card-container').within(() => {
          this.plugVolumeCustomName().input(V);
        })
        this.plugVolumeName().select({ option: V });
      })
      cy.intercept('POST', `/v1/harvester/${this.realType}s/${namespace}/${vmName}*`).as('plug');
      cy.get('.modal-container .card-container').contains('Apply').click();
      cy.wait('@plug').then(res => {
        expect(res.response?.statusCode, `${this.type} plug Volume`).to.be.oneOf([200, 204]);
        this.searchClear();
      })
    })
  }

  public unplugVolume(vmName: string, volumeIndexArray: Array<number>, namespace: string) {
    this.goToList();
    cy.get('.search').type(vmName)
    const vm = cy.contains(vmName)
    expect(vm.should('be.visible'))
    vm.click()
    // Click the volume tab
    cy.get('[data-testid="disks"]').click();

    cy.wrap(volumeIndexArray).each((index: number) => {
      cy.wait(2000);
      cy.get('.info-box').eq(index).contains('Detach Volume').click();
      cy.intercept('POST', `/v1/harvester/${this.realType}s/${namespace}/${vmName}*`).as('unplug');
      cy.get('.modal-container .card-container').contains('Detach').click();
      cy.wait('@unplug').then(res => {
        expect(res.response?.statusCode, `${this.type} unplug Volume`).to.be.oneOf([200, 204]);
      })
    })
  }

  usbTablet() {
    return new CheckboxPo('.checkbox-container', `:contains("Enable USB Tablet")`)
  }

  guestAgent() {
    return new CheckboxPo('.checkbox-container', `:contains("Install guest agent")`)
  }

  efiEnabled() {
    return new CheckboxPo('.checkbox-container', `:contains("Booting in EFI mode")`)
  }

  userData() {
    const selector = cy.contains('User Data').parent().find('.CodeMirror')

    return new YamlEditorPo(selector)
  }

  networkData() {
    const selector = cy.contains('Network Data').parent().find('.CodeMirror')

    return new YamlEditorPo(selector)
  }

  public selectTemplateAndVersion({ name, namespace, id, version }: {
    name?: string,
    namespace?: string,
    id?: string,
    version?: string,
  }) {
    cy.contains('Use the virtual machine template').click()
    this.template().select({ option: id || `${namespace}/${name}` })
    this.version().select({
      option: version,
      selector: '.vs__dropdown-menu',
    })
  }

  public sshWithCommand(
    vmName: string,
    username: string,
    password: string,
    remoteCommand: string,
    checkResult: boolean = true,
    expectedResult?: string,
    timeout: number = constants.timeout.uploadTimeout
  ) {
    // Wait for IP address to be available in the table
    this.censorInColumn(vmName, 3, 'default', 4, '.', 7, {
      timeout,
      nameSelector: '.name-console a'
    });

    // Get IP address and execute SSH command
    cy.contains('tr', vmName)
      .find('[data-title="IP Address"] > div > span > .copy-to-clipboard-text')
      .then($els => {
        const address = $els[0]?.innerText;

        // Use Cypress's built-in retry mechanism with should()
        cy.wrap(null).should(() => {
          cy.task('sshWithPassword', {
            username,
            password,
            host: address,
            remoteCommand,
          })
          .then((result: any) => {
            cy.log(`SSH result: ${JSON.stringify(result)}`);

            if (checkResult) {
              // Validate that expectedResult is provided when checkResult is true
              if (!expectedResult) {
                throw new Error('expectedResult must be provided when checkResult is true');
              }
              expect(result.stdout).to.include(expectedResult);
            }
            // If checkResult is false, just log the result and continue
          });
        });
      });
  }

  selectMultipleInstance() {
    this.multipleInstance().input('Multiple Instance')
  }

  setMultipleInstance({ namePrefix, count }: {
    namePrefix?: string,
    count?: string,
  }) {
    this.selectMultipleInstance()
    this.namePrefix().input(namePrefix)
    this.count().input(count)
  }

  setNodeScheduling({
    radio, nodeName, selector
  }: {
    radio?: 'any' | 'specific' | 'rules',
    nodeName?: string,
    selector?: any,
  }) {
    this.clickTab('nodeScheduling');

    const rulesRadio = new RadioButtonPo('.radio-group', ':contains("Run virtual machine on node(s) matching scheduling rules")')
    const specificRadio = new RadioButtonPo('.radio-group', ':contains("Run virtual machine on specific node - (Live migration is not supported)")')
    const nodeNameSelector = new LabeledSelectPo('.labeled-select', `:contains("Node Name")`)

    switch (radio) {
      case 'rules':
        rulesRadio.input('Run virtual machine on node(s) matching scheduling rules')
        break;
      case 'specific':
        specificRadio.input('Run virtual machine on specific node - (Live migration is not supported)')

        nodeNameSelector.select({
          selector: '.vs__dropdown-menu',
          option: nodeName,
        })
        break;
    }
  }
}
