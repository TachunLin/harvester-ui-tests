/**
 * Entry point for environment cleanup
 * Runs after standalone tests to clean up test resources before Rancher-integrated tests
 * 
 * This cleanup ensures a clean state for Rancher-integrated tests by removing:
 * - VM backups and snapshots
 * - Virtual machines
 * - Volumes
 * - Images (except base images needed for Rancher tests)
 */

import './cleanup/cleanup-env.spec'
