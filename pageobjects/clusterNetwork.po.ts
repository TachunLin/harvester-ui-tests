import { Constants } from '@/constants/constants'
import LabeledInputPo from '@/utils/components/labeled-input.po';
import LabeledSelectPo from '@/utils/components/labeled-select.po';
import CruResource from '@/utils/components/cru-resource.po';
import { HCI } from '@/constants/types'
const constants = new Constants();

export default class clusterNetworkPage extends CruResource {
    private detailPageHead = 'main .outlet header h1 a';

    constructor() {
        super({ type: HCI.CLUSTER_NETWORK })
    }


    NICs() {
        return new LabeledSelectPo('[data-testid="array-list-box0"]')
    }

    /**
     * Create a cluster network with the given name.
     * If no name is provided, defaults to 'cn'.
     * This wraps the common create flow used in tests.
     */
    public createClusterNetwork(name: string = 'cn') {
        this.goToCreate();
        this.name().input(name);
        this.save();
    }

    /**
     * Go to the setting edit page. Then it checks the URL
     */
    public clickMenu(name: string, actionText: string, urlSuffix: string, type: string) {
        const editPageUrl = type || constants.settingsUrl;
        cy.get(`.advanced-setting #${name} button`).click()

        cy.get('span').contains(actionText).click();

        cy.get(this.detailPageHead).then(() => {
                cy.url().should('eq', `${this.basePath()}${editPageUrl}/${urlSuffix}?mode=edit`)
        })
    }

    /**
     * Navigate to the Cluster Network list and assert the given name is visible.
     * @param name - resource name to look for in the table
     * @param timeout - optional timeout in ms (defaults to constants.timeout.maxTimeout)
     */
    public checkClusterNetwork(name: string, timeout: number = constants.timeout.maxTimeout) {
        this.goToList();
        cy.get('table').contains('td', name, { timeout }).should('be.visible');
    }

    /**
     * Create a network configuration under a cluster network.
     * @param name - network configuration name
     * @param nicName - NIC name to select for the uplink
     * @param clusterNetworkName - if provided, scopes the click to that cluster network's row
     *   (the list can have multiple "Create Network Configuration" links, one per cluster network)
     */
    public createNetworkConfig(name: string, nicName: string, clusterNetworkName?: string) {
        this.goToList();
        this.clickCreateNetworkConfigButton(clusterNetworkName);
        this.name().input(name);
        this.clickUplinkTab();
        this.selectNIC(nicName);
        this.clickFooterBtn('save');
    }

    /**
     * Click the "Create Network Configuration" button.
     * Without a name, clicks the first one found on the page (unsafe when multiple cluster networks exist).
     */
    public clickCreateNetworkConfigButton(clusterNetworkName?: string) {
        if (clusterNetworkName) {
            cy.contains('.group-tab', `Cluster Network: ${clusterNetworkName}`)
              .parent('.group-bar')
              .contains('a', 'Create Network Configuration')
              .click();

            return;
        }
        cy.contains('a', 'Create Network Configuration').click();
    }

    /**
     * Click the Uplink tab
     */
    public clickUplinkTab() {
        cy.get('[data-testid="upLink"]').click();
    }

    /**
     * Select a NIC from the dropdown by partial name match.
     * @param nicName - the NIC name or partial name to select (e.g., "eno6")
     */
    public selectNIC(nicName: string) {
        this.NICs().self().click();
        cy.get('.vs__dropdown-menu li').contains(nicName).click();
    }

    /**
     * Check that a network config exists under the specified cluster network panel
     * @param configName The name of the network configuration
     * @param clusterNetworkName The name of the cluster network
     */
    public checkNetworkConfig(configName: string, clusterNetworkName: string) {
        this.goToList();
        cy.contains('.group-tab', `Cluster Network: ${clusterNetworkName}`)
          .parents('tbody.group')
          .find('.main-row')
          .contains('td', configName)
          .should('be.visible');
    }
}
