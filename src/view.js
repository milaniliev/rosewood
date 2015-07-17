let StateMachine = require('./state_machine.js')

module.exports = class View extends StateMachine {

  constructor(options = {}){
    super()
    Object.keys(options).forEach((key) => {
      this[key] = options[key]
    })
  }

  createElement(tag_name, attributes, content){
    let element = document.createElement(tag_name)
    Object.keys(attributes).forEach((attribute_name) => {
      element.setAttribute(attribute_name, attributes[attribute_name])
    })

    element.innerHTML = content
    return element
  }

  show(){
    this.element.style.display = ''
  }

  hide(){
    this.element.style.display = 'none'
  }
}
