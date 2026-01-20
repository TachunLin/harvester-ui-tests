/**
 * Entry point for Rancher-integrated tests
 * Runs after cleanup in a clean environment
 * 
 * These tests verify Harvester functionality when accessed through Rancher UI
 * All tests use Rancher authentication and URL patterns
 */

import './rancher-integrated/rancher-images.spec'
import './rancher-integrated/rancher-virtual-machine.spec'

// Add additional rancher-integrated tests here as they are created
// import './rancher-integrated/rancher-networks.spec.ts'
// import './rancher-integrated/rancher-volumes.spec.ts'
// etc...
