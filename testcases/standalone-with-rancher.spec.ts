/**
 * Entry point for all standalone Harvester tests
 * This file imports all test files that should run in standalone mode
 * Tests execute in the order they are imported
 */

// Dashboard tests - Run first for initial setup and login
import './dashboard/0_FirstTimeLogin.spec'
import './dashboard/1_login.spec'
import './dashboard/nav.spec'


// Settings tests - Configure environment
import './settings/settings.spec'

// Infrastructure tests
import './namespaces/namespaces.spec'
import './storageclasses/storageclasses.spec'

// Image tests
import './image/images.spec'

// Network tests
import './networks/cluster-network.spec'
import './networks/network.spec'

// Volume tests
import './volume/volumes.spec'

// Virtual Machine tests
import './virtualmachines/virtual-machine.spec'
import './virtualmachines/advanced.spec'
import './virtualmachines/network.spec'
import './virtualmachines/scheduling.spec'
import './virtualmachines/node-scheduling.spec'
import './virtualmachines/cpu-overcommit.spec'
import './virtualmachines/vm-migration.spec'

// Backup and Snapshot tests
import './backupAndSnapshot/vmBackup.spec'
import './backupAndSnapshot/vmSnapshot.spec'
import './backupAndSnapshot/volumeSnapshot.spec'

// VM Settings tests
import './VM settings/ssh-keys.spec'
import './VM settings/cloud-config-templates.spec'

// Template tests
import './templates/template.spec'
import './templates/advanced.spec'

// Host and Support tests
import './hosts/hosts.spec'
import './dashboard/support.spec'

/**
 * Entry point for environment cleanup
 * Runs after standalone tests to clean up test resources before Rancher-integrated tests
 * 
 * This cleanup ensures a clean state for Rancher-integrated tests by removing:
 * - VM backups and snapshots
 * - Virtual machines
 * - Volumes
 * - Images 
 */
import './cleanup/cleanup-env.spec'

/**
 * Entry point for Rancher-integrated tests
 * Runs after cleanup in a clean environment
 * 
 * These tests verify Harvester functionality when accessed through Rancher UI
 * All tests use Rancher authentication and URL patterns
 */
// Rancher integration tests
import './rancher/rancher_integration.spec'
import './rancher-integrated/rancher-images.spec'
import './rancher-integrated/rancher-virtual-machine.spec'