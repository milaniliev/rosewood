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
  element: document.getElementById("person_short")
});

abbreviated_person_display.model = bob;

},{}],2:[function(require,module,exports){
'use strict';

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

},{}]},{},[1,2]);
