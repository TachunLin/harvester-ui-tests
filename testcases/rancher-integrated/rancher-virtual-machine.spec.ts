import { RancherPageUrl, PageUrl, replaceClusterId, Constants } from "@/constants/constants";
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { VolumePage } from "@/pageobjects/volume.po";
import NamespacePage from "@/pageobjects/namespace.po";
import { ImagePage } from "@/pageobjects/image.po";
import { generateName } from '@/utils/utils';
import { HCI } from '@/constants/types';

const constants = new Constants();

// Use base page objects directly - they now support both standalone and Rancher modes
const vms = new VmsPage();
const volumePO = new VolumePage();


describe('VM Form Validation - Rancher Mode', () => {
  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  /**
   * 1. Login
   * 2. Navigate to the VM create page
   * 3. Input required values
   * 4. Validate the create request
   * 5. Validate the config and yaml should show
  */
  it('Create a vm with all the default values', () => {
    const VM_NAME = generateName('test-vm-create');
    const namespace = 'default'
    const imageEnv = Cypress.env('image');

    const value = {
      name: VM_NAME,
      cpu: '1',
      memory: '1',
      image: Cypress._.toLower(imageEnv.name),
      namespace,
    }

    vms.create(value)

    vms.goToConfigDetail(VM_NAME);

    vms.goToYamlEdit(VM_NAME);

    vms.delete(namespace, VM_NAME)
  });

  /**
   * https://harvester.github.io/tests/manual/virtual-machines/1283-vm-creation-required-fields/
   */
  it('Check VM creation without required-fields', () => {
    vms.goToList();
    vms.goToCreatePage();
    vms.clickFooterBtn();
    cy.get('#cru-errors').contains('"CPU" is required').should('exist');
    cy.get('#cru-errors').contains('"Memory" is required').should('exist');
    vms.setBasics('1', '1');
    vms.clickFooterBtn();
    cy.get('#cru-errors').contains('"Name" is required').should('exist');
    cy.get('#cru-errors').contains('"Image" is required').should('exist');
  })

  /**
   * 1. Create some image and volume
   * 2. Create virtual machine
   * 3. Fill out all mandatory field but leave memory blank.
   * 4. Click create
  */
  it('Create VM without memory provided', () => {
    const VM_NAME = 'test-memory-required';
    const namespace = 'default'

    const imageEnv = Cypress.env('image');

    const value = {
      name: VM_NAME,
      cpu: '2',
      image: Cypress._.toLower(imageEnv.name),
      namespace,
    }

    vms.goToCreate();
    vms.setValue(value);

    vms.clickFooterBtn();

    cy.contains('"Memory" is required').should('exist')
  });
})

describe('VM clone Validation - Rancher Mode', () => {
  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  /**
   * https://harvester.github.io/tests/manual/virtual-machines/create-vm-with-existing-volume/
   */
  it.only('Create VM with existing volume', () => {
    const namespace = 'default'
    const VM_NAME = 'use-existing-volume';

    const volumeValue = {
      name: 'existing-volume',
      size: "10",
      namespace
    };

    vms.deleteVMFromStore(`${namespace}/${VM_NAME}`);
    volumePO.deleteFromStore(`${namespace}/${volumeValue.name}`); // Delete the previously created volume

    volumePO.create(volumeValue); // create volume

    // create VM use existing volume
    vms.goToCreate();

    const imageEnv = Cypress.env('image');

    const volume = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${Cypress._.toLower(imageEnv.name)}`,
      size: 4
    }, {
      buttonText: 'Add Volume',
      size: 5,
      create: true,
    }, {
      buttonText: 'Add Existing Volume',
      create: true,
      volume: 'existing-volume'
    }];

    vms.setNameNsDescription(VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volume);
    vms.save();

    volumePO.goToList();
    volumePO.checkVMAttached('default', 'existing-volume', 'use-existing-volume');

    vms.deleteVMFromStore(`${namespace}/${VM_NAME}`);
    volumePO.deleteFromStore(`${namespace}/${volumeValue.name}`);
  })
})

