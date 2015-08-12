let StateMachine = require('./state_machine.js')

module.exports = class View extends StateMachine {

  constructor(options = {}){
    super()
    Object.keys(options).forEach((key) => {
      this[key] = options[key]
    })
  }

  get model(){
    return this._model
  }

  set model(new_model){
    let old_model = this._model
    if(old_model){ old_model.off('change', this.model_changed) }
    new_model.on('change', this.model_changed)

    this._model = new_model
    this.emit('set_model')
  }

  model_changed(...args){
    this.emit('model:change', ...args)
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
