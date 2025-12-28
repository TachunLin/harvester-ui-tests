export class Constants {
    public timeout = { timeout: 10000, maxTimeout: 60000, uploadTimeout: 600000, downloadTimeout: 600000, provisionTimeout: 1500000 };
    public username = Cypress.env("username");
    public password = Cypress.env("password");
    public mockPassword = Cypress.env("mockPassword");
    public rancherUrl = Cypress.env("rancherUrl");
    public rancher_user = Cypress.env("rancherUser");
    public rancher_password = Cypress.env("rancherPassword");
    public rancher_vm_user = Cypress.env("rancher_vm_user");
    public rancher_vm_password = Cypress.env("rancher_vm_password");
    public harvester_ui_extension_repo_url = Cypress.env("harvester_ui_extension_repo_url");
    public harvester_ui_extension_branch = Cypress.env("harvester_ui_extension_branch");
    public harvester_ui_extension_version = Cypress.env("harvester_ui_extension_version");
    public vagrant_pxe_path = Cypress.env("vagrant_pxe_path");
    public setupUrl = '/auth/setup/';
    public loginUrl = '/auth/login/';
    public accountUrl = '/account'
    public dashboardUrl = '/harvester/c/local/harvesterhci.io.dashboard';
    public settingsUrl = '/harvester/c/local/harvesterhci.io.setting';
    public uiSourceUrl = '/harvester/c/local/harvesterhci.io.setting/ui-source?mode=edit';
    public hostsPage = '/harvester/c/local/harvesterhci.io.host';
    public supportPage = '/harvester/c/local/support';
    public vmPage = '/harvester/c/local/kubevirt.io.virtualmachine';
    public settingUrl = '/harvester/c/local/harvesterhci.io.setting';
    public volumePage = '/harvester/c/local/harvesterhci.io.volume';
    public imagePage = '/harvester/c/local/harvesterhci.io.virtualmachineimage';
    public virtualManagePage = '/c/local/harvesterManager/harvesterhci.io.management.cluster';
    public rancher_loginPage = '/dashboard/auth/login';
    public rancher_dashboardPage = 'dashboard/home';
    public rancher_settingPage = '/dashboard/c/local/settings/management.cattle.io.setting';
    public rancher_virtualizationManagement = '/c/local/harvesterManager/harvesterhci.io.management.cluster';
    public rancher_clusterManagmentPage = '/c/local/manager/provisioning.cattle.io.cluster';
    public rancher_cloudCredentialPage = '/c/local/manager/cloudCredential';
    public rancher_nodeTamplatePage = '/c/local/manager/pages/node-templates';
    public rancher_apps_repositories = '/c/local/apps/catalog.cattle.io.clusterrepo';
    public rancher_available_extensions = '/c/_/uiplugins#available';
}

export const RancherPageUrl = {
  user: `/c/local/auth/management.cattle.io.user`,
}

export const PageUrl = {
    setting: '/harvester/c/local/harvesterhci.io.setting',
    virtualMachine: '/harvester/c/local/kubevirt.io.virtualmachine',
    vmNetwork: '/harvester/c/local/harvesterhci.io.networkattachmentdefinition',
    clusterNetwork: '/harvester/c/local/network.harvesterhci.io.clusternetwork',
    namespace: '/harvester/c/local/namespace',
    volumeSnapshot: '/harvester/c/local/harvesterhci.io.volumesnapshot',
    clusterMember: '/harvester/c/local/management.cattle.io.clusterroletemplatebinding',
    project: '/harvester/c/local/projectsnamespaces',
}

/**
 * Helper function to replace cluster identifier in URLs with actual clusterId
 * - Replaces 'local' with clusterId (for Rancher contexts using Harvester standalone URLs)
 * - Replaces '{clusterId}' placeholder with clusterId (for dynamic URLs)
 * @param url - URL with 'local' or '{clusterId}' to be replaced
 * @param clusterId - Optional clusterId to use. If not provided, uses Cypress.config('clusterId')
 * @returns URL with clusterId replaced
 */
export const replaceClusterId = (url: string, clusterId?: string): string => {
  const actualClusterId = clusterId || Cypress.config('clusterId');
  return url.replace(/\{clusterId\}|\/local\//g, (match) => {
    return match === '{clusterId}' ? actualClusterId : `/${actualClusterId}/`;
  });
};

export const MenuNav = {
    dashboard: ['Dashboard', 'harvester/c/local/harvesterhci.io.dashboard', 'Harvester Cluster: local'],
    Host: ['Hosts', 'harvester/c/local/harvesterhci.io.host', 'Hosts'],
    virtaulmachine: ['Virtual Machines', 'harvester/c/local/kubevirt.io.virtualmachine', 'Virtual Machines'],
    volume: ['Volumes', 'harvester/c/local/harvesterhci.io.volume', 'Volumes'],
    Images: ['Images', 'harvester/c/local/harvesterhci.io.virtualmachineimage', 'Images'],
    namespace: ['Namespaces', 'harvester/c/local/namespace', 'Namespaces'],
    clusterNetwork: ['Cluster Network Configuration', 'harvester/c/local/network.harvesterhci.io.clusternetwork', 'Cluster Network Configuration', ['Networks']],
    vmNetwork: ['Virtual Machine Networks', 'harvester/c/local/harvesterhci.io.networkattachmentdefinition', 'Virtual Machine Networks', ['Networks']],
    vmSchedule: ['Virtual Machine Schedules', 'harvester/c/local/harvesterhci.io.schedulevmbackup', 'Virtual Machine Schedules', ['Backup and Snapshots']],
    vmBackup: ['Virtual Machine Backups', 'harvester/c/local/harvesterhci.io.virtualmachinebackup', 'Virtual Machine Backups', ['Backup and Snapshots']],
    vmSnapshot: ['Virtual Machine Snapshots', 'harvester/c/local/harvesterhci.io.vmsnapshot', 'Virtual Machine Snapshots', ['Backup and Snapshots']],
    volumeSnapshot: ['Volume Snapshots', 'harvester/c/local/harvesterhci.io.volumesnapshot', 'Volume Snapshots', ['Backup and Snapshots']],
    alertmanagerConfig: ['Alertmanager Configurations', 'harvester/c/local/harvesterhci.io.monitoring.alertmanagerconfig', 'Alertmanager Configurations', ['Monitoring & Logging', 'Monitoring']],
    clusterFlow: ['Cluster Flows', 'harvester/c/local/harvesterhci.io.logging.clusterflow', 'Cluster Flows', ['Monitoring & Logging', 'Logging']],
    clusterOutput: ['Cluster Outputs', 'harvester/c/local/harvesterhci.io.logging.clusteroutput', 'Cluster Outputs', ['Monitoring & Logging', 'Logging']],
    flow: ['Flows', 'harvester/c/local/harvesterhci.io.logging.flow', 'Flows', ['Monitoring & Logging', 'Logging']],
    Output: ['Outputs', 'harvester/c/local/harvesterhci.io.logging.output', 'Outputs', ['Monitoring & Logging', 'Logging']],
    Template: ['Templates', 'harvester/c/local/harvesterhci.io.virtualmachinetemplateversion', 'Templates', ['Advanced']],
    sshKey: ['SSH Keys', 'harvester/c/local/harvesterhci.io.keypair', 'SSH Keys', ['Advanced']],
    cloudConfigTemplate: ['Cloud Configuration Templates', 'harvester/c/local/harvesterhci.io.cloudtemplate', 'Cloud Configuration Templates', ['Advanced']],
    storageClass: ['Storage Classes', 'harvester/c/local/harvesterhci.io.storage', 'Storage Classes', ['Advanced']],
    pciDevice: ['PCI Devices', 'harvester/c/local/devices.harvesterhci.io.pcidevice', 'PCI Devices', ['Advanced']],
    addon: ['Add-ons', 'harvester/c/local/harvesterhci.io.addon', 'Add-ons', ['Advanced']],
    secrets: ['Secrets', 'harvester/c/local/harvesterhci.io.secret', 'Secrets', ['Advanced']],
    setting: ['Settings', 'harvester/c/local/harvesterhci.io.setting', 'Settings', ['Advanced']]
}