let Promise = require('bluebird')
let EventEmitter = require('eventemitter2').EventEmitter2

class Model extends EventEmitter {
  constructor(properties = {}){
    super()

    this.constructor.attributes.forEach((attribute) => {
      this.register_attribute(attribute)
    })

    this.attributes = this.attributes || {}

    Object.keys(properties).forEach((key) => {
      this[key] = properties[key]
    })
  }

  register_attribute(attribute){
    Object.defineProperty(this, attribute, {
      get: () => {
        return this.attributes[attribute]
      },

      set: (new_value) => {
        let old_value = this.attributes[attribute]
        if(old_value !== new_value){
          let changes = {}
          changes[attribute] = {new: new_value, old: old_value}
          this.emit('change', changes)
          this.attributes[attribute] = new_value
        }
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
}


module.exports = Model
