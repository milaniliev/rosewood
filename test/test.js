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
      return this.collection_url + '/' + this.id;
    }
  }, {
    key: 'collection_url',
    get: function get() {
      return 'http://localhost:1024/people';
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWlsaWV2L0NvZGUvcm9zZXdvb2QvdGVzdC9zcmMvc2FtcGxlX2FwcC5qcyIsIi9Vc2Vycy9taWxpZXYvQ29kZS9yb3Nld29vZC90ZXN0L3NyYy91bml0X3Rlc3RzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7OztBQ0FBLElBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUE7O0FBRTFCLElBQUksTUFBTTtZQUFOLE1BQU07O0FBQ0csV0FEVCxNQUFNLENBQ0ksVUFBVSxFQUFDOzBCQURyQixNQUFNOztBQUVOLCtCQUZBLE1BQU0sNkNBRUEsVUFBVSxFQUFDO0dBQ2xCOztlQUhDLE1BQU07O1dBU0MscUJBQUU7QUFDVCxhQUFPLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUE7S0FDOUM7OztTQU5NLGVBQUU7QUFDUCxhQUFPLFVBQVUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFBO0tBQ3ZDOzs7U0FQQyxNQUFNO0dBQWlCLEtBQUssQ0FZL0IsQ0FBQTs7QUFFRCxNQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBOztJQUV6QyxVQUFVO1lBQVYsVUFBVTs7QUFDSCxXQURQLFVBQVUsQ0FDRixPQUFPLEVBQUM7MEJBRGhCLFVBQVU7O0FBRVosK0JBRkUsVUFBVSw2Q0FFTixPQUFPLEVBQUM7O0FBRWQsUUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLHlKQUlyQixDQUFBOztBQUVELFFBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQ3ZFLFFBQUksQ0FBQyxlQUFlLEdBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFh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QUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBQyxDQUFDLENBQUE7QUFDL0YsVUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFBO0FBQ3hCLGVBQVMsQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLFVBQVMsT0FBTyxFQUFDO0FBQzVDLGNBQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDOUMsY0FBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLE9BQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDbEQsb0JBQVksR0FBRyxJQUFJLENBQUE7T0FDcEIsQ0FBQyxDQUFBO0FBQ0YsZ0JBQVUsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0FBQ2pDLFlBQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQ2pDLENBQUMsQ0FBQTtHQUNILENBQUMsQ0FBQTtDQUNILENBQUMsQ0FBQTs7QUFFRixVQUFVLENBQUMsR0FBRyxFQUFFLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIE1vZGVsID0gUm9zZXdvb2QuTW9kZWxcblxudmFyIFBlcnNvbiA9IGNsYXNzIGV4dGVuZHMgTW9kZWwge1xuICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVzKXtcbiAgICBzdXBlcihhdHRyaWJ1dGVzKVxuICB9XG5cbiAgZ2V0IHVybCgpe1xuICAgIHJldHVybiBcIi9wZW9wbGUvXCIgKyB0aGlzLmlkLnRvU3RyaW5nKClcbiAgfVxuXG4gIGZ1bGxfbmFtZSgpe1xuICAgIHJldHVybiB0aGlzLmZpcnN0X25hbWUgKyBcIiBcIiArIHRoaXMubGFzdF9uYW1lXG4gIH1cbn1cblxuUGVyc29uLmF0dHJpYnV0ZXMgPSBbJ2ZpcnN0X25hbWUnLCAnbGFzdF9uYW1lJ11cblxuY2xhc3MgUGVyc29uRm9ybSBleHRlbmRzIFJvc2V3b29kLlZpZXcge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKXtcbiAgICBzdXBlcihvcHRpb25zKVxuXG4gICAgdGhpcy5lbGVtZW50LmlubmVySFRNTCA9IGBcbiAgICAgIDxsYWJlbCBuYW1lPVwiZnVsbF9uYW1lXCI+PC9sYWJlbD5cbiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJmaXJzdF9uYW1lXCIvPlxuICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImxhc3RfbmFtZVwiIC8+XG4gICAgYFxuXG4gICAgdGhpcy5maXJzdF9uYW1lX2ZpZWxkID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tuYW1lPWZpcnN0X25hbWVdJylcbiAgICB0aGlzLmxhc3RfbmFtZV9maWVsZCAgPSB0aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvcignW25hbWU9bGFzdF9uYW1lXScgKVxuXG4gICAgdGhpcy5mdWxsX25hbWVfbGFiZWwgID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tuYW1lPWZ1bGxfbmFtZV0nIClcblxuICAgIHZhciB2aWV3ID0gdGhpcyAvLyBldmVudCBsaXN0ZW5lcnMgY2hhbmdlIHRoZSB2YWx1ZSBvZiBgdGhpc2A7IHRoaXMgZ2V0cyBhcm91bmQgdGhhdC5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWx0ZXJuYXRpdmVseSwgdXNlIHRoZSBFUzYgXCI9PlwiIHN5bnRheC5cblxuICAgIC8vIFdoZW5ldmVyIHRoaXMgdmlldyBnZXRzIGEgbmV3IG1vZGVsLCB1cGRhdGUgdGhlIGRpc3BsYXlcbiAgICB0aGlzLm9uKCdzZXRfbW9kZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgIHZpZXcuZnVsbF9uYW1lX2xhYmVsLnRleHRDb250ZW50ID0gdmlldy5tb2RlbC5mdWxsX25hbWUoKVxuXG4gICAgICB2aWV3LmZpcnN0X25hbWVfZmllbGQudmFsdWUgPSB2aWV3Lm1vZGVsLmZpcnN0X25hbWVcbiAgICAgIHZpZXcubGFzdF9uYW1lX2ZpZWxkLnZhbHVlICA9IHZpZXcubW9kZWwubGFzdF9uYW1lXG4gICAgfSlcblxuICAgIHRoaXMub24oJ21vZGVsOmNoYW5nZScsIGZ1bmN0aW9uKGNoYW5nZXMpIHtcblxuICAgICAgLy8gV2hlbmV2ZXIgdGhlIGZpcnN0IG9yIGxhc3QgbmFtZSBhcmUgY2hhbmdlZCwgdXBkYXRlIHRoZSBmdWxsX25hbWVfbGFiZWxcbiAgICAgIGlmKGNoYW5nZXMuZmlyc3RfbmFtZSB8fCBjaGFuZ2VzLmxhc3RfbmFtZSl7IHZpZXcuZnVsbF9uYW1lX2xhYmVsLnRleHRDb250ZW50ID0gdmlldy5tb2RlbC5mdWxsX25hbWUoKSB9XG5cbiAgICAgIC8vIElmIHRoZSBtb2RlbCdzIGZpcnN0X25hbWUgYXR0cmlidXRlIGlzIGNoYW5nZWQsIHVwZGF0ZSB0aGUgY29ycmVzcG9uZGluZyBmaWVsZFxuICAgICAgaWYoY2hhbmdlcy5maXJzdF9uYW1lKXsgdmlldy5maXJzdF9uYW1lX2ZpZWxkLnZhbHVlID0gdmlldy5tb2RlbC5maXJzdF9uYW1lIH1cblxuICAgICAgLy8gQWR2YW5jZWQgbG9naWM6IG9ubHkgdXBkYXRlIHRoZSBmaWVsZCBpZiB0aGUgbW9kZWwgaGFzIGNoYW5nZWQgYW5kIHRoZSB1c2VyIGhhc24ndCBlbnRlcmVkIGFueXRoaW5nLlxuICAgICAgaWYoY2hhbmdlcy5sYXN0X25hbWUpe1xuICAgICAgICBpZihjaGFuZ2VzLmxhc3RfbmFtZS5vbGQgPT09IHZpZXcubGFzdF9uYW1lX2ZpZWxkLnZhbHVlKXsgdmlldy5maXJzdF9uYW1lX2ZpZWxkLnZhbHVlID0gdmlldy5tb2RlbC5sYXN0X25hbWUgfVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBJZiB0aGUgZmlyc3Qgb3IgbGFzdF9uYW1lIGZpZWxkcyBoYXZlIGhhZCBhbnl0aGluZyB0eXBlZCBpbnRvIHRoZW0sXG4gICAgLy8gdXBkYXRlIHRoZSBjb3JyZXNwb25kaW5nIG1vZGVsIGF0dHJpYnV0ZVxuICAgIHRoaXMuZmlyc3RfbmFtZV9maWVsZC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgIHZpZXcubW9kZWwuZmlyc3RfbmFtZSA9IHZpZXcuZmlyc3RfbmFtZV9maWVsZC52YWx1ZVxuICAgIH0pXG5cbiAgICB0aGlzLmxhc3RfbmFtZV9maWVsZC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgIHZpZXcubW9kZWwubGFzdF9uYW1lICA9IHZpZXcubGFzdF9uYW1lX2ZpZWxkLnZhbHVlXG4gICAgfSlcbiAgfVxufVxuXG52YXIgYm9iID0gbmV3IFBlcnNvbih7Zmlyc3RfbmFtZTogXCJCb2JcIiwgbGFzdF9uYW1lOiBcIlJvYnNvblwifSlcblxudmFyIGFiYnJldmlhdGVkX3BlcnNvbl9kaXNwbGF5ID0gbmV3IFBlcnNvbkZvcm0oe1xuICBlbGVtZW50OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGVyc29uX2Zvcm0nKVxufSlcblxuYWJicmV2aWF0ZWRfcGVyc29uX2Rpc3BsYXkubW9kZWwgPSBib2JcbiIsInZhciB0ZXN0X3N1aXRlID0gbmV3IHJvc2VoaXAuVGVzdFN1aXRlKClcbnRlc3Rfc3VpdGUucmVwb3J0ZXIgPSBuZXcgcm9zZWhpcC5XZWJSZXBvcnRlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGVzdF9yZXN1bHRzJykpXG5cbmxldCBQZXJzb24gPSBjbGFzcyBleHRlbmRzIFJvc2V3b29kLk1vZGVsIHtcbiAgZ2V0IHVybCgpe1xuICAgIHJldHVybiBgJHt0aGlzLmNvbGxlY3Rpb25fdXJsfS8ke3RoaXMuaWR9YFxuICB9XG4gIGdldCBjb2xsZWN0aW9uX3VybCgpe1xuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoxMDI0L3Blb3BsZWBcbiAgfVxufVxuXG5QZXJzb24uYXR0cmlidXRlcyA9IFsnZmlyc3RfbmFtZScsICdsYXN0X25hbWUnXVxuXG50ZXN0X3N1aXRlLmRlc2NyaWJlKFwiUm9zZXdvb2RcIiwgZnVuY3Rpb24odGVzdCl7XG4gIHRlc3QuZGVzY3JpYmUoXCJNb2RlbFwiLCBmdW5jdGlvbih0ZXN0KXtcbiAgICB0ZXN0Lml0KFwiZW1pdHMgYSBjaGFuZ2UgZXZlbnQgd2hlbmV2ZXIgYW4gYXR0cmlidXRlIGlzIGNoYW5nZWRcIiwgZnVuY3Rpb24oKXtcbiAgICAgIGxldCB0ZXN0X2R1bW15ID0gbmV3IFBlcnNvbih7Zmlyc3RfbmFtZTogXCJCb2JcIn0pXG4gICAgICBsZXQgY2FsbGJhY2tfcmFuID0gZmFsc2VcbiAgICAgIHRlc3RfZHVtbXkub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGNoYW5nZXMpe1xuICAgICAgICBleHBlY3QoY2hhbmdlcy5maXJzdF9uYW1lLm9sZCkudG8uZXF1YWwoXCJCb2JcIilcbiAgICAgICAgZXhwZWN0KGNoYW5nZXMuZmlyc3RfbmFtZS5uZXcpLnRvLmVxdWFsKFwiUm9iZXJ0c1wiKVxuICAgICAgICBjYWxsYmFja19yYW4gPSB0cnVlXG4gICAgICB9KVxuICAgICAgdGVzdF9kdW1teS5maXJzdF9uYW1lID0gXCJSb2JlcnRzXCJcbiAgICAgIGV4cGVjdChjYWxsYmFja19yYW4pLnRvLmJlKHRydWUpXG4gICAgfSlcblxuICAgIHRlc3QuaXQoXCJzZXRzIC5hdHRyaWJ1dGVzXCIsIGZ1bmN0aW9uKCl7XG4gICAgICBsZXQgdGVzdF9kdW1teSA9IG5ldyBQZXJzb24oe2ZpcnN0X25hbWU6IFwiQm9iXCJ9KVxuICAgICAgZXhwZWN0KHRlc3RfZHVtbXkuYXR0cmlidXRlcy5maXJzdF9uYW1lKS50by5iZShcIkJvYlwiKVxuICAgICAgdGVzdF9kdW1teS5maXJzdF9uYW1lID0gXCJSb2JlcnRzXCJcbiAgICAgIGV4cGVjdCh0ZXN0X2R1bW15LmF0dHJpYnV0ZXMuZmlyc3RfbmFtZSkudG8uYmUoXCJSb2JlcnRzXCIpXG4gICAgfSlcblxuICAgIGxldCB0ZXN0X2R1bW15ID0gbmV3IFBlcnNvbih7aWQ6IDF9KVxuICAgIHRlc3RfZHVtbXkucmVmcmVzaCgpLnRoZW4oKCkgPT4ge1xuICAgICAgdGVzdC5pdChcInJlZnJlc2hlcyBmcm9tIEFQSVwiLCBmdW5jdGlvbigpe1xuICAgICAgICBleHBlY3QodGVzdF9kdW1teS5maXJzdF9uYW1lKS50by5lcXVhbChcIkJvYlwiKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgbGV0IHVwZGF0ZV9kdW1teSA9IG5ldyBQZXJzb24oe2lkOiAxfSlcblxuICAgIHVwZGF0ZV9kdW1teS5maXJzdF9uYW1lID0gXCJKYWNrXCJcbiAgICB1cGRhdGVfZHVtbXkudXBkYXRlKCkudGhlbihmdW5jdGlvbigpe1xuICAgICAgdGVzdC5pdChcInVwZGF0ZXMgdG8gQVBJIGFuZCByZWFkcyBiYWNrIHJlc3BvbnNlXCIsIGZ1bmN0aW9uKCl7XG4gICAgICAgIGV4cGVjdCh1cGRhdGVfZHVtbXkuZmlyc3RfbmFtZSkudG8uZXF1YWwoXCJCb2JcIilcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICB0ZXN0LmRlc2NyaWJlKFwiVmlld1wiLCBmdW5jdGlvbih0ZXN0KXtcbiAgICB0ZXN0Lml0KFwiZW1pdHMgYSBtb2RlbDpjaGFuZ2UgZXZlbnQgd2hlbmV2ZXIgbW9kZWwgY2hhbmdlc1wiLCBmdW5jdGlvbigpe1xuICAgICAgbGV0IHRlc3RfZHVtbXkgPSBuZXcgUGVyc29uKHtmaXJzdF9uYW1lOiBcIkJvYlwifSlcbiAgICAgIGxldCB0ZXN0X3ZpZXcgID0gbmV3IFJvc2V3b29kLlZpZXcoe2VsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLCBtb2RlbDogdGVzdF9kdW1teX0pXG4gICAgICBsZXQgY2FsbGJhY2tfcmFuID0gZmFsc2VcbiAgICAgIHRlc3Rfdmlldy5vbignbW9kZWw6Y2hhbmdlJywgZnVuY3Rpb24oY2hhbmdlcyl7XG4gICAgICAgIGV4cGVjdChjaGFuZ2VzLmZpcnN0X25hbWUub2xkKS50by5lcXVhbChcIkJvYlwiKVxuICAgICAgICBleHBlY3QoY2hhbmdlcy5maXJzdF9uYW1lLm5ldykudG8uZXF1YWwoXCJSb2JlcnRzXCIpXG4gICAgICAgIGNhbGxiYWNrX3JhbiA9IHRydWVcbiAgICAgIH0pXG4gICAgICB0ZXN0X2R1bW15LmZpcnN0X25hbWUgPSBcIlJvYmVydHNcIlxuICAgICAgZXhwZWN0KGNhbGxiYWNrX3JhbikudG8uYmUodHJ1ZSlcbiAgICB9KVxuICB9KVxufSlcblxudGVzdF9zdWl0ZS5ydW4oKVxuIl19
