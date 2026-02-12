/**
 * Entry point for all standalone Harvester tests
 * This file imports all test files that should run in standalone mode
 * Tests execute in the order they are imported
 */

// Dashboard tests - Run first for initial setup and login
import './dashboard/0_FirstTimeLogin.spec'
import './dashboard/1_login.spec'
// import './dashboard/nav.spec'

// /**
//  * Entry point for Rancher-integrated tests
//  * Runs after cleanup in a clean environment
//  * 
//  * These tests verify Harvester functionality when accessed through Rancher UI
//  * All tests use Rancher authentication and URL patterns
//  */

import './rancher-integrated/rancher-images.spec'
import './rancher-integrated/rancher-virtual-machine.spec'