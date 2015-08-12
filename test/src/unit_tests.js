var test_suite = new rosehip.TestSuite()
test_suite.reporter = new rosehip.WebReporter(document.getElementById('test_results'))

let Person = class extends Rosewood.Model { }

Person.attributes = ['first_name', 'last_name']

test_suite.describe("Rosewood", function(test){
  test.describe("Model", function(test){
    test.it("emits a change event whenever an attribute is changed", function(){
      let test_dummy = new Person({first_name: "Bob"})
      let callback_ran = false
      test_dummy.on('change', function(changes){
        expect(changes.first_name.old).to.equal("Bob")
        expect(changes.first_name.new).to.equal("Roberts")
        callback_ran = true
      })
      test_dummy.first_name = "Roberts"
      expect(callback_ran).to.be(true)
    })

    test.it("sets .attributes", function(){
      let test_dummy = new Person({first_name: "Bob"})
      expect(test_dummy.attributes.first_name).to.be("Bob")
      test_dummy.first_name = "Roberts"
      expect(test_dummy.attributes.first_name).to.be("Roberts")
    })
  })

  test.describe("View", function(test){
    test.it("emits a model:change event whenever model changes", function(){
      let test_dummy = new Person({first_name: "Bob"})
      let test_view  = new Rosewood.View({element: document.createElement('div'), model: test_dummy})
      let callback_ran = false
      test_view.on('model:change', function(changes){
        expect(changes.first_name.old).to.equal("Bob")
        expect(changes.first_name.new).to.equal("Roberts")
        callback_ran = true
      })
      test_dummy.first_name = "Roberts"
      expect(callback_ran).to.be(true)
    })
  })
})

test_suite.run()
