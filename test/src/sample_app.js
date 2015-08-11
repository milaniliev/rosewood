var Model = Rosewood.Model

class Person extends Model {

  constructor(attributes){
    super(attributes)
    this.attribute_names = ['first_name, last_name']
  }

  get url(){
    return "/people/" + this.id.toString()
  }
}

class ShortPersonView extends Rosewood.View {
  constructor(options){
    super(options)
    this.element.innerHTML = `
      <label name="first_name"></label>
      <label name="last_name" ></label>`

    this.first_name_field = this.element.querySelector('[name=first_name]')
    this.last_name_field  = this.element.querySelector('[name=last_name]' )

    this.on('set_model', () => {
      this.first_name_field.textContent = this.model.first_name
      this.last_name_field.textContent  = this.model.last_name
    })

    this.on('model:change:first_name', function(changes){
      if(this.first_name_field.textContent == changes.old){ this.first_name_field.value = changes.new }
    })

    this.on('model:change:last_name', function(changes){
      if(this.last_name_field.textContent  == changes.old){ this.last_name_field.value  = changes.new }
    })

    this.first_name_field.addEventListener('change', () => {
      this.model.first_name = this.first_name_field.value
    })

    this.last_name_field.addEventListener('change', () => {
      this.model.last_name  = this.last_name_field.value
    })
  }
}

var bob = new Person({first_name: "Bob", last_name: "Robson"})

var abbreviated_person_display = new ShortPersonView({
  element: document.getElementById('person_short')
})

abbreviated_person_display.model = bob
