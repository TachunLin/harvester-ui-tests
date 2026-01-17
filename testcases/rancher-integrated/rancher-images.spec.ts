import { RancherPageUrl, PageUrl, replaceClusterId, Constants } from "@/constants/constants";
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { ImagePage } from "@/pageobjects/image.po";
import { generateName } from '@/utils/utils';
import { HCI } from '@/constants/types';

const constants = new Constants();

// Use base page objects directly - they now support both standalone and Rancher modes
const vms = new VmsPage();
const image = new ImagePage();

describe('Auto setup image from cypress environment - Rancher Mode', () => {
  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  it('Auto setup image from cypress environment', () => {
    const imageEnv = Cypress.env('image');
    const IMAGE_NAME = Cypress._.toLower(imageEnv.name);
    const IMAGE_URL = imageEnv.url;

    const value = {
      name: IMAGE_NAME,
      url: IMAGE_URL,
    }

    cy.then(() => {
      const clusterId = Cypress.config('clusterId') || Cypress.env('clusterId') || 'local';
      cy.request({
        url: `k8s/clusters/${clusterId}/v1/harvester/${HCI.IMAGE}s`,
        headers: {
          accept: 'application/json'
        }
      }).then(res => {
        expect(res?.status, 'Check Image list').to.equal(200);
        const images = res?.body?.data || []
        const imageFound = images.find((i: any) => i?.spec?.displayName === IMAGE_NAME)

        if (imageFound) {
          return
        } else {
          const namespace = 'default';

          image.goToCreate();
          image.setNameNsDescription(IMAGE_NAME, namespace);
          image.setBasics({ url: IMAGE_URL });
          image.save();
          image.checkState({ name: IMAGE_NAME });
        }
      })
    })
  })
})

/**
 * 1. Create image with cloud image available for openSUSE
 * 2. Click save
 * 3. Try to edit the description
 * 4. Try to edit the URL
 * 5. Try to edit the Labels
 * Expected Results
 * 1. Image should show state as Active
 * 2. Image should show progress as Completed
 * 3. User should be able to edit the description and Labels
 * 4. User should not be able to edit the URL
 * 5. User should be able to create a new image with same name
 */
describe('Create an image with valid image URL - Rancher Mode', () => {
  const imageEnv = Cypress.env('image');
  const largeImageEnv = Cypress.env('largeImage');
  const IMAGE_NAME = generateName('auto-image-valid-url-test');
  const IMAGE_URL = imageEnv.url;
  const LARGE_IMAGE_NAME = largeImageEnv.name;
  const LARGE_IMAGE_URL = largeImageEnv.url;

  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  it('Create an image with valid image URL', () => {
    const namespace = 'default';

    // create IMAGE
    image.goToCreate();
    image.setNameNsDescription(IMAGE_NAME, namespace);
    image.setBasics({ url: IMAGE_URL });
    image.setLabels({
      labels: {
        foo: 'foo',
        bar: 'bar'
      }
    });

    cy.wrap(image.save()).then((realName) => {
      // check IMAGE state
      image.checkState({ name: IMAGE_NAME });

      // edit IMAGE
      image.goToEdit(IMAGE_NAME);
      image.name().self().find('input').should('be.disabled');
      image.url().self().find('input').should('be.disabled');
      image.setLabels({
        labels: {
          edit: 'edit'
        }
      })
      image.update(`${realName}`, `${namespace}`);

      // delete IMAGE
      image.delete(namespace, realName as string, IMAGE_NAME);
    })

    // create IMAGE with the same name
    image.goToCreate();
    image.setNameNsDescription(IMAGE_NAME, namespace);
    image.setBasics({ url: IMAGE_URL });
    cy.wrap(image.save()).then((realName) => {
      // check IMAGE state
      image.checkState({ name: IMAGE_NAME });

      // delete IMAGE
      image.delete(namespace, realName as string, IMAGE_NAME);
    })
  });

  it('Create an image with large image URL', () => {
    const namespace = 'default';

    // create IMAGE
    image.goToCreate();
    image.setNameNsDescription(LARGE_IMAGE_NAME, namespace);
    image.setBasics({ url: LARGE_IMAGE_URL });

    cy.wrap(image.save()).then((realName) => {
      // check IMAGE state
      image.checkState_without_size({ name: LARGE_IMAGE_NAME });
    })
  });
})

/**
 * 1. Create image with invalid URL. e.g. - https://test.img
 * Expected Results
 * 1. Image state show as Failed
 */
describe('Create image with invalid URL - Rancher Mode', () => {
  const IMAGE_NAME = generateName('auto-image-invalid-url-test');

  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  it('Create image with invalid URL', () => {
    const namespace = 'default';

    // Navigation now works with Rancher URLs via extended class
    image.goToCreate();
    image.setNameNsDescription(IMAGE_NAME, namespace);
    image.setBasics({ url: 'http://download.invalid.net/test.img' });

    cy.wrap(image.save()).then((realName) => {
      // Validation methods work identically in Rancher mode
      image.censorInColumn(IMAGE_NAME, 3, namespace, 4, 'Failed', 2, { 
        timeout: constants.timeout.uploadTimeout 
      });
      image.censorInColumn(IMAGE_NAME, 3, namespace, 4, '0%', 7, { 
        timeout: constants.timeout.uploadTimeout 
      });

      // Delete works identically - uses search + action menu
      image.delete(namespace, realName as string, IMAGE_NAME);
    });
  });
})

/**
 * 1. create vm "vm-1"
 * 2. create a image "img-1" by export the volume used by vm "vm-1"
 * 3. delete vm "vm-1"
 * 4. delete image "img-1"
 * Expected Results
 * 1. image "img-1" will be deleted
 */
describe('Delete VM with exported image - Rancher Mode', () => {
  const IMAGE_NAME = generateName('img-exported-image');
  const VM_NAME = generateName('vm-exported-image');

  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  it('Delete VM with exported image', () => {
    const imageEnv = Cypress.env('image');
    const namespace = 'default';
    const volumes = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${imageEnv.name}`,
    }];

    // create VM
    vms.goToCreate();
    vms.setNameNsDescription(VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volumes);
    vms.save();

    // export IMAGE
    image.exportImage(VM_NAME, IMAGE_NAME, namespace);
    image.goToList();
    image.checkState({ name: IMAGE_NAME, size: '10 Gi' });

    // delete VM
    vms.delete(namespace, VM_NAME);

    cy.window().then(async (win) => {
      const imageList = (win as any).$nuxt.$store.getters['harvester/all'](HCI.IMAGE);
      const imageObj = imageList.find((I: any) => I.spec.displayName === IMAGE_NAME);
      const realName = imageObj?.metadata?.name || '';

      image.delete(namespace, realName, IMAGE_NAME);
    })
  });
})

/**
 * 1. create vm "vm-1"
 * 2. create a image "img-1" by export the volume used by vm "vm-1"
 * 3. delete vm "vm-1"
 * 4. update image "img-1" labels
 * Expected Results
 * 1. image "img-1" will be updated
 */
describe('Update image labels after deleting source VM - Rancher Mode', () => {
  const IMAGE_NAME = generateName('img-delete-vm');
  const VM_NAME = generateName('vm-delete-vm');

  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  it('Update image labels after deleting source VM', () => {
    const imageEnv = Cypress.env('image');
    const namespace = 'default';
    const volumes = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${imageEnv.name}`,
    }];

    // create VM
    vms.goToCreate();
    vms.setNameNsDescription(VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volumes);
    vms.save();
    vms.checkState({ name: VM_NAME, namespace });

    // export IMAGE
    image.exportImage(VM_NAME, IMAGE_NAME, namespace);

    // check IMAGE state
    image.goToList();
    image.checkState({ name: IMAGE_NAME, size: '10 Gi' });

    // delete VM
    vms.delete(namespace, VM_NAME);

    // edit IMAGE
    image.goToEdit(IMAGE_NAME);
    cy.window().then(async (win) => {
      const imageList = (win as any).$nuxt.$store.getters['harvester/all'](HCI.IMAGE);
      const imageObj = imageList.find((I: any) => I.spec.displayName === IMAGE_NAME);
      const realName = imageObj?.metadata?.name || '';

      image.setLabels({
        labels: {
          foo: 'foo',
          bar: 'bar'
        }
      });
      image.update(`${realName}`, `${namespace}`);
      image.delete(namespace, realName, IMAGE_NAME);
    })
  });
})

/**
 * 1. Upload ISO image to images page
 * 2. Create new vm with image using appropriate template
 * 3. Check State
 * Expected Results
 * 1. Image should upload.
 */
describe('Create a ISO image via upload - Rancher Mode', () => {
  const IMAGE_NAME = generateName('auto-image-iso-upload-test');
  const VM_NAME = generateName('auto-image-iso-test-vm');

  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  it('Create a ISO image via upload', () => {
    const namespace = 'default';

    // create IMAGE
    image.goToCreate();
    image.setNameNsDescription(IMAGE_NAME, namespace);
    image.setBasics({ path: 'fixtures/cirros-0.5.2-aarch64-disk.img' });

    cy.wrap(image.save({ upload: true })).then((realName) => {
      image.checkState({ name: IMAGE_NAME });

      // create VM
      const volumes = [{
        buttonText: 'Add Volume',
        create: false,
        image: `default/${IMAGE_NAME}`,
      }];

      vms.goToCreate();
      vms.setNameNsDescription(VM_NAME, namespace);
      vms.setBasics('1', '1');
      vms.setVolumes(volumes);
      vms.save();
      vms.checkState({ name: VM_NAME });

      // delete VM using deleteFromStore for uploaded image scenario
      vms.deleteFromStore(`${namespace}/${VM_NAME}`);

      // delete IMAGE using deleteFromStore for better reliability with uploaded images
      image.deleteFromStore(`${namespace}/${realName}`);
    })
  });
})

/**
 * https://harvester.github.io/tests/manual/_incoming/2562-clone-image/
 */
describe('Clone image - Rancher Mode', () => {
  const IMAGE_NAME = generateName('auto-image-test');
  const CLONED_NAME = generateName('cloned-image');
  const imageEnv = Cypress.env('image');
  const IMAGE_URL = imageEnv.url;
  let IMAGE_REAL_NAME: string, CLONED_IMAGE_REAL_NAME: string;

  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  it('Clone image', () => {
    const namespace = 'default';

    // Use glob pattern to match both standalone and Rancher API paths
    cy.intercept('POST', `**/v1/harvester/${HCI.IMAGE}s`).as('create');
    image.goToCreate();
    image.setNameNsDescription(IMAGE_NAME, namespace);
    image.setLabels({
      labels: { cloned: 'cloned' }
    });
    image.setBasics({ url: IMAGE_URL });

    cy.wrap(image.save()).then((realName) => {
      IMAGE_REAL_NAME = realName as string;
    })

    image.checkState({ name: IMAGE_NAME });
    image.clickAction(IMAGE_NAME, 'Clone');
    image.setNameNsDescription(CLONED_NAME, namespace);

    cy.wrap(image.save()).then((realName) => {
      CLONED_IMAGE_REAL_NAME = realName as string;
    })

    image.checkState({ name: CLONED_NAME });
    image.goToEdit(CLONED_NAME);
    image.clickTab('labels');

    cy.get('.tab-container .kv-item.value input[type="text"]').eq(1).should('have.value', CLONED_NAME);

    cy.wrap(null).then(() => {
      image.delete(namespace, IMAGE_REAL_NAME, IMAGE_NAME);
      image.delete(namespace, CLONED_IMAGE_REAL_NAME, CLONED_NAME);
    })
  });
})

/**
 * https://harvester.github.io/tests/manual/_incoming/2474-image-filtering-by-labels/
 */
describe('Image filtering by labels - Rancher Mode', () => {
  const imageEnv = Cypress.env('image');
  // has only one label
  const IMAGE_NAME_1 = generateName('auto-image-suse');
  // has only one label
  const IMAGE_NAME_2 = generateName('auto-image-ubuntu');
  // has two labels
  const IMAGE_NAME_3 = generateName('auto-image-both');
  const IMAGE_URL = imageEnv.url;
  const namespace = 'default';
  let IMAGE_REAL_NAME_1: string, IMAGE_REAL_NAME_2: string, IMAGE_REAL_NAME_3: string;

  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  it('Upload several images and add related label, add filter according to test plan 1', () => {
    // create the first one
    image.goToCreate();
    image.setNameNsDescription(IMAGE_NAME_1, namespace);
    image.setBasics({ url: IMAGE_URL });
    image.setLabels({
      labels: { suse_group: '1', harvester_e2e_test: 'harvester' }
    });
    cy.wrap(image.save()).then((realName) => {
      IMAGE_REAL_NAME_1 = realName as string
    })
    image.checkState({ name: IMAGE_NAME_1 });

    // create the second one
    image.goToCreate();
    image.setNameNsDescription(IMAGE_NAME_2, namespace);
    image.setLabels({
      labels: { ubuntu_group: '1', harvester_e2e_test: 'harvester' }
    });
    image.setBasics({ url: IMAGE_URL });
    cy.wrap(image.save()).then((realName) => {
      IMAGE_REAL_NAME_2 = realName as string
    })
    image.checkState({ name: IMAGE_NAME_2 });

    image.goToCreate();
    image.setNameNsDescription(IMAGE_NAME_3, namespace);
    image.setLabels({
      labels: { suse_group: '1', ubuntu_group: '1', harvester_e2e_test: 'harvester' }
    });
    image.setBasics({ url: IMAGE_URL });
    cy.wrap(image.save()).then((realName) => {
      IMAGE_REAL_NAME_3 = realName as string
    })
    image.checkState({ name: IMAGE_NAME_3 });

    // Can search specific image by name in the Harvester VM creation page
    vms.goToCreate();
    vms.clickTab('Volume')
    vms.image().search('auto-image-');
    cy.get('.vs__dropdown-menu').should('contain', IMAGE_NAME_1);
    cy.get('.vs__dropdown-menu').should('contain', IMAGE_NAME_2);
    cy.get('.vs__dropdown-menu').should('contain', IMAGE_NAME_3);

    // Can filter using One key without value
    image.goToList();
    image.filterByLabels({
      suse_group: null,
    })
    cy.get('tbody').should('contain', IMAGE_NAME_1);
    cy.get('tbody').should('contain', IMAGE_NAME_3);

    // Can filter using One key with value
    image.filterByLabels({
      suse_group: '1',
    })
    cy.get('tbody').should('contain', IMAGE_NAME_1);
    cy.get('tbody').should('contain', IMAGE_NAME_3);

    // Can filter using Two keys without value
    image.filterByLabels({
      suse_group: null,
      ubuntu_group: null
    })
    cy.get('tbody').should('contain', IMAGE_NAME_2);
    cy.get('tbody').should('contain', IMAGE_NAME_3);

    // Can filter using using Two keys and one key without value
    image.filterByLabels({
      suse_group: '1',
      ubuntu_group: null
    })
    cy.get('tbody').should('contain', IMAGE_NAME_2);
    cy.get('tbody').should('contain', IMAGE_NAME_3);

    // Can filter using Two keys both have values
    image.filterByLabels({
      suse_group: '1',
      ubuntu_group: '1'
    })
    cy.get('tbody').should('contain', IMAGE_NAME_2);
    cy.get('tbody').should('contain', IMAGE_NAME_3);

    // clear filtering labels
    image.filterByLabels()

    // delete images
    cy.wrap(null).then(() => {
      image.delete(namespace, IMAGE_REAL_NAME_1, IMAGE_NAME_1);
      image.delete(namespace, IMAGE_REAL_NAME_2, IMAGE_NAME_2);
      image.delete(namespace, IMAGE_REAL_NAME_3, IMAGE_NAME_3);
    })
  });
})

/**
 * https://harvester.github.io/tests/manual/_incoming/2563-image-naming-inline-css/
 */
describe('Image naming with inline CSS - Rancher Mode', () => {
  const imageEnv = Cypress.env('image');
  const IMAGE_NAME = '<strong><em>something_interesting</em></strong>';
  const IMAGE_URL = imageEnv.url;
  let name: string;

  beforeEach(() => {
    cy.login({
      username: 'admin',
      isRancher: true,
      url: replaceClusterId(PageUrl.virtualMachine),
    });
  });

  it('Create an image with valid image URL', () => {
    const namespace = 'default';

    // create IMAGE
    image.goToCreate();
    image.setNameNsDescription(IMAGE_NAME, namespace);
    image.setBasics({ url: IMAGE_URL });

    cy.wrap(image.save()).then((realName) => {
      name = realName as string;
    })
    // check IMAGE state
    image.checkState({ name: IMAGE_NAME });

    // edit IMAGE
    image.goToDetail({ name: IMAGE_NAME, ns: namespace });
    // Get the title name on the image details page
    cy.get('.resource-name').should('contain', IMAGE_NAME)

    // delete IMAGE
    cy.wrap(null).then(() => {
      image.delete(namespace, name, IMAGE_NAME)
    })
  });
})