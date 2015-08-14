let EventEmitter = require('eventemitter2').EventEmitter2

module.exports = class StateMachine extends EventEmitter {
  get state(){
    return this._current_state
  }
  set state(new_state){
    let old_state = this._current_state
    this.emit('exit_state', old_state, new_state)
    this.emit(`exit_state:${old_state}`, new_state)
    this._current_state = new_state
    this.emit('enter_state', new_state, old_state)
    this.emit(`enter_state:${new_state}`, old_state)
  }
}
