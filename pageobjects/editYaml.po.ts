import { Constants } from "../constants/constants";
const yaml = require('js-yaml');
import YAML from 'yaml'
import cypress from "cypress";
const constants = new Constants();
export class EditYamlPage {
    private yamlInput = '.CodeMirror';
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
        // this.parseYaml();
        cy.get(this.yamlInput).should('be.visible').then((editor) => {
            // codemirror API: https://codemirror.net/5/doc/manual.html
            const cm = editor[0].CodeMirror;

            // Wait for CodeMirror to be ready
            cy.wrap(null).then(() => {
                cm.focus();
                cy.wait(100); // Small wait for focus to take effect
            }).then(() => {
                cm.setCursor(5, 0); // CodeMirror uses 0-based indexing for lines
                cm.execCommand('goLineEnd'); // Move cursor to the end
                cm.execCommand('newlineAndIndent'); // Insert a newline and auto-indent the new line.
                cm.replaceSelection(customNameAnnotation);
            });
          });
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