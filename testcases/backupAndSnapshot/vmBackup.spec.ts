import { onlyOn } from "@cypress/skip-test";
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import VMBackup from '@/pageobjects/vmBackup.po';
import { PageUrl } from "@/constants/constants";
import SettingsPagePo from "@/pageobjects/settings.po";
import { generateName } from "@/utils/utils";

const vms = new VmsPage();
const vmBackups = new VMBackup();
const settings = new SettingsPagePo();

describe('VM Backup Validation', () => {
  // Unique names generated once per suite run — shared across all it() blocks
  const vmName = generateName('test-vm');
  const vmBackupName = generateName('test-vm-backup');
  const namespace = 'default';

  let createVMBackupSuccess: boolean = false;
  let backupTargetSetByTest: boolean = false;

  before(() => {
    // Ensure backup target is configured before running any backup tests
    cy.login({ url: PageUrl.setting });
    cy.request({
      method: 'GET',
      url: '/v1/harvester/harvesterhci.io.settings/backup-target',
    }).then((res) => {
      let parsed: any = {};
      try { parsed = JSON.parse(res.body?.value); } catch (e) {}

      if (!parsed?.endpoint) {
        cy.log('Backup target not configured — setting S3 backup target');
        const backupTarget = Cypress.env('backupTarget');

        settings.clickMenu('backup-target', 'Edit Setting', 'backup-target');
        settings.setS3BackupTarget({
          type: 'S3',
          endpoint: backupTarget.endpoint,
          bucketName: backupTarget.bucketName,
          bucketRegion: backupTarget.bucketRegion,
          accessKeyId: backupTarget.accessKey,
          secretAccessKey: backupTarget.secretKey,
        });
        settings.update('backup-target');
        backupTargetSetByTest = true;
      } else {
        cy.log(`Backup target already configured: ${parsed.type || 'unknown type'}`);
      }
    });
  });

  beforeEach(() => {
    cy.login({url: PageUrl.virtualMachine});
    vms.init();
  });

  it('Take a vm backup from vm', () => {
    const id = `${namespace}/${vmName}`;
    const imageEnv = Cypress.env('image');
    const volume = [{
      buttonText: 'Add Volume',
      create: false,
      size: '2',
      image: `default/${Cypress._.toLower(imageEnv.name)}`,
    }];

    vmBackups.deleteFromStore(`${namespace}/${vmBackupName}`);
    vms.deleteVMFromStore(id);
    vms.goToCreate();
    vms.deleteVMFromStore(`${namespace}/${vmName}`);
    vms.setNameNsDescription(vmName, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volume);
    vms.save();

    // Wait for VM to be running, then take backup
    vms.checkVMState(vmName, 'Running');
    vms.clickVMBackupAction(vmName, vmBackupName);

    // Verify backup appears in the backup list filtered by its unique name
    vmBackups.goToList();
    vmBackups.censorInColumn(vmBackupName, 3, namespace, 4, vmName, 5, { timeout: 5000, nameSelector: 'a' });

    createVMBackupSuccess = true;
  })

  it('Restore new VM from vm backup', () => {
    onlyOn(createVMBackupSuccess);

    const newVMName = generateName('restore-new');

    vms.deleteVMFromStore(`${namespace}/${newVMName}`);
    vmBackups.goToList();
    vmBackups.restoreNew(vmBackupName, newVMName);
    vms.checkVMState(newVMName);

    // delete vm
    vms.deleteVMFromStore(`${namespace}/${newVMName}`);
  })

  it('Restore New VM in another namespace from vm backup', () => {
    onlyOn(createVMBackupSuccess);

    const newVMName = generateName('restore-new-ns');

    vms.deleteVMFromStore(`${namespace}/${newVMName}`);
    vmBackups.goToList();
    vmBackups.restoreNew(vmBackupName, newVMName, 'harvester-public');
    vms.checkVMState(newVMName);

    // delete vm
    vms.deleteVMFromStore(`${namespace}/${newVMName}`);
  })

  it('Restore Existing VM from vm backup', () => {
    onlyOn(createVMBackupSuccess);

    vms.goToList();
    vms.clickAction(vmName, 'Stop');
    vms.checkVMState(vmName, 'Off');
    vmBackups.goToList();
    vmBackups.restoreExistingVM(vmBackupName);
    vms.checkVMState(vmName);

    // delete vm
    vms.deleteVMFromStore(`${namespace}/${vmName}`);
  })

  it('Delete backup', () => {
    onlyOn(createVMBackupSuccess);

    vmBackups.goToList();
    vmBackups.deleteFromStore(`${namespace}/${vmBackupName}`);
  })
})
