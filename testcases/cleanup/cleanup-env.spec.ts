import { PageUrl, Constants } from "@/constants/constants";
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { VolumePage } from "@/pageobjects/volume.po";
import { ImagePage } from "@/pageobjects/image.po";
import VMBackup from "@/pageobjects/vmBackup.po";
import VMSnapshot from "@/pageobjects/vmSnapshot.po";
import { HCI } from '@/constants/types';
import CheckboxPo from '@/utils/components/checkbox.po';

const constants = new Constants();
const vms = new VmsPage();
const volumePO = new VolumePage();
const imagePO = new ImagePage();
const vmBackupPO = new VMBackup();
const vmSnapshotPO = new VMSnapshot();

describe('Cleanup Environment', () => {
  beforeEach(() => {
    cy.login();
  });

  /**
   * Clean up all VM backups from the test environment
   * 1. Check if there are any VM backups present in the list
   * 2. Select all VM backups using the table checkbox
   * 3. Click the bulk Delete button
   * 4. Confirm deletion
   * 5. Select all VM snapshots using the table checkbox
   * 6. Click the bulk Delete button
   * 7. Confirm deletion
   * Expected Results
   * 1. All VM backups should be deleted successfully
   */
  it('Clean up all VM backups and snapshots', () => {
    vmBackupPO.goToList();
    
    // Check VM backup count using the new method
    vmBackupPO.getVmBackupCount().then((vmBackupCount) => {
      if (vmBackupCount === 0) {
        cy.log('No VM backups found to clean up');
        return;
      }

      cy.log(`Found ${vmBackupCount} VM backups to clean up`);

      // Bulk delete approach using UI - only execute if VM backups exist
      if (vmBackupCount > 0) {
        vmBackupPO.bulkDeleteAll();
        vmSnapshotPO.goToList();
        vmSnapshotPO.bulkDeleteAll();
      }

      vmBackupPO.goToList();
      // Periodically check if all VM backups are deleted (10 minutes timeout)
      const checkInterval = 5000; // Check every 5 seconds
      const maxWaitTime = constants.timeout.downloadTimeout; // 10 minutes
      const startTime = Date.now();

      const checkVmBackupsDeleted = () => {
        vmBackupPO.getVmBackupCount().then((currentCount) => {
          const elapsedTime = Date.now() - startTime;
          cy.log(`VM backup count: ${currentCount} (elapsed: ${Math.floor(elapsedTime / 1000)}s)`);

          if (currentCount === 0) {
            cy.log('All VM backups and snapshots successfully deleted');
            return;
          }

          if (elapsedTime < maxWaitTime) {
            cy.wait(checkInterval);
            checkVmBackupsDeleted();
          } else {
            cy.log(`Timeout: ${currentCount} VM backups still remain after 10 minutes`);
            throw new Error(`Failed to delete all VM backups within 10 minutes. ${currentCount} VM backups remaining.`);
          }
        });
      };

      checkVmBackupsDeleted();
    });
  });

  /**
   * Clean up all virtual machines from the test environment
   * 1. Check if there are any VMs present in the list
   * 2. Select all VMs using the table checkbox
   * 3. Click the bulk Delete button
   * 4. Check "Delete All" in the confirmation dialog
   * 5. Confirm deletion
   * Expected Results
   * 1. All VMs should be deleted successfully
   */
  it('Clean up all virtual machines', () => {
    vms.goToList();
    
    // Check VM count using the new method
    vms.getVmCount().then((vmCount) => {
      if (vmCount === 0) {
        cy.log('No VMs found to clean up');
        return;
      }

      cy.log(`Found ${vmCount} VMs to clean up`);

      // Bulk delete approach using UI - only execute if VMs exist
      if (vmCount > 0) {
        vms.bulkDeleteAll();
      }

      // Periodically check if all VMs are deleted (10 minutes timeout)
      const checkInterval = 5000; // Check every 5 seconds
      const maxWaitTime = constants.timeout.downloadTimeout; // 10 minutes
      const startTime = Date.now();

      const checkVmsDeleted = () => {
        vms.getVmCount().then((currentCount) => {
          const elapsedTime = Date.now() - startTime;
          cy.log(`VM count: ${currentCount} (elapsed: ${Math.floor(elapsedTime / 1000)}s)`);

          if (currentCount === 0) {
            cy.log('All VMs successfully deleted');
            return;
          }

          if (elapsedTime < maxWaitTime) {
            cy.wait(checkInterval);
            checkVmsDeleted();
          } else {
            cy.log(`Timeout: ${currentCount} VMs still remain after 10 minutes`);
            throw new Error(`Failed to delete all VMs within 10 minutes. ${currentCount} VMs remaining.`);
          }
        });
      };

      checkVmsDeleted();

    });
  });

  /**
   * Clean up all volumes from the test environment
   * 1. Check if there are any volumes present in the list
   * 2. Select all volumes using the table checkbox
   * 3. Click the bulk Delete button
   * 4. Confirm deletion
   * Expected Results
   * 1. All volumes should be deleted successfully
   */
  it('Clean up all volumes', () => {
    volumePO.goToList();
    
    // Check volume count using the new method
    volumePO.getVolumeCount().then((volumeCount) => {
      if (volumeCount === 0) {
        cy.log('No volumes found to clean up');
        return;
      }

      cy.log(`Found ${volumeCount} volumes to clean up`);

      // Bulk delete approach using UI - only execute if volumes exist
      if (volumeCount > 0) {
        volumePO.bulkDeleteAll();
      }

      // Periodically check if all volumes are deleted (10 minutes timeout)
      const checkInterval = 5000; // Check every 5 seconds
      const maxWaitTime = constants.timeout.downloadTimeout; // 10 minutes
      const startTime = Date.now();

      const checkVolumesDeleted = () => {
        volumePO.getVolumeCount().then((currentCount) => {
          const elapsedTime = Date.now() - startTime;
          cy.log(`Volume count: ${currentCount} (elapsed: ${Math.floor(elapsedTime / 1000)}s)`);

          if (currentCount === 0) {
            cy.log('All volumes successfully deleted');
            return;
          }

          if (elapsedTime < maxWaitTime) {
            cy.wait(checkInterval);
            checkVolumesDeleted();
          } else {
            cy.log(`Timeout: ${currentCount} volumes still remain after 10 minutes`);
            throw new Error(`Failed to delete all volumes within 10 minutes. ${currentCount} volumes remaining.`);
          }
        });
      };

      checkVolumesDeleted();
    });
  });

  /**
   * Clean up all images from the test environment
   * 1. Check if there are any images present in the list
   * 2. Select all images using the table checkbox
   * 3. Click the bulk Delete button
   * 4. Confirm deletion
   * Expected Results
   * 1. All images should be deleted successfully
   */
  it('Clean up all images', () => {
    imagePO.goToList();
    
    // Check image count using the new method
    imagePO.getImageCount().then((imageCount) => {
      if (imageCount === 0) {
        cy.log('No images found to clean up');
        return;
      }

      cy.log(`Found ${imageCount} images to clean up`);

      // Bulk delete approach using UI - only execute if images exist
      if (imageCount > 0) {
        imagePO.bulkDeleteAll();
      }

      // Periodically check if all images are deleted (10 minutes timeout)
      const checkInterval = 5000; // Check every 5 seconds
      const maxWaitTime = constants.timeout.downloadTimeout; // 10 minutes
      const startTime = Date.now();

      const checkImagesDeleted = () => {
        imagePO.getImageCount().then((currentCount) => {
          const elapsedTime = Date.now() - startTime;
          cy.log(`Image count: ${currentCount} (elapsed: ${Math.floor(elapsedTime / 1000)}s)`);

          if (currentCount === 0) {
            cy.log('All images successfully deleted');
            return;
          }

          if (elapsedTime < maxWaitTime) {
            cy.wait(checkInterval);
            checkImagesDeleted();
          } else {
            cy.log(`Timeout: ${currentCount} images still remain after 10 minutes`);
            throw new Error(`Failed to delete all images within 10 minutes. ${currentCount} images remaining.`);
          }
        });
      };

      checkImagesDeleted();
    });
  });
});
