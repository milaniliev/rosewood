var app = require('express')()


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

app.listen(1024)
