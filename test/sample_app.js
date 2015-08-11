(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var Model = Rosewood.Model;

var Person = (function (_Model) {
  _inherits(Person, _Model);

  function Person(attributes) {
    _classCallCheck(this, Person);

    _get(Object.getPrototypeOf(Person.prototype), 'constructor', this).call(this, attributes);
    this.attribute_names = ['first_name, last_name'];
  }

  _createClass(Person, [{
    key: 'url',
    get: function get() {
      return '/people/' + this.id.toString();
    }
  }]);

  return Person;
})(Model);

var ShortPersonView = (function (_Rosewood$View) {
  _inherits(ShortPersonView, _Rosewood$View);

  function ShortPersonView(options) {
    var _this = this;

    _classCallCheck(this, ShortPersonView);

    _get(Object.getPrototypeOf(ShortPersonView.prototype), 'constructor', this).call(this, options);
    this.element.innerHTML = '\n      <label name="first_name"></label>\n      <label name="last_name" ></label>';

    this.first_name_field = this.element.querySelector('[name=first_name]');
    this.last_name_field = this.element.querySelector('[name=last_name]');

    this.on('set_model', function () {
      _this.first_name_field.textContent = _this.model.first_name;
      _this.last_name_field.textContent = _this.model.last_name;
    });

    this.on('model:change:first_name', function (changes) {
      if (this.first_name_field.textContent == changes.old) {
        this.first_name_field.value = changes['new'];
      }
    });

    this.on('model:change:last_name', function (changes) {
      if (this.last_name_field.textContent == changes.old) {
        this.last_name_field.value = changes['new'];
      }
    });

    this.first_name_field.addEventListener('change', function () {
      _this.model.first_name = _this.first_name_field.value;
    });

    this.last_name_field.addEventListener('change', function () {
      _this.model.last_name = _this.last_name_field.value;
    });
  }

  return ShortPersonView;
})(Rosewood.View);

var bob = new Person({ first_name: 'Bob', last_name: 'Robson' });

var abbreviated_person_display = new ShortPersonView({
  element: document.getElementById('person_short')
});

abbreviated_person_display.model = bob;

},{}]},{},[1]);
