import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { HostsPage } from "@/pageobjects/hosts.po";

const vms = new VmsPage();
const hosts = new HostsPage();

let hostNames: string[] = [];

before(() => {
  cy.login();
  cy.request({
    method: 'GET',
    url: '/v1/harvester/nodes',
    headers: { Accept: 'application/json' },
  }).then((resp: Cypress.Response<any>) => {
    const nodeList: any[] = resp.body?.data ?? resp.body?.items ?? [];
    hostNames = nodeList.map((node: any) => node.id ?? node.metadata?.name);
  });
});

/**
 * https://harvester.github.io/tests/manual/virtual-machines/vm_schedule_on_node/
 */
describe('VM scheduling on Specific node', () => { 
  beforeEach(() => {
    cy.login();
  });

  it('Schedule VM on the Node which is Enable Maintenance Mode', function() {
    if (hostNames.length < 2) return this.skip();

    const maintenanceNodeName = hostNames[0]
    const filterMaintenanceNodeNames = hostNames.filter(name => name !== maintenanceNodeName);

    // Check whether all nodes can be selected
    vms.goToCreate();
    vms.selectSchedulingType({type: 'specific'});
    vms.checkSpecificNodes({includeNodes: hostNames});
    
    hosts.goToList();
    hosts.enableMaintenance(maintenanceNodeName);
    hosts.checkNodeState('Maintenance');

    // Maintenance nodes should not be selected
    vms.goToCreate();
    vms.selectSchedulingType({type: 'specific'});
    vms.checkSpecificNodes({includeNodes: filterMaintenanceNodeNames, excludeNodes: [maintenanceNodeName]});

    hosts.goToList();
    hosts.clickAction(maintenanceNodeName, 'Disable Maintenance Mode');
    hosts.checkNodeState('Active');

    // Check whether all nodes can be selected
    vms.goToCreate();
    vms.selectSchedulingType({type: 'specific'});
    vms.checkSpecificNodes({includeNodes: hostNames});
  })
})

