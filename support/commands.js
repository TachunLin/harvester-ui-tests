import cookie from 'cookie';
import addContext from "mochawesome/addContext";

import { Constants } from '../constants/constants'
import { CAPI } from '@/constants/types'

const path = require('path')

const constants = new Constants();

require('cy-verify-downloads').addCustomCommand();

Cypress.Commands.add('login', (params = {}) => {
    const finalUrl = params.url;
    let username = params.username || Cypress.env('username');
    const password = params.password || Cypress.env('password');
    
    // For Rancher login, always start with Virtualization Management to load cluster data
    let initialUrl = finalUrl;

    if (params.isRancher) {
      Cypress.config('baseUrl', Cypress.env('rancherUrl'));
      // Always use Virtualization Management page first to ensure cluster data loads
      initialUrl = '/c/local/harvesterManager/harvesterhci.io.management.cluster';
    } else if (username === 'admin') {
      Cypress.config('baseUrl', Cypress.env('baseUrl'));
      initialUrl = initialUrl || constants.dashboardUrl;
    } else {
      Cypress.config('baseUrl', Cypress.env('rancherUrl'));
      initialUrl = initialUrl || constants.dashboardUrl;
    }

    cy.intercept('GET', '/v1-public/authproviders*').as('authProviders');
    cy.visit(`/auth/login`);
    cy.wait('@authProviders').then(res => {
      const { CSRF } = cookie.parse(document.cookie);
      cy.request({
        method: 'POST',
        url: '/v3-public/localProviders/local?action=login',
        body: {
          description:"UI session",
          responseType:"cookie",
          username,
          password
        },
        headers: {
          'x-api-csrf': CSRF
        }
      }).then(async () => {
        cy.visit(initialUrl); // Visit initial URL to load necessary data
        cy.get('.initial-load-spinner', { timeout: constants.timeout.maxTimeout })

        if (username === 'admin' && !params.isRancher) {
          cy.get(".dashboard-content .product-name").contains("Harvester")

          Cypress.config('clusterId', 'local'); 
        } else {
          cy.get('[data-testid="top-level-menu"]')

          if (!Cypress.config('clusterId')) {
            // Wait for clusters to load into the store
            cy.window().then((win) => {
              // Poll until clusters are loaded
              return new Cypress.Promise((resolve) => {
                const checkClusters = () => {
                  const allClusters = win.$nuxt.$store.getters['management/all'](CAPI.RANCHER_CLUSTER);
                  cy.task('log', `Checking clusters... type: ${typeof allClusters}, isArray: ${Array.isArray(allClusters)}, length: ${allClusters?.length}`);
                  if (allClusters && allClusters.length > 0) {
                    resolve(allClusters);
                  } else {
                    setTimeout(checkClusters, 500);
                  }
                };
                checkClusters();
              });
            }).then((allClusters) => {
              cy.task('log', `Clusters loaded! Count: ${allClusters.length}`);
              
              // Find Harvester cluster by provider (not by name, as name might be auto-generated)
              const harvesterCluster = allClusters.find((c) => 
                c.status?.provider === 'harvester' || 
                c.metadata?.labels?.['provider.cattle.io']?.includes('harvester') ||
                c.metadata?.name === 'harvester'
              );
              
              if (harvesterCluster) {
                const clusterId = harvesterCluster?.status?.clusterName || harvesterCluster.id;
                cy.task('log', `ClusterId retrieved: ${clusterId} (from cluster: ${harvesterCluster.metadata?.name}, provider: ${harvesterCluster.status?.provider})`);
                Cypress.config('clusterId', clusterId);
                Cypress.env('clusterId', clusterId);  // Store in env as well for better persistence
              } else {
                const clusterInfo = allClusters.map((c) => `${c.metadata?.name} (provider: ${c.status?.provider})`).join(', ');
                cy.task('log', `Warning: No Harvester cluster found. Available clusters: ${clusterInfo}`);
              }
            });
          }

          // Navigate to final destination if provided and different from initial
          if (finalUrl && finalUrl !== initialUrl) {
            cy.then(() => {
              // Automatically replace /local/ with clusterId if present in the URL
              const clusterId = Cypress.config('clusterId') || Cypress.env('clusterId');
              const processedUrl = finalUrl.replace(/\/local\//g, `/${clusterId}/`);
              
              cy.task('log', `Navigating to final destination: ${processedUrl} (using clusterId: ${clusterId})`);
              cy.visit(processedUrl);
              cy.get('.initial-load-spinner', { timeout: constants.timeout.maxTimeout })
            });
          }
        }
      });
    })
});

Cypress.Commands.add('stopOnFailed', () => {
  Cypress.on('fail', (e, test) => {
    Cypress.runner.stop();
    throw new Error(e.message);
  })
})

Cypress.Commands.overwrite('visit', (originalFn, url = '', options) => {
  const isDev = Cypress.env('NODE_ENV') === 'dev';

  if (!isDev) {
    url = `/dashboard${url}`;
  }

  return originalFn(url, options)
})


Cypress.on('uncaught:exception', (err, runable) => {
  return false;
})

Cypress.on("test:after:run", (test, runnable) => {  
  if (test.state === "failed") {   
    const dir = Cypress.spec.relative
    const specDir = dir.split('/').slice(1, -1).join('/') 

    let describe = ''
    let context = ''
    let it = test.title

    let fileName = '' 

    if (runnable.parent?.parent?.title) {
      describe = runnable.parent.parent.title
      context = runnable.parent.title
      
      fileName = `${describe} -- ${context} -- ${it} (failed).png`
    } else {
      describe = runnable.parent.title

      fileName = `${runnable.parent.title} -- ${test.title} (failed).png`
    }

    const screenshot =`assets/${specDir}/${Cypress.spec.name}/${fileName}`;    
    
    addContext({ test }, screenshot);

    addContext({ test }, 'Environment variables:');
    const env = Cypress.env();

    Object.keys(env).forEach(key => {
      const value = Cypress.env(key) 

      if (typeof(value) !== 'object') {
        addContext({ test }, `${key}: ${Cypress.env(key)}`);
      } else {
        addContext({ test }, `${key}: ${JSON.stringify(Cypress.env(key))}`); 
      }
    })
  }
});
