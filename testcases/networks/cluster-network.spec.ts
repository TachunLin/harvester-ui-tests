import clusterNetworkPage from '@/pageobjects/clusterNetwork.po';
import { PageUrl } from "@/constants/constants";
import { onlyOn } from "@cypress/skip-test";

const clusterNetwork = new clusterNetworkPage();

let clusterNetworkCreated: boolean = false;

/**
 * 1. Login
 * 2. Navigate to the Networks -> Cluster Network Configuration page
 * 3. Click the `Create a Cluster Network` button
 * 4. Input name `cn`
 * 5. Click the create button
 * 6. Check the `cn` cluster network display on the Cluster Network Configuration list 
 */
describe('Cluster Network Configuration', () => {
  beforeEach(() => {
    cy.login({url: PageUrl.clusterNetwork});
  });
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
   * 7. Click to select the `ens6 (Up)` from the NICs dropdown list
   * 8. Click the create button
   * 9. Check the network config named `nc` exists under the `cn` cluster network panel 
   */
  it('Create network configuration', () => {
    onlyOn(clusterNetworkCreated);

    clusterNetwork.createNetworkConfig('nc', 'ens6 (Up)');

    clusterNetwork.checkNetworkConfig('nc', 'cn');
  });
});
