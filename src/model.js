let Promise = require('bluebird')
let EventEmitter = require('eventemitter2').EventEmitter2

class Model extends EventEmitter {
  constructor(properties = {}){
    super()
    Object.keys(properties).forEach((key) => {
      this[key] = properties[key]
    })

    this.attribute_names = this.attribute_names || []

    this.attributes = this.attributes || {}
    this.attribute_names.forEach((attribute) => {
      this.register_attribute(attribute)
    })
  }

  register_attribute(attribute){
    Object.defineProperty(this, attribute, {
      set: (new_value) => {
        changes = {}
        changes[attribute] = {new: new_value, old: this.attributes[attribute]}
        this.emit('change', changes)
        this.attributes[attribute] = new_value
      },

      get: () => {
        return this.attributes[attribute]
      }
    })
  }

  fetch(filters) {
    return new Promise(function(resolve, reject){
      let request = new XMLHttpRequest()
      request.addEventListener('load', () => {
        let model_data = JSON.parse(request.responseText)
        let model = new this(model_data)
        resolve(model)
      })
      request.addEventListener('error', (error) => {
        reject(error)
      })
      request.open('get', this.url)
      request.send()
    })
  }


  save(){
    // TODO
  }
}


module.exports = Model
