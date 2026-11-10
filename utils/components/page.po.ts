import type { CypressChainable } from '@/utils/po.types'
import ComponentPo from './component.po';

export class Navbar {
  public static get DashboardBtn(): CypressChainable {
    return cy.get("nav a").contains("Dashboard")
  }

  public static get HostsBtn(): CypressChainable {
    return cy.get("nav a").contains(/^Hosts$/)
  }

  public static get VirtualMachinesBtn(): CypressChainable {
    return cy.get("nav a").contains("Virtual Machines")
  }

  public static get VolumesBtn(): CypressChainable {
    return cy.get("nav a").contains("Volumes")
  }

  public static get ImagesBtn(): CypressChainable {
    return cy.get("nav a").contains("Images")
  }

  public static get NamespacesBtn(): CypressChainable {
    return cy.get("nav a").contains("Namespaces")
  }

  public static get AdvancedToggle(): CypressChainable {
    return cy.get("nav .header").contains("Advanced").siblings("i.toggle")
  }

  public static get TemplatesBtn(): CypressChainable {
    return Navbar.AdvancedToggle.click().get("nav a").contains("Templates")
  }

  public static get BackupsBtn(): CypressChainable {
    return Navbar.AdvancedToggle.click().get("nav a").contains("Backups")
  }

  public static get NetworksBtn(): CypressChainable {
    return Navbar.AdvancedToggle.click().get("nav a").contains("Networks")
  }

  public static get SSHKeysBtn(): CypressChainable {
    return Navbar.AdvancedToggle.click().get("nav a").contains("SSH Keys")
  }

  public static get CloudConfigTemplateBtn(): CypressChainable {
    return Navbar.AdvancedToggle.click().get("nav a").contains("Cloud Config Template")
  }

  public static get SettingsBtn(): CypressChainable {
    return Navbar.AdvancedToggle.click().get("nav a").contains("Settings")
  }

  public static get SupportLink(): CypressChainable {
    return cy.get("nav> .footer a").contains("Support")
  }

  public static get versionText(): CypressChainable {
    return cy.get("nav> .footer .version")
  }

  public static get LangBtn(): CypressChainable {
    return cy.get("nav> .footer .trigger")
  }

  /**
   * 
   * @param navName Menu name
   * @param matchUrl The url that is expected to match
   * @param listPageHeaderText The title of the page
   * @param parentNavs Menu Path
   * @param exact Exact match of text
   */
  clickMenuNav(navName: string, matchUrl: string, listPageHeaderText: string, parentNavs: Array<string> = [], exact: boolean = true) {
    const groupHeader = (name: string) => `.accordion-item > .header[aria-label="${name}"]`;

    if (parentNavs.length === 0) {
      cy.get("nav a").contains(new RegExp("^" + navName + "$")).click();
      cy.location().should(loc => {
        const deleteHash = loc.href.replace(loc.hash, '');
        expect(deleteHash).to.eq(`${this.basePath()}/${matchUrl}`)
      })

      cy.wait(2000);
      cy.get('a').parentsUntil('body').find('main .outlet header h1').should('be.visible').invoke('text').then((_text) => {
        expect(_text.trim()).eq(listPageHeaderText)
        cy.log(`${navName} Nav go to the correct page and display it`)
      });
    } else {
      // The menu groups can re-collapse asynchronously after a navigation, so each step re-reads the
      // current state: expand the first collapsed group, or click the leaf once the whole path is expanded
      const clickLeaf = (attempt: number) => {
        cy.get('nav').then(($nav) => {
          const collapsed = parentNavs.find((name) => $nav.find(groupHeader(name)).attr('aria-expanded') !== 'true');

          if (collapsed) {
            $nav.find(groupHeader(collapsed)).siblings('.toggle-accordion')[0]?.click();
          } else {
            const $leaf = $nav.find(groupHeader(parentNavs[parentNavs.length - 1])).closest('.accordion').find('ul.body a').filter((_, el) => {
              const text = (el.textContent || '').trim();
              return text.startsWith(navName) && /^\d*$/.test(text.slice(navName.length).trim());
            });

            if ($leaf.length) {
              $leaf[0].click();
              return;
            }
          }

          expect(attempt, `menu path "${parentNavs.join(' > ')} > ${navName}" is displayed`).to.be.lessThan(20);
          cy.wait(300); // backoff to let the menu finish re-rendering
          clickLeaf(attempt + 1);
        });
      };
      clickLeaf(0);

      cy.location().should(loc => {
        const deleteHash = loc.href.replace(loc.hash, '');
        expect(deleteHash).to.eq(`${this.basePath()}/${matchUrl}`)
      })

      cy.wait(2000); // when clicking a secondary menu item, the menu may jump to the first item
      cy.get('main .outlet header h1').should('be.visible').invoke('text').then((_text) => {
        if (exact) {
          expect(_text.trim()).eq(listPageHeaderText);
        } else {
          expect(_text.trim()).include(listPageHeaderText);
        }
        cy.log(`${navName} Nav go to the correct page and display it`);
      });
    }
  }

  basePath() {
    return Cypress.env('NODE_ENV') === 'dev' ? Cypress.env('baseUrl') : `${Cypress.env('baseUrl')}/dashboard`;
  }
}

class Header {
  public static get userBtn(): CypressChainable {
    return cy.get('header [data-testid="nav_header_showUserMenu"]')
  }

  public static get nameSpaceBtn(): CypressChainable {
    return cy.get("header .ns-dropdown")
  }

  public static logout() {
    Header.userBtn.click().get('[role="menuitem"]').contains("Log Out").click()
  }

  public static findNamespace(ns: string) {
    // Click the namespace filter dropdown
    cy.get('.top').find('.ns-filter').click();
    // Find the namespace in the dropdown list items
    cy.get(`.ns-dropdown-menu .ns-options #ns_${ns} .ns-item div`).contains(ns);
    // click to collapse the dropdown list
    cy.get('.top').find('.ns-filter .ns-values').click({ force: true });
  }
}

export default class PagePo extends ComponentPo {
  public static nav = Navbar;
  public static header = Header;

  constructor(private path: string, selector: string = '.dashboard-root') {
    super(selector);
  }

  static goTo(path: string): Cypress.Chainable<Cypress.AUTWindow> {
    return cy.visit(path);
  }

  goTo(): Cypress.Chainable<Cypress.AUTWindow> {
    return PagePo.goTo(this.path);
  }

  isCurrentPage(exact: boolean = true): Cypress.Chainable<boolean> {
    return cy.url().then(url => {
      const targetUrl = Cypress.env('baseUrl') + this.wrapPath(this.path)
      return exact ? url === targetUrl : url.includes(targetUrl);
    });
  }

  checkIsCurrentPage(exact: boolean = true) {
    return this.isCurrentPage(exact).should('eq', true);
  }

  wrapPath(path: string) {
    const isDev = Cypress.env('NODE_ENV') === 'dev';
    let url = path;
    if (!isDev) {
      url = `/dashboard${path}`;
    }

    return url
  }

  basePath() {
    return Cypress.env('NODE_ENV') === 'dev' ? Cypress.env('baseUrl') : `${Cypress.env('baseUrl')}/dashboard`;
  }
}
