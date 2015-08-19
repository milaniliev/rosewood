(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var Model = Rosewood.Model;

var Person = (function (_Model) {
  _inherits(Person, _Model);

  function Person(attributes) {
    _classCallCheck(this, Person);

    _get(Object.getPrototypeOf(Person.prototype), "constructor", this).call(this, attributes);
  }

  _createClass(Person, [{
    key: "full_name",
    value: function full_name() {
      return this.first_name + " " + this.last_name;
    }
  }, {
    key: "url",
    get: function get() {
      return "/people/" + this.id.toString();
    }
  }]);

  return Person;
})(Model);

Person.attributes = ["first_name", "last_name"];

var PersonForm = (function (_Rosewood$View) {
  _inherits(PersonForm, _Rosewood$View);

  function PersonForm(options) {
    _classCallCheck(this, PersonForm);

    _get(Object.getPrototypeOf(PersonForm.prototype), "constructor", this).call(this, options);

    this.element.innerHTML = "\n      <label name=\"full_name\"></label>\n      <input type=\"text\" name=\"first_name\"/>\n      <input type=\"text\" name=\"last_name\" />\n    ";

    this.first_name_field = this.element.querySelector("[name=first_name]");
    this.last_name_field = this.element.querySelector("[name=last_name]");

    this.full_name_label = this.element.querySelector("[name=full_name]");

    var view = this; // event listeners change the value of `this`; this gets around that.
    // Alternatively, use the ES6 "=>" syntax.

    // Whenever this view gets a new model, update the display
    this.on("set_model", function () {
      view.full_name_label.textContent = view.model.full_name();

      view.first_name_field.value = view.model.first_name;
      view.last_name_field.value = view.model.last_name;
    });

    this.on("model:change", function (changes) {

      // Whenever the first or last name are changed, update the full_name_label
      if (changes.first_name || changes.last_name) {
        view.full_name_label.textContent = view.model.full_name();
      }

      // If the model's first_name attribute is changed, update the corresponding field
      if (changes.first_name) {
        view.first_name_field.value = view.model.first_name;
      }

      // Advanced logic: only update the field if the model has changed and the user hasn't entered anything.
      if (changes.last_name) {
        if (changes.last_name.old === view.last_name_field.value) {
          view.first_name_field.value = view.model.last_name;
        }
      }
    });

    // If the first or last_name fields have had anything typed into them,
    // update the corresponding model attribute
    this.first_name_field.addEventListener("change", function () {
      view.model.first_name = view.first_name_field.value;
    });

    this.last_name_field.addEventListener("change", function () {
      view.model.last_name = view.last_name_field.value;
    });
  }

  return PersonForm;
})(Rosewood.View);

var bob = new Person({ first_name: "Bob", last_name: "Robson" });

var abbreviated_person_display = new PersonForm({
  element: document.getElementById("person_form")
});

abbreviated_person_display.model = bob;

},{}],2:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var test_suite = new rosehip.TestSuite();
test_suite.reporter = new rosehip.WebReporter(document.getElementById('test_results'));

var Person = (function (_Rosewood$Model) {
  _inherits(Person, _Rosewood$Model);

  function Person() {
    _classCallCheck(this, Person);

    _get(Object.getPrototypeOf(Person.prototype), 'constructor', this).apply(this, arguments);
  }

  _createClass(Person, [{
    key: 'url',
    get: function get() {
      return 'http://localhost:1024/people/' + this.id;
    }
  }]);

  return Person;
})(Rosewood.Model);

Person.attributes = ['first_name', 'last_name'];

test_suite.describe('Rosewood', function (test) {
  test.describe('Model', function (test) {
    test.it('emits a change event whenever an attribute is changed', function () {
      var test_dummy = new Person({ first_name: 'Bob' });
      var callback_ran = false;
      test_dummy.on('change', function (changes) {
        expect(changes.first_name.old).to.equal('Bob');
        expect(changes.first_name['new']).to.equal('Roberts');
        callback_ran = true;
      });
      test_dummy.first_name = 'Roberts';
      expect(callback_ran).to.be(true);
    });

    test.it('sets .attributes', function () {
      var test_dummy = new Person({ first_name: 'Bob' });
      expect(test_dummy.attributes.first_name).to.be('Bob');
      test_dummy.first_name = 'Roberts';
      expect(test_dummy.attributes.first_name).to.be('Roberts');
    });

    var test_dummy = new Person({ id: 1 });
    test_dummy.refresh().then(function () {
      test.it('refreshes from API', function () {
        expect(test_dummy.first_name).to.equal('Bob');
      });
    });

    var update_dummy = new Person({ id: 1 });

    update_dummy.first_name = 'Jack';
    update_dummy.update().then(function () {
      test.it('updates to API and reads back response', function () {
        expect(update_dummy.first_name).to.equal('Bob');
      });
    });
  });

  test.describe('View', function (test) {
    test.it('emits a model:change event whenever model changes', function () {
      var test_dummy = new Person({ first_name: 'Bob' });
      var test_view = new Rosewood.View({ element: document.createElement('div'), model: test_dummy });
      var callback_ran = false;
      test_view.on('model:change', function (changes) {
        expect(changes.first_name.old).to.equal('Bob');
        expect(changes.first_name['new']).to.equal('Roberts');
        callback_ran = true;
      });
      test_dummy.first_name = 'Roberts';
      expect(callback_ran).to.be(true);
    });
  });
});

test_suite.run();

},{}]},{},[1,2])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWlsaWV2L0NvZGUvcm9zZXdvb2QvdGVzdC9zcmMvc2FtcGxlX2FwcC5qcyIsIi9Vc2Vycy9taWxpZXYvQ29kZS9yb3Nld29vZC90ZXN0L3NyYy91bml0X3Rlc3RzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7OztBQ0FBLElBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUE7O0FBRTFCLElBQUksTUFBTTtZQUFOLE1BQU07O0FBQ0csV0FEVCxNQUFNLENBQ0ksVUFBVSxFQUFDOzBCQURyQixNQUFNOztBQUVOLCtCQUZBLE1BQU0sNkNBRUEsVUFBVSxFQUFDO0dBQ2xCOztlQUhDLE1BQU07O1dBU0MscUJBQUU7QUFDVCxhQUFPLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUE7S0FDOUM7OztTQU5NLGVBQUU7QUFDUCxhQUFPLFVBQVUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFBO0tBQ3ZDOzs7U0FQQyxNQUFNO0dBQWlCLEtBQUssQ0FZL0IsQ0FBQTs7QUFFRCxNQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBOztJQUV6QyxVQUFVO1lBQVYsVUFBVTs7QUFDSCxXQURQLFVBQVUsQ0FDRixPQUFPLEVBQUM7MEJBRGhCLFVBQVU7O0FBRVosK0JBRkUsVUFBVSw2Q0FFTixPQUFPLEVBQUM7O0FBRWQsUUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLHlKQUlyQixDQUFBOztBQUVELFFBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQ3ZFLFFBQUksQ0FBQyxlQUFlLEdBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUUsQ0FBQTs7QUFFdkUsUUFBSSxDQUFDLGVBQWUsR0FBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBRSxDQUFBOztBQUV2RSxRQUFJLElBQUksR0FBRyxJQUFJLENBQUE7Ozs7QUFJZixRQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxZQUFXO0FBQzlCLFVBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUE7O0FBRXpELFVBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUE7QUFDbkQsVUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEdBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUE7S0FDbkQsQ0FBQyxDQUFBOztBQUVGLFFBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLFVBQVMsT0FBTyxFQUFFOzs7QUFHeEMsVUFBRyxPQUFPLENBQUMsVUFBVSxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUM7QUFBRSxZQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFBO09BQUU7OztBQUd4RyxVQUFHLE9BQU8sQ0FBQyxVQUFVLEVBQUM7QUFBRSxZQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFBO09BQUU7OztBQUc3RSxVQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUM7QUFDbkIsWUFBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBQztBQUFFLGNBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUE7U0FBRTtPQUMvRztLQUNGLENBQUMsQ0FBQTs7OztBQUlGLFFBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsWUFBVztBQUMxRCxVQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO0tBQ3BELENBQUMsQ0FBQTs7QUFFRixRQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxZQUFXO0FBQ3pELFVBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFBO0tBQ25ELENBQUMsQ0FBQTtHQUNIOztTQWpERyxVQUFVO0dBQVMsUUFBUSxDQUFDLElBQUk7O0FBb0R0QyxJQUFJLEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBQyxDQUFDLENBQUE7O0FBRTlELElBQUksMEJBQTBCLEdBQUcsSUFBSSxVQUFVLENBQUM7QUFDOUMsU0FBTyxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDO0NBQ2hELENBQUMsQ0FBQTs7QUFFRiwwQkFBMEIsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFBOzs7Ozs7Ozs7Ozs7O0FDNUV0QyxJQUFJLFVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQTtBQUN4QyxVQUFVLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7O0FBRXRGLElBQUksTUFBTTtZQUFOLE1BQU07O1dBQU4sTUFBTTswQkFBTixNQUFNOzsrQkFBTixNQUFNOzs7ZUFBTixNQUFNOztTQUNELGVBQUU7QUFDUCwrQ0FBdUMsSUFBSSxDQUFDLEVBQUUsQ0FBRTtLQUNqRDs7O1NBSEMsTUFBTTtHQUFpQixRQUFRLENBQUMsS0FBSyxDQUl4QyxDQUFBOztBQUVELE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUE7O0FBRS9DLFVBQVUsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVMsSUFBSSxFQUFDO0FBQzVDLE1BQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFVBQVMsSUFBSSxFQUFDO0FBQ25DLFFBQUksQ0FBQyxFQUFFLENBQUMsdURBQXVELEVBQUUsWUFBVTtBQUN6RSxVQUFJLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFBO0FBQ2hELFVBQUksWUFBWSxHQUFHLEtBQUssQ0FBQTtBQUN4QixnQkFBVSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBUyxPQUFPLEVBQUM7QUFDdkMsY0FBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUM5QyxjQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsT0FBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUNsRCxvQkFBWSxHQUFHLElBQUksQ0FBQTtPQUNwQixDQUFDLENBQUE7QUFDRixnQkFBVSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7QUFDakMsWUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7S0FDakMsQ0FBQyxDQUFBOztBQUVGLFFBQUksQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsWUFBVTtBQUNwQyxVQUFJLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFBO0FBQ2hELFlBQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDckQsZ0JBQVUsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0FBQ2pDLFlBQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUE7S0FDMUQsQ0FBQyxDQUFBOztBQUVGLFFBQUksVUFBVSxHQUFHLElBQUksTUFBTSxDQUFDLEVBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUE7QUFDcEMsY0FBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFNO0FBQzlCLFVBQUksQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsWUFBVTtBQUN0QyxjQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7T0FDOUMsQ0FBQyxDQUFBO0tBQ0gsQ0FBQyxDQUFBOztBQUVGLFFBQUksWUFBWSxHQUFHLElBQUksTUFBTSxDQUFDLEVBQUMsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUE7O0FBRXRDLGdCQUFZLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQTtBQUNoQyxnQkFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFVO0FBQ25DLFVBQUksQ0FBQyxFQUFFLENBQUMsd0NBQXdDLEVBQUUsWUFBVTtBQUMxRCxjQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7T0FDaEQsQ0FBQyxDQUFBO0tBQ0gsQ0FBQyxDQUFBO0dBQ0gsQ0FBQyxDQUFBOztBQUVGLE1BQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFVBQVMsSUFBSSxFQUFDO0FBQ2xDLFFBQUksQ0FBQyxFQUFFLENBQUMsbURBQW1ELEVBQUUsWUFBVTtBQUNyRSxVQUFJLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFBO0FBQ2hELFVBQUksU0FBUyxHQUFJLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUMsQ0FBQyxDQUFBO0FBQy9GLFVBQUksWUFBWSxHQUFHLEtBQUssQ0FBQTtBQUN4QixlQUFTLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxVQUFTLE9BQU8sRUFBQztBQUM1QyxjQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQzlDLGNBQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxPQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQ2xELG9CQUFZLEdBQUcsSUFBSSxDQUFBO09BQ3BCLENBQUMsQ0FBQTtBQUNGLGdCQUFVLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtBQUNqQyxZQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUNqQyxDQUFDLENBQUE7R0FDSCxDQUFDLENBQUE7Q0FDSCxDQUFDLENBQUE7O0FBRUYsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBNb2RlbCA9IFJvc2V3b29kLk1vZGVsXG5cbnZhciBQZXJzb24gPSBjbGFzcyBleHRlbmRzIE1vZGVsIHtcbiAgY29uc3RydWN0b3IoYXR0cmlidXRlcyl7XG4gICAgc3VwZXIoYXR0cmlidXRlcylcbiAgfVxuXG4gIGdldCB1cmwoKXtcbiAgICByZXR1cm4gXCIvcGVvcGxlL1wiICsgdGhpcy5pZC50b1N0cmluZygpXG4gIH1cblxuICBmdWxsX25hbWUoKXtcbiAgICByZXR1cm4gdGhpcy5maXJzdF9uYW1lICsgXCIgXCIgKyB0aGlzLmxhc3RfbmFtZVxuICB9XG59XG5cblBlcnNvbi5hdHRyaWJ1dGVzID0gWydmaXJzdF9uYW1lJywgJ2xhc3RfbmFtZSddXG5cbmNsYXNzIFBlcnNvbkZvcm0gZXh0ZW5kcyBSb3Nld29vZC5WaWV3IHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyl7XG4gICAgc3VwZXIob3B0aW9ucylcblxuICAgIHRoaXMuZWxlbWVudC5pbm5lckhUTUwgPSBgXG4gICAgICA8bGFiZWwgbmFtZT1cImZ1bGxfbmFtZVwiPjwvbGFiZWw+XG4gICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwiZmlyc3RfbmFtZVwiLz5cbiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJsYXN0X25hbWVcIiAvPlxuICAgIGBcblxuICAgIHRoaXMuZmlyc3RfbmFtZV9maWVsZCA9IHRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbbmFtZT1maXJzdF9uYW1lXScpXG4gICAgdGhpcy5sYXN0X25hbWVfZmllbGQgID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tuYW1lPWxhc3RfbmFtZV0nIClcblxuICAgIHRoaXMuZnVsbF9uYW1lX2xhYmVsICA9IHRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbbmFtZT1mdWxsX25hbWVdJyApXG5cbiAgICB2YXIgdmlldyA9IHRoaXMgLy8gZXZlbnQgbGlzdGVuZXJzIGNoYW5nZSB0aGUgdmFsdWUgb2YgYHRoaXNgOyB0aGlzIGdldHMgYXJvdW5kIHRoYXQuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsdGVybmF0aXZlbHksIHVzZSB0aGUgRVM2IFwiPT5cIiBzeW50YXguXG5cbiAgICAvLyBXaGVuZXZlciB0aGlzIHZpZXcgZ2V0cyBhIG5ldyBtb2RlbCwgdXBkYXRlIHRoZSBkaXNwbGF5XG4gICAgdGhpcy5vbignc2V0X21vZGVsJywgZnVuY3Rpb24oKSB7XG4gICAgICB2aWV3LmZ1bGxfbmFtZV9sYWJlbC50ZXh0Q29udGVudCA9IHZpZXcubW9kZWwuZnVsbF9uYW1lKClcblxuICAgICAgdmlldy5maXJzdF9uYW1lX2ZpZWxkLnZhbHVlID0gdmlldy5tb2RlbC5maXJzdF9uYW1lXG4gICAgICB2aWV3Lmxhc3RfbmFtZV9maWVsZC52YWx1ZSAgPSB2aWV3Lm1vZGVsLmxhc3RfbmFtZVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCdtb2RlbDpjaGFuZ2UnLCBmdW5jdGlvbihjaGFuZ2VzKSB7XG5cbiAgICAgIC8vIFdoZW5ldmVyIHRoZSBmaXJzdCBvciBsYXN0IG5hbWUgYXJlIGNoYW5nZWQsIHVwZGF0ZSB0aGUgZnVsbF9uYW1lX2xhYmVsXG4gICAgICBpZihjaGFuZ2VzLmZpcnN0X25hbWUgfHwgY2hhbmdlcy5sYXN0X25hbWUpeyB2aWV3LmZ1bGxfbmFtZV9sYWJlbC50ZXh0Q29udGVudCA9IHZpZXcubW9kZWwuZnVsbF9uYW1lKCkgfVxuXG4gICAgICAvLyBJZiB0aGUgbW9kZWwncyBmaXJzdF9uYW1lIGF0dHJpYnV0ZSBpcyBjaGFuZ2VkLCB1cGRhdGUgdGhlIGNvcnJlc3BvbmRpbmcgZmllbGRcbiAgICAgIGlmKGNoYW5nZXMuZmlyc3RfbmFtZSl7IHZpZXcuZmlyc3RfbmFtZV9maWVsZC52YWx1ZSA9IHZpZXcubW9kZWwuZmlyc3RfbmFtZSB9XG5cbiAgICAgIC8vIEFkdmFuY2VkIGxvZ2ljOiBvbmx5IHVwZGF0ZSB0aGUgZmllbGQgaWYgdGhlIG1vZGVsIGhhcyBjaGFuZ2VkIGFuZCB0aGUgdXNlciBoYXNuJ3QgZW50ZXJlZCBhbnl0aGluZy5cbiAgICAgIGlmKGNoYW5nZXMubGFzdF9uYW1lKXtcbiAgICAgICAgaWYoY2hhbmdlcy5sYXN0X25hbWUub2xkID09PSB2aWV3Lmxhc3RfbmFtZV9maWVsZC52YWx1ZSl7IHZpZXcuZmlyc3RfbmFtZV9maWVsZC52YWx1ZSA9IHZpZXcubW9kZWwubGFzdF9uYW1lIH1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gSWYgdGhlIGZpcnN0IG9yIGxhc3RfbmFtZSBmaWVsZHMgaGF2ZSBoYWQgYW55dGhpbmcgdHlwZWQgaW50byB0aGVtLFxuICAgIC8vIHVwZGF0ZSB0aGUgY29ycmVzcG9uZGluZyBtb2RlbCBhdHRyaWJ1dGVcbiAgICB0aGlzLmZpcnN0X25hbWVfZmllbGQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICB2aWV3Lm1vZGVsLmZpcnN0X25hbWUgPSB2aWV3LmZpcnN0X25hbWVfZmllbGQudmFsdWVcbiAgICB9KVxuXG4gICAgdGhpcy5sYXN0X25hbWVfZmllbGQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICB2aWV3Lm1vZGVsLmxhc3RfbmFtZSAgPSB2aWV3Lmxhc3RfbmFtZV9maWVsZC52YWx1ZVxuICAgIH0pXG4gIH1cbn1cblxudmFyIGJvYiA9IG5ldyBQZXJzb24oe2ZpcnN0X25hbWU6IFwiQm9iXCIsIGxhc3RfbmFtZTogXCJSb2Jzb25cIn0pXG5cbnZhciBhYmJyZXZpYXRlZF9wZXJzb25fZGlzcGxheSA9IG5ldyBQZXJzb25Gb3JtKHtcbiAgZWxlbWVudDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BlcnNvbl9mb3JtJylcbn0pXG5cbmFiYnJldmlhdGVkX3BlcnNvbl9kaXNwbGF5Lm1vZGVsID0gYm9iXG4iLCJ2YXIgdGVzdF9zdWl0ZSA9IG5ldyByb3NlaGlwLlRlc3RTdWl0ZSgpXG50ZXN0X3N1aXRlLnJlcG9ydGVyID0gbmV3IHJvc2VoaXAuV2ViUmVwb3J0ZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Rlc3RfcmVzdWx0cycpKVxuXG5sZXQgUGVyc29uID0gY2xhc3MgZXh0ZW5kcyBSb3Nld29vZC5Nb2RlbCB7XG4gIGdldCB1cmwoKXtcbiAgICByZXR1cm4gYGh0dHA6Ly9sb2NhbGhvc3Q6MTAyNC9wZW9wbGUvJHt0aGlzLmlkfWBcbiAgfVxufVxuXG5QZXJzb24uYXR0cmlidXRlcyA9IFsnZmlyc3RfbmFtZScsICdsYXN0X25hbWUnXVxuXG50ZXN0X3N1aXRlLmRlc2NyaWJlKFwiUm9zZXdvb2RcIiwgZnVuY3Rpb24odGVzdCl7XG4gIHRlc3QuZGVzY3JpYmUoXCJNb2RlbFwiLCBmdW5jdGlvbih0ZXN0KXtcbiAgICB0ZXN0Lml0KFwiZW1pdHMgYSBjaGFuZ2UgZXZlbnQgd2hlbmV2ZXIgYW4gYXR0cmlidXRlIGlzIGNoYW5nZWRcIiwgZnVuY3Rpb24oKXtcbiAgICAgIGxldCB0ZXN0X2R1bW15ID0gbmV3IFBlcnNvbih7Zmlyc3RfbmFtZTogXCJCb2JcIn0pXG4gICAgICBsZXQgY2FsbGJhY2tfcmFuID0gZmFsc2VcbiAgICAgIHRlc3RfZHVtbXkub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGNoYW5nZXMpe1xuICAgICAgICBleHBlY3QoY2hhbmdlcy5maXJzdF9uYW1lLm9sZCkudG8uZXF1YWwoXCJCb2JcIilcbiAgICAgICAgZXhwZWN0KGNoYW5nZXMuZmlyc3RfbmFtZS5uZXcpLnRvLmVxdWFsKFwiUm9iZXJ0c1wiKVxuICAgICAgICBjYWxsYmFja19yYW4gPSB0cnVlXG4gICAgICB9KVxuICAgICAgdGVzdF9kdW1teS5maXJzdF9uYW1lID0gXCJSb2JlcnRzXCJcbiAgICAgIGV4cGVjdChjYWxsYmFja19yYW4pLnRvLmJlKHRydWUpXG4gICAgfSlcblxuICAgIHRlc3QuaXQoXCJzZXRzIC5hdHRyaWJ1dGVzXCIsIGZ1bmN0aW9uKCl7XG4gICAgICBsZXQgdGVzdF9kdW1teSA9IG5ldyBQZXJzb24oe2ZpcnN0X25hbWU6IFwiQm9iXCJ9KVxuICAgICAgZXhwZWN0KHRlc3RfZHVtbXkuYXR0cmlidXRlcy5maXJzdF9uYW1lKS50by5iZShcIkJvYlwiKVxuICAgICAgdGVzdF9kdW1teS5maXJzdF9uYW1lID0gXCJSb2JlcnRzXCJcbiAgICAgIGV4cGVjdCh0ZXN0X2R1bW15LmF0dHJpYnV0ZXMuZmlyc3RfbmFtZSkudG8uYmUoXCJSb2JlcnRzXCIpXG4gICAgfSlcblxuICAgIGxldCB0ZXN0X2R1bW15ID0gbmV3IFBlcnNvbih7aWQ6IDF9KVxuICAgIHRlc3RfZHVtbXkucmVmcmVzaCgpLnRoZW4oKCkgPT4ge1xuICAgICAgdGVzdC5pdChcInJlZnJlc2hlcyBmcm9tIEFQSVwiLCBmdW5jdGlvbigpe1xuICAgICAgICBleHBlY3QodGVzdF9kdW1teS5maXJzdF9uYW1lKS50by5lcXVhbChcIkJvYlwiKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgbGV0IHVwZGF0ZV9kdW1teSA9IG5ldyBQZXJzb24oe2lkOiAxfSlcblxuICAgIHVwZGF0ZV9kdW1teS5maXJzdF9uYW1lID0gXCJKYWNrXCJcbiAgICB1cGRhdGVfZHVtbXkudXBkYXRlKCkudGhlbihmdW5jdGlvbigpe1xuICAgICAgdGVzdC5pdChcInVwZGF0ZXMgdG8gQVBJIGFuZCByZWFkcyBiYWNrIHJlc3BvbnNlXCIsIGZ1bmN0aW9uKCl7XG4gICAgICAgIGV4cGVjdCh1cGRhdGVfZHVtbXkuZmlyc3RfbmFtZSkudG8uZXF1YWwoXCJCb2JcIilcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICB0ZXN0LmRlc2NyaWJlKFwiVmlld1wiLCBmdW5jdGlvbih0ZXN0KXtcbiAgICB0ZXN0Lml0KFwiZW1pdHMgYSBtb2RlbDpjaGFuZ2UgZXZlbnQgd2hlbmV2ZXIgbW9kZWwgY2hhbmdlc1wiLCBmdW5jdGlvbigpe1xuICAgICAgbGV0IHRlc3RfZHVtbXkgPSBuZXcgUGVyc29uKHtmaXJzdF9uYW1lOiBcIkJvYlwifSlcbiAgICAgIGxldCB0ZXN0X3ZpZXcgID0gbmV3IFJvc2V3b29kLlZpZXcoe2VsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLCBtb2RlbDogdGVzdF9kdW1teX0pXG4gICAgICBsZXQgY2FsbGJhY2tfcmFuID0gZmFsc2VcbiAgICAgIHRlc3Rfdmlldy5vbignbW9kZWw6Y2hhbmdlJywgZnVuY3Rpb24oY2hhbmdlcyl7XG4gICAgICAgIGV4cGVjdChjaGFuZ2VzLmZpcnN0X25hbWUub2xkKS50by5lcXVhbChcIkJvYlwiKVxuICAgICAgICBleHBlY3QoY2hhbmdlcy5maXJzdF9uYW1lLm5ldykudG8uZXF1YWwoXCJSb2JlcnRzXCIpXG4gICAgICAgIGNhbGxiYWNrX3JhbiA9IHRydWVcbiAgICAgIH0pXG4gICAgICB0ZXN0X2R1bW15LmZpcnN0X25hbWUgPSBcIlJvYmVydHNcIlxuICAgICAgZXhwZWN0KGNhbGxiYWNrX3JhbikudG8uYmUodHJ1ZSlcbiAgICB9KVxuICB9KVxufSlcblxudGVzdF9zdWl0ZS5ydW4oKVxuIl19
