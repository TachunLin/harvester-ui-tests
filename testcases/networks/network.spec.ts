import TablePo from "@/utils/components/table.po";
import NetworkPage from "@/pageobjects/network.po";
import clusterNetworkPage from '@/pageobjects/clusterNetwork.po';
import { generateName } from '@/utils/utils';
import { onlyOn } from "@cypress/skip-test";

const network = new NetworkPage();
const table = new TablePo();
const clusterNetworkPo = new clusterNetworkPage();
const clusterNetworkName = `cn-${String(Date.now()).slice(-8)}`;

before(() => {
  const nic = Cypress.env('networks')?.nic;
  cy.login();
  clusterNetworkPo.createClusterNetwork(clusterNetworkName);
  clusterNetworkPo.createNetworkConfig(`${clusterNetworkName}-nc`, nic);
});

interface Vlan {
  name: string,
  namespace: string,
  vlan: number,
  clusterNetwork: string,
}

/**
 * 1. Login
 * 2. Navigate to the network create page
 * 3. click Create button
 * Expected Results
 * 1. create/delete network success
*/
export function CheckCreateNetwork() { }
describe('Check create/delete network', () => {
  it('Check create/delete network', () => {
    cy.login();

    const name = generateName('test-network-create');
    const networksEnv = Cypress.env('networks') || {};

    network.create({
      name,
      namespace: 'default',
      vlan: networksEnv.vlans?.[0],
      clusterNetwork: clusterNetworkName
    })

    table.clickFlatListBtn();

    network.checkVlanState({
      name,
      namespace: 'default',
      state: 'Active',
      routeConnectivity: 'Active',
      vlanID: String(networksEnv.vlans?.[0]),
      clusterNetwork: clusterNetworkName,
    });

    network.delete('default', name)
  });
});

/**
 * 1. Login
 * 2. Navigate to the network create page
 * 3. Input DHCP server IP
 * 4. click Create button
 * Expected Results
 * 1. Create network with DHCP server IP success
*/
export function CheckDHCP() { }
// As per https://github.com/harvester/harvester/issues/11016
// The combination of Auto (DHCP) mode with a manually specified DHCP server IP is not supposed to work.
describe('Check network with DHCP', () => {
  it('Check network with DHCP', () => {
    cy.login();

    cy.intercept('POST', `/v1/harvester/k8s.cni.cncf.io.network-attachment-definitions`).as('create');

    const name = generateName('test-network-create');
    const networksEnv = Cypress.env('networks') || {};
    // const dhcp = networksEnv.dhcpServerIP ?? '172.0.0.1';
    const namespace = 'default'

    network.create({
      name,
      namespace,
      vlan: networksEnv.vlans?.[0],
      clusterNetwork: clusterNetworkName,
      mode: 'Auto (DHCP)',
    })

    cy.wait('@create').then(res => {
      expect(res.response?.statusCode).to.equal(201);
      const route = res.response?.body?.metadata?.annotations['network.harvesterhci.io/route']

    })

    table.clickFlatListBtn();

    network.checkVlanState({
      name,
      namespace,
      state: 'Active',
      routeConnectivity: 'Active',
      vlanID: String(networksEnv.vlans?.[0]),
      clusterNetwork: clusterNetworkName,
    });

    network.deleteFromStore(`${namespace}/${name}`, network.storeType)
  });
});

/**
 * 1. Login
 * 2. Navigate to the network create page
 * 3. Select manual mode
 * 4. Input Cidr and gateway
 * 5. click Create button
 * Expected Results
 * 1. Create network with manual mode success
*/
export function CheckManualMode() { }
describe('Check network with Manual Mode', () => {
  it('Check network with Manual Mode', () => {
    cy.login();

    cy.intercept('POST', `/v1/harvester/k8s.cni.cncf.io.network-attachment-definitions`).as('create');

    const name = generateName('test-network-create');
    const networksEnv = Cypress.env('networks') || {};
    const cidr = networksEnv.cidr ?? '172.0.0.1/24';
    const gateway = networksEnv.gateway ?? '172.0.0.1';
    const namespace = 'default'

    network.create({
      name,
      namespace,
      vlan: networksEnv.vlans?.[0],
      mode: 'Manual',
      clusterNetwork: clusterNetworkName,
      cidr,
      gateway,
    })

    cy.wait('@create').then(res => {
      expect(res.response?.statusCode, 'Check create network').to.equal(201);
      const route = res.response?.body?.metadata?.annotations['network.harvesterhci.io/route']
      if (route) {
        const json = JSON.parse(route)
        expect(json.cidr, 'Check CIDR').to.equal(cidr);
        expect(json.gateway, 'Check gateway').to.equal(gateway);
      }
    })

    table.clickFlatListBtn();

    network.checkVlanState({
      name,
      namespace,
      state: 'Active',
      routeConnectivity: 'Active',
      vlanID: String(networksEnv.vlans?.[0]),
      clusterNetwork: clusterNetworkName,
    });

    network.deleteFromStore(`${namespace}/${name}`, network.storeType)
  });
});


export function CreateVlanPresets() { }
describe('Preset Vlans', () => {
  function createVlan(vlan: Vlan) {
    cy.intercept('POST', `/v1/harvester/k8s.cni.cncf.io.network-attachment-definitions`).as('create');

    const name = vlan.name;
    const namespace = vlan.namespace;
    network.deleteFromStore(`${namespace}/${name}`, network.storeType);
    network.create({
      name,
      namespace,
      vlan: vlan.vlan,
      clusterNetwork: vlan.clusterNetwork,
    })

    table.clickFlatListBtn();

    network.checkVlanState({
      name,
      namespace,
      state: 'Active',
      routeConnectivity: 'Active',
      vlanID: String(vlan.vlan),
      clusterNetwork: vlan.clusterNetwork,
    });
  }

  it('Create first Vlan', () => {
    const networksEnv = Cypress.env('networks') || {};
    const vlan = networksEnv.vlans?.[0] ?? 2011;

    cy.login();

    createVlan({
      name: `vlan${vlan}`,
      namespace: 'default',
      vlan,
      clusterNetwork: clusterNetworkName,
    })
  });

  it('Create second Vlan', () => {
    const networksEnv = Cypress.env('networks') || {};
    // Skip if fewer than 2 vlans are configured
    onlyOn((networksEnv.vlans?.length ?? 0) >= 2);
    const vlan = networksEnv.vlans[1];

    cy.login();

    createVlan({
      name: `vlan${vlan}`,
      namespace: 'default',
      vlan,
      clusterNetwork: clusterNetworkName,
    })
  });

});
