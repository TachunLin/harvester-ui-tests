import { Constants } from "@/constants/constants";

const constants = new Constants();

export default class TablePo {
  clickFlatListBtn() {
    cy.get('.btn-group button .icon-list-flat').parent().click();
  }

  clickFolderBtn() {
    cy.get('.btn-group button .icon-folder').parent().click();
  }

  /**
   * Vue tables render rows asynchronously after the list request resolves, so a single
   * DOM snapshot taken right afterwards can race a still-rendering table - including the
   * genuinely-empty case, which looks identical to "not rendered yet". Poll until the row
   * count is stable across two checks (or the timeout elapses) before scanning the table.
   */
  waitForTableReady(rowSelector = '[data-testid$="-row"]', timeout: number = constants.timeout.timeout) {
    const deadline = Date.now() + timeout;
    let lastCount = -1;

    const poll = () => {
      cy.get('body').then(($body) => {
        const count = $body.find(rowSelector).length;

        if (count === lastCount || Date.now() > deadline) {
          return;
        }

        lastCount = count;
        cy.wait(300);
        poll();
      });
    };

    poll();
  }
  
  /**
   * 
   * @param name: name
   * @param nameTdNum: name in the tr column
   * @param ns:  namespace
   * @param nsTdNum:  namespace in the tr column
   * @param nameSelector optional parameter for calibrating the coordinate of td
   * @returns the position of tr
   */
  find(name: string, nameTdNum: number, ns: string, nsTdNum: number, nameSelector?: string) {
    let resourceIndex:any;
    return new Cypress.Promise((resolve) => {
      let selector = `table > tbody > tr > td:nth-child(${nameTdNum})`

      selector = nameSelector ? `${selector} ${nameSelector}` : selector;
      cy.get(selector).each(($e1, index, $list) => {
        const nameText = $e1.text().trim();

        if(nameText === name) {
          cy.get(`tr td:nth-child(${nsTdNum})`)
            .eq(index)
            .then(function ($ns) {
              const nsText = $ns.text().trim();
              if (ns === nsText) {
                resourceIndex = index;
                expect(nsText).to.contains(ns);
                expect(nameText).to.contains(name);

                cy.wait(2000).then(() => {
                  resolve(resourceIndex)
                })
              }
            })
        }
        // TODO catch the situation of not found.
      })
    })
  }
}
