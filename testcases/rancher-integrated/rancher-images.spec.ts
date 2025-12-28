import { RancherPageUrl, PageUrl, replaceClusterId, Constants } from "@/constants/constants";
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { ImagePage } from "@/pageobjects/image.po";
import { generateName } from '@/utils/utils';
import { HCI } from '@/constants/types';

const constants = new Constants();

/**
 * Extended ImagePage for Rancher integrated mode
 * Overrides navigation methods to use dynamic clusterId instead of hardcoded /local/
 */
class RancherImagePage extends ImagePage {
  goToList() {
    cy.window().then(() => {
      const clusterId = Cypress.config('clusterId') || Cypress.env('clusterId');
      cy.task('log', `[goToList] Using clusterId: ${clusterId}`);
      // Rancher uses /k8s/clusters/{clusterId}/v1/harvester/... instead of just /v1/harvester/...
      cy.intercept('GET', `**/v1/harvester/${this.realType}s*`).as('goToList');
      cy.visit(`/harvester/c/${clusterId}/${this.type}`);
      cy.wait('@goToList');
    });
  }
  
  goToCreate() {
    this.goToList();
    cy.get(this.actionButton).click();
  }

  goToEdit(name: string) {
    this.goToList();
    this.clickAction(name, 'Edit Config');
  }

  // Override save() to use Rancher-compatible API pattern
  public save({ upload, edit, depth = 0 }: { namespace?: string, buttonText?: string, upload?: boolean; edit?: boolean; depth?: number; } = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const interceptName = generateName('create');

      // Use ** pattern to match Rancher's /k8s/clusters/{clusterId}/v1/harvester/... path
      cy.intercept(edit ? 'PUT' : 'POST', `**/v1/harvester/harvesterhci.io.virtualmachineimages${upload ? '/*' : edit ? '/*/*' : ''}`).as(interceptName);
      cy.get('.cru-resource-footer').contains(!edit ? 'Create' : 'Save').click();
      cy.wait(`@${interceptName}`).then(async (res) => {
        if (edit && res.response?.statusCode === 409 && depth === 0) {
          await this.save({ upload, edit, depth: depth + 1 })
        } else {
          expect(res.response?.statusCode, `Check save success`).to.equal(edit ? 200 : 201);
          resolve(res.response?.body?.metadata?.name || '');
        }
      })
        .end();
    });
  }

  // Override delete() to use Rancher-compatible navigation and API pattern
  public delete(namespace: any, name: string, displayName?: string) {
    const clusterId = Cypress.config('clusterId') || Cypress.env('clusterId');
    cy.visit(`/harvester/c/${clusterId}/${this.type}`);

    this.clickAction(displayName || name, 'Delete');

    let id = '';

    if (!namespace) {
      id = name;
    } else {
      id = `${namespace}/${name}`;
    }

    // Use ** pattern to match Rancher's API path
    cy.intercept('DELETE', `**/v1/harvester/${this.realType}s/${id}*`).as('delete');
    cy.get(this.confirmRemove).contains('Delete').click();
    cy.wait('@delete').then(res => {
      cy.window().then((win) => {
        this.checkDelete(this.storeType as string, id);
        expect(res.response?.statusCode, `Delete ${this.type}`).to.be.oneOf([200, 204]);
      });
    });
  }
}

/**
 * Extended VmsPage for Rancher integrated mode
 * Overrides navigation methods to use dynamic clusterId instead of hardcoded /local/
 */
class RancherVmsPage extends VmsPage {
  goToList() {
    cy.window().then(() => {
      const clusterId = Cypress.config('clusterId') || Cypress.env('clusterId');
      cy.task('log', `[goToList] Using clusterId: ${clusterId}`);
      // Rancher uses /k8s/clusters/{clusterId}/v1/harvester/... instead of just /v1/harvester/...
      cy.intercept('GET', `**/v1/harvester/${this.realType}s*`).as('goToList');
      cy.visit(`/harvester/c/${clusterId}/${this.type}`);
      cy.wait('@goToList');
    });
  }
  
  goToCreate() {
    this.goToList();
    cy.get(this.actionButton).click();
  }

  goToEdit(name: string) {
    this.goToList();
    this.clickAction(name, 'Edit Config');
  }
}

// Use Rancher-aware page objects
const vms = new RancherVmsPage();
const image = new RancherImagePage();

// describe("Basic Rancher integrated mode test", () => {
//   it("Access Harvester in Rancher virtualization management", () => {

//     // Direct login with PageUrl constant - should automatically replace /local/ with clusterId
//     cy.login({
//       username: 'admin',
//       isRancher: true,
//       url: PageUrl.clusterMember,
//     });

//     // Navigate to Virtual Machine page after Rancher login
//     cy.then(() => {
//       const vmUrl = replaceClusterId(PageUrl.virtualMachine);
//       cy.task('log', `=== Navigating to VM page: ${vmUrl} ===`);
//       cy.visit(vmUrl);
      
//       // Verify we're on the Virtual Machine page
//       cy.get('.initial-load-spinner', { timeout: constants.timeout.maxTimeout })
//       cy.then(() => {
//         const clusterId = Cypress.config('clusterId');
//         cy.url().should('include', `/harvester/c/${clusterId}/kubevirt.io.virtualmachine`);
//         cy.task('log', `=== Successfully navigated to VM page with clusterId: ${clusterId} ===`);
//       });
//     });
//   })
// })

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

// /**
//  * 1. Create image with cloud image available for openSUSE
//  * 2. Click save
//  * 3. Try to edit the description
//  * 4. Try to edit the URL
//  * 5. Try to edit the Labels
//  * Expected Results
//  * 1. Image should show state as Active
//  * 2. Image should show progress as Completed
//  * 3. User should be able to edit the description and Labels
//  * 4. User should not be able to edit the URL
//  * 5. User should be able to create a new image with same name
//  */
// describe('Create an image with valid image URL - Rancher Mode', () => {
//   const imageEnv = Cypress.env('image');
//   const IMAGE_NAME = generateName('auto-image-valid-url-test');
//   const IMAGE_URL = imageEnv.url;

//   beforeEach(() => {
//     cy.login({
//       username: 'admin',
//       isRancher: true,
//       url: replaceClusterId(PageUrl.virtualMachine),
//     });
//   });

//   it('Create an image with valid image URL', () => {
//     const namespace = 'default';

//     // Create IMAGE with labels
//     image.goToCreate();
//     image.setNameNsDescription(IMAGE_NAME, namespace);
//     image.setBasics({ url: IMAGE_URL });
//     image.setLabels({
//       labels: {
//         foo: 'foo',
//         bar: 'bar'
//       }
//     });

//     cy.wrap(image.save()).then((realName) => {
//       // Check IMAGE state
//       image.checkState({ name: IMAGE_NAME });

//       // Edit IMAGE - verify URL is disabled
//       image.goToEdit(IMAGE_NAME);
//       image.name().self().find('input').should('be.disabled');
//       image.url().self().find('input').should('be.disabled');
//       image.setLabels({
//         labels: {
//           edit: 'edit'
//         }
//       });
//       image.update(`${realName}`, `${namespace}`);

//       // Delete IMAGE
//       image.delete(namespace, realName as string, IMAGE_NAME);
//     });

//     // Create IMAGE with the same name - should succeed
//     image.goToCreate();
//     image.setNameNsDescription(IMAGE_NAME, namespace);
//     image.setBasics({ url: IMAGE_URL });
//     cy.wrap(image.save()).then((realName) => {
//       // Check IMAGE state
//       image.checkState({ name: IMAGE_NAME });

//       // Delete IMAGE
//       image.delete(namespace, realName as string, IMAGE_NAME);
//     });
//   });
// })