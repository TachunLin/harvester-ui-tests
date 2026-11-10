import { Constants } from "../constants/constants";
const yaml = require('js-yaml');
import YAML from 'yaml'
import cypress from "cypress";
const constants = new Constants();
export class EditYamlPage {
    private yamlInput = '.CodeMirror';
    private yamlContent = '.cm-content';
    private yamlLine = '.cm-content .cm-line';
    private codeTextArea = '.CodeMirror-code'
    private saveButton = 'Save';
    private cancelButton = 'Cancel';
    private yamlText: string = "";
    private yamlOutput = ""
    
    private clearYaml() {
        cy.get(this.yamlInput)
        .first()
        .then((editor) => {
        //   editor[0].CodeMirror.setValue('');
        });
    }

    private parseYaml() {
        cy.get(this.yamlInput).invoke('text').then((text) => {
            this.yamlText = yaml.load(text);
        });
        console.log(this.yamlText);
        return this.yamlText;
    }

    public insertCustomName(customName:string) {
        const customNameAnnotation = `harvesterhci.io/host-custom-name: ${customName}`;
        // CodeMirror 6: click the end of an annotation line, then type a new auto-indented line
        cy.get(this.yamlLine).should('have.length.greaterThan', 6);
        cy.get(this.yamlLine).eq(5).click('right');
        cy.get(this.yamlContent).type(`{end}{enter}${customNameAnnotation}`, { delay: 0 });
        cy.get(this.yamlContent).should('contain.text', customNameAnnotation);
    }


    public parseYamlFile() {
        cy.readFile('fixtures/harvester-master.yaml').then((str) => {
            let temp = yaml.load(str);
            // let temp = YAML.parse(str);
            temp.metadata.annotations["harvesterhci.io/host-custom-name"] = 'Test Custom Name'
            cy.writeFile('fixtures/temp.json', temp);
            let temp2 = yaml.dump(temp);
            cy.writeFile('fixtures/temp.yaml', temp2);
            // YAML.
            // this.yamlText = temp;
        })
        console.log(this.yamlText);
    }

    public clickSaveWhenReady() {
        cy.contains('button', this.saveButton)
          .should('not.be.disabled')
          .click();
    }

}