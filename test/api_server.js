var express = require('express')
var app = express()
app.use(express.static(__dirname + '/', {index: "index.html"}))
app.use(express.static(__dirname + '/..')) // to serve rosewood.js

app.get('/people/1', function(request, response){
  response.json({
    id: 1,
    first_name: "Bob",
    last_name: "Roberts"
  })
})

app.patch('/people/1', function(request, response){
  response.json({
    id: 1,
    first_name: "Bob",
    last_name: "Roberts"
  })
})

app.post('/people', function(request, response){
  response.json({
    id: 1,
    first_name: "Bob",
    last_name: "Roberts"
  })
})

app.delete('/people/1', function(request, response){
  response.status(200).end()
})

app.listen(1024, function(){
  console.log("Test server listening on http://localhost:1024")
})
