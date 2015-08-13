<img src="rosewood.png" style="display:block;" alt="rosewood"/>
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
  Rosewood = require('rosewood') // if not using Browserify or other CommonJS system

  var Model = Rosewood.Model

  class Person extends Model {

    constructor(attributes){
      super(attributes)
      this.attribute_names = ['first_name, last_name']
    }

    get url(){
      return "/people/" + this.id.toString()
    }

    full_name(){
      return this.first_name + " " + this.last_name
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

  class PersonForm extends Rosewood.View {
    constructor(options){
      super(options)

      this.element.innerHTML = `
        <label name="full_name"></label>
        <input type="text" name="first_name"/>
        <input type="text" name="last_name" />
      `

      this.first_name_field = this.element.querySelector('[name=first_name]')
      this.last_name_field  = this.element.querySelector('[name=last_name]' )

      this.full_name_label  = this.element.querySelector('[name=full_name]' )


      var view = this // event listeners change the value of `this`; this gets around that.
                  // Alternatively, use the ES6 "=>" syntax.

      // Whenever this view gets a new model, update the display
      this.on('set_model', function() {
        view.full_name_label.textContent = model.full_name()

        view.first_name_field.value = view.model.first_name
        view.last_name_field.value  = view.model.last_name
      })

      // If the model's first_name attribute is changed, update the corresponding field
      this.on('model:change:first_name', function(changes) {
        view.first_name_field.value = model.first_name
      })

      // Advanced logic: only update the field if the model has changed and the user hasn't entered anything.
      this.on('model:change:last_name', function(changes) {
        if(changes.old === view.last_name_field.value){view.first_name_field.value = view.model.last_name}
      })

      // Whenever the first or last name are changed, update the full_name_label
      this.on('model:change', function(changes) {
        if(changes.first_name || changes.last_name){ view.full_name_label.textContent = view.model.full_name() }
      })

      // If the first or last_name fields have had anything typed into them,
      // update the corresponding model attribute
      this.first_name_field.addEventListener('change', function() {
        view.model.first_name = view.first_name_field.value
      })

      this.last_name_field.addEventListener('change', function() {
        view.model.last_name  = view.last_name_field.value
      })
    }
  }

  var abbreviated_person_display = new PersonForm({
    element: document.getElementById('person_short')
  })
```

#### view.element

The `HTMLElement` the View uses to represent itself on the page.

#### view.model

The `Rosewood.Model` instance the view represents (optional).

#### view.on('set_model', function(){ ... })

An event emitted whenever a view gets assigned a new model.

#### view.on('model:change', function(changes){ ... })

A proxy event emitted whenever `view.model` emits a `change` event. The callback parameter is the same as `model.on('change')`

#### view.on('model:change:&lt;attribute&gt;', function(changes){ ... })

A proxy event emitted when `view.model` emits a `change:<attribute>` event. The callback parameter is the same as `model.on('change:<attribute>')`

#### view.hide()

Hides `view.element` using `element.style.display = 'none'`.

#### view.show()

Un-hides `view.element` using `element.style.display = ''`.
