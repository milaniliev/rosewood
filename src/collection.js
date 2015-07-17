let Promise = require('bluebird')

module.exports = class Collection {
  constructor (options) {
    this.url = options.url
    this.model = options.model
    this.models = []
  }

  fetch () {
    return new Promise( (resolve, reject) => {
      let request = new XMLHttpRequest()
      request.addEventListener('error', (error) => { reject(error) })
      request.addEventListener('load', () => {
        try {
          this.models = JSON.parse(request.responseText).map( (model_data) => {
            if(this.model){
              return new this.model(model_data)
            } else {
              return model_data
            }
          })
          resolve()
        }
        catch (error) {
          reject(error)
        }
      })
      request.addEventListener('error', (error) => {
        window.application.display_message('Error communication.')
      })
      request.open('get', this.url)
      request.send()
    })
  }

  get (id) {
    return this.models.find(function(model){ return(model.id === id) })
  }
}
