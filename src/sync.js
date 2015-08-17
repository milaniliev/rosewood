module.exports = {
  request: function(url, request_data = null){
    return new Promise(function(resolve, reject){
      let http_request = new XMLHttpRequest()
      http_request.addEventListener('load', () => {
        if(http_request.status == 200){
          let data = JSON.parse(http_request.responseText)
          resolve(data)
        } else {
          reject(`Request returned ${http_request.status}`)
        }
      })
      http_request.addEventListener('error', (error) => {
        reject(error)
      })
      http_request.open('get', url)
      if (request_data) {
        http_request.setRequestHeader("Content-Type", "application/json")
        http_request.send(JSON.stringify(request_data))
      } else {
        http_request.send()
      }
    })
  }
}
