(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Rosewood = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (process,global){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 2.9.34
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, cancel, using, filter, any, each, timers
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule.js");
var Queue = _dereq_("./queue.js");
var util = _dereq_("./util.js");

function Async() {
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule =
        schedule.isStatic ? schedule(this.drainQueues) : schedule;
}

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.enableTrampoline = function() {
    if (!this._trampolineEnabled) {
        this._trampolineEnabled = true;
        this._schedule = function(fn) {
            setTimeout(fn, 0);
        };
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._normalQueue.length() > 0;
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    if (schedule.isStatic) {
        schedule = function(fn) { setTimeout(fn, 0); };
    }
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype.invokeFirst = function (fn, receiver, arg) {
    this._normalQueue.unshift(fn, receiver, arg);
    this._queueTick();
};

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = new Async();
module.exports.firstLineError = firstLineError;

},{"./queue.js":28,"./schedule.js":31,"./util.js":38}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise) {
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (this._isPending()) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();

    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, ret._progress, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, ret._progress, ret, context);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 131072;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~131072);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 131072) === 131072;
};

Promise.bind = function (thisArg, value) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);

    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        maybePromise._then(function() {
            ret._resolveCallback(value);
        }, ret._reject, ret._progress, ret, null);
    } else {
        ret._resolveCallback(value);
    }
    return ret;
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise.js")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise.js":23}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util.js":38}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var errors = _dereq_("./errors.js");
var async = _dereq_("./async.js");
var CancellationError = errors.CancellationError;

Promise.prototype._cancel = function (reason) {
    if (!this.isCancellable()) return this;
    var parent;
    var promiseToReject = this;
    while ((parent = promiseToReject._cancellationParent) !== undefined &&
        parent.isCancellable()) {
        promiseToReject = parent;
    }
    this._unsetCancellable();
    promiseToReject._target()._rejectCallback(reason, false, true);
};

Promise.prototype.cancel = function (reason) {
    if (!this.isCancellable()) return this;
    if (reason === undefined) reason = new CancellationError();
    async.invokeLater(this._cancel, this, reason);
    return this;
};

Promise.prototype.cancellable = function () {
    if (this._cancellable()) return this;
    async.enableTrampoline();
    this._setCancellable();
    this._cancellationParent = undefined;
    return this;
};

Promise.prototype.uncancellable = function () {
    var ret = this.then();
    ret._unsetCancellable();
    return ret;
};

Promise.prototype.fork = function (didFulfill, didReject, didProgress) {
    var ret = this._then(didFulfill, didReject, didProgress,
                         undefined, undefined);

    ret._setCancellable();
    ret._cancellationParent = undefined;
    return ret;
};
};

},{"./async.js":2,"./errors.js":13}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](main|debug|zalgo|instrumented)/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var warn;

function CapturedTrace(parent) {
    this._parent = parent;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.parent = function() {
    return this._parent;
};

CapturedTrace.prototype.hasParent = function() {
    return this._parent !== undefined;
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = CapturedTrace.parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = stackFramePattern.test(line) ||
            "    (No stack trace)" === line;
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0) {
        stack = stack.slice(i);
    }
    return stack;
}

CapturedTrace.parseStackAndMessage = function(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: cleanStack(stack)
    };
};

CapturedTrace.formatAndLogError = function(error, title) {
    if (typeof console !== "undefined") {
        var message;
        if (typeof error === "object" || typeof error === "function") {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof warn === "function") {
            warn(message);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
};

CapturedTrace.unhandledRejection = function (reason) {
    CapturedTrace.formatAndLogError(reason, "^--- With additional stack trace: ");
};

CapturedTrace.isSupported = function () {
    return typeof captureStackTrace === "function";
};

CapturedTrace.fireRejectionEvent =
function(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent(name, reason, promise);
    } catch (e) {
        globalEventFired = true;
        async.throwLater(e);
    }

    var domEventFired = false;
    if (fireDomEvent) {
        try {
            domEventFired = fireDomEvent(name.toLowerCase(), {
                reason: reason,
                promise: promise
            });
        } catch (e) {
            domEventFired = true;
            async.throwLater(e);
        }
    }

    if (!globalEventFired && !localEventFired && !domEventFired &&
        name === "unhandledRejection") {
        CapturedTrace.formatAndLogError(reason, "Unhandled rejection ");
    }
};

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj.toString();
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}
CapturedTrace.setBounds = function(firstLineError, lastLineError) {
    if (!CapturedTrace.isSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit = Error.stackTraceLimit + 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

var fireDomEvent;
var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function(name, reason, promise) {
            if (name === "rejectionHandled") {
                return process.emit(name, promise);
            } else {
                return process.emit(name, reason, promise);
            }
        };
    } else {
        var customEventWorks = false;
        var anyEventWorks = true;
        try {
            var ev = new self.CustomEvent("test");
            customEventWorks = ev instanceof CustomEvent;
        } catch (e) {}
        if (!customEventWorks) {
            try {
                var event = document.createEvent("CustomEvent");
                event.initCustomEvent("testingtheevent", false, true, {});
                self.dispatchEvent(event);
            } catch (e) {
                anyEventWorks = false;
            }
        }
        if (anyEventWorks) {
            fireDomEvent = function(type, detail) {
                var event;
                if (customEventWorks) {
                    event = new self.CustomEvent(type, {
                        detail: detail,
                        bubbles: false,
                        cancelable: true
                    });
                } else if (self.dispatchEvent) {
                    event = document.createEvent("CustomEvent");
                    event.initCustomEvent(type, false, true, detail);
                }

                return event ? !self.dispatchEvent(event) : false;
            };
        }

        var toWindowMethodNameMap = {};
        toWindowMethodNameMap["unhandledRejection"] = ("on" +
            "unhandledRejection").toLowerCase();
        toWindowMethodNameMap["rejectionHandled"] = ("on" +
            "rejectionHandled").toLowerCase();

        return function(name, reason, promise) {
            var methodName = toWindowMethodNameMap[name];
            var method = self[methodName];
            if (!method) return false;
            if (name === "rejectionHandled") {
                method.call(self, promise);
            } else {
                method.call(self, reason, promise);
            }
            return true;
        };
    }
})();

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    warn = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        warn = function(message) {
            process.stderr.write("\u001b[31m" + message + "\u001b[39m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        warn = function(message) {
            console.warn("%c" + message, "color: red");
        };
    }
}

return CapturedTrace;
};

},{"./async.js":2,"./util.js":38}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util.js");
var errors = _dereq_("./errors.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var keys = _dereq_("./es5.js").keys;
var TypeError = errors.TypeError;

function CatchFilter(instances, callback, promise) {
    this._instances = instances;
    this._callback = callback;
    this._promise = promise;
}

function safePredicate(predicate, e) {
    var safeObject = {};
    var retfilter = tryCatch(predicate).call(safeObject, e);

    if (retfilter === errorObj) return retfilter;

    var safeKeys = keys(safeObject);
    if (safeKeys.length) {
        errorObj.e = new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a");
        return errorObj;
    }
    return retfilter;
}

CatchFilter.prototype.doFilter = function (e) {
    var cb = this._callback;
    var promise = this._promise;
    var boundTo = promise._boundValue();
    for (var i = 0, len = this._instances.length; i < len; ++i) {
        var item = this._instances[i];
        var itemIsErrorType = item === Error ||
            (item != null && item.prototype instanceof Error);

        if (itemIsErrorType && e instanceof item) {
            var ret = tryCatch(cb).call(boundTo, e);
            if (ret === errorObj) {
                NEXT_FILTER.e = ret.e;
                return NEXT_FILTER;
            }
            return ret;
        } else if (typeof item === "function" && !itemIsErrorType) {
            var shouldHandle = safePredicate(item, e);
            if (shouldHandle === errorObj) {
                e = errorObj.e;
                break;
            } else if (shouldHandle) {
                var ret = tryCatch(cb).call(boundTo, e);
                if (ret === errorObj) {
                    NEXT_FILTER.e = ret.e;
                    return NEXT_FILTER;
                }
                return ret;
            }
        }
    }
    NEXT_FILTER.e = e;
    return NEXT_FILTER;
};

return CatchFilter;
};

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace, isDebugging) {
var contextStack = [];
function Context() {
    this._trace = new CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.pop();
    }
};

function createContext() {
    if (isDebugging()) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}

Promise.prototype._peekContext = peekContext;
Promise.prototype._pushContext = Context.prototype._pushContext;
Promise.prototype._popContext = Context.prototype._popContext;

return createContext;
};

},{}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var Warning = _dereq_("./errors.js").Warning;
var util = _dereq_("./util.js");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var debugging = false || (util.isNode &&
                    (!!process.env["BLUEBIRD_DEBUG"] ||
                     process.env["NODE_ENV"] === "development"));

if (debugging) {
    async.disableTrampolineIfNecessary();
}

Promise.prototype._ignoreRejections = function() {
    this._unsetRejectionIsUnhandled();
    this._bitField = this._bitField | 16777216;
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 16777216) !== 0) return;
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    CapturedTrace.fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._getCarriedStackTrace() || this._settledValue;
        this._setUnhandledRejectionIsNotified();
        CapturedTrace.fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 524288;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~524288);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 524288) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 2097152;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~2097152);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 2097152) > 0;
};

Promise.prototype._setCarriedStackTrace = function (capturedTrace) {
    this._bitField = this._bitField | 1048576;
    this._fulfillmentHandler0 = capturedTrace;
};

Promise.prototype._isCarryingStackTrace = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._getCarriedStackTrace = function () {
    return this._isCarryingStackTrace()
        ? this._fulfillmentHandler0
        : undefined;
};

Promise.prototype._captureStackTrace = function () {
    if (debugging) {
        this._trace = new CapturedTrace(this._peekContext());
    }
    return this;
};

Promise.prototype._attachExtraTrace = function (error, ignoreSelf) {
    if (debugging && canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = CapturedTrace.parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
};

Promise.prototype._warn = function(message) {
    var warning = new Warning(message);
    var ctx = this._peekContext();
    if (ctx) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = CapturedTrace.parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }
    CapturedTrace.formatAndLogError(warning, "");
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

Promise.longStackTraces = function () {
    if (async.haveItemsQueued() &&
        debugging === false
   ) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/DT1qyG\u000a");
    }
    debugging = CapturedTrace.isSupported();
    if (debugging) {
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return debugging && CapturedTrace.isSupported();
};

if (!CapturedTrace.isSupported()) {
    Promise.longStackTraces = function(){};
    debugging = false;
}

return function() {
    return debugging;
};
};

},{"./async.js":2,"./errors.js":13,"./util.js":38}],11:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;

module.exports = function(Promise) {
var returner = function () {
    return this;
};
var thrower = function () {
    throw this;
};
var returnUndefined = function() {};
var throwUndefined = function() {
    throw undefined;
};

var wrapper = function (value, action) {
    if (action === 1) {
        return function () {
            throw value;
        };
    } else if (action === 2) {
        return function () {
            return value;
        };
    }
};


Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value === undefined) return this.then(returnUndefined);

    if (isPrimitive(value)) {
        return this._then(
            wrapper(value, 2),
            undefined,
            undefined,
            undefined,
            undefined
       );
    }
    return this._then(returner, undefined, undefined, value, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    if (reason === undefined) return this.then(throwUndefined);

    if (isPrimitive(reason)) {
        return this._then(
            wrapper(reason, 1),
            undefined,
            undefined,
            undefined,
            undefined
       );
    }
    return this._then(thrower, undefined, undefined, reason, undefined);
};
};

},{"./util.js":38}],12:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, null, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, null, INTERNAL);
};
};

},{}],13:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util.js");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    notEnumerableProp(Error, "__BluebirdErrorTypes__", errorTypes);
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5.js":14,"./util.js":38}],14:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, NEXT_FILTER, tryConvertToPromise) {
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;
var thrower = util.thrower;

function returnThis() {
    return this;
}
function throwThis() {
    throw this;
}
function return$(r) {
    return function() {
        return r;
    };
}
function throw$(r) {
    return function() {
        throw r;
    };
}
function promisedFinally(ret, reasonOrValue, isFulfilled) {
    var then;
    if (isPrimitive(reasonOrValue)) {
        then = isFulfilled ? return$(reasonOrValue) : throw$(reasonOrValue);
    } else {
        then = isFulfilled ? returnThis : throwThis;
    }
    return ret._then(then, thrower, undefined, reasonOrValue, undefined);
}

function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundValue())
                    : handler();

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, reasonOrValue,
                                    promise.isFulfilled());
        }
    }

    if (promise.isRejected()) {
        NEXT_FILTER.e = reasonOrValue;
        return NEXT_FILTER;
    } else {
        return reasonOrValue;
    }
}

function tapHandler(value) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundValue(), value)
                    : handler(value);

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, value, true);
        }
    }
    return value;
}

Promise.prototype._passThroughHandler = function (handler, isFinally) {
    if (typeof handler !== "function") return this.then();

    var promiseAndHandler = {
        promise: this,
        handler: handler
    };

    return this._then(
            isFinally ? finallyHandler : tapHandler,
            isFinally ? finallyHandler : undefined, undefined,
            promiseAndHandler, undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThroughHandler(handler, true);
};

Promise.prototype.tap = function (handler) {
    return this._passThroughHandler(handler, false);
};
};

},{"./util.js":38}],17:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise) {
var errors = _dereq_("./errors.js");
var TypeError = errors.TypeError;
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    var promise = this._promise = new Promise(INTERNAL);
    promise._captureStackTrace();
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
}

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._next(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    if (result === errorObj) {
        return this._promise._rejectCallback(result.e, false, true);
    }

    var value = result.value;
    if (result.done === true) {
        this._promise._resolveCallback(value);
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._throw(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/4Y4pDk\u000a\u000a".replace("%s", value) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise._then(
            this._next,
            this._throw,
            undefined,
            this,
            null
       );
    }
};

PromiseSpawn.prototype._throw = function (reason) {
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._next = function (value) {
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        spawn._generator = generator;
        spawn._next(undefined);
        return spawn.promise();
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors.js":13,"./util.js":38}],18:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var caller = function(count) {
        var values = [];
        for (var i = 1; i <= count; ++i) values.push("holder.p" + i);
        return new Function("holder", "                                      \n\
            'use strict';                                                    \n\
            var callback = holder.fn;                                        \n\
            return callback(values);                                         \n\
            ".replace(/values/g, values.join(", ")));
    };
    var thenCallbacks = [];
    var callers = [undefined];
    for (var i = 1; i <= 5; ++i) {
        thenCallbacks.push(thenCallback(i));
        callers.push(caller(i));
    }

    var Holder = function(total, fn) {
        this.p1 = this.p2 = this.p3 = this.p4 = this.p5 = null;
        this.fn = fn;
        this.total = total;
        this.now = 0;
    };

    Holder.prototype.callers = callers;
    Holder.prototype.checkFulfillment = function(promise) {
        var now = this.now;
        now++;
        var total = this.total;
        if (now >= total) {
            var handler = this.callers[total];
            promise._pushContext();
            var ret = tryCatch(handler)(this);
            promise._popContext();
            if (ret === errorObj) {
                promise._rejectCallback(ret.e, false, true);
            } else {
                promise._resolveCallback(ret);
            }
        } else {
            this.now = now;
        }
    };

    var reject = function (reason) {
        this._reject(reason);
    };
}
}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last < 6 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var holder = new Holder(last, fn);
                var callbacks = thenCallbacks;
                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        if (maybePromise._isPending()) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                        } else if (maybePromise._isFulfilled()) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else {
                            ret._reject(maybePromise._reason());
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }
                return ret;
            }
        }
    }
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util.js":38}],19:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var PENDING = {};
var EMPTY_ARRAY = [];

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : domain.bind(fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = limit >= 1 ? [] : EMPTY_ARRAY;
    async.invoke(init, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);
function init() {this._init$(undefined, -2);}

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;
    if (values[index] === PENDING) {
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var callback = this._callback;
        var receiver = this._promise._boundValue();
        this._promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        this._promise._popContext();
        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                if (limit >= 1) this._inFlight++;
                values[index] = PENDING;
                return maybePromise._proxyPromiseArray(this, index);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }

    }
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    var limit = typeof options === "object" && options !== null
        ? options.concurrency
        : 0;
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter);
}

Promise.prototype.map = function (fn, options) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");

    return map(this, fn, options, null).promise();
};

Promise.map = function (promises, fn, options, _filter) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    return map(promises, fn, options, _filter).promise();
};


};

},{"./async.js":2,"./util.js":38}],20:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        ret._popContext();
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn, args, ctx) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value = util.isArray(args)
        ? tryCatch(fn).apply(ctx, args)
        : tryCatch(fn).call(ctx, args);
    ret._popContext();
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false, true);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util.js":38}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var target = promise._target();
        var newReason = target._getCarriedStackTrace();
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback =
Promise.prototype.nodeify = function (nodeback, options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./async.js":2,"./util.js":38}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

Promise.prototype.progressed = function (handler) {
    return this._then(undefined, undefined, handler, undefined, undefined);
};

Promise.prototype._progress = function (progressValue) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._target()._progressUnchecked(progressValue);

};

Promise.prototype._progressHandlerAt = function (index) {
    return index === 0
        ? this._progressHandler0
        : this[(index << 2) + index - 5 + 2];
};

Promise.prototype._doProgressWith = function (progression) {
    var progressValue = progression.value;
    var handler = progression.handler;
    var promise = progression.promise;
    var receiver = progression.receiver;

    var ret = tryCatch(handler).call(receiver, progressValue);
    if (ret === errorObj) {
        if (ret.e != null &&
            ret.e.name !== "StopProgressPropagation") {
            var trace = util.canAttachTrace(ret.e)
                ? ret.e : new Error(util.toString(ret.e));
            promise._attachExtraTrace(trace);
            promise._progress(ret.e);
        }
    } else if (ret instanceof Promise) {
        ret._then(promise._progress, null, null, promise, undefined);
    } else {
        promise._progress(ret);
    }
};


Promise.prototype._progressUnchecked = function (progressValue) {
    var len = this._length();
    var progress = this._progress;
    for (var i = 0; i < len; i++) {
        var handler = this._progressHandlerAt(i);
        var promise = this._promiseAt(i);
        if (!(promise instanceof Promise)) {
            var receiver = this._receiverAt(i);
            if (typeof handler === "function") {
                handler.call(receiver, progressValue, promise);
            } else if (receiver instanceof PromiseArray &&
                       !receiver._isResolved()) {
                receiver._promiseProgressed(progressValue, promise);
            }
            continue;
        }

        if (typeof handler === "function") {
            async.invoke(this._doProgressWith, this, {
                handler: handler,
                promise: promise,
                receiver: this._receiverAt(i),
                value: progressValue
            });
        } else {
            async.invoke(progress, promise, progressValue);
        }
    }
};
};

},{"./async.js":2,"./util.js":38}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/LhFpo0\u000a");
};
var reflect = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};

var util = _dereq_("./util.js");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var async = _dereq_("./async.js");
var errors = _dereq_("./errors.js");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {e: null};
var tryConvertToPromise = _dereq_("./thenables.js")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array.js")(Promise, INTERNAL,
                                    tryConvertToPromise, apiRejection);
var CapturedTrace = _dereq_("./captured_trace.js")();
var isDebugging = _dereq_("./debuggability.js")(Promise, CapturedTrace);
 /*jshint unused:false*/
var createContext =
    _dereq_("./context.js")(Promise, CapturedTrace, isDebugging);
var CatchFilter = _dereq_("./catch_filter.js")(NEXT_FILTER);
var PromiseResolver = _dereq_("./promise_resolver.js");
var nodebackForPromise = PromiseResolver._nodebackForPromise;
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function Promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("the promise constructor requires a resolver function\u000a\u000a    See http://goo.gl/EC22Yn\u000a");
    }
    if (this.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/KsIlge\u000a");
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._progressHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settledValue = undefined;
    if (resolver !== INTERNAL) this._resolveFromResolver(resolver);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (typeof item === "function") {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(
                    new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a"));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        var catchFilter = new CatchFilter(catchInstances, fn, this);
        return this._then(undefined, catchFilter.doFilter, undefined,
            catchFilter, undefined);
    }
    return this._then(undefined, fn, undefined, undefined, undefined);
};

Promise.prototype.reflect = function () {
    return this._then(reflect, reflect, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject, didProgress) {
    if (isDebugging() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject, didProgress) {
    var promise = this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (didFulfill, didReject) {
    return this.all()._then(didFulfill, didReject, undefined, APPLY, undefined);
};

Promise.prototype.isCancellable = function () {
    return !this.isResolved() &&
        this._cancellable();
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = function(fn) {
    var ret = new Promise(INTERNAL);
    var result = tryCatch(fn)(nodebackForPromise(ret));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true, true);
    }
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.defer = Promise.pending = function () {
    var promise = new Promise(INTERNAL);
    return new PromiseResolver(promise);
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        var val = ret;
        ret = new Promise(INTERNAL);
        ret._fulfillUnchecked(val);
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var prev = async._schedule;
    async._schedule = fn;
    return prev;
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var ret = haveInternalData ? internalData : new Promise(INTERNAL);

    if (!haveInternalData) {
        ret._propagateFrom(this, 4 | 1);
        ret._captureStackTrace();
    }

    var target = this._target();
    if (target !== this) {
        if (receiver === undefined) receiver = this._boundTo;
        if (!haveInternalData) ret._setIsMigrated();
    }

    var callbackIndex = target._addCallbacks(didFulfill,
                                             didReject,
                                             didProgress,
                                             ret,
                                             receiver,
                                             getDomain());

    if (target._isResolved() && !target._isSettlePromisesQueued()) {
        async.invoke(
            target._settlePromiseAtPostResolution, target, callbackIndex);
    }

    return ret;
};

Promise.prototype._settlePromiseAtPostResolution = function (index) {
    if (this._isRejectionUnhandled()) this._unsetRejectionIsUnhandled();
    this._settlePromiseAt(index);
};

Promise.prototype._length = function () {
    return this._bitField & 131071;
};

Promise.prototype._isFollowingOrFulfilledOrRejected = function () {
    return (this._bitField & 939524096) > 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 536870912) === 536870912;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -131072) |
        (len & 131071);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 536870912;
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 33554432) > 0;
};

Promise.prototype._cancellable = function () {
    return (this._bitField & 67108864) > 0;
};

Promise.prototype._setCancellable = function () {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._unsetCancellable = function () {
    this._bitField = this._bitField & (~67108864);
};

Promise.prototype._setIsMigrated = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._unsetIsMigrated = function () {
    this._bitField = this._bitField & (~4194304);
};

Promise.prototype._isMigrated = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0
        ? this._receiver0
        : this[
            index * 5 - 5 + 4];
    if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return index === 0
        ? this._promise0
        : this[index * 5 - 5 + 3];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return index === 0
        ? this._fulfillmentHandler0
        : this[index * 5 - 5 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return index === 0
        ? this._rejectionHandler0
        : this[index * 5 - 5 + 1];
};

Promise.prototype._boundValue = function() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
};

Promise.prototype._migrateCallbacks = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var progress = follower._progressHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (promise instanceof Promise) promise._setIsMigrated();
    this._addCallbacks(fulfill, reject, progress, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    progress,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        if (receiver !== undefined) this._receiver0 = receiver;
        if (typeof fulfill === "function" && !this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : domain.bind(reject);
        }
        if (typeof progress === "function") {
            this._progressHandler0 =
                domain === null ? progress : domain.bind(progress);
        }
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promise;
        this[base + 4] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : domain.bind(reject);
        }
        if (typeof progress === "function") {
            this[base + 2] =
                domain === null ? progress : domain.bind(progress);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._setProxyHandlers = function (receiver, promiseSlotValue) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }
    if (index === 0) {
        this._promise0 = promiseSlotValue;
        this._receiver0 = receiver;
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promiseSlotValue;
        this[base + 4] = receiver;
    }
    this._setLength(index + 1);
};

Promise.prototype._proxyPromiseArray = function (promiseArray, index) {
    this._setProxyHandlers(promiseArray, index);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false, true);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    var propagationFlags = 1 | (shouldBind ? 4 : 0);
    this._propagateFrom(maybePromise, propagationFlags);
    var promise = maybePromise._target();
    if (promise._isPending()) {
        var len = this._length();
        for (var i = 0; i < len; ++i) {
            promise._migrateCallbacks(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (promise._isFulfilled()) {
        this._fulfillUnchecked(promise._value());
    } else {
        this._rejectUnchecked(promise._reason(),
            promise._getCarriedStackTrace());
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, shouldNotMarkOriginatingFromRejection) {
    if (!shouldNotMarkOriginatingFromRejection) {
        util.markAsOriginatingFromRejection(reason);
    }
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason, hasStack ? undefined : trace);
};

Promise.prototype._resolveFromResolver = function (resolver) {
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = tryCatch(resolver)(function(value) {
        if (promise === null) return;
        promise._resolveCallback(value);
        promise = null;
    }, function (reason) {
        if (promise === null) return;
        promise._rejectCallback(reason, synchronous);
        promise = null;
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined && r === errorObj && promise !== null) {
        promise._rejectCallback(r.e, true, true);
        promise = null;
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    if (promise._isRejected()) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY && !this._isRejected()) {
        x = tryCatch(handler).apply(this._boundValue(), value);
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    promise._popContext();

    if (x === errorObj || x === promise || x === NEXT_FILTER) {
        var err = x === promise ? makeSelfResolutionError() : x.e;
        promise._rejectCallback(err, false, true);
    } else {
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._cleanValues = function () {
    if (this._cancellable()) {
        this._cancellationParent = undefined;
    }
};

Promise.prototype._propagateFrom = function (parent, flags) {
    if ((flags & 1) > 0 && parent._cancellable()) {
        this._setCancellable();
        this._cancellationParent = parent;
    }
    if ((flags & 4) > 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
};

Promise.prototype._fulfill = function (value) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._fulfillUnchecked(value);
};

Promise.prototype._reject = function (reason, carriedStackTrace) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._rejectUnchecked(reason, carriedStackTrace);
};

Promise.prototype._settlePromiseAt = function (index) {
    var promise = this._promiseAt(index);
    var isPromise = promise instanceof Promise;

    if (isPromise && promise._isMigrated()) {
        promise._unsetIsMigrated();
        return async.invoke(this._settlePromiseAt, this, index);
    }
    var handler = this._isFulfilled()
        ? this._fulfillmentHandlerAt(index)
        : this._rejectionHandlerAt(index);

    var carriedStackTrace =
        this._isCarryingStackTrace() ? this._getCarriedStackTrace() : undefined;
    var value = this._settledValue;
    var receiver = this._receiverAt(index);
    this._clearCallbackDataAtIndex(index);

    if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof PromiseArray) {
        if (!receiver._isResolved()) {
            if (this._isFulfilled()) {
                receiver._promiseFulfilled(value, promise);
            }
            else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (this._isFulfilled()) {
            promise._fulfill(value);
        } else {
            promise._reject(value, carriedStackTrace);
        }
    }

    if (index >= 4 && (index & 31) === 4)
        async.invokeLater(this._setLength, this, 0);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    if (index === 0) {
        if (!this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 = undefined;
        }
        this._rejectionHandler0 =
        this._progressHandler0 =
        this._receiver0 =
        this._promise0 = undefined;
    } else {
        var base = index * 5 - 5;
        this[base + 3] =
        this[base + 4] =
        this[base + 0] =
        this[base + 1] =
        this[base + 2] = undefined;
    }
};

Promise.prototype._isSettlePromisesQueued = function () {
    return (this._bitField &
            -1073741824) === -1073741824;
};

Promise.prototype._setSettlePromisesQueued = function () {
    this._bitField = this._bitField | -1073741824;
};

Promise.prototype._unsetSettlePromisesQueued = function () {
    this._bitField = this._bitField & (~-1073741824);
};

Promise.prototype._queueSettlePromises = function() {
    async.settlePromises(this);
    this._setSettlePromisesQueued();
};

Promise.prototype._fulfillUnchecked = function (value) {
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err, undefined);
    }
    this._setFulfilled();
    this._settledValue = value;
    this._cleanValues();

    if (this._length() > 0) {
        this._queueSettlePromises();
    }
};

Promise.prototype._rejectUncheckedCheckError = function (reason) {
    var trace = util.ensureErrorObject(reason);
    this._rejectUnchecked(reason, trace === reason ? undefined : trace);
};

Promise.prototype._rejectUnchecked = function (reason, trace) {
    if (reason === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err);
    }
    this._setRejected();
    this._settledValue = reason;
    this._cleanValues();

    if (this._isFinal()) {
        async.throwLater(function(e) {
            if ("stack" in e) {
                async.invokeFirst(
                    CapturedTrace.unhandledRejection, undefined, e);
            }
            throw e;
        }, trace === undefined ? reason : trace);
        return;
    }

    if (trace !== undefined && trace !== reason) {
        this._setCarriedStackTrace(trace);
    }

    if (this._length() > 0) {
        this._queueSettlePromises();
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._settlePromises = function () {
    this._unsetSettlePromisesQueued();
    var len = this._length();
    for (var i = 0; i < len; i++) {
        this._settlePromiseAt(i);
    }
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./progress.js")(Promise, PromiseArray);
_dereq_("./method.js")(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_("./bind.js")(Promise, INTERNAL, tryConvertToPromise);
_dereq_("./finally.js")(Promise, NEXT_FILTER, tryConvertToPromise);
_dereq_("./direct_resolve.js")(Promise);
_dereq_("./synchronous_inspection.js")(Promise);
_dereq_("./join.js")(Promise, PromiseArray, tryConvertToPromise, INTERNAL);
Promise.Promise = Promise;
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./cancel.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise);
_dereq_('./nodeify.js')(Promise);
_dereq_('./call_get.js')(Promise);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./settle.js')(Promise, PromiseArray);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./timers.js')(Promise, INTERNAL);
_dereq_('./filter.js')(Promise, INTERNAL);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._progressHandler0 = value;                                         
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
        p._settledValue = value;                                             
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    CapturedTrace.setBounds(async.firstLineError, util.lastLineError);       
    return Promise;                                                          

};

},{"./any.js":1,"./async.js":2,"./bind.js":3,"./call_get.js":5,"./cancel.js":6,"./captured_trace.js":7,"./catch_filter.js":8,"./context.js":9,"./debuggability.js":10,"./direct_resolve.js":11,"./each.js":12,"./errors.js":13,"./filter.js":15,"./finally.js":16,"./generators.js":17,"./join.js":18,"./map.js":19,"./method.js":20,"./nodeify.js":21,"./progress.js":22,"./promise_array.js":24,"./promise_resolver.js":25,"./promisify.js":26,"./props.js":27,"./race.js":29,"./reduce.js":30,"./settle.js":32,"./some.js":33,"./synchronous_inspection.js":34,"./thenables.js":35,"./timers.js":36,"./using.js":37,"./util.js":38}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection) {
var util = _dereq_("./util.js");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    var parent;
    if (values instanceof Promise) {
        parent = values;
        promise._propagateFrom(parent, 1 | 4);
    }
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        this._values = values;
        if (values._isFulfilled()) {
            values = values._value();
            if (!isArray(values)) {
                var err = new Promise.TypeError("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
                this.__hardReject__(err);
                return;
            }
        } else if (values._isPending()) {
            values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
            return;
        } else {
            this._reject(values._reason());
            return;
        }
    } else if (!isArray(values)) {
        this._promise._reject(apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a")._reason());
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var promise = this._promise;
    for (var i = 0; i < len; ++i) {
        var isResolved = this._isResolved();
        var maybePromise = tryConvertToPromise(values[i], promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (isResolved) {
                maybePromise._ignoreRejections();
            } else if (maybePromise._isPending()) {
                maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                this._promiseFulfilled(maybePromise._value(), i);
            } else {
                this._promiseRejected(maybePromise._reason(), i);
            }
        } else if (!isResolved) {
            this._promiseFulfilled(maybePromise, i);
        }
    }
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype.__hardReject__ =
PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false, true);
};

PromiseArray.prototype._promiseProgressed = function (progressValue, index) {
    this._promise._progress({
        index: index,
        value: progressValue
    });
};


PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

PromiseArray.prototype._promiseRejected = function (reason, index) {
    this._totalResolved++;
    this._reject(reason);
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util.js":38}],25:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors.js");
var TimeoutError = errors.TimeoutError;
var OperationalError = errors.OperationalError;
var haveGetters = util.haveGetters;
var es5 = _dereq_("./es5.js");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise) {
    return function(err, value) {
        if (promise === null) return;

        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (arguments.length > 2) {
            var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
            promise._fulfill(args);
        } else {
            promise._fulfill(value);
        }

        promise = null;
    };
}


var PromiseResolver;
if (!haveGetters) {
    PromiseResolver = function (promise) {
        this.promise = promise;
        this.asCallback = nodebackForPromise(promise);
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function (promise) {
        this.promise = promise;
    };
}
if (haveGetters) {
    var prop = {
        get: function() {
            return nodebackForPromise(this.promise);
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForPromise = nodebackForPromise;

PromiseResolver.prototype.toString = function () {
    return "[object PromiseResolver]";
};

PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._resolveCallback(value);
};

PromiseResolver.prototype.reject = function (reason) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._rejectCallback(reason);
};

PromiseResolver.prototype.progress = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._progress(value);
};

PromiseResolver.prototype.cancel = function (err) {
    this.promise.cancel(err);
};

PromiseResolver.prototype.timeout = function () {
    this.reject(new TimeoutError("timeout"));
};

PromiseResolver.prototype.isResolved = function () {
    return this.promise.isResolved();
};

PromiseResolver.prototype.toJSON = function () {
    return this.promise.toJSON();
};

module.exports = PromiseResolver;

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],26:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util.js");
var nodebackForPromise = _dereq_("./promise_resolver.js")
    ._nodebackForPromise;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/iWrZbw\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";

    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL","'use strict';                            \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise);                      \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
        "
        .replace("Parameters", parameterDeclaration(newParameterCount))
        .replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode))(
            Promise,
            fn,
            receiver,
            withAppended,
            maybeWrapAsError,
            nodebackForPromise,
            util.tryCatch,
            util.errorObj,
            util.notEnumerableProp,
            INTERNAL
        );
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        obj[promisifiedKey] = promisifier === makeNodePromisified
                ? makeNodePromisified(key, THIS, key, fn, suffix)
                : promisifier(fn, function() {
                    return makeNodePromisified(key, THIS, key, fn, suffix);
                });
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver) {
    return makeNodePromisified(callback, receiver, undefined, callback);
}

Promise.promisify = function (fn, receiver) {
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    if (isPromisified(fn)) {
        return fn;
    }
    var ret = promisify(fn, arguments.length < 2 ? THIS : receiver);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/9ITlV0\u000a");
    }
    options = Object(options);
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/8FZo5V\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier);
            promisifyAll(value, suffix, filter, promisifier);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier);
};
};


},{"./errors":13,"./promise_resolver.js":25,"./util.js":38}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var isObject = util.isObject;
var es5 = _dereq_("./es5.js");

function PropertiesPromiseArray(obj) {
    var keys = es5.keys(obj);
    var len = keys.length;
    var values = new Array(len * 2);
    for (var i = 0; i < len; ++i) {
        var key = keys[i];
        values[i] = obj[key];
        values[i + len] = key;
    }
    this.constructor$(values);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {
    this._init$(undefined, -3) ;
};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val = {};
        var keyOffset = this.length();
        for (var i = 0, len = this.length(); i < len; ++i) {
            val[this._values[i + keyOffset]] = this._values[i];
        }
        this._resolve(val);
    }
};

PropertiesPromiseArray.prototype._promiseProgressed = function (value, index) {
    this._promise._progress({
        key: this._values[index + this.length()],
        value: value
    });
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/OsFKC8\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 4);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5.js":14,"./util.js":38}],28:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype._unshiftOne = function(value) {
    var capacity = this._capacity;
    this._checkCapacity(this.length() + 1);
    var front = this._front;
    var i = (((( front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
    this[i] = value;
    this._front = i;
    this._length = this.length() + 1;
};

Queue.prototype.unshift = function(fn, receiver, arg) {
    this._unshiftOne(arg);
    this._unshiftOne(receiver);
    this._unshiftOne(fn);
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],29:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var isArray = _dereq_("./util.js").isArray;

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else if (!isArray(promises)) {
        return apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 4 | 1);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util.js":38}],30:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
function ReductionPromiseArray(promises, fn, accum, _each) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    this._preservedValues = _each === INTERNAL ? [] : null;
    this._zerothIsAccum = (accum === undefined);
    this._gotAccum = false;
    this._reducingIndex = (this._zerothIsAccum ? 1 : 0);
    this._valuesPhase = undefined;
    var maybePromise = tryConvertToPromise(accum, this._promise);
    var rejected = false;
    var isPromise = maybePromise instanceof Promise;
    if (isPromise) {
        maybePromise = maybePromise._target();
        if (maybePromise._isPending()) {
            maybePromise._proxyPromiseArray(this, -1);
        } else if (maybePromise._isFulfilled()) {
            accum = maybePromise._value();
            this._gotAccum = true;
        } else {
            this._reject(maybePromise._reason());
            rejected = true;
        }
    }
    if (!(isPromise || this._zerothIsAccum)) this._gotAccum = true;
    var domain = getDomain();
    this._callback = domain === null ? fn : domain.bind(fn);
    this._accum = accum;
    if (!rejected) async.invoke(init, this, undefined);
}
function init() {
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._init = function () {};

ReductionPromiseArray.prototype._resolveEmptyArray = function () {
    if (this._gotAccum || this._zerothIsAccum) {
        this._resolve(this._preservedValues !== null
                        ? [] : this._accum);
    }
};

ReductionPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    values[index] = value;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var isEach = preservedValues !== null;
    var gotAccum = this._gotAccum;
    var valuesPhase = this._valuesPhase;
    var valuesPhaseIndex;
    if (!valuesPhase) {
        valuesPhase = this._valuesPhase = new Array(length);
        for (valuesPhaseIndex=0; valuesPhaseIndex<length; ++valuesPhaseIndex) {
            valuesPhase[valuesPhaseIndex] = 0;
        }
    }
    valuesPhaseIndex = valuesPhase[index];

    if (index === 0 && this._zerothIsAccum) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
        valuesPhase[index] = ((valuesPhaseIndex === 0)
            ? 1 : 2);
    } else if (index === -1) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
    } else {
        if (valuesPhaseIndex === 0) {
            valuesPhase[index] = 1;
        } else {
            valuesPhase[index] = 2;
            this._accum = value;
        }
    }
    if (!gotAccum) return;

    var callback = this._callback;
    var receiver = this._promise._boundValue();
    var ret;

    for (var i = this._reducingIndex; i < length; ++i) {
        valuesPhaseIndex = valuesPhase[i];
        if (valuesPhaseIndex === 2) {
            this._reducingIndex = i + 1;
            continue;
        }
        if (valuesPhaseIndex !== 1) return;
        value = values[i];
        this._promise._pushContext();
        if (isEach) {
            preservedValues.push(value);
            ret = tryCatch(callback).call(receiver, value, i, length);
        }
        else {
            ret = tryCatch(callback)
                .call(receiver, this._accum, value, i, length);
        }
        this._promise._popContext();

        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                valuesPhase[i] = 4;
                return maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }

        this._reducingIndex = i + 1;
        this._accum = ret;
    }

    this._resolve(isEach ? preservedValues : this._accum);
};

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};
};

},{"./async.js":2,"./util.js":38}],31:[function(_dereq_,module,exports){
"use strict";
var schedule;
var util = _dereq_("./util");
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
};
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            window.navigator.standalone)) {
    schedule = function(fn) {
        var div = document.createElement("div");
        var observer = new MutationObserver(fn);
        observer.observe(div, {attributes: true});
        return function() { div.classList.toggle("foo"); };
    };
    schedule.isStatic = true;
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":38}],32:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util.js");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 268435456;
    ret._settledValue = value;
    this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 134217728;
    ret._settledValue = reason;
    this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return new SettledPromiseArray(this).promise();
};
};

},{"./util.js":38}],33:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util.js");
var RangeError = _dereq_("./errors.js").RangeError;
var AggregateError = _dereq_("./errors.js").AggregateError;
var isArray = util.isArray;


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
    }

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            e.push(this._values[i]);
        }
        this._reject(e);
    }
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/1wAmHx\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors.js":13,"./util.js":38}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValue = promise._settledValue;
    }
    else {
        this._bitField = 0;
        this._settledValue = undefined;
    }
}

PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.isFulfilled =
Promise.prototype._isFulfilled = function () {
    return (this._bitField & 268435456) > 0;
};

PromiseInspection.prototype.isRejected =
Promise.prototype._isRejected = function () {
    return (this._bitField & 134217728) > 0;
};

PromiseInspection.prototype.isPending =
Promise.prototype._isPending = function () {
    return (this._bitField & 402653184) === 0;
};

PromiseInspection.prototype.isResolved =
Promise.prototype._isResolved = function () {
    return (this._bitField & 402653184) > 0;
};

Promise.prototype.isPending = function() {
    return this._target()._isPending();
};

Promise.prototype.isRejected = function() {
    return this._target()._isRejected();
};

Promise.prototype.isFulfilled = function() {
    return this._target()._isFulfilled();
};

Promise.prototype.isResolved = function() {
    return this._target()._isResolved();
};

Promise.prototype._value = function() {
    return this._settledValue;
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue;
};

Promise.prototype.value = function() {
    var target = this._target();
    if (!target.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return target._settledValue;
};

Promise.prototype.reason = function() {
    var target = this._target();
    if (!target.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    target._unsetRejectionIsUnhandled();
    return target._settledValue;
};


Promise.PromiseInspection = PromiseInspection;
};

},{}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) {
            return obj;
        }
        else if (isAnyBluebirdPromise(obj)) {
            var ret = new Promise(INTERNAL);
            obj._then(
                ret._fulfillUnchecked,
                ret._rejectUncheckedCheckError,
                ret._progressUnchecked,
                ret,
                null
            );
            return ret;
        }
        var then = util.tryCatch(getThen)(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function getThen(obj) {
    return obj.then;
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    return hasProp.call(obj, "_promise0");
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x,
                                        resolveFromThenable,
                                        rejectFromThenable,
                                        progressFromThenable);
    synchronous = false;
    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolveFromThenable(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function rejectFromThenable(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }

    function progressFromThenable(value) {
        if (!promise) return;
        if (typeof promise._progress === "function") {
            promise._progress(value);
        }
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util.js":38}],36:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var TimeoutError = Promise.TimeoutError;

var afterTimeout = function (promise, message) {
    if (!promise.isPending()) return;
    if (typeof message !== "string") {
        message = "operation timed out";
    }
    var err = new TimeoutError(message);
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._cancel(err);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (value, ms) {
    if (ms === undefined) {
        ms = value;
        value = undefined;
        var ret = new Promise(INTERNAL);
        setTimeout(function() { ret._fulfill(); }, ms);
        return ret;
    }
    ms = +ms;
    return Promise.resolve(value)._then(afterValue, null, null, ms, undefined);
};

Promise.prototype.delay = function (ms) {
    return delay(this, ms);
};

function successClear(value) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    return value;
}

function failureClear(reason) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret = this.then().cancellable();
    ret._cancellationParent = this;
    var handle = setTimeout(function timeoutTimeout() {
        afterTimeout(ret, message);
    }, ms);
    return ret._then(successClear, failureClear, undefined, handle, undefined);
};

};

},{"./util.js":38}],37:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext) {
    var TypeError = _dereq_("./errors.js").TypeError;
    var inherits = _dereq_("./util.js").inherits;
    var PromiseInspection = Promise.PromiseInspection;

    function inspectionMapper(inspections) {
        var len = inspections.length;
        for (var i = 0; i < len; ++i) {
            var inspection = inspections[i];
            if (inspection.isRejected()) {
                return Promise.reject(inspection.error());
            }
            inspections[i] = inspection._settledValue;
        }
        return inspections;
    }

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = Promise.defer();
        function iterator() {
            if (i >= len) return ret.resolve();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret.promise;
    }

    function disposerSuccess(value) {
        var inspection = new PromiseInspection();
        inspection._settledValue = value;
        inspection._bitField = 268435456;
        return dispose(this, inspection).thenReturn(value);
    }

    function disposerFail(reason) {
        var inspection = new PromiseInspection();
        inspection._settledValue = reason;
        inspection._bitField = 134217728;
        return dispose(this, inspection).thenThrow(reason);
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return null;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== null
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
        len--;
        var resources = new Array(len);
        for (var i = 0; i < len; ++i) {
            var resource = arguments[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var promise = Promise.settle(resources)
            .then(inspectionMapper)
            .then(function(vals) {
                promise._pushContext();
                var ret;
                try {
                    ret = fn.apply(undefined, vals);
                } finally {
                    promise._popContext();
                }
                return ret;
            })
            ._then(
                disposerSuccess, disposerFail, undefined, resources, undefined);
        resources.promise = promise;
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 262144;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 262144) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~262144);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors.js":13,"./util.js":38}],38:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var canEvaluate = typeof navigator == "undefined";
var haveGetters = (function(){
    try {
        var o = {};
        es5.defineProperty(o, "f", {
            get: function () {
                return 3;
            }
        });
        return o.f === 3;
    }
    catch (e) {
        return false;
    }

})();

var errorObj = {e: {}};
var tryCatchTarget;
function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return !isPrimitive(value);
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function f() {}
    f.prototype = obj;
    var l = 8;
    while (l--) new f();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return obj instanceof Error && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    haveGetters: haveGetters,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]"
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5.js":14}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":2}],2:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(_dereq_,module,exports){
/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define(function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

},{}],4:[function(_dereq_,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Promise = _dereq_('bluebird');

module.exports = (function () {
  function Collection(options) {
    _classCallCheck(this, Collection);

    this.url = options.url;
    this.model = options.model;
    this.models = [];
  }

  _createClass(Collection, [{
    key: 'fetch',
    value: function fetch() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        request.addEventListener('error', function (error) {
          reject(error);
        });
        request.addEventListener('load', function () {
          try {
            _this.models = JSON.parse(request.responseText).map(function (model_data) {
              if (_this.model) {
                return new _this.model(model_data);
              } else {
                return model_data;
              }
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        request.addEventListener('error', function (error) {
          window.application.display_message('Error communication.');
        });
        request.open('get', _this.url);
        request.send();
      });
    }
  }, {
    key: 'get',
    value: function get(id) {
      return this.models.find(function (model) {
        return model.id === id;
      });
    }
  }]);

  return Collection;
})();

},{"bluebird":1}],5:[function(_dereq_,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var Promise = _dereq_('bluebird');
var EventEmitter = _dereq_('eventemitter2').EventEmitter2;
var Sync = _dereq_('./sync.js');

var Model = (function (_EventEmitter) {
  _inherits(Model, _EventEmitter);

  function Model() {
    var _this = this;

    var properties = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Model);

    _get(Object.getPrototypeOf(Model.prototype), 'constructor', this).call(this);

    this.constructor.attributes.forEach(function (attribute) {
      _this.register_attribute(attribute);
    });

    this.attributes = this.attributes || {};

    Object.keys(properties).forEach(function (key) {
      _this[key] = properties[key];
    });
  }

  _createClass(Model, [{
    key: 'register_attribute',
    value: function register_attribute(attribute) {
      var _this2 = this;

      Object.defineProperty(this, attribute, {
        get: function get() {
          return _this2.attributes[attribute];
        },

        set: function set(new_value) {
          var old_value = _this2.attributes[attribute];
          if (old_value !== new_value) {
            var changes = {};
            changes[attribute] = { 'new': new_value, old: old_value };
            _this2.attributes[attribute] = new_value;
            _this2.emit('change', changes);
          }
        }
      });
    }
  }, {
    key: 'refresh',
    value: function refresh(callback) {
      var _this3 = this;

      return Sync.request('GET', this.url).then(function (data) {
        Object.keys(data).forEach(function (data_key) {
          _this3[data_key] = data[data_key];
        });

        if (callback) {
          callback();
        }
      })['catch'](function (error) {
        if (callback) {
          callback(error);
        } else {
          throw error;
        }
      });
    }
  }, {
    key: 'create',
    value: function create(callback) {
      var _this4 = this;

      return Sync.request('POST', this.collection_url, this.attributes).then(function (data) {
        Object.keys(data).forEach(function (data_key) {
          _this4[data_key] = data[data_key];
        });

        if (callback) {
          callback();
        }
      })['catch'](function (error) {
        if (callback) {
          callback(error);
        } else {
          throw error;
        }
      });
    }
  }, {
    key: 'update',
    value: function update(callback) {
      var _this5 = this;

      return Sync.request('PATCH', this.url, this.attributes).then(function (data) {
        Object.keys(data).forEach(function (data_key) {
          _this5[data_key] = data[data_key];
        });

        if (callback) {
          callback();
        }
      })['catch'](function (error) {
        if (callback) {
          callback(error);
        } else {
          throw error;
        }
      });
    }
  }, {
    key: 'delete',
    value: function _delete(callback) {
      return Sync.request('DELETE', this.url, this.attributes).then(function () {

        if (callback) {
          callback();
        }
      })['catch'](function (error) {
        if (callback) {
          callback(error);
        } else {
          throw error;
        }
      });
    }
  }]);

  return Model;
})(EventEmitter);

module.exports = Model;

},{"./sync.js":8,"bluebird":1,"eventemitter2":3}],6:[function(_dereq_,module,exports){
'use strict';

module.exports = {
  Model: _dereq_('./model.js'),
  View: _dereq_('./view.js'),
  Collection: _dereq_('./collection.js'),
  StateMachine: _dereq_('./state_machine.js')
};

},{"./collection.js":4,"./model.js":5,"./state_machine.js":7,"./view.js":9}],7:[function(_dereq_,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var EventEmitter = _dereq_('eventemitter2').EventEmitter2;

module.exports = (function (_EventEmitter) {
  _inherits(StateMachine, _EventEmitter);

  function StateMachine() {
    _classCallCheck(this, StateMachine);

    _get(Object.getPrototypeOf(StateMachine.prototype), 'constructor', this).apply(this, arguments);
  }

  _createClass(StateMachine, [{
    key: 'state',
    get: function get() {
      return this._current_state;
    },
    set: function set(new_state) {
      var old_state = this._current_state;
      this.emit('exit_state', old_state, new_state);
      this.emit('exit_state:' + old_state, new_state);
      this._current_state = new_state;
      this.emit('enter_state', new_state, old_state);
      this.emit('enter_state:' + new_state, old_state);
    }
  }]);

  return StateMachine;
})(EventEmitter);

},{"eventemitter2":3}],8:[function(_dereq_,module,exports){
'use strict';

module.exports = {
  request: function request(method, url) {
    var request_data = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    return new Promise(function (resolve, reject) {
      var http_request = new XMLHttpRequest();
      http_request.addEventListener('load', function () {
        if (http_request.status == 200) {
          var data = JSON.parse(http_request.responseText);
          resolve(data);
        } else {
          reject('Request returned ' + http_request.status);
        }
      });
      http_request.addEventListener('error', function (error) {
        reject(error);
      });
      http_request.open(method, url);
      if (request_data) {
        http_request.setRequestHeader('Content-Type', 'application/json');
        http_request.send(JSON.stringify(request_data));
      } else {
        http_request.send();
      }
    });
  }
};

},{}],9:[function(_dereq_,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var StateMachine = _dereq_('./state_machine.js');

var View = (function (_StateMachine) {
  _inherits(View, _StateMachine);

  function View() {
    var _this = this;

    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, View);

    _get(Object.getPrototypeOf(View.prototype), 'constructor', this).call(this);
    this.model_changed = function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this.emit.apply(_this, ['model:change'].concat(args));
    };

    Object.keys(options).forEach(function (key) {
      _this[key] = options[key];
    });
  }

  _createClass(View, [{
    key: 'createElement',
    value: function createElement(tag_name, attributes, content) {
      var element = document.createElement(tag_name);
      Object.keys(attributes).forEach(function (attribute_name) {
        element.setAttribute(attribute_name, attributes[attribute_name]);
      });

      element.innerHTML = content;
      return element;
    }
  }, {
    key: 'show',
    value: function show() {
      this.element.style.display = '';
    }
  }, {
    key: 'hide',
    value: function hide() {
      this.element.style.display = 'none';
    }
  }, {
    key: 'model',
    get: function get() {
      return this._model;
    },
    set: function set(new_model) {
      var old_model = this._model;
      if (old_model) {
        old_model.off('change', this.model_changed);
      }
      new_model.on('change', this.model_changed);

      this._model = new_model;
      this.emit('set_model');
    }
  }]);

  return View;
})(StateMachine);

module.exports = View;

},{"./state_machine.js":7}]},{},[6])(6)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmx1ZWJpcmQvanMvYnJvd3Nlci9ibHVlYmlyZC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMi9saWIvZXZlbnRlbWl0dGVyMi5qcyIsIi9Vc2Vycy9taWxpZXYvQ29kZS9yb3Nld29vZC9zcmMvY29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9taWxpZXYvQ29kZS9yb3Nld29vZC9zcmMvbW9kZWwuanMiLCIvVXNlcnMvbWlsaWV2L0NvZGUvcm9zZXdvb2Qvc3JjL3Jvc2V3b29kLmpzIiwiL1VzZXJzL21pbGlldi9Db2RlL3Jvc2V3b29kL3NyYy9zdGF0ZV9tYWNoaW5lLmpzIiwiL1VzZXJzL21pbGlldi9Db2RlL3Jvc2V3b29kL3NyYy9zeW5jLmpzIiwiL1VzZXJzL21pbGlldi9Db2RlL3Jvc2V3b29kL3NyYy92aWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3h2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7OztBQzdqQkEsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBOztBQUVqQyxNQUFNLENBQUMsT0FBTztBQUNBLFdBRFMsVUFBVSxDQUNsQixPQUFPLEVBQUU7MEJBREQsVUFBVTs7QUFFN0IsUUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFBO0FBQ3RCLFFBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtBQUMxQixRQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQTtHQUNqQjs7ZUFMb0IsVUFBVTs7V0FPekIsaUJBQUc7OztBQUNQLGFBQU8sSUFBSSxPQUFPLENBQUUsVUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFLO0FBQ3ZDLFlBQUksT0FBTyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7QUFDbEMsZUFBTyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxVQUFDLEtBQUssRUFBSztBQUFFLGdCQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7U0FBRSxDQUFDLENBQUE7QUFDL0QsZUFBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxZQUFNO0FBQ3JDLGNBQUk7QUFDRixrQkFBSyxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFFLFVBQUMsVUFBVSxFQUFLO0FBQ2xFLGtCQUFHLE1BQUssS0FBSyxFQUFDO0FBQ1osdUJBQU8sSUFBSSxNQUFLLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtlQUNsQyxNQUFNO0FBQ0wsdUJBQU8sVUFBVSxDQUFBO2VBQ2xCO2FBQ0YsQ0FBQyxDQUFBO0FBQ0YsbUJBQU8sRUFBRSxDQUFBO1dBQ1YsQ0FDRCxPQUFPLEtBQUssRUFBRTtBQUNaLGtCQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7V0FDZDtTQUNGLENBQUMsQ0FBQTtBQUNGLGVBQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsVUFBQyxLQUFLLEVBQUs7QUFDM0MsZ0JBQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUE7U0FDM0QsQ0FBQyxDQUFBO0FBQ0YsZUFBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBSyxHQUFHLENBQUMsQ0FBQTtBQUM3QixlQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7T0FDZixDQUFDLENBQUE7S0FDSDs7O1dBRUcsYUFBQyxFQUFFLEVBQUU7QUFDUCxhQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVMsS0FBSyxFQUFDO0FBQUUsZUFBTyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztPQUFFLENBQUMsQ0FBQTtLQUNwRTs7O1NBcENvQixVQUFVO0lBcUNoQyxDQUFBOzs7Ozs7Ozs7Ozs7O0FDdkNELElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtBQUNqQyxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsYUFBYSxDQUFBO0FBQ3pELElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTs7SUFFekIsS0FBSztZQUFMLEtBQUs7O0FBQ0UsV0FEUCxLQUFLLEdBQ21COzs7UUFBaEIsVUFBVSx5REFBRyxFQUFFOzswQkFEdkIsS0FBSzs7QUFFUCwrQkFGRSxLQUFLLDZDQUVBOztBQUVQLFFBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFDLFNBQVMsRUFBSztBQUNqRCxZQUFLLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO0tBQ25DLENBQUMsQ0FBQTs7QUFFRixRQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFBOztBQUV2QyxVQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEdBQUcsRUFBSztBQUN2QyxZQUFLLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtLQUM1QixDQUFDLENBQUE7R0FDSDs7ZUFiRyxLQUFLOztXQWVTLDRCQUFDLFNBQVMsRUFBQzs7O0FBQzNCLFlBQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtBQUNyQyxXQUFHLEVBQUUsZUFBTTtBQUNULGlCQUFPLE9BQUssVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1NBQ2xDOztBQUVELFdBQUcsRUFBRSxhQUFDLFNBQVMsRUFBSztBQUNsQixjQUFJLFNBQVMsR0FBRyxPQUFLLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUMxQyxjQUFHLFNBQVMsS0FBSyxTQUFTLEVBQUM7QUFDekIsZ0JBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQTtBQUNoQixtQkFBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUMsT0FBSyxTQUFTLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBQyxDQUFBO0FBQ3JELG1CQUFLLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLENBQUE7QUFDdEMsbUJBQUssSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtXQUM3QjtTQUNGO09BQ0YsQ0FBQyxDQUFBO0tBQ0g7OztXQUVNLGlCQUFDLFFBQVEsRUFBRTs7O0FBQ2hCLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUksRUFBSztBQUNsRCxjQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFDLFFBQVEsRUFBSztBQUN0QyxpQkFBSyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7U0FDaEMsQ0FBQyxDQUFBOztBQUVGLFlBQUcsUUFBUSxFQUFDO0FBQ1Ysa0JBQVEsRUFBRSxDQUFBO1NBQ1g7T0FDRixDQUFDLFNBQU0sQ0FBQyxVQUFDLEtBQUssRUFBSztBQUNsQixZQUFHLFFBQVEsRUFBQztBQUNWLGtCQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7U0FDaEIsTUFBTTtBQUNMLGdCQUFNLEtBQUssQ0FBQTtTQUNaO09BQ0YsQ0FBQyxDQUFBO0tBQ0g7OztXQUVLLGdCQUFDLFFBQVEsRUFBRTs7O0FBQ2YsYUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJLEVBQUs7QUFDL0UsY0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQyxRQUFRLEVBQUs7QUFDdEMsaUJBQUssUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1NBQ2hDLENBQUMsQ0FBQTs7QUFFRixZQUFHLFFBQVEsRUFBQztBQUNWLGtCQUFRLEVBQUUsQ0FBQTtTQUNYO09BQ0YsQ0FBQyxTQUFNLENBQUMsVUFBQyxLQUFLLEVBQUs7QUFDbEIsWUFBRyxRQUFRLEVBQUM7QUFDVixrQkFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1NBQ2hCLE1BQU07QUFDTCxnQkFBTSxLQUFLLENBQUE7U0FDWjtPQUNGLENBQUMsQ0FBQTtLQUNIOzs7V0FHSyxnQkFBQyxRQUFRLEVBQUU7OztBQUNmLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSSxFQUFLO0FBQ3JFLGNBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsUUFBUSxFQUFLO0FBQ3RDLGlCQUFLLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtTQUNoQyxDQUFDLENBQUE7O0FBRUYsWUFBRyxRQUFRLEVBQUM7QUFDVixrQkFBUSxFQUFFLENBQUE7U0FDWDtPQUNGLENBQUMsU0FBTSxDQUFDLFVBQUMsS0FBSyxFQUFLO0FBQ2xCLFlBQUcsUUFBUSxFQUFDO0FBQ1Ysa0JBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtTQUNoQixNQUFNO0FBQ0wsZ0JBQU0sS0FBSyxDQUFBO1NBQ1o7T0FDRixDQUFDLENBQUE7S0FDSDs7O1dBRUssaUJBQUMsUUFBUSxFQUFFO0FBQ2YsYUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBTTs7QUFFbEUsWUFBRyxRQUFRLEVBQUM7QUFDVixrQkFBUSxFQUFFLENBQUE7U0FDWDtPQUNGLENBQUMsU0FBTSxDQUFDLFVBQUMsS0FBSyxFQUFLO0FBQ2xCLFlBQUcsUUFBUSxFQUFDO0FBQ1Ysa0JBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtTQUNoQixNQUFNO0FBQ0wsZ0JBQU0sS0FBSyxDQUFBO1NBQ1o7T0FDRixDQUFDLENBQUE7S0FDSDs7O1NBckdHLEtBQUs7R0FBUyxZQUFZOztBQTJHaEMsTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7Ozs7O0FDL0d0QixNQUFNLENBQUMsT0FBTyxHQUFHO0FBQ2YsT0FBSyxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUM7QUFDNUIsTUFBSSxFQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7QUFDM0IsWUFBVSxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztBQUN0QyxjQUFZLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDO0NBQzVDLENBQUE7Ozs7Ozs7Ozs7Ozs7QUNMRCxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsYUFBYSxDQUFBOztBQUV6RCxNQUFNLENBQUMsT0FBTztZQUFTLFlBQVk7O1dBQVosWUFBWTswQkFBWixZQUFZOzsrQkFBWixZQUFZOzs7ZUFBWixZQUFZOztTQUN4QixlQUFFO0FBQ1QsYUFBTyxJQUFJLENBQUMsY0FBYyxDQUFBO0tBQzNCO1NBQ1EsYUFBQyxTQUFTLEVBQUM7QUFDbEIsVUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtBQUNuQyxVQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7QUFDN0MsVUFBSSxDQUFDLElBQUksaUJBQWUsU0FBUyxFQUFJLFNBQVMsQ0FBQyxDQUFBO0FBQy9DLFVBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFBO0FBQy9CLFVBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtBQUM5QyxVQUFJLENBQUMsSUFBSSxrQkFBZ0IsU0FBUyxFQUFJLFNBQVMsQ0FBQyxDQUFBO0tBQ2pEOzs7U0FYb0IsWUFBWTtHQUFTLFlBQVksQ0FZdkQsQ0FBQTs7Ozs7QUNkRCxNQUFNLENBQUMsT0FBTyxHQUFHO0FBQ2YsU0FBTyxFQUFFLGlCQUFTLE1BQU0sRUFBRSxHQUFHLEVBQXNCO1FBQXBCLFlBQVkseURBQUcsSUFBSTs7QUFDaEQsV0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFTLE9BQU8sRUFBRSxNQUFNLEVBQUM7QUFDMUMsVUFBSSxZQUFZLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtBQUN2QyxrQkFBWSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxZQUFNO0FBQzFDLFlBQUcsWUFBWSxDQUFDLE1BQU0sSUFBSSxHQUFHLEVBQUM7QUFDNUIsY0FBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDaEQsaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUNkLE1BQU07QUFDTCxnQkFBTSx1QkFBcUIsWUFBWSxDQUFDLE1BQU0sQ0FBRyxDQUFBO1NBQ2xEO09BQ0YsQ0FBQyxDQUFBO0FBQ0Ysa0JBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsVUFBQyxLQUFLLEVBQUs7QUFDaEQsY0FBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO09BQ2QsQ0FBQyxDQUFBO0FBQ0Ysa0JBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQzlCLFVBQUksWUFBWSxFQUFFO0FBQ2hCLG9CQUFZLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUE7QUFDakUsb0JBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO09BQ2hELE1BQU07QUFDTCxvQkFBWSxDQUFDLElBQUksRUFBRSxDQUFBO09BQ3BCO0tBQ0YsQ0FBQyxDQUFBO0dBQ0g7Q0FDRixDQUFBOzs7Ozs7Ozs7Ozs7O0FDeEJELElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBOztBQUVoRCxJQUFJLElBQUk7WUFBSixJQUFJOztBQUVLLFdBRlQsSUFBSSxHQUVtQjs7O1FBQWIsT0FBTyx5REFBRyxFQUFFOzswQkFGdEIsSUFBSTs7QUFHSiwrQkFIQSxJQUFJLDZDQUdHO0FBQ1AsUUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFhO3dDQUFULElBQUk7QUFBSixZQUFJOzs7QUFDM0IsWUFBSyxJQUFJLE1BQUEsU0FBQyxjQUFjLFNBQUssSUFBSSxFQUFDLENBQUE7S0FDbkMsQ0FBQTs7QUFFRCxVQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEdBQUcsRUFBSztBQUNwQyxZQUFLLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtLQUN6QixDQUFDLENBQUE7R0FDSDs7ZUFYQyxJQUFJOztXQTBCTyx1QkFBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBQztBQUMxQyxVQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQzlDLFlBQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsY0FBYyxFQUFLO0FBQ2xELGVBQU8sQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO09BQ2pFLENBQUMsQ0FBQTs7QUFFRixhQUFPLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQTtBQUMzQixhQUFPLE9BQU8sQ0FBQTtLQUNmOzs7V0FFRyxnQkFBRTtBQUNKLFVBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7S0FDaEM7OztXQUVHLGdCQUFFO0FBQ0osVUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtLQUNwQzs7O1NBN0JRLGVBQUU7QUFDVCxhQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7S0FDbkI7U0FFUSxhQUFDLFNBQVMsRUFBQztBQUNsQixVQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO0FBQzNCLFVBQUcsU0FBUyxFQUFDO0FBQUUsaUJBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtPQUFFO0FBQzVELGVBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTs7QUFFMUMsVUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7QUFDdkIsVUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtLQUN2Qjs7O1NBeEJDLElBQUk7R0FBaUIsWUFBWSxDQTJDcEMsQ0FBQTs7QUFFRCxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBAcHJlc2VydmVcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgUGV0a2EgQW50b25vdlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiAgSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICogXG4gKi9cbi8qKlxuICogYmx1ZWJpcmQgYnVpbGQgdmVyc2lvbiAyLjkuMzRcbiAqIEZlYXR1cmVzIGVuYWJsZWQ6IGNvcmUsIHJhY2UsIGNhbGxfZ2V0LCBnZW5lcmF0b3JzLCBtYXAsIG5vZGVpZnksIHByb21pc2lmeSwgcHJvcHMsIHJlZHVjZSwgc2V0dGxlLCBzb21lLCBjYW5jZWwsIHVzaW5nLCBmaWx0ZXIsIGFueSwgZWFjaCwgdGltZXJzXG4qL1xuIWZ1bmN0aW9uKGUpe2lmKFwib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlKW1vZHVsZS5leHBvcnRzPWUoKTtlbHNlIGlmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZClkZWZpbmUoW10sZSk7ZWxzZXt2YXIgZjtcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93P2Y9d2luZG93OlwidW5kZWZpbmVkXCIhPXR5cGVvZiBnbG9iYWw/Zj1nbG9iYWw6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNlbGYmJihmPXNlbGYpLGYuUHJvbWlzZT1lKCl9fShmdW5jdGlvbigpe3ZhciBkZWZpbmUsbW9kdWxlLGV4cG9ydHM7cmV0dXJuIChmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgX2RlcmVxXz09XCJmdW5jdGlvblwiJiZfZGVyZXFfO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiBfZGVyZXFfPT1cImZ1bmN0aW9uXCImJl9kZXJlcV87Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pKHsxOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlKSB7XG52YXIgU29tZVByb21pc2VBcnJheSA9IFByb21pc2UuX1NvbWVQcm9taXNlQXJyYXk7XG5mdW5jdGlvbiBhbnkocHJvbWlzZXMpIHtcbiAgICB2YXIgcmV0ID0gbmV3IFNvbWVQcm9taXNlQXJyYXkocHJvbWlzZXMpO1xuICAgIHZhciBwcm9taXNlID0gcmV0LnByb21pc2UoKTtcbiAgICByZXQuc2V0SG93TWFueSgxKTtcbiAgICByZXQuc2V0VW53cmFwKCk7XG4gICAgcmV0LmluaXQoKTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuUHJvbWlzZS5hbnkgPSBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gYW55KHByb21pc2VzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmFueSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYW55KHRoaXMpO1xufTtcblxufTtcblxufSx7fV0sMjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbnZhciBmaXJzdExpbmVFcnJvcjtcbnRyeSB7dGhyb3cgbmV3IEVycm9yKCk7IH0gY2F0Y2ggKGUpIHtmaXJzdExpbmVFcnJvciA9IGU7fVxudmFyIHNjaGVkdWxlID0gX2RlcmVxXyhcIi4vc2NoZWR1bGUuanNcIik7XG52YXIgUXVldWUgPSBfZGVyZXFfKFwiLi9xdWV1ZS5qc1wiKTtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbC5qc1wiKTtcblxuZnVuY3Rpb24gQXN5bmMoKSB7XG4gICAgdGhpcy5faXNUaWNrVXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2xhdGVRdWV1ZSA9IG5ldyBRdWV1ZSgxNik7XG4gICAgdGhpcy5fbm9ybWFsUXVldWUgPSBuZXcgUXVldWUoMTYpO1xuICAgIHRoaXMuX3RyYW1wb2xpbmVFbmFibGVkID0gdHJ1ZTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5kcmFpblF1ZXVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fZHJhaW5RdWV1ZXMoKTtcbiAgICB9O1xuICAgIHRoaXMuX3NjaGVkdWxlID1cbiAgICAgICAgc2NoZWR1bGUuaXNTdGF0aWMgPyBzY2hlZHVsZSh0aGlzLmRyYWluUXVldWVzKSA6IHNjaGVkdWxlO1xufVxuXG5Bc3luYy5wcm90b3R5cGUuZGlzYWJsZVRyYW1wb2xpbmVJZk5lY2Vzc2FyeSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh1dGlsLmhhc0RldlRvb2xzKSB7XG4gICAgICAgIHRoaXMuX3RyYW1wb2xpbmVFbmFibGVkID0gZmFsc2U7XG4gICAgfVxufTtcblxuQXN5bmMucHJvdG90eXBlLmVuYWJsZVRyYW1wb2xpbmUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX3RyYW1wb2xpbmVFbmFibGVkKSB7XG4gICAgICAgIHRoaXMuX3RyYW1wb2xpbmVFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fc2NoZWR1bGUgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgICAgIH07XG4gICAgfVxufTtcblxuQXN5bmMucHJvdG90eXBlLmhhdmVJdGVtc1F1ZXVlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9ybWFsUXVldWUubGVuZ3RoKCkgPiAwO1xufTtcblxuQXN5bmMucHJvdG90eXBlLnRocm93TGF0ZXIgPSBmdW5jdGlvbihmbiwgYXJnKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgYXJnID0gZm47XG4gICAgICAgIGZuID0gZnVuY3Rpb24gKCkgeyB0aHJvdyBhcmc7IH07XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm4oYXJnKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSBlbHNlIHRyeSB7XG4gICAgICAgIHRoaXMuX3NjaGVkdWxlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm4oYXJnKTtcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBhc3luYyBzY2hlZHVsZXIgYXZhaWxhYmxlXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvbTNPVFhrXFx1MDAwYVwiKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBBc3luY0ludm9rZUxhdGVyKGZuLCByZWNlaXZlciwgYXJnKSB7XG4gICAgdGhpcy5fbGF0ZVF1ZXVlLnB1c2goZm4sIHJlY2VpdmVyLCBhcmcpO1xuICAgIHRoaXMuX3F1ZXVlVGljaygpO1xufVxuXG5mdW5jdGlvbiBBc3luY0ludm9rZShmbiwgcmVjZWl2ZXIsIGFyZykge1xuICAgIHRoaXMuX25vcm1hbFF1ZXVlLnB1c2goZm4sIHJlY2VpdmVyLCBhcmcpO1xuICAgIHRoaXMuX3F1ZXVlVGljaygpO1xufVxuXG5mdW5jdGlvbiBBc3luY1NldHRsZVByb21pc2VzKHByb21pc2UpIHtcbiAgICB0aGlzLl9ub3JtYWxRdWV1ZS5fcHVzaE9uZShwcm9taXNlKTtcbiAgICB0aGlzLl9xdWV1ZVRpY2soKTtcbn1cblxuaWYgKCF1dGlsLmhhc0RldlRvb2xzKSB7XG4gICAgQXN5bmMucHJvdG90eXBlLmludm9rZUxhdGVyID0gQXN5bmNJbnZva2VMYXRlcjtcbiAgICBBc3luYy5wcm90b3R5cGUuaW52b2tlID0gQXN5bmNJbnZva2U7XG4gICAgQXN5bmMucHJvdG90eXBlLnNldHRsZVByb21pc2VzID0gQXN5bmNTZXR0bGVQcm9taXNlcztcbn0gZWxzZSB7XG4gICAgaWYgKHNjaGVkdWxlLmlzU3RhdGljKSB7XG4gICAgICAgIHNjaGVkdWxlID0gZnVuY3Rpb24oZm4pIHsgc2V0VGltZW91dChmbiwgMCk7IH07XG4gICAgfVxuICAgIEFzeW5jLnByb3RvdHlwZS5pbnZva2VMYXRlciA9IGZ1bmN0aW9uIChmbiwgcmVjZWl2ZXIsIGFyZykge1xuICAgICAgICBpZiAodGhpcy5fdHJhbXBvbGluZUVuYWJsZWQpIHtcbiAgICAgICAgICAgIEFzeW5jSW52b2tlTGF0ZXIuY2FsbCh0aGlzLCBmbiwgcmVjZWl2ZXIsIGFyZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zY2hlZHVsZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBmbi5jYWxsKHJlY2VpdmVyLCBhcmcpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBBc3luYy5wcm90b3R5cGUuaW52b2tlID0gZnVuY3Rpb24gKGZuLCByZWNlaXZlciwgYXJnKSB7XG4gICAgICAgIGlmICh0aGlzLl90cmFtcG9saW5lRW5hYmxlZCkge1xuICAgICAgICAgICAgQXN5bmNJbnZva2UuY2FsbCh0aGlzLCBmbiwgcmVjZWl2ZXIsIGFyZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zY2hlZHVsZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBmbi5jYWxsKHJlY2VpdmVyLCBhcmcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQXN5bmMucHJvdG90eXBlLnNldHRsZVByb21pc2VzID0gZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgICAgICBpZiAodGhpcy5fdHJhbXBvbGluZUVuYWJsZWQpIHtcbiAgICAgICAgICAgIEFzeW5jU2V0dGxlUHJvbWlzZXMuY2FsbCh0aGlzLCBwcm9taXNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVkdWxlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHByb21pc2UuX3NldHRsZVByb21pc2VzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkFzeW5jLnByb3RvdHlwZS5pbnZva2VGaXJzdCA9IGZ1bmN0aW9uIChmbiwgcmVjZWl2ZXIsIGFyZykge1xuICAgIHRoaXMuX25vcm1hbFF1ZXVlLnVuc2hpZnQoZm4sIHJlY2VpdmVyLCBhcmcpO1xuICAgIHRoaXMuX3F1ZXVlVGljaygpO1xufTtcblxuQXN5bmMucHJvdG90eXBlLl9kcmFpblF1ZXVlID0gZnVuY3Rpb24ocXVldWUpIHtcbiAgICB3aGlsZSAocXVldWUubGVuZ3RoKCkgPiAwKSB7XG4gICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgZm4uX3NldHRsZVByb21pc2VzKCk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVjZWl2ZXIgPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICB2YXIgYXJnID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgZm4uY2FsbChyZWNlaXZlciwgYXJnKTtcbiAgICB9XG59O1xuXG5Bc3luYy5wcm90b3R5cGUuX2RyYWluUXVldWVzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYWluUXVldWUodGhpcy5fbm9ybWFsUXVldWUpO1xuICAgIHRoaXMuX3Jlc2V0KCk7XG4gICAgdGhpcy5fZHJhaW5RdWV1ZSh0aGlzLl9sYXRlUXVldWUpO1xufTtcblxuQXN5bmMucHJvdG90eXBlLl9xdWV1ZVRpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9pc1RpY2tVc2VkKSB7XG4gICAgICAgIHRoaXMuX2lzVGlja1VzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9zY2hlZHVsZSh0aGlzLmRyYWluUXVldWVzKTtcbiAgICB9XG59O1xuXG5Bc3luYy5wcm90b3R5cGUuX3Jlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzVGlja1VzZWQgPSBmYWxzZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEFzeW5jKCk7XG5tb2R1bGUuZXhwb3J0cy5maXJzdExpbmVFcnJvciA9IGZpcnN0TGluZUVycm9yO1xuXG59LHtcIi4vcXVldWUuanNcIjoyOCxcIi4vc2NoZWR1bGUuanNcIjozMSxcIi4vdXRpbC5qc1wiOjM4fV0sMzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgSU5URVJOQUwsIHRyeUNvbnZlcnRUb1Byb21pc2UpIHtcbnZhciByZWplY3RUaGlzID0gZnVuY3Rpb24oXywgZSkge1xuICAgIHRoaXMuX3JlamVjdChlKTtcbn07XG5cbnZhciB0YXJnZXRSZWplY3RlZCA9IGZ1bmN0aW9uKGUsIGNvbnRleHQpIHtcbiAgICBjb250ZXh0LnByb21pc2VSZWplY3Rpb25RdWV1ZWQgPSB0cnVlO1xuICAgIGNvbnRleHQuYmluZGluZ1Byb21pc2UuX3RoZW4ocmVqZWN0VGhpcywgcmVqZWN0VGhpcywgbnVsbCwgdGhpcywgZSk7XG59O1xuXG52YXIgYmluZGluZ1Jlc29sdmVkID0gZnVuY3Rpb24odGhpc0FyZywgY29udGV4dCkge1xuICAgIGlmICh0aGlzLl9pc1BlbmRpbmcoKSkge1xuICAgICAgICB0aGlzLl9yZXNvbHZlQ2FsbGJhY2soY29udGV4dC50YXJnZXQpO1xuICAgIH1cbn07XG5cbnZhciBiaW5kaW5nUmVqZWN0ZWQgPSBmdW5jdGlvbihlLCBjb250ZXh0KSB7XG4gICAgaWYgKCFjb250ZXh0LnByb21pc2VSZWplY3Rpb25RdWV1ZWQpIHRoaXMuX3JlamVjdChlKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiAodGhpc0FyZykge1xuICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHRoaXNBcmcpO1xuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgcmV0Ll9wcm9wYWdhdGVGcm9tKHRoaXMsIDEpO1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXQoKTtcblxuICAgIHJldC5fc2V0Qm91bmRUbyhtYXliZVByb21pc2UpO1xuICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHZhciBjb250ZXh0ID0ge1xuICAgICAgICAgICAgcHJvbWlzZVJlamVjdGlvblF1ZXVlZDogZmFsc2UsXG4gICAgICAgICAgICBwcm9taXNlOiByZXQsXG4gICAgICAgICAgICB0YXJnZXQ6IHRhcmdldCxcbiAgICAgICAgICAgIGJpbmRpbmdQcm9taXNlOiBtYXliZVByb21pc2VcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0Ll90aGVuKElOVEVSTkFMLCB0YXJnZXRSZWplY3RlZCwgcmV0Ll9wcm9ncmVzcywgcmV0LCBjb250ZXh0KTtcbiAgICAgICAgbWF5YmVQcm9taXNlLl90aGVuKFxuICAgICAgICAgICAgYmluZGluZ1Jlc29sdmVkLCBiaW5kaW5nUmVqZWN0ZWQsIHJldC5fcHJvZ3Jlc3MsIHJldCwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0Ll9yZXNvbHZlQ2FsbGJhY2sodGFyZ2V0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRCb3VuZFRvID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmIChvYmogIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgMTMxMDcyO1xuICAgICAgICB0aGlzLl9ib3VuZFRvID0gb2JqO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgJiAofjEzMTA3Mik7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzQm91bmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDEzMTA3MikgPT09IDEzMTA3Mjtcbn07XG5cblByb21pc2UuYmluZCA9IGZ1bmN0aW9uICh0aGlzQXJnLCB2YWx1ZSkge1xuICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHRoaXNBcmcpO1xuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG5cbiAgICByZXQuX3NldEJvdW5kVG8obWF5YmVQcm9taXNlKTtcbiAgICBpZiAobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICBtYXliZVByb21pc2UuX3RoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXQuX3Jlc29sdmVDYWxsYmFjayh2YWx1ZSk7XG4gICAgICAgIH0sIHJldC5fcmVqZWN0LCByZXQuX3Byb2dyZXNzLCByZXQsIG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldC5fcmVzb2x2ZUNhbGxiYWNrKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG59O1xuXG59LHt9XSw0OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xudmFyIG9sZDtcbmlmICh0eXBlb2YgUHJvbWlzZSAhPT0gXCJ1bmRlZmluZWRcIikgb2xkID0gUHJvbWlzZTtcbmZ1bmN0aW9uIG5vQ29uZmxpY3QoKSB7XG4gICAgdHJ5IHsgaWYgKFByb21pc2UgPT09IGJsdWViaXJkKSBQcm9taXNlID0gb2xkOyB9XG4gICAgY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGJsdWViaXJkO1xufVxudmFyIGJsdWViaXJkID0gX2RlcmVxXyhcIi4vcHJvbWlzZS5qc1wiKSgpO1xuYmx1ZWJpcmQubm9Db25mbGljdCA9IG5vQ29uZmxpY3Q7XG5tb2R1bGUuZXhwb3J0cyA9IGJsdWViaXJkO1xuXG59LHtcIi4vcHJvbWlzZS5qc1wiOjIzfV0sNTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbnZhciBjciA9IE9iamVjdC5jcmVhdGU7XG5pZiAoY3IpIHtcbiAgICB2YXIgY2FsbGVyQ2FjaGUgPSBjcihudWxsKTtcbiAgICB2YXIgZ2V0dGVyQ2FjaGUgPSBjcihudWxsKTtcbiAgICBjYWxsZXJDYWNoZVtcIiBzaXplXCJdID0gZ2V0dGVyQ2FjaGVbXCIgc2l6ZVwiXSA9IDA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSkge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsLmpzXCIpO1xudmFyIGNhbkV2YWx1YXRlID0gdXRpbC5jYW5FdmFsdWF0ZTtcbnZhciBpc0lkZW50aWZpZXIgPSB1dGlsLmlzSWRlbnRpZmllcjtcblxudmFyIGdldE1ldGhvZENhbGxlcjtcbnZhciBnZXRHZXR0ZXI7XG5pZiAoIXRydWUpIHtcbnZhciBtYWtlTWV0aG9kQ2FsbGVyID0gZnVuY3Rpb24gKG1ldGhvZE5hbWUpIHtcbiAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwiZW5zdXJlTWV0aG9kXCIsIFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICd1c2Ugc3RyaWN0JyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHZhciBsZW4gPSB0aGlzLmxlbmd0aDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIGVuc3VyZU1ldGhvZChvYmosICdtZXRob2ROYW1lJyk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHN3aXRjaChsZW4pIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBjYXNlIDE6IHJldHVybiBvYmoubWV0aG9kTmFtZSh0aGlzWzBdKTsgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBjYXNlIDI6IHJldHVybiBvYmoubWV0aG9kTmFtZSh0aGlzWzBdLCB0aGlzWzFdKTsgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBjYXNlIDM6IHJldHVybiBvYmoubWV0aG9kTmFtZSh0aGlzWzBdLCB0aGlzWzFdLCB0aGlzWzJdKTsgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBvYmoubWV0aG9kTmFtZSgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iai5tZXRob2ROYW1lLmFwcGx5KG9iaiwgdGhpcyk7ICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgfTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgXCIucmVwbGFjZSgvbWV0aG9kTmFtZS9nLCBtZXRob2ROYW1lKSkoZW5zdXJlTWV0aG9kKTtcbn07XG5cbnZhciBtYWtlR2V0dGVyID0gZnVuY3Rpb24gKHByb3BlcnR5TmFtZSkge1xuICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJvYmpcIiwgXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAndXNlIHN0cmljdCc7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICByZXR1cm4gb2JqLnByb3BlcnR5TmFtZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBcIi5yZXBsYWNlKFwicHJvcGVydHlOYW1lXCIsIHByb3BlcnR5TmFtZSkpO1xufTtcblxudmFyIGdldENvbXBpbGVkID0gZnVuY3Rpb24obmFtZSwgY29tcGlsZXIsIGNhY2hlKSB7XG4gICAgdmFyIHJldCA9IGNhY2hlW25hbWVdO1xuICAgIGlmICh0eXBlb2YgcmV0ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgaWYgKCFpc0lkZW50aWZpZXIobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldCA9IGNvbXBpbGVyKG5hbWUpO1xuICAgICAgICBjYWNoZVtuYW1lXSA9IHJldDtcbiAgICAgICAgY2FjaGVbXCIgc2l6ZVwiXSsrO1xuICAgICAgICBpZiAoY2FjaGVbXCIgc2l6ZVwiXSA+IDUxMikge1xuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhjYWNoZSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSBkZWxldGUgY2FjaGVba2V5c1tpXV07XG4gICAgICAgICAgICBjYWNoZVtcIiBzaXplXCJdID0ga2V5cy5sZW5ndGggLSAyNTY7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbmdldE1ldGhvZENhbGxlciA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gZ2V0Q29tcGlsZWQobmFtZSwgbWFrZU1ldGhvZENhbGxlciwgY2FsbGVyQ2FjaGUpO1xufTtcblxuZ2V0R2V0dGVyID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBnZXRDb21waWxlZChuYW1lLCBtYWtlR2V0dGVyLCBnZXR0ZXJDYWNoZSk7XG59O1xufVxuXG5mdW5jdGlvbiBlbnN1cmVNZXRob2Qob2JqLCBtZXRob2ROYW1lKSB7XG4gICAgdmFyIGZuO1xuICAgIGlmIChvYmogIT0gbnVsbCkgZm4gPSBvYmpbbWV0aG9kTmFtZV07XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHZhciBtZXNzYWdlID0gXCJPYmplY3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKG9iaikgKyBcIiBoYXMgbm8gbWV0aG9kICdcIiArXG4gICAgICAgICAgICB1dGlsLnRvU3RyaW5nKG1ldGhvZE5hbWUpICsgXCInXCI7XG4gICAgICAgIHRocm93IG5ldyBQcm9taXNlLlR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICB9XG4gICAgcmV0dXJuIGZuO1xufVxuXG5mdW5jdGlvbiBjYWxsZXIob2JqKSB7XG4gICAgdmFyIG1ldGhvZE5hbWUgPSB0aGlzLnBvcCgpO1xuICAgIHZhciBmbiA9IGVuc3VyZU1ldGhvZChvYmosIG1ldGhvZE5hbWUpO1xuICAgIHJldHVybiBmbi5hcHBseShvYmosIHRoaXMpO1xufVxuUHJvbWlzZS5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIChtZXRob2ROYW1lKSB7XG4gICAgdmFyICRfbGVuID0gYXJndW1lbnRzLmxlbmd0aDt2YXIgYXJncyA9IG5ldyBBcnJheSgkX2xlbiAtIDEpOyBmb3IodmFyICRfaSA9IDE7ICRfaSA8ICRfbGVuOyArKyRfaSkge2FyZ3NbJF9pIC0gMV0gPSBhcmd1bWVudHNbJF9pXTt9XG4gICAgaWYgKCF0cnVlKSB7XG4gICAgICAgIGlmIChjYW5FdmFsdWF0ZSkge1xuICAgICAgICAgICAgdmFyIG1heWJlQ2FsbGVyID0gZ2V0TWV0aG9kQ2FsbGVyKG1ldGhvZE5hbWUpO1xuICAgICAgICAgICAgaWYgKG1heWJlQ2FsbGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RoZW4oXG4gICAgICAgICAgICAgICAgICAgIG1heWJlQ2FsbGVyLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgYXJncywgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBhcmdzLnB1c2gobWV0aG9kTmFtZSk7XG4gICAgcmV0dXJuIHRoaXMuX3RoZW4oY2FsbGVyLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgYXJncywgdW5kZWZpbmVkKTtcbn07XG5cbmZ1bmN0aW9uIG5hbWVkR2V0dGVyKG9iaikge1xuICAgIHJldHVybiBvYmpbdGhpc107XG59XG5mdW5jdGlvbiBpbmRleGVkR2V0dGVyKG9iaikge1xuICAgIHZhciBpbmRleCA9ICt0aGlzO1xuICAgIGlmIChpbmRleCA8IDApIGluZGV4ID0gTWF0aC5tYXgoMCwgaW5kZXggKyBvYmoubGVuZ3RoKTtcbiAgICByZXR1cm4gb2JqW2luZGV4XTtcbn1cblByb21pc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwcm9wZXJ0eU5hbWUpIHtcbiAgICB2YXIgaXNJbmRleCA9ICh0eXBlb2YgcHJvcGVydHlOYW1lID09PSBcIm51bWJlclwiKTtcbiAgICB2YXIgZ2V0dGVyO1xuICAgIGlmICghaXNJbmRleCkge1xuICAgICAgICBpZiAoY2FuRXZhbHVhdGUpIHtcbiAgICAgICAgICAgIHZhciBtYXliZUdldHRlciA9IGdldEdldHRlcihwcm9wZXJ0eU5hbWUpO1xuICAgICAgICAgICAgZ2V0dGVyID0gbWF5YmVHZXR0ZXIgIT09IG51bGwgPyBtYXliZUdldHRlciA6IG5hbWVkR2V0dGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2V0dGVyID0gbmFtZWRHZXR0ZXI7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBnZXR0ZXIgPSBpbmRleGVkR2V0dGVyO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdGhlbihnZXR0ZXIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBwcm9wZXJ0eU5hbWUsIHVuZGVmaW5lZCk7XG59O1xufTtcblxufSx7XCIuL3V0aWwuanNcIjozOH1dLDY6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UpIHtcbnZhciBlcnJvcnMgPSBfZGVyZXFfKFwiLi9lcnJvcnMuanNcIik7XG52YXIgYXN5bmMgPSBfZGVyZXFfKFwiLi9hc3luYy5qc1wiKTtcbnZhciBDYW5jZWxsYXRpb25FcnJvciA9IGVycm9ycy5DYW5jZWxsYXRpb25FcnJvcjtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2NhbmNlbCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICBpZiAoIXRoaXMuaXNDYW5jZWxsYWJsZSgpKSByZXR1cm4gdGhpcztcbiAgICB2YXIgcGFyZW50O1xuICAgIHZhciBwcm9taXNlVG9SZWplY3QgPSB0aGlzO1xuICAgIHdoaWxlICgocGFyZW50ID0gcHJvbWlzZVRvUmVqZWN0Ll9jYW5jZWxsYXRpb25QYXJlbnQpICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgcGFyZW50LmlzQ2FuY2VsbGFibGUoKSkge1xuICAgICAgICBwcm9taXNlVG9SZWplY3QgPSBwYXJlbnQ7XG4gICAgfVxuICAgIHRoaXMuX3Vuc2V0Q2FuY2VsbGFibGUoKTtcbiAgICBwcm9taXNlVG9SZWplY3QuX3RhcmdldCgpLl9yZWplY3RDYWxsYmFjayhyZWFzb24sIGZhbHNlLCB0cnVlKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmNhbmNlbCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICBpZiAoIXRoaXMuaXNDYW5jZWxsYWJsZSgpKSByZXR1cm4gdGhpcztcbiAgICBpZiAocmVhc29uID09PSB1bmRlZmluZWQpIHJlYXNvbiA9IG5ldyBDYW5jZWxsYXRpb25FcnJvcigpO1xuICAgIGFzeW5jLmludm9rZUxhdGVyKHRoaXMuX2NhbmNlbCwgdGhpcywgcmVhc29uKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblByb21pc2UucHJvdG90eXBlLmNhbmNlbGxhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9jYW5jZWxsYWJsZSgpKSByZXR1cm4gdGhpcztcbiAgICBhc3luYy5lbmFibGVUcmFtcG9saW5lKCk7XG4gICAgdGhpcy5fc2V0Q2FuY2VsbGFibGUoKTtcbiAgICB0aGlzLl9jYW5jZWxsYXRpb25QYXJlbnQgPSB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS51bmNhbmNlbGxhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSB0aGlzLnRoZW4oKTtcbiAgICByZXQuX3Vuc2V0Q2FuY2VsbGFibGUoKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZm9yayA9IGZ1bmN0aW9uIChkaWRGdWxmaWxsLCBkaWRSZWplY3QsIGRpZFByb2dyZXNzKSB7XG4gICAgdmFyIHJldCA9IHRoaXMuX3RoZW4oZGlkRnVsZmlsbCwgZGlkUmVqZWN0LCBkaWRQcm9ncmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG5cbiAgICByZXQuX3NldENhbmNlbGxhYmxlKCk7XG4gICAgcmV0Ll9jYW5jZWxsYXRpb25QYXJlbnQgPSB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHJldDtcbn07XG59O1xuXG59LHtcIi4vYXN5bmMuanNcIjoyLFwiLi9lcnJvcnMuanNcIjoxM31dLDc6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xudmFyIGFzeW5jID0gX2RlcmVxXyhcIi4vYXN5bmMuanNcIik7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWwuanNcIik7XG52YXIgYmx1ZWJpcmRGcmFtZVBhdHRlcm4gPVxuICAgIC9bXFxcXFxcL11ibHVlYmlyZFtcXFxcXFwvXWpzW1xcXFxcXC9dKG1haW58ZGVidWd8emFsZ298aW5zdHJ1bWVudGVkKS87XG52YXIgc3RhY2tGcmFtZVBhdHRlcm4gPSBudWxsO1xudmFyIGZvcm1hdFN0YWNrID0gbnVsbDtcbnZhciBpbmRlbnRTdGFja0ZyYW1lcyA9IGZhbHNlO1xudmFyIHdhcm47XG5cbmZ1bmN0aW9uIENhcHR1cmVkVHJhY2UocGFyZW50KSB7XG4gICAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xuICAgIHZhciBsZW5ndGggPSB0aGlzLl9sZW5ndGggPSAxICsgKHBhcmVudCA9PT0gdW5kZWZpbmVkID8gMCA6IHBhcmVudC5fbGVuZ3RoKTtcbiAgICBjYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBDYXB0dXJlZFRyYWNlKTtcbiAgICBpZiAobGVuZ3RoID4gMzIpIHRoaXMudW5jeWNsZSgpO1xufVxudXRpbC5pbmhlcml0cyhDYXB0dXJlZFRyYWNlLCBFcnJvcik7XG5cbkNhcHR1cmVkVHJhY2UucHJvdG90eXBlLnVuY3ljbGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5fbGVuZ3RoO1xuICAgIGlmIChsZW5ndGggPCAyKSByZXR1cm47XG4gICAgdmFyIG5vZGVzID0gW107XG4gICAgdmFyIHN0YWNrVG9JbmRleCA9IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIG5vZGUgPSB0aGlzOyBub2RlICE9PSB1bmRlZmluZWQ7ICsraSkge1xuICAgICAgICBub2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgICBub2RlID0gbm9kZS5fcGFyZW50O1xuICAgIH1cbiAgICBsZW5ndGggPSB0aGlzLl9sZW5ndGggPSBpO1xuICAgIGZvciAodmFyIGkgPSBsZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICB2YXIgc3RhY2sgPSBub2Rlc1tpXS5zdGFjaztcbiAgICAgICAgaWYgKHN0YWNrVG9JbmRleFtzdGFja10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RhY2tUb0luZGV4W3N0YWNrXSA9IGk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgY3VycmVudFN0YWNrID0gbm9kZXNbaV0uc3RhY2s7XG4gICAgICAgIHZhciBpbmRleCA9IHN0YWNrVG9JbmRleFtjdXJyZW50U3RhY2tdO1xuICAgICAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCAmJiBpbmRleCAhPT0gaSkge1xuICAgICAgICAgICAgaWYgKGluZGV4ID4gMCkge1xuICAgICAgICAgICAgICAgIG5vZGVzW2luZGV4IC0gMV0uX3BhcmVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBub2Rlc1tpbmRleCAtIDFdLl9sZW5ndGggPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZXNbaV0uX3BhcmVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIG5vZGVzW2ldLl9sZW5ndGggPSAxO1xuICAgICAgICAgICAgdmFyIGN5Y2xlRWRnZU5vZGUgPSBpID4gMCA/IG5vZGVzW2kgLSAxXSA6IHRoaXM7XG5cbiAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICBjeWNsZUVkZ2VOb2RlLl9wYXJlbnQgPSBub2Rlc1tpbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIGN5Y2xlRWRnZU5vZGUuX3BhcmVudC51bmN5Y2xlKCk7XG4gICAgICAgICAgICAgICAgY3ljbGVFZGdlTm9kZS5fbGVuZ3RoID1cbiAgICAgICAgICAgICAgICAgICAgY3ljbGVFZGdlTm9kZS5fcGFyZW50Ll9sZW5ndGggKyAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjeWNsZUVkZ2VOb2RlLl9wYXJlbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgY3ljbGVFZGdlTm9kZS5fbGVuZ3RoID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjdXJyZW50Q2hpbGRMZW5ndGggPSBjeWNsZUVkZ2VOb2RlLl9sZW5ndGggKyAxO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IGkgLSAyOyBqID49IDA7IC0taikge1xuICAgICAgICAgICAgICAgIG5vZGVzW2pdLl9sZW5ndGggPSBjdXJyZW50Q2hpbGRMZW5ndGg7XG4gICAgICAgICAgICAgICAgY3VycmVudENoaWxkTGVuZ3RoKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5DYXB0dXJlZFRyYWNlLnByb3RvdHlwZS5wYXJlbnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcGFyZW50O1xufTtcblxuQ2FwdHVyZWRUcmFjZS5wcm90b3R5cGUuaGFzUGFyZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3BhcmVudCAhPT0gdW5kZWZpbmVkO1xufTtcblxuQ2FwdHVyZWRUcmFjZS5wcm90b3R5cGUuYXR0YWNoRXh0cmFUcmFjZSA9IGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgaWYgKGVycm9yLl9fc3RhY2tDbGVhbmVkX18pIHJldHVybjtcbiAgICB0aGlzLnVuY3ljbGUoKTtcbiAgICB2YXIgcGFyc2VkID0gQ2FwdHVyZWRUcmFjZS5wYXJzZVN0YWNrQW5kTWVzc2FnZShlcnJvcik7XG4gICAgdmFyIG1lc3NhZ2UgPSBwYXJzZWQubWVzc2FnZTtcbiAgICB2YXIgc3RhY2tzID0gW3BhcnNlZC5zdGFja107XG5cbiAgICB2YXIgdHJhY2UgPSB0aGlzO1xuICAgIHdoaWxlICh0cmFjZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN0YWNrcy5wdXNoKGNsZWFuU3RhY2sodHJhY2Uuc3RhY2suc3BsaXQoXCJcXG5cIikpKTtcbiAgICAgICAgdHJhY2UgPSB0cmFjZS5fcGFyZW50O1xuICAgIH1cbiAgICByZW1vdmVDb21tb25Sb290cyhzdGFja3MpO1xuICAgIHJlbW92ZUR1cGxpY2F0ZU9yRW1wdHlKdW1wcyhzdGFja3MpO1xuICAgIHV0aWwubm90RW51bWVyYWJsZVByb3AoZXJyb3IsIFwic3RhY2tcIiwgcmVjb25zdHJ1Y3RTdGFjayhtZXNzYWdlLCBzdGFja3MpKTtcbiAgICB1dGlsLm5vdEVudW1lcmFibGVQcm9wKGVycm9yLCBcIl9fc3RhY2tDbGVhbmVkX19cIiwgdHJ1ZSk7XG59O1xuXG5mdW5jdGlvbiByZWNvbnN0cnVjdFN0YWNrKG1lc3NhZ2UsIHN0YWNrcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhY2tzLmxlbmd0aCAtIDE7ICsraSkge1xuICAgICAgICBzdGFja3NbaV0ucHVzaChcIkZyb20gcHJldmlvdXMgZXZlbnQ6XCIpO1xuICAgICAgICBzdGFja3NbaV0gPSBzdGFja3NbaV0uam9pbihcIlxcblwiKTtcbiAgICB9XG4gICAgaWYgKGkgPCBzdGFja3MubGVuZ3RoKSB7XG4gICAgICAgIHN0YWNrc1tpXSA9IHN0YWNrc1tpXS5qb2luKFwiXFxuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gbWVzc2FnZSArIFwiXFxuXCIgKyBzdGFja3Muam9pbihcIlxcblwiKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRHVwbGljYXRlT3JFbXB0eUp1bXBzKHN0YWNrcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmIChzdGFja3NbaV0ubGVuZ3RoID09PSAwIHx8XG4gICAgICAgICAgICAoKGkgKyAxIDwgc3RhY2tzLmxlbmd0aCkgJiYgc3RhY2tzW2ldWzBdID09PSBzdGFja3NbaSsxXVswXSkpIHtcbiAgICAgICAgICAgIHN0YWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBpLS07XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNvbW1vblJvb3RzKHN0YWNrcykge1xuICAgIHZhciBjdXJyZW50ID0gc3RhY2tzWzBdO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgc3RhY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBwcmV2ID0gc3RhY2tzW2ldO1xuICAgICAgICB2YXIgY3VycmVudExhc3RJbmRleCA9IGN1cnJlbnQubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIGN1cnJlbnRMYXN0TGluZSA9IGN1cnJlbnRbY3VycmVudExhc3RJbmRleF07XG4gICAgICAgIHZhciBjb21tb25Sb290TWVldFBvaW50ID0gLTE7XG5cbiAgICAgICAgZm9yICh2YXIgaiA9IHByZXYubGVuZ3RoIC0gMTsgaiA+PSAwOyAtLWopIHtcbiAgICAgICAgICAgIGlmIChwcmV2W2pdID09PSBjdXJyZW50TGFzdExpbmUpIHtcbiAgICAgICAgICAgICAgICBjb21tb25Sb290TWVldFBvaW50ID0gajtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGogPSBjb21tb25Sb290TWVldFBvaW50OyBqID49IDA7IC0taikge1xuICAgICAgICAgICAgdmFyIGxpbmUgPSBwcmV2W2pdO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRbY3VycmVudExhc3RJbmRleF0gPT09IGxpbmUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50LnBvcCgpO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRMYXN0SW5kZXgtLTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudCA9IHByZXY7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjbGVhblN0YWNrKHN0YWNrKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhY2subGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGxpbmUgPSBzdGFja1tpXTtcbiAgICAgICAgdmFyIGlzVHJhY2VMaW5lID0gc3RhY2tGcmFtZVBhdHRlcm4udGVzdChsaW5lKSB8fFxuICAgICAgICAgICAgXCIgICAgKE5vIHN0YWNrIHRyYWNlKVwiID09PSBsaW5lO1xuICAgICAgICB2YXIgaXNJbnRlcm5hbEZyYW1lID0gaXNUcmFjZUxpbmUgJiYgc2hvdWxkSWdub3JlKGxpbmUpO1xuICAgICAgICBpZiAoaXNUcmFjZUxpbmUgJiYgIWlzSW50ZXJuYWxGcmFtZSkge1xuICAgICAgICAgICAgaWYgKGluZGVudFN0YWNrRnJhbWVzICYmIGxpbmUuY2hhckF0KDApICE9PSBcIiBcIikge1xuICAgICAgICAgICAgICAgIGxpbmUgPSBcIiAgICBcIiArIGxpbmU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXQucHVzaChsaW5lKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBzdGFja0ZyYW1lc0FzQXJyYXkoZXJyb3IpIHtcbiAgICB2YXIgc3RhY2sgPSBlcnJvci5zdGFjay5yZXBsYWNlKC9cXHMrJC9nLCBcIlwiKS5zcGxpdChcIlxcblwiKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YWNrLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBsaW5lID0gc3RhY2tbaV07XG4gICAgICAgIGlmIChcIiAgICAoTm8gc3RhY2sgdHJhY2UpXCIgPT09IGxpbmUgfHwgc3RhY2tGcmFtZVBhdHRlcm4udGVzdChsaW5lKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGkgPiAwKSB7XG4gICAgICAgIHN0YWNrID0gc3RhY2suc2xpY2UoaSk7XG4gICAgfVxuICAgIHJldHVybiBzdGFjaztcbn1cblxuQ2FwdHVyZWRUcmFjZS5wYXJzZVN0YWNrQW5kTWVzc2FnZSA9IGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgdmFyIHN0YWNrID0gZXJyb3Iuc3RhY2s7XG4gICAgdmFyIG1lc3NhZ2UgPSBlcnJvci50b1N0cmluZygpO1xuICAgIHN0YWNrID0gdHlwZW9mIHN0YWNrID09PSBcInN0cmluZ1wiICYmIHN0YWNrLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICA/IHN0YWNrRnJhbWVzQXNBcnJheShlcnJvcikgOiBbXCIgICAgKE5vIHN0YWNrIHRyYWNlKVwiXTtcbiAgICByZXR1cm4ge1xuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICBzdGFjazogY2xlYW5TdGFjayhzdGFjaylcbiAgICB9O1xufTtcblxuQ2FwdHVyZWRUcmFjZS5mb3JtYXRBbmRMb2dFcnJvciA9IGZ1bmN0aW9uKGVycm9yLCB0aXRsZSkge1xuICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICB2YXIgbWVzc2FnZTtcbiAgICAgICAgaWYgKHR5cGVvZiBlcnJvciA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgZXJyb3IgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdmFyIHN0YWNrID0gZXJyb3Iuc3RhY2s7XG4gICAgICAgICAgICBtZXNzYWdlID0gdGl0bGUgKyBmb3JtYXRTdGFjayhzdGFjaywgZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWVzc2FnZSA9IHRpdGxlICsgU3RyaW5nKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHdhcm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgd2FybihtZXNzYWdlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY29uc29sZS5sb2cgPT09IFwiZnVuY3Rpb25cIiB8fFxuICAgICAgICAgICAgdHlwZW9mIGNvbnNvbGUubG9nID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkNhcHR1cmVkVHJhY2UudW5oYW5kbGVkUmVqZWN0aW9uID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIENhcHR1cmVkVHJhY2UuZm9ybWF0QW5kTG9nRXJyb3IocmVhc29uLCBcIl4tLS0gV2l0aCBhZGRpdGlvbmFsIHN0YWNrIHRyYWNlOiBcIik7XG59O1xuXG5DYXB0dXJlZFRyYWNlLmlzU3VwcG9ydGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0eXBlb2YgY2FwdHVyZVN0YWNrVHJhY2UgPT09IFwiZnVuY3Rpb25cIjtcbn07XG5cbkNhcHR1cmVkVHJhY2UuZmlyZVJlamVjdGlvbkV2ZW50ID1cbmZ1bmN0aW9uKG5hbWUsIGxvY2FsSGFuZGxlciwgcmVhc29uLCBwcm9taXNlKSB7XG4gICAgdmFyIGxvY2FsRXZlbnRGaXJlZCA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgbG9jYWxIYW5kbGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGxvY2FsRXZlbnRGaXJlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gXCJyZWplY3Rpb25IYW5kbGVkXCIpIHtcbiAgICAgICAgICAgICAgICBsb2NhbEhhbmRsZXIocHJvbWlzZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvY2FsSGFuZGxlcihyZWFzb24sIHByb21pc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3luYy50aHJvd0xhdGVyKGUpO1xuICAgIH1cblxuICAgIHZhciBnbG9iYWxFdmVudEZpcmVkID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgICAgZ2xvYmFsRXZlbnRGaXJlZCA9IGZpcmVHbG9iYWxFdmVudChuYW1lLCByZWFzb24sIHByb21pc2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZ2xvYmFsRXZlbnRGaXJlZCA9IHRydWU7XG4gICAgICAgIGFzeW5jLnRocm93TGF0ZXIoZSk7XG4gICAgfVxuXG4gICAgdmFyIGRvbUV2ZW50RmlyZWQgPSBmYWxzZTtcbiAgICBpZiAoZmlyZURvbUV2ZW50KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBkb21FdmVudEZpcmVkID0gZmlyZURvbUV2ZW50KG5hbWUudG9Mb3dlckNhc2UoKSwge1xuICAgICAgICAgICAgICAgIHJlYXNvbjogcmVhc29uLFxuICAgICAgICAgICAgICAgIHByb21pc2U6IHByb21pc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBkb21FdmVudEZpcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGFzeW5jLnRocm93TGF0ZXIoZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWdsb2JhbEV2ZW50RmlyZWQgJiYgIWxvY2FsRXZlbnRGaXJlZCAmJiAhZG9tRXZlbnRGaXJlZCAmJlxuICAgICAgICBuYW1lID09PSBcInVuaGFuZGxlZFJlamVjdGlvblwiKSB7XG4gICAgICAgIENhcHR1cmVkVHJhY2UuZm9ybWF0QW5kTG9nRXJyb3IocmVhc29uLCBcIlVuaGFuZGxlZCByZWplY3Rpb24gXCIpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGZvcm1hdE5vbkVycm9yKG9iaikge1xuICAgIHZhciBzdHI7XG4gICAgaWYgKHR5cGVvZiBvYmogPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBzdHIgPSBcIltmdW5jdGlvbiBcIiArXG4gICAgICAgICAgICAob2JqLm5hbWUgfHwgXCJhbm9ueW1vdXNcIikgK1xuICAgICAgICAgICAgXCJdXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gb2JqLnRvU3RyaW5nKCk7XG4gICAgICAgIHZhciBydXNlbGVzc1RvU3RyaW5nID0gL1xcW29iamVjdCBbYS16QS1aMC05JF9dK1xcXS87XG4gICAgICAgIGlmIChydXNlbGVzc1RvU3RyaW5nLnRlc3Qoc3RyKSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3U3RyID0gSlNPTi5zdHJpbmdpZnkob2JqKTtcbiAgICAgICAgICAgICAgICBzdHIgPSBuZXdTdHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKSB7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgc3RyID0gXCIoZW1wdHkgYXJyYXkpXCI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChcIig8XCIgKyBzbmlwKHN0cikgKyBcIj4sIG5vIHN0YWNrIHRyYWNlKVwiKTtcbn1cblxuZnVuY3Rpb24gc25pcChzdHIpIHtcbiAgICB2YXIgbWF4Q2hhcnMgPSA0MTtcbiAgICBpZiAoc3RyLmxlbmd0aCA8IG1heENoYXJzKSB7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIHJldHVybiBzdHIuc3Vic3RyKDAsIG1heENoYXJzIC0gMykgKyBcIi4uLlwiO1xufVxuXG52YXIgc2hvdWxkSWdub3JlID0gZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfTtcbnZhciBwYXJzZUxpbmVJbmZvUmVnZXggPSAvW1xcLzxcXChdKFteOlxcL10rKTooXFxkKyk6KD86XFxkKylcXCk/XFxzKiQvO1xuZnVuY3Rpb24gcGFyc2VMaW5lSW5mbyhsaW5lKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBsaW5lLm1hdGNoKHBhcnNlTGluZUluZm9SZWdleCk7XG4gICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZpbGVOYW1lOiBtYXRjaGVzWzFdLFxuICAgICAgICAgICAgbGluZTogcGFyc2VJbnQobWF0Y2hlc1syXSwgMTApXG4gICAgICAgIH07XG4gICAgfVxufVxuQ2FwdHVyZWRUcmFjZS5zZXRCb3VuZHMgPSBmdW5jdGlvbihmaXJzdExpbmVFcnJvciwgbGFzdExpbmVFcnJvcikge1xuICAgIGlmICghQ2FwdHVyZWRUcmFjZS5pc1N1cHBvcnRlZCgpKSByZXR1cm47XG4gICAgdmFyIGZpcnN0U3RhY2tMaW5lcyA9IGZpcnN0TGluZUVycm9yLnN0YWNrLnNwbGl0KFwiXFxuXCIpO1xuICAgIHZhciBsYXN0U3RhY2tMaW5lcyA9IGxhc3RMaW5lRXJyb3Iuc3RhY2suc3BsaXQoXCJcXG5cIik7XG4gICAgdmFyIGZpcnN0SW5kZXggPSAtMTtcbiAgICB2YXIgbGFzdEluZGV4ID0gLTE7XG4gICAgdmFyIGZpcnN0RmlsZU5hbWU7XG4gICAgdmFyIGxhc3RGaWxlTmFtZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpcnN0U3RhY2tMaW5lcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gcGFyc2VMaW5lSW5mbyhmaXJzdFN0YWNrTGluZXNbaV0pO1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICBmaXJzdEZpbGVOYW1lID0gcmVzdWx0LmZpbGVOYW1lO1xuICAgICAgICAgICAgZmlyc3RJbmRleCA9IHJlc3VsdC5saW5lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXN0U3RhY2tMaW5lcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gcGFyc2VMaW5lSW5mbyhsYXN0U3RhY2tMaW5lc1tpXSk7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGxhc3RGaWxlTmFtZSA9IHJlc3VsdC5maWxlTmFtZTtcbiAgICAgICAgICAgIGxhc3RJbmRleCA9IHJlc3VsdC5saW5lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGZpcnN0SW5kZXggPCAwIHx8IGxhc3RJbmRleCA8IDAgfHwgIWZpcnN0RmlsZU5hbWUgfHwgIWxhc3RGaWxlTmFtZSB8fFxuICAgICAgICBmaXJzdEZpbGVOYW1lICE9PSBsYXN0RmlsZU5hbWUgfHwgZmlyc3RJbmRleCA+PSBsYXN0SW5kZXgpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNob3VsZElnbm9yZSA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgaWYgKGJsdWViaXJkRnJhbWVQYXR0ZXJuLnRlc3QobGluZSkpIHJldHVybiB0cnVlO1xuICAgICAgICB2YXIgaW5mbyA9IHBhcnNlTGluZUluZm8obGluZSk7XG4gICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICBpZiAoaW5mby5maWxlTmFtZSA9PT0gZmlyc3RGaWxlTmFtZSAmJlxuICAgICAgICAgICAgICAgIChmaXJzdEluZGV4IDw9IGluZm8ubGluZSAmJiBpbmZvLmxpbmUgPD0gbGFzdEluZGV4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xufTtcblxudmFyIGNhcHR1cmVTdGFja1RyYWNlID0gKGZ1bmN0aW9uIHN0YWNrRGV0ZWN0aW9uKCkge1xuICAgIHZhciB2OHN0YWNrRnJhbWVQYXR0ZXJuID0gL15cXHMqYXRcXHMqLztcbiAgICB2YXIgdjhzdGFja0Zvcm1hdHRlciA9IGZ1bmN0aW9uKHN0YWNrLCBlcnJvcikge1xuICAgICAgICBpZiAodHlwZW9mIHN0YWNrID09PSBcInN0cmluZ1wiKSByZXR1cm4gc3RhY2s7XG5cbiAgICAgICAgaWYgKGVycm9yLm5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgZXJyb3IubWVzc2FnZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9ybWF0Tm9uRXJyb3IoZXJyb3IpO1xuICAgIH07XG5cbiAgICBpZiAodHlwZW9mIEVycm9yLnN0YWNrVHJhY2VMaW1pdCA9PT0gXCJudW1iZXJcIiAmJlxuICAgICAgICB0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBFcnJvci5zdGFja1RyYWNlTGltaXQgPSBFcnJvci5zdGFja1RyYWNlTGltaXQgKyA2O1xuICAgICAgICBzdGFja0ZyYW1lUGF0dGVybiA9IHY4c3RhY2tGcmFtZVBhdHRlcm47XG4gICAgICAgIGZvcm1hdFN0YWNrID0gdjhzdGFja0Zvcm1hdHRlcjtcbiAgICAgICAgdmFyIGNhcHR1cmVTdGFja1RyYWNlID0gRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2U7XG5cbiAgICAgICAgc2hvdWxkSWdub3JlID0gZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuIGJsdWViaXJkRnJhbWVQYXR0ZXJuLnRlc3QobGluZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihyZWNlaXZlciwgaWdub3JlVW50aWwpIHtcbiAgICAgICAgICAgIEVycm9yLnN0YWNrVHJhY2VMaW1pdCA9IEVycm9yLnN0YWNrVHJhY2VMaW1pdCArIDY7XG4gICAgICAgICAgICBjYXB0dXJlU3RhY2tUcmFjZShyZWNlaXZlciwgaWdub3JlVW50aWwpO1xuICAgICAgICAgICAgRXJyb3Iuc3RhY2tUcmFjZUxpbWl0ID0gRXJyb3Iuc3RhY2tUcmFjZUxpbWl0IC0gNjtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuXG4gICAgaWYgKHR5cGVvZiBlcnIuc3RhY2sgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgZXJyLnN0YWNrLnNwbGl0KFwiXFxuXCIpWzBdLmluZGV4T2YoXCJzdGFja0RldGVjdGlvbkBcIikgPj0gMCkge1xuICAgICAgICBzdGFja0ZyYW1lUGF0dGVybiA9IC9ALztcbiAgICAgICAgZm9ybWF0U3RhY2sgPSB2OHN0YWNrRm9ybWF0dGVyO1xuICAgICAgICBpbmRlbnRTdGFja0ZyYW1lcyA9IHRydWU7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBjYXB0dXJlU3RhY2tUcmFjZShvKSB7XG4gICAgICAgICAgICBvLnN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyIGhhc1N0YWNrQWZ0ZXJUaHJvdztcbiAgICB0cnkgeyB0aHJvdyBuZXcgRXJyb3IoKTsgfVxuICAgIGNhdGNoKGUpIHtcbiAgICAgICAgaGFzU3RhY2tBZnRlclRocm93ID0gKFwic3RhY2tcIiBpbiBlKTtcbiAgICB9XG4gICAgaWYgKCEoXCJzdGFja1wiIGluIGVycikgJiYgaGFzU3RhY2tBZnRlclRocm93ICYmXG4gICAgICAgIHR5cGVvZiBFcnJvci5zdGFja1RyYWNlTGltaXQgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgc3RhY2tGcmFtZVBhdHRlcm4gPSB2OHN0YWNrRnJhbWVQYXR0ZXJuO1xuICAgICAgICBmb3JtYXRTdGFjayA9IHY4c3RhY2tGb3JtYXR0ZXI7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBjYXB0dXJlU3RhY2tUcmFjZShvKSB7XG4gICAgICAgICAgICBFcnJvci5zdGFja1RyYWNlTGltaXQgPSBFcnJvci5zdGFja1RyYWNlTGltaXQgKyA2O1xuICAgICAgICAgICAgdHJ5IHsgdGhyb3cgbmV3IEVycm9yKCk7IH1cbiAgICAgICAgICAgIGNhdGNoKGUpIHsgby5zdGFjayA9IGUuc3RhY2s7IH1cbiAgICAgICAgICAgIEVycm9yLnN0YWNrVHJhY2VMaW1pdCA9IEVycm9yLnN0YWNrVHJhY2VMaW1pdCAtIDY7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZm9ybWF0U3RhY2sgPSBmdW5jdGlvbihzdGFjaywgZXJyb3IpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzdGFjayA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHN0YWNrO1xuXG4gICAgICAgIGlmICgodHlwZW9mIGVycm9yID09PSBcIm9iamVjdFwiIHx8XG4gICAgICAgICAgICB0eXBlb2YgZXJyb3IgPT09IFwiZnVuY3Rpb25cIikgJiZcbiAgICAgICAgICAgIGVycm9yLm5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgZXJyb3IubWVzc2FnZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9ybWF0Tm9uRXJyb3IoZXJyb3IpO1xuICAgIH07XG5cbiAgICByZXR1cm4gbnVsbDtcblxufSkoW10pO1xuXG52YXIgZmlyZURvbUV2ZW50O1xudmFyIGZpcmVHbG9iYWxFdmVudCA9IChmdW5jdGlvbigpIHtcbiAgICBpZiAodXRpbC5pc05vZGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5hbWUsIHJlYXNvbiwgcHJvbWlzZSkge1xuICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwicmVqZWN0aW9uSGFuZGxlZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3MuZW1pdChuYW1lLCBwcm9taXNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3MuZW1pdChuYW1lLCByZWFzb24sIHByb21pc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjdXN0b21FdmVudFdvcmtzID0gZmFsc2U7XG4gICAgICAgIHZhciBhbnlFdmVudFdvcmtzID0gdHJ1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhciBldiA9IG5ldyBzZWxmLkN1c3RvbUV2ZW50KFwidGVzdFwiKTtcbiAgICAgICAgICAgIGN1c3RvbUV2ZW50V29ya3MgPSBldiBpbnN0YW5jZW9mIEN1c3RvbUV2ZW50O1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICBpZiAoIWN1c3RvbUV2ZW50V29ya3MpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJDdXN0b21FdmVudFwiKTtcbiAgICAgICAgICAgICAgICBldmVudC5pbml0Q3VzdG9tRXZlbnQoXCJ0ZXN0aW5ndGhlZXZlbnRcIiwgZmFsc2UsIHRydWUsIHt9KTtcbiAgICAgICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGFueUV2ZW50V29ya3MgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoYW55RXZlbnRXb3Jrcykge1xuICAgICAgICAgICAgZmlyZURvbUV2ZW50ID0gZnVuY3Rpb24odHlwZSwgZGV0YWlsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50O1xuICAgICAgICAgICAgICAgIGlmIChjdXN0b21FdmVudFdvcmtzKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50ID0gbmV3IHNlbGYuQ3VzdG9tRXZlbnQodHlwZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBkZXRhaWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZWxmLmRpc3BhdGNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuICAgICAgICAgICAgICAgICAgICBldmVudC5pbml0Q3VzdG9tRXZlbnQodHlwZSwgZmFsc2UsIHRydWUsIGRldGFpbCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50ID8gIXNlbGYuZGlzcGF0Y2hFdmVudChldmVudCkgOiBmYWxzZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdG9XaW5kb3dNZXRob2ROYW1lTWFwID0ge307XG4gICAgICAgIHRvV2luZG93TWV0aG9kTmFtZU1hcFtcInVuaGFuZGxlZFJlamVjdGlvblwiXSA9IChcIm9uXCIgK1xuICAgICAgICAgICAgXCJ1bmhhbmRsZWRSZWplY3Rpb25cIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgdG9XaW5kb3dNZXRob2ROYW1lTWFwW1wicmVqZWN0aW9uSGFuZGxlZFwiXSA9IChcIm9uXCIgK1xuICAgICAgICAgICAgXCJyZWplY3Rpb25IYW5kbGVkXCIpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5hbWUsIHJlYXNvbiwgcHJvbWlzZSkge1xuICAgICAgICAgICAgdmFyIG1ldGhvZE5hbWUgPSB0b1dpbmRvd01ldGhvZE5hbWVNYXBbbmFtZV07XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gc2VsZlttZXRob2ROYW1lXTtcbiAgICAgICAgICAgIGlmICghbWV0aG9kKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gXCJyZWplY3Rpb25IYW5kbGVkXCIpIHtcbiAgICAgICAgICAgICAgICBtZXRob2QuY2FsbChzZWxmLCBwcm9taXNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWV0aG9kLmNhbGwoc2VsZiwgcmVhc29uLCBwcm9taXNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgIH1cbn0pKCk7XG5cbmlmICh0eXBlb2YgY29uc29sZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgY29uc29sZS53YXJuICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgd2FybiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihtZXNzYWdlKTtcbiAgICB9O1xuICAgIGlmICh1dGlsLmlzTm9kZSAmJiBwcm9jZXNzLnN0ZGVyci5pc1RUWSkge1xuICAgICAgICB3YXJuID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXCJcXHUwMDFiWzMxbVwiICsgbWVzc2FnZSArIFwiXFx1MDAxYlszOW1cXG5cIik7XG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmICghdXRpbC5pc05vZGUgJiYgdHlwZW9mIChuZXcgRXJyb3IoKS5zdGFjaykgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgd2FybiA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIiVjXCIgKyBtZXNzYWdlLCBcImNvbG9yOiByZWRcIik7XG4gICAgICAgIH07XG4gICAgfVxufVxuXG5yZXR1cm4gQ2FwdHVyZWRUcmFjZTtcbn07XG5cbn0se1wiLi9hc3luYy5qc1wiOjIsXCIuL3V0aWwuanNcIjozOH1dLDg6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKE5FWFRfRklMVEVSKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWwuanNcIik7XG52YXIgZXJyb3JzID0gX2RlcmVxXyhcIi4vZXJyb3JzLmpzXCIpO1xudmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG52YXIga2V5cyA9IF9kZXJlcV8oXCIuL2VzNS5qc1wiKS5rZXlzO1xudmFyIFR5cGVFcnJvciA9IGVycm9ycy5UeXBlRXJyb3I7XG5cbmZ1bmN0aW9uIENhdGNoRmlsdGVyKGluc3RhbmNlcywgY2FsbGJhY2ssIHByb21pc2UpIHtcbiAgICB0aGlzLl9pbnN0YW5jZXMgPSBpbnN0YW5jZXM7XG4gICAgdGhpcy5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICB0aGlzLl9wcm9taXNlID0gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gc2FmZVByZWRpY2F0ZShwcmVkaWNhdGUsIGUpIHtcbiAgICB2YXIgc2FmZU9iamVjdCA9IHt9O1xuICAgIHZhciByZXRmaWx0ZXIgPSB0cnlDYXRjaChwcmVkaWNhdGUpLmNhbGwoc2FmZU9iamVjdCwgZSk7XG5cbiAgICBpZiAocmV0ZmlsdGVyID09PSBlcnJvck9iaikgcmV0dXJuIHJldGZpbHRlcjtcblxuICAgIHZhciBzYWZlS2V5cyA9IGtleXMoc2FmZU9iamVjdCk7XG4gICAgaWYgKHNhZmVLZXlzLmxlbmd0aCkge1xuICAgICAgICBlcnJvck9iai5lID0gbmV3IFR5cGVFcnJvcihcIkNhdGNoIGZpbHRlciBtdXN0IGluaGVyaXQgZnJvbSBFcnJvciBvciBiZSBhIHNpbXBsZSBwcmVkaWNhdGUgZnVuY3Rpb25cXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9vODRvNjhcXHUwMDBhXCIpO1xuICAgICAgICByZXR1cm4gZXJyb3JPYmo7XG4gICAgfVxuICAgIHJldHVybiByZXRmaWx0ZXI7XG59XG5cbkNhdGNoRmlsdGVyLnByb3RvdHlwZS5kb0ZpbHRlciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdmFyIGNiID0gdGhpcy5fY2FsbGJhY2s7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzLl9wcm9taXNlO1xuICAgIHZhciBib3VuZFRvID0gcHJvbWlzZS5fYm91bmRWYWx1ZSgpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLl9pbnN0YW5jZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgdmFyIGl0ZW0gPSB0aGlzLl9pbnN0YW5jZXNbaV07XG4gICAgICAgIHZhciBpdGVtSXNFcnJvclR5cGUgPSBpdGVtID09PSBFcnJvciB8fFxuICAgICAgICAgICAgKGl0ZW0gIT0gbnVsbCAmJiBpdGVtLnByb3RvdHlwZSBpbnN0YW5jZW9mIEVycm9yKTtcblxuICAgICAgICBpZiAoaXRlbUlzRXJyb3JUeXBlICYmIGUgaW5zdGFuY2VvZiBpdGVtKSB7XG4gICAgICAgICAgICB2YXIgcmV0ID0gdHJ5Q2F0Y2goY2IpLmNhbGwoYm91bmRUbywgZSk7XG4gICAgICAgICAgICBpZiAocmV0ID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgICAgIE5FWFRfRklMVEVSLmUgPSByZXQuZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gTkVYVF9GSUxURVI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSBcImZ1bmN0aW9uXCIgJiYgIWl0ZW1Jc0Vycm9yVHlwZSkge1xuICAgICAgICAgICAgdmFyIHNob3VsZEhhbmRsZSA9IHNhZmVQcmVkaWNhdGUoaXRlbSwgZSk7XG4gICAgICAgICAgICBpZiAoc2hvdWxkSGFuZGxlID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgICAgIGUgPSBlcnJvck9iai5lO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzaG91bGRIYW5kbGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gdHJ5Q2F0Y2goY2IpLmNhbGwoYm91bmRUbywgZSk7XG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgICAgICAgICAgICAgTkVYVF9GSUxURVIuZSA9IHJldC5lO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gTkVYVF9GSUxURVI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgTkVYVF9GSUxURVIuZSA9IGU7XG4gICAgcmV0dXJuIE5FWFRfRklMVEVSO1xufTtcblxucmV0dXJuIENhdGNoRmlsdGVyO1xufTtcblxufSx7XCIuL2Vycm9ycy5qc1wiOjEzLFwiLi9lczUuanNcIjoxNCxcIi4vdXRpbC5qc1wiOjM4fV0sOTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgQ2FwdHVyZWRUcmFjZSwgaXNEZWJ1Z2dpbmcpIHtcbnZhciBjb250ZXh0U3RhY2sgPSBbXTtcbmZ1bmN0aW9uIENvbnRleHQoKSB7XG4gICAgdGhpcy5fdHJhY2UgPSBuZXcgQ2FwdHVyZWRUcmFjZShwZWVrQ29udGV4dCgpKTtcbn1cbkNvbnRleHQucHJvdG90eXBlLl9wdXNoQ29udGV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIWlzRGVidWdnaW5nKCkpIHJldHVybjtcbiAgICBpZiAodGhpcy5fdHJhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250ZXh0U3RhY2sucHVzaCh0aGlzLl90cmFjZSk7XG4gICAgfVxufTtcblxuQ29udGV4dC5wcm90b3R5cGUuX3BvcENvbnRleHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFpc0RlYnVnZ2luZygpKSByZXR1cm47XG4gICAgaWYgKHRoaXMuX3RyYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGV4dFN0YWNrLnBvcCgpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUNvbnRleHQoKSB7XG4gICAgaWYgKGlzRGVidWdnaW5nKCkpIHJldHVybiBuZXcgQ29udGV4dCgpO1xufVxuXG5mdW5jdGlvbiBwZWVrQ29udGV4dCgpIHtcbiAgICB2YXIgbGFzdEluZGV4ID0gY29udGV4dFN0YWNrLmxlbmd0aCAtIDE7XG4gICAgaWYgKGxhc3RJbmRleCA+PSAwKSB7XG4gICAgICAgIHJldHVybiBjb250ZXh0U3RhY2tbbGFzdEluZGV4XTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuX3BlZWtDb250ZXh0ID0gcGVla0NvbnRleHQ7XG5Qcm9taXNlLnByb3RvdHlwZS5fcHVzaENvbnRleHQgPSBDb250ZXh0LnByb3RvdHlwZS5fcHVzaENvbnRleHQ7XG5Qcm9taXNlLnByb3RvdHlwZS5fcG9wQ29udGV4dCA9IENvbnRleHQucHJvdG90eXBlLl9wb3BDb250ZXh0O1xuXG5yZXR1cm4gY3JlYXRlQ29udGV4dDtcbn07XG5cbn0se31dLDEwOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCBDYXB0dXJlZFRyYWNlKSB7XG52YXIgZ2V0RG9tYWluID0gUHJvbWlzZS5fZ2V0RG9tYWluO1xudmFyIGFzeW5jID0gX2RlcmVxXyhcIi4vYXN5bmMuanNcIik7XG52YXIgV2FybmluZyA9IF9kZXJlcV8oXCIuL2Vycm9ycy5qc1wiKS5XYXJuaW5nO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsLmpzXCIpO1xudmFyIGNhbkF0dGFjaFRyYWNlID0gdXRpbC5jYW5BdHRhY2hUcmFjZTtcbnZhciB1bmhhbmRsZWRSZWplY3Rpb25IYW5kbGVkO1xudmFyIHBvc3NpYmx5VW5oYW5kbGVkUmVqZWN0aW9uO1xudmFyIGRlYnVnZ2luZyA9IGZhbHNlIHx8ICh1dGlsLmlzTm9kZSAmJlxuICAgICAgICAgICAgICAgICAgICAoISFwcm9jZXNzLmVudltcIkJMVUVCSVJEX0RFQlVHXCJdIHx8XG4gICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmVudltcIk5PREVfRU5WXCJdID09PSBcImRldmVsb3BtZW50XCIpKTtcblxuaWYgKGRlYnVnZ2luZykge1xuICAgIGFzeW5jLmRpc2FibGVUcmFtcG9saW5lSWZOZWNlc3NhcnkoKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuX2lnbm9yZVJlamVjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl91bnNldFJlamVjdGlvbklzVW5oYW5kbGVkKCk7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDE2Nzc3MjE2O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2Vuc3VyZVBvc3NpYmxlUmVqZWN0aW9uSGFuZGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoKHRoaXMuX2JpdEZpZWxkICYgMTY3NzcyMTYpICE9PSAwKSByZXR1cm47XG4gICAgdGhpcy5fc2V0UmVqZWN0aW9uSXNVbmhhbmRsZWQoKTtcbiAgICBhc3luYy5pbnZva2VMYXRlcih0aGlzLl9ub3RpZnlVbmhhbmRsZWRSZWplY3Rpb24sIHRoaXMsIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fbm90aWZ5VW5oYW5kbGVkUmVqZWN0aW9uSXNIYW5kbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIENhcHR1cmVkVHJhY2UuZmlyZVJlamVjdGlvbkV2ZW50KFwicmVqZWN0aW9uSGFuZGxlZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuaGFuZGxlZFJlamVjdGlvbkhhbmRsZWQsIHVuZGVmaW5lZCwgdGhpcyk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fbm90aWZ5VW5oYW5kbGVkUmVqZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9pc1JlamVjdGlvblVuaGFuZGxlZCgpKSB7XG4gICAgICAgIHZhciByZWFzb24gPSB0aGlzLl9nZXRDYXJyaWVkU3RhY2tUcmFjZSgpIHx8IHRoaXMuX3NldHRsZWRWYWx1ZTtcbiAgICAgICAgdGhpcy5fc2V0VW5oYW5kbGVkUmVqZWN0aW9uSXNOb3RpZmllZCgpO1xuICAgICAgICBDYXB0dXJlZFRyYWNlLmZpcmVSZWplY3Rpb25FdmVudChcInVuaGFuZGxlZFJlamVjdGlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NzaWJseVVuaGFuZGxlZFJlamVjdGlvbiwgcmVhc29uLCB0aGlzKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0VW5oYW5kbGVkUmVqZWN0aW9uSXNOb3RpZmllZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgNTI0Mjg4O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Vuc2V0VW5oYW5kbGVkUmVqZWN0aW9uSXNOb3RpZmllZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkICYgKH41MjQyODgpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzVW5oYW5kbGVkUmVqZWN0aW9uTm90aWZpZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDUyNDI4OCkgPiAwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldFJlamVjdGlvbklzVW5oYW5kbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCAyMDk3MTUyO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Vuc2V0UmVqZWN0aW9uSXNVbmhhbmRsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCAmICh+MjA5NzE1Mik7XG4gICAgaWYgKHRoaXMuX2lzVW5oYW5kbGVkUmVqZWN0aW9uTm90aWZpZWQoKSkge1xuICAgICAgICB0aGlzLl91bnNldFVuaGFuZGxlZFJlamVjdGlvbklzTm90aWZpZWQoKTtcbiAgICAgICAgdGhpcy5fbm90aWZ5VW5oYW5kbGVkUmVqZWN0aW9uSXNIYW5kbGVkKCk7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzUmVqZWN0aW9uVW5oYW5kbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiAyMDk3MTUyKSA+IDA7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0Q2FycmllZFN0YWNrVHJhY2UgPSBmdW5jdGlvbiAoY2FwdHVyZWRUcmFjZSkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCAxMDQ4NTc2O1xuICAgIHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcjAgPSBjYXB0dXJlZFRyYWNlO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzQ2FycnlpbmdTdGFja1RyYWNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiAxMDQ4NTc2KSA+IDA7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZ2V0Q2FycmllZFN0YWNrVHJhY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzQ2FycnlpbmdTdGFja1RyYWNlKClcbiAgICAgICAgPyB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXIwXG4gICAgICAgIDogdW5kZWZpbmVkO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2NhcHR1cmVTdGFja1RyYWNlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChkZWJ1Z2dpbmcpIHtcbiAgICAgICAgdGhpcy5fdHJhY2UgPSBuZXcgQ2FwdHVyZWRUcmFjZSh0aGlzLl9wZWVrQ29udGV4dCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fYXR0YWNoRXh0cmFUcmFjZSA9IGZ1bmN0aW9uIChlcnJvciwgaWdub3JlU2VsZikge1xuICAgIGlmIChkZWJ1Z2dpbmcgJiYgY2FuQXR0YWNoVHJhY2UoZXJyb3IpKSB7XG4gICAgICAgIHZhciB0cmFjZSA9IHRoaXMuX3RyYWNlO1xuICAgICAgICBpZiAodHJhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKGlnbm9yZVNlbGYpIHRyYWNlID0gdHJhY2UuX3BhcmVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHJhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdHJhY2UuYXR0YWNoRXh0cmFUcmFjZShlcnJvcik7XG4gICAgICAgIH0gZWxzZSBpZiAoIWVycm9yLl9fc3RhY2tDbGVhbmVkX18pIHtcbiAgICAgICAgICAgIHZhciBwYXJzZWQgPSBDYXB0dXJlZFRyYWNlLnBhcnNlU3RhY2tBbmRNZXNzYWdlKGVycm9yKTtcbiAgICAgICAgICAgIHV0aWwubm90RW51bWVyYWJsZVByb3AoZXJyb3IsIFwic3RhY2tcIixcbiAgICAgICAgICAgICAgICBwYXJzZWQubWVzc2FnZSArIFwiXFxuXCIgKyBwYXJzZWQuc3RhY2suam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgICB1dGlsLm5vdEVudW1lcmFibGVQcm9wKGVycm9yLCBcIl9fc3RhY2tDbGVhbmVkX19cIiwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fd2FybiA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICB2YXIgd2FybmluZyA9IG5ldyBXYXJuaW5nKG1lc3NhZ2UpO1xuICAgIHZhciBjdHggPSB0aGlzLl9wZWVrQ29udGV4dCgpO1xuICAgIGlmIChjdHgpIHtcbiAgICAgICAgY3R4LmF0dGFjaEV4dHJhVHJhY2Uod2FybmluZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcnNlZCA9IENhcHR1cmVkVHJhY2UucGFyc2VTdGFja0FuZE1lc3NhZ2Uod2FybmluZyk7XG4gICAgICAgIHdhcm5pbmcuc3RhY2sgPSBwYXJzZWQubWVzc2FnZSArIFwiXFxuXCIgKyBwYXJzZWQuc3RhY2suam9pbihcIlxcblwiKTtcbiAgICB9XG4gICAgQ2FwdHVyZWRUcmFjZS5mb3JtYXRBbmRMb2dFcnJvcih3YXJuaW5nLCBcIlwiKTtcbn07XG5cblByb21pc2Uub25Qb3NzaWJseVVuaGFuZGxlZFJlamVjdGlvbiA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBkb21haW4gPSBnZXREb21haW4oKTtcbiAgICBwb3NzaWJseVVuaGFuZGxlZFJlamVjdGlvbiA9XG4gICAgICAgIHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiID8gKGRvbWFpbiA9PT0gbnVsbCA/IGZuIDogZG9tYWluLmJpbmQoZm4pKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG59O1xuXG5Qcm9taXNlLm9uVW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBkb21haW4gPSBnZXREb21haW4oKTtcbiAgICB1bmhhbmRsZWRSZWplY3Rpb25IYW5kbGVkID1cbiAgICAgICAgdHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIgPyAoZG9tYWluID09PSBudWxsID8gZm4gOiBkb21haW4uYmluZChmbikpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHVuZGVmaW5lZDtcbn07XG5cblByb21pc2UubG9uZ1N0YWNrVHJhY2VzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChhc3luYy5oYXZlSXRlbXNRdWV1ZWQoKSAmJlxuICAgICAgICBkZWJ1Z2dpbmcgPT09IGZhbHNlXG4gICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2Fubm90IGVuYWJsZSBsb25nIHN0YWNrIHRyYWNlcyBhZnRlciBwcm9taXNlcyBoYXZlIGJlZW4gY3JlYXRlZFxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL0RUMXF5R1xcdTAwMGFcIik7XG4gICAgfVxuICAgIGRlYnVnZ2luZyA9IENhcHR1cmVkVHJhY2UuaXNTdXBwb3J0ZWQoKTtcbiAgICBpZiAoZGVidWdnaW5nKSB7XG4gICAgICAgIGFzeW5jLmRpc2FibGVUcmFtcG9saW5lSWZOZWNlc3NhcnkoKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLmhhc0xvbmdTdGFja1RyYWNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZGVidWdnaW5nICYmIENhcHR1cmVkVHJhY2UuaXNTdXBwb3J0ZWQoKTtcbn07XG5cbmlmICghQ2FwdHVyZWRUcmFjZS5pc1N1cHBvcnRlZCgpKSB7XG4gICAgUHJvbWlzZS5sb25nU3RhY2tUcmFjZXMgPSBmdW5jdGlvbigpe307XG4gICAgZGVidWdnaW5nID0gZmFsc2U7XG59XG5cbnJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGVidWdnaW5nO1xufTtcbn07XG5cbn0se1wiLi9hc3luYy5qc1wiOjIsXCIuL2Vycm9ycy5qc1wiOjEzLFwiLi91dGlsLmpzXCI6Mzh9XSwxMTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbC5qc1wiKTtcbnZhciBpc1ByaW1pdGl2ZSA9IHV0aWwuaXNQcmltaXRpdmU7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSkge1xudmFyIHJldHVybmVyID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzO1xufTtcbnZhciB0aHJvd2VyID0gZnVuY3Rpb24gKCkge1xuICAgIHRocm93IHRoaXM7XG59O1xudmFyIHJldHVyblVuZGVmaW5lZCA9IGZ1bmN0aW9uKCkge307XG52YXIgdGhyb3dVbmRlZmluZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyB1bmRlZmluZWQ7XG59O1xuXG52YXIgd3JhcHBlciA9IGZ1bmN0aW9uICh2YWx1ZSwgYWN0aW9uKSB7XG4gICAgaWYgKGFjdGlvbiA9PT0gMSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgdmFsdWU7XG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IDIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5cblByb21pc2UucHJvdG90eXBlW1wicmV0dXJuXCJdID1cblByb21pc2UucHJvdG90eXBlLnRoZW5SZXR1cm4gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMudGhlbihyZXR1cm5VbmRlZmluZWQpO1xuXG4gICAgaWYgKGlzUHJpbWl0aXZlKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdGhlbihcbiAgICAgICAgICAgIHdyYXBwZXIodmFsdWUsIDIpLFxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgdW5kZWZpbmVkXG4gICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3RoZW4ocmV0dXJuZXIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB2YWx1ZSwgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlW1widGhyb3dcIl0gPVxuUHJvbWlzZS5wcm90b3R5cGUudGhlblRocm93ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIGlmIChyZWFzb24gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMudGhlbih0aHJvd1VuZGVmaW5lZCk7XG5cbiAgICBpZiAoaXNQcmltaXRpdmUocmVhc29uKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdGhlbihcbiAgICAgICAgICAgIHdyYXBwZXIocmVhc29uLCAxKSxcbiAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHVuZGVmaW5lZFxuICAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl90aGVuKHRocm93ZXIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCByZWFzb24sIHVuZGVmaW5lZCk7XG59O1xufTtcblxufSx7XCIuL3V0aWwuanNcIjozOH1dLDEyOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCBJTlRFUk5BTCkge1xudmFyIFByb21pc2VSZWR1Y2UgPSBQcm9taXNlLnJlZHVjZTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZWFjaCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBQcm9taXNlUmVkdWNlKHRoaXMsIGZuLCBudWxsLCBJTlRFUk5BTCk7XG59O1xuXG5Qcm9taXNlLmVhY2ggPSBmdW5jdGlvbiAocHJvbWlzZXMsIGZuKSB7XG4gICAgcmV0dXJuIFByb21pc2VSZWR1Y2UocHJvbWlzZXMsIGZuLCBudWxsLCBJTlRFUk5BTCk7XG59O1xufTtcblxufSx7fV0sMTM6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZXM1ID0gX2RlcmVxXyhcIi4vZXM1LmpzXCIpO1xudmFyIE9iamVjdGZyZWV6ZSA9IGVzNS5mcmVlemU7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWwuanNcIik7XG52YXIgaW5oZXJpdHMgPSB1dGlsLmluaGVyaXRzO1xudmFyIG5vdEVudW1lcmFibGVQcm9wID0gdXRpbC5ub3RFbnVtZXJhYmxlUHJvcDtcblxuZnVuY3Rpb24gc3ViRXJyb3IobmFtZVByb3BlcnR5LCBkZWZhdWx0TWVzc2FnZSkge1xuICAgIGZ1bmN0aW9uIFN1YkVycm9yKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFN1YkVycm9yKSkgcmV0dXJuIG5ldyBTdWJFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgbm90RW51bWVyYWJsZVByb3AodGhpcywgXCJtZXNzYWdlXCIsXG4gICAgICAgICAgICB0eXBlb2YgbWVzc2FnZSA9PT0gXCJzdHJpbmdcIiA/IG1lc3NhZ2UgOiBkZWZhdWx0TWVzc2FnZSk7XG4gICAgICAgIG5vdEVudW1lcmFibGVQcm9wKHRoaXMsIFwibmFtZVwiLCBuYW1lUHJvcGVydHkpO1xuICAgICAgICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICAgICAgICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRXJyb3IuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpbmhlcml0cyhTdWJFcnJvciwgRXJyb3IpO1xuICAgIHJldHVybiBTdWJFcnJvcjtcbn1cblxudmFyIF9UeXBlRXJyb3IsIF9SYW5nZUVycm9yO1xudmFyIFdhcm5pbmcgPSBzdWJFcnJvcihcIldhcm5pbmdcIiwgXCJ3YXJuaW5nXCIpO1xudmFyIENhbmNlbGxhdGlvbkVycm9yID0gc3ViRXJyb3IoXCJDYW5jZWxsYXRpb25FcnJvclwiLCBcImNhbmNlbGxhdGlvbiBlcnJvclwiKTtcbnZhciBUaW1lb3V0RXJyb3IgPSBzdWJFcnJvcihcIlRpbWVvdXRFcnJvclwiLCBcInRpbWVvdXQgZXJyb3JcIik7XG52YXIgQWdncmVnYXRlRXJyb3IgPSBzdWJFcnJvcihcIkFnZ3JlZ2F0ZUVycm9yXCIsIFwiYWdncmVnYXRlIGVycm9yXCIpO1xudHJ5IHtcbiAgICBfVHlwZUVycm9yID0gVHlwZUVycm9yO1xuICAgIF9SYW5nZUVycm9yID0gUmFuZ2VFcnJvcjtcbn0gY2F0Y2goZSkge1xuICAgIF9UeXBlRXJyb3IgPSBzdWJFcnJvcihcIlR5cGVFcnJvclwiLCBcInR5cGUgZXJyb3JcIik7XG4gICAgX1JhbmdlRXJyb3IgPSBzdWJFcnJvcihcIlJhbmdlRXJyb3JcIiwgXCJyYW5nZSBlcnJvclwiKTtcbn1cblxudmFyIG1ldGhvZHMgPSAoXCJqb2luIHBvcCBwdXNoIHNoaWZ0IHVuc2hpZnQgc2xpY2UgZmlsdGVyIGZvckVhY2ggc29tZSBcIiArXG4gICAgXCJldmVyeSBtYXAgaW5kZXhPZiBsYXN0SW5kZXhPZiByZWR1Y2UgcmVkdWNlUmlnaHQgc29ydCByZXZlcnNlXCIpLnNwbGl0KFwiIFwiKTtcblxuZm9yICh2YXIgaSA9IDA7IGkgPCBtZXRob2RzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHR5cGVvZiBBcnJheS5wcm90b3R5cGVbbWV0aG9kc1tpXV0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBBZ2dyZWdhdGVFcnJvci5wcm90b3R5cGVbbWV0aG9kc1tpXV0gPSBBcnJheS5wcm90b3R5cGVbbWV0aG9kc1tpXV07XG4gICAgfVxufVxuXG5lczUuZGVmaW5lUHJvcGVydHkoQWdncmVnYXRlRXJyb3IucHJvdG90eXBlLCBcImxlbmd0aFwiLCB7XG4gICAgdmFsdWU6IDAsXG4gICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG59KTtcbkFnZ3JlZ2F0ZUVycm9yLnByb3RvdHlwZVtcImlzT3BlcmF0aW9uYWxcIl0gPSB0cnVlO1xudmFyIGxldmVsID0gMDtcbkFnZ3JlZ2F0ZUVycm9yLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmRlbnQgPSBBcnJheShsZXZlbCAqIDQgKyAxKS5qb2luKFwiIFwiKTtcbiAgICB2YXIgcmV0ID0gXCJcXG5cIiArIGluZGVudCArIFwiQWdncmVnYXRlRXJyb3Igb2Y6XCIgKyBcIlxcblwiO1xuICAgIGxldmVsKys7XG4gICAgaW5kZW50ID0gQXJyYXkobGV2ZWwgKiA0ICsgMSkuam9pbihcIiBcIik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBzdHIgPSB0aGlzW2ldID09PSB0aGlzID8gXCJbQ2lyY3VsYXIgQWdncmVnYXRlRXJyb3JdXCIgOiB0aGlzW2ldICsgXCJcIjtcbiAgICAgICAgdmFyIGxpbmVzID0gc3RyLnNwbGl0KFwiXFxuXCIpO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxpbmVzLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICBsaW5lc1tqXSA9IGluZGVudCArIGxpbmVzW2pdO1xuICAgICAgICB9XG4gICAgICAgIHN0ciA9IGxpbmVzLmpvaW4oXCJcXG5cIik7XG4gICAgICAgIHJldCArPSBzdHIgKyBcIlxcblwiO1xuICAgIH1cbiAgICBsZXZlbC0tO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBPcGVyYXRpb25hbEVycm9yKG1lc3NhZ2UpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgT3BlcmF0aW9uYWxFcnJvcikpXG4gICAgICAgIHJldHVybiBuZXcgT3BlcmF0aW9uYWxFcnJvcihtZXNzYWdlKTtcbiAgICBub3RFbnVtZXJhYmxlUHJvcCh0aGlzLCBcIm5hbWVcIiwgXCJPcGVyYXRpb25hbEVycm9yXCIpO1xuICAgIG5vdEVudW1lcmFibGVQcm9wKHRoaXMsIFwibWVzc2FnZVwiLCBtZXNzYWdlKTtcbiAgICB0aGlzLmNhdXNlID0gbWVzc2FnZTtcbiAgICB0aGlzW1wiaXNPcGVyYXRpb25hbFwiXSA9IHRydWU7XG5cbiAgICBpZiAobWVzc2FnZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIG5vdEVudW1lcmFibGVQcm9wKHRoaXMsIFwibWVzc2FnZVwiLCBtZXNzYWdlLm1lc3NhZ2UpO1xuICAgICAgICBub3RFbnVtZXJhYmxlUHJvcCh0aGlzLCBcInN0YWNrXCIsIG1lc3NhZ2Uuc3RhY2spO1xuICAgIH0gZWxzZSBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gICAgfVxuXG59XG5pbmhlcml0cyhPcGVyYXRpb25hbEVycm9yLCBFcnJvcik7XG5cbnZhciBlcnJvclR5cGVzID0gRXJyb3JbXCJfX0JsdWViaXJkRXJyb3JUeXBlc19fXCJdO1xuaWYgKCFlcnJvclR5cGVzKSB7XG4gICAgZXJyb3JUeXBlcyA9IE9iamVjdGZyZWV6ZSh7XG4gICAgICAgIENhbmNlbGxhdGlvbkVycm9yOiBDYW5jZWxsYXRpb25FcnJvcixcbiAgICAgICAgVGltZW91dEVycm9yOiBUaW1lb3V0RXJyb3IsXG4gICAgICAgIE9wZXJhdGlvbmFsRXJyb3I6IE9wZXJhdGlvbmFsRXJyb3IsXG4gICAgICAgIFJlamVjdGlvbkVycm9yOiBPcGVyYXRpb25hbEVycm9yLFxuICAgICAgICBBZ2dyZWdhdGVFcnJvcjogQWdncmVnYXRlRXJyb3JcbiAgICB9KTtcbiAgICBub3RFbnVtZXJhYmxlUHJvcChFcnJvciwgXCJfX0JsdWViaXJkRXJyb3JUeXBlc19fXCIsIGVycm9yVHlwZXMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBFcnJvcjogRXJyb3IsXG4gICAgVHlwZUVycm9yOiBfVHlwZUVycm9yLFxuICAgIFJhbmdlRXJyb3I6IF9SYW5nZUVycm9yLFxuICAgIENhbmNlbGxhdGlvbkVycm9yOiBlcnJvclR5cGVzLkNhbmNlbGxhdGlvbkVycm9yLFxuICAgIE9wZXJhdGlvbmFsRXJyb3I6IGVycm9yVHlwZXMuT3BlcmF0aW9uYWxFcnJvcixcbiAgICBUaW1lb3V0RXJyb3I6IGVycm9yVHlwZXMuVGltZW91dEVycm9yLFxuICAgIEFnZ3JlZ2F0ZUVycm9yOiBlcnJvclR5cGVzLkFnZ3JlZ2F0ZUVycm9yLFxuICAgIFdhcm5pbmc6IFdhcm5pbmdcbn07XG5cbn0se1wiLi9lczUuanNcIjoxNCxcIi4vdXRpbC5qc1wiOjM4fV0sMTQ6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xudmFyIGlzRVM1ID0gKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgcmV0dXJuIHRoaXMgPT09IHVuZGVmaW5lZDtcbn0pKCk7XG5cbmlmIChpc0VTNSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBmcmVlemU6IE9iamVjdC5mcmVlemUsXG4gICAgICAgIGRlZmluZVByb3BlcnR5OiBPYmplY3QuZGVmaW5lUHJvcGVydHksXG4gICAgICAgIGdldERlc2NyaXB0b3I6IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IsXG4gICAgICAgIGtleXM6IE9iamVjdC5rZXlzLFxuICAgICAgICBuYW1lczogT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMsXG4gICAgICAgIGdldFByb3RvdHlwZU9mOiBPYmplY3QuZ2V0UHJvdG90eXBlT2YsXG4gICAgICAgIGlzQXJyYXk6IEFycmF5LmlzQXJyYXksXG4gICAgICAgIGlzRVM1OiBpc0VTNSxcbiAgICAgICAgcHJvcGVydHlJc1dyaXRhYmxlOiBmdW5jdGlvbihvYmosIHByb3ApIHtcbiAgICAgICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIHByb3ApO1xuICAgICAgICAgICAgcmV0dXJuICEhKCFkZXNjcmlwdG9yIHx8IGRlc2NyaXB0b3Iud3JpdGFibGUgfHwgZGVzY3JpcHRvci5zZXQpO1xuICAgICAgICB9XG4gICAgfTtcbn0gZWxzZSB7XG4gICAgdmFyIGhhcyA9IHt9Lmhhc093blByb3BlcnR5O1xuICAgIHZhciBzdHIgPSB7fS50b1N0cmluZztcbiAgICB2YXIgcHJvdG8gPSB7fS5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG5cbiAgICB2YXIgT2JqZWN0S2V5cyA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG8pIHtcbiAgICAgICAgICAgIGlmIChoYXMuY2FsbChvLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG5cbiAgICB2YXIgT2JqZWN0R2V0RGVzY3JpcHRvciA9IGZ1bmN0aW9uKG8sIGtleSkge1xuICAgICAgICByZXR1cm4ge3ZhbHVlOiBvW2tleV19O1xuICAgIH07XG5cbiAgICB2YXIgT2JqZWN0RGVmaW5lUHJvcGVydHkgPSBmdW5jdGlvbiAobywga2V5LCBkZXNjKSB7XG4gICAgICAgIG9ba2V5XSA9IGRlc2MudmFsdWU7XG4gICAgICAgIHJldHVybiBvO1xuICAgIH07XG5cbiAgICB2YXIgT2JqZWN0RnJlZXplID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG5cbiAgICB2YXIgT2JqZWN0R2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0KG9iaikuY29uc3RydWN0b3IucHJvdG90eXBlO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvdG87XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIEFycmF5SXNBcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBzdHIuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBpc0FycmF5OiBBcnJheUlzQXJyYXksXG4gICAgICAgIGtleXM6IE9iamVjdEtleXMsXG4gICAgICAgIG5hbWVzOiBPYmplY3RLZXlzLFxuICAgICAgICBkZWZpbmVQcm9wZXJ0eTogT2JqZWN0RGVmaW5lUHJvcGVydHksXG4gICAgICAgIGdldERlc2NyaXB0b3I6IE9iamVjdEdldERlc2NyaXB0b3IsXG4gICAgICAgIGZyZWV6ZTogT2JqZWN0RnJlZXplLFxuICAgICAgICBnZXRQcm90b3R5cGVPZjogT2JqZWN0R2V0UHJvdG90eXBlT2YsXG4gICAgICAgIGlzRVM1OiBpc0VTNSxcbiAgICAgICAgcHJvcGVydHlJc1dyaXRhYmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxufSx7fV0sMTU6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsIElOVEVSTkFMKSB7XG52YXIgUHJvbWlzZU1hcCA9IFByb21pc2UubWFwO1xuXG5Qcm9taXNlLnByb3RvdHlwZS5maWx0ZXIgPSBmdW5jdGlvbiAoZm4sIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gUHJvbWlzZU1hcCh0aGlzLCBmbiwgb3B0aW9ucywgSU5URVJOQUwpO1xufTtcblxuUHJvbWlzZS5maWx0ZXIgPSBmdW5jdGlvbiAocHJvbWlzZXMsIGZuLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIFByb21pc2VNYXAocHJvbWlzZXMsIGZuLCBvcHRpb25zLCBJTlRFUk5BTCk7XG59O1xufTtcblxufSx7fV0sMTY6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsIE5FWFRfRklMVEVSLCB0cnlDb252ZXJ0VG9Qcm9taXNlKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWwuanNcIik7XG52YXIgaXNQcmltaXRpdmUgPSB1dGlsLmlzUHJpbWl0aXZlO1xudmFyIHRocm93ZXIgPSB1dGlsLnRocm93ZXI7XG5cbmZ1bmN0aW9uIHJldHVyblRoaXMoKSB7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5mdW5jdGlvbiB0aHJvd1RoaXMoKSB7XG4gICAgdGhyb3cgdGhpcztcbn1cbmZ1bmN0aW9uIHJldHVybiQocikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIHRocm93JChyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aHJvdyByO1xuICAgIH07XG59XG5mdW5jdGlvbiBwcm9taXNlZEZpbmFsbHkocmV0LCByZWFzb25PclZhbHVlLCBpc0Z1bGZpbGxlZCkge1xuICAgIHZhciB0aGVuO1xuICAgIGlmIChpc1ByaW1pdGl2ZShyZWFzb25PclZhbHVlKSkge1xuICAgICAgICB0aGVuID0gaXNGdWxmaWxsZWQgPyByZXR1cm4kKHJlYXNvbk9yVmFsdWUpIDogdGhyb3ckKHJlYXNvbk9yVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoZW4gPSBpc0Z1bGZpbGxlZCA/IHJldHVyblRoaXMgOiB0aHJvd1RoaXM7XG4gICAgfVxuICAgIHJldHVybiByZXQuX3RoZW4odGhlbiwgdGhyb3dlciwgdW5kZWZpbmVkLCByZWFzb25PclZhbHVlLCB1bmRlZmluZWQpO1xufVxuXG5mdW5jdGlvbiBmaW5hbGx5SGFuZGxlcihyZWFzb25PclZhbHVlKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG4gICAgdmFyIGhhbmRsZXIgPSB0aGlzLmhhbmRsZXI7XG5cbiAgICB2YXIgcmV0ID0gcHJvbWlzZS5faXNCb3VuZCgpXG4gICAgICAgICAgICAgICAgICAgID8gaGFuZGxlci5jYWxsKHByb21pc2UuX2JvdW5kVmFsdWUoKSlcbiAgICAgICAgICAgICAgICAgICAgOiBoYW5kbGVyKCk7XG5cbiAgICBpZiAocmV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UocmV0LCBwcm9taXNlKTtcbiAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgIG1heWJlUHJvbWlzZSA9IG1heWJlUHJvbWlzZS5fdGFyZ2V0KCk7XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZWRGaW5hbGx5KG1heWJlUHJvbWlzZSwgcmVhc29uT3JWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2UuaXNGdWxmaWxsZWQoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocHJvbWlzZS5pc1JlamVjdGVkKCkpIHtcbiAgICAgICAgTkVYVF9GSUxURVIuZSA9IHJlYXNvbk9yVmFsdWU7XG4gICAgICAgIHJldHVybiBORVhUX0ZJTFRFUjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVhc29uT3JWYWx1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRhcEhhbmRsZXIodmFsdWUpIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcbiAgICB2YXIgaGFuZGxlciA9IHRoaXMuaGFuZGxlcjtcblxuICAgIHZhciByZXQgPSBwcm9taXNlLl9pc0JvdW5kKClcbiAgICAgICAgICAgICAgICAgICAgPyBoYW5kbGVyLmNhbGwocHJvbWlzZS5fYm91bmRWYWx1ZSgpLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgOiBoYW5kbGVyKHZhbHVlKTtcblxuICAgIGlmIChyZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZShyZXQsIHByb21pc2UpO1xuICAgICAgICBpZiAobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgbWF5YmVQcm9taXNlID0gbWF5YmVQcm9taXNlLl90YXJnZXQoKTtcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlZEZpbmFsbHkobWF5YmVQcm9taXNlLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5fcGFzc1Rocm91Z2hIYW5kbGVyID0gZnVuY3Rpb24gKGhhbmRsZXIsIGlzRmluYWxseSkge1xuICAgIGlmICh0eXBlb2YgaGFuZGxlciAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gdGhpcy50aGVuKCk7XG5cbiAgICB2YXIgcHJvbWlzZUFuZEhhbmRsZXIgPSB7XG4gICAgICAgIHByb21pc2U6IHRoaXMsXG4gICAgICAgIGhhbmRsZXI6IGhhbmRsZXJcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRoaXMuX3RoZW4oXG4gICAgICAgICAgICBpc0ZpbmFsbHkgPyBmaW5hbGx5SGFuZGxlciA6IHRhcEhhbmRsZXIsXG4gICAgICAgICAgICBpc0ZpbmFsbHkgPyBmaW5hbGx5SGFuZGxlciA6IHVuZGVmaW5lZCwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgcHJvbWlzZUFuZEhhbmRsZXIsIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5sYXN0bHkgPVxuUHJvbWlzZS5wcm90b3R5cGVbXCJmaW5hbGx5XCJdID0gZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fcGFzc1Rocm91Z2hIYW5kbGVyKGhhbmRsZXIsIHRydWUpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUudGFwID0gZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fcGFzc1Rocm91Z2hIYW5kbGVyKGhhbmRsZXIsIGZhbHNlKTtcbn07XG59O1xuXG59LHtcIi4vdXRpbC5qc1wiOjM4fV0sMTc6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVJlamVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgSU5URVJOQUwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRyeUNvbnZlcnRUb1Byb21pc2UpIHtcbnZhciBlcnJvcnMgPSBfZGVyZXFfKFwiLi9lcnJvcnMuanNcIik7XG52YXIgVHlwZUVycm9yID0gZXJyb3JzLlR5cGVFcnJvcjtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbC5qc1wiKTtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG52YXIgdHJ5Q2F0Y2ggPSB1dGlsLnRyeUNhdGNoO1xudmFyIHlpZWxkSGFuZGxlcnMgPSBbXTtcblxuZnVuY3Rpb24gcHJvbWlzZUZyb21ZaWVsZEhhbmRsZXIodmFsdWUsIHlpZWxkSGFuZGxlcnMsIHRyYWNlUGFyZW50KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB5aWVsZEhhbmRsZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHRyYWNlUGFyZW50Ll9wdXNoQ29udGV4dCgpO1xuICAgICAgICB2YXIgcmVzdWx0ID0gdHJ5Q2F0Y2goeWllbGRIYW5kbGVyc1tpXSkodmFsdWUpO1xuICAgICAgICB0cmFjZVBhcmVudC5fcG9wQ29udGV4dCgpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgdHJhY2VQYXJlbnQuX3B1c2hDb250ZXh0KCk7XG4gICAgICAgICAgICB2YXIgcmV0ID0gUHJvbWlzZS5yZWplY3QoZXJyb3JPYmouZSk7XG4gICAgICAgICAgICB0cmFjZVBhcmVudC5fcG9wQ29udGV4dCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZShyZXN1bHQsIHRyYWNlUGFyZW50KTtcbiAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHJldHVybiBtYXliZVByb21pc2U7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBQcm9taXNlU3Bhd24oZ2VuZXJhdG9yRnVuY3Rpb24sIHJlY2VpdmVyLCB5aWVsZEhhbmRsZXIsIHN0YWNrKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzLl9wcm9taXNlID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIHByb21pc2UuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgdGhpcy5fc3RhY2sgPSBzdGFjaztcbiAgICB0aGlzLl9nZW5lcmF0b3JGdW5jdGlvbiA9IGdlbmVyYXRvckZ1bmN0aW9uO1xuICAgIHRoaXMuX3JlY2VpdmVyID0gcmVjZWl2ZXI7XG4gICAgdGhpcy5fZ2VuZXJhdG9yID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3lpZWxkSGFuZGxlcnMgPSB0eXBlb2YgeWllbGRIYW5kbGVyID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgPyBbeWllbGRIYW5kbGVyXS5jb25jYXQoeWllbGRIYW5kbGVycylcbiAgICAgICAgOiB5aWVsZEhhbmRsZXJzO1xufVxuXG5Qcm9taXNlU3Bhd24ucHJvdG90eXBlLnByb21pc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Byb21pc2U7XG59O1xuXG5Qcm9taXNlU3Bhd24ucHJvdG90eXBlLl9ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZ2VuZXJhdG9yID0gdGhpcy5fZ2VuZXJhdG9yRnVuY3Rpb24uY2FsbCh0aGlzLl9yZWNlaXZlcik7XG4gICAgdGhpcy5fcmVjZWl2ZXIgPVxuICAgICAgICB0aGlzLl9nZW5lcmF0b3JGdW5jdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9uZXh0KHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlU3Bhd24ucHJvdG90eXBlLl9jb250aW51ZSA9IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAocmVzdWx0ID09PSBlcnJvck9iaikge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2socmVzdWx0LmUsIGZhbHNlLCB0cnVlKTtcbiAgICB9XG5cbiAgICB2YXIgdmFsdWUgPSByZXN1bHQudmFsdWU7XG4gICAgaWYgKHJlc3VsdC5kb25lID09PSB0cnVlKSB7XG4gICAgICAgIHRoaXMuX3Byb21pc2UuX3Jlc29sdmVDYWxsYmFjayh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UodmFsdWUsIHRoaXMuX3Byb21pc2UpO1xuICAgICAgICBpZiAoIShtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgICAgICAgICAgbWF5YmVQcm9taXNlID1cbiAgICAgICAgICAgICAgICBwcm9taXNlRnJvbVlpZWxkSGFuZGxlcihtYXliZVByb21pc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5feWllbGRIYW5kbGVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcm9taXNlKTtcbiAgICAgICAgICAgIGlmIChtYXliZVByb21pc2UgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90aHJvdyhcbiAgICAgICAgICAgICAgICAgICAgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiQSB2YWx1ZSAlcyB3YXMgeWllbGRlZCB0aGF0IGNvdWxkIG5vdCBiZSB0cmVhdGVkIGFzIGEgcHJvbWlzZVxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsLzRZNHBEa1xcdTAwMGFcXHUwMDBhXCIucmVwbGFjZShcIiVzXCIsIHZhbHVlKSArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIkZyb20gY29yb3V0aW5lOlxcdTAwMGFcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zdGFjay5zcGxpdChcIlxcblwiKS5zbGljZSgxLCAtNykuam9pbihcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbWF5YmVQcm9taXNlLl90aGVuKFxuICAgICAgICAgICAgdGhpcy5fbmV4dCxcbiAgICAgICAgICAgIHRoaXMuX3Rocm93LFxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIG51bGxcbiAgICAgICApO1xuICAgIH1cbn07XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUuX3Rocm93ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHRoaXMuX3Byb21pc2UuX2F0dGFjaEV4dHJhVHJhY2UocmVhc29uKTtcbiAgICB0aGlzLl9wcm9taXNlLl9wdXNoQ29udGV4dCgpO1xuICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9nZW5lcmF0b3JbXCJ0aHJvd1wiXSlcbiAgICAgICAgLmNhbGwodGhpcy5fZ2VuZXJhdG9yLCByZWFzb24pO1xuICAgIHRoaXMuX3Byb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICB0aGlzLl9jb250aW51ZShyZXN1bHQpO1xufTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5fbmV4dCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuX3Byb21pc2UuX3B1c2hDb250ZXh0KCk7XG4gICAgdmFyIHJlc3VsdCA9IHRyeUNhdGNoKHRoaXMuX2dlbmVyYXRvci5uZXh0KS5jYWxsKHRoaXMuX2dlbmVyYXRvciwgdmFsdWUpO1xuICAgIHRoaXMuX3Byb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICB0aGlzLl9jb250aW51ZShyZXN1bHQpO1xufTtcblxuUHJvbWlzZS5jb3JvdXRpbmUgPSBmdW5jdGlvbiAoZ2VuZXJhdG9yRnVuY3Rpb24sIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIGdlbmVyYXRvckZ1bmN0aW9uICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImdlbmVyYXRvckZ1bmN0aW9uIG11c3QgYmUgYSBmdW5jdGlvblxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsLzZWcWhtMFxcdTAwMGFcIik7XG4gICAgfVxuICAgIHZhciB5aWVsZEhhbmRsZXIgPSBPYmplY3Qob3B0aW9ucykueWllbGRIYW5kbGVyO1xuICAgIHZhciBQcm9taXNlU3Bhd24kID0gUHJvbWlzZVNwYXduO1xuICAgIHZhciBzdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBnZW5lcmF0b3IgPSBnZW5lcmF0b3JGdW5jdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB2YXIgc3Bhd24gPSBuZXcgUHJvbWlzZVNwYXduJCh1bmRlZmluZWQsIHVuZGVmaW5lZCwgeWllbGRIYW5kbGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjayk7XG4gICAgICAgIHNwYXduLl9nZW5lcmF0b3IgPSBnZW5lcmF0b3I7XG4gICAgICAgIHNwYXduLl9uZXh0KHVuZGVmaW5lZCk7XG4gICAgICAgIHJldHVybiBzcGF3bi5wcm9taXNlKCk7XG4gICAgfTtcbn07XG5cblByb21pc2UuY29yb3V0aW5lLmFkZFlpZWxkSGFuZGxlciA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZm4gbXVzdCBiZSBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvOTE2bEpKXFx1MDAwYVwiKTtcbiAgICB5aWVsZEhhbmRsZXJzLnB1c2goZm4pO1xufTtcblxuUHJvbWlzZS5zcGF3biA9IGZ1bmN0aW9uIChnZW5lcmF0b3JGdW5jdGlvbikge1xuICAgIGlmICh0eXBlb2YgZ2VuZXJhdG9yRnVuY3Rpb24gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZ2VuZXJhdG9yRnVuY3Rpb24gbXVzdCBiZSBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvNlZxaG0wXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgdmFyIHNwYXduID0gbmV3IFByb21pc2VTcGF3bihnZW5lcmF0b3JGdW5jdGlvbiwgdGhpcyk7XG4gICAgdmFyIHJldCA9IHNwYXduLnByb21pc2UoKTtcbiAgICBzcGF3bi5fcnVuKFByb21pc2Uuc3Bhd24pO1xuICAgIHJldHVybiByZXQ7XG59O1xufTtcblxufSx7XCIuL2Vycm9ycy5qc1wiOjEzLFwiLi91dGlsLmpzXCI6Mzh9XSwxODpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID1cbmZ1bmN0aW9uKFByb21pc2UsIFByb21pc2VBcnJheSwgdHJ5Q29udmVydFRvUHJvbWlzZSwgSU5URVJOQUwpIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbC5qc1wiKTtcbnZhciBjYW5FdmFsdWF0ZSA9IHV0aWwuY2FuRXZhbHVhdGU7XG52YXIgdHJ5Q2F0Y2ggPSB1dGlsLnRyeUNhdGNoO1xudmFyIGVycm9yT2JqID0gdXRpbC5lcnJvck9iajtcbnZhciByZWplY3Q7XG5cbmlmICghdHJ1ZSkge1xuaWYgKGNhbkV2YWx1YXRlKSB7XG4gICAgdmFyIHRoZW5DYWxsYmFjayA9IGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcInZhbHVlXCIsIFwiaG9sZGVyXCIsIFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgJ3VzZSBzdHJpY3QnOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgaG9sZGVyLnBJbmRleCA9IHZhbHVlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgaG9sZGVyLmNoZWNrRnVsZmlsbG1lbnQodGhpcyk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgXCIucmVwbGFjZSgvSW5kZXgvZywgaSkpO1xuICAgIH07XG5cbiAgICB2YXIgY2FsbGVyID0gZnVuY3Rpb24oY291bnQpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8PSBjb3VudDsgKytpKSB2YWx1ZXMucHVzaChcImhvbGRlci5wXCIgKyBpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImhvbGRlclwiLCBcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICd1c2Ugc3RyaWN0JzsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGhvbGRlci5mbjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayh2YWx1ZXMpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIFwiLnJlcGxhY2UoL3ZhbHVlcy9nLCB2YWx1ZXMuam9pbihcIiwgXCIpKSk7XG4gICAgfTtcbiAgICB2YXIgdGhlbkNhbGxiYWNrcyA9IFtdO1xuICAgIHZhciBjYWxsZXJzID0gW3VuZGVmaW5lZF07XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPD0gNTsgKytpKSB7XG4gICAgICAgIHRoZW5DYWxsYmFja3MucHVzaCh0aGVuQ2FsbGJhY2soaSkpO1xuICAgICAgICBjYWxsZXJzLnB1c2goY2FsbGVyKGkpKTtcbiAgICB9XG5cbiAgICB2YXIgSG9sZGVyID0gZnVuY3Rpb24odG90YWwsIGZuKSB7XG4gICAgICAgIHRoaXMucDEgPSB0aGlzLnAyID0gdGhpcy5wMyA9IHRoaXMucDQgPSB0aGlzLnA1ID0gbnVsbDtcbiAgICAgICAgdGhpcy5mbiA9IGZuO1xuICAgICAgICB0aGlzLnRvdGFsID0gdG90YWw7XG4gICAgICAgIHRoaXMubm93ID0gMDtcbiAgICB9O1xuXG4gICAgSG9sZGVyLnByb3RvdHlwZS5jYWxsZXJzID0gY2FsbGVycztcbiAgICBIb2xkZXIucHJvdG90eXBlLmNoZWNrRnVsZmlsbG1lbnQgPSBmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgIHZhciBub3cgPSB0aGlzLm5vdztcbiAgICAgICAgbm93Kys7XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMudG90YWw7XG4gICAgICAgIGlmIChub3cgPj0gdG90YWwpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyID0gdGhpcy5jYWxsZXJzW3RvdGFsXTtcbiAgICAgICAgICAgIHByb21pc2UuX3B1c2hDb250ZXh0KCk7XG4gICAgICAgICAgICB2YXIgcmV0ID0gdHJ5Q2F0Y2goaGFuZGxlcikodGhpcyk7XG4gICAgICAgICAgICBwcm9taXNlLl9wb3BDb250ZXh0KCk7XG4gICAgICAgICAgICBpZiAocmV0ID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKHJldC5lLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByb21pc2UuX3Jlc29sdmVDYWxsYmFjayhyZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ub3cgPSBub3c7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgdGhpcy5fcmVqZWN0KHJlYXNvbik7XG4gICAgfTtcbn1cbn1cblxuUHJvbWlzZS5qb2luID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsYXN0ID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7XG4gICAgdmFyIGZuO1xuICAgIGlmIChsYXN0ID4gMCAmJiB0eXBlb2YgYXJndW1lbnRzW2xhc3RdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgZm4gPSBhcmd1bWVudHNbbGFzdF07XG4gICAgICAgIGlmICghdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKGxhc3QgPCA2ICYmIGNhbkV2YWx1YXRlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgICAgICAgICByZXQuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgICAgICAgICAgICAgdmFyIGhvbGRlciA9IG5ldyBIb2xkZXIobGFzdCwgZm4pO1xuICAgICAgICAgICAgICAgIHZhciBjYWxsYmFja3MgPSB0aGVuQ2FsbGJhY2tzO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGFzdDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKGFyZ3VtZW50c1tpXSwgcmV0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZSA9IG1heWJlUHJvbWlzZS5fdGFyZ2V0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF5YmVQcm9taXNlLl9pc1BlbmRpbmcoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZS5fdGhlbihjYWxsYmFja3NbaV0sIHJlamVjdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLCByZXQsIGhvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1heWJlUHJvbWlzZS5faXNGdWxmaWxsZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrc1tpXS5jYWxsKHJldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXliZVByb21pc2UuX3ZhbHVlKCksIGhvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldC5fcmVqZWN0KG1heWJlUHJvbWlzZS5fcmVhc29uKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzW2ldLmNhbGwocmV0LCBtYXliZVByb21pc2UsIGhvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgJF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoO3ZhciBhcmdzID0gbmV3IEFycmF5KCRfbGVuKTsgZm9yKHZhciAkX2kgPSAwOyAkX2kgPCAkX2xlbjsgKyskX2kpIHthcmdzWyRfaV0gPSBhcmd1bWVudHNbJF9pXTt9XG4gICAgaWYgKGZuKSBhcmdzLnBvcCgpO1xuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZUFycmF5KGFyZ3MpLnByb21pc2UoKTtcbiAgICByZXR1cm4gZm4gIT09IHVuZGVmaW5lZCA/IHJldC5zcHJlYWQoZm4pIDogcmV0O1xufTtcblxufTtcblxufSx7XCIuL3V0aWwuanNcIjozOH1dLDE5OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBQcm9taXNlQXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVJlamVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5Q29udmVydFRvUHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgSU5URVJOQUwpIHtcbnZhciBnZXREb21haW4gPSBQcm9taXNlLl9nZXREb21haW47XG52YXIgYXN5bmMgPSBfZGVyZXFfKFwiLi9hc3luYy5qc1wiKTtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbC5qc1wiKTtcbnZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xudmFyIFBFTkRJTkcgPSB7fTtcbnZhciBFTVBUWV9BUlJBWSA9IFtdO1xuXG5mdW5jdGlvbiBNYXBwaW5nUHJvbWlzZUFycmF5KHByb21pc2VzLCBmbiwgbGltaXQsIF9maWx0ZXIpIHtcbiAgICB0aGlzLmNvbnN0cnVjdG9yJChwcm9taXNlcyk7XG4gICAgdGhpcy5fcHJvbWlzZS5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICB2YXIgZG9tYWluID0gZ2V0RG9tYWluKCk7XG4gICAgdGhpcy5fY2FsbGJhY2sgPSBkb21haW4gPT09IG51bGwgPyBmbiA6IGRvbWFpbi5iaW5kKGZuKTtcbiAgICB0aGlzLl9wcmVzZXJ2ZWRWYWx1ZXMgPSBfZmlsdGVyID09PSBJTlRFUk5BTFxuICAgICAgICA/IG5ldyBBcnJheSh0aGlzLmxlbmd0aCgpKVxuICAgICAgICA6IG51bGw7XG4gICAgdGhpcy5fbGltaXQgPSBsaW1pdDtcbiAgICB0aGlzLl9pbkZsaWdodCA9IDA7XG4gICAgdGhpcy5fcXVldWUgPSBsaW1pdCA+PSAxID8gW10gOiBFTVBUWV9BUlJBWTtcbiAgICBhc3luYy5pbnZva2UoaW5pdCwgdGhpcywgdW5kZWZpbmVkKTtcbn1cbnV0aWwuaW5oZXJpdHMoTWFwcGluZ1Byb21pc2VBcnJheSwgUHJvbWlzZUFycmF5KTtcbmZ1bmN0aW9uIGluaXQoKSB7dGhpcy5faW5pdCQodW5kZWZpbmVkLCAtMik7fVxuXG5NYXBwaW5nUHJvbWlzZUFycmF5LnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uICgpIHt9O1xuXG5NYXBwaW5nUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZUZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fdmFsdWVzO1xuICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xuICAgIHZhciBwcmVzZXJ2ZWRWYWx1ZXMgPSB0aGlzLl9wcmVzZXJ2ZWRWYWx1ZXM7XG4gICAgdmFyIGxpbWl0ID0gdGhpcy5fbGltaXQ7XG4gICAgaWYgKHZhbHVlc1tpbmRleF0gPT09IFBFTkRJTkcpIHtcbiAgICAgICAgdmFsdWVzW2luZGV4XSA9IHZhbHVlO1xuICAgICAgICBpZiAobGltaXQgPj0gMSkge1xuICAgICAgICAgICAgdGhpcy5faW5GbGlnaHQtLTtcbiAgICAgICAgICAgIHRoaXMuX2RyYWluUXVldWUoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc1Jlc29sdmVkKCkpIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChsaW1pdCA+PSAxICYmIHRoaXMuX2luRmxpZ2h0ID49IGxpbWl0KSB7XG4gICAgICAgICAgICB2YWx1ZXNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9xdWV1ZS5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc2VydmVkVmFsdWVzICE9PSBudWxsKSBwcmVzZXJ2ZWRWYWx1ZXNbaW5kZXhdID0gdmFsdWU7XG5cbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5fY2FsbGJhY2s7XG4gICAgICAgIHZhciByZWNlaXZlciA9IHRoaXMuX3Byb21pc2UuX2JvdW5kVmFsdWUoKTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZS5fcHVzaENvbnRleHQoKTtcbiAgICAgICAgdmFyIHJldCA9IHRyeUNhdGNoKGNhbGxiYWNrKS5jYWxsKHJlY2VpdmVyLCB2YWx1ZSwgaW5kZXgsIGxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3Byb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICAgICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHJldHVybiB0aGlzLl9yZWplY3QocmV0LmUpO1xuXG4gICAgICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHJldCwgdGhpcy5fcHJvbWlzZSk7XG4gICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICBtYXliZVByb21pc2UgPSBtYXliZVByb21pc2UuX3RhcmdldCgpO1xuICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZS5faXNQZW5kaW5nKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobGltaXQgPj0gMSkgdGhpcy5faW5GbGlnaHQrKztcbiAgICAgICAgICAgICAgICB2YWx1ZXNbaW5kZXhdID0gUEVORElORztcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF5YmVQcm9taXNlLl9wcm94eVByb21pc2VBcnJheSh0aGlzLCBpbmRleCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1heWJlUHJvbWlzZS5faXNGdWxmaWxsZWQoKSkge1xuICAgICAgICAgICAgICAgIHJldCA9IG1heWJlUHJvbWlzZS5fdmFsdWUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlamVjdChtYXliZVByb21pc2UuX3JlYXNvbigpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YWx1ZXNbaW5kZXhdID0gcmV0O1xuICAgIH1cbiAgICB2YXIgdG90YWxSZXNvbHZlZCA9ICsrdGhpcy5fdG90YWxSZXNvbHZlZDtcbiAgICBpZiAodG90YWxSZXNvbHZlZCA+PSBsZW5ndGgpIHtcbiAgICAgICAgaWYgKHByZXNlcnZlZFZhbHVlcyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5fZmlsdGVyKHZhbHVlcywgcHJlc2VydmVkVmFsdWVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmUodmFsdWVzKTtcbiAgICAgICAgfVxuXG4gICAgfVxufTtcblxuTWFwcGluZ1Byb21pc2VBcnJheS5wcm90b3R5cGUuX2RyYWluUXVldWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHF1ZXVlID0gdGhpcy5fcXVldWU7XG4gICAgdmFyIGxpbWl0ID0gdGhpcy5fbGltaXQ7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX3ZhbHVlcztcbiAgICB3aGlsZSAocXVldWUubGVuZ3RoID4gMCAmJiB0aGlzLl9pbkZsaWdodCA8IGxpbWl0KSB7XG4gICAgICAgIGlmICh0aGlzLl9pc1Jlc29sdmVkKCkpIHJldHVybjtcbiAgICAgICAgdmFyIGluZGV4ID0gcXVldWUucG9wKCk7XG4gICAgICAgIHRoaXMuX3Byb21pc2VGdWxmaWxsZWQodmFsdWVzW2luZGV4XSwgaW5kZXgpO1xuICAgIH1cbn07XG5cbk1hcHBpbmdQcm9taXNlQXJyYXkucHJvdG90eXBlLl9maWx0ZXIgPSBmdW5jdGlvbiAoYm9vbGVhbnMsIHZhbHVlcykge1xuICAgIHZhciBsZW4gPSB2YWx1ZXMubGVuZ3RoO1xuICAgIHZhciByZXQgPSBuZXcgQXJyYXkobGVuKTtcbiAgICB2YXIgaiA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICBpZiAoYm9vbGVhbnNbaV0pIHJldFtqKytdID0gdmFsdWVzW2ldO1xuICAgIH1cbiAgICByZXQubGVuZ3RoID0gajtcbiAgICB0aGlzLl9yZXNvbHZlKHJldCk7XG59O1xuXG5NYXBwaW5nUHJvbWlzZUFycmF5LnByb3RvdHlwZS5wcmVzZXJ2ZWRWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ByZXNlcnZlZFZhbHVlcztcbn07XG5cbmZ1bmN0aW9uIG1hcChwcm9taXNlcywgZm4sIG9wdGlvbnMsIF9maWx0ZXIpIHtcbiAgICB2YXIgbGltaXQgPSB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJvYmplY3RcIiAmJiBvcHRpb25zICE9PSBudWxsXG4gICAgICAgID8gb3B0aW9ucy5jb25jdXJyZW5jeVxuICAgICAgICA6IDA7XG4gICAgbGltaXQgPSB0eXBlb2YgbGltaXQgPT09IFwibnVtYmVyXCIgJiZcbiAgICAgICAgaXNGaW5pdGUobGltaXQpICYmIGxpbWl0ID49IDEgPyBsaW1pdCA6IDA7XG4gICAgcmV0dXJuIG5ldyBNYXBwaW5nUHJvbWlzZUFycmF5KHByb21pc2VzLCBmbiwgbGltaXQsIF9maWx0ZXIpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAoZm4sIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiBhcGlSZWplY3Rpb24oXCJmbiBtdXN0IGJlIGEgZnVuY3Rpb25cXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC85MTZsSkpcXHUwMDBhXCIpO1xuXG4gICAgcmV0dXJuIG1hcCh0aGlzLCBmbiwgb3B0aW9ucywgbnVsbCkucHJvbWlzZSgpO1xufTtcblxuUHJvbWlzZS5tYXAgPSBmdW5jdGlvbiAocHJvbWlzZXMsIGZuLCBvcHRpb25zLCBfZmlsdGVyKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZm4gbXVzdCBiZSBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvOTE2bEpKXFx1MDAwYVwiKTtcbiAgICByZXR1cm4gbWFwKHByb21pc2VzLCBmbiwgb3B0aW9ucywgX2ZpbHRlcikucHJvbWlzZSgpO1xufTtcblxuXG59O1xuXG59LHtcIi4vYXN5bmMuanNcIjoyLFwiLi91dGlsLmpzXCI6Mzh9XSwyMDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID1cbmZ1bmN0aW9uKFByb21pc2UsIElOVEVSTkFMLCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBhcGlSZWplY3Rpb24pIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbC5qc1wiKTtcbnZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG5cblByb21pc2UubWV0aG9kID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBQcm9taXNlLlR5cGVFcnJvcihcImZuIG11c3QgYmUgYSBmdW5jdGlvblxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsLzkxNmxKSlxcdTAwMGFcIik7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgICAgIHJldC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICAgICAgcmV0Ll9wdXNoQ29udGV4dCgpO1xuICAgICAgICB2YXIgdmFsdWUgPSB0cnlDYXRjaChmbikuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0Ll9wb3BDb250ZXh0KCk7XG4gICAgICAgIHJldC5fcmVzb2x2ZUZyb21TeW5jVmFsdWUodmFsdWUpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG59O1xuXG5Qcm9taXNlLmF0dGVtcHQgPSBQcm9taXNlW1widHJ5XCJdID0gZnVuY3Rpb24gKGZuLCBhcmdzLCBjdHgpIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgcmV0dXJuIGFwaVJlamVjdGlvbihcImZuIG11c3QgYmUgYSBmdW5jdGlvblxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsLzkxNmxKSlxcdTAwMGFcIik7XG4gICAgfVxuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgcmV0Ll9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgIHJldC5fcHVzaENvbnRleHQoKTtcbiAgICB2YXIgdmFsdWUgPSB1dGlsLmlzQXJyYXkoYXJncylcbiAgICAgICAgPyB0cnlDYXRjaChmbikuYXBwbHkoY3R4LCBhcmdzKVxuICAgICAgICA6IHRyeUNhdGNoKGZuKS5jYWxsKGN0eCwgYXJncyk7XG4gICAgcmV0Ll9wb3BDb250ZXh0KCk7XG4gICAgcmV0Ll9yZXNvbHZlRnJvbVN5bmNWYWx1ZSh2YWx1ZSk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZXNvbHZlRnJvbVN5bmNWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdXRpbC5lcnJvck9iaikge1xuICAgICAgICB0aGlzLl9yZWplY3RDYWxsYmFjayh2YWx1ZS5lLCBmYWxzZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrKHZhbHVlLCB0cnVlKTtcbiAgICB9XG59O1xufTtcblxufSx7XCIuL3V0aWwuanNcIjozOH1dLDIxOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWwuanNcIik7XG52YXIgYXN5bmMgPSBfZGVyZXFfKFwiLi9hc3luYy5qc1wiKTtcbnZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xuXG5mdW5jdGlvbiBzcHJlYWRBZGFwdGVyKHZhbCwgbm9kZWJhY2spIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG4gICAgaWYgKCF1dGlsLmlzQXJyYXkodmFsKSkgcmV0dXJuIHN1Y2Nlc3NBZGFwdGVyLmNhbGwocHJvbWlzZSwgdmFsLCBub2RlYmFjayk7XG4gICAgdmFyIHJldCA9XG4gICAgICAgIHRyeUNhdGNoKG5vZGViYWNrKS5hcHBseShwcm9taXNlLl9ib3VuZFZhbHVlKCksIFtudWxsXS5jb25jYXQodmFsKSk7XG4gICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgYXN5bmMudGhyb3dMYXRlcihyZXQuZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzdWNjZXNzQWRhcHRlcih2YWwsIG5vZGViYWNrKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHZhciByZWNlaXZlciA9IHByb21pc2UuX2JvdW5kVmFsdWUoKTtcbiAgICB2YXIgcmV0ID0gdmFsID09PSB1bmRlZmluZWRcbiAgICAgICAgPyB0cnlDYXRjaChub2RlYmFjaykuY2FsbChyZWNlaXZlciwgbnVsbClcbiAgICAgICAgOiB0cnlDYXRjaChub2RlYmFjaykuY2FsbChyZWNlaXZlciwgbnVsbCwgdmFsKTtcbiAgICBpZiAocmV0ID09PSBlcnJvck9iaikge1xuICAgICAgICBhc3luYy50aHJvd0xhdGVyKHJldC5lKTtcbiAgICB9XG59XG5mdW5jdGlvbiBlcnJvckFkYXB0ZXIocmVhc29uLCBub2RlYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICBpZiAoIXJlYXNvbikge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gcHJvbWlzZS5fdGFyZ2V0KCk7XG4gICAgICAgIHZhciBuZXdSZWFzb24gPSB0YXJnZXQuX2dldENhcnJpZWRTdGFja1RyYWNlKCk7XG4gICAgICAgIG5ld1JlYXNvbi5jYXVzZSA9IHJlYXNvbjtcbiAgICAgICAgcmVhc29uID0gbmV3UmVhc29uO1xuICAgIH1cbiAgICB2YXIgcmV0ID0gdHJ5Q2F0Y2gobm9kZWJhY2spLmNhbGwocHJvbWlzZS5fYm91bmRWYWx1ZSgpLCByZWFzb24pO1xuICAgIGlmIChyZXQgPT09IGVycm9yT2JqKSB7XG4gICAgICAgIGFzeW5jLnRocm93TGF0ZXIocmV0LmUpO1xuICAgIH1cbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuYXNDYWxsYmFjayA9XG5Qcm9taXNlLnByb3RvdHlwZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKG5vZGViYWNrLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBub2RlYmFjayA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdmFyIGFkYXB0ZXIgPSBzdWNjZXNzQWRhcHRlcjtcbiAgICAgICAgaWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCAmJiBPYmplY3Qob3B0aW9ucykuc3ByZWFkKSB7XG4gICAgICAgICAgICBhZGFwdGVyID0gc3ByZWFkQWRhcHRlcjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl90aGVuKFxuICAgICAgICAgICAgYWRhcHRlcixcbiAgICAgICAgICAgIGVycm9yQWRhcHRlcixcbiAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBub2RlYmFja1xuICAgICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG59O1xuXG59LHtcIi4vYXN5bmMuanNcIjoyLFwiLi91dGlsLmpzXCI6Mzh9XSwyMjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgUHJvbWlzZUFycmF5KSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWwuanNcIik7XG52YXIgYXN5bmMgPSBfZGVyZXFfKFwiLi9hc3luYy5qc1wiKTtcbnZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xuXG5Qcm9taXNlLnByb3RvdHlwZS5wcm9ncmVzc2VkID0gZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fdGhlbih1bmRlZmluZWQsIHVuZGVmaW5lZCwgaGFuZGxlciwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Byb2dyZXNzID0gZnVuY3Rpb24gKHByb2dyZXNzVmFsdWUpIHtcbiAgICBpZiAodGhpcy5faXNGb2xsb3dpbmdPckZ1bGZpbGxlZE9yUmVqZWN0ZWQoKSkgcmV0dXJuO1xuICAgIHRoaXMuX3RhcmdldCgpLl9wcm9ncmVzc1VuY2hlY2tlZChwcm9ncmVzc1ZhbHVlKTtcblxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Byb2dyZXNzSGFuZGxlckF0ID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgcmV0dXJuIGluZGV4ID09PSAwXG4gICAgICAgID8gdGhpcy5fcHJvZ3Jlc3NIYW5kbGVyMFxuICAgICAgICA6IHRoaXNbKGluZGV4IDw8IDIpICsgaW5kZXggLSA1ICsgMl07XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZG9Qcm9ncmVzc1dpdGggPSBmdW5jdGlvbiAocHJvZ3Jlc3Npb24pIHtcbiAgICB2YXIgcHJvZ3Jlc3NWYWx1ZSA9IHByb2dyZXNzaW9uLnZhbHVlO1xuICAgIHZhciBoYW5kbGVyID0gcHJvZ3Jlc3Npb24uaGFuZGxlcjtcbiAgICB2YXIgcHJvbWlzZSA9IHByb2dyZXNzaW9uLnByb21pc2U7XG4gICAgdmFyIHJlY2VpdmVyID0gcHJvZ3Jlc3Npb24ucmVjZWl2ZXI7XG5cbiAgICB2YXIgcmV0ID0gdHJ5Q2F0Y2goaGFuZGxlcikuY2FsbChyZWNlaXZlciwgcHJvZ3Jlc3NWYWx1ZSk7XG4gICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgaWYgKHJldC5lICE9IG51bGwgJiZcbiAgICAgICAgICAgIHJldC5lLm5hbWUgIT09IFwiU3RvcFByb2dyZXNzUHJvcGFnYXRpb25cIikge1xuICAgICAgICAgICAgdmFyIHRyYWNlID0gdXRpbC5jYW5BdHRhY2hUcmFjZShyZXQuZSlcbiAgICAgICAgICAgICAgICA/IHJldC5lIDogbmV3IEVycm9yKHV0aWwudG9TdHJpbmcocmV0LmUpKTtcbiAgICAgICAgICAgIHByb21pc2UuX2F0dGFjaEV4dHJhVHJhY2UodHJhY2UpO1xuICAgICAgICAgICAgcHJvbWlzZS5fcHJvZ3Jlc3MocmV0LmUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChyZXQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHJldC5fdGhlbihwcm9taXNlLl9wcm9ncmVzcywgbnVsbCwgbnVsbCwgcHJvbWlzZSwgdW5kZWZpbmVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwcm9taXNlLl9wcm9ncmVzcyhyZXQpO1xuICAgIH1cbn07XG5cblxuUHJvbWlzZS5wcm90b3R5cGUuX3Byb2dyZXNzVW5jaGVja2VkID0gZnVuY3Rpb24gKHByb2dyZXNzVmFsdWUpIHtcbiAgICB2YXIgbGVuID0gdGhpcy5fbGVuZ3RoKCk7XG4gICAgdmFyIHByb2dyZXNzID0gdGhpcy5fcHJvZ3Jlc3M7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgaGFuZGxlciA9IHRoaXMuX3Byb2dyZXNzSGFuZGxlckF0KGkpO1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHRoaXMuX3Byb21pc2VBdChpKTtcbiAgICAgICAgaWYgKCEocHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgICAgICB2YXIgcmVjZWl2ZXIgPSB0aGlzLl9yZWNlaXZlckF0KGkpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVyLmNhbGwocmVjZWl2ZXIsIHByb2dyZXNzVmFsdWUsIHByb21pc2UpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWNlaXZlciBpbnN0YW5jZW9mIFByb21pc2VBcnJheSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAhcmVjZWl2ZXIuX2lzUmVzb2x2ZWQoKSkge1xuICAgICAgICAgICAgICAgIHJlY2VpdmVyLl9wcm9taXNlUHJvZ3Jlc3NlZChwcm9ncmVzc1ZhbHVlLCBwcm9taXNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGFzeW5jLmludm9rZSh0aGlzLl9kb1Byb2dyZXNzV2l0aCwgdGhpcywge1xuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGhhbmRsZXIsXG4gICAgICAgICAgICAgICAgcHJvbWlzZTogcHJvbWlzZSxcbiAgICAgICAgICAgICAgICByZWNlaXZlcjogdGhpcy5fcmVjZWl2ZXJBdChpKSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogcHJvZ3Jlc3NWYWx1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhc3luYy5pbnZva2UocHJvZ3Jlc3MsIHByb21pc2UsIHByb2dyZXNzVmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxufTtcbn07XG5cbn0se1wiLi9hc3luYy5qc1wiOjIsXCIuL3V0aWwuanNcIjozOH1dLDIzOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbnZhciBtYWtlU2VsZlJlc29sdXRpb25FcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFR5cGVFcnJvcihcImNpcmN1bGFyIHByb21pc2UgcmVzb2x1dGlvbiBjaGFpblxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL0xoRnBvMFxcdTAwMGFcIik7XG59O1xudmFyIHJlZmxlY3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UuUHJvbWlzZUluc3BlY3Rpb24odGhpcy5fdGFyZ2V0KCkpO1xufTtcbnZhciBhcGlSZWplY3Rpb24gPSBmdW5jdGlvbihtc2cpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcihtc2cpKTtcbn07XG5cbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbC5qc1wiKTtcblxudmFyIGdldERvbWFpbjtcbmlmICh1dGlsLmlzTm9kZSkge1xuICAgIGdldERvbWFpbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmV0ID0gcHJvY2Vzcy5kb21haW47XG4gICAgICAgIGlmIChyZXQgPT09IHVuZGVmaW5lZCkgcmV0ID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xufSBlbHNlIHtcbiAgICBnZXREb21haW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcbn1cbnV0aWwubm90RW51bWVyYWJsZVByb3AoUHJvbWlzZSwgXCJfZ2V0RG9tYWluXCIsIGdldERvbWFpbik7XG5cbnZhciBhc3luYyA9IF9kZXJlcV8oXCIuL2FzeW5jLmpzXCIpO1xudmFyIGVycm9ycyA9IF9kZXJlcV8oXCIuL2Vycm9ycy5qc1wiKTtcbnZhciBUeXBlRXJyb3IgPSBQcm9taXNlLlR5cGVFcnJvciA9IGVycm9ycy5UeXBlRXJyb3I7XG5Qcm9taXNlLlJhbmdlRXJyb3IgPSBlcnJvcnMuUmFuZ2VFcnJvcjtcblByb21pc2UuQ2FuY2VsbGF0aW9uRXJyb3IgPSBlcnJvcnMuQ2FuY2VsbGF0aW9uRXJyb3I7XG5Qcm9taXNlLlRpbWVvdXRFcnJvciA9IGVycm9ycy5UaW1lb3V0RXJyb3I7XG5Qcm9taXNlLk9wZXJhdGlvbmFsRXJyb3IgPSBlcnJvcnMuT3BlcmF0aW9uYWxFcnJvcjtcblByb21pc2UuUmVqZWN0aW9uRXJyb3IgPSBlcnJvcnMuT3BlcmF0aW9uYWxFcnJvcjtcblByb21pc2UuQWdncmVnYXRlRXJyb3IgPSBlcnJvcnMuQWdncmVnYXRlRXJyb3I7XG52YXIgSU5URVJOQUwgPSBmdW5jdGlvbigpe307XG52YXIgQVBQTFkgPSB7fTtcbnZhciBORVhUX0ZJTFRFUiA9IHtlOiBudWxsfTtcbnZhciB0cnlDb252ZXJ0VG9Qcm9taXNlID0gX2RlcmVxXyhcIi4vdGhlbmFibGVzLmpzXCIpKFByb21pc2UsIElOVEVSTkFMKTtcbnZhciBQcm9taXNlQXJyYXkgPVxuICAgIF9kZXJlcV8oXCIuL3Byb21pc2VfYXJyYXkuanNcIikoUHJvbWlzZSwgSU5URVJOQUwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnlDb252ZXJ0VG9Qcm9taXNlLCBhcGlSZWplY3Rpb24pO1xudmFyIENhcHR1cmVkVHJhY2UgPSBfZGVyZXFfKFwiLi9jYXB0dXJlZF90cmFjZS5qc1wiKSgpO1xudmFyIGlzRGVidWdnaW5nID0gX2RlcmVxXyhcIi4vZGVidWdnYWJpbGl0eS5qc1wiKShQcm9taXNlLCBDYXB0dXJlZFRyYWNlKTtcbiAvKmpzaGludCB1bnVzZWQ6ZmFsc2UqL1xudmFyIGNyZWF0ZUNvbnRleHQgPVxuICAgIF9kZXJlcV8oXCIuL2NvbnRleHQuanNcIikoUHJvbWlzZSwgQ2FwdHVyZWRUcmFjZSwgaXNEZWJ1Z2dpbmcpO1xudmFyIENhdGNoRmlsdGVyID0gX2RlcmVxXyhcIi4vY2F0Y2hfZmlsdGVyLmpzXCIpKE5FWFRfRklMVEVSKTtcbnZhciBQcm9taXNlUmVzb2x2ZXIgPSBfZGVyZXFfKFwiLi9wcm9taXNlX3Jlc29sdmVyLmpzXCIpO1xudmFyIG5vZGViYWNrRm9yUHJvbWlzZSA9IFByb21pc2VSZXNvbHZlci5fbm9kZWJhY2tGb3JQcm9taXNlO1xudmFyIGVycm9yT2JqID0gdXRpbC5lcnJvck9iajtcbnZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG5mdW5jdGlvbiBQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgaWYgKHR5cGVvZiByZXNvbHZlciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJ0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvciByZXF1aXJlcyBhIHJlc29sdmVyIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvRUMyMlluXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY29uc3RydWN0b3IgIT09IFByb21pc2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInRoZSBwcm9taXNlIGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBpbnZva2VkIGRpcmVjdGx5XFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvS3NJbGdlXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgdGhpcy5fYml0RmllbGQgPSAwO1xuICAgIHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcjAgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fcmVqZWN0aW9uSGFuZGxlcjAgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fcHJvZ3Jlc3NIYW5kbGVyMCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9wcm9taXNlMCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9yZWNlaXZlcjAgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc2V0dGxlZFZhbHVlID0gdW5kZWZpbmVkO1xuICAgIGlmIChyZXNvbHZlciAhPT0gSU5URVJOQUwpIHRoaXMuX3Jlc29sdmVGcm9tUmVzb2x2ZXIocmVzb2x2ZXIpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gXCJbb2JqZWN0IFByb21pc2VdXCI7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5jYXVnaHQgPSBQcm9taXNlLnByb3RvdHlwZVtcImNhdGNoXCJdID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgaWYgKGxlbiA+IDEpIHtcbiAgICAgICAgdmFyIGNhdGNoSW5zdGFuY2VzID0gbmV3IEFycmF5KGxlbiAtIDEpLFxuICAgICAgICAgICAgaiA9IDAsIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW4gLSAxOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBjYXRjaEluc3RhbmNlc1tqKytdID0gaXRlbTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFxuICAgICAgICAgICAgICAgICAgICBuZXcgVHlwZUVycm9yKFwiQ2F0Y2ggZmlsdGVyIG11c3QgaW5oZXJpdCBmcm9tIEVycm9yIG9yIGJlIGEgc2ltcGxlIHByZWRpY2F0ZSBmdW5jdGlvblxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL284NG82OFxcdTAwMGFcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoSW5zdGFuY2VzLmxlbmd0aCA9IGo7XG4gICAgICAgIGZuID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB2YXIgY2F0Y2hGaWx0ZXIgPSBuZXcgQ2F0Y2hGaWx0ZXIoY2F0Y2hJbnN0YW5jZXMsIGZuLCB0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RoZW4odW5kZWZpbmVkLCBjYXRjaEZpbHRlci5kb0ZpbHRlciwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgY2F0Y2hGaWx0ZXIsIHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl90aGVuKHVuZGVmaW5lZCwgZm4sIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUucmVmbGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGhlbihyZWZsZWN0LCByZWZsZWN0LCB1bmRlZmluZWQsIHRoaXMsIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKGRpZEZ1bGZpbGwsIGRpZFJlamVjdCwgZGlkUHJvZ3Jlc3MpIHtcbiAgICBpZiAoaXNEZWJ1Z2dpbmcoKSAmJiBhcmd1bWVudHMubGVuZ3RoID4gMCAmJlxuICAgICAgICB0eXBlb2YgZGlkRnVsZmlsbCAhPT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgIHR5cGVvZiBkaWRSZWplY3QgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB2YXIgbXNnID0gXCIudGhlbigpIG9ubHkgYWNjZXB0cyBmdW5jdGlvbnMgYnV0IHdhcyBwYXNzZWQ6IFwiICtcbiAgICAgICAgICAgICAgICB1dGlsLmNsYXNzU3RyaW5nKGRpZEZ1bGZpbGwpO1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIG1zZyArPSBcIiwgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKGRpZFJlamVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fd2Fybihtc2cpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdGhlbihkaWRGdWxmaWxsLCBkaWRSZWplY3QsIGRpZFByb2dyZXNzLFxuICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gKGRpZEZ1bGZpbGwsIGRpZFJlamVjdCwgZGlkUHJvZ3Jlc3MpIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXMuX3RoZW4oZGlkRnVsZmlsbCwgZGlkUmVqZWN0LCBkaWRQcm9ncmVzcyxcbiAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuICAgIHByb21pc2UuX3NldElzRmluYWwoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnNwcmVhZCA9IGZ1bmN0aW9uIChkaWRGdWxmaWxsLCBkaWRSZWplY3QpIHtcbiAgICByZXR1cm4gdGhpcy5hbGwoKS5fdGhlbihkaWRGdWxmaWxsLCBkaWRSZWplY3QsIHVuZGVmaW5lZCwgQVBQTFksIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5pc0NhbmNlbGxhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5pc1Jlc29sdmVkKCkgJiZcbiAgICAgICAgdGhpcy5fY2FuY2VsbGFibGUoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV0ID0ge1xuICAgICAgICBpc0Z1bGZpbGxlZDogZmFsc2UsXG4gICAgICAgIGlzUmVqZWN0ZWQ6IGZhbHNlLFxuICAgICAgICBmdWxmaWxsbWVudFZhbHVlOiB1bmRlZmluZWQsXG4gICAgICAgIHJlamVjdGlvblJlYXNvbjogdW5kZWZpbmVkXG4gICAgfTtcbiAgICBpZiAodGhpcy5pc0Z1bGZpbGxlZCgpKSB7XG4gICAgICAgIHJldC5mdWxmaWxsbWVudFZhbHVlID0gdGhpcy52YWx1ZSgpO1xuICAgICAgICByZXQuaXNGdWxmaWxsZWQgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc1JlamVjdGVkKCkpIHtcbiAgICAgICAgcmV0LnJlamVjdGlvblJlYXNvbiA9IHRoaXMucmVhc29uKCk7XG4gICAgICAgIHJldC5pc1JlamVjdGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2VBcnJheSh0aGlzKS5wcm9taXNlKCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiB0aGlzLmNhdWdodCh1dGlsLm9yaWdpbmF0ZXNGcm9tUmVqZWN0aW9uLCBmbik7XG59O1xuXG5Qcm9taXNlLmlzID0gZnVuY3Rpb24gKHZhbCkge1xuICAgIHJldHVybiB2YWwgaW5zdGFuY2VvZiBQcm9taXNlO1xufTtcblxuUHJvbWlzZS5mcm9tTm9kZSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICB2YXIgcmVzdWx0ID0gdHJ5Q2F0Y2goZm4pKG5vZGViYWNrRm9yUHJvbWlzZShyZXQpKTtcbiAgICBpZiAocmVzdWx0ID09PSBlcnJvck9iaikge1xuICAgICAgICByZXQuX3JlamVjdENhbGxiYWNrKHJlc3VsdC5lLCB0cnVlLCB0cnVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UuYWxsID0gZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlQXJyYXkocHJvbWlzZXMpLnByb21pc2UoKTtcbn07XG5cblByb21pc2UuZGVmZXIgPSBQcm9taXNlLnBlbmRpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlUmVzb2x2ZXIocHJvbWlzZSk7XG59O1xuXG5Qcm9taXNlLmNhc3QgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIHJldCA9IHRyeUNvbnZlcnRUb1Byb21pc2Uob2JqKTtcbiAgICBpZiAoIShyZXQgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgICAgICB2YXIgdmFsID0gcmV0O1xuICAgICAgICByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgICAgIHJldC5fZnVsZmlsbFVuY2hlY2tlZCh2YWwpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5yZXNvbHZlID0gUHJvbWlzZS5mdWxmaWxsZWQgPSBQcm9taXNlLmNhc3Q7XG5cblByb21pc2UucmVqZWN0ID0gUHJvbWlzZS5yZWplY3RlZCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIHJldC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICByZXQuX3JlamVjdENhbGxiYWNrKHJlYXNvbiwgdHJ1ZSk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2Uuc2V0U2NoZWR1bGVyID0gZnVuY3Rpb24oZm4pIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJmbiBtdXN0IGJlIGEgZnVuY3Rpb25cXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC85MTZsSkpcXHUwMDBhXCIpO1xuICAgIHZhciBwcmV2ID0gYXN5bmMuX3NjaGVkdWxlO1xuICAgIGFzeW5jLl9zY2hlZHVsZSA9IGZuO1xuICAgIHJldHVybiBwcmV2O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3RoZW4gPSBmdW5jdGlvbiAoXG4gICAgZGlkRnVsZmlsbCxcbiAgICBkaWRSZWplY3QsXG4gICAgZGlkUHJvZ3Jlc3MsXG4gICAgcmVjZWl2ZXIsXG4gICAgaW50ZXJuYWxEYXRhXG4pIHtcbiAgICB2YXIgaGF2ZUludGVybmFsRGF0YSA9IGludGVybmFsRGF0YSAhPT0gdW5kZWZpbmVkO1xuICAgIHZhciByZXQgPSBoYXZlSW50ZXJuYWxEYXRhID8gaW50ZXJuYWxEYXRhIDogbmV3IFByb21pc2UoSU5URVJOQUwpO1xuXG4gICAgaWYgKCFoYXZlSW50ZXJuYWxEYXRhKSB7XG4gICAgICAgIHJldC5fcHJvcGFnYXRlRnJvbSh0aGlzLCA0IHwgMSk7XG4gICAgICAgIHJldC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICB9XG5cbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0KCk7XG4gICAgaWYgKHRhcmdldCAhPT0gdGhpcykge1xuICAgICAgICBpZiAocmVjZWl2ZXIgPT09IHVuZGVmaW5lZCkgcmVjZWl2ZXIgPSB0aGlzLl9ib3VuZFRvO1xuICAgICAgICBpZiAoIWhhdmVJbnRlcm5hbERhdGEpIHJldC5fc2V0SXNNaWdyYXRlZCgpO1xuICAgIH1cblxuICAgIHZhciBjYWxsYmFja0luZGV4ID0gdGFyZ2V0Ll9hZGRDYWxsYmFja3MoZGlkRnVsZmlsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZFJlamVjdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZFByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXREb21haW4oKSk7XG5cbiAgICBpZiAodGFyZ2V0Ll9pc1Jlc29sdmVkKCkgJiYgIXRhcmdldC5faXNTZXR0bGVQcm9taXNlc1F1ZXVlZCgpKSB7XG4gICAgICAgIGFzeW5jLmludm9rZShcbiAgICAgICAgICAgIHRhcmdldC5fc2V0dGxlUHJvbWlzZUF0UG9zdFJlc29sdXRpb24sIHRhcmdldCwgY2FsbGJhY2tJbmRleCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXR0bGVQcm9taXNlQXRQb3N0UmVzb2x1dGlvbiA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIGlmICh0aGlzLl9pc1JlamVjdGlvblVuaGFuZGxlZCgpKSB0aGlzLl91bnNldFJlamVjdGlvbklzVW5oYW5kbGVkKCk7XG4gICAgdGhpcy5fc2V0dGxlUHJvbWlzZUF0KGluZGV4KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9sZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2JpdEZpZWxkICYgMTMxMDcxO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzRm9sbG93aW5nT3JGdWxmaWxsZWRPclJlamVjdGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiA5Mzk1MjQwOTYpID4gMDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9pc0ZvbGxvd2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgNTM2ODcwOTEyKSA9PT0gNTM2ODcwOTEyO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldExlbmd0aCA9IGZ1bmN0aW9uIChsZW4pIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9ICh0aGlzLl9iaXRGaWVsZCAmIC0xMzEwNzIpIHxcbiAgICAgICAgKGxlbiAmIDEzMTA3MSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0RnVsZmlsbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCAyNjg0MzU0NTY7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0UmVqZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDEzNDIxNzcyODtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRGb2xsb3dpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDUzNjg3MDkxMjtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRJc0ZpbmFsID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCAzMzU1NDQzMjtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9pc0ZpbmFsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiAzMzU1NDQzMikgPiAwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2NhbmNlbGxhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiA2NzEwODg2NCkgPiAwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldENhbmNlbGxhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCA2NzEwODg2NDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl91bnNldENhbmNlbGxhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgJiAofjY3MTA4ODY0KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRJc01pZ3JhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCA0MTk0MzA0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Vuc2V0SXNNaWdyYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkICYgKH40MTk0MzA0KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9pc01pZ3JhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiA0MTk0MzA0KSA+IDA7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVjZWl2ZXJBdCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIHZhciByZXQgPSBpbmRleCA9PT0gMFxuICAgICAgICA/IHRoaXMuX3JlY2VpdmVyMFxuICAgICAgICA6IHRoaXNbXG4gICAgICAgICAgICBpbmRleCAqIDUgLSA1ICsgNF07XG4gICAgaWYgKHJldCA9PT0gdW5kZWZpbmVkICYmIHRoaXMuX2lzQm91bmQoKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYm91bmRWYWx1ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Byb21pc2VBdCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIHJldHVybiBpbmRleCA9PT0gMFxuICAgICAgICA/IHRoaXMuX3Byb21pc2UwXG4gICAgICAgIDogdGhpc1tpbmRleCAqIDUgLSA1ICsgM107XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZnVsZmlsbG1lbnRIYW5kbGVyQXQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICByZXR1cm4gaW5kZXggPT09IDBcbiAgICAgICAgPyB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXIwXG4gICAgICAgIDogdGhpc1tpbmRleCAqIDUgLSA1ICsgMF07XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVqZWN0aW9uSGFuZGxlckF0ID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgcmV0dXJuIGluZGV4ID09PSAwXG4gICAgICAgID8gdGhpcy5fcmVqZWN0aW9uSGFuZGxlcjBcbiAgICAgICAgOiB0aGlzW2luZGV4ICogNSAtIDUgKyAxXTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9ib3VuZFZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJldCA9IHRoaXMuX2JvdW5kVG87XG4gICAgaWYgKHJldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChyZXQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICBpZiAocmV0LmlzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0LnZhbHVlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9taWdyYXRlQ2FsbGJhY2tzID0gZnVuY3Rpb24gKGZvbGxvd2VyLCBpbmRleCkge1xuICAgIHZhciBmdWxmaWxsID0gZm9sbG93ZXIuX2Z1bGZpbGxtZW50SGFuZGxlckF0KGluZGV4KTtcbiAgICB2YXIgcmVqZWN0ID0gZm9sbG93ZXIuX3JlamVjdGlvbkhhbmRsZXJBdChpbmRleCk7XG4gICAgdmFyIHByb2dyZXNzID0gZm9sbG93ZXIuX3Byb2dyZXNzSGFuZGxlckF0KGluZGV4KTtcbiAgICB2YXIgcHJvbWlzZSA9IGZvbGxvd2VyLl9wcm9taXNlQXQoaW5kZXgpO1xuICAgIHZhciByZWNlaXZlciA9IGZvbGxvd2VyLl9yZWNlaXZlckF0KGluZGV4KTtcbiAgICBpZiAocHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHByb21pc2UuX3NldElzTWlncmF0ZWQoKTtcbiAgICB0aGlzLl9hZGRDYWxsYmFja3MoZnVsZmlsbCwgcmVqZWN0LCBwcm9ncmVzcywgcHJvbWlzZSwgcmVjZWl2ZXIsIG51bGwpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2FkZENhbGxiYWNrcyA9IGZ1bmN0aW9uIChcbiAgICBmdWxmaWxsLFxuICAgIHJlamVjdCxcbiAgICBwcm9ncmVzcyxcbiAgICBwcm9taXNlLFxuICAgIHJlY2VpdmVyLFxuICAgIGRvbWFpblxuKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fbGVuZ3RoKCk7XG5cbiAgICBpZiAoaW5kZXggPj0gMTMxMDcxIC0gNSkge1xuICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX3NldExlbmd0aCgwKTtcbiAgICB9XG5cbiAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgdGhpcy5fcHJvbWlzZTAgPSBwcm9taXNlO1xuICAgICAgICBpZiAocmVjZWl2ZXIgIT09IHVuZGVmaW5lZCkgdGhpcy5fcmVjZWl2ZXIwID0gcmVjZWl2ZXI7XG4gICAgICAgIGlmICh0eXBlb2YgZnVsZmlsbCA9PT0gXCJmdW5jdGlvblwiICYmICF0aGlzLl9pc0NhcnJ5aW5nU3RhY2tUcmFjZSgpKSB7XG4gICAgICAgICAgICB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXIwID1cbiAgICAgICAgICAgICAgICBkb21haW4gPT09IG51bGwgPyBmdWxmaWxsIDogZG9tYWluLmJpbmQoZnVsZmlsbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiByZWplY3QgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhpcy5fcmVqZWN0aW9uSGFuZGxlcjAgPVxuICAgICAgICAgICAgICAgIGRvbWFpbiA9PT0gbnVsbCA/IHJlamVjdCA6IGRvbWFpbi5iaW5kKHJlamVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBwcm9ncmVzcyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aGlzLl9wcm9ncmVzc0hhbmRsZXIwID1cbiAgICAgICAgICAgICAgICBkb21haW4gPT09IG51bGwgPyBwcm9ncmVzcyA6IGRvbWFpbi5iaW5kKHByb2dyZXNzKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBiYXNlID0gaW5kZXggKiA1IC0gNTtcbiAgICAgICAgdGhpc1tiYXNlICsgM10gPSBwcm9taXNlO1xuICAgICAgICB0aGlzW2Jhc2UgKyA0XSA9IHJlY2VpdmVyO1xuICAgICAgICBpZiAodHlwZW9mIGZ1bGZpbGwgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhpc1tiYXNlICsgMF0gPVxuICAgICAgICAgICAgICAgIGRvbWFpbiA9PT0gbnVsbCA/IGZ1bGZpbGwgOiBkb21haW4uYmluZChmdWxmaWxsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHJlamVjdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aGlzW2Jhc2UgKyAxXSA9XG4gICAgICAgICAgICAgICAgZG9tYWluID09PSBudWxsID8gcmVqZWN0IDogZG9tYWluLmJpbmQocmVqZWN0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHByb2dyZXNzID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRoaXNbYmFzZSArIDJdID1cbiAgICAgICAgICAgICAgICBkb21haW4gPT09IG51bGwgPyBwcm9ncmVzcyA6IGRvbWFpbi5iaW5kKHByb2dyZXNzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9zZXRMZW5ndGgoaW5kZXggKyAxKTtcbiAgICByZXR1cm4gaW5kZXg7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0UHJveHlIYW5kbGVycyA9IGZ1bmN0aW9uIChyZWNlaXZlciwgcHJvbWlzZVNsb3RWYWx1ZSkge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX2xlbmd0aCgpO1xuXG4gICAgaWYgKGluZGV4ID49IDEzMTA3MSAtIDUpIHtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICB0aGlzLl9zZXRMZW5ndGgoMCk7XG4gICAgfVxuICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICB0aGlzLl9wcm9taXNlMCA9IHByb21pc2VTbG90VmFsdWU7XG4gICAgICAgIHRoaXMuX3JlY2VpdmVyMCA9IHJlY2VpdmVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBiYXNlID0gaW5kZXggKiA1IC0gNTtcbiAgICAgICAgdGhpc1tiYXNlICsgM10gPSBwcm9taXNlU2xvdFZhbHVlO1xuICAgICAgICB0aGlzW2Jhc2UgKyA0XSA9IHJlY2VpdmVyO1xuICAgIH1cbiAgICB0aGlzLl9zZXRMZW5ndGgoaW5kZXggKyAxKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9wcm94eVByb21pc2VBcnJheSA9IGZ1bmN0aW9uIChwcm9taXNlQXJyYXksIGluZGV4KSB7XG4gICAgdGhpcy5fc2V0UHJveHlIYW5kbGVycyhwcm9taXNlQXJyYXksIGluZGV4KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZXNvbHZlQ2FsbGJhY2sgPSBmdW5jdGlvbih2YWx1ZSwgc2hvdWxkQmluZCkge1xuICAgIGlmICh0aGlzLl9pc0ZvbGxvd2luZ09yRnVsZmlsbGVkT3JSZWplY3RlZCgpKSByZXR1cm47XG4gICAgaWYgKHZhbHVlID09PSB0aGlzKVxuICAgICAgICByZXR1cm4gdGhpcy5fcmVqZWN0Q2FsbGJhY2sobWFrZVNlbGZSZXNvbHV0aW9uRXJyb3IoKSwgZmFsc2UsIHRydWUpO1xuICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHZhbHVlLCB0aGlzKTtcbiAgICBpZiAoIShtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSkgcmV0dXJuIHRoaXMuX2Z1bGZpbGwodmFsdWUpO1xuXG4gICAgdmFyIHByb3BhZ2F0aW9uRmxhZ3MgPSAxIHwgKHNob3VsZEJpbmQgPyA0IDogMCk7XG4gICAgdGhpcy5fcHJvcGFnYXRlRnJvbShtYXliZVByb21pc2UsIHByb3BhZ2F0aW9uRmxhZ3MpO1xuICAgIHZhciBwcm9taXNlID0gbWF5YmVQcm9taXNlLl90YXJnZXQoKTtcbiAgICBpZiAocHJvbWlzZS5faXNQZW5kaW5nKCkpIHtcbiAgICAgICAgdmFyIGxlbiA9IHRoaXMuX2xlbmd0aCgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICBwcm9taXNlLl9taWdyYXRlQ2FsbGJhY2tzKHRoaXMsIGkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3NldEZvbGxvd2luZygpO1xuICAgICAgICB0aGlzLl9zZXRMZW5ndGgoMCk7XG4gICAgICAgIHRoaXMuX3NldEZvbGxvd2VlKHByb21pc2UpO1xuICAgIH0gZWxzZSBpZiAocHJvbWlzZS5faXNGdWxmaWxsZWQoKSkge1xuICAgICAgICB0aGlzLl9mdWxmaWxsVW5jaGVja2VkKHByb21pc2UuX3ZhbHVlKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3JlamVjdFVuY2hlY2tlZChwcm9taXNlLl9yZWFzb24oKSxcbiAgICAgICAgICAgIHByb21pc2UuX2dldENhcnJpZWRTdGFja1RyYWNlKCkpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZWplY3RDYWxsYmFjayA9XG5mdW5jdGlvbihyZWFzb24sIHN5bmNocm9ub3VzLCBzaG91bGROb3RNYXJrT3JpZ2luYXRpbmdGcm9tUmVqZWN0aW9uKSB7XG4gICAgaWYgKCFzaG91bGROb3RNYXJrT3JpZ2luYXRpbmdGcm9tUmVqZWN0aW9uKSB7XG4gICAgICAgIHV0aWwubWFya0FzT3JpZ2luYXRpbmdGcm9tUmVqZWN0aW9uKHJlYXNvbik7XG4gICAgfVxuICAgIHZhciB0cmFjZSA9IHV0aWwuZW5zdXJlRXJyb3JPYmplY3QocmVhc29uKTtcbiAgICB2YXIgaGFzU3RhY2sgPSB0cmFjZSA9PT0gcmVhc29uO1xuICAgIHRoaXMuX2F0dGFjaEV4dHJhVHJhY2UodHJhY2UsIHN5bmNocm9ub3VzID8gaGFzU3RhY2sgOiBmYWxzZSk7XG4gICAgdGhpcy5fcmVqZWN0KHJlYXNvbiwgaGFzU3RhY2sgPyB1bmRlZmluZWQgOiB0cmFjZSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVzb2x2ZUZyb21SZXNvbHZlciA9IGZ1bmN0aW9uIChyZXNvbHZlcikge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB0aGlzLl9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgIHRoaXMuX3B1c2hDb250ZXh0KCk7XG4gICAgdmFyIHN5bmNocm9ub3VzID0gdHJ1ZTtcbiAgICB2YXIgciA9IHRyeUNhdGNoKHJlc29sdmVyKShmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZiAocHJvbWlzZSA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICBwcm9taXNlLl9yZXNvbHZlQ2FsbGJhY2sodmFsdWUpO1xuICAgICAgICBwcm9taXNlID0gbnVsbDtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIGlmIChwcm9taXNlID09PSBudWxsKSByZXR1cm47XG4gICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKHJlYXNvbiwgc3luY2hyb25vdXMpO1xuICAgICAgICBwcm9taXNlID0gbnVsbDtcbiAgICB9KTtcbiAgICBzeW5jaHJvbm91cyA9IGZhbHNlO1xuICAgIHRoaXMuX3BvcENvbnRleHQoKTtcblxuICAgIGlmIChyICE9PSB1bmRlZmluZWQgJiYgciA9PT0gZXJyb3JPYmogJiYgcHJvbWlzZSAhPT0gbnVsbCkge1xuICAgICAgICBwcm9taXNlLl9yZWplY3RDYWxsYmFjayhyLmUsIHRydWUsIHRydWUpO1xuICAgICAgICBwcm9taXNlID0gbnVsbDtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0dGxlUHJvbWlzZUZyb21IYW5kbGVyID0gZnVuY3Rpb24gKFxuICAgIGhhbmRsZXIsIHJlY2VpdmVyLCB2YWx1ZSwgcHJvbWlzZVxuKSB7XG4gICAgaWYgKHByb21pc2UuX2lzUmVqZWN0ZWQoKSkgcmV0dXJuO1xuICAgIHByb21pc2UuX3B1c2hDb250ZXh0KCk7XG4gICAgdmFyIHg7XG4gICAgaWYgKHJlY2VpdmVyID09PSBBUFBMWSAmJiAhdGhpcy5faXNSZWplY3RlZCgpKSB7XG4gICAgICAgIHggPSB0cnlDYXRjaChoYW5kbGVyKS5hcHBseSh0aGlzLl9ib3VuZFZhbHVlKCksIHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB4ID0gdHJ5Q2F0Y2goaGFuZGxlcikuY2FsbChyZWNlaXZlciwgdmFsdWUpO1xuICAgIH1cbiAgICBwcm9taXNlLl9wb3BDb250ZXh0KCk7XG5cbiAgICBpZiAoeCA9PT0gZXJyb3JPYmogfHwgeCA9PT0gcHJvbWlzZSB8fCB4ID09PSBORVhUX0ZJTFRFUikge1xuICAgICAgICB2YXIgZXJyID0geCA9PT0gcHJvbWlzZSA/IG1ha2VTZWxmUmVzb2x1dGlvbkVycm9yKCkgOiB4LmU7XG4gICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKGVyciwgZmFsc2UsIHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHByb21pc2UuX3Jlc29sdmVDYWxsYmFjayh4KTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fdGFyZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJldCA9IHRoaXM7XG4gICAgd2hpbGUgKHJldC5faXNGb2xsb3dpbmcoKSkgcmV0ID0gcmV0Ll9mb2xsb3dlZSgpO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZm9sbG93ZWUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVqZWN0aW9uSGFuZGxlcjA7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0Rm9sbG93ZWUgPSBmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgdGhpcy5fcmVqZWN0aW9uSGFuZGxlcjAgPSBwcm9taXNlO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2NsZWFuVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9jYW5jZWxsYWJsZSgpKSB7XG4gICAgICAgIHRoaXMuX2NhbmNlbGxhdGlvblBhcmVudCA9IHVuZGVmaW5lZDtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcHJvcGFnYXRlRnJvbSA9IGZ1bmN0aW9uIChwYXJlbnQsIGZsYWdzKSB7XG4gICAgaWYgKChmbGFncyAmIDEpID4gMCAmJiBwYXJlbnQuX2NhbmNlbGxhYmxlKCkpIHtcbiAgICAgICAgdGhpcy5fc2V0Q2FuY2VsbGFibGUoKTtcbiAgICAgICAgdGhpcy5fY2FuY2VsbGF0aW9uUGFyZW50ID0gcGFyZW50O1xuICAgIH1cbiAgICBpZiAoKGZsYWdzICYgNCkgPiAwICYmIHBhcmVudC5faXNCb3VuZCgpKSB7XG4gICAgICAgIHRoaXMuX3NldEJvdW5kVG8ocGFyZW50Ll9ib3VuZFRvKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZnVsZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh0aGlzLl9pc0ZvbGxvd2luZ09yRnVsZmlsbGVkT3JSZWplY3RlZCgpKSByZXR1cm47XG4gICAgdGhpcy5fZnVsZmlsbFVuY2hlY2tlZCh2YWx1ZSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbiwgY2FycmllZFN0YWNrVHJhY2UpIHtcbiAgICBpZiAodGhpcy5faXNGb2xsb3dpbmdPckZ1bGZpbGxlZE9yUmVqZWN0ZWQoKSkgcmV0dXJuO1xuICAgIHRoaXMuX3JlamVjdFVuY2hlY2tlZChyZWFzb24sIGNhcnJpZWRTdGFja1RyYWNlKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXR0bGVQcm9taXNlQXQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXMuX3Byb21pc2VBdChpbmRleCk7XG4gICAgdmFyIGlzUHJvbWlzZSA9IHByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlO1xuXG4gICAgaWYgKGlzUHJvbWlzZSAmJiBwcm9taXNlLl9pc01pZ3JhdGVkKCkpIHtcbiAgICAgICAgcHJvbWlzZS5fdW5zZXRJc01pZ3JhdGVkKCk7XG4gICAgICAgIHJldHVybiBhc3luYy5pbnZva2UodGhpcy5fc2V0dGxlUHJvbWlzZUF0LCB0aGlzLCBpbmRleCk7XG4gICAgfVxuICAgIHZhciBoYW5kbGVyID0gdGhpcy5faXNGdWxmaWxsZWQoKVxuICAgICAgICA/IHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlckF0KGluZGV4KVxuICAgICAgICA6IHRoaXMuX3JlamVjdGlvbkhhbmRsZXJBdChpbmRleCk7XG5cbiAgICB2YXIgY2FycmllZFN0YWNrVHJhY2UgPVxuICAgICAgICB0aGlzLl9pc0NhcnJ5aW5nU3RhY2tUcmFjZSgpID8gdGhpcy5fZ2V0Q2FycmllZFN0YWNrVHJhY2UoKSA6IHVuZGVmaW5lZDtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9zZXR0bGVkVmFsdWU7XG4gICAgdmFyIHJlY2VpdmVyID0gdGhpcy5fcmVjZWl2ZXJBdChpbmRleCk7XG4gICAgdGhpcy5fY2xlYXJDYWxsYmFja0RhdGFBdEluZGV4KGluZGV4KTtcblxuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGlmICghaXNQcm9taXNlKSB7XG4gICAgICAgICAgICBoYW5kbGVyLmNhbGwocmVjZWl2ZXIsIHZhbHVlLCBwcm9taXNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NldHRsZVByb21pc2VGcm9tSGFuZGxlcihoYW5kbGVyLCByZWNlaXZlciwgdmFsdWUsIHByb21pc2UpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWNlaXZlciBpbnN0YW5jZW9mIFByb21pc2VBcnJheSkge1xuICAgICAgICBpZiAoIXJlY2VpdmVyLl9pc1Jlc29sdmVkKCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0Z1bGZpbGxlZCgpKSB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZXIuX3Byb21pc2VGdWxmaWxsZWQodmFsdWUsIHByb21pc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZXIuX3Byb21pc2VSZWplY3RlZCh2YWx1ZSwgcHJvbWlzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzUHJvbWlzZSkge1xuICAgICAgICBpZiAodGhpcy5faXNGdWxmaWxsZWQoKSkge1xuICAgICAgICAgICAgcHJvbWlzZS5fZnVsZmlsbCh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9taXNlLl9yZWplY3QodmFsdWUsIGNhcnJpZWRTdGFja1RyYWNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpbmRleCA+PSA0ICYmIChpbmRleCAmIDMxKSA9PT0gNClcbiAgICAgICAgYXN5bmMuaW52b2tlTGF0ZXIodGhpcy5fc2V0TGVuZ3RoLCB0aGlzLCAwKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9jbGVhckNhbGxiYWNrRGF0YUF0SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICBpZiAoIXRoaXMuX2lzQ2FycnlpbmdTdGFja1RyYWNlKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcjAgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcmVqZWN0aW9uSGFuZGxlcjAgPVxuICAgICAgICB0aGlzLl9wcm9ncmVzc0hhbmRsZXIwID1cbiAgICAgICAgdGhpcy5fcmVjZWl2ZXIwID1cbiAgICAgICAgdGhpcy5fcHJvbWlzZTAgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGJhc2UgPSBpbmRleCAqIDUgLSA1O1xuICAgICAgICB0aGlzW2Jhc2UgKyAzXSA9XG4gICAgICAgIHRoaXNbYmFzZSArIDRdID1cbiAgICAgICAgdGhpc1tiYXNlICsgMF0gPVxuICAgICAgICB0aGlzW2Jhc2UgKyAxXSA9XG4gICAgICAgIHRoaXNbYmFzZSArIDJdID0gdW5kZWZpbmVkO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9pc1NldHRsZVByb21pc2VzUXVldWVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJlxuICAgICAgICAgICAgLTEwNzM3NDE4MjQpID09PSAtMTA3Mzc0MTgyNDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRTZXR0bGVQcm9taXNlc1F1ZXVlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgLTEwNzM3NDE4MjQ7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fdW5zZXRTZXR0bGVQcm9taXNlc1F1ZXVlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkICYgKH4tMTA3Mzc0MTgyNCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcXVldWVTZXR0bGVQcm9taXNlcyA9IGZ1bmN0aW9uKCkge1xuICAgIGFzeW5jLnNldHRsZVByb21pc2VzKHRoaXMpO1xuICAgIHRoaXMuX3NldFNldHRsZVByb21pc2VzUXVldWVkKCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZnVsZmlsbFVuY2hlY2tlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdGhpcykge1xuICAgICAgICB2YXIgZXJyID0gbWFrZVNlbGZSZXNvbHV0aW9uRXJyb3IoKTtcbiAgICAgICAgdGhpcy5fYXR0YWNoRXh0cmFUcmFjZShlcnIpO1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVqZWN0VW5jaGVja2VkKGVyciwgdW5kZWZpbmVkKTtcbiAgICB9XG4gICAgdGhpcy5fc2V0RnVsZmlsbGVkKCk7XG4gICAgdGhpcy5fc2V0dGxlZFZhbHVlID0gdmFsdWU7XG4gICAgdGhpcy5fY2xlYW5WYWx1ZXMoKTtcblxuICAgIGlmICh0aGlzLl9sZW5ndGgoKSA+IDApIHtcbiAgICAgICAgdGhpcy5fcXVldWVTZXR0bGVQcm9taXNlcygpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZWplY3RVbmNoZWNrZWRDaGVja0Vycm9yID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHZhciB0cmFjZSA9IHV0aWwuZW5zdXJlRXJyb3JPYmplY3QocmVhc29uKTtcbiAgICB0aGlzLl9yZWplY3RVbmNoZWNrZWQocmVhc29uLCB0cmFjZSA9PT0gcmVhc29uID8gdW5kZWZpbmVkIDogdHJhY2UpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3JlamVjdFVuY2hlY2tlZCA9IGZ1bmN0aW9uIChyZWFzb24sIHRyYWNlKSB7XG4gICAgaWYgKHJlYXNvbiA9PT0gdGhpcykge1xuICAgICAgICB2YXIgZXJyID0gbWFrZVNlbGZSZXNvbHV0aW9uRXJyb3IoKTtcbiAgICAgICAgdGhpcy5fYXR0YWNoRXh0cmFUcmFjZShlcnIpO1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVqZWN0VW5jaGVja2VkKGVycik7XG4gICAgfVxuICAgIHRoaXMuX3NldFJlamVjdGVkKCk7XG4gICAgdGhpcy5fc2V0dGxlZFZhbHVlID0gcmVhc29uO1xuICAgIHRoaXMuX2NsZWFuVmFsdWVzKCk7XG5cbiAgICBpZiAodGhpcy5faXNGaW5hbCgpKSB7XG4gICAgICAgIGFzeW5jLnRocm93TGF0ZXIoZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKFwic3RhY2tcIiBpbiBlKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuaW52b2tlRmlyc3QoXG4gICAgICAgICAgICAgICAgICAgIENhcHR1cmVkVHJhY2UudW5oYW5kbGVkUmVqZWN0aW9uLCB1bmRlZmluZWQsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSwgdHJhY2UgPT09IHVuZGVmaW5lZCA/IHJlYXNvbiA6IHRyYWNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0cmFjZSAhPT0gdW5kZWZpbmVkICYmIHRyYWNlICE9PSByZWFzb24pIHtcbiAgICAgICAgdGhpcy5fc2V0Q2FycmllZFN0YWNrVHJhY2UodHJhY2UpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9sZW5ndGgoKSA+IDApIHtcbiAgICAgICAgdGhpcy5fcXVldWVTZXR0bGVQcm9taXNlcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZVBvc3NpYmxlUmVqZWN0aW9uSGFuZGxlZCgpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXR0bGVQcm9taXNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91bnNldFNldHRsZVByb21pc2VzUXVldWVkKCk7XG4gICAgdmFyIGxlbiA9IHRoaXMuX2xlbmd0aCgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdGhpcy5fc2V0dGxlUHJvbWlzZUF0KGkpO1xuICAgIH1cbn07XG5cbnV0aWwubm90RW51bWVyYWJsZVByb3AoUHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJfbWFrZVNlbGZSZXNvbHV0aW9uRXJyb3JcIixcbiAgICAgICAgICAgICAgICAgICAgICAgbWFrZVNlbGZSZXNvbHV0aW9uRXJyb3IpO1xuXG5fZGVyZXFfKFwiLi9wcm9ncmVzcy5qc1wiKShQcm9taXNlLCBQcm9taXNlQXJyYXkpO1xuX2RlcmVxXyhcIi4vbWV0aG9kLmpzXCIpKFByb21pc2UsIElOVEVSTkFMLCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBhcGlSZWplY3Rpb24pO1xuX2RlcmVxXyhcIi4vYmluZC5qc1wiKShQcm9taXNlLCBJTlRFUk5BTCwgdHJ5Q29udmVydFRvUHJvbWlzZSk7XG5fZGVyZXFfKFwiLi9maW5hbGx5LmpzXCIpKFByb21pc2UsIE5FWFRfRklMVEVSLCB0cnlDb252ZXJ0VG9Qcm9taXNlKTtcbl9kZXJlcV8oXCIuL2RpcmVjdF9yZXNvbHZlLmpzXCIpKFByb21pc2UpO1xuX2RlcmVxXyhcIi4vc3luY2hyb25vdXNfaW5zcGVjdGlvbi5qc1wiKShQcm9taXNlKTtcbl9kZXJlcV8oXCIuL2pvaW4uanNcIikoUHJvbWlzZSwgUHJvbWlzZUFycmF5LCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBJTlRFUk5BTCk7XG5Qcm9taXNlLlByb21pc2UgPSBQcm9taXNlO1xuX2RlcmVxXygnLi9tYXAuanMnKShQcm9taXNlLCBQcm9taXNlQXJyYXksIGFwaVJlamVjdGlvbiwgdHJ5Q29udmVydFRvUHJvbWlzZSwgSU5URVJOQUwpO1xuX2RlcmVxXygnLi9jYW5jZWwuanMnKShQcm9taXNlKTtcbl9kZXJlcV8oJy4vdXNpbmcuanMnKShQcm9taXNlLCBhcGlSZWplY3Rpb24sIHRyeUNvbnZlcnRUb1Byb21pc2UsIGNyZWF0ZUNvbnRleHQpO1xuX2RlcmVxXygnLi9nZW5lcmF0b3JzLmpzJykoUHJvbWlzZSwgYXBpUmVqZWN0aW9uLCBJTlRFUk5BTCwgdHJ5Q29udmVydFRvUHJvbWlzZSk7XG5fZGVyZXFfKCcuL25vZGVpZnkuanMnKShQcm9taXNlKTtcbl9kZXJlcV8oJy4vY2FsbF9nZXQuanMnKShQcm9taXNlKTtcbl9kZXJlcV8oJy4vcHJvcHMuanMnKShQcm9taXNlLCBQcm9taXNlQXJyYXksIHRyeUNvbnZlcnRUb1Byb21pc2UsIGFwaVJlamVjdGlvbik7XG5fZGVyZXFfKCcuL3JhY2UuanMnKShQcm9taXNlLCBJTlRFUk5BTCwgdHJ5Q29udmVydFRvUHJvbWlzZSwgYXBpUmVqZWN0aW9uKTtcbl9kZXJlcV8oJy4vcmVkdWNlLmpzJykoUHJvbWlzZSwgUHJvbWlzZUFycmF5LCBhcGlSZWplY3Rpb24sIHRyeUNvbnZlcnRUb1Byb21pc2UsIElOVEVSTkFMKTtcbl9kZXJlcV8oJy4vc2V0dGxlLmpzJykoUHJvbWlzZSwgUHJvbWlzZUFycmF5KTtcbl9kZXJlcV8oJy4vc29tZS5qcycpKFByb21pc2UsIFByb21pc2VBcnJheSwgYXBpUmVqZWN0aW9uKTtcbl9kZXJlcV8oJy4vcHJvbWlzaWZ5LmpzJykoUHJvbWlzZSwgSU5URVJOQUwpO1xuX2RlcmVxXygnLi9hbnkuanMnKShQcm9taXNlKTtcbl9kZXJlcV8oJy4vZWFjaC5qcycpKFByb21pc2UsIElOVEVSTkFMKTtcbl9kZXJlcV8oJy4vdGltZXJzLmpzJykoUHJvbWlzZSwgSU5URVJOQUwpO1xuX2RlcmVxXygnLi9maWx0ZXIuanMnKShQcm9taXNlLCBJTlRFUk5BTCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICB1dGlsLnRvRmFzdFByb3BlcnRpZXMoUHJvbWlzZSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgdXRpbC50b0Zhc3RQcm9wZXJ0aWVzKFByb21pc2UucHJvdG90eXBlKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZ1bmN0aW9uIGZpbGxUeXBlcyh2YWx1ZSkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIHAuX2Z1bGZpbGxtZW50SGFuZGxlcjAgPSB2YWx1ZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBwLl9yZWplY3Rpb25IYW5kbGVyMCA9IHZhbHVlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgcC5fcHJvZ3Jlc3NIYW5kbGVyMCA9IHZhbHVlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIHAuX3Byb21pc2UwID0gdmFsdWU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBwLl9yZWNlaXZlcjAgPSB2YWx1ZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgcC5fc2V0dGxlZFZhbHVlID0gdmFsdWU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIC8vIENvbXBsZXRlIHNsYWNrIHRyYWNraW5nLCBvcHQgb3V0IG9mIGZpZWxkLXR5cGUgdHJhY2tpbmcgYW5kICAgICAgICAgICBcbiAgICAvLyBzdGFiaWxpemUgbWFwICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZmlsbFR5cGVzKHthOiAxfSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZpbGxUeXBlcyh7YjogMn0pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBmaWxsVHlwZXMoe2M6IDN9KTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZmlsbFR5cGVzKDEpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZpbGxUeXBlcyhmdW5jdGlvbigpe30pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBmaWxsVHlwZXModW5kZWZpbmVkKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZmlsbFR5cGVzKGZhbHNlKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZpbGxUeXBlcyhuZXcgUHJvbWlzZShJTlRFUk5BTCkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBDYXB0dXJlZFRyYWNlLnNldEJvdW5kcyhhc3luYy5maXJzdExpbmVFcnJvciwgdXRpbC5sYXN0TGluZUVycm9yKTsgICAgICAgXG4gICAgcmV0dXJuIFByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuXG59O1xuXG59LHtcIi4vYW55LmpzXCI6MSxcIi4vYXN5bmMuanNcIjoyLFwiLi9iaW5kLmpzXCI6MyxcIi4vY2FsbF9nZXQuanNcIjo1LFwiLi9jYW5jZWwuanNcIjo2LFwiLi9jYXB0dXJlZF90cmFjZS5qc1wiOjcsXCIuL2NhdGNoX2ZpbHRlci5qc1wiOjgsXCIuL2NvbnRleHQuanNcIjo5LFwiLi9kZWJ1Z2dhYmlsaXR5LmpzXCI6MTAsXCIuL2RpcmVjdF9yZXNvbHZlLmpzXCI6MTEsXCIuL2VhY2guanNcIjoxMixcIi4vZXJyb3JzLmpzXCI6MTMsXCIuL2ZpbHRlci5qc1wiOjE1LFwiLi9maW5hbGx5LmpzXCI6MTYsXCIuL2dlbmVyYXRvcnMuanNcIjoxNyxcIi4vam9pbi5qc1wiOjE4LFwiLi9tYXAuanNcIjoxOSxcIi4vbWV0aG9kLmpzXCI6MjAsXCIuL25vZGVpZnkuanNcIjoyMSxcIi4vcHJvZ3Jlc3MuanNcIjoyMixcIi4vcHJvbWlzZV9hcnJheS5qc1wiOjI0LFwiLi9wcm9taXNlX3Jlc29sdmVyLmpzXCI6MjUsXCIuL3Byb21pc2lmeS5qc1wiOjI2LFwiLi9wcm9wcy5qc1wiOjI3LFwiLi9yYWNlLmpzXCI6MjksXCIuL3JlZHVjZS5qc1wiOjMwLFwiLi9zZXR0bGUuanNcIjozMixcIi4vc29tZS5qc1wiOjMzLFwiLi9zeW5jaHJvbm91c19pbnNwZWN0aW9uLmpzXCI6MzQsXCIuL3RoZW5hYmxlcy5qc1wiOjM1LFwiLi90aW1lcnMuanNcIjozNixcIi4vdXNpbmcuanNcIjozNyxcIi4vdXRpbC5qc1wiOjM4fV0sMjQ6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsIElOVEVSTkFMLCB0cnlDb252ZXJ0VG9Qcm9taXNlLFxuICAgIGFwaVJlamVjdGlvbikge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsLmpzXCIpO1xudmFyIGlzQXJyYXkgPSB1dGlsLmlzQXJyYXk7XG5cbmZ1bmN0aW9uIHRvUmVzb2x1dGlvblZhbHVlKHZhbCkge1xuICAgIHN3aXRjaCh2YWwpIHtcbiAgICBjYXNlIC0yOiByZXR1cm4gW107XG4gICAgY2FzZSAtMzogcmV0dXJuIHt9O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gUHJvbWlzZUFycmF5KHZhbHVlcykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5fcHJvbWlzZSA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICB2YXIgcGFyZW50O1xuICAgIGlmICh2YWx1ZXMgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHBhcmVudCA9IHZhbHVlcztcbiAgICAgICAgcHJvbWlzZS5fcHJvcGFnYXRlRnJvbShwYXJlbnQsIDEgfCA0KTtcbiAgICB9XG4gICAgdGhpcy5fdmFsdWVzID0gdmFsdWVzO1xuICAgIHRoaXMuX2xlbmd0aCA9IDA7XG4gICAgdGhpcy5fdG90YWxSZXNvbHZlZCA9IDA7XG4gICAgdGhpcy5faW5pdCh1bmRlZmluZWQsIC0yKTtcbn1cblByb21pc2VBcnJheS5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9sZW5ndGg7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLnByb21pc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Byb21pc2U7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24gaW5pdChfLCByZXNvbHZlVmFsdWVJZkVtcHR5KSB7XG4gICAgdmFyIHZhbHVlcyA9IHRyeUNvbnZlcnRUb1Byb21pc2UodGhpcy5fdmFsdWVzLCB0aGlzLl9wcm9taXNlKTtcbiAgICBpZiAodmFsdWVzIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICB2YWx1ZXMgPSB2YWx1ZXMuX3RhcmdldCgpO1xuICAgICAgICB0aGlzLl92YWx1ZXMgPSB2YWx1ZXM7XG4gICAgICAgIGlmICh2YWx1ZXMuX2lzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHZhbHVlcy5fdmFsdWUoKTtcbiAgICAgICAgICAgIGlmICghaXNBcnJheSh2YWx1ZXMpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBQcm9taXNlLlR5cGVFcnJvcihcImV4cGVjdGluZyBhbiBhcnJheSwgYSBwcm9taXNlIG9yIGEgdGhlbmFibGVcXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9zOE1NaGNcXHUwMDBhXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX19oYXJkUmVqZWN0X18oZXJyKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWVzLl9pc1BlbmRpbmcoKSkge1xuICAgICAgICAgICAgdmFsdWVzLl90aGVuKFxuICAgICAgICAgICAgICAgIGluaXQsXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVqZWN0LFxuICAgICAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgICAgIHJlc29sdmVWYWx1ZUlmRW1wdHlcbiAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3JlamVjdCh2YWx1ZXMuX3JlYXNvbigpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIWlzQXJyYXkodmFsdWVzKSkge1xuICAgICAgICB0aGlzLl9wcm9taXNlLl9yZWplY3QoYXBpUmVqZWN0aW9uKFwiZXhwZWN0aW5nIGFuIGFycmF5LCBhIHByb21pc2Ugb3IgYSB0aGVuYWJsZVxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL3M4TU1oY1xcdTAwMGFcIikuX3JlYXNvbigpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChyZXNvbHZlVmFsdWVJZkVtcHR5ID09PSAtNSkge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZUVtcHR5QXJyYXkoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmUodG9SZXNvbHV0aW9uVmFsdWUocmVzb2x2ZVZhbHVlSWZFbXB0eSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGxlbiA9IHRoaXMuZ2V0QWN0dWFsTGVuZ3RoKHZhbHVlcy5sZW5ndGgpO1xuICAgIHRoaXMuX2xlbmd0aCA9IGxlbjtcbiAgICB0aGlzLl92YWx1ZXMgPSB0aGlzLnNob3VsZENvcHlWYWx1ZXMoKSA/IG5ldyBBcnJheShsZW4pIDogdGhpcy5fdmFsdWVzO1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5fcHJvbWlzZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIHZhciBpc1Jlc29sdmVkID0gdGhpcy5faXNSZXNvbHZlZCgpO1xuICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZSh2YWx1ZXNbaV0sIHByb21pc2UpO1xuICAgICAgICBpZiAobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgbWF5YmVQcm9taXNlID0gbWF5YmVQcm9taXNlLl90YXJnZXQoKTtcbiAgICAgICAgICAgIGlmIChpc1Jlc29sdmVkKSB7XG4gICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlLl9pZ25vcmVSZWplY3Rpb25zKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1heWJlUHJvbWlzZS5faXNQZW5kaW5nKCkpIHtcbiAgICAgICAgICAgICAgICBtYXliZVByb21pc2UuX3Byb3h5UHJvbWlzZUFycmF5KHRoaXMsIGkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXliZVByb21pc2UuX2lzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcm9taXNlRnVsZmlsbGVkKG1heWJlUHJvbWlzZS5fdmFsdWUoKSwgaSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Byb21pc2VSZWplY3RlZChtYXliZVByb21pc2UuX3JlYXNvbigpLCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghaXNSZXNvbHZlZCkge1xuICAgICAgICAgICAgdGhpcy5fcHJvbWlzZUZ1bGZpbGxlZChtYXliZVByb21pc2UsIGkpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5faXNSZXNvbHZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWVzID09PSBudWxsO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuX3ZhbHVlcyA9IG51bGw7XG4gICAgdGhpcy5fcHJvbWlzZS5fZnVsZmlsbCh2YWx1ZSk7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9faGFyZFJlamVjdF9fID1cblByb21pc2VBcnJheS5wcm90b3R5cGUuX3JlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB0aGlzLl92YWx1ZXMgPSBudWxsO1xuICAgIHRoaXMuX3Byb21pc2UuX3JlamVjdENhbGxiYWNrKHJlYXNvbiwgZmFsc2UsIHRydWUpO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZVByb2dyZXNzZWQgPSBmdW5jdGlvbiAocHJvZ3Jlc3NWYWx1ZSwgaW5kZXgpIHtcbiAgICB0aGlzLl9wcm9taXNlLl9wcm9ncmVzcyh7XG4gICAgICAgIGluZGV4OiBpbmRleCxcbiAgICAgICAgdmFsdWU6IHByb2dyZXNzVmFsdWVcbiAgICB9KTtcbn07XG5cblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZUZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgpIHtcbiAgICB0aGlzLl92YWx1ZXNbaW5kZXhdID0gdmFsdWU7XG4gICAgdmFyIHRvdGFsUmVzb2x2ZWQgPSArK3RoaXMuX3RvdGFsUmVzb2x2ZWQ7XG4gICAgaWYgKHRvdGFsUmVzb2x2ZWQgPj0gdGhpcy5fbGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX3Jlc29sdmUodGhpcy5fdmFsdWVzKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlUmVqZWN0ZWQgPSBmdW5jdGlvbiAocmVhc29uLCBpbmRleCkge1xuICAgIHRoaXMuX3RvdGFsUmVzb2x2ZWQrKztcbiAgICB0aGlzLl9yZWplY3QocmVhc29uKTtcbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUuc2hvdWxkQ29weVZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUuZ2V0QWN0dWFsTGVuZ3RoID0gZnVuY3Rpb24gKGxlbikge1xuICAgIHJldHVybiBsZW47XG59O1xuXG5yZXR1cm4gUHJvbWlzZUFycmF5O1xufTtcblxufSx7XCIuL3V0aWwuanNcIjozOH1dLDI1OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsLmpzXCIpO1xudmFyIG1heWJlV3JhcEFzRXJyb3IgPSB1dGlsLm1heWJlV3JhcEFzRXJyb3I7XG52YXIgZXJyb3JzID0gX2RlcmVxXyhcIi4vZXJyb3JzLmpzXCIpO1xudmFyIFRpbWVvdXRFcnJvciA9IGVycm9ycy5UaW1lb3V0RXJyb3I7XG52YXIgT3BlcmF0aW9uYWxFcnJvciA9IGVycm9ycy5PcGVyYXRpb25hbEVycm9yO1xudmFyIGhhdmVHZXR0ZXJzID0gdXRpbC5oYXZlR2V0dGVycztcbnZhciBlczUgPSBfZGVyZXFfKFwiLi9lczUuanNcIik7XG5cbmZ1bmN0aW9uIGlzVW50eXBlZEVycm9yKG9iaikge1xuICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBFcnJvciAmJlxuICAgICAgICBlczUuZ2V0UHJvdG90eXBlT2Yob2JqKSA9PT0gRXJyb3IucHJvdG90eXBlO1xufVxuXG52YXIgckVycm9yS2V5ID0gL14oPzpuYW1lfG1lc3NhZ2V8c3RhY2t8Y2F1c2UpJC87XG5mdW5jdGlvbiB3cmFwQXNPcGVyYXRpb25hbEVycm9yKG9iaikge1xuICAgIHZhciByZXQ7XG4gICAgaWYgKGlzVW50eXBlZEVycm9yKG9iaikpIHtcbiAgICAgICAgcmV0ID0gbmV3IE9wZXJhdGlvbmFsRXJyb3Iob2JqKTtcbiAgICAgICAgcmV0Lm5hbWUgPSBvYmoubmFtZTtcbiAgICAgICAgcmV0Lm1lc3NhZ2UgPSBvYmoubWVzc2FnZTtcbiAgICAgICAgcmV0LnN0YWNrID0gb2JqLnN0YWNrO1xuICAgICAgICB2YXIga2V5cyA9IGVzNS5rZXlzKG9iaik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICBpZiAoIXJFcnJvcktleS50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9IG9ialtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIHV0aWwubWFya0FzT3JpZ2luYXRpbmdGcm9tUmVqZWN0aW9uKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gbm9kZWJhY2tGb3JQcm9taXNlKHByb21pc2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZXJyLCB2YWx1ZSkge1xuICAgICAgICBpZiAocHJvbWlzZSA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHZhciB3cmFwcGVkID0gd3JhcEFzT3BlcmF0aW9uYWxFcnJvcihtYXliZVdyYXBBc0Vycm9yKGVycikpO1xuICAgICAgICAgICAgcHJvbWlzZS5fYXR0YWNoRXh0cmFUcmFjZSh3cmFwcGVkKTtcbiAgICAgICAgICAgIHByb21pc2UuX3JlamVjdCh3cmFwcGVkKTtcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgdmFyICRfbGVuID0gYXJndW1lbnRzLmxlbmd0aDt2YXIgYXJncyA9IG5ldyBBcnJheSgkX2xlbiAtIDEpOyBmb3IodmFyICRfaSA9IDE7ICRfaSA8ICRfbGVuOyArKyRfaSkge2FyZ3NbJF9pIC0gMV0gPSBhcmd1bWVudHNbJF9pXTt9XG4gICAgICAgICAgICBwcm9taXNlLl9mdWxmaWxsKGFyZ3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcHJvbWlzZS5fZnVsZmlsbCh2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9taXNlID0gbnVsbDtcbiAgICB9O1xufVxuXG5cbnZhciBQcm9taXNlUmVzb2x2ZXI7XG5pZiAoIWhhdmVHZXR0ZXJzKSB7XG4gICAgUHJvbWlzZVJlc29sdmVyID0gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgICAgdGhpcy5wcm9taXNlID0gcHJvbWlzZTtcbiAgICAgICAgdGhpcy5hc0NhbGxiYWNrID0gbm9kZWJhY2tGb3JQcm9taXNlKHByb21pc2UpO1xuICAgICAgICB0aGlzLmNhbGxiYWNrID0gdGhpcy5hc0NhbGxiYWNrO1xuICAgIH07XG59XG5lbHNlIHtcbiAgICBQcm9taXNlUmVzb2x2ZXIgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgICAgICB0aGlzLnByb21pc2UgPSBwcm9taXNlO1xuICAgIH07XG59XG5pZiAoaGF2ZUdldHRlcnMpIHtcbiAgICB2YXIgcHJvcCA9IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlYmFja0ZvclByb21pc2UodGhpcy5wcm9taXNlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgZXM1LmRlZmluZVByb3BlcnR5KFByb21pc2VSZXNvbHZlci5wcm90b3R5cGUsIFwiYXNDYWxsYmFja1wiLCBwcm9wKTtcbiAgICBlczUuZGVmaW5lUHJvcGVydHkoUHJvbWlzZVJlc29sdmVyLnByb3RvdHlwZSwgXCJjYWxsYmFja1wiLCBwcm9wKTtcbn1cblxuUHJvbWlzZVJlc29sdmVyLl9ub2RlYmFja0ZvclByb21pc2UgPSBub2RlYmFja0ZvclByb21pc2U7XG5cblByb21pc2VSZXNvbHZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFwiW29iamVjdCBQcm9taXNlUmVzb2x2ZXJdXCI7XG59O1xuXG5Qcm9taXNlUmVzb2x2ZXIucHJvdG90eXBlLnJlc29sdmUgPVxuUHJvbWlzZVJlc29sdmVyLnByb3RvdHlwZS5mdWxmaWxsID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFByb21pc2VSZXNvbHZlcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIklsbGVnYWwgaW52b2NhdGlvbiwgcmVzb2x2ZXIgcmVzb2x2ZS9yZWplY3QgbXVzdCBiZSBjYWxsZWQgd2l0aGluIGEgcmVzb2x2ZXIgY29udGV4dC4gQ29uc2lkZXIgdXNpbmcgdGhlIHByb21pc2UgY29uc3RydWN0b3IgaW5zdGVhZC5cXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9zZGtYTDlcXHUwMDBhXCIpO1xuICAgIH1cbiAgICB0aGlzLnByb21pc2UuX3Jlc29sdmVDYWxsYmFjayh2YWx1ZSk7XG59O1xuXG5Qcm9taXNlUmVzb2x2ZXIucHJvdG90eXBlLnJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJvbWlzZVJlc29sdmVyKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSWxsZWdhbCBpbnZvY2F0aW9uLCByZXNvbHZlciByZXNvbHZlL3JlamVjdCBtdXN0IGJlIGNhbGxlZCB3aXRoaW4gYSByZXNvbHZlciBjb250ZXh0LiBDb25zaWRlciB1c2luZyB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvciBpbnN0ZWFkLlxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL3Nka1hMOVxcdTAwMGFcIik7XG4gICAgfVxuICAgIHRoaXMucHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2socmVhc29uKTtcbn07XG5cblByb21pc2VSZXNvbHZlci5wcm90b3R5cGUucHJvZ3Jlc3MgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJvbWlzZVJlc29sdmVyKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSWxsZWdhbCBpbnZvY2F0aW9uLCByZXNvbHZlciByZXNvbHZlL3JlamVjdCBtdXN0IGJlIGNhbGxlZCB3aXRoaW4gYSByZXNvbHZlciBjb250ZXh0LiBDb25zaWRlciB1c2luZyB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvciBpbnN0ZWFkLlxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL3Nka1hMOVxcdTAwMGFcIik7XG4gICAgfVxuICAgIHRoaXMucHJvbWlzZS5fcHJvZ3Jlc3ModmFsdWUpO1xufTtcblxuUHJvbWlzZVJlc29sdmVyLnByb3RvdHlwZS5jYW5jZWwgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdGhpcy5wcm9taXNlLmNhbmNlbChlcnIpO1xufTtcblxuUHJvbWlzZVJlc29sdmVyLnByb3RvdHlwZS50aW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucmVqZWN0KG5ldyBUaW1lb3V0RXJyb3IoXCJ0aW1lb3V0XCIpKTtcbn07XG5cblByb21pc2VSZXNvbHZlci5wcm90b3R5cGUuaXNSZXNvbHZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5wcm9taXNlLmlzUmVzb2x2ZWQoKTtcbn07XG5cblByb21pc2VSZXNvbHZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnByb21pc2UudG9KU09OKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2VSZXNvbHZlcjtcblxufSx7XCIuL2Vycm9ycy5qc1wiOjEzLFwiLi9lczUuanNcIjoxNCxcIi4vdXRpbC5qc1wiOjM4fV0sMjY6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsIElOVEVSTkFMKSB7XG52YXIgVEhJUyA9IHt9O1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsLmpzXCIpO1xudmFyIG5vZGViYWNrRm9yUHJvbWlzZSA9IF9kZXJlcV8oXCIuL3Byb21pc2VfcmVzb2x2ZXIuanNcIilcbiAgICAuX25vZGViYWNrRm9yUHJvbWlzZTtcbnZhciB3aXRoQXBwZW5kZWQgPSB1dGlsLndpdGhBcHBlbmRlZDtcbnZhciBtYXliZVdyYXBBc0Vycm9yID0gdXRpbC5tYXliZVdyYXBBc0Vycm9yO1xudmFyIGNhbkV2YWx1YXRlID0gdXRpbC5jYW5FdmFsdWF0ZTtcbnZhciBUeXBlRXJyb3IgPSBfZGVyZXFfKFwiLi9lcnJvcnNcIikuVHlwZUVycm9yO1xudmFyIGRlZmF1bHRTdWZmaXggPSBcIkFzeW5jXCI7XG52YXIgZGVmYXVsdFByb21pc2lmaWVkID0ge19faXNQcm9taXNpZmllZF9fOiB0cnVlfTtcbnZhciBub0NvcHlQcm9wcyA9IFtcbiAgICBcImFyaXR5XCIsICAgIFwibGVuZ3RoXCIsXG4gICAgXCJuYW1lXCIsXG4gICAgXCJhcmd1bWVudHNcIixcbiAgICBcImNhbGxlclwiLFxuICAgIFwiY2FsbGVlXCIsXG4gICAgXCJwcm90b3R5cGVcIixcbiAgICBcIl9faXNQcm9taXNpZmllZF9fXCJcbl07XG52YXIgbm9Db3B5UHJvcHNQYXR0ZXJuID0gbmV3IFJlZ0V4cChcIl4oPzpcIiArIG5vQ29weVByb3BzLmpvaW4oXCJ8XCIpICsgXCIpJFwiKTtcblxudmFyIGRlZmF1bHRGaWx0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHV0aWwuaXNJZGVudGlmaWVyKG5hbWUpICYmXG4gICAgICAgIG5hbWUuY2hhckF0KDApICE9PSBcIl9cIiAmJlxuICAgICAgICBuYW1lICE9PSBcImNvbnN0cnVjdG9yXCI7XG59O1xuXG5mdW5jdGlvbiBwcm9wc0ZpbHRlcihrZXkpIHtcbiAgICByZXR1cm4gIW5vQ29weVByb3BzUGF0dGVybi50ZXN0KGtleSk7XG59XG5cbmZ1bmN0aW9uIGlzUHJvbWlzaWZpZWQoZm4pIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gZm4uX19pc1Byb21pc2lmaWVkX18gPT09IHRydWU7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1Byb21pc2lmaWVkKG9iaiwga2V5LCBzdWZmaXgpIHtcbiAgICB2YXIgdmFsID0gdXRpbC5nZXREYXRhUHJvcGVydHlPckRlZmF1bHQob2JqLCBrZXkgKyBzdWZmaXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRQcm9taXNpZmllZCk7XG4gICAgcmV0dXJuIHZhbCA/IGlzUHJvbWlzaWZpZWQodmFsKSA6IGZhbHNlO1xufVxuZnVuY3Rpb24gY2hlY2tWYWxpZChyZXQsIHN1ZmZpeCwgc3VmZml4UmVnZXhwKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXQubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgdmFyIGtleSA9IHJldFtpXTtcbiAgICAgICAgaWYgKHN1ZmZpeFJlZ2V4cC50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgIHZhciBrZXlXaXRob3V0QXN5bmNTdWZmaXggPSBrZXkucmVwbGFjZShzdWZmaXhSZWdleHAsIFwiXCIpO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCByZXQubGVuZ3RoOyBqICs9IDIpIHtcbiAgICAgICAgICAgICAgICBpZiAocmV0W2pdID09PSBrZXlXaXRob3V0QXN5bmNTdWZmaXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBwcm9taXNpZnkgYW4gQVBJIHRoYXQgaGFzIG5vcm1hbCBtZXRob2RzIHdpdGggJyVzJy1zdWZmaXhcXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9pV3JaYndcXHUwMDBhXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKFwiJXNcIiwgc3VmZml4KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwcm9taXNpZmlhYmxlTWV0aG9kcyhvYmosIHN1ZmZpeCwgc3VmZml4UmVnZXhwLCBmaWx0ZXIpIHtcbiAgICB2YXIga2V5cyA9IHV0aWwuaW5oZXJpdGVkRGF0YUtleXMob2JqKTtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICB2YXIgdmFsdWUgPSBvYmpba2V5XTtcbiAgICAgICAgdmFyIHBhc3Nlc0RlZmF1bHRGaWx0ZXIgPSBmaWx0ZXIgPT09IGRlZmF1bHRGaWx0ZXJcbiAgICAgICAgICAgID8gdHJ1ZSA6IGRlZmF1bHRGaWx0ZXIoa2V5LCB2YWx1ZSwgb2JqKTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICAhaXNQcm9taXNpZmllZCh2YWx1ZSkgJiZcbiAgICAgICAgICAgICFoYXNQcm9taXNpZmllZChvYmosIGtleSwgc3VmZml4KSAmJlxuICAgICAgICAgICAgZmlsdGVyKGtleSwgdmFsdWUsIG9iaiwgcGFzc2VzRGVmYXVsdEZpbHRlcikpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNoZWNrVmFsaWQocmV0LCBzdWZmaXgsIHN1ZmZpeFJlZ2V4cCk7XG4gICAgcmV0dXJuIHJldDtcbn1cblxudmFyIGVzY2FwZUlkZW50UmVnZXggPSBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbJF0pLywgXCJcXFxcJFwiKTtcbn07XG5cbnZhciBtYWtlTm9kZVByb21pc2lmaWVkRXZhbDtcbmlmICghdHJ1ZSkge1xudmFyIHN3aXRjaENhc2VBcmd1bWVudE9yZGVyID0gZnVuY3Rpb24obGlrZWx5QXJndW1lbnRDb3VudCkge1xuICAgIHZhciByZXQgPSBbbGlrZWx5QXJndW1lbnRDb3VudF07XG4gICAgdmFyIG1pbiA9IE1hdGgubWF4KDAsIGxpa2VseUFyZ3VtZW50Q291bnQgLSAxIC0gMyk7XG4gICAgZm9yKHZhciBpID0gbGlrZWx5QXJndW1lbnRDb3VudCAtIDE7IGkgPj0gbWluOyAtLWkpIHtcbiAgICAgICAgcmV0LnB1c2goaSk7XG4gICAgfVxuICAgIGZvcih2YXIgaSA9IGxpa2VseUFyZ3VtZW50Q291bnQgKyAxOyBpIDw9IDM7ICsraSkge1xuICAgICAgICByZXQucHVzaChpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBhcmd1bWVudFNlcXVlbmNlID0gZnVuY3Rpb24oYXJndW1lbnRDb3VudCkge1xuICAgIHJldHVybiB1dGlsLmZpbGxlZFJhbmdlKGFyZ3VtZW50Q291bnQsIFwiX2FyZ1wiLCBcIlwiKTtcbn07XG5cbnZhciBwYXJhbWV0ZXJEZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKHBhcmFtZXRlckNvdW50KSB7XG4gICAgcmV0dXJuIHV0aWwuZmlsbGVkUmFuZ2UoXG4gICAgICAgIE1hdGgubWF4KHBhcmFtZXRlckNvdW50LCAzKSwgXCJfYXJnXCIsIFwiXCIpO1xufTtcblxudmFyIHBhcmFtZXRlckNvdW50ID0gZnVuY3Rpb24oZm4pIHtcbiAgICBpZiAodHlwZW9mIGZuLmxlbmd0aCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5taW4oZm4ubGVuZ3RoLCAxMDIzICsgMSksIDApO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn07XG5cbm1ha2VOb2RlUHJvbWlzaWZpZWRFdmFsID1cbmZ1bmN0aW9uKGNhbGxiYWNrLCByZWNlaXZlciwgb3JpZ2luYWxOYW1lLCBmbikge1xuICAgIHZhciBuZXdQYXJhbWV0ZXJDb3VudCA9IE1hdGgubWF4KDAsIHBhcmFtZXRlckNvdW50KGZuKSAtIDEpO1xuICAgIHZhciBhcmd1bWVudE9yZGVyID0gc3dpdGNoQ2FzZUFyZ3VtZW50T3JkZXIobmV3UGFyYW1ldGVyQ291bnQpO1xuICAgIHZhciBzaG91bGRQcm94eVRoaXMgPSB0eXBlb2YgY2FsbGJhY2sgPT09IFwic3RyaW5nXCIgfHwgcmVjZWl2ZXIgPT09IFRISVM7XG5cbiAgICBmdW5jdGlvbiBnZW5lcmF0ZUNhbGxGb3JBcmd1bWVudENvdW50KGNvdW50KSB7XG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRTZXF1ZW5jZShjb3VudCkuam9pbihcIiwgXCIpO1xuICAgICAgICB2YXIgY29tbWEgPSBjb3VudCA+IDAgPyBcIiwgXCIgOiBcIlwiO1xuICAgICAgICB2YXIgcmV0O1xuICAgICAgICBpZiAoc2hvdWxkUHJveHlUaGlzKSB7XG4gICAgICAgICAgICByZXQgPSBcInJldCA9IGNhbGxiYWNrLmNhbGwodGhpcywge3thcmdzfX0sIG5vZGViYWNrKTsgYnJlYWs7XFxuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXQgPSByZWNlaXZlciA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgPyBcInJldCA9IGNhbGxiYWNrKHt7YXJnc319LCBub2RlYmFjayk7IGJyZWFrO1xcblwiXG4gICAgICAgICAgICAgICAgOiBcInJldCA9IGNhbGxiYWNrLmNhbGwocmVjZWl2ZXIsIHt7YXJnc319LCBub2RlYmFjayk7IGJyZWFrO1xcblwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQucmVwbGFjZShcInt7YXJnc319XCIsIGFyZ3MpLnJlcGxhY2UoXCIsIFwiLCBjb21tYSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVBcmd1bWVudFN3aXRjaENhc2UoKSB7XG4gICAgICAgIHZhciByZXQgPSBcIlwiO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50T3JkZXIubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHJldCArPSBcImNhc2UgXCIgKyBhcmd1bWVudE9yZGVyW2ldICtcIjpcIiArXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVDYWxsRm9yQXJndW1lbnRDb3VudChhcmd1bWVudE9yZGVyW2ldKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldCArPSBcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBkZWZhdWx0OiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobGVuICsgMSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIGkgPSAwOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgYXJnc1tpXSA9IG5vZGViYWNrOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgW0NvZGVGb3JDYWxsXSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgYnJlYWs7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBcIi5yZXBsYWNlKFwiW0NvZGVGb3JDYWxsXVwiLCAoc2hvdWxkUHJveHlUaGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gXCJyZXQgPSBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmdzKTtcXG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFwicmV0ID0gY2FsbGJhY2suYXBwbHkocmVjZWl2ZXIsIGFyZ3MpO1xcblwiKSk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgdmFyIGdldEZ1bmN0aW9uQ29kZSA9IHR5cGVvZiBjYWxsYmFjayA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IChcInRoaXMgIT0gbnVsbCA/IHRoaXNbJ1wiK2NhbGxiYWNrK1wiJ10gOiBmblwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFwiZm5cIjtcblxuICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJQcm9taXNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImZuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInJlY2VpdmVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIndpdGhBcHBlbmRlZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtYXliZVdyYXBBc0Vycm9yXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5vZGViYWNrRm9yUHJvbWlzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0cnlDYXRjaFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlcnJvck9ialwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJub3RFbnVtZXJhYmxlUHJvcFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJJTlRFUk5BTFwiLFwiJ3VzZSBzdHJpY3QnOyAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICB2YXIgcmV0ID0gZnVuY3Rpb24gKFBhcmFtZXRlcnMpIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgJ3VzZSBzdHJpY3QnOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgcHJvbWlzZS5fY2FwdHVyZVN0YWNrVHJhY2UoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIG5vZGViYWNrID0gbm9kZWJhY2tGb3JQcm9taXNlKHByb21pc2UpOyAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIHJldDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gdHJ5Q2F0Y2goW0dldEZ1bmN0aW9uQ29kZV0pOyAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgc3dpdGNoKGxlbikgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIFtDb2RlRm9yU3dpdGNoQ2FzZV0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKG1heWJlV3JhcEFzRXJyb3IocmV0LmUpLCB0cnVlLCB0cnVlKTtcXG5cXFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICB9OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBub3RFbnVtZXJhYmxlUHJvcChyZXQsICdfX2lzUHJvbWlzaWZpZWRfXycsIHRydWUpOyAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICByZXR1cm4gcmV0OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBcIlxuICAgICAgICAucmVwbGFjZShcIlBhcmFtZXRlcnNcIiwgcGFyYW1ldGVyRGVjbGFyYXRpb24obmV3UGFyYW1ldGVyQ291bnQpKVxuICAgICAgICAucmVwbGFjZShcIltDb2RlRm9yU3dpdGNoQ2FzZV1cIiwgZ2VuZXJhdGVBcmd1bWVudFN3aXRjaENhc2UoKSlcbiAgICAgICAgLnJlcGxhY2UoXCJbR2V0RnVuY3Rpb25Db2RlXVwiLCBnZXRGdW5jdGlvbkNvZGUpKShcbiAgICAgICAgICAgIFByb21pc2UsXG4gICAgICAgICAgICBmbixcbiAgICAgICAgICAgIHJlY2VpdmVyLFxuICAgICAgICAgICAgd2l0aEFwcGVuZGVkLFxuICAgICAgICAgICAgbWF5YmVXcmFwQXNFcnJvcixcbiAgICAgICAgICAgIG5vZGViYWNrRm9yUHJvbWlzZSxcbiAgICAgICAgICAgIHV0aWwudHJ5Q2F0Y2gsXG4gICAgICAgICAgICB1dGlsLmVycm9yT2JqLFxuICAgICAgICAgICAgdXRpbC5ub3RFbnVtZXJhYmxlUHJvcCxcbiAgICAgICAgICAgIElOVEVSTkFMXG4gICAgICAgICk7XG59O1xufVxuXG5mdW5jdGlvbiBtYWtlTm9kZVByb21pc2lmaWVkQ2xvc3VyZShjYWxsYmFjaywgcmVjZWl2ZXIsIF8sIGZuKSB7XG4gICAgdmFyIGRlZmF1bHRUaGlzID0gKGZ1bmN0aW9uKCkge3JldHVybiB0aGlzO30pKCk7XG4gICAgdmFyIG1ldGhvZCA9IGNhbGxiYWNrO1xuICAgIGlmICh0eXBlb2YgbWV0aG9kID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGNhbGxiYWNrID0gZm47XG4gICAgfVxuICAgIGZ1bmN0aW9uIHByb21pc2lmaWVkKCkge1xuICAgICAgICB2YXIgX3JlY2VpdmVyID0gcmVjZWl2ZXI7XG4gICAgICAgIGlmIChyZWNlaXZlciA9PT0gVEhJUykgX3JlY2VpdmVyID0gdGhpcztcbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgICAgIHByb21pc2UuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgICAgIHZhciBjYiA9IHR5cGVvZiBtZXRob2QgPT09IFwic3RyaW5nXCIgJiYgdGhpcyAhPT0gZGVmYXVsdFRoaXNcbiAgICAgICAgICAgID8gdGhpc1ttZXRob2RdIDogY2FsbGJhY2s7XG4gICAgICAgIHZhciBmbiA9IG5vZGViYWNrRm9yUHJvbWlzZShwcm9taXNlKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNiLmFwcGx5KF9yZWNlaXZlciwgd2l0aEFwcGVuZGVkKGFyZ3VtZW50cywgZm4pKTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICBwcm9taXNlLl9yZWplY3RDYWxsYmFjayhtYXliZVdyYXBBc0Vycm9yKGUpLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgdXRpbC5ub3RFbnVtZXJhYmxlUHJvcChwcm9taXNpZmllZCwgXCJfX2lzUHJvbWlzaWZpZWRfX1wiLCB0cnVlKTtcbiAgICByZXR1cm4gcHJvbWlzaWZpZWQ7XG59XG5cbnZhciBtYWtlTm9kZVByb21pc2lmaWVkID0gY2FuRXZhbHVhdGVcbiAgICA/IG1ha2VOb2RlUHJvbWlzaWZpZWRFdmFsXG4gICAgOiBtYWtlTm9kZVByb21pc2lmaWVkQ2xvc3VyZTtcblxuZnVuY3Rpb24gcHJvbWlzaWZ5QWxsKG9iaiwgc3VmZml4LCBmaWx0ZXIsIHByb21pc2lmaWVyKSB7XG4gICAgdmFyIHN1ZmZpeFJlZ2V4cCA9IG5ldyBSZWdFeHAoZXNjYXBlSWRlbnRSZWdleChzdWZmaXgpICsgXCIkXCIpO1xuICAgIHZhciBtZXRob2RzID1cbiAgICAgICAgcHJvbWlzaWZpYWJsZU1ldGhvZHMob2JqLCBzdWZmaXgsIHN1ZmZpeFJlZ2V4cCwgZmlsdGVyKTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBtZXRob2RzLmxlbmd0aDsgaSA8IGxlbjsgaSs9IDIpIHtcbiAgICAgICAgdmFyIGtleSA9IG1ldGhvZHNbaV07XG4gICAgICAgIHZhciBmbiA9IG1ldGhvZHNbaSsxXTtcbiAgICAgICAgdmFyIHByb21pc2lmaWVkS2V5ID0ga2V5ICsgc3VmZml4O1xuICAgICAgICBvYmpbcHJvbWlzaWZpZWRLZXldID0gcHJvbWlzaWZpZXIgPT09IG1ha2VOb2RlUHJvbWlzaWZpZWRcbiAgICAgICAgICAgICAgICA/IG1ha2VOb2RlUHJvbWlzaWZpZWQoa2V5LCBUSElTLCBrZXksIGZuLCBzdWZmaXgpXG4gICAgICAgICAgICAgICAgOiBwcm9taXNpZmllcihmbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtYWtlTm9kZVByb21pc2lmaWVkKGtleSwgVEhJUywga2V5LCBmbiwgc3VmZml4KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgdXRpbC50b0Zhc3RQcm9wZXJ0aWVzKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gcHJvbWlzaWZ5KGNhbGxiYWNrLCByZWNlaXZlcikge1xuICAgIHJldHVybiBtYWtlTm9kZVByb21pc2lmaWVkKGNhbGxiYWNrLCByZWNlaXZlciwgdW5kZWZpbmVkLCBjYWxsYmFjayk7XG59XG5cblByb21pc2UucHJvbWlzaWZ5ID0gZnVuY3Rpb24gKGZuLCByZWNlaXZlcikge1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZm4gbXVzdCBiZSBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvOTE2bEpKXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgaWYgKGlzUHJvbWlzaWZpZWQoZm4pKSB7XG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9XG4gICAgdmFyIHJldCA9IHByb21pc2lmeShmbiwgYXJndW1lbnRzLmxlbmd0aCA8IDIgPyBUSElTIDogcmVjZWl2ZXIpO1xuICAgIHV0aWwuY29weURlc2NyaXB0b3JzKGZuLCByZXQsIHByb3BzRmlsdGVyKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5wcm9taXNpZnlBbGwgPSBmdW5jdGlvbiAodGFyZ2V0LCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJ0aGUgdGFyZ2V0IG9mIHByb21pc2lmeUFsbCBtdXN0IGJlIGFuIG9iamVjdCBvciBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvOUlUbFYwXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdChvcHRpb25zKTtcbiAgICB2YXIgc3VmZml4ID0gb3B0aW9ucy5zdWZmaXg7XG4gICAgaWYgKHR5cGVvZiBzdWZmaXggIT09IFwic3RyaW5nXCIpIHN1ZmZpeCA9IGRlZmF1bHRTdWZmaXg7XG4gICAgdmFyIGZpbHRlciA9IG9wdGlvbnMuZmlsdGVyO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyICE9PSBcImZ1bmN0aW9uXCIpIGZpbHRlciA9IGRlZmF1bHRGaWx0ZXI7XG4gICAgdmFyIHByb21pc2lmaWVyID0gb3B0aW9ucy5wcm9taXNpZmllcjtcbiAgICBpZiAodHlwZW9mIHByb21pc2lmaWVyICE9PSBcImZ1bmN0aW9uXCIpIHByb21pc2lmaWVyID0gbWFrZU5vZGVQcm9taXNpZmllZDtcblxuICAgIGlmICghdXRpbC5pc0lkZW50aWZpZXIoc3VmZml4KSkge1xuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcInN1ZmZpeCBtdXN0IGJlIGEgdmFsaWQgaWRlbnRpZmllclxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsLzhGWm81VlxcdTAwMGFcIik7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSB1dGlsLmluaGVyaXRlZERhdGFLZXlzKHRhcmdldCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRhcmdldFtrZXlzW2ldXTtcbiAgICAgICAgaWYgKGtleXNbaV0gIT09IFwiY29uc3RydWN0b3JcIiAmJlxuICAgICAgICAgICAgdXRpbC5pc0NsYXNzKHZhbHVlKSkge1xuICAgICAgICAgICAgcHJvbWlzaWZ5QWxsKHZhbHVlLnByb3RvdHlwZSwgc3VmZml4LCBmaWx0ZXIsIHByb21pc2lmaWVyKTtcbiAgICAgICAgICAgIHByb21pc2lmeUFsbCh2YWx1ZSwgc3VmZml4LCBmaWx0ZXIsIHByb21pc2lmaWVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNpZnlBbGwodGFyZ2V0LCBzdWZmaXgsIGZpbHRlciwgcHJvbWlzaWZpZXIpO1xufTtcbn07XG5cblxufSx7XCIuL2Vycm9yc1wiOjEzLFwiLi9wcm9taXNlX3Jlc29sdmVyLmpzXCI6MjUsXCIuL3V0aWwuanNcIjozOH1dLDI3OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihcbiAgICBQcm9taXNlLCBQcm9taXNlQXJyYXksIHRyeUNvbnZlcnRUb1Byb21pc2UsIGFwaVJlamVjdGlvbikge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsLmpzXCIpO1xudmFyIGlzT2JqZWN0ID0gdXRpbC5pc09iamVjdDtcbnZhciBlczUgPSBfZGVyZXFfKFwiLi9lczUuanNcIik7XG5cbmZ1bmN0aW9uIFByb3BlcnRpZXNQcm9taXNlQXJyYXkob2JqKSB7XG4gICAgdmFyIGtleXMgPSBlczUua2V5cyhvYmopO1xuICAgIHZhciBsZW4gPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KGxlbiAqIDIpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXldO1xuICAgICAgICB2YWx1ZXNbaSArIGxlbl0gPSBrZXk7XG4gICAgfVxuICAgIHRoaXMuY29uc3RydWN0b3IkKHZhbHVlcyk7XG59XG51dGlsLmluaGVyaXRzKFByb3BlcnRpZXNQcm9taXNlQXJyYXksIFByb21pc2VBcnJheSk7XG5cblByb3BlcnRpZXNQcm9taXNlQXJyYXkucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2luaXQkKHVuZGVmaW5lZCwgLTMpIDtcbn07XG5cblByb3BlcnRpZXNQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlRnVsZmlsbGVkID0gZnVuY3Rpb24gKHZhbHVlLCBpbmRleCkge1xuICAgIHRoaXMuX3ZhbHVlc1tpbmRleF0gPSB2YWx1ZTtcbiAgICB2YXIgdG90YWxSZXNvbHZlZCA9ICsrdGhpcy5fdG90YWxSZXNvbHZlZDtcbiAgICBpZiAodG90YWxSZXNvbHZlZCA+PSB0aGlzLl9sZW5ndGgpIHtcbiAgICAgICAgdmFyIHZhbCA9IHt9O1xuICAgICAgICB2YXIga2V5T2Zmc2V0ID0gdGhpcy5sZW5ndGgoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGVuZ3RoKCk7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgdmFsW3RoaXMuX3ZhbHVlc1tpICsga2V5T2Zmc2V0XV0gPSB0aGlzLl92YWx1ZXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZSh2YWwpO1xuICAgIH1cbn07XG5cblByb3BlcnRpZXNQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlUHJvZ3Jlc3NlZCA9IGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgpIHtcbiAgICB0aGlzLl9wcm9taXNlLl9wcm9ncmVzcyh7XG4gICAgICAgIGtleTogdGhpcy5fdmFsdWVzW2luZGV4ICsgdGhpcy5sZW5ndGgoKV0sXG4gICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgIH0pO1xufTtcblxuUHJvcGVydGllc1Byb21pc2VBcnJheS5wcm90b3R5cGUuc2hvdWxkQ29weVZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5Qcm9wZXJ0aWVzUHJvbWlzZUFycmF5LnByb3RvdHlwZS5nZXRBY3R1YWxMZW5ndGggPSBmdW5jdGlvbiAobGVuKSB7XG4gICAgcmV0dXJuIGxlbiA+PiAxO1xufTtcblxuZnVuY3Rpb24gcHJvcHMocHJvbWlzZXMpIHtcbiAgICB2YXIgcmV0O1xuICAgIHZhciBjYXN0VmFsdWUgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHByb21pc2VzKTtcblxuICAgIGlmICghaXNPYmplY3QoY2FzdFZhbHVlKSkge1xuICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiY2Fubm90IGF3YWl0IHByb3BlcnRpZXMgb2YgYSBub24tb2JqZWN0XFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvT3NGS0M4XFx1MDAwYVwiKTtcbiAgICB9IGVsc2UgaWYgKGNhc3RWYWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgcmV0ID0gY2FzdFZhbHVlLl90aGVuKFxuICAgICAgICAgICAgUHJvbWlzZS5wcm9wcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXQgPSBuZXcgUHJvcGVydGllc1Byb21pc2VBcnJheShjYXN0VmFsdWUpLnByb21pc2UoKTtcbiAgICB9XG5cbiAgICBpZiAoY2FzdFZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICByZXQuX3Byb3BhZ2F0ZUZyb20oY2FzdFZhbHVlLCA0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUucHJvcHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHByb3BzKHRoaXMpO1xufTtcblxuUHJvbWlzZS5wcm9wcyA9IGZ1bmN0aW9uIChwcm9taXNlcykge1xuICAgIHJldHVybiBwcm9wcyhwcm9taXNlcyk7XG59O1xufTtcblxufSx7XCIuL2VzNS5qc1wiOjE0LFwiLi91dGlsLmpzXCI6Mzh9XSwyODpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIGFycmF5TW92ZShzcmMsIHNyY0luZGV4LCBkc3QsIGRzdEluZGV4LCBsZW4pIHtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgIGRzdFtqICsgZHN0SW5kZXhdID0gc3JjW2ogKyBzcmNJbmRleF07XG4gICAgICAgIHNyY1tqICsgc3JjSW5kZXhdID0gdm9pZCAwO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gUXVldWUoY2FwYWNpdHkpIHtcbiAgICB0aGlzLl9jYXBhY2l0eSA9IGNhcGFjaXR5O1xuICAgIHRoaXMuX2xlbmd0aCA9IDA7XG4gICAgdGhpcy5fZnJvbnQgPSAwO1xufVxuXG5RdWV1ZS5wcm90b3R5cGUuX3dpbGxCZU92ZXJDYXBhY2l0eSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhcGFjaXR5IDwgc2l6ZTtcbn07XG5cblF1ZXVlLnByb3RvdHlwZS5fcHVzaE9uZSA9IGZ1bmN0aW9uIChhcmcpIHtcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcbiAgICB0aGlzLl9jaGVja0NhcGFjaXR5KGxlbmd0aCArIDEpO1xuICAgIHZhciBpID0gKHRoaXMuX2Zyb250ICsgbGVuZ3RoKSAmICh0aGlzLl9jYXBhY2l0eSAtIDEpO1xuICAgIHRoaXNbaV0gPSBhcmc7XG4gICAgdGhpcy5fbGVuZ3RoID0gbGVuZ3RoICsgMTtcbn07XG5cblF1ZXVlLnByb3RvdHlwZS5fdW5zaGlmdE9uZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIGNhcGFjaXR5ID0gdGhpcy5fY2FwYWNpdHk7XG4gICAgdGhpcy5fY2hlY2tDYXBhY2l0eSh0aGlzLmxlbmd0aCgpICsgMSk7XG4gICAgdmFyIGZyb250ID0gdGhpcy5fZnJvbnQ7XG4gICAgdmFyIGkgPSAoKCgoIGZyb250IC0gMSApICZcbiAgICAgICAgICAgICAgICAgICAgKCBjYXBhY2l0eSAtIDEpICkgXiBjYXBhY2l0eSApIC0gY2FwYWNpdHkgKTtcbiAgICB0aGlzW2ldID0gdmFsdWU7XG4gICAgdGhpcy5fZnJvbnQgPSBpO1xuICAgIHRoaXMuX2xlbmd0aCA9IHRoaXMubGVuZ3RoKCkgKyAxO1xufTtcblxuUXVldWUucHJvdG90eXBlLnVuc2hpZnQgPSBmdW5jdGlvbihmbiwgcmVjZWl2ZXIsIGFyZykge1xuICAgIHRoaXMuX3Vuc2hpZnRPbmUoYXJnKTtcbiAgICB0aGlzLl91bnNoaWZ0T25lKHJlY2VpdmVyKTtcbiAgICB0aGlzLl91bnNoaWZ0T25lKGZuKTtcbn07XG5cblF1ZXVlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGZuLCByZWNlaXZlciwgYXJnKSB7XG4gICAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoKCkgKyAzO1xuICAgIGlmICh0aGlzLl93aWxsQmVPdmVyQ2FwYWNpdHkobGVuZ3RoKSkge1xuICAgICAgICB0aGlzLl9wdXNoT25lKGZuKTtcbiAgICAgICAgdGhpcy5fcHVzaE9uZShyZWNlaXZlcik7XG4gICAgICAgIHRoaXMuX3B1c2hPbmUoYXJnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaiA9IHRoaXMuX2Zyb250ICsgbGVuZ3RoIC0gMztcbiAgICB0aGlzLl9jaGVja0NhcGFjaXR5KGxlbmd0aCk7XG4gICAgdmFyIHdyYXBNYXNrID0gdGhpcy5fY2FwYWNpdHkgLSAxO1xuICAgIHRoaXNbKGogKyAwKSAmIHdyYXBNYXNrXSA9IGZuO1xuICAgIHRoaXNbKGogKyAxKSAmIHdyYXBNYXNrXSA9IHJlY2VpdmVyO1xuICAgIHRoaXNbKGogKyAyKSAmIHdyYXBNYXNrXSA9IGFyZztcbiAgICB0aGlzLl9sZW5ndGggPSBsZW5ndGg7XG59O1xuXG5RdWV1ZS5wcm90b3R5cGUuc2hpZnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZyb250ID0gdGhpcy5fZnJvbnQsXG4gICAgICAgIHJldCA9IHRoaXNbZnJvbnRdO1xuXG4gICAgdGhpc1tmcm9udF0gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fZnJvbnQgPSAoZnJvbnQgKyAxKSAmICh0aGlzLl9jYXBhY2l0eSAtIDEpO1xuICAgIHRoaXMuX2xlbmd0aC0tO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG5RdWV1ZS5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9sZW5ndGg7XG59O1xuXG5RdWV1ZS5wcm90b3R5cGUuX2NoZWNrQ2FwYWNpdHkgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICAgIGlmICh0aGlzLl9jYXBhY2l0eSA8IHNpemUpIHtcbiAgICAgICAgdGhpcy5fcmVzaXplVG8odGhpcy5fY2FwYWNpdHkgPDwgMSk7XG4gICAgfVxufTtcblxuUXVldWUucHJvdG90eXBlLl9yZXNpemVUbyA9IGZ1bmN0aW9uIChjYXBhY2l0eSkge1xuICAgIHZhciBvbGRDYXBhY2l0eSA9IHRoaXMuX2NhcGFjaXR5O1xuICAgIHRoaXMuX2NhcGFjaXR5ID0gY2FwYWNpdHk7XG4gICAgdmFyIGZyb250ID0gdGhpcy5fZnJvbnQ7XG4gICAgdmFyIGxlbmd0aCA9IHRoaXMuX2xlbmd0aDtcbiAgICB2YXIgbW92ZUl0ZW1zQ291bnQgPSAoZnJvbnQgKyBsZW5ndGgpICYgKG9sZENhcGFjaXR5IC0gMSk7XG4gICAgYXJyYXlNb3ZlKHRoaXMsIDAsIHRoaXMsIG9sZENhcGFjaXR5LCBtb3ZlSXRlbXNDb3VudCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFF1ZXVlO1xuXG59LHt9XSwyOTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oXG4gICAgUHJvbWlzZSwgSU5URVJOQUwsIHRyeUNvbnZlcnRUb1Byb21pc2UsIGFwaVJlamVjdGlvbikge1xudmFyIGlzQXJyYXkgPSBfZGVyZXFfKFwiLi91dGlsLmpzXCIpLmlzQXJyYXk7XG5cbnZhciByYWNlTGF0ZXIgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIHJldHVybiBwcm9taXNlLnRoZW4oZnVuY3Rpb24oYXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIHJhY2UoYXJyYXksIHByb21pc2UpO1xuICAgIH0pO1xufTtcblxuZnVuY3Rpb24gcmFjZShwcm9taXNlcywgcGFyZW50KSB7XG4gICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UocHJvbWlzZXMpO1xuXG4gICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIHJhY2VMYXRlcihtYXliZVByb21pc2UpO1xuICAgIH0gZWxzZSBpZiAoIWlzQXJyYXkocHJvbWlzZXMpKSB7XG4gICAgICAgIHJldHVybiBhcGlSZWplY3Rpb24oXCJleHBlY3RpbmcgYW4gYXJyYXksIGEgcHJvbWlzZSBvciBhIHRoZW5hYmxlXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvczhNTWhjXFx1MDAwYVwiKTtcbiAgICB9XG5cbiAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIGlmIChwYXJlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXQuX3Byb3BhZ2F0ZUZyb20ocGFyZW50LCA0IHwgMSk7XG4gICAgfVxuICAgIHZhciBmdWxmaWxsID0gcmV0Ll9mdWxmaWxsO1xuICAgIHZhciByZWplY3QgPSByZXQuX3JlamVjdDtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcHJvbWlzZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgdmFyIHZhbCA9IHByb21pc2VzW2ldO1xuXG4gICAgICAgIGlmICh2YWwgPT09IHVuZGVmaW5lZCAmJiAhKGkgaW4gcHJvbWlzZXMpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIFByb21pc2UuY2FzdCh2YWwpLl90aGVuKGZ1bGZpbGwsIHJlamVjdCwgdW5kZWZpbmVkLCByZXQsIG51bGwpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG5Qcm9taXNlLnJhY2UgPSBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gcmFjZShwcm9taXNlcywgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnJhY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHJhY2UodGhpcywgdW5kZWZpbmVkKTtcbn07XG5cbn07XG5cbn0se1wiLi91dGlsLmpzXCI6Mzh9XSwzMDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUHJvbWlzZUFycmF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlSZWplY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRyeUNvbnZlcnRUb1Byb21pc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIElOVEVSTkFMKSB7XG52YXIgZ2V0RG9tYWluID0gUHJvbWlzZS5fZ2V0RG9tYWluO1xudmFyIGFzeW5jID0gX2RlcmVxXyhcIi4vYXN5bmMuanNcIik7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWwuanNcIik7XG52YXIgdHJ5Q2F0Y2ggPSB1dGlsLnRyeUNhdGNoO1xudmFyIGVycm9yT2JqID0gdXRpbC5lcnJvck9iajtcbmZ1bmN0aW9uIFJlZHVjdGlvblByb21pc2VBcnJheShwcm9taXNlcywgZm4sIGFjY3VtLCBfZWFjaCkge1xuICAgIHRoaXMuY29uc3RydWN0b3IkKHByb21pc2VzKTtcbiAgICB0aGlzLl9wcm9taXNlLl9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgIHRoaXMuX3ByZXNlcnZlZFZhbHVlcyA9IF9lYWNoID09PSBJTlRFUk5BTCA/IFtdIDogbnVsbDtcbiAgICB0aGlzLl96ZXJvdGhJc0FjY3VtID0gKGFjY3VtID09PSB1bmRlZmluZWQpO1xuICAgIHRoaXMuX2dvdEFjY3VtID0gZmFsc2U7XG4gICAgdGhpcy5fcmVkdWNpbmdJbmRleCA9ICh0aGlzLl96ZXJvdGhJc0FjY3VtID8gMSA6IDApO1xuICAgIHRoaXMuX3ZhbHVlc1BoYXNlID0gdW5kZWZpbmVkO1xuICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKGFjY3VtLCB0aGlzLl9wcm9taXNlKTtcbiAgICB2YXIgcmVqZWN0ZWQgPSBmYWxzZTtcbiAgICB2YXIgaXNQcm9taXNlID0gbWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZTtcbiAgICBpZiAoaXNQcm9taXNlKSB7XG4gICAgICAgIG1heWJlUHJvbWlzZSA9IG1heWJlUHJvbWlzZS5fdGFyZ2V0KCk7XG4gICAgICAgIGlmIChtYXliZVByb21pc2UuX2lzUGVuZGluZygpKSB7XG4gICAgICAgICAgICBtYXliZVByb21pc2UuX3Byb3h5UHJvbWlzZUFycmF5KHRoaXMsIC0xKTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXliZVByb21pc2UuX2lzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgICAgIGFjY3VtID0gbWF5YmVQcm9taXNlLl92YWx1ZSgpO1xuICAgICAgICAgICAgdGhpcy5fZ290QWNjdW0gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcmVqZWN0KG1heWJlUHJvbWlzZS5fcmVhc29uKCkpO1xuICAgICAgICAgICAgcmVqZWN0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICghKGlzUHJvbWlzZSB8fCB0aGlzLl96ZXJvdGhJc0FjY3VtKSkgdGhpcy5fZ290QWNjdW0gPSB0cnVlO1xuICAgIHZhciBkb21haW4gPSBnZXREb21haW4oKTtcbiAgICB0aGlzLl9jYWxsYmFjayA9IGRvbWFpbiA9PT0gbnVsbCA/IGZuIDogZG9tYWluLmJpbmQoZm4pO1xuICAgIHRoaXMuX2FjY3VtID0gYWNjdW07XG4gICAgaWYgKCFyZWplY3RlZCkgYXN5bmMuaW52b2tlKGluaXQsIHRoaXMsIHVuZGVmaW5lZCk7XG59XG5mdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuX2luaXQkKHVuZGVmaW5lZCwgLTUpO1xufVxudXRpbC5pbmhlcml0cyhSZWR1Y3Rpb25Qcm9taXNlQXJyYXksIFByb21pc2VBcnJheSk7XG5cblJlZHVjdGlvblByb21pc2VBcnJheS5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuUmVkdWN0aW9uUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVzb2x2ZUVtcHR5QXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2dvdEFjY3VtIHx8IHRoaXMuX3plcm90aElzQWNjdW0pIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZSh0aGlzLl9wcmVzZXJ2ZWRWYWx1ZXMgIT09IG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgID8gW10gOiB0aGlzLl9hY2N1bSk7XG4gICAgfVxufTtcblxuUmVkdWN0aW9uUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZUZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fdmFsdWVzO1xuICAgIHZhbHVlc1tpbmRleF0gPSB2YWx1ZTtcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcbiAgICB2YXIgcHJlc2VydmVkVmFsdWVzID0gdGhpcy5fcHJlc2VydmVkVmFsdWVzO1xuICAgIHZhciBpc0VhY2ggPSBwcmVzZXJ2ZWRWYWx1ZXMgIT09IG51bGw7XG4gICAgdmFyIGdvdEFjY3VtID0gdGhpcy5fZ290QWNjdW07XG4gICAgdmFyIHZhbHVlc1BoYXNlID0gdGhpcy5fdmFsdWVzUGhhc2U7XG4gICAgdmFyIHZhbHVlc1BoYXNlSW5kZXg7XG4gICAgaWYgKCF2YWx1ZXNQaGFzZSkge1xuICAgICAgICB2YWx1ZXNQaGFzZSA9IHRoaXMuX3ZhbHVlc1BoYXNlID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgICAgIGZvciAodmFsdWVzUGhhc2VJbmRleD0wOyB2YWx1ZXNQaGFzZUluZGV4PGxlbmd0aDsgKyt2YWx1ZXNQaGFzZUluZGV4KSB7XG4gICAgICAgICAgICB2YWx1ZXNQaGFzZVt2YWx1ZXNQaGFzZUluZGV4XSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFsdWVzUGhhc2VJbmRleCA9IHZhbHVlc1BoYXNlW2luZGV4XTtcblxuICAgIGlmIChpbmRleCA9PT0gMCAmJiB0aGlzLl96ZXJvdGhJc0FjY3VtKSB7XG4gICAgICAgIHRoaXMuX2FjY3VtID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX2dvdEFjY3VtID0gZ290QWNjdW0gPSB0cnVlO1xuICAgICAgICB2YWx1ZXNQaGFzZVtpbmRleF0gPSAoKHZhbHVlc1BoYXNlSW5kZXggPT09IDApXG4gICAgICAgICAgICA/IDEgOiAyKTtcbiAgICB9IGVsc2UgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICB0aGlzLl9hY2N1bSA9IHZhbHVlO1xuICAgICAgICB0aGlzLl9nb3RBY2N1bSA9IGdvdEFjY3VtID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodmFsdWVzUGhhc2VJbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgdmFsdWVzUGhhc2VbaW5kZXhdID0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlc1BoYXNlW2luZGV4XSA9IDI7XG4gICAgICAgICAgICB0aGlzLl9hY2N1bSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICghZ290QWNjdW0pIHJldHVybjtcblxuICAgIHZhciBjYWxsYmFjayA9IHRoaXMuX2NhbGxiYWNrO1xuICAgIHZhciByZWNlaXZlciA9IHRoaXMuX3Byb21pc2UuX2JvdW5kVmFsdWUoKTtcbiAgICB2YXIgcmV0O1xuXG4gICAgZm9yICh2YXIgaSA9IHRoaXMuX3JlZHVjaW5nSW5kZXg7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICB2YWx1ZXNQaGFzZUluZGV4ID0gdmFsdWVzUGhhc2VbaV07XG4gICAgICAgIGlmICh2YWx1ZXNQaGFzZUluZGV4ID09PSAyKSB7XG4gICAgICAgICAgICB0aGlzLl9yZWR1Y2luZ0luZGV4ID0gaSArIDE7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzUGhhc2VJbmRleCAhPT0gMSkgcmV0dXJuO1xuICAgICAgICB2YWx1ZSA9IHZhbHVlc1tpXTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZS5fcHVzaENvbnRleHQoKTtcbiAgICAgICAgaWYgKGlzRWFjaCkge1xuICAgICAgICAgICAgcHJlc2VydmVkVmFsdWVzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgcmV0ID0gdHJ5Q2F0Y2goY2FsbGJhY2spLmNhbGwocmVjZWl2ZXIsIHZhbHVlLCBpLCBsZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0ID0gdHJ5Q2F0Y2goY2FsbGJhY2spXG4gICAgICAgICAgICAgICAgLmNhbGwocmVjZWl2ZXIsIHRoaXMuX2FjY3VtLCB2YWx1ZSwgaSwgbGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wcm9taXNlLl9wb3BDb250ZXh0KCk7XG5cbiAgICAgICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHJldHVybiB0aGlzLl9yZWplY3QocmV0LmUpO1xuXG4gICAgICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHJldCwgdGhpcy5fcHJvbWlzZSk7XG4gICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICBtYXliZVByb21pc2UgPSBtYXliZVByb21pc2UuX3RhcmdldCgpO1xuICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZS5faXNQZW5kaW5nKCkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXNQaGFzZVtpXSA9IDQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1heWJlUHJvbWlzZS5fcHJveHlQcm9taXNlQXJyYXkodGhpcywgaSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1heWJlUHJvbWlzZS5faXNGdWxmaWxsZWQoKSkge1xuICAgICAgICAgICAgICAgIHJldCA9IG1heWJlUHJvbWlzZS5fdmFsdWUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlamVjdChtYXliZVByb21pc2UuX3JlYXNvbigpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3JlZHVjaW5nSW5kZXggPSBpICsgMTtcbiAgICAgICAgdGhpcy5fYWNjdW0gPSByZXQ7XG4gICAgfVxuXG4gICAgdGhpcy5fcmVzb2x2ZShpc0VhY2ggPyBwcmVzZXJ2ZWRWYWx1ZXMgOiB0aGlzLl9hY2N1bSk7XG59O1xuXG5mdW5jdGlvbiByZWR1Y2UocHJvbWlzZXMsIGZuLCBpbml0aWFsVmFsdWUsIF9lYWNoKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZm4gbXVzdCBiZSBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvOTE2bEpKXFx1MDAwYVwiKTtcbiAgICB2YXIgYXJyYXkgPSBuZXcgUmVkdWN0aW9uUHJvbWlzZUFycmF5KHByb21pc2VzLCBmbiwgaW5pdGlhbFZhbHVlLCBfZWFjaCk7XG4gICAgcmV0dXJuIGFycmF5LnByb21pc2UoKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUucmVkdWNlID0gZnVuY3Rpb24gKGZuLCBpbml0aWFsVmFsdWUpIHtcbiAgICByZXR1cm4gcmVkdWNlKHRoaXMsIGZuLCBpbml0aWFsVmFsdWUsIG51bGwpO1xufTtcblxuUHJvbWlzZS5yZWR1Y2UgPSBmdW5jdGlvbiAocHJvbWlzZXMsIGZuLCBpbml0aWFsVmFsdWUsIF9lYWNoKSB7XG4gICAgcmV0dXJuIHJlZHVjZShwcm9taXNlcywgZm4sIGluaXRpYWxWYWx1ZSwgX2VhY2gpO1xufTtcbn07XG5cbn0se1wiLi9hc3luYy5qc1wiOjIsXCIuL3V0aWwuanNcIjozOH1dLDMxOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xudmFyIHNjaGVkdWxlO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIG5vQXN5bmNTY2hlZHVsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBhc3luYyBzY2hlZHVsZXIgYXZhaWxhYmxlXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvbTNPVFhrXFx1MDAwYVwiKTtcbn07XG5pZiAodXRpbC5pc05vZGUgJiYgdHlwZW9mIE11dGF0aW9uT2JzZXJ2ZXIgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB2YXIgR2xvYmFsU2V0SW1tZWRpYXRlID0gZ2xvYmFsLnNldEltbWVkaWF0ZTtcbiAgICB2YXIgUHJvY2Vzc05leHRUaWNrID0gcHJvY2Vzcy5uZXh0VGljaztcbiAgICBzY2hlZHVsZSA9IHV0aWwuaXNSZWNlbnROb2RlXG4gICAgICAgICAgICAgICAgPyBmdW5jdGlvbihmbikgeyBHbG9iYWxTZXRJbW1lZGlhdGUuY2FsbChnbG9iYWwsIGZuKTsgfVxuICAgICAgICAgICAgICAgIDogZnVuY3Rpb24oZm4pIHsgUHJvY2Vzc05leHRUaWNrLmNhbGwocHJvY2VzcywgZm4pOyB9O1xufSBlbHNlIGlmICgodHlwZW9mIE11dGF0aW9uT2JzZXJ2ZXIgIT09IFwidW5kZWZpbmVkXCIpICYmXG4gICAgICAgICAgISh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgICAgICB3aW5kb3cubmF2aWdhdG9yICYmXG4gICAgICAgICAgICB3aW5kb3cubmF2aWdhdG9yLnN0YW5kYWxvbmUpKSB7XG4gICAgc2NoZWR1bGUgPSBmdW5jdGlvbihmbikge1xuICAgICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZm4pO1xuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGRpdiwge2F0dHJpYnV0ZXM6IHRydWV9KTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkgeyBkaXYuY2xhc3NMaXN0LnRvZ2dsZShcImZvb1wiKTsgfTtcbiAgICB9O1xuICAgIHNjaGVkdWxlLmlzU3RhdGljID0gdHJ1ZTtcbn0gZWxzZSBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHNjaGVkdWxlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHNldEltbWVkaWF0ZShmbik7XG4gICAgfTtcbn0gZWxzZSBpZiAodHlwZW9mIHNldFRpbWVvdXQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBzY2hlZHVsZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSBlbHNlIHtcbiAgICBzY2hlZHVsZSA9IG5vQXN5bmNTY2hlZHVsZXI7XG59XG5tb2R1bGUuZXhwb3J0cyA9IHNjaGVkdWxlO1xuXG59LHtcIi4vdXRpbFwiOjM4fV0sMzI6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9XG4gICAgZnVuY3Rpb24oUHJvbWlzZSwgUHJvbWlzZUFycmF5KSB7XG52YXIgUHJvbWlzZUluc3BlY3Rpb24gPSBQcm9taXNlLlByb21pc2VJbnNwZWN0aW9uO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsLmpzXCIpO1xuXG5mdW5jdGlvbiBTZXR0bGVkUHJvbWlzZUFycmF5KHZhbHVlcykge1xuICAgIHRoaXMuY29uc3RydWN0b3IkKHZhbHVlcyk7XG59XG51dGlsLmluaGVyaXRzKFNldHRsZWRQcm9taXNlQXJyYXksIFByb21pc2VBcnJheSk7XG5cblNldHRsZWRQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlUmVzb2x2ZWQgPSBmdW5jdGlvbiAoaW5kZXgsIGluc3BlY3Rpb24pIHtcbiAgICB0aGlzLl92YWx1ZXNbaW5kZXhdID0gaW5zcGVjdGlvbjtcbiAgICB2YXIgdG90YWxSZXNvbHZlZCA9ICsrdGhpcy5fdG90YWxSZXNvbHZlZDtcbiAgICBpZiAodG90YWxSZXNvbHZlZCA+PSB0aGlzLl9sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZSh0aGlzLl92YWx1ZXMpO1xuICAgIH1cbn07XG5cblNldHRsZWRQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlRnVsZmlsbGVkID0gZnVuY3Rpb24gKHZhbHVlLCBpbmRleCkge1xuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZUluc3BlY3Rpb24oKTtcbiAgICByZXQuX2JpdEZpZWxkID0gMjY4NDM1NDU2O1xuICAgIHJldC5fc2V0dGxlZFZhbHVlID0gdmFsdWU7XG4gICAgdGhpcy5fcHJvbWlzZVJlc29sdmVkKGluZGV4LCByZXQpO1xufTtcblNldHRsZWRQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlUmVqZWN0ZWQgPSBmdW5jdGlvbiAocmVhc29uLCBpbmRleCkge1xuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZUluc3BlY3Rpb24oKTtcbiAgICByZXQuX2JpdEZpZWxkID0gMTM0MjE3NzI4O1xuICAgIHJldC5fc2V0dGxlZFZhbHVlID0gcmVhc29uO1xuICAgIHRoaXMuX3Byb21pc2VSZXNvbHZlZChpbmRleCwgcmV0KTtcbn07XG5cblByb21pc2Uuc2V0dGxlID0gZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgcmV0dXJuIG5ldyBTZXR0bGVkUHJvbWlzZUFycmF5KHByb21pc2VzKS5wcm9taXNlKCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5zZXR0bGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBTZXR0bGVkUHJvbWlzZUFycmF5KHRoaXMpLnByb21pc2UoKTtcbn07XG59O1xuXG59LHtcIi4vdXRpbC5qc1wiOjM4fV0sMzM6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9XG5mdW5jdGlvbihQcm9taXNlLCBQcm9taXNlQXJyYXksIGFwaVJlamVjdGlvbikge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsLmpzXCIpO1xudmFyIFJhbmdlRXJyb3IgPSBfZGVyZXFfKFwiLi9lcnJvcnMuanNcIikuUmFuZ2VFcnJvcjtcbnZhciBBZ2dyZWdhdGVFcnJvciA9IF9kZXJlcV8oXCIuL2Vycm9ycy5qc1wiKS5BZ2dyZWdhdGVFcnJvcjtcbnZhciBpc0FycmF5ID0gdXRpbC5pc0FycmF5O1xuXG5cbmZ1bmN0aW9uIFNvbWVQcm9taXNlQXJyYXkodmFsdWVzKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3RvciQodmFsdWVzKTtcbiAgICB0aGlzLl9ob3dNYW55ID0gMDtcbiAgICB0aGlzLl91bndyYXAgPSBmYWxzZTtcbiAgICB0aGlzLl9pbml0aWFsaXplZCA9IGZhbHNlO1xufVxudXRpbC5pbmhlcml0cyhTb21lUHJvbWlzZUFycmF5LCBQcm9taXNlQXJyYXkpO1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuX2luaXRpYWxpemVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuX2hvd01hbnkgPT09IDApIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZShbXSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW5pdCQodW5kZWZpbmVkLCAtNSk7XG4gICAgdmFyIGlzQXJyYXlSZXNvbHZlZCA9IGlzQXJyYXkodGhpcy5fdmFsdWVzKTtcbiAgICBpZiAoIXRoaXMuX2lzUmVzb2x2ZWQoKSAmJlxuICAgICAgICBpc0FycmF5UmVzb2x2ZWQgJiZcbiAgICAgICAgdGhpcy5faG93TWFueSA+IHRoaXMuX2NhblBvc3NpYmx5RnVsZmlsbCgpKSB7XG4gICAgICAgIHRoaXMuX3JlamVjdCh0aGlzLl9nZXRSYW5nZUVycm9yKHRoaXMubGVuZ3RoKCkpKTtcbiAgICB9XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB0aGlzLl9pbml0KCk7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5zZXRVbndyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdW53cmFwID0gdHJ1ZTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLmhvd01hbnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hvd01hbnk7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5zZXRIb3dNYW55ID0gZnVuY3Rpb24gKGNvdW50KSB7XG4gICAgdGhpcy5faG93TWFueSA9IGNvdW50O1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX3Byb21pc2VGdWxmaWxsZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB0aGlzLl9hZGRGdWxmaWxsZWQodmFsdWUpO1xuICAgIGlmICh0aGlzLl9mdWxmaWxsZWQoKSA9PT0gdGhpcy5ob3dNYW55KCkpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVzLmxlbmd0aCA9IHRoaXMuaG93TWFueSgpO1xuICAgICAgICBpZiAodGhpcy5ob3dNYW55KCkgPT09IDEgJiYgdGhpcy5fdW53cmFwKSB7XG4gICAgICAgICAgICB0aGlzLl9yZXNvbHZlKHRoaXMuX3ZhbHVlc1swXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZXNvbHZlKHRoaXMuX3ZhbHVlcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbn07XG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZVJlamVjdGVkID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHRoaXMuX2FkZFJlamVjdGVkKHJlYXNvbik7XG4gICAgaWYgKHRoaXMuaG93TWFueSgpID4gdGhpcy5fY2FuUG9zc2libHlGdWxmaWxsKCkpIHtcbiAgICAgICAgdmFyIGUgPSBuZXcgQWdncmVnYXRlRXJyb3IoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IHRoaXMubGVuZ3RoKCk7IGkgPCB0aGlzLl92YWx1ZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGUucHVzaCh0aGlzLl92YWx1ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3JlamVjdChlKTtcbiAgICB9XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fZnVsZmlsbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl90b3RhbFJlc29sdmVkO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX3JlamVjdGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZXMubGVuZ3RoIC0gdGhpcy5sZW5ndGgoKTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9hZGRSZWplY3RlZCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB0aGlzLl92YWx1ZXMucHVzaChyZWFzb24pO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX2FkZEZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuX3ZhbHVlc1t0aGlzLl90b3RhbFJlc29sdmVkKytdID0gdmFsdWU7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fY2FuUG9zc2libHlGdWxmaWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmxlbmd0aCgpIC0gdGhpcy5fcmVqZWN0ZWQoKTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9nZXRSYW5nZUVycm9yID0gZnVuY3Rpb24gKGNvdW50KSB7XG4gICAgdmFyIG1lc3NhZ2UgPSBcIklucHV0IGFycmF5IG11c3QgY29udGFpbiBhdCBsZWFzdCBcIiArXG4gICAgICAgICAgICB0aGlzLl9ob3dNYW55ICsgXCIgaXRlbXMgYnV0IGNvbnRhaW5zIG9ubHkgXCIgKyBjb3VudCArIFwiIGl0ZW1zXCI7XG4gICAgcmV0dXJuIG5ldyBSYW5nZUVycm9yKG1lc3NhZ2UpO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX3Jlc29sdmVFbXB0eUFycmF5ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3JlamVjdCh0aGlzLl9nZXRSYW5nZUVycm9yKDApKTtcbn07XG5cbmZ1bmN0aW9uIHNvbWUocHJvbWlzZXMsIGhvd01hbnkpIHtcbiAgICBpZiAoKGhvd01hbnkgfCAwKSAhPT0gaG93TWFueSB8fCBob3dNYW55IDwgMCkge1xuICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZXhwZWN0aW5nIGEgcG9zaXRpdmUgaW50ZWdlclxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsLzF3QW1IeFxcdTAwMGFcIik7XG4gICAgfVxuICAgIHZhciByZXQgPSBuZXcgU29tZVByb21pc2VBcnJheShwcm9taXNlcyk7XG4gICAgdmFyIHByb21pc2UgPSByZXQucHJvbWlzZSgpO1xuICAgIHJldC5zZXRIb3dNYW55KGhvd01hbnkpO1xuICAgIHJldC5pbml0KCk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cblByb21pc2Uuc29tZSA9IGZ1bmN0aW9uIChwcm9taXNlcywgaG93TWFueSkge1xuICAgIHJldHVybiBzb21lKHByb21pc2VzLCBob3dNYW55KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnNvbWUgPSBmdW5jdGlvbiAoaG93TWFueSkge1xuICAgIHJldHVybiBzb21lKHRoaXMsIGhvd01hbnkpO1xufTtcblxuUHJvbWlzZS5fU29tZVByb21pc2VBcnJheSA9IFNvbWVQcm9taXNlQXJyYXk7XG59O1xuXG59LHtcIi4vZXJyb3JzLmpzXCI6MTMsXCIuL3V0aWwuanNcIjozOH1dLDM0OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlKSB7XG5mdW5jdGlvbiBQcm9taXNlSW5zcGVjdGlvbihwcm9taXNlKSB7XG4gICAgaWYgKHByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwcm9taXNlID0gcHJvbWlzZS5fdGFyZ2V0KCk7XG4gICAgICAgIHRoaXMuX2JpdEZpZWxkID0gcHJvbWlzZS5fYml0RmllbGQ7XG4gICAgICAgIHRoaXMuX3NldHRsZWRWYWx1ZSA9IHByb21pc2UuX3NldHRsZWRWYWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2JpdEZpZWxkID0gMDtcbiAgICAgICAgdGhpcy5fc2V0dGxlZFZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5pc0Z1bGZpbGxlZCgpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgZ2V0IGZ1bGZpbGxtZW50IHZhbHVlIG9mIGEgbm9uLWZ1bGZpbGxlZCBwcm9taXNlXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvaGMxRExqXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3NldHRsZWRWYWx1ZTtcbn07XG5cblByb21pc2VJbnNwZWN0aW9uLnByb3RvdHlwZS5lcnJvciA9XG5Qcm9taXNlSW5zcGVjdGlvbi5wcm90b3R5cGUucmVhc29uID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5pc1JlamVjdGVkKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCBnZXQgcmVqZWN0aW9uIHJlYXNvbiBvZiBhIG5vbi1yZWplY3RlZCBwcm9taXNlXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvaFB1aXdCXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3NldHRsZWRWYWx1ZTtcbn07XG5cblByb21pc2VJbnNwZWN0aW9uLnByb3RvdHlwZS5pc0Z1bGZpbGxlZCA9XG5Qcm9taXNlLnByb3RvdHlwZS5faXNGdWxmaWxsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDI2ODQzNTQ1NikgPiAwO1xufTtcblxuUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLmlzUmVqZWN0ZWQgPVxuUHJvbWlzZS5wcm90b3R5cGUuX2lzUmVqZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDEzNDIxNzcyOCkgPiAwO1xufTtcblxuUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLmlzUGVuZGluZyA9XG5Qcm9taXNlLnByb3RvdHlwZS5faXNQZW5kaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiA0MDI2NTMxODQpID09PSAwO1xufTtcblxuUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLmlzUmVzb2x2ZWQgPVxuUHJvbWlzZS5wcm90b3R5cGUuX2lzUmVzb2x2ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDQwMjY1MzE4NCkgPiAwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuaXNQZW5kaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldCgpLl9pc1BlbmRpbmcoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmlzUmVqZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0KCkuX2lzUmVqZWN0ZWQoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmlzRnVsZmlsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldCgpLl9pc0Z1bGZpbGxlZCgpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuaXNSZXNvbHZlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl90YXJnZXQoKS5faXNSZXNvbHZlZCgpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3ZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NldHRsZWRWYWx1ZTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZWFzb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl91bnNldFJlamVjdGlvbklzVW5oYW5kbGVkKCk7XG4gICAgcmV0dXJuIHRoaXMuX3NldHRsZWRWYWx1ZTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRhcmdldCA9IHRoaXMuX3RhcmdldCgpO1xuICAgIGlmICghdGFyZ2V0LmlzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCBnZXQgZnVsZmlsbG1lbnQgdmFsdWUgb2YgYSBub24tZnVsZmlsbGVkIHByb21pc2VcXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9oYzFETGpcXHUwMDBhXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0Ll9zZXR0bGVkVmFsdWU7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5yZWFzb24gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0KCk7XG4gICAgaWYgKCF0YXJnZXQuaXNSZWplY3RlZCgpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgZ2V0IHJlamVjdGlvbiByZWFzb24gb2YgYSBub24tcmVqZWN0ZWQgcHJvbWlzZVxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL2hQdWl3QlxcdTAwMGFcIik7XG4gICAgfVxuICAgIHRhcmdldC5fdW5zZXRSZWplY3Rpb25Jc1VuaGFuZGxlZCgpO1xuICAgIHJldHVybiB0YXJnZXQuX3NldHRsZWRWYWx1ZTtcbn07XG5cblxuUHJvbWlzZS5Qcm9taXNlSW5zcGVjdGlvbiA9IFByb21pc2VJbnNwZWN0aW9uO1xufTtcblxufSx7fV0sMzU6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsIElOVEVSTkFMKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWwuanNcIik7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xudmFyIGlzT2JqZWN0ID0gdXRpbC5pc09iamVjdDtcblxuZnVuY3Rpb24gdHJ5Q29udmVydFRvUHJvbWlzZShvYmosIGNvbnRleHQpIHtcbiAgICBpZiAoaXNPYmplY3Qob2JqKSkge1xuICAgICAgICBpZiAob2JqIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc0FueUJsdWViaXJkUHJvbWlzZShvYmopKSB7XG4gICAgICAgICAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgICAgICAgICAgb2JqLl90aGVuKFxuICAgICAgICAgICAgICAgIHJldC5fZnVsZmlsbFVuY2hlY2tlZCxcbiAgICAgICAgICAgICAgICByZXQuX3JlamVjdFVuY2hlY2tlZENoZWNrRXJyb3IsXG4gICAgICAgICAgICAgICAgcmV0Ll9wcm9ncmVzc1VuY2hlY2tlZCxcbiAgICAgICAgICAgICAgICByZXQsXG4gICAgICAgICAgICAgICAgbnVsbFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRoZW4gPSB1dGlsLnRyeUNhdGNoKGdldFRoZW4pKG9iaik7XG4gICAgICAgIGlmICh0aGVuID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgaWYgKGNvbnRleHQpIGNvbnRleHQuX3B1c2hDb250ZXh0KCk7XG4gICAgICAgICAgICB2YXIgcmV0ID0gUHJvbWlzZS5yZWplY3QodGhlbi5lKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0KSBjb250ZXh0Ll9wb3BDb250ZXh0KCk7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGVuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBkb1RoZW5hYmxlKG9iaiwgdGhlbiwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gZ2V0VGhlbihvYmopIHtcbiAgICByZXR1cm4gb2JqLnRoZW47XG59XG5cbnZhciBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG5mdW5jdGlvbiBpc0FueUJsdWViaXJkUHJvbWlzZShvYmopIHtcbiAgICByZXR1cm4gaGFzUHJvcC5jYWxsKG9iaiwgXCJfcHJvbWlzZTBcIik7XG59XG5cbmZ1bmN0aW9uIGRvVGhlbmFibGUoeCwgdGhlbiwgY29udGV4dCkge1xuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIHZhciByZXQgPSBwcm9taXNlO1xuICAgIGlmIChjb250ZXh0KSBjb250ZXh0Ll9wdXNoQ29udGV4dCgpO1xuICAgIHByb21pc2UuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgaWYgKGNvbnRleHQpIGNvbnRleHQuX3BvcENvbnRleHQoKTtcbiAgICB2YXIgc3luY2hyb25vdXMgPSB0cnVlO1xuICAgIHZhciByZXN1bHQgPSB1dGlsLnRyeUNhdGNoKHRoZW4pLmNhbGwoeCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlRnJvbVRoZW5hYmxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdEZyb21UaGVuYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzc0Zyb21UaGVuYWJsZSk7XG4gICAgc3luY2hyb25vdXMgPSBmYWxzZTtcbiAgICBpZiAocHJvbWlzZSAmJiByZXN1bHQgPT09IGVycm9yT2JqKSB7XG4gICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKHJlc3VsdC5lLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgcHJvbWlzZSA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZUZyb21UaGVuYWJsZSh2YWx1ZSkge1xuICAgICAgICBpZiAoIXByb21pc2UpIHJldHVybjtcbiAgICAgICAgcHJvbWlzZS5fcmVzb2x2ZUNhbGxiYWNrKHZhbHVlKTtcbiAgICAgICAgcHJvbWlzZSA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVqZWN0RnJvbVRoZW5hYmxlKHJlYXNvbikge1xuICAgICAgICBpZiAoIXByb21pc2UpIHJldHVybjtcbiAgICAgICAgcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2socmVhc29uLCBzeW5jaHJvbm91cywgdHJ1ZSk7XG4gICAgICAgIHByb21pc2UgPSBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByb2dyZXNzRnJvbVRoZW5hYmxlKHZhbHVlKSB7XG4gICAgICAgIGlmICghcHJvbWlzZSkgcmV0dXJuO1xuICAgICAgICBpZiAodHlwZW9mIHByb21pc2UuX3Byb2dyZXNzID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHByb21pc2UuX3Byb2dyZXNzKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG5yZXR1cm4gdHJ5Q29udmVydFRvUHJvbWlzZTtcbn07XG5cbn0se1wiLi91dGlsLmpzXCI6Mzh9XSwzNjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgSU5URVJOQUwpIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbC5qc1wiKTtcbnZhciBUaW1lb3V0RXJyb3IgPSBQcm9taXNlLlRpbWVvdXRFcnJvcjtcblxudmFyIGFmdGVyVGltZW91dCA9IGZ1bmN0aW9uIChwcm9taXNlLCBtZXNzYWdlKSB7XG4gICAgaWYgKCFwcm9taXNlLmlzUGVuZGluZygpKSByZXR1cm47XG4gICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIG1lc3NhZ2UgPSBcIm9wZXJhdGlvbiB0aW1lZCBvdXRcIjtcbiAgICB9XG4gICAgdmFyIGVyciA9IG5ldyBUaW1lb3V0RXJyb3IobWVzc2FnZSk7XG4gICAgdXRpbC5tYXJrQXNPcmlnaW5hdGluZ0Zyb21SZWplY3Rpb24oZXJyKTtcbiAgICBwcm9taXNlLl9hdHRhY2hFeHRyYVRyYWNlKGVycik7XG4gICAgcHJvbWlzZS5fY2FuY2VsKGVycik7XG59O1xuXG52YXIgYWZ0ZXJWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiBkZWxheSgrdGhpcykudGhlblJldHVybih2YWx1ZSk7IH07XG52YXIgZGVsYXkgPSBQcm9taXNlLmRlbGF5ID0gZnVuY3Rpb24gKHZhbHVlLCBtcykge1xuICAgIGlmIChtcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG1zID0gdmFsdWU7XG4gICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyByZXQuX2Z1bGZpbGwoKTsgfSwgbXMpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgICBtcyA9ICttcztcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS5fdGhlbihhZnRlclZhbHVlLCBudWxsLCBudWxsLCBtcywgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKG1zKSB7XG4gICAgcmV0dXJuIGRlbGF5KHRoaXMsIG1zKTtcbn07XG5cbmZ1bmN0aW9uIHN1Y2Nlc3NDbGVhcih2YWx1ZSkge1xuICAgIHZhciBoYW5kbGUgPSB0aGlzO1xuICAgIGlmIChoYW5kbGUgaW5zdGFuY2VvZiBOdW1iZXIpIGhhbmRsZSA9ICtoYW5kbGU7XG4gICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBmYWlsdXJlQ2xlYXIocmVhc29uKSB7XG4gICAgdmFyIGhhbmRsZSA9IHRoaXM7XG4gICAgaWYgKGhhbmRsZSBpbnN0YW5jZW9mIE51bWJlcikgaGFuZGxlID0gK2hhbmRsZTtcbiAgICBjbGVhclRpbWVvdXQoaGFuZGxlKTtcbiAgICB0aHJvdyByZWFzb247XG59XG5cblByb21pc2UucHJvdG90eXBlLnRpbWVvdXQgPSBmdW5jdGlvbiAobXMsIG1lc3NhZ2UpIHtcbiAgICBtcyA9ICttcztcbiAgICB2YXIgcmV0ID0gdGhpcy50aGVuKCkuY2FuY2VsbGFibGUoKTtcbiAgICByZXQuX2NhbmNlbGxhdGlvblBhcmVudCA9IHRoaXM7XG4gICAgdmFyIGhhbmRsZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24gdGltZW91dFRpbWVvdXQoKSB7XG4gICAgICAgIGFmdGVyVGltZW91dChyZXQsIG1lc3NhZ2UpO1xuICAgIH0sIG1zKTtcbiAgICByZXR1cm4gcmV0Ll90aGVuKHN1Y2Nlc3NDbGVhciwgZmFpbHVyZUNsZWFyLCB1bmRlZmluZWQsIGhhbmRsZSwgdW5kZWZpbmVkKTtcbn07XG5cbn07XG5cbn0se1wiLi91dGlsLmpzXCI6Mzh9XSwzNzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKFByb21pc2UsIGFwaVJlamVjdGlvbiwgdHJ5Q29udmVydFRvUHJvbWlzZSxcbiAgICBjcmVhdGVDb250ZXh0KSB7XG4gICAgdmFyIFR5cGVFcnJvciA9IF9kZXJlcV8oXCIuL2Vycm9ycy5qc1wiKS5UeXBlRXJyb3I7XG4gICAgdmFyIGluaGVyaXRzID0gX2RlcmVxXyhcIi4vdXRpbC5qc1wiKS5pbmhlcml0cztcbiAgICB2YXIgUHJvbWlzZUluc3BlY3Rpb24gPSBQcm9taXNlLlByb21pc2VJbnNwZWN0aW9uO1xuXG4gICAgZnVuY3Rpb24gaW5zcGVjdGlvbk1hcHBlcihpbnNwZWN0aW9ucykge1xuICAgICAgICB2YXIgbGVuID0gaW5zcGVjdGlvbnMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICB2YXIgaW5zcGVjdGlvbiA9IGluc3BlY3Rpb25zW2ldO1xuICAgICAgICAgICAgaWYgKGluc3BlY3Rpb24uaXNSZWplY3RlZCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGluc3BlY3Rpb24uZXJyb3IoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbnNwZWN0aW9uc1tpXSA9IGluc3BlY3Rpb24uX3NldHRsZWRWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5zcGVjdGlvbnM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dlcihlKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXt0aHJvdyBlO30sIDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhc3RQcmVzZXJ2aW5nRGlzcG9zYWJsZSh0aGVuYWJsZSkge1xuICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZSh0aGVuYWJsZSk7XG4gICAgICAgIGlmIChtYXliZVByb21pc2UgIT09IHRoZW5hYmxlICYmXG4gICAgICAgICAgICB0eXBlb2YgdGhlbmFibGUuX2lzRGlzcG9zYWJsZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICB0eXBlb2YgdGhlbmFibGUuX2dldERpc3Bvc2VyID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgIHRoZW5hYmxlLl9pc0Rpc3Bvc2FibGUoKSkge1xuICAgICAgICAgICAgbWF5YmVQcm9taXNlLl9zZXREaXNwb3NhYmxlKHRoZW5hYmxlLl9nZXREaXNwb3NlcigpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF5YmVQcm9taXNlO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkaXNwb3NlKHJlc291cmNlcywgaW5zcGVjdGlvbikge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBsZW4gPSByZXNvdXJjZXMubGVuZ3RoO1xuICAgICAgICB2YXIgcmV0ID0gUHJvbWlzZS5kZWZlcigpO1xuICAgICAgICBmdW5jdGlvbiBpdGVyYXRvcigpIHtcbiAgICAgICAgICAgIGlmIChpID49IGxlbikgcmV0dXJuIHJldC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gY2FzdFByZXNlcnZpbmdEaXNwb3NhYmxlKHJlc291cmNlc1tpKytdKTtcbiAgICAgICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlICYmXG4gICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlLl9pc0Rpc3Bvc2FibGUoKSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXliZVByb21pc2UuX2dldERpc3Bvc2VyKCkudHJ5RGlzcG9zZShpbnNwZWN0aW9uKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcy5wcm9taXNlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aHJvd2VyKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWF5YmVQcm9taXNlLl90aGVuKGl0ZXJhdG9yLCB0aHJvd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsIG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZXJhdG9yKCk7XG4gICAgICAgIH1cbiAgICAgICAgaXRlcmF0b3IoKTtcbiAgICAgICAgcmV0dXJuIHJldC5wcm9taXNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpc3Bvc2VyU3VjY2Vzcyh2YWx1ZSkge1xuICAgICAgICB2YXIgaW5zcGVjdGlvbiA9IG5ldyBQcm9taXNlSW5zcGVjdGlvbigpO1xuICAgICAgICBpbnNwZWN0aW9uLl9zZXR0bGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgaW5zcGVjdGlvbi5fYml0RmllbGQgPSAyNjg0MzU0NTY7XG4gICAgICAgIHJldHVybiBkaXNwb3NlKHRoaXMsIGluc3BlY3Rpb24pLnRoZW5SZXR1cm4odmFsdWUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpc3Bvc2VyRmFpbChyZWFzb24pIHtcbiAgICAgICAgdmFyIGluc3BlY3Rpb24gPSBuZXcgUHJvbWlzZUluc3BlY3Rpb24oKTtcbiAgICAgICAgaW5zcGVjdGlvbi5fc2V0dGxlZFZhbHVlID0gcmVhc29uO1xuICAgICAgICBpbnNwZWN0aW9uLl9iaXRGaWVsZCA9IDEzNDIxNzcyODtcbiAgICAgICAgcmV0dXJuIGRpc3Bvc2UodGhpcywgaW5zcGVjdGlvbikudGhlblRocm93KHJlYXNvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gRGlzcG9zZXIoZGF0YSwgcHJvbWlzZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZSA9IHByb21pc2U7XG4gICAgICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIH1cblxuICAgIERpc3Bvc2VyLnByb3RvdHlwZS5kYXRhID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGF0YTtcbiAgICB9O1xuXG4gICAgRGlzcG9zZXIucHJvdG90eXBlLnByb21pc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcm9taXNlO1xuICAgIH07XG5cbiAgICBEaXNwb3Nlci5wcm90b3R5cGUucmVzb3VyY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnByb21pc2UoKS5pc0Z1bGZpbGxlZCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9taXNlKCkudmFsdWUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgRGlzcG9zZXIucHJvdG90eXBlLnRyeURpc3Bvc2UgPSBmdW5jdGlvbihpbnNwZWN0aW9uKSB7XG4gICAgICAgIHZhciByZXNvdXJjZSA9IHRoaXMucmVzb3VyY2UoKTtcbiAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLl9jb250ZXh0O1xuICAgICAgICBpZiAoY29udGV4dCAhPT0gdW5kZWZpbmVkKSBjb250ZXh0Ll9wdXNoQ29udGV4dCgpO1xuICAgICAgICB2YXIgcmV0ID0gcmVzb3VyY2UgIT09IG51bGxcbiAgICAgICAgICAgID8gdGhpcy5kb0Rpc3Bvc2UocmVzb3VyY2UsIGluc3BlY3Rpb24pIDogbnVsbDtcbiAgICAgICAgaWYgKGNvbnRleHQgIT09IHVuZGVmaW5lZCkgY29udGV4dC5fcG9wQ29udGV4dCgpO1xuICAgICAgICB0aGlzLl9wcm9taXNlLl91bnNldERpc3Bvc2FibGUoKTtcbiAgICAgICAgdGhpcy5fZGF0YSA9IG51bGw7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIERpc3Bvc2VyLmlzRGlzcG9zZXIgPSBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gKGQgIT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBkLnJlc291cmNlID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2YgZC50cnlEaXNwb3NlID09PSBcImZ1bmN0aW9uXCIpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBGdW5jdGlvbkRpc3Bvc2VyKGZuLCBwcm9taXNlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3IkKGZuLCBwcm9taXNlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgaW5oZXJpdHMoRnVuY3Rpb25EaXNwb3NlciwgRGlzcG9zZXIpO1xuXG4gICAgRnVuY3Rpb25EaXNwb3Nlci5wcm90b3R5cGUuZG9EaXNwb3NlID0gZnVuY3Rpb24gKHJlc291cmNlLCBpbnNwZWN0aW9uKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMuZGF0YSgpO1xuICAgICAgICByZXR1cm4gZm4uY2FsbChyZXNvdXJjZSwgcmVzb3VyY2UsIGluc3BlY3Rpb24pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBtYXliZVVud3JhcERpc3Bvc2VyKHZhbHVlKSB7XG4gICAgICAgIGlmIChEaXNwb3Nlci5pc0Rpc3Bvc2VyKHZhbHVlKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNvdXJjZXNbdGhpcy5pbmRleF0uX3NldERpc3Bvc2FibGUodmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnByb21pc2UoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgUHJvbWlzZS51c2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGlmIChsZW4gPCAyKSByZXR1cm4gYXBpUmVqZWN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5b3UgbXVzdCBwYXNzIGF0IGxlYXN0IDIgYXJndW1lbnRzIHRvIFByb21pc2UudXNpbmdcIik7XG4gICAgICAgIHZhciBmbiA9IGFyZ3VtZW50c1tsZW4gLSAxXTtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZm4gbXVzdCBiZSBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvOTE2bEpKXFx1MDAwYVwiKTtcbiAgICAgICAgbGVuLS07XG4gICAgICAgIHZhciByZXNvdXJjZXMgPSBuZXcgQXJyYXkobGVuKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKERpc3Bvc2VyLmlzRGlzcG9zZXIocmVzb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3Bvc2VyID0gcmVzb3VyY2U7XG4gICAgICAgICAgICAgICAgcmVzb3VyY2UgPSByZXNvdXJjZS5wcm9taXNlKCk7XG4gICAgICAgICAgICAgICAgcmVzb3VyY2UuX3NldERpc3Bvc2FibGUoZGlzcG9zZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZShyZXNvdXJjZSk7XG4gICAgICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2UgPVxuICAgICAgICAgICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlLl90aGVuKG1heWJlVW53cmFwRGlzcG9zZXIsIG51bGwsIG51bGwsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IHJlc291cmNlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogaVxuICAgICAgICAgICAgICAgICAgICB9LCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc291cmNlc1tpXSA9IHJlc291cmNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb21pc2UgPSBQcm9taXNlLnNldHRsZShyZXNvdXJjZXMpXG4gICAgICAgICAgICAudGhlbihpbnNwZWN0aW9uTWFwcGVyKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odmFscykge1xuICAgICAgICAgICAgICAgIHByb21pc2UuX3B1c2hDb250ZXh0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSBmbi5hcHBseSh1bmRlZmluZWQsIHZhbHMpO1xuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuX3RoZW4oXG4gICAgICAgICAgICAgICAgZGlzcG9zZXJTdWNjZXNzLCBkaXNwb3NlckZhaWwsIHVuZGVmaW5lZCwgcmVzb3VyY2VzLCB1bmRlZmluZWQpO1xuICAgICAgICByZXNvdXJjZXMucHJvbWlzZSA9IHByb21pc2U7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZS5fc2V0RGlzcG9zYWJsZSA9IGZ1bmN0aW9uIChkaXNwb3Nlcikge1xuICAgICAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgMjYyMTQ0O1xuICAgICAgICB0aGlzLl9kaXNwb3NlciA9IGRpc3Bvc2VyO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZS5faXNEaXNwb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgMjYyMTQ0KSA+IDA7XG4gICAgfTtcblxuICAgIFByb21pc2UucHJvdG90eXBlLl9nZXREaXNwb3NlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Rpc3Bvc2VyO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZS5fdW5zZXREaXNwb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkICYgKH4yNjIxNDQpO1xuICAgICAgICB0aGlzLl9kaXNwb3NlciA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5wcm90b3R5cGUuZGlzcG9zZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZ1bmN0aW9uRGlzcG9zZXIoZm4sIHRoaXMsIGNyZWF0ZUNvbnRleHQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICAgIH07XG5cbn07XG5cbn0se1wiLi9lcnJvcnMuanNcIjoxMyxcIi4vdXRpbC5qc1wiOjM4fV0sMzg6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZXM1ID0gX2RlcmVxXyhcIi4vZXM1LmpzXCIpO1xudmFyIGNhbkV2YWx1YXRlID0gdHlwZW9mIG5hdmlnYXRvciA9PSBcInVuZGVmaW5lZFwiO1xudmFyIGhhdmVHZXR0ZXJzID0gKGZ1bmN0aW9uKCl7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIG8gPSB7fTtcbiAgICAgICAgZXM1LmRlZmluZVByb3BlcnR5KG8sIFwiZlwiLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvLmYgPT09IDM7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbn0pKCk7XG5cbnZhciBlcnJvck9iaiA9IHtlOiB7fX07XG52YXIgdHJ5Q2F0Y2hUYXJnZXQ7XG5mdW5jdGlvbiB0cnlDYXRjaGVyKCkge1xuICAgIHRyeSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSB0cnlDYXRjaFRhcmdldDtcbiAgICAgICAgdHJ5Q2F0Y2hUYXJnZXQgPSBudWxsO1xuICAgICAgICByZXR1cm4gdGFyZ2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBlcnJvck9iai5lID0gZTtcbiAgICAgICAgcmV0dXJuIGVycm9yT2JqO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHRyeUNhdGNoKGZuKSB7XG4gICAgdHJ5Q2F0Y2hUYXJnZXQgPSBmbjtcbiAgICByZXR1cm4gdHJ5Q2F0Y2hlcjtcbn1cblxudmFyIGluaGVyaXRzID0gZnVuY3Rpb24oQ2hpbGQsIFBhcmVudCkge1xuICAgIHZhciBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG5cbiAgICBmdW5jdGlvbiBUKCkge1xuICAgICAgICB0aGlzLmNvbnN0cnVjdG9yID0gQ2hpbGQ7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3IkID0gUGFyZW50O1xuICAgICAgICBmb3IgKHZhciBwcm9wZXJ0eU5hbWUgaW4gUGFyZW50LnByb3RvdHlwZSkge1xuICAgICAgICAgICAgaWYgKGhhc1Byb3AuY2FsbChQYXJlbnQucHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUpICYmXG4gICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lLmNoYXJBdChwcm9wZXJ0eU5hbWUubGVuZ3RoLTEpICE9PSBcIiRcIlxuICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB0aGlzW3Byb3BlcnR5TmFtZSArIFwiJFwiXSA9IFBhcmVudC5wcm90b3R5cGVbcHJvcGVydHlOYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBULnByb3RvdHlwZSA9IFBhcmVudC5wcm90b3R5cGU7XG4gICAgQ2hpbGQucHJvdG90eXBlID0gbmV3IFQoKTtcbiAgICByZXR1cm4gQ2hpbGQucHJvdG90eXBlO1xufTtcblxuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZSh2YWwpIHtcbiAgICByZXR1cm4gdmFsID09IG51bGwgfHwgdmFsID09PSB0cnVlIHx8IHZhbCA9PT0gZmFsc2UgfHxcbiAgICAgICAgdHlwZW9mIHZhbCA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgdmFsID09PSBcIm51bWJlclwiO1xuXG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgcmV0dXJuICFpc1ByaW1pdGl2ZSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIG1heWJlV3JhcEFzRXJyb3IobWF5YmVFcnJvcikge1xuICAgIGlmICghaXNQcmltaXRpdmUobWF5YmVFcnJvcikpIHJldHVybiBtYXliZUVycm9yO1xuXG4gICAgcmV0dXJuIG5ldyBFcnJvcihzYWZlVG9TdHJpbmcobWF5YmVFcnJvcikpO1xufVxuXG5mdW5jdGlvbiB3aXRoQXBwZW5kZWQodGFyZ2V0LCBhcHBlbmRlZSkge1xuICAgIHZhciBsZW4gPSB0YXJnZXQubGVuZ3RoO1xuICAgIHZhciByZXQgPSBuZXcgQXJyYXkobGVuICsgMSk7XG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIHJldFtpXSA9IHRhcmdldFtpXTtcbiAgICB9XG4gICAgcmV0W2ldID0gYXBwZW5kZWU7XG4gICAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gZ2V0RGF0YVByb3BlcnR5T3JEZWZhdWx0KG9iaiwga2V5LCBkZWZhdWx0VmFsdWUpIHtcbiAgICBpZiAoZXM1LmlzRVM1KSB7XG4gICAgICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSk7XG5cbiAgICAgICAgaWYgKGRlc2MgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlc2MuZ2V0ID09IG51bGwgJiYgZGVzYy5zZXQgPT0gbnVsbFxuICAgICAgICAgICAgICAgICAgICA/IGRlc2MudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgOiBkZWZhdWx0VmFsdWU7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ge30uaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkgPyBvYmpba2V5XSA6IHVuZGVmaW5lZDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIG5vdEVudW1lcmFibGVQcm9wKG9iaiwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAoaXNQcmltaXRpdmUob2JqKSkgcmV0dXJuIG9iajtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH07XG4gICAgZXM1LmRlZmluZVByb3BlcnR5KG9iaiwgbmFtZSwgZGVzY3JpcHRvcik7XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gdGhyb3dlcihyKSB7XG4gICAgdGhyb3cgcjtcbn1cblxudmFyIGluaGVyaXRlZERhdGFLZXlzID0gKGZ1bmN0aW9uKCkge1xuICAgIHZhciBleGNsdWRlZFByb3RvdHlwZXMgPSBbXG4gICAgICAgIEFycmF5LnByb3RvdHlwZSxcbiAgICAgICAgT2JqZWN0LnByb3RvdHlwZSxcbiAgICAgICAgRnVuY3Rpb24ucHJvdG90eXBlXG4gICAgXTtcblxuICAgIHZhciBpc0V4Y2x1ZGVkUHJvdG8gPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBleGNsdWRlZFByb3RvdHlwZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChleGNsdWRlZFByb3RvdHlwZXNbaV0gPT09IHZhbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgaWYgKGVzNS5pc0VTNSkge1xuICAgICAgICB2YXIgZ2V0S2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICB2YXIgdmlzaXRlZEtleXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICAgICAgd2hpbGUgKG9iaiAhPSBudWxsICYmICFpc0V4Y2x1ZGVkUHJvdG8ob2JqKSkge1xuICAgICAgICAgICAgICAgIHZhciBrZXlzO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKG9iaik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aXNpdGVkS2V5c1trZXldKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgdmlzaXRlZEtleXNba2V5XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXNjICE9IG51bGwgJiYgZGVzYy5nZXQgPT0gbnVsbCAmJiBkZXNjLnNldCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXQucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9iaiA9IGVzNS5nZXRQcm90b3R5cGVPZihvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaGFzUHJvcCA9IHt9Lmhhc093blByb3BlcnR5O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgICAgICBpZiAoaXNFeGNsdWRlZFByb3RvKG9iaikpIHJldHVybiBbXTtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cbiAgICAgICAgICAgIGVudW1lcmF0aW9uOiBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhc1Byb3AuY2FsbChvYmosIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV4Y2x1ZGVkUHJvdG90eXBlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc1Byb3AuY2FsbChleGNsdWRlZFByb3RvdHlwZXNbaV0sIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBlbnVtZXJhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH07XG4gICAgfVxuXG59KSgpO1xuXG52YXIgdGhpc0Fzc2lnbm1lbnRQYXR0ZXJuID0gL3RoaXNcXHMqXFwuXFxzKlxcUytcXHMqPS87XG5mdW5jdGlvbiBpc0NsYXNzKGZuKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IGVzNS5uYW1lcyhmbi5wcm90b3R5cGUpO1xuXG4gICAgICAgICAgICB2YXIgaGFzTWV0aG9kcyA9IGVzNS5pc0VTNSAmJiBrZXlzLmxlbmd0aCA+IDE7XG4gICAgICAgICAgICB2YXIgaGFzTWV0aG9kc090aGVyVGhhbkNvbnN0cnVjdG9yID0ga2V5cy5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICAgICAgIShrZXlzLmxlbmd0aCA9PT0gMSAmJiBrZXlzWzBdID09PSBcImNvbnN0cnVjdG9yXCIpO1xuICAgICAgICAgICAgdmFyIGhhc1RoaXNBc3NpZ25tZW50QW5kU3RhdGljTWV0aG9kcyA9XG4gICAgICAgICAgICAgICAgdGhpc0Fzc2lnbm1lbnRQYXR0ZXJuLnRlc3QoZm4gKyBcIlwiKSAmJiBlczUubmFtZXMoZm4pLmxlbmd0aCA+IDA7XG5cbiAgICAgICAgICAgIGlmIChoYXNNZXRob2RzIHx8IGhhc01ldGhvZHNPdGhlclRoYW5Db25zdHJ1Y3RvciB8fFxuICAgICAgICAgICAgICAgIGhhc1RoaXNBc3NpZ25tZW50QW5kU3RhdGljTWV0aG9kcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRvRmFzdFByb3BlcnRpZXMob2JqKSB7XG4gICAgLypqc2hpbnQgLVcwMjcsLVcwNTUsLVcwMzEqL1xuICAgIGZ1bmN0aW9uIGYoKSB7fVxuICAgIGYucHJvdG90eXBlID0gb2JqO1xuICAgIHZhciBsID0gODtcbiAgICB3aGlsZSAobC0tKSBuZXcgZigpO1xuICAgIHJldHVybiBvYmo7XG4gICAgZXZhbChvYmopO1xufVxuXG52YXIgcmlkZW50ID0gL15bYS16JF9dW2EteiRfMC05XSokL2k7XG5mdW5jdGlvbiBpc0lkZW50aWZpZXIoc3RyKSB7XG4gICAgcmV0dXJuIHJpZGVudC50ZXN0KHN0cik7XG59XG5cbmZ1bmN0aW9uIGZpbGxlZFJhbmdlKGNvdW50LCBwcmVmaXgsIHN1ZmZpeCkge1xuICAgIHZhciByZXQgPSBuZXcgQXJyYXkoY291bnQpO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBjb3VudDsgKytpKSB7XG4gICAgICAgIHJldFtpXSA9IHByZWZpeCArIGkgKyBzdWZmaXg7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIHNhZmVUb1N0cmluZyhvYmopIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gb2JqICsgXCJcIjtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBcIltubyBzdHJpbmcgcmVwcmVzZW50YXRpb25dXCI7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBtYXJrQXNPcmlnaW5hdGluZ0Zyb21SZWplY3Rpb24oZSkge1xuICAgIHRyeSB7XG4gICAgICAgIG5vdEVudW1lcmFibGVQcm9wKGUsIFwiaXNPcGVyYXRpb25hbFwiLCB0cnVlKTtcbiAgICB9XG4gICAgY2F0Y2goaWdub3JlKSB7fVxufVxuXG5mdW5jdGlvbiBvcmlnaW5hdGVzRnJvbVJlamVjdGlvbihlKSB7XG4gICAgaWYgKGUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiAoKGUgaW5zdGFuY2VvZiBFcnJvcltcIl9fQmx1ZWJpcmRFcnJvclR5cGVzX19cIl0uT3BlcmF0aW9uYWxFcnJvcikgfHxcbiAgICAgICAgZVtcImlzT3BlcmF0aW9uYWxcIl0gPT09IHRydWUpO1xufVxuXG5mdW5jdGlvbiBjYW5BdHRhY2hUcmFjZShvYmopIHtcbiAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgRXJyb3IgJiYgZXM1LnByb3BlcnR5SXNXcml0YWJsZShvYmosIFwic3RhY2tcIik7XG59XG5cbnZhciBlbnN1cmVFcnJvck9iamVjdCA9IChmdW5jdGlvbigpIHtcbiAgICBpZiAoIShcInN0YWNrXCIgaW4gbmV3IEVycm9yKCkpKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGNhbkF0dGFjaFRyYWNlKHZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgdHJ5IHt0aHJvdyBuZXcgRXJyb3Ioc2FmZVRvU3RyaW5nKHZhbHVlKSk7fVxuICAgICAgICAgICAgY2F0Y2goZXJyKSB7cmV0dXJuIGVycjt9XG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoY2FuQXR0YWNoVHJhY2UodmFsdWUpKSByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEVycm9yKHNhZmVUb1N0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9O1xuICAgIH1cbn0pKCk7XG5cbmZ1bmN0aW9uIGNsYXNzU3RyaW5nKG9iaikge1xuICAgIHJldHVybiB7fS50b1N0cmluZy5jYWxsKG9iaik7XG59XG5cbmZ1bmN0aW9uIGNvcHlEZXNjcmlwdG9ycyhmcm9tLCB0bywgZmlsdGVyKSB7XG4gICAgdmFyIGtleXMgPSBlczUubmFtZXMoZnJvbSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICBpZiAoZmlsdGVyKGtleSkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZXM1LmRlZmluZVByb3BlcnR5KHRvLCBrZXksIGVzNS5nZXREZXNjcmlwdG9yKGZyb20sIGtleSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuICAgICAgICB9XG4gICAgfVxufVxuXG52YXIgcmV0ID0ge1xuICAgIGlzQ2xhc3M6IGlzQ2xhc3MsXG4gICAgaXNJZGVudGlmaWVyOiBpc0lkZW50aWZpZXIsXG4gICAgaW5oZXJpdGVkRGF0YUtleXM6IGluaGVyaXRlZERhdGFLZXlzLFxuICAgIGdldERhdGFQcm9wZXJ0eU9yRGVmYXVsdDogZ2V0RGF0YVByb3BlcnR5T3JEZWZhdWx0LFxuICAgIHRocm93ZXI6IHRocm93ZXIsXG4gICAgaXNBcnJheTogZXM1LmlzQXJyYXksXG4gICAgaGF2ZUdldHRlcnM6IGhhdmVHZXR0ZXJzLFxuICAgIG5vdEVudW1lcmFibGVQcm9wOiBub3RFbnVtZXJhYmxlUHJvcCxcbiAgICBpc1ByaW1pdGl2ZTogaXNQcmltaXRpdmUsXG4gICAgaXNPYmplY3Q6IGlzT2JqZWN0LFxuICAgIGNhbkV2YWx1YXRlOiBjYW5FdmFsdWF0ZSxcbiAgICBlcnJvck9iajogZXJyb3JPYmosXG4gICAgdHJ5Q2F0Y2g6IHRyeUNhdGNoLFxuICAgIGluaGVyaXRzOiBpbmhlcml0cyxcbiAgICB3aXRoQXBwZW5kZWQ6IHdpdGhBcHBlbmRlZCxcbiAgICBtYXliZVdyYXBBc0Vycm9yOiBtYXliZVdyYXBBc0Vycm9yLFxuICAgIHRvRmFzdFByb3BlcnRpZXM6IHRvRmFzdFByb3BlcnRpZXMsXG4gICAgZmlsbGVkUmFuZ2U6IGZpbGxlZFJhbmdlLFxuICAgIHRvU3RyaW5nOiBzYWZlVG9TdHJpbmcsXG4gICAgY2FuQXR0YWNoVHJhY2U6IGNhbkF0dGFjaFRyYWNlLFxuICAgIGVuc3VyZUVycm9yT2JqZWN0OiBlbnN1cmVFcnJvck9iamVjdCxcbiAgICBvcmlnaW5hdGVzRnJvbVJlamVjdGlvbjogb3JpZ2luYXRlc0Zyb21SZWplY3Rpb24sXG4gICAgbWFya0FzT3JpZ2luYXRpbmdGcm9tUmVqZWN0aW9uOiBtYXJrQXNPcmlnaW5hdGluZ0Zyb21SZWplY3Rpb24sXG4gICAgY2xhc3NTdHJpbmc6IGNsYXNzU3RyaW5nLFxuICAgIGNvcHlEZXNjcmlwdG9yczogY29weURlc2NyaXB0b3JzLFxuICAgIGhhc0RldlRvb2xzOiB0eXBlb2YgY2hyb21lICE9PSBcInVuZGVmaW5lZFwiICYmIGNocm9tZSAmJlxuICAgICAgICAgICAgICAgICB0eXBlb2YgY2hyb21lLmxvYWRUaW1lcyA9PT0gXCJmdW5jdGlvblwiLFxuICAgIGlzTm9kZTogdHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgY2xhc3NTdHJpbmcocHJvY2VzcykudG9Mb3dlckNhc2UoKSA9PT0gXCJbb2JqZWN0IHByb2Nlc3NdXCJcbn07XG5yZXQuaXNSZWNlbnROb2RlID0gcmV0LmlzTm9kZSAmJiAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZlcnNpb24gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoXCIuXCIpLm1hcChOdW1iZXIpO1xuICAgIHJldHVybiAodmVyc2lvblswXSA9PT0gMCAmJiB2ZXJzaW9uWzFdID4gMTApIHx8ICh2ZXJzaW9uWzBdID4gMCk7XG59KSgpO1xuXG5pZiAocmV0LmlzTm9kZSkgcmV0LnRvRmFzdFByb3BlcnRpZXMocHJvY2Vzcyk7XG5cbnRyeSB7dGhyb3cgbmV3IEVycm9yKCk7IH0gY2F0Y2ggKGUpIHtyZXQubGFzdExpbmVFcnJvciA9IGU7fVxubW9kdWxlLmV4cG9ydHMgPSByZXQ7XG5cbn0se1wiLi9lczUuanNcIjoxNH1dfSx7fSxbNF0pKDQpXG59KTsgICAgICAgICAgICAgICAgICAgIDtpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93ICE9PSBudWxsKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5QID0gd2luZG93LlByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyAmJiBzZWxmICE9PSBudWxsKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLlAgPSBzZWxmLlByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyohXG4gKiBFdmVudEVtaXR0ZXIyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaGlqMW54L0V2ZW50RW1pdHRlcjJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgaGlqMW54XG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cbjshZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5ID8gQXJyYXkuaXNBcnJheSA6IGZ1bmN0aW9uIF9pc0FycmF5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICB9O1xuICB2YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgaWYgKHRoaXMuX2NvbmYpIHtcbiAgICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIHRoaXMuX2NvbmYpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZShjb25mKSB7XG4gICAgaWYgKGNvbmYpIHtcblxuICAgICAgdGhpcy5fY29uZiA9IGNvbmY7XG5cbiAgICAgIGNvbmYuZGVsaW1pdGVyICYmICh0aGlzLmRlbGltaXRlciA9IGNvbmYuZGVsaW1pdGVyKTtcbiAgICAgIGNvbmYubWF4TGlzdGVuZXJzICYmICh0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gY29uZi5tYXhMaXN0ZW5lcnMpO1xuICAgICAgY29uZi53aWxkY2FyZCAmJiAodGhpcy53aWxkY2FyZCA9IGNvbmYud2lsZGNhcmQpO1xuICAgICAgY29uZi5uZXdMaXN0ZW5lciAmJiAodGhpcy5uZXdMaXN0ZW5lciA9IGNvbmYubmV3TGlzdGVuZXIpO1xuXG4gICAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcihjb25mKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5uZXdMaXN0ZW5lciA9IGZhbHNlO1xuICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIGNvbmYpO1xuICB9XG5cbiAgLy9cbiAgLy8gQXR0ZW50aW9uLCBmdW5jdGlvbiByZXR1cm4gdHlwZSBub3cgaXMgYXJyYXksIGFsd2F5cyAhXG4gIC8vIEl0IGhhcyB6ZXJvIGVsZW1lbnRzIGlmIG5vIGFueSBtYXRjaGVzIGZvdW5kIGFuZCBvbmUgb3IgbW9yZVxuICAvLyBlbGVtZW50cyAobGVhZnMpIGlmIHRoZXJlIGFyZSBtYXRjaGVzXG4gIC8vXG4gIGZ1bmN0aW9uIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgaSkge1xuICAgIGlmICghdHJlZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgbGlzdGVuZXJzPVtdLCBsZWFmLCBsZW4sIGJyYW5jaCwgeFRyZWUsIHh4VHJlZSwgaXNvbGF0ZWRCcmFuY2gsIGVuZFJlYWNoZWQsXG4gICAgICAgIHR5cGVMZW5ndGggPSB0eXBlLmxlbmd0aCwgY3VycmVudFR5cGUgPSB0eXBlW2ldLCBuZXh0VHlwZSA9IHR5cGVbaSsxXTtcbiAgICBpZiAoaSA9PT0gdHlwZUxlbmd0aCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiBhdCB0aGUgZW5kIG9mIHRoZSBldmVudChzKSBsaXN0IGFuZCB0aGUgdHJlZSBoYXMgbGlzdGVuZXJzXG4gICAgICAvLyBpbnZva2UgdGhvc2UgbGlzdGVuZXJzLlxuICAgICAgLy9cbiAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzKTtcbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGVhZiA9IDAsIGxlbiA9IHRyZWUuX2xpc3RlbmVycy5sZW5ndGg7IGxlYWYgPCBsZW47IGxlYWYrKykge1xuICAgICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzW2xlYWZdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICgoY3VycmVudFR5cGUgPT09ICcqJyB8fCBjdXJyZW50VHlwZSA9PT0gJyoqJykgfHwgdHJlZVtjdXJyZW50VHlwZV0pIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgZXZlbnQgZW1pdHRlZCBpcyAnKicgYXQgdGhpcyBwYXJ0XG4gICAgICAvLyBvciB0aGVyZSBpcyBhIGNvbmNyZXRlIG1hdGNoIGF0IHRoaXMgcGF0Y2hcbiAgICAgIC8vXG4gICAgICBpZiAoY3VycmVudFR5cGUgPT09ICcqJykge1xuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsxKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9IGVsc2UgaWYoY3VycmVudFR5cGUgPT09ICcqKicpIHtcbiAgICAgICAgZW5kUmVhY2hlZCA9IChpKzEgPT09IHR5cGVMZW5ndGggfHwgKGkrMiA9PT0gdHlwZUxlbmd0aCAmJiBuZXh0VHlwZSA9PT0gJyonKSk7XG4gICAgICAgIGlmKGVuZFJlYWNoZWQgJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIG5leHQgZWxlbWVudCBoYXMgYSBfbGlzdGVuZXJzLCBhZGQgaXQgdG8gdGhlIGhhbmRsZXJzLlxuICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSAnKicgfHwgYnJhbmNoID09PSAnKionKSB7XG4gICAgICAgICAgICAgIGlmKHRyZWVbYnJhbmNoXS5fbGlzdGVuZXJzICYmICFlbmRSZWFjaGVkKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gTm8gbWF0Y2ggb24gdGhpcyBvbmUsIHNoaWZ0IGludG8gdGhlIHRyZWUgYnV0IG5vdCBpbiB0aGUgdHlwZSBhcnJheS5cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVtjdXJyZW50VHlwZV0sIGkrMSkpO1xuICAgIH1cblxuICAgIHhUcmVlID0gdHJlZVsnKiddO1xuICAgIGlmICh4VHJlZSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBsaXN0ZW5lciB0cmVlIHdpbGwgYWxsb3cgYW55IG1hdGNoIGZvciB0aGlzIHBhcnQsXG4gICAgICAvLyB0aGVuIHJlY3Vyc2l2ZWx5IGV4cGxvcmUgYWxsIGJyYW5jaGVzIG9mIHRoZSB0cmVlXG4gICAgICAvL1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4VHJlZSwgaSsxKTtcbiAgICB9XG5cbiAgICB4eFRyZWUgPSB0cmVlWycqKiddO1xuICAgIGlmKHh4VHJlZSkge1xuICAgICAgaWYoaSA8IHR5cGVMZW5ndGgpIHtcbiAgICAgICAgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGlzdGVuZXIgb24gYSAnKionLCBpdCB3aWxsIGNhdGNoIGFsbCwgc28gYWRkIGl0cyBoYW5kbGVyLlxuICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGFycmF5cyBvZiBtYXRjaGluZyBuZXh0IGJyYW5jaGVzIGFuZCBvdGhlcnMuXG4gICAgICAgIGZvcihicmFuY2ggaW4geHhUcmVlKSB7XG4gICAgICAgICAgaWYoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgeHhUcmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gV2Uga25vdyB0aGUgbmV4dCBlbGVtZW50IHdpbGwgbWF0Y2gsIHNvIGp1bXAgdHdpY2UuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBjdXJyZW50VHlwZSkge1xuICAgICAgICAgICAgICAvLyBDdXJyZW50IG5vZGUgbWF0Y2hlcywgbW92ZSBpbnRvIHRoZSB0cmVlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2ggPSB7fTtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2hbYnJhbmNoXSA9IHh4VHJlZVticmFuY2hdO1xuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHsgJyoqJzogaXNvbGF0ZWRCcmFuY2ggfSwgaSsxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAvLyBXZSBoYXZlIHJlYWNoZWQgdGhlIGVuZCBhbmQgc3RpbGwgb24gYSAnKionXG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH0gZWxzZSBpZih4eFRyZWVbJyonXSAmJiB4eFRyZWVbJyonXS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlWycqJ10sIHR5cGVMZW5ndGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gIH1cblxuICBmdW5jdGlvbiBncm93TGlzdGVuZXJUcmVlKHR5cGUsIGxpc3RlbmVyKSB7XG5cbiAgICB0eXBlID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG5cbiAgICAvL1xuICAgIC8vIExvb2tzIGZvciB0d28gY29uc2VjdXRpdmUgJyoqJywgaWYgc28sIGRvbid0IGFkZCB0aGUgZXZlbnQgYXQgYWxsLlxuICAgIC8vXG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdHlwZS5sZW5ndGg7IGkrMSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZih0eXBlW2ldID09PSAnKionICYmIHR5cGVbaSsxXSA9PT0gJyoqJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSB0aGlzLmxpc3RlbmVyVHJlZTtcbiAgICB2YXIgbmFtZSA9IHR5cGUuc2hpZnQoKTtcblxuICAgIHdoaWxlIChuYW1lKSB7XG5cbiAgICAgIGlmICghdHJlZVtuYW1lXSkge1xuICAgICAgICB0cmVlW25hbWVdID0ge307XG4gICAgICB9XG5cbiAgICAgIHRyZWUgPSB0cmVlW25hbWVdO1xuXG4gICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IFt0cmVlLl9saXN0ZW5lcnMsIGxpc3RlbmVyXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc0FycmF5KHRyZWUuX2xpc3RlbmVycykpIHtcblxuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzLndhcm5lZCkge1xuXG4gICAgICAgICAgICB2YXIgbSA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtID4gMCAmJiB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoID4gbSkge1xuXG4gICAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxuICAvLyAxMCBsaXN0ZW5lcnMgYXJlIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2hcbiAgLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG4gIC8vXG4gIC8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuICAvLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmRlbGltaXRlciA9ICcuJztcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPSBuO1xuICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xuICAgIHRoaXMuX2NvbmYubWF4TGlzdGVuZXJzID0gbjtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50ID0gJyc7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgdGhpcy5tYW55KGV2ZW50LCAxLCBmbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbmVyKCkge1xuICAgICAgaWYgKC0tdHRsID09PSAwKSB7XG4gICAgICAgIHNlbGYub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGxpc3RlbmVyLl9vcmlnaW4gPSBmbjtcblxuICAgIHRoaXMub24oZXZlbnQsIGxpc3RlbmVyKTtcblxuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIH1cblxuICAgIC8vIExvb3AgdGhyb3VnaCB0aGUgKl9hbGwqIGZ1bmN0aW9ucyBhbmQgaW52b2tlIHRoZW0uXG4gICAgaWYgKHRoaXMuX2FsbCkge1xuICAgICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgZm9yIChpID0gMCwgbCA9IHRoaXMuX2FsbC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHRoaXMuX2FsbFtpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gICAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcblxuICAgICAgaWYgKCF0aGlzLl9hbGwgJiZcbiAgICAgICAgIXRoaXMuX2V2ZW50cy5lcnJvciAmJlxuICAgICAgICAhKHRoaXMud2lsZGNhcmQgJiYgdGhpcy5saXN0ZW5lclRyZWUuZXJyb3IpKSB7XG5cbiAgICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXI7XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpXG4gICAgICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIC8vIHNsb3dlclxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgZWxzZSBpZiAoaGFuZGxlcikge1xuICAgICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgICB2YXIgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gKGxpc3RlbmVycy5sZW5ndGggPiAwKSB8fCAhIXRoaXMuX2FsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9hbGw7XG4gICAgfVxuXG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG5cbiAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMub25BbnkodHlwZSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uIG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgIH1cbiAgICBlbHNlIGlmKHR5cGVvZiB0aGlzLl9ldmVudHNbdHlwZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuICAgIH1cbiAgICBlbHNlIGlmIChpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuXG4gICAgICAgIHZhciBtID0gZGVmYXVsdE1heExpc3RlbmVycztcblxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcblxuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uQW55ID0gZnVuY3Rpb24oZm4pIHtcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb25Bbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGlmKCF0aGlzLl9hbGwpIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZnVuY3Rpb24gdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNvbGxlY3Rpb24uXG4gICAgdGhpcy5fYWxsLnB1c2goZm4pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzLGxlYWZzPVtdO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICBoYW5kbGVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGxlYWZzLnB1c2goe19saXN0ZW5lcnM6aGFuZGxlcnN9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgaGFuZGxlcnMgPSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoaXNBcnJheShoYW5kbGVycykpIHtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0ubGlzdGVuZXIgJiYgaGFuZGxlcnNbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLl9vcmlnaW4gJiYgaGFuZGxlcnNbaV0uX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgbGVhZi5fbGlzdGVuZXJzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGhhbmRsZXJzID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAoaGFuZGxlcnMubGlzdGVuZXIgJiYgaGFuZGxlcnMubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAoaGFuZGxlcnMuX29yaWdpbiAmJiBoYW5kbGVycy5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgaSA9IDAsIGwgPSAwLCBmbnM7XG4gICAgaWYgKGZuICYmIHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoID4gMCkge1xuICAgICAgZm5zID0gdGhpcy5fYWxsO1xuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihmbiA9PT0gZm5zW2ldKSB7XG4gICAgICAgICAgZm5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAhdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgdmFyIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcblxuICAgICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgICBsZWFmLl9saXN0ZW5lcnMgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVycywgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICAgIHJldHVybiBoYW5kbGVycztcbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICAgIGlmICghaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyc0FueSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYodGhpcy5fYWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRFbWl0dGVyO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgZXhwb3J0cy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsLlxuICAgIHdpbmRvdy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG59KCk7XG4iLCJsZXQgUHJvbWlzZSA9IHJlcXVpcmUoJ2JsdWViaXJkJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBDb2xsZWN0aW9uIHtcbiAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsXG4gICAgdGhpcy5tb2RlbCA9IG9wdGlvbnMubW9kZWxcbiAgICB0aGlzLm1vZGVscyA9IFtdXG4gIH1cblxuICBmZXRjaCAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBsZXQgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKGVycm9yKSA9PiB7IHJlamVjdChlcnJvcikgfSlcbiAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0aGlzLm1vZGVscyA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpLm1hcCggKG1vZGVsX2RhdGEpID0+IHtcbiAgICAgICAgICAgIGlmKHRoaXMubW9kZWwpe1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMubW9kZWwobW9kZWxfZGF0YSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBtb2RlbF9kYXRhXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICByZWplY3QoZXJyb3IpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKGVycm9yKSA9PiB7XG4gICAgICAgIHdpbmRvdy5hcHBsaWNhdGlvbi5kaXNwbGF5X21lc3NhZ2UoJ0Vycm9yIGNvbW11bmljYXRpb24uJylcbiAgICAgIH0pXG4gICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHRoaXMudXJsKVxuICAgICAgcmVxdWVzdC5zZW5kKClcbiAgICB9KVxuICB9XG5cbiAgZ2V0IChpZCkge1xuICAgIHJldHVybiB0aGlzLm1vZGVscy5maW5kKGZ1bmN0aW9uKG1vZGVsKXsgcmV0dXJuKG1vZGVsLmlkID09PSBpZCkgfSlcbiAgfVxufVxuIiwibGV0IFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpXG5sZXQgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMicpLkV2ZW50RW1pdHRlcjJcbmxldCBTeW5jID0gcmVxdWlyZSgnLi9zeW5jLmpzJylcblxuY2xhc3MgTW9kZWwgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzID0ge30pe1xuICAgIHN1cGVyKClcblxuICAgIHRoaXMuY29uc3RydWN0b3IuYXR0cmlidXRlcy5mb3JFYWNoKChhdHRyaWJ1dGUpID0+IHtcbiAgICAgIHRoaXMucmVnaXN0ZXJfYXR0cmlidXRlKGF0dHJpYnV0ZSlcbiAgICB9KVxuXG4gICAgdGhpcy5hdHRyaWJ1dGVzID0gdGhpcy5hdHRyaWJ1dGVzIHx8IHt9XG5cbiAgICBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIHRoaXNba2V5XSA9IHByb3BlcnRpZXNba2V5XVxuICAgIH0pXG4gIH1cblxuICByZWdpc3Rlcl9hdHRyaWJ1dGUoYXR0cmlidXRlKXtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgYXR0cmlidXRlLCB7XG4gICAgICBnZXQ6ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXR0cmlidXRlc1thdHRyaWJ1dGVdXG4gICAgICB9LFxuXG4gICAgICBzZXQ6IChuZXdfdmFsdWUpID0+IHtcbiAgICAgICAgbGV0IG9sZF92YWx1ZSA9IHRoaXMuYXR0cmlidXRlc1thdHRyaWJ1dGVdXG4gICAgICAgIGlmKG9sZF92YWx1ZSAhPT0gbmV3X3ZhbHVlKXtcbiAgICAgICAgICBsZXQgY2hhbmdlcyA9IHt9XG4gICAgICAgICAgY2hhbmdlc1thdHRyaWJ1dGVdID0ge25ldzogbmV3X3ZhbHVlLCBvbGQ6IG9sZF92YWx1ZX1cbiAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9IG5ld192YWx1ZVxuICAgICAgICAgIHRoaXMuZW1pdCgnY2hhbmdlJywgY2hhbmdlcylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICByZWZyZXNoKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIFN5bmMucmVxdWVzdCgnR0VUJywgdGhpcy51cmwpLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGRhdGEpLmZvckVhY2goKGRhdGFfa2V5KSA9PiB7XG4gICAgICAgIHRoaXNbZGF0YV9rZXldID0gZGF0YVtkYXRhX2tleV1cbiAgICAgIH0pXG5cbiAgICAgIGlmKGNhbGxiYWNrKXtcbiAgICAgICAgY2FsbGJhY2soKVxuICAgICAgfVxuICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgaWYoY2FsbGJhY2spe1xuICAgICAgICBjYWxsYmFjayhlcnJvcilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycm9yXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGNyZWF0ZShjYWxsYmFjaykge1xuICAgIHJldHVybiBTeW5jLnJlcXVlc3QoJ1BPU1QnLCB0aGlzLmNvbGxlY3Rpb25fdXJsLCB0aGlzLmF0dHJpYnV0ZXMpLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGRhdGEpLmZvckVhY2goKGRhdGFfa2V5KSA9PiB7XG4gICAgICAgIHRoaXNbZGF0YV9rZXldID0gZGF0YVtkYXRhX2tleV1cbiAgICAgIH0pXG5cbiAgICAgIGlmKGNhbGxiYWNrKXtcbiAgICAgICAgY2FsbGJhY2soKVxuICAgICAgfVxuICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgaWYoY2FsbGJhY2spe1xuICAgICAgICBjYWxsYmFjayhlcnJvcilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycm9yXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG5cbiAgdXBkYXRlKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIFN5bmMucmVxdWVzdCgnUEFUQ0gnLCB0aGlzLnVybCwgdGhpcy5hdHRyaWJ1dGVzKS50aGVuKChkYXRhKSA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKChkYXRhX2tleSkgPT4ge1xuICAgICAgICB0aGlzW2RhdGFfa2V5XSA9IGRhdGFbZGF0YV9rZXldXG4gICAgICB9KVxuXG4gICAgICBpZihjYWxsYmFjayl7XG4gICAgICAgIGNhbGxiYWNrKClcbiAgICAgIH1cbiAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIGlmKGNhbGxiYWNrKXtcbiAgICAgICAgY2FsbGJhY2soZXJyb3IpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnJvclxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBkZWxldGUoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gU3luYy5yZXF1ZXN0KCdERUxFVEUnLCB0aGlzLnVybCwgdGhpcy5hdHRyaWJ1dGVzKS50aGVuKCgpID0+IHtcblxuICAgICAgaWYoY2FsbGJhY2spe1xuICAgICAgICBjYWxsYmFjaygpXG4gICAgICB9XG4gICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICBpZihjYWxsYmFjayl7XG4gICAgICAgIGNhbGxiYWNrKGVycm9yKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cblxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kZWxcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBNb2RlbDogcmVxdWlyZSgnLi9tb2RlbC5qcycpLFxuICBWaWV3OiAgcmVxdWlyZSgnLi92aWV3LmpzJyksXG4gIENvbGxlY3Rpb246IHJlcXVpcmUoJy4vY29sbGVjdGlvbi5qcycpLFxuICBTdGF0ZU1hY2hpbmU6IHJlcXVpcmUoJy4vc3RhdGVfbWFjaGluZS5qcycpXG59XG4iLCJsZXQgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMicpLkV2ZW50RW1pdHRlcjJcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGF0ZU1hY2hpbmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBnZXQgc3RhdGUoKXtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudF9zdGF0ZVxuICB9XG4gIHNldCBzdGF0ZShuZXdfc3RhdGUpe1xuICAgIGxldCBvbGRfc3RhdGUgPSB0aGlzLl9jdXJyZW50X3N0YXRlXG4gICAgdGhpcy5lbWl0KCdleGl0X3N0YXRlJywgb2xkX3N0YXRlLCBuZXdfc3RhdGUpXG4gICAgdGhpcy5lbWl0KGBleGl0X3N0YXRlOiR7b2xkX3N0YXRlfWAsIG5ld19zdGF0ZSlcbiAgICB0aGlzLl9jdXJyZW50X3N0YXRlID0gbmV3X3N0YXRlXG4gICAgdGhpcy5lbWl0KCdlbnRlcl9zdGF0ZScsIG5ld19zdGF0ZSwgb2xkX3N0YXRlKVxuICAgIHRoaXMuZW1pdChgZW50ZXJfc3RhdGU6JHtuZXdfc3RhdGV9YCwgb2xkX3N0YXRlKVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgcmVxdWVzdDogZnVuY3Rpb24obWV0aG9kLCB1cmwsIHJlcXVlc3RfZGF0YSA9IG51bGwpe1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgbGV0IGh0dHBfcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBodHRwX3JlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcbiAgICAgICAgaWYoaHR0cF9yZXF1ZXN0LnN0YXR1cyA9PSAyMDApe1xuICAgICAgICAgIGxldCBkYXRhID0gSlNPTi5wYXJzZShodHRwX3JlcXVlc3QucmVzcG9uc2VUZXh0KVxuICAgICAgICAgIHJlc29sdmUoZGF0YSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWplY3QoYFJlcXVlc3QgcmV0dXJuZWQgJHtodHRwX3JlcXVlc3Quc3RhdHVzfWApXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICBodHRwX3JlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoZXJyb3IpID0+IHtcbiAgICAgICAgcmVqZWN0KGVycm9yKVxuICAgICAgfSlcbiAgICAgIGh0dHBfcmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsKVxuICAgICAgaWYgKHJlcXVlc3RfZGF0YSkge1xuICAgICAgICBodHRwX3JlcXVlc3Quc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIilcbiAgICAgICAgaHR0cF9yZXF1ZXN0LnNlbmQoSlNPTi5zdHJpbmdpZnkocmVxdWVzdF9kYXRhKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGh0dHBfcmVxdWVzdC5zZW5kKClcbiAgICAgIH1cbiAgICB9KVxuICB9XG59XG4iLCJsZXQgU3RhdGVNYWNoaW5lID0gcmVxdWlyZSgnLi9zdGF0ZV9tYWNoaW5lLmpzJylcblxubGV0IFZpZXcgPSBjbGFzcyBleHRlbmRzIFN0YXRlTWFjaGluZSB7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KXtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5tb2RlbF9jaGFuZ2VkID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgIHRoaXMuZW1pdCgnbW9kZWw6Y2hhbmdlJywgLi4uYXJncylcbiAgICB9XG5cbiAgICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIHRoaXNba2V5XSA9IG9wdGlvbnNba2V5XVxuICAgIH0pXG4gIH1cblxuICBnZXQgbW9kZWwoKXtcbiAgICByZXR1cm4gdGhpcy5fbW9kZWxcbiAgfVxuXG4gIHNldCBtb2RlbChuZXdfbW9kZWwpe1xuICAgIGxldCBvbGRfbW9kZWwgPSB0aGlzLl9tb2RlbFxuICAgIGlmKG9sZF9tb2RlbCl7IG9sZF9tb2RlbC5vZmYoJ2NoYW5nZScsIHRoaXMubW9kZWxfY2hhbmdlZCkgfVxuICAgIG5ld19tb2RlbC5vbignY2hhbmdlJywgdGhpcy5tb2RlbF9jaGFuZ2VkKVxuXG4gICAgdGhpcy5fbW9kZWwgPSBuZXdfbW9kZWxcbiAgICB0aGlzLmVtaXQoJ3NldF9tb2RlbCcpXG4gIH1cblxuICBjcmVhdGVFbGVtZW50KHRhZ19uYW1lLCBhdHRyaWJ1dGVzLCBjb250ZW50KXtcbiAgICBsZXQgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnX25hbWUpXG4gICAgT2JqZWN0LmtleXMoYXR0cmlidXRlcykuZm9yRWFjaCgoYXR0cmlidXRlX25hbWUpID0+IHtcbiAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZV9uYW1lLCBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV9uYW1lXSlcbiAgICB9KVxuXG4gICAgZWxlbWVudC5pbm5lckhUTUwgPSBjb250ZW50XG4gICAgcmV0dXJuIGVsZW1lbnRcbiAgfVxuXG4gIHNob3coKXtcbiAgICB0aGlzLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICcnXG4gIH1cblxuICBoaWRlKCl7XG4gICAgdGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXdcbiJdfQ==

