import { defineConfig } from 'cypress'

export default defineConfig({
  pageLoadTimeout: 120000,
  fixturesFolder: './fixtures',
  viewportWidth: 1920,
  viewportHeight: 1080,
  numTestsKeptInMemory: 1,
  defaultCommandTimeout: 240000,
  requestTimeout: 240000,
  responseTimeout: 240000,
  chromeWebSecurity: false,
  screenshotsFolder: 'results/mochawesome-report/assets',
  env: {
    NODE_ENV: 'production',
    username: 'admin',
    password: 'password1234',
    mockPassword: "mockPassword",
    baseUrl: 'https://online-server',
    host: {
      name: '',
      customName: '',
      disks: [
        {
          name: '',
          devPath: '',
        },
      ],
      witnessNode: false
    },
    image: {
      name: 'openSUSE-Leap-15.3-3-NET-x86_64.qcow2',
      url: 'http://10.115.1.6/iso/opensuse/openSUSE-Leap-15.3-JeOS.x86_64-15.3-OpenStack-Cloud-Current.qcow2',
    },
    nfsEndPoint: 'nfs://ip',
  },
  retries: {
    runMode: 0,
    openMode: 0,
  },
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'results',
    overwrite: false,
    html: false,
    json: true,
  },
  e2e: {
    // We've imported your old cypress plugins here. Might need clean up later.
    setupNodeEvents(on, config) {
      const result = require('./plugins/index.js')(on, config)
      // Delete the video after each spec that passes - only failures are kept.
      const fs = require('fs')
      on('after:spec', (_spec, results) => {
        if (results && results.stats.failures === 0 && results.video) {
          fs.rmSync(results.video, { force: true })
        }
      })
      return result
    },
    // Preserve the upstream harvester-ui-tests execution order (dashboard, settings,
    // image, networks first) unless a specific testgroup/testscript is requested.
    specPattern: [
      './testcases/dashboard/*.spec.ts',
      './testcases/settings/*.spec.ts',
      './testcases/image/*.spec.ts',
      './testcases/networks/*.spec.ts',
      './testcases/**/*.spec.ts',
    ],
    supportFile: './support/index.js',
    baseUrl: 'https://10.115.252.50',
    experimentalSessionAndOrigin: true,
    video: true,
    videosFolder: 'results/videos',
  },
})