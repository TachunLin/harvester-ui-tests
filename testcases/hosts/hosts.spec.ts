import { HostsPage } from "@/pageobjects/hosts.po";
import { EditYamlPage } from "@/pageobjects/editYaml.po";
import { HCI } from '@/constants/types'

const hosts = new HostsPage();
const editYaml = new EditYamlPage();

/**
 * 1. Login
 * 2. Navigate to host page
 * 3. Click Edit YAML
 * 4. Insert `harvesterhci.io/host-custom-name: test-custom-name-yaml` in yaml
 * 5. Save
 * 6. Check if the custom name is changed
 * 7. Revert the custom change
*/
describe('should insert custom name into YAML', () => {
  it('should insert custom name into YAML', () => {
    const host = Cypress.env('host')[0];
    const hostName = host.name
    const customName = 'test-custom-name-yaml';

    cy.login();
    hosts.navigateHostsPage();

    // edit yaml
    hosts.editHostsYaml(hostName);
    editYaml.insertCustomName(customName);
    hosts.saveYaml();

    // check if the custom name is changed
    hosts.verifyHostName(customName);

    // Revert the custom change
    hosts.goToEdit(customName);
    cy.reload();
    hosts.cleanValue();
    hosts.update(host.name);
  });
});

/**
 * 1. Login
 * 2. Navigate to host page
 * 3. Click Edit Config
 * 4. Change custom name and console URL
 * 5. Save
 * 6. Check if the custom name is changed and console URL is NOT disabled
 * 7. Revert the custom change
*/
describe('Check edit host', () => {
  it('Check edit host', () => {
    cy.login();

    const host = Cypress.env('host')[0];
    const hostName = host.name
    const customName = 'test-custom-name';
    const consoleUrl = 'https://test-console-url';

    // Perform update
    hosts.editHostBasics(hostName, customName, consoleUrl);
    hosts.verifyHostUpdate(customName);

    // Revert the custom change
    hosts.goToEdit(customName);
    hosts.cleanValue();
    hosts.update(host.name);
  })
})

describe('Check Add disk', () => {
  it.skip('Check Add disk', () => {
    cy.login();
    
    const host = Cypress.env('host')[0];
    const disk = host.disks[0]
    
    cy.visit(`/harvester/c/local/${HCI.HOST}/${host.name}?mode=edit`)

    const diskTab = '#disk > a'
    const addDiskButton = '.button-dropdown'
    const diskOption = '.vs__dropdown-option'
    const removeIcon = '.btn > .icon'

    cy.get(diskTab).click()

    cy.contains(addDiskButton, 'Add Disk').click()
    cy.contains(diskOption, `${disk.devPath}`).click()

    cy.intercept('PUT', `/v1/harvester/${HCI.BLOCK_DEVICE}s/longhorn-system/${disk.name}`).as('updateBD');

    hosts.update(host.name)

    cy.wait('@updateBD').then(res => {
      const spec = res.response?.body?.spec || {}
      expect(spec?.fileSystem?.provisioned, 'Check provisioned').to.equal(true);
    })

    cy.visit(`/harvester/c/local/${HCI.HOST}/${host.name}?mode=edit`)

    cy.get(diskTab).click()
    cy.get(removeIcon).click()

    cy.intercept('PUT', `/v1/harvester/${HCI.BLOCK_DEVICE}s/longhorn-system/${disk.name}`).as('updateBD');

    hosts.update(host.name)

    cy.wait('@updateBD').then(res => {
      const spec = res.response?.body?.spec || {}
      expect(spec?.fileSystem?.provisioned, 'Check provisioned').to.equal(false);
    })
  })
})
