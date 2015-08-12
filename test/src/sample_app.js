var Model = Rosewood.Model

var Person = class extends Model {
  constructor(attributes){
    super(attributes)
  }

  get url(){
    return "/people/" + this.id.toString()
  }

  full_name(){
    return this.first_name + " " + this.last_name
  }
}

Person.attributes = ['first_name', 'last_name']

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
      view.full_name_label.textContent = view.model.full_name()

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

var bob = new Person({first_name: "Bob", last_name: "Robson"})

var abbreviated_person_display = new PersonForm({
  element: document.getElementById('person_short')
})

abbreviated_person_display.model = bob
