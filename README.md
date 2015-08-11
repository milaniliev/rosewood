# Rosewood

A super-simple Model/View/Collection library for the browser.

Rosewood's goal is to supply just enough code so you don't need to re-write boilerplate MVC code. Rosewood requires EcmaScript 5+, because it heavily relies on getters/setters, but has no other dependencies. (A non-ES5 alternative is [http://backbonejs.org])

## Install
### Browserify / other NPM-based:

`npm install --save rosewood`

### Browser standalone:

Download `rosewood.js` and include it:

```html
<script type="application/javascript" src="rosewood.js"></script>
```

## Usage

### Rosewood.Model

```javascript
  // Using ES6 class syntax
  Rosewood = require('rosewood')

  var Model = Rosewood.Model

  class Person extends Model {

    constructor(attributes){
      super(attributes)
      this.attribute_names = ['first_name, last_name']
    }

    get url: function(){
      return "/people/" + this.id.toString()
    }
  }

  var bob = new Person({first_name: "Bob", last_name: "Robson"})
```

#### model.attribute_names

Set `attribute_names` to the list of properties of the model that make up its data.

#### model.on('change', function({&lt;attribute&gt;: {new: ..., old: ...}, ...} ){ ... })

The `change` event fires on a model whenever any of the `attributes` is modified.
The callback gets an object that lists new and old values for each changed attribute.

```javascript
  bob.on('change', function(changes){
    console.log(changes.first_name.old, changes.first_name.new)
  })

  bob.first_name = "Robert" // logs "Bob", "Robert"
```

#### model.on('change:&lt;attribute&gt;', function({new: ..., old: ... }){ ... })

The `change:<attribute_name>` event fires on a model whenever `<attribute>` is modified.
The callback is passed an object with the new and old value of `<attribute>`.

```javascript
  bob.on('change:first_name', function(changes){
    console.log(changes.old, changes.new)
  })

  bob.first_name = "Robert" // logs "Bob", "Robert"
```

#### model.create()

Sends a create request to a REST API.

```javascript
var bob = new Person({first_name: "Bob", last_name: "Robson"})

bob.create()
```

This will send an HTTP request like:

```
Method: POST
URL: /people
Headers: {Content-Type: application/json}
Body:    {"first_name": "Bob", "last_name": "Robson"}
```

It expects a response like:

```
Status:  200 OK
Headers: {Content-Type: application/json}
Body:    {"id": 1, "first_name": "Bob", "last_name": "Robson"}
```

#### model.update()

Sends a update request to the model's REST API.

This will make an HTTP request like:

```
Method: PATCH
URL: /people
Headers: {Content-Type: application/json}
Body:    {"id": 1, "first_name": "Bob", "last_name": "Robson"}
```

It expects a response like:

```
Status:  200 OK
Headers: {Content-Type: application/json}
Body:    {"id": 1, "first_name": "Bob", "last_name": "Robson"}
```

#### model.delete()

Will send a remove request to the model's REST API.

It sends a request like:

```
Method: DELETE
URL: /people/1
```

It expects a response like:

```
Status:  200 OK
```

### Rosewood.Collection

The Collection class represents a group of models. It could be every model of a type (all Person models), or a subset(all Person models with age >= 16)

```javascript
  // Continuing the above example code
  var people = new Rosewood.Collection({url: '/people', model: Person})
```

#### collection.fetch()

Gets new collection models from a REST API.


```javascript
  people.fetch()
```

This will send an HTTP request like:

```
Method: GET
URL: /people
Headers: {Content-Type: application/json}
```

It expects a response like:

```
Status:  200 OK
Headers: {Content-Type: application/json}
Body:    [{"id": 1, "first_name": "Bob", "last_name": "Robson"}, {"id": 2, "first_name": "John", "last_name": "Jackson"}]
```

After, `collection.models` will contain instances of `collection.model` that match the received data.

#### collection.get(id)

Returns the model with id `id`, or `null` if none is found.

```javascript
  people.get(1) // returns the Person instance with id 1
```

#### collection.store()

Will make one HTTP request per model that has been modified. (It essentially calls model.sync() on each model.)

```javascript
  people.add(new Person({first_name: "Mike", las_name: "Mitchell"}))
  people.get(1).last_name = "Roberts"
  people.remove(people.get(2))
  people.store()
```

Will send requests like:

```
POST   /people   {"first_name": "Mike", "last_name": "Mitchell"}
PATCH  /people/1 {"last_name": "Roberts"}
DELETE /people/1
```

#### collection.sync()

Effectively a combination of collection.store() and collection.fetch(). It will sync all existing models and fetch any new ones.

#### collection.on('change', function({changed: [...], added: [...], removed: [...]}){ ... })

An event that's emitted any time a model in the collection changes, a model is added, or a model is removed. The callback function is passed an object containing three keys: `{added: [...], changed: [...], removed: [...]}`, which contain the models that have changed in those ways.

#### collection.add(model)

Add a model to the collection. The collection will emit an `add` event.

#### collection.on('add', function(added_models){ ... })

An event emitted whenever one or more models are added to the collection. The callback function is passed an array of added models.

#### collection.remove(model)

Remove a model from the collection. The collection will emit a `remove` event. Calling `collection.sync()` will send a `DELETE` HTTP request to `collection.url` (by calling `model.delete()`).

#### collection.on('remove', function(removed_models){ ... })

An event emitted whenever one or more models are removed the collection. The callback function is passed an array of added models.

### Rosewood.View

```javascript
  Rosewood = require('rosewood')

  class ShortPersonView extends Rosewood.View {
    constructor(options){
      super(options)

      this.first_name_field = this.element.querySelector('[name=first_name]')
      this.last_name_field  = this.element.querySelector('[name=last_name]' )

      this.on('model:change ', function(model){
        this.first_name_field.value = model.first_name
        this.last_name_field.value  = model.last_name
      })

      this.first_name_field.addEventListener('change', function(){
        this.model.first_name = this.first_name_field.value
      })

      this.last_name_field.addEventListener('change', function(){
        this.model.last_name = this.last_name_field.value
      })
    }
  }

  var abbreviated_person_display = new ShortPersonView({
    element: document.getElementById('person_short'),
    template: `
      <label name="first_name"></label>
      <label name="last_name" ></label>
    `
  })
```

#### view.element

The `HTMLElement` the View uses to represent itself on the page.

#### view.template

The HTML contents of the View. A plain string; will be used as `view.element.innerHTML`.

#### view.model

The `Rosewood.Model` instance the view represents (optional).

#### view.on('model:change', function(changes){ ... })

A proxy event emitted whenever `view.model` emits a `change` event. The callback parameter is the same as `model.on('change')`

#### view.on('model:change:&lt;attribute&gt;')

A proxy event emitted when `view.model` emits a `change:<attribute>` event. The callback parameter is the same as `model.on('change:<attribute>')`
