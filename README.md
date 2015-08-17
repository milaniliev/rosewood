# Rosewood

<img src="rosewood.png" style="display:block;" alt="rosewood"/>

A super-simple Model/View/Collection library for the browser.

* <a href="#install">Install</a>
* <a href="#usage">Usage</a>
  * <a href="#rosewoodmodel">Rosewood.Model</a>
  * <a href="#rosewoodcollection">Rosewood.Collection</a>
  * <a href="#rosewoodview">Rosewood.View</a>
  * <a href="#rosewoodstatemachine">Rosewood.StateMachine</a>

Rosewood's goal is to supply just enough code so you don't need to re-write boilerplate MVC code. Rosewood requires EcmaScript 5+, because it heavily relies on getters/setters, but has no other dependencies. (A non-ES5 alternative is [http://backbonejs.org])

## Install
#### Browserify / NPM:

`npm install --save rosewood`

In your script:

```javascript
  Rosewood = require('rosewood')
```

#### Browser standalone:

Download `rosewood.js` and include it:

```html
<script type="application/javascript" src="rosewood.js"></script>
```

## Usage

### Rosewood.Model

```javascript
  // Using ES6 class syntax
  class Person extends Rosewood.Model {
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

Set `attribute_names` to the list of properties of the model that make up its data. These are the properties that will be synched with the model's API, and `change` events will be emitted when any of them change.


#### model.id

`model.id` is a special property used by `Rosewood.Collection` to determine whether a model is the same as another.

For example, if a collection contains `[{id: 1, first_name: "Bob"}]`, running
```javascript
  collection.update([{id: 1, first_name: "Steve"}, {id: 2, first_name: "Bob"}])
```
will result in the collection containing `[{id: 1, first_name: "Steve"}, {id:2, first_name: "Bob"}]`

#### model.on('change')

```javascript
model.on('change', function({attribute1: {new: ..., old: ...}, attribute2: {new: ..., old: ...}){ ... })
```

The `change` event fires on a model whenever any of the `attributes` is modified.
The callback gets an object that lists new and old values for each changed attribute.

```javascript
  bob.on('change', function(changes){
    console.log(changes.first_name.old, changes.first_name.new)
  })

  bob.first_name = "Robert" // logs "Bob", "Robert"
```

#### model.sync()
```javascript
model.sync(function callback(error){})
// or
model.sync() => Promise
```

Synchronizes the model with its backing API.

* If the model has never been synched with its API since creation, will call `model.create()`
* If the model has been synched but has been changed since, it will call `model.update()`
* If the model has been synched and has not been changed since, it will call `model.refresh()`

Calls `model.create()`, `model.update()`, based on whether the model has been previously synced with (or retrieved from) its backing API, or `model.refresh()` if the model hasn't been changed since the last sync.

`model.sync()`, `model.refresh()`, `model.create()`, `model.update()`, and `model.delete()` are all asynchronous, and can be either called with a callback function or will return a Promise (specifically, https://github.com/petkaantonov/bluebird).

#### model.refresh()

```javascript
model.refresh(function callback(error){})
// or
model.refresh() => Promise
```

Gets the latest model attributes from the model's API.

```javascript
var bob = new Person({id: 1})
bob.refresh()
```

This will send an HTTP request like:

```
Method: GET
URL: /people/1
```

It expects a response like:

```
Status:  200 OK
Headers: {Content-Type: application/json}
Body:    {"id": 1, "first_name": "Bob", "last_name": "Robson"}
```

Refresh will overwrite any local changes made to the model that haven't been synchronized with the API yet. If you'd rather do an intelligent sync, try `model.sync()`

#### model.create()
```javascript
 model.create(function callback(error){})
// or
model.create() => Promise
```

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
```javascript
model.update(function callback(error){})
// or
model.create() => Promise
```

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
```javascript
model.delete(function callback(error){})
// or
model.delete() => Promise
```


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

#### collection.refresh()
```javascript
collection.refresh(function callback(error){})
// or
collection.refresh() => Promise
```

Gets new collection models from a REST API.


```javascript
  people.refresh()
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

After, `collection.models` will contain instances of `collection.model` that match the received data. It will merge any existing models (based on id) and

#### collection.get(id)
```javascript
collection.get(id) => Model
```

Returns the model with id `id`, or `null` if none is found.

```javascript
  people.get(1) // returns the Person instance with id 1
```

#### collection.store()
```javascript
collection.store(function(error){})
// or
collection.store() => Promise
```

Will make one HTTP request per model that has been modified. (It essentially calls `model.sync()` on each model.)

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
```javascript
collection.sync(function(error){}) or collection.sync() => Promise
```

Effectively a combination of `collection.store()` and `collection.fetch()`. It will sync all existing models and fetch any new ones.

#### collection.on('change')
```javascript
collection.on('change', function({changed: [...], added: [...], removed: [...]}){ ... })
```

An event that's emitted any time a model in the collection changes, a model is added, or a model is removed. The callback function is passed an object containing three keys: `{added: [...], changed: [...], removed: [...]}`, which contain the models that have changed in those ways.

#### collection.add(model)

Add a model to the collection. The collection will emit an `add` event.

#### collection.on('add')
```javascript
collection.on('add', function(added_models){ ... })
```

An event emitted whenever one or more models are added to the collection. The callback function is passed an array of added models.

#### collection.remove(model)

Remove a model from the collection. The collection will emit a `remove` event. Calling `collection.sync()` will send a `DELETE` HTTP request to `collection.url` (by calling `model.delete()`).

#### collection.on('remove')
```javascript
 collection.on('remove', function(removed_models){ ... })
```

An event emitted whenever one or more models are removed the collection. The callback function is passed an array of added models.

### Rosewood.View

A `Rosewood.View` wraps an `HTMLElement` and ties it to a `Rosewood.Model` for presentation.

A `Rosewood.View` is a `Rosewood.StateMachine`, to allow views that change significantly based on certain events or data (such as an application's main view) to be easily re-configured.

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

      this.on('model:change', function(changes) {

        // Whenever the first or last name are changed, update the full_name_label
        if(changes.first_name || changes.last_name){ view.full_name_label.textContent = view.model.full_name() }

        // If the model's first_name attribute is changed, update the corresponding field
        if(changes.first_name){ view.first_name_field.value = view.model.first_name }

        // Advanced logic: only update the field if the model has changed and the user hasn't entered anything.
        if(changes.last_name){
          if(changes.last_name.old === view.last_name_field.value){ view.first_name_field.value = view.model.last_name }
        }
      })

      // If the first or last_name fields have their contents changed,
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
    element: document.getElementById('person_form')
  })
```

#### view.element

The `HTMLElement` the View uses to represent itself on the page.

#### view.model

The `Rosewood.Model` instance the view represents (optional).

#### view.on('set_model')
```javascript
view.on('set_model', function(){ ... })
```

An event emitted whenever a view gets assigned a new model.

#### view.on('model:change')

```javascript
view.on('model:change', function(changes){ ... })
```

A proxy event emitted whenever `view.model` emits a `change` event. The callback parameter is the same as `model.on('change')`.


#### view.hide()

Hides `view.element` using `element.style.display = 'none'`.

#### view.show()

Un-hides `view.element` using `element.style.display = ''`.

### Rosewood.StateMachine

A super-simple state machine that keeps a `state_machine.state` and emits `enter_state` and `exit_state` events whenever it is changed.

#### state_machine.state

The current state the state machine is in. There are no restrictions on state changes; to change the current state, simply re-assign `state_machine.state = "new_state_name"`.

#### state_machine.on('enter_state')

```javascript
state_machine.on('enter_state', function(new_state, old_state){ ... })
```

An event emitted after the event machine enters a new state. The callback function is passed the name of the new and old states.

#### state_machine.on('exit_state')

```javascript
state_machine.on('exit_state', function(old_state, new_state){ ... })
```

An event emitted before the state machine enters a new state. The callback function is passed the name of the previous and new states.

#### state_machine.on('enter_state:{state}')

```javascript
state_machine.on('enter_state:{state_name}', function(old_state){ ... })
```

A convenience event emitted after the machine enters a specific state.

#### state_machine.on('exit_state:{state}')

```javascript
state_machine.on('exit_state:{state_name}', function(new_state){ ... })
```

A convenience event emitted before the machine exits a specific state.



The MIT License (MIT)

Copyright (c) 2015 Milan Iliev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
