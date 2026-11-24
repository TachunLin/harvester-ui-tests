import clusterNetworkPage from '@/pageobjects/clusterNetwork.po';
import { PageUrl } from "@/constants/constants";
import { onlyOn } from "@cypress/skip-test";

const clusterNetwork = new clusterNetworkPage();

let clusterNetworkCreated: boolean = false;

beforeEach(() => {
    cy.login({url: PageUrl.clusterNetwork});
});

after(() => {
    cy.login();
    clusterNetwork.deleteFromStore('nc', 'network.harvesterhci.io.vlanconfig');
    clusterNetwork.deleteFromStore('cn');
});

/**
 * 1. Login
 * 2. Navigate to the Networks -> Cluster Network Configuration page
 * 3. Click the `Create a Cluster Network` button
 * 4. Input name `cn`
 * 5. Click the create button
 * 6. Check the `cn` cluster network display on the Cluster Network Configuration list 
 */
describe('Cluster Network Configuration', () => {
  it('Create cluster network', () => {

    clusterNetwork.createClusterNetwork('cn');

    clusterNetwork.checkClusterNetwork('cn');

    clusterNetworkCreated = true;
  });

  /**
   * Depends on previous test creating cluster network 'cn'
   * 1. Login
   * 2. Navigate to the Networks -> Cluster Network Configuration page
   * 3. Check the cluster network `cn` exists from previous test result
   * 4. Click the `Create Network Config` button
   * 5. Input the Name `nc` of the Network Config
   * 6. Click the Uplink tab
   * 7. Select the NIC from vlans[0].nic in cypress.env.json (e.g. "eno50")
   * 8. Click the create button
   * 9. Check the network config named `nc` exists under the `cn` cluster network panel 
   */
  it('Create network configuration', () => {
    onlyOn(clusterNetworkCreated);

    // Read the NIC name from env vlans[0] instead of hardcoding it.
    // selectNIC uses partial text match so it works regardless of the
    // live status suffix the UI appends (e.g. "eno50 (Up)").
    const nic = Cypress.env('networks')?.nic;

    clusterNetwork.createNetworkConfig('nc', nic);

    clusterNetwork.checkNetworkConfig('nc', 'cn');
  });
});
