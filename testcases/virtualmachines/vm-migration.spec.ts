import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { VolumePage } from "@/pageobjects/volume.po";
import NamespacePage from "@/pageobjects/namespace.po";
import { PageUrl } from "@/constants/constants";
import { ImagePage } from "@/pageobjects/image.po";
import VMBackup from '@/pageobjects/vmBackup.po';
import { generateName } from '@/utils/utils';
import { Constants } from "@/constants/constants";
import { onlyOn } from "@cypress/skip-test";

const vms = new VmsPage();
const volumePO = new VolumePage();
const constants = new Constants();
const namespaces = new NamespacePage();
const imagePO = new ImagePage();
const vmBackups = new VMBackup();

const vmNetworkName = `vlan${(Cypress.env('networks') || {})?.vlans?.[0]}`;

let clusterNodeCount = 0;
// Live cluster node names, used to pick a real migration target instead of a static env fixture
let liveNodeNames: string[] = [];

before(function() {
  cy.login();
  cy.request({
    method: 'GET',
    url: '/v1/harvester/nodes',
    headers: { Accept: 'application/json' },
  }).then((resp) => {
    const nodeList: any[] = resp.body?.data ?? resp.body?.items ?? [];
    clusterNodeCount = nodeList.length;
    liveNodeNames = nodeList.map((node: any) => node.id ?? node.metadata?.name);
    if (clusterNodeCount >= 2) {
      // Ensure the largeImage is available before migration tests run
      vms.init();
    }
  });
});

beforeEach(function() {
  if (clusterNodeCount < 2) this.skip();
});

/**
 * @module testcases/virtualmachines/vm-migration.spec.ts
 * @description This module contains test cases for virtual machine migration and related functionalities.
 */
describe('VM Live Migration', () => {
  beforeEach(() => {
    cy.login({ url: PageUrl.virtualMachine });
  });

  /**
   * 1. Navigate to the VM create page
   * 2. Create a new VM with cloud init config data
   * 3. ssh to the vm and create a new file
   * 4. Get the original node name before migration
   * 5. Migrate the VM to another host
   *  - VM should go into migrating status
   * 6. Check can correctly migrate to other node
   * 7. VM migrated should be in running state
   * 8. Click the vm from the virtual machines list
   * 9. Click the Migration tab
   * 10. Check the Source Node and Target Node value is the same with previous restored variables
   * 11. ssh to the vm, check the file content is the same
  **/
  it('Migrate VM with cloud init data', () => {
    const VM_NAME = generateName('test-vm-migrate');
    const NAMESPACE = 'default'
    const largeImageEnv = Cypress.env('largeImage');
    const USERDATA = `#cloud-config
password: password
chpasswd: { expire: False }
sshpwauth: True
`

    const value = {
      name: VM_NAME,
      cpu: '1',
      memory: '2',
      image: largeImageEnv.name,
      networks: [{
        network: vmNetworkName,
      }],
      guestAgent: true,
      namespace: NAMESPACE,
      userData: USERDATA,
    }
    vms.create(value);

    // Navigate to VM list to ensure we're on the correct page
    vms.goToList();

    // Check VM is running
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, { timeout: constants.timeout.maxTimeout, nameSelector: '.name-console a' });
    // Wait for IP address show in table
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, '.', 7, { timeout: constants.timeout.maxTimeout, nameSelector: '.name-console a' });

    // Check VM display IP address and ssh to the VM
    cy.contains('tr', VM_NAME)
      .wait(10000) // Wait for system ssh port ready
      .find('[data-testid="sortable-cell-0-5"] > .ip-list > .ip-item > .copy-to-clipboard-text')
      .then($els => {
        vms.sshWithCommand(
          VM_NAME,
          'opensuse',
          'password',
          'echo "content before migration" > migrate-vm.txt',
          false  // Don't check the output
        );

      })

    // Get the original node name before migration
    cy.contains('tr', VM_NAME)
      .find('td')
      .eq(7) // Node column
      .invoke('text')
      .then((nodeName) => {
        const originalNode = nodeName.trim();
        cy.log(`VM is currently running on node: ${originalNode}`);

        // Pick a real node offered by the live cluster, not the VM's current node
        const targetNodeName = liveNodeNames.find((n) => n !== originalNode) || '';

        if (!targetNodeName) {
          throw new Error(`No available target node found for migration. Original node: ${originalNode}`);
        }

        cy.log(`Target node for migration: ${targetNodeName}`);

        // Store both nodes for later comparison
        cy.wrap(originalNode).as('originalNode');
        cy.wrap(targetNodeName).as('targetNode');

        // Perform migration with the found target node
        vms.clickMigrateAction(VM_NAME, `${targetNodeName}`);

        cy.reload();
        // Check VM in migrating state
        vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Migrating', 2, {
          timeout: constants.timeout.maxTimeout,
          nameSelector: '.name-console a'
        });

        // Check VM in running state
        vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, {
          timeout: constants.timeout.maxTimeout,
          nameSelector: '.name-console a'
        });

        // Verify migration was successful
        vms.verifyMigrationSuccess(VM_NAME, targetNodeName, originalNode);
      });

    vms.openDetailPanel(VM_NAME);
    vms.clickMigrationTab();

    vms.checkNode('@originalNode', 'Source Node');
    vms.checkNode('@targetNode', 'Target Node');

    vms.goToList();

    // Check the file content not changed after migration  
    vms.sshWithCommand(
      VM_NAME,
      'opensuse',
      'password',
      'cat migrate-vm.txt',
      true,  // Check the output
      'content before migration'
    );
    // tear down
    vms.delete(NAMESPACE, VM_NAME)

  });

  /**
   * 1. Navigate to the VM create page
   * 2. Create a new VM with cloud init config data
   * 3. ssh to the vm and create a new file
   * 4. Create a vm backup named with vm name with `backup-` prefix
   * 5. Get the original node name before migration
   * 6. Migrate the VM to another host
   *  - VM should go into migrating status
   * 7. Check can correctly migrate to other node
   * 8. VM migrated should be in running state
   * 9. Click the vm from the virtual machines list
   * 10. Click the Migration tab
   * 11. Check the Source Node and Target Node value is the same with previous restored variables
   * 12. ssh to the vm, check the file content is the same
  **/
  it('Migrate VM with one backup', () => {
    const VM_NAME = generateName('test-vm-migrate-backup');
    const NAMESPACE = 'default'
    const largeImageEnv = Cypress.env('largeImage');
    const BACKUP_NAME = `backup-${VM_NAME}`;
    const USERDATA = `#cloud-config
password: password
chpasswd: { expire: False }
sshpwauth: True
`

    const value = {
      name: VM_NAME,
      cpu: '1',
      memory: '2',
      image: largeImageEnv.name,
      networks: [{
        network: vmNetworkName,
      }],
      guestAgent: true,
      namespace: NAMESPACE,
      userData: USERDATA,
    }
    vms.create(value);

    // Navigate to VM list to ensure we're on the correct page
    vms.goToList();

    // Check VM is running
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, { timeout: constants.timeout.maxTimeout, nameSelector: '.name-console a' });
    // Wait for IP address show in table
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, '.', 7, { timeout: constants.timeout.maxTimeout, nameSelector: '.name-console a' });

    // Check VM display IP address and ssh to the VM to create a test file
    cy.contains('tr', VM_NAME)
      .wait(10000) // Wait for system ssh port ready
      .find('[data-testid="sortable-cell-0-5"] > .ip-list > .ip-item > .copy-to-clipboard-text')
      .then($els => {
        vms.sshWithCommand(
          VM_NAME,
          'opensuse',
          'password',
          'echo "content before migration with backup" > migrate-vm-backup.txt',
          false  // Don't check the output
        );

      })

    // Create a VM backup
    vms.clickVMBackupAction(VM_NAME, BACKUP_NAME);

    // Verify backup is created
    vmBackups.goToList();
    vmBackups.censorInColumn(BACKUP_NAME, 3, NAMESPACE, 4, VM_NAME, 5, { timeout: constants.timeout.uploadTimeout, nameSelector: 'a' });

    // Go back to VM list for migration
    vms.goToList();

    // Get the original node name before migration
    cy.contains('tr', VM_NAME)
      .find('td')
      .eq(7) // Node column
      .invoke('text')
      .then((nodeName) => {
        const originalNode = nodeName.trim();
        cy.log(`VM is currently running on node: ${originalNode}`);

        // Pick a real node offered by the live cluster, not the VM's current node
        const targetNodeName = liveNodeNames.find((n) => n !== originalNode) || '';

        if (!targetNodeName) {
          throw new Error(`No available target node found for migration. Original node: ${originalNode}`);
        }

        cy.log(`Target node for migration: ${targetNodeName}`);

        // Store both nodes for later comparison
        cy.wrap(originalNode).as('originalNode');
        cy.wrap(targetNodeName).as('targetNode');

        // Perform migration with the found target node
        vms.clickMigrateAction(VM_NAME, `${targetNodeName}`);

        cy.reload();
        // Check VM in migrating state
        vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Migrating', 2, {
          timeout: constants.timeout.maxTimeout,
          nameSelector: '.name-console a'
        });

        // Check VM in running state after migration
        vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, {
          timeout: constants.timeout.maxTimeout,
          nameSelector: '.name-console a'
        });

        // Verify migration was successful
        vms.verifyMigrationSuccess(VM_NAME, targetNodeName, originalNode);
      });

    // Open detail panel and verify migration details
    vms.openDetailPanel(VM_NAME);
    vms.clickMigrationTab();

    vms.checkNode('@originalNode', 'Source Node');
    vms.checkNode('@targetNode', 'Target Node');

    vms.goToList();

    // Check the file content not changed after migration  
    vms.sshWithCommand(
      VM_NAME,
      'opensuse',
      'password',
      'cat migrate-vm-backup.txt',
      true,  // Check the output
      'content before migration with backup'
    );

    // Cleanup - delete backup first, then VM
    vmBackups.deleteFromStore(`${NAMESPACE}/${BACKUP_NAME}`);
    vms.delete(NAMESPACE, VM_NAME)

  });

  /**
   * 1. Navigate to the VM create page
   * 2. Create a new volume with size 5 and named 'migration-vol' with generateName function
   * 3. Create a new VM with cloud init config data
   * 4. Attach the new volume to the new vm using hot-plug
   * 5. ssh to the vm and set mount point '/data' on the added volume /dev/sda
   * 6. Create a file on the root disk
   * 7. Create a file on the second disk /dev/sda mounted at /data
   * 8. Get the original node name before migration
   * 9. Migrate the VM to another host
   *  - VM should go into migrating status
   * 10. Check can correctly migrate to other node
   * 11. VM migrated should be in running state
   * 12. Click the vm from the virtual machines list
   * 13. Click the Migration tab
   * 14. Check the Source Node and Target Node value is the same with previous restored variables
   * 15. ssh to the vm, check the content is the same in file root-disk.txt
   * 16. Check the content is the same in file data-disk.txt at /data/data-disk.txt
  **/
  it('Migrate VM has multiple volumes', () => {
    const VM_NAME = generateName('test-vm-migrate-volumes');
    const NAMESPACE = 'default'
    const VOLUME_NAME = generateName('migration-vol');
    const largeImageEnv = Cypress.env('largeImage');
    const USERDATA = `#cloud-config
password: password
chpasswd: { expire: False }
sshpwauth: True
`

    // Create a new volume
    volumePO.goToCreate();
    volumePO.setNameNsDescription(VOLUME_NAME, NAMESPACE);
    volumePO.setBasics({ size: '5' });
    volumePO.save();
    volumePO.censorInColumn(VOLUME_NAME, 3, NAMESPACE, 4, 'Ready', 2);

    // Create VM with cloud init config
    const value = {
      name: VM_NAME,
      cpu: '1',
      memory: '2',
      image: largeImageEnv.name,
      networks: [{
        network: vmNetworkName,
      }],
      guestAgent: true,
      namespace: NAMESPACE,
      userData: USERDATA,
    }
    vms.create(value);

    // Navigate to VM list to ensure we're on the correct page
    vms.goToList();

    // Check VM is running
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, { timeout: constants.timeout.maxTimeout, nameSelector: '.name-console a' });
    // Wait for IP address show in table  
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, '.', 7, { timeout: constants.timeout.uploadTimeout, nameSelector: '.name-console a' });

    // Hot plug the additional volume
    vms.plugVolume(VM_NAME, [VOLUME_NAME], NAMESPACE);

    // SSH to VM and setup mount point and create files
    cy.contains('tr', VM_NAME)
      .wait(10000) // Wait for system ssh port ready
      .find('[data-testid="sortable-cell-0-5"] > .ip-list > .ip-item > .copy-to-clipboard-text', {
        timeout: constants.timeout.uploadTimeout 
      })
      .then($els => {
        // Mount the second disk to /data
        vms.sshWithCommand(
          VM_NAME,
          'opensuse',
          'password',
          'sudo mkfs.ext4 -F /dev/sda && sudo mkdir -p /data && sudo mount /dev/sda /data && UUID=$(sudo blkid -s UUID -o value /dev/sda) && echo "UUID=$UUID /data ext4 defaults 0 0" | sudo tee -a /etc/fstab && sudo mount -a',
          false  // Don't check the output
        );

        // Create file on root disk
        vms.sshWithCommand(
          VM_NAME,
          'opensuse',
          'password',
          'echo "before migration on root disk" > root-disk.txt',
          false  // Don't check the output
        );

        // Create file on data disk
        vms.sshWithCommand(
          VM_NAME,
          'opensuse',
          'password',
          'sudo sh -c "echo \\\"before migration on data disk\\\" > /data/data-disk.txt"',
          false  // Don't check the output
        );
      });

    // Go back to VM list for migration
    vms.goToList();

    // Get the original node name before migration
    cy.contains('tr', VM_NAME)
      .find('td')
      .eq(7) // Node column
      .invoke('text')
      .then((nodeName) => {
        const originalNode = nodeName.trim();
        cy.log(`VM is currently running on node: ${originalNode}`);

        // Pick a real node offered by the live cluster, not the VM's current node
        const targetNodeName = liveNodeNames.find((n) => n !== originalNode) || '';

        if (!targetNodeName) {
          throw new Error(`No available target node found for migration. Original node: ${originalNode}`);
        }

        cy.log(`Target node for migration: ${targetNodeName}`);

        // Store both nodes for later comparison
        cy.wrap(originalNode).as('originalNode');
        cy.wrap(targetNodeName).as('targetNode');

        // Perform migration with the found target node
        vms.clickMigrateAction(VM_NAME, `${targetNodeName}`);

        cy.reload();
        // Check VM in migrating state
        vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Migrating', 2, {
          timeout: constants.timeout.maxTimeout,
          nameSelector: '.name-console a'
        });

        // Check VM in running state after migration
        vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, {
          timeout: constants.timeout.uploadTimeout,
          nameSelector: '.name-console a'
        });

        // Reload page to ensure migration details are updated
        cy.wait(10000);

        // Verify migration was successful
        vms.verifyMigrationSuccess(VM_NAME, targetNodeName, originalNode);
      });

    // Open detail panel and verify migration details
    vms.openDetailPanel(VM_NAME);
    vms.clickMigrationTab();
    // Wait for migration details to load
    cy.wait(5000); 

    vms.checkNode('@originalNode', 'Source Node');
    vms.checkNode('@targetNode', 'Target Node');

    vms.goToList();

    // Check the file content not changed after migration on root disk
    vms.sshWithCommand(
      VM_NAME,
      'opensuse',
      'password',
      'cat root-disk.txt',
      true,  // Check the output
      'before migration on root disk'
    );

    // Check the file content not changed after migration on data disk
    vms.sshWithCommand(
      VM_NAME,
      'opensuse',
      'password',
      'cat /data/data-disk.txt',
      true,  // Check the output
      'before migration on data disk'
    );

    // Cleanup - delete VM and volume
    vms.delete(NAMESPACE, VM_NAME);
    volumePO.delete(NAMESPACE, VOLUME_NAME);

  });

})
