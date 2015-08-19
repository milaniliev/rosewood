let Promise = require('bluebird')
let EventEmitter = require('eventemitter2').EventEmitter2
let Sync = require('./sync.js')

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
          this.attributes[attribute] = new_value
          this.emit('change', changes)
        }
      }
    })
  }

  refresh(callback) {
    return Sync.request('GET', this.url).then((data) => {
      Object.keys(data).forEach((data_key) => {
        this[data_key] = data[data_key]
      })

      if(callback){
        callback()
      }
    }).catch((error) => {
      if(callback){
        callback(error)
      } else {
        throw error
      }
    })
  }

  create(callback) {
    return Sync.request('POST', this.collection_url, this.attributes).then((data) => {
      Object.keys(data).forEach((data_key) => {
        this[data_key] = data[data_key]
      })

      if(callback){
        callback()
      }
    }).catch((error) => {
      if(callback){
        callback(error)
      } else {
        throw error
      }
    })
  }


  update(callback) {
    return Sync.request('PATCH', this.url, this.attributes).then((data) => {
      Object.keys(data).forEach((data_key) => {
        this[data_key] = data[data_key]
      })

      if(callback){
        callback()
      }
    }).catch((error) => {
      if(callback){
        callback(error)
      } else {
        throw error
      }
    })
  }

  delete(callback) {
    return Sync.request('DELETE', this.url, this.attributes).then(() => {

      if(callback){
        callback()
      }
    }).catch((error) => {
      if(callback){
        callback(error)
      } else {
        throw error
      }
    })
  }



}

module.exports = Model
