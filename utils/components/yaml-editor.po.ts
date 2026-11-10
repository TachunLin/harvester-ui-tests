import ComponentPo from './component.po';

export default class YamlEditorPo extends ComponentPo {
  input(string: string | undefined) {
    if (string) {
      // CodeMirror 6: type into the contenteditable instead of using the v5 instance API
      this.self()
          .find('.cm-content')
          .first()
          .click()
          .type('{selectall}{backspace}')

      this.self()
          .find('.cm-content')
          .first()
          .type(string, {
            parseSpecialCharSequences: false,
          })
    }

    return
  }
}
