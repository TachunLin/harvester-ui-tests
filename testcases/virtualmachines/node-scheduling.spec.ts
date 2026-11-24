import { VmsPage } from "@/pageobjects/virtualmachine.po";

import { generateName } from '@/utils/utils';
import { Constants } from "@/constants/constants";

const vmPO = new VmsPage();
const constants = new Constants();

let hostNodes: Array<{ name: string }> = [];

before(() => {
  cy.login();
  cy.request({
    method: 'GET',
    url: '/v1/harvester/nodes',
    headers: { Accept: 'application/json' },
  }).then((resp: Cypress.Response<any>) => {
    const nodeList: any[] = resp.body?.data ?? resp.body?.items ?? [];
    hostNodes = nodeList.map((node: any) => ({ name: node.id ?? node.metadata?.name }));
  });
});

describe('Stop VM Negative', () => {
  it('Stop VM Negative', function() {
    if (hostNodes.length < 2) return this.skip();

    cy.login();

    const VM_NAME = generateName('test-vm-scheduling');
    const namespace = 'default'
    const nodeName = hostNodes[0].name;
    const imageEnv = Cypress.env('image');

    const volume = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${Cypress._.toLower(imageEnv.name)}`,
      size: 4
    }];

    // Create VM
    vmPO.goToCreate();
    vmPO.setNameNsDescription(VM_NAME, namespace);
    vmPO.setBasics('1', '1');
    vmPO.setVolumes(volume);
    vmPO.setNodeScheduling({
      radio: 'specific',
      nodeName
    });
    vmPO.save();

    // Validate VM is Running
    vmPO.censorInColumn(VM_NAME, 3, namespace, 4, 'Running', 2, {
      nameSelector: '.name-console a',
      timeout: constants.timeout.uploadTimeout,
    });

    // Stop VM and validate status is Off
    vmPO.clickAction(VM_NAME, 'Stop');
    cy.reload();
    vmPO.censorInColumn(VM_NAME, 3, namespace, 4, 'Off', 2, {
        nameSelector: '.name-console a',
        timeout: constants.timeout.uploadTimeout,
    });

    // Clean up
    vmPO.deleteVMFromStore(`${namespace}/${VM_NAME}`);
  })
})
