/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var PouchDb = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {"use strict";

	var PouchDB = __webpack_require__(2);

	module.exports = PouchDB;

	PouchDB.ajax = __webpack_require__(3);
	PouchDB.utils = __webpack_require__(4);
	PouchDB.Errors = __webpack_require__(5);
	PouchDB.replicate = __webpack_require__(6).replicate;
	PouchDB.sync = __webpack_require__(7);
	PouchDB.version = __webpack_require__(8);
	var httpAdapter = __webpack_require__(9);
	PouchDB.adapter('http', httpAdapter);
	PouchDB.adapter('https', httpAdapter);

	PouchDB.adapter('idb', __webpack_require__(10));
	PouchDB.adapter('websql', __webpack_require__(11));
	PouchDB.plugin(__webpack_require__(14));

	if (!process.browser) {
	  var ldbAdapter = __webpack_require__(12);
	  PouchDB.adapter('ldb', ldbAdapter);
	  PouchDB.adapter('leveldb', ldbAdapter);
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var PouchDB = __webpack_require__(17);
	var utils = __webpack_require__(4);
	var Promise = utils.Promise;
	var EventEmitter = __webpack_require__(38).EventEmitter;
	PouchDB.adapters = {};
	PouchDB.preferredAdapters = __webpack_require__(26);

	PouchDB.prefix = '_pouch_';

	var eventEmitter = new EventEmitter();

	var eventEmitterMethods = [
	  'on',
	  'addListener',
	  'emit',
	  'listeners',
	  'once',
	  'removeAllListeners',
	  'removeListener',
	  'setMaxListeners'
	];

	eventEmitterMethods.forEach(function (method) {
	  PouchDB[method] = eventEmitter[method].bind(eventEmitter);
	});
	PouchDB.setMaxListeners(0);
	PouchDB.parseAdapter = function (name, opts) {
	  var match = name.match(/([a-z\-]*):\/\/(.*)/);
	  var adapter, adapterName;
	  if (match) {
	    // the http adapter expects the fully qualified name
	    name = /http(s?)/.test(match[1]) ? match[1] + '://' + match[2] : match[2];
	    adapter = match[1];
	    if (!PouchDB.adapters[adapter].valid()) {
	      throw 'Invalid adapter';
	    }
	    return {name: name, adapter: match[1]};
	  }

	  // check for browsers that have been upgraded from websql-only to websql+idb
	  var skipIdb = 'idb' in PouchDB.adapters && 'websql' in PouchDB.adapters &&
	    utils.hasLocalStorage() &&
	    localStorage['_pouch__websqldb_' + PouchDB.prefix + name];

	  if (typeof opts !== 'undefined' && opts.db) {
	    adapterName = 'leveldb';
	  } else {
	    for (var i = 0; i < PouchDB.preferredAdapters.length; ++i) {
	      adapterName = PouchDB.preferredAdapters[i];
	      if (adapterName in PouchDB.adapters) {
	        if (skipIdb && adapterName === 'idb') {
	          continue; // keep using websql to avoid user data loss
	        }
	        break;
	      }
	    }
	  }

	  adapter = PouchDB.adapters[adapterName];
	  if (adapterName && adapter) {
	    var use_prefix = 'use_prefix' in adapter ? adapter.use_prefix : true;

	    return {
	      name: use_prefix ? PouchDB.prefix + name : name,
	      adapter: adapterName
	    };
	  }

	  throw 'No valid adapter found';
	};

	PouchDB.destroy = utils.toPromise(function (name, opts, callback) {

	  if (typeof opts === 'function' || typeof opts === 'undefined') {
	    callback = opts;
	    opts = {};
	  }
	  if (name && typeof name === 'object') {
	    opts = name;
	    name = undefined;
	  }

	  if (!opts.internal) {
	    console.log('PouchDB.destroy() is deprecated and will be removed. ' +
	                'Please use db.destroy() instead.');
	  }

	  var backend = PouchDB.parseAdapter(opts.name || name, opts);
	  var dbName = backend.name;
	  var adapter = PouchDB.adapters[backend.adapter];
	  var usePrefix = 'use_prefix' in adapter ? adapter.use_prefix : true;
	  var baseName = usePrefix ?
	    dbName.replace(new RegExp('^' + PouchDB.prefix), '') : dbName;
	  var fullName = (backend.adapter === 'http' || backend.adapter === 'https' ?
	      '' : (opts.prefix || '')) + dbName;
	  function destroyDb() {
	    // call destroy method of the particular adaptor
	    adapter.destroy(fullName, opts, function (err, resp) {
	      if (err) {
	        callback(err);
	      } else {
	        PouchDB.emit('destroyed', name);
	        //so we don't have to sift through all dbnames
	        PouchDB.emit(name, 'destroyed');
	        callback(null, resp || { 'ok': true });
	      }
	    });
	  }

	  var createOpts = utils.extend(true, {}, opts, {adapter : backend.adapter});
	  new PouchDB(baseName, createOpts, function (err, db) {
	    if (err) {
	      return callback(err);
	    }
	    db.get('_local/_pouch_dependentDbs', function (err, localDoc) {
	      if (err) {
	        if (err.status !== 404) {
	          return callback(err);
	        } else { // no dependencies
	          return destroyDb();
	        }
	      }
	      var dependentDbs = localDoc.dependentDbs;
	      var deletedMap = Object.keys(dependentDbs).map(function (name) {
	        var trueName = usePrefix ?
	          name.replace(new RegExp('^' + PouchDB.prefix), '') : name;
	        var subOpts = utils.extend(true, opts, db.__opts || {});
	        return db.constructor.destroy(trueName, subOpts);
	      });
	      Promise.all(deletedMap).then(destroyDb, function (error) {
	        callback(error);
	      });
	    });
	  });
	});

	PouchDB.adapter = function (id, obj) {
	  if (obj.valid()) {
	    PouchDB.adapters[id] = obj;
	  }
	};

	PouchDB.plugin = function (obj) {
	  Object.keys(obj).forEach(function (id) {
	    PouchDB.prototype[id] = obj[id];
	  });
	};

	PouchDB.defaults = function (defaultOpts) {
	  function PouchAlt(name, opts, callback) {
	    if (typeof opts === 'function' || typeof opts === 'undefined') {
	      callback = opts;
	      opts = {};
	    }
	    if (name && typeof name === 'object') {
	      opts = name;
	      name = undefined;
	    }

	    opts = utils.extend(true, {}, defaultOpts, opts);
	    PouchDB.call(this, name, opts, callback);
	  }

	  utils.inherits(PouchAlt, PouchDB);

	  PouchAlt.destroy = utils.toPromise(function (name, opts, callback) {
	    if (typeof opts === 'function' || typeof opts === 'undefined') {
	      callback = opts;
	      opts = {};
	    }

	    if (name && typeof name === 'object') {
	      opts = name;
	      name = undefined;
	    }
	    opts = utils.extend(true, {}, defaultOpts, opts);
	    return PouchDB.destroy(name, opts, callback);
	  });

	  eventEmitterMethods.forEach(function (method) {
	    PouchAlt[method] = eventEmitter[method].bind(eventEmitter);
	  });
	  PouchAlt.setMaxListeners(0);

	  PouchAlt.preferredAdapters = PouchDB.preferredAdapters.slice();
	  Object.keys(PouchDB).forEach(function (key) {
	    if (!(key in PouchAlt)) {
	      PouchAlt[key] = PouchDB[key];
	    }
	  });

	  return PouchAlt;
	};

	module.exports = PouchDB;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {"use strict";

	var request = __webpack_require__(18);

	var buffer = __webpack_require__(27);
	var errors = __webpack_require__(5);
	var utils = __webpack_require__(4);

	function ajax(options, adapterCallback) {

	  var requestCompleted = false;
	  var callback = utils.getArguments(function (args) {
	    if (requestCompleted) {
	      return;
	    }
	    adapterCallback.apply(this, args);
	    requestCompleted = true;
	  });

	  if (typeof options === "function") {
	    callback = options;
	    options = {};
	  }

	  options = utils.clone(options);

	  var defaultOptions = {
	    method : "GET",
	    headers: {},
	    json: true,
	    processData: true,
	    timeout: 10000,
	    cache: false
	  };

	  options = utils.extend(true, defaultOptions, options);


	  function onSuccess(obj, resp, cb) {
	    if (!options.binary && !options.json && options.processData &&
	      typeof obj !== 'string') {
	      obj = JSON.stringify(obj);
	    } else if (!options.binary && options.json && typeof obj === 'string') {
	      try {
	        obj = JSON.parse(obj);
	      } catch (e) {
	        // Probably a malformed JSON from server
	        return cb(e);
	      }
	    }
	    if (Array.isArray(obj)) {
	      obj = obj.map(function (v) {
	        if (v.error || v.missing) {
	          return errors.generateErrorFromResponse(v);
	        } else {
	          return v;
	        }
	      });
	    }
	    cb(null, obj, resp);
	  }

	  function onError(err, cb) {
	    var errParsed, errObj;
	    if (err.code && err.status) {
	      var err2 = new Error(err.message || err.code);
	      err2.status = err.status;
	      return cb(err2);
	    }
	    try {
	      errParsed = JSON.parse(err.responseText);
	      //would prefer not to have a try/catch clause
	      errObj = errors.generateErrorFromResponse(errParsed);
	    } catch (e) {
	      errObj = errors.generateErrorFromResponse(err);
	    }
	    cb(errObj);
	  }


	  if (options.json) {
	    if (!options.binary) {
	      options.headers.Accept = 'application/json';
	    }
	    options.headers['Content-Type'] = options.headers['Content-Type'] ||
	      'application/json';
	  }

	  if (options.binary) {
	    options.encoding = null;
	    options.json = false;
	  }

	  if (!options.processData) {
	    options.json = false;
	  }

	  function defaultBody(data) {
	    if (process.browser) {
	      return '';
	    }
	    return new buffer('', 'binary');
	  }

	  return request(options, function (err, response, body) {
	    if (err) {
	      err.status = response ? response.statusCode : 400;
	      return onError(err, callback);
	    }

	    var error;
	    var content_type = response.headers && response.headers['content-type'];
	    var data = body || defaultBody();

	    // CouchDB doesn't always return the right content-type for JSON data, so
	    // we check for ^{ and }$ (ignoring leading/trailing whitespace)
	    if (!options.binary && (options.json || !options.processData) &&
	        typeof data !== 'object' &&
	        (/json/.test(content_type) ||
	         (/^[\s]*\{/.test(data) && /\}[\s]*$/.test(data)))) {
	      data = JSON.parse(data);
	    }

	    if (response.statusCode >= 200 && response.statusCode < 300) {
	      onSuccess(data, response, callback);
	    } else {
	      if (options.binary) {
	        data = JSON.parse(data.toString());
	      }
	      error = errors.generateErrorFromResponse(data);
	      error.status = response.statusCode;
	      callback(error);
	    }
	  });
	}

	module.exports = ajax;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {/*jshint strict: false */
	/*global chrome */
	var merge = __webpack_require__(19);
	exports.extend = __webpack_require__(39);
	exports.ajax = __webpack_require__(3);
	exports.createBlob = __webpack_require__(20);
	exports.uuid = __webpack_require__(21);
	exports.getArguments = __webpack_require__(40);
	var buffer = __webpack_require__(27);
	var errors = __webpack_require__(5);
	var EventEmitter = __webpack_require__(38).EventEmitter;
	var collections = __webpack_require__(41);
	exports.Map = collections.Map;
	exports.Set = collections.Set;
	var parseDoc = __webpack_require__(22);

	if (typeof global.Promise === 'function') {
	  exports.Promise = global.Promise;
	} else {
	  exports.Promise = __webpack_require__(50);
	}
	var Promise = exports.Promise;

	exports.lastIndexOf = function (str, char) {
	  for (var i = str.length - 1; i >= 0; i--) {
	    if (str.charAt(i) === char) {
	      return i;
	    }
	  }
	  return -1;
	};

	exports.clone = function (obj) {
	  return exports.extend(true, {}, obj);
	};

	// like underscore/lodash _.pick()
	exports.pick = function (obj, arr) {
	  var res = {};
	  for (var i = 0, len = arr.length; i < len; i++) {
	    var prop = arr[i];
	    res[prop] = obj[prop];
	  }
	  return res;
	};

	exports.inherits = __webpack_require__(51);

	function isChromeApp() {
	  return (typeof chrome !== "undefined" &&
	          typeof chrome.storage !== "undefined" &&
	          typeof chrome.storage.local !== "undefined");
	}

	// Pretty dumb name for a function, just wraps callback calls so we dont
	// to if (callback) callback() everywhere
	exports.call = exports.getArguments(function (args) {
	  if (!args.length) {
	    return;
	  }
	  var fun = args.shift();
	  if (typeof fun === 'function') {
	    fun.apply(this, args);
	  }
	});

	exports.isLocalId = function (id) {
	  return (/^_local/).test(id);
	};

	// check if a specific revision of a doc has been deleted
	//  - metadata: the metadata object from the doc store
	//  - rev: (optional) the revision to check. defaults to winning revision
	exports.isDeleted = function (metadata, rev) {
	  if (!rev) {
	    rev = merge.winningRev(metadata);
	  }
	  var dashIndex = rev.indexOf('-');
	  if (dashIndex !== -1) {
	    rev = rev.substring(dashIndex + 1);
	  }
	  var deleted = false;
	  merge.traverseRevTree(metadata.rev_tree,
	  function (isLeaf, pos, id, acc, opts) {
	    if (id === rev) {
	      deleted = !!opts.deleted;
	    }
	  });

	  return deleted;
	};

	exports.revExists = function (metadata, rev) {
	  var found = false;
	  merge.traverseRevTree(metadata.rev_tree, function (leaf, pos, id) {
	    if ((pos + '-' + id) === rev) {
	      found = true;
	    }
	  });
	  return found;
	};

	exports.filterChange = function filterChange(opts) {
	  var req = {};
	  var hasFilter = opts.filter && typeof opts.filter === 'function';
	  req.query = opts.query_params;

	  return function filter(change) {
	    if (opts.filter && hasFilter && !opts.filter.call(this, change.doc, req)) {
	      return false;
	    }
	    if (!opts.include_docs) {
	      delete change.doc;
	    } else if (!opts.attachments) {
	      for (var att in change.doc._attachments) {
	        if (change.doc._attachments.hasOwnProperty(att)) {
	          change.doc._attachments[att].stub = true;
	        }
	      }
	    }
	    return true;
	  };
	};

	exports.parseDoc = parseDoc.parseDoc;
	exports.invalidIdError = parseDoc.invalidIdError;

	exports.isCordova = function () {
	  return (typeof cordova !== "undefined" ||
	          typeof PhoneGap !== "undefined" ||
	          typeof phonegap !== "undefined");
	};

	exports.hasLocalStorage = function () {
	  if (isChromeApp()) {
	    return false;
	  }
	  try {
	    return localStorage;
	  } catch (e) {
	    return false;
	  }
	};
	exports.Changes = Changes;
	exports.inherits(Changes, EventEmitter);
	function Changes() {
	  if (!(this instanceof Changes)) {
	    return new Changes();
	  }
	  var self = this;
	  EventEmitter.call(this);
	  this.isChrome = isChromeApp();
	  this.listeners = {};
	  this.hasLocal = false;
	  if (!this.isChrome) {
	    this.hasLocal = exports.hasLocalStorage();
	  }
	  if (this.isChrome) {
	    chrome.storage.onChanged.addListener(function (e) {
	      // make sure it's event addressed to us
	      if (e.db_name != null) {
	        //object only has oldValue, newValue members
	        self.emit(e.dbName.newValue);
	      }
	    });
	  } else if (this.hasLocal) {
	    if (typeof addEventListener !== 'undefined') {
	      addEventListener("storage", function (e) {
	        self.emit(e.key);
	      });
	    } else { // old IE
	      window.attachEvent("storage", function (e) {
	        self.emit(e.key);
	      });
	    }
	  }

	}
	Changes.prototype.addListener = function (dbName, id, db, opts) {
	  if (this.listeners[id]) {
	    return;
	  }
	  var self = this;
	  var inprogress = false;
	  function eventFunction() {
	    if (!self.listeners[id]) {
	      return;
	    }
	    if (inprogress) {
	      inprogress = 'waiting';
	      return;
	    }
	    inprogress = true;
	    db.changes({
	      style: opts.style,
	      include_docs: opts.include_docs,
	      attachments: opts.attachments,
	      conflicts: opts.conflicts,
	      continuous: false,
	      descending: false,
	      filter: opts.filter,
	      doc_ids: opts.doc_ids,
	      view: opts.view,
	      since: opts.since,
	      query_params: opts.query_params
	    }).on('change', function (c) {
	      if (c.seq > opts.since && !opts.cancelled) {
	        opts.since = c.seq;
	        exports.call(opts.onChange, c);
	      }
	    }).on('complete', function () {
	      if (inprogress === 'waiting') {
	        process.nextTick(function () {
	          self.notify(dbName);
	        });
	      }
	      inprogress = false;
	    }).on('error', function () {
	      inprogress = false;
	    });
	  }
	  this.listeners[id] = eventFunction;
	  this.on(dbName, eventFunction);
	};

	Changes.prototype.removeListener = function (dbName, id) {
	  if (!(id in this.listeners)) {
	    return;
	  }
	  EventEmitter.prototype.removeListener.call(this, dbName,
	    this.listeners[id]);
	};


	Changes.prototype.notifyLocalWindows = function (dbName) {
	  //do a useless change on a storage thing
	  //in order to get other windows's listeners to activate
	  if (this.isChrome) {
	    chrome.storage.local.set({dbName: dbName});
	  } else if (this.hasLocal) {
	    localStorage[dbName] = (localStorage[dbName] === "a") ? "b" : "a";
	  }
	};

	Changes.prototype.notify = function (dbName) {
	  this.emit(dbName);
	  this.notifyLocalWindows(dbName);
	};

	if (typeof atob === 'function') {
	  exports.atob = function (str) {
	    return atob(str);
	  };
	} else {
	  exports.atob = function (str) {
	    var base64 = new buffer(str, 'base64');
	    // Node.js will just skip the characters it can't encode instead of
	    // throwing and exception
	    if (base64.toString('base64') !== str) {
	      throw ("Cannot base64 encode full string");
	    }
	    return base64.toString('binary');
	  };
	}

	if (typeof btoa === 'function') {
	  exports.btoa = function (str) {
	    return btoa(str);
	  };
	} else {
	  exports.btoa = function (str) {
	    return new buffer(str, 'binary').toString('base64');
	  };
	}

	// From http://stackoverflow.com/questions/14967647/ (continues on next line)
	// encode-decode-image-with-base64-breaks-image (2013-04-21)
	exports.fixBinary = function (bin) {
	  if (!process.browser) {
	    // don't need to do this in Node
	    return bin;
	  }

	  var length = bin.length;
	  var buf = new ArrayBuffer(length);
	  var arr = new Uint8Array(buf);
	  for (var i = 0; i < length; i++) {
	    arr[i] = bin.charCodeAt(i);
	  }
	  return buf;
	};

	// shim for browsers that don't support it
	exports.readAsBinaryString = function (blob, callback) {
	  var reader = new FileReader();
	  var hasBinaryString = typeof reader.readAsBinaryString === 'function';
	  reader.onloadend = function (e) {
	    var result = e.target.result || '';
	    if (hasBinaryString) {
	      return callback(result);
	    }
	    callback(exports.arrayBufferToBinaryString(result));
	  };
	  if (hasBinaryString) {
	    reader.readAsBinaryString(blob);
	  } else {
	    reader.readAsArrayBuffer(blob);
	  }
	};

	// simplified API. universal browser support is assumed
	exports.readAsArrayBuffer = function (blob, callback) {
	  var reader = new FileReader();
	  reader.onloadend = function (e) {
	    var result = e.target.result || new ArrayBuffer(0);
	    callback(result);
	  };
	  reader.readAsArrayBuffer(blob);
	};

	exports.once = function (fun) {
	  var called = false;
	  return exports.getArguments(function (args) {
	    if (called) {
	      throw new Error('once called  more than once');
	    } else {
	      called = true;
	      fun.apply(this, args);
	    }
	  });
	};

	exports.toPromise = function (func) {
	  //create the function we will be returning
	  return exports.getArguments(function (args) {
	    var self = this;
	    var tempCB =
	      (typeof args[args.length - 1] === 'function') ? args.pop() : false;
	    // if the last argument is a function, assume its a callback
	    var usedCB;
	    if (tempCB) {
	      // if it was a callback, create a new callback which calls it,
	      // but do so async so we don't trap any errors
	      usedCB = function (err, resp) {
	        process.nextTick(function () {
	          tempCB(err, resp);
	        });
	      };
	    }
	    var promise = new Promise(function (fulfill, reject) {
	      var resp;
	      try {
	        var callback = exports.once(function (err, mesg) {
	          if (err) {
	            reject(err);
	          } else {
	            fulfill(mesg);
	          }
	        });
	        // create a callback for this invocation
	        // apply the function in the orig context
	        args.push(callback);
	        resp = func.apply(self, args);
	        if (resp && typeof resp.then === 'function') {
	          fulfill(resp);
	        }
	      } catch (e) {
	        reject(e);
	      }
	    });
	    // if there is a callback, call it back
	    if (usedCB) {
	      promise.then(function (result) {
	        usedCB(null, result);
	      }, usedCB);
	    }
	    promise.cancel = function () {
	      return this;
	    };
	    return promise;
	  });
	};

	exports.adapterFun = function (name, callback) {
	  var log = __webpack_require__(52)('pouchdb:api');

	  function logApiCall(self, name, args) {
	    if (!log.enabled) {
	      return;
	    }
	    var logArgs = [self._db_name, name];
	    for (var i = 0; i < args.length - 1; i++) {
	      logArgs.push(args[i]);
	    }
	    log.apply(null, logArgs);

	    // override the callback itself to log the response
	    var origCallback = args[args.length - 1];
	    args[args.length - 1] = function (err, res) {
	      var responseArgs = [self._db_name, name];
	      responseArgs = responseArgs.concat(
	        err ? ['error', err] : ['success', res]
	      );
	      log.apply(null, responseArgs);
	      origCallback(err, res);
	    };
	  }


	  return exports.toPromise(exports.getArguments(function (args) {
	    if (this._closed) {
	      return Promise.reject(new Error('database is closed'));
	    }
	    var self = this;
	    logApiCall(self, name, args);
	    if (!this.taskqueue.isReady) {
	      return new exports.Promise(function (fulfill, reject) {
	        self.taskqueue.addTask(function (failed) {
	          if (failed) {
	            reject(failed);
	          } else {
	            fulfill(self[name].apply(self, args));
	          }
	        });
	      });
	    }
	    return callback.apply(this, args);
	  }));
	};

	//Can't find original post, but this is close
	//http://stackoverflow.com/questions/6965107/ (continues on next line)
	//converting-between-strings-and-arraybuffers
	exports.arrayBufferToBinaryString = function (buffer) {
	  var binary = "";
	  var bytes = new Uint8Array(buffer);
	  var length = bytes.byteLength;
	  for (var i = 0; i < length; i++) {
	    binary += String.fromCharCode(bytes[i]);
	  }
	  return binary;
	};

	exports.cancellableFun = function (fun, self, opts) {

	  opts = opts ? exports.clone(true, {}, opts) : {};

	  var emitter = new EventEmitter();
	  var oldComplete = opts.complete || function () { };
	  var complete = opts.complete = exports.once(function (err, resp) {
	    if (err) {
	      oldComplete(err);
	    } else {
	      emitter.emit('end', resp);
	      oldComplete(null, resp);
	    }
	    emitter.removeAllListeners();
	  });
	  var oldOnChange = opts.onChange || function () {};
	  var lastChange = 0;
	  self.on('destroyed', function () {
	    emitter.removeAllListeners();
	  });
	  opts.onChange = function (change) {
	    oldOnChange(change);
	    if (change.seq <= lastChange) {
	      return;
	    }
	    lastChange = change.seq;
	    emitter.emit('change', change);
	    if (change.deleted) {
	      emitter.emit('delete', change);
	    } else if (change.changes.length === 1 &&
	      change.changes[0].rev.slice(0, 1) === '1-') {
	      emitter.emit('create', change);
	    } else {
	      emitter.emit('update', change);
	    }
	  };
	  var promise = new Promise(function (fulfill, reject) {
	    opts.complete = function (err, res) {
	      if (err) {
	        reject(err);
	      } else {
	        fulfill(res);
	      }
	    };
	  });

	  promise.then(function (result) {
	    complete(null, result);
	  }, complete);

	  // this needs to be overwridden by caller, dont fire complete until
	  // the task is ready
	  promise.cancel = function () {
	    promise.isCancelled = true;
	    if (self.taskqueue.isReady) {
	      opts.complete(null, {status: 'cancelled'});
	    }
	  };

	  if (!self.taskqueue.isReady) {
	    self.taskqueue.addTask(function () {
	      if (promise.isCancelled) {
	        opts.complete(null, {status: 'cancelled'});
	      } else {
	        fun(self, opts, promise);
	      }
	    });
	  } else {
	    fun(self, opts, promise);
	  }
	  promise.on = emitter.on.bind(emitter);
	  promise.once = emitter.once.bind(emitter);
	  promise.addListener = emitter.addListener.bind(emitter);
	  promise.removeListener = emitter.removeListener.bind(emitter);
	  promise.removeAllListeners = emitter.removeAllListeners.bind(emitter);
	  promise.setMaxListeners = emitter.setMaxListeners.bind(emitter);
	  promise.listeners = emitter.listeners.bind(emitter);
	  promise.emit = emitter.emit.bind(emitter);
	  return promise;
	};

	exports.MD5 = exports.toPromise(__webpack_require__(23));

	// designed to give info to browser users, who are disturbed
	// when they see 404s in the console
	exports.explain404 = function (str) {
	  if (process.browser && 'console' in global && 'info' in console) {
	    console.info('The above 404 is totally normal. ' + str);
	  }
	};

	exports.info = function (str) {
	  if (typeof console !== 'undefined' && 'info' in console) {
	    console.info(str);
	  }
	};

	exports.parseUri = __webpack_require__(24);

	exports.compare = function (left, right) {
	  return left < right ? -1 : left > right ? 1 : 0;
	};

	exports.updateDoc = function updateDoc(prev, docInfo, results,
	                                       i, cb, writeDoc, newEdits) {

	  if (exports.revExists(prev, docInfo.metadata.rev)) {
	    results[i] = docInfo;
	    return cb();
	  }

	  var previouslyDeleted = exports.isDeleted(prev);
	  var deleted = exports.isDeleted(docInfo.metadata);
	  var isRoot = /^1-/.test(docInfo.metadata.rev);

	  if (previouslyDeleted && !deleted && newEdits && isRoot) {
	    var newDoc = docInfo.data;
	    newDoc._rev = merge.winningRev(prev);
	    newDoc._id = docInfo.metadata.id;
	    docInfo = exports.parseDoc(newDoc, newEdits);
	  }

	  var merged = merge.merge(prev.rev_tree, docInfo.metadata.rev_tree[0], 1000);

	  var inConflict = newEdits && (((previouslyDeleted && deleted) ||
	    (!previouslyDeleted && merged.conflicts !== 'new_leaf') ||
	    (previouslyDeleted && !deleted && merged.conflicts === 'new_branch')));

	  if (inConflict) {
	    var err = errors.error(errors.REV_CONFLICT);
	    results[i] = err;
	    return cb();
	  }

	  var newRev = docInfo.metadata.rev;
	  docInfo.metadata.rev_tree = merged.tree;
	  if (prev.rev_map) {
	    docInfo.metadata.rev_map = prev.rev_map; // used by leveldb
	  }

	  // recalculate
	  var winningRev = merge.winningRev(docInfo.metadata);
	  deleted = exports.isDeleted(docInfo.metadata, winningRev);

	  var delta = 0;
	  if (newEdits || winningRev === newRev) {
	    // if newEdits==false and we're pushing existing revisions,
	    // then the only thing that matters is whether this revision
	    // is the winning one, and thus replaces an old one
	    delta = (previouslyDeleted === deleted) ? 0 :
	      previouslyDeleted < deleted ? -1 : 1;
	  }

	  writeDoc(docInfo, winningRev, deleted, cb, true, delta, i);
	};

	exports.processDocs = function processDocs(docInfos, api, fetchedDocs,
	                                           tx, results, writeDoc, opts,
	                                           overallCallback) {

	  if (!docInfos.length) {
	    return;
	  }

	  function insertDoc(docInfo, resultsIdx, callback) {
	    // Cant insert new deleted documents
	    var winningRev = merge.winningRev(docInfo.metadata);
	    var deleted = exports.isDeleted(docInfo.metadata, winningRev);
	    if ('was_delete' in opts && deleted) {
	      results[resultsIdx] = errors.error(errors.MISSING_DOC, 'deleted');
	      return callback();
	    }

	    var delta = deleted ? 0 : 1;

	    writeDoc(docInfo, winningRev, deleted, callback, false, delta, resultsIdx);
	  }

	  var newEdits = opts.new_edits;
	  var idsToDocs = new exports.Map();

	  var docsDone = 0;
	  var docsToDo = docInfos.length;

	  function checkAllDocsDone() {
	    if (++docsDone === docsToDo && overallCallback) {
	      overallCallback();
	    }
	  }

	  docInfos.forEach(function (currentDoc, resultsIdx) {

	    if (currentDoc._id && exports.isLocalId(currentDoc._id)) {
	      api[currentDoc._deleted ? '_removeLocal' : '_putLocal'](
	        currentDoc, {ctx: tx}, function (err) {
	          if (err) {
	            results[resultsIdx] = err;
	          } else {
	            results[resultsIdx] = {ok: true};
	          }
	          checkAllDocsDone();
	        });
	      return;
	    }

	    var id = currentDoc.metadata.id;
	    if (idsToDocs.has(id)) {
	      docsToDo--; // duplicate
	      idsToDocs.get(id).push([currentDoc, resultsIdx]);
	    } else {
	      idsToDocs.set(id, [[currentDoc, resultsIdx]]);
	    }
	  });

	  // in the case of new_edits, the user can provide multiple docs
	  // with the same id. these need to be processed sequentially
	  idsToDocs.forEach(function (docs, id) {
	    var numDone = 0;

	    function docWritten() {
	      if (++numDone < docs.length) {
	        nextDoc();
	      } else {
	        checkAllDocsDone();
	      }
	    }
	    function nextDoc() {
	      var value = docs[numDone];
	      var currentDoc = value[0];
	      var resultsIdx = value[1];

	      if (fetchedDocs.has(id)) {
	        exports.updateDoc(fetchedDocs.get(id), currentDoc, results,
	          resultsIdx, docWritten, writeDoc, newEdits);
	      } else {
	        insertDoc(currentDoc, resultsIdx, docWritten);
	      }
	    }
	    nextDoc();
	  });
	};

	exports.preprocessAttachments = function preprocessAttachments(
	    docInfos, blobType, callback) {

	  if (!docInfos.length) {
	    return callback();
	  }

	  var docv = 0;

	  function parseBase64(data) {
	    try {
	      return exports.atob(data);
	    } catch (e) {
	      var err = errors.error(errors.BAD_ARG,
	                             'Attachments need to be base64 encoded');
	      return {error: err};
	    }
	  }

	  function preprocessAttachment(att, callback) {
	    if (att.stub) {
	      return callback();
	    }
	    if (typeof att.data === 'string') {
	      // input is a base64 string

	      var asBinary = parseBase64(att.data);
	      if (asBinary.error) {
	        return callback(asBinary.error);
	      }

	      att.length = asBinary.length;
	      if (blobType === 'blob') {
	        att.data = exports.createBlob([exports.fixBinary(asBinary)],
	          {type: att.content_type});
	      } else if (blobType === 'base64') {
	        att.data = exports.btoa(asBinary);
	      } else { // binary
	        att.data = asBinary;
	      }
	      exports.MD5(asBinary).then(function (result) {
	        att.digest = 'md5-' + result;
	        callback();
	      });
	    } else { // input is a blob
	      exports.readAsArrayBuffer(att.data, function (buff) {
	        if (blobType === 'binary') {
	          att.data = exports.arrayBufferToBinaryString(buff);
	        } else if (blobType === 'base64') {
	          att.data = exports.btoa(exports.arrayBufferToBinaryString(buff));
	        }
	        exports.MD5(buff).then(function (result) {
	          att.digest = 'md5-' + result;
	          att.length = buff.byteLength;
	          callback();
	        });
	      });
	    }
	  }

	  var overallErr;

	  docInfos.forEach(function (docInfo) {
	    var attachments = docInfo.data && docInfo.data._attachments ?
	      Object.keys(docInfo.data._attachments) : [];
	    var recv = 0;

	    if (!attachments.length) {
	      return done();
	    }

	    function processedAttachment(err) {
	      overallErr = err;
	      recv++;
	      if (recv === attachments.length) {
	        done();
	      }
	    }

	    for (var key in docInfo.data._attachments) {
	      if (docInfo.data._attachments.hasOwnProperty(key)) {
	        preprocessAttachment(docInfo.data._attachments[key],
	          processedAttachment);
	      }
	    }
	  });

	  function done() {
	    docv++;
	    if (docInfos.length === docv) {
	      if (overallErr) {
	        callback(overallErr);
	      } else {
	        callback();
	      }
	    }
	  }
	};

	// compact a tree by marking its non-leafs as missing,
	// and return a list of revs to delete
	exports.compactTree = function compactTree(metadata) {
	  var revs = [];
	  merge.traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
	                                                     revHash, ctx, opts) {
	    if (opts.status === 'available' && !isLeaf) {
	      revs.push(pos + '-' + revHash);
	      opts.status = 'missing';
	    }
	  });
	  return revs;
	};

	var vuvuzela = __webpack_require__(42);

	exports.safeJsonParse = function safeJsonParse(str) {
	  try {
	    return JSON.parse(str);
	  } catch (e) {
	    return vuvuzela.parse(str);
	  }
	};

	exports.safeJsonStringify = function safeJsonStringify(json) {
	  try {
	    return JSON.stringify(json);
	  } catch (e) {
	    return vuvuzela.stringify(json);
	  }
	};
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(13)))

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var inherits = __webpack_require__(51);
	inherits(PouchError, Error);

	function PouchError(opts) {
	  Error.call(opts.reason);
	  this.status = opts.status;
	  this.name = opts.error;
	  this.message = opts.reason;
	  this.error = true;
	}

	PouchError.prototype.toString = function () {
	  return JSON.stringify({
	    status: this.status,
	    name: this.name,
	    message: this.message
	  });
	};

	exports.UNAUTHORIZED = new PouchError({
	  status: 401,
	  error: 'unauthorized',
	  reason: "Name or password is incorrect."
	});

	exports.MISSING_BULK_DOCS = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: "Missing JSON list of 'docs'"
	});

	exports.MISSING_DOC = new PouchError({
	  status: 404,
	  error: 'not_found',
	  reason: 'missing'
	});

	exports.REV_CONFLICT = new PouchError({
	  status: 409,
	  error: 'conflict',
	  reason: 'Document update conflict'
	});

	exports.INVALID_ID = new PouchError({
	  status: 400,
	  error: 'invalid_id',
	  reason: '_id field must contain a string'
	});

	exports.MISSING_ID = new PouchError({
	  status: 412,
	  error: 'missing_id',
	  reason: '_id is required for puts'
	});

	exports.RESERVED_ID = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: 'Only reserved document ids may start with underscore.'
	});

	exports.NOT_OPEN = new PouchError({
	  status: 412,
	  error: 'precondition_failed',
	  reason: 'Database not open'
	});

	exports.UNKNOWN_ERROR = new PouchError({
	  status: 500,
	  error: 'unknown_error',
	  reason: 'Database encountered an unknown error'
	});

	exports.BAD_ARG = new PouchError({
	  status: 500,
	  error: 'badarg',
	  reason: 'Some query argument is invalid'
	});

	exports.INVALID_REQUEST = new PouchError({
	  status: 400,
	  error: 'invalid_request',
	  reason: 'Request was invalid'
	});

	exports.QUERY_PARSE_ERROR = new PouchError({
	  status: 400,
	  error: 'query_parse_error',
	  reason: 'Some query parameter is invalid'
	});

	exports.DOC_VALIDATION = new PouchError({
	  status: 500,
	  error: 'doc_validation',
	  reason: 'Bad special document member'
	});

	exports.BAD_REQUEST = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: 'Something wrong with the request'
	});

	exports.NOT_AN_OBJECT = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: 'Document must be a JSON object'
	});

	exports.DB_MISSING = new PouchError({
	  status: 404,
	  error: 'not_found',
	  reason: 'Database not found'
	});

	exports.IDB_ERROR = new PouchError({
	  status: 500,
	  error: 'indexed_db_went_bad',
	  reason: 'unknown'
	});

	exports.WSQ_ERROR = new PouchError({
	  status: 500,
	  error: 'web_sql_went_bad',
	  reason: 'unknown'
	});

	exports.LDB_ERROR = new PouchError({
	  status: 500,
	  error: 'levelDB_went_went_bad',
	  reason: 'unknown'
	});

	exports.FORBIDDEN = new PouchError({
	  status: 403,
	  error: 'forbidden',
	  reason: 'Forbidden by design doc validate_doc_update function'
	});

	exports.INVALID_REV = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: 'Invalid rev format'
	});

	exports.FILE_EXISTS = new PouchError({
	  status: 412,
	  error: 'file_exists',
	  reason: 'The database could not be created, the file already exists.'
	});

	exports.MISSING_STUB = new PouchError({
	  status: 412,
	  error: 'missing_stub'
	});

	exports.error = function (error, reason, name) {
	  function CustomPouchError(reason) {
	    // inherit error properties from our parent error manually
	    // so as to allow proper JSON parsing.
	    /* jshint ignore:start */
	    for (var p in error) {
	      if (typeof error[p] !== 'function') {
	        this[p] = error[p];
	      }
	    }
	    /* jshint ignore:end */
	    if (name !== undefined) {
	      this.name = name;
	    }
	    if (reason !== undefined) {
	      this.reason = reason;
	    }
	  }
	  CustomPouchError.prototype = PouchError.prototype;
	  return new CustomPouchError(reason);
	};

	// Find one of the errors defined above based on the value
	// of the specified property.
	// If reason is provided prefer the error matching that reason.
	// This is for differentiating between errors with the same name and status,
	// eg, bad_request.
	exports.getErrorTypeByProp = function (prop, value, reason) {
	  var errors = exports;
	  var keys = Object.keys(errors).filter(function (key) {
	    var error = errors[key];
	    return typeof error !== 'function' && error[prop] === value;
	  });
	  var key = reason && keys.filter(function (key) {
	        var error = errors[key];
	        return error.message === reason;
	      })[0] || keys[0];
	  return (key) ? errors[key] : null;
	};

	exports.generateErrorFromResponse = function (res) {
	  var error, errName, errType, errMsg, errReason;
	  var errors = exports;

	  errName = (res.error === true && typeof res.name === 'string') ?
	              res.name :
	              res.error;
	  errReason = res.reason;
	  errType = errors.getErrorTypeByProp('name', errName, errReason);

	  if (res.missing ||
	      errReason === 'missing' ||
	      errReason === 'deleted' ||
	      errName === 'not_found') {
	    errType = errors.MISSING_DOC;
	  } else if (errName === 'doc_validation') {
	    // doc validation needs special treatment since
	    // res.reason depends on the validation error.
	    // see utils.js
	    errType = errors.DOC_VALIDATION;
	    errMsg = errReason;
	  } else if (errName === 'bad_request' && errType.message !== errReason) {
	    // if bad_request error already found based on reason don't override.

	    // attachment errors.
	    if (errReason.indexOf('unknown stub attachment') === 0) {
	      errType = errors.MISSING_STUB;
	      errMsg = errReason;
	    } else {
	      errType = errors.BAD_REQUEST;
	    }
	  }

	  // fallback to error by statys or unknown error.
	  if (!errType) {
	    errType = errors.getErrorTypeByProp('status', res.status, errReason) ||
	                errors.UNKNOWN_ERROR;
	  }

	  error = errors.error(errType, errReason, errName);

	  // Keep custom message.
	  if (errMsg) {
	    error.message = errMsg;
	  }

	  // Keep helpful response data in our error messages.
	  if (res.id) {
	    error.id = res.id;
	  }
	  if (res.status) {
	    error.status = res.status;
	  }
	  if (res.statusText) {
	    error.name = res.statusText;
	  }
	  if (res.missing) {
	    error.missing = res.missing;
	  }

	  return error;
	};


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(4);
	var EE = __webpack_require__(38).EventEmitter;
	var Checkpointer = __webpack_require__(25);

	var MAX_SIMULTANEOUS_REVS = 50;
	var RETRY_DEFAULT = false;

	function randomNumber(min, max) {
	  min = parseInt(min, 10);
	  max = parseInt(max, 10);
	  if (min !== min) {
	    min = 0;
	  }
	  if (max !== max || max <= min) {
	    max = (min || 1) << 1; //doubling
	  } else {
	    max = max + 1;
	  }
	  var ratio = Math.random();
	  var range = max - min;

	  return ~~(range * ratio + min); // ~~ coerces to an int, but fast.
	}

	function defaultBackOff(min) {
	  var max = 0;
	  if (!min) {
	    max = 2000;
	  }
	  return randomNumber(min, max);
	}

	function backOff(repId, src, target, opts, returnValue, result, error) {
	  if (opts.retry === false) {
	    returnValue.emit('error', error);
	    returnValue.removeAllListeners();
	    return;
	  }
	  opts.default_back_off = opts.default_back_off || 0;
	  opts.retries = opts.retries || 0;
	  if (typeof opts.back_off_function !== 'function') {
	    opts.back_off_function = defaultBackOff;
	  }
	  opts.retries++;
	  if (opts.max_retries && opts.retries > opts.max_retries) {
	    returnValue.emit('error', new Error('tried ' +
	      opts.retries + ' times but replication failed'));
	    returnValue.removeAllListeners();
	    return;
	  }
	  returnValue.emit('requestError', error);
	  if (returnValue.state === 'active') {
	    returnValue.emit('paused', error);
	    returnValue.state = 'stopped';
	    returnValue.once('active', function () {
	      opts.current_back_off = opts.default_back_off;
	    });
	  }

	  opts.current_back_off = opts.current_back_off || opts.default_back_off;
	  opts.current_back_off = opts.back_off_function(opts.current_back_off);
	  setTimeout(function () {
	    replicate(repId, src, target, opts, returnValue);
	  }, opts.current_back_off);
	}

	// We create a basic promise so the caller can cancel the replication possibly
	// before we have actually started listening to changes etc
	utils.inherits(Replication, EE);
	function Replication() {
	  EE.call(this);
	  this.cancelled = false;
	  this.state = 'pending';
	  var self = this;
	  var promise = new utils.Promise(function (fulfill, reject) {
	    self.once('complete', fulfill);
	    self.once('error', reject);
	  });
	  self.then = function (resolve, reject) {
	    return promise.then(resolve, reject);
	  };
	  self.catch = function (reject) {
	    return promise.catch(reject);
	  };
	  // As we allow error handling via "error" event as well,
	  // put a stub in here so that rejecting never throws UnhandledError.
	  self.catch(function () {});
	}

	Replication.prototype.cancel = function () {
	  this.cancelled = true;
	  this.state = 'cancelled';
	  this.emit('cancel');
	};

	Replication.prototype.ready = function (src, target) {
	  var self = this;
	  this.once('change', function () {
	    if (this.state === 'pending' || this.state === 'stopped') {
	      self.state = 'active';
	      self.emit('active');
	    }
	  });
	  function onDestroy() {
	    self.cancel();
	  }
	  src.once('destroyed', onDestroy);
	  target.once('destroyed', onDestroy);
	  function cleanup() {
	    src.removeListener('destroyed', onDestroy);
	    target.removeListener('destroyed', onDestroy);
	  }
	  this.then(cleanup, cleanup);
	};


	// TODO: check CouchDB's replication id generation
	// Generate a unique id particular to this replication
	function genReplicationId(src, target, opts) {
	  var filterFun = opts.filter ? opts.filter.toString() : '';
	  return src.id().then(function (src_id) {
	    return target.id().then(function (target_id) {
	      var queryData = src_id + target_id + filterFun +
	        JSON.stringify(opts.query_params) + opts.doc_ids;
	      return utils.MD5(queryData).then(function (md5) {
	        // can't use straight-up md5 alphabet, because
	        // the char '/' is interpreted as being for attachments,
	        // and + is also not url-safe
	        md5 = md5.replace(/\//g, '.').replace(/\+/g, '_');
	        return '_local/' + md5;
	      });
	    });
	  });
	}

	function replicate(repId, src, target, opts, returnValue, result) {
	  var batches = [];               // list of batches to be processed
	  var currentBatch;               // the batch currently being processed
	  var pendingBatch = {
	    seq: 0,
	    changes: [],
	    docs: []
	  }; // next batch, not yet ready to be processed
	  var writingCheckpoint = false;  // true while checkpoint is being written
	  var changesCompleted = false;   // true when all changes received
	  var replicationCompleted = false; // true when replication has completed
	  var last_seq = 0;
	  var continuous = opts.continuous || opts.live || false;
	  var batch_size = opts.batch_size || 100;
	  var batches_limit = opts.batches_limit || 10;
	  var changesPending = false;     // true while src.changes is running
	  var doc_ids = opts.doc_ids;
	  var state = {
	    cancelled: false
	  };
	  var checkpointer = new Checkpointer(src, target, repId, state);
	  var allErrors = [];
	  var changedDocs = [];

	  result = result || {
	    ok: true,
	    start_time: new Date(),
	    docs_read: 0,
	    docs_written: 0,
	    doc_write_failures: 0,
	    errors: []
	  };

	  var changesOpts = {};
	  returnValue.ready(src, target);

	  function writeDocs() {
	    if (currentBatch.docs.length === 0) {
	      return;
	    }
	    var docs = currentBatch.docs;
	    return target.bulkDocs({docs: docs, new_edits: false}).then(function (res) {
	      if (state.cancelled) {
	        completeReplication();
	        throw new Error('cancelled');
	      }
	      var errors = [];
	      var errorsById = {};
	      res.forEach(function (res) {
	        if (res.error) {
	          result.doc_write_failures++;
	          errors.push(res);
	          errorsById[res.id] = res;
	        }
	      });
	      result.errors = errors;
	      allErrors = allErrors.concat(errors);
	      result.docs_written += currentBatch.docs.length - errors.length;
	      var non403s = errors.filter(function (error) {
	        return error.name !== 'unauthorized' && error.name !== 'forbidden';
	      });

	      changedDocs = [];
	      docs.forEach(function(doc) {
	        var error = errorsById[doc._id];
	        if (error) {
	          returnValue.emit('denied', utils.clone(error));
	        } else {
	          changedDocs.push(doc);
	        }
	      });

	      if (non403s.length > 0) {
	        var error = new Error('bulkDocs error');
	        error.other_errors = errors;
	        abortReplication('target.bulkDocs failed to write docs', error);
	        throw new Error('bulkWrite partial failure');
	      }
	    }, function (err) {
	      result.doc_write_failures += docs.length;
	      throw err;
	    });
	  }

	  function processDiffDoc(id) {
	    var diffs = currentBatch.diffs;
	    var allMissing = diffs[id].missing;
	    // avoid url too long error by batching
	    var missingBatches = [];
	    for (var i = 0; i < allMissing.length; i += MAX_SIMULTANEOUS_REVS) {
	      missingBatches.push(allMissing.slice(i, Math.min(allMissing.length,
	        i + MAX_SIMULTANEOUS_REVS)));
	    }

	    return utils.Promise.all(missingBatches.map(function (missing) {
	      var opts = {
	        revs: true,
	        open_revs: missing,
	        attachments: true
	      };
	      return src.get(id, opts).then(function (docs) {
	        docs.forEach(function (doc) {
	          if (state.cancelled) {
	            return completeReplication();
	          }
	          if (doc.ok) {
	            result.docs_read++;
	            currentBatch.pendingRevs++;
	            currentBatch.docs.push(doc.ok);
	          }
	        });
	        delete diffs[id];
	      });
	    }));
	  }

	  function getAllDocs() {
	    var diffKeys = Object.keys(currentBatch.diffs);
	    return utils.Promise.all(diffKeys.map(processDiffDoc));
	  }


	  function getRevisionOneDocs() {
	    // filter out the generation 1 docs and get them
	    // leaving the non-generation one docs to be got otherwise
	    var ids = Object.keys(currentBatch.diffs).filter(function (id) {
	      var missing = currentBatch.diffs[id].missing;
	      return missing.length === 1 && missing[0].slice(0, 2) === '1-';
	    });
	    if (!ids.length) { // nothing to fetch
	      return utils.Promise.resolve();
	    }
	    return src.allDocs({
	      keys: ids,
	      include_docs: true
	    }).then(function (res) {
	      if (state.cancelled) {
	        completeReplication();
	        throw (new Error('cancelled'));
	      }
	      res.rows.forEach(function (row) {
	        if (row.doc && !row.deleted &&
	          row.value.rev.slice(0, 2) === '1-' && (
	            !row.doc._attachments ||
	            Object.keys(row.doc._attachments).length === 0
	          )
	        ) {
	          result.docs_read++;
	          currentBatch.pendingRevs++;
	          currentBatch.docs.push(row.doc);
	          delete currentBatch.diffs[row.id];
	        }
	      });
	    });
	  }

	  function getDocs() {
	    return getRevisionOneDocs().then(getAllDocs);
	  }

	  function finishBatch() {
	    writingCheckpoint = true;
	    return checkpointer.writeCheckpoint(currentBatch.seq).then(function () {
	      writingCheckpoint = false;
	      if (state.cancelled) {
	        completeReplication();
	        throw new Error('cancelled');
	      }
	      result.last_seq = last_seq = currentBatch.seq;
	      var outResult = utils.clone(result);
	      outResult.docs = changedDocs;
	      returnValue.emit('change', outResult);
	      currentBatch = undefined;
	      getChanges();
	    }).catch(function (err) {
	      writingCheckpoint = false;
	      abortReplication('writeCheckpoint completed with error', err);
	      throw err;
	    });
	  }

	  function getDiffs() {
	    var diff = {};
	    currentBatch.changes.forEach(function (change) {
	      diff[change.id] = change.changes.map(function (x) {
	        return x.rev;
	      });
	    });
	    return target.revsDiff(diff).then(function (diffs) {
	      if (state.cancelled) {
	        completeReplication();
	        throw new Error('cancelled');
	      }
	      // currentBatch.diffs elements are deleted as the documents are written
	      currentBatch.diffs = diffs;
	      currentBatch.pendingRevs = 0;
	    });
	  }

	  function startNextBatch() {
	    if (state.cancelled || currentBatch) {
	      return;
	    }
	    if (batches.length === 0) {
	      processPendingBatch(true);
	      return;
	    }
	    currentBatch = batches.shift();
	    getDiffs()
	      .then(getDocs)
	      .then(writeDocs)
	      .then(finishBatch)
	      .then(startNextBatch)
	      .catch(function (err) {
	        abortReplication('batch processing terminated with error', err);
	      });
	  }


	  function processPendingBatch(immediate) {
	    if (pendingBatch.changes.length === 0) {
	      if (batches.length === 0 && !currentBatch) {
	        if ((continuous && changesOpts.live) || changesCompleted) {
	          returnValue.emit('paused');
	          returnValue.emit('uptodate', result);
	        }
	        if (changesCompleted) {
	          completeReplication();
	        }
	      }
	      return;
	    }
	    if (
	      immediate ||
	      changesCompleted ||
	      pendingBatch.changes.length >= batch_size
	    ) {
	      batches.push(pendingBatch);
	      pendingBatch = {
	        seq: 0,
	        changes: [],
	        docs: []
	      };
	      startNextBatch();
	    }
	  }


	  function abortReplication(reason, err) {
	    if (replicationCompleted) {
	      return;
	    }
	    if (!err.message) {
	      err.message = reason;
	    }
	    result.ok = false;
	    result.status = 'aborting';
	    result.errors.push(err);
	    allErrors = allErrors.concat(err);
	    batches = [];
	    pendingBatch = {
	      seq: 0,
	      changes: [],
	      docs: []
	    };
	    completeReplication();
	  }


	  function completeReplication() {
	    if (replicationCompleted) {
	      return;
	    }
	    if (state.cancelled) {
	      result.status = 'cancelled';
	      if (writingCheckpoint) {
	        return;
	      }
	    }
	    result.status = result.status || 'complete';
	    result.end_time = new Date();
	    result.last_seq = last_seq;
	    replicationCompleted = state.cancelled = true;
	    var non403s = allErrors.filter(function (error) {
	      return error.name !== 'unauthorized' && error.name !== 'forbidden';
	    });
	    if (non403s.length > 0) {
	      var error = allErrors.pop();
	      if (allErrors.length > 0) {
	        error.other_errors = allErrors;
	      }
	      error.result = result;
	      backOff(repId, src, target, opts, returnValue, result, error);
	    } else {
	      result.errors = allErrors;
	      returnValue.emit('complete', result);
	      returnValue.removeAllListeners();
	    }
	  }


	  function onChange(change) {
	    if (state.cancelled) {
	      return completeReplication();
	    }
	    var filter = utils.filterChange(opts)(change);
	    if (!filter) {
	      return;
	    }
	    if (
	      pendingBatch.changes.length === 0 &&
	      batches.length === 0 &&
	      !currentBatch
	    ) {
	      returnValue.emit('outofdate', result);
	    }
	    pendingBatch.seq = change.seq;
	    pendingBatch.changes.push(change);
	    processPendingBatch(batches.length === 0);
	  }


	  function onChangesComplete(changes) {
	    changesPending = false;
	    if (state.cancelled) {
	      return completeReplication();
	    }

	    // if no results were returned then we're done,
	    // else fetch more
	    if (changes.results.length > 0) {
	      changesOpts.since = changes.last_seq;
	      getChanges();
	    } else {
	      if (continuous) {
	        changesOpts.live = true;
	        getChanges();
	      } else {
	        changesCompleted = true;
	      }
	    }
	    processPendingBatch(true);
	  }


	  function onChangesError(err) {
	    changesPending = false;
	    if (state.cancelled) {
	      return completeReplication();
	    }
	    abortReplication('changes rejected', err);
	  }


	  function getChanges() {
	    if (!(
	      !changesPending &&
	      !changesCompleted &&
	      batches.length < batches_limit
	    )) {
	      return;
	    }
	    changesPending = true;
	    function abortChanges() {
	      changes.cancel();
	    }
	    function removeListener() {
	      returnValue.removeListener('cancel', abortChanges);
	    }
	    returnValue.once('cancel', abortChanges);
	    var changes = src.changes(changesOpts)
	    .on('change', onChange);
	    changes.then(removeListener, removeListener);
	    changes.then(onChangesComplete)
	    .catch(onChangesError);
	  }


	  function startChanges() {
	    checkpointer.getCheckpoint().then(function (checkpoint) {
	      last_seq = checkpoint;
	      changesOpts = {
	        since: last_seq,
	        limit: batch_size,
	        batch_size: batch_size,
	        style: 'all_docs',
	        doc_ids: doc_ids,
	        returnDocs: true // required so we know when we're done
	      };
	      if (opts.filter) {
	        // required for the client-side filter in onChange
	        changesOpts.include_docs = true;
	      }
	      if (opts.query_params) {
	        changesOpts.query_params = opts.query_params;
	      }
	      getChanges();
	    }).catch(function (err) {
	      abortReplication('getCheckpoint rejected with ', err);
	    });
	  }


	  returnValue.once('cancel', completeReplication);

	  if (typeof opts.onChange === 'function') {
	    returnValue.on('change', opts.onChange);
	  }

	  if (typeof opts.complete === 'function') {
	    returnValue.once('error', opts.complete);
	    returnValue.once('complete', function (result) {
	      opts.complete(null, result);
	    });
	  }

	  if (typeof opts.since === 'undefined') {
	    startChanges();
	  } else {
	    writingCheckpoint = true;
	    checkpointer.writeCheckpoint(opts.since).then(function () {
	      writingCheckpoint = false;
	      if (state.cancelled) {
	        completeReplication();
	        return;
	      }
	      last_seq = opts.since;
	      startChanges();
	    }).catch(function (err) {
	      writingCheckpoint = false;
	      abortReplication('writeCheckpoint completed with error', err);
	      throw err;
	    });
	  }
	}

	exports.toPouch = toPouch;
	function toPouch(db, opts) {
	  var PouchConstructor = opts.PouchConstructor;
	  if (typeof db === 'string') {
	    return new PouchConstructor(db);
	  } else if (db.then) {
	    return db;
	  } else {
	    return utils.Promise.resolve(db);
	  }
	}


	exports.replicate = replicateWrapper;
	function replicateWrapper(src, target, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  if (typeof opts === 'undefined') {
	    opts = {};
	  }
	  if (!opts.complete) {
	    opts.complete = callback || function () {};
	  }
	  opts = utils.clone(opts);
	  opts.continuous = opts.continuous || opts.live;
	  opts.retry = ('retry' in opts) ? opts.retry : RETRY_DEFAULT;
	  /*jshint validthis:true */
	  opts.PouchConstructor = opts.PouchConstructor || this;
	  var replicateRet = new Replication(opts);
	  toPouch(src, opts).then(function (src) {
	    return toPouch(target, opts).then(function (target) {
	      return genReplicationId(src, target, opts).then(function (repId) {
	        replicate(repId, src, target, opts, replicateRet);
	      });
	    });
	  }).catch(function (err) {
	    replicateRet.emit('error', err);
	    opts.complete(err);
	  });
	  return replicateRet;
	}


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(4);
	var replication = __webpack_require__(6);
	var replicate = replication.replicate;
	var EE = __webpack_require__(38).EventEmitter;

	utils.inherits(Sync, EE);
	module.exports = sync;
	function sync(src, target, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  if (typeof opts === 'undefined') {
	    opts = {};
	  }
	  opts = utils.clone(opts);
	  /*jshint validthis:true */
	  opts.PouchConstructor = opts.PouchConstructor || this;
	  src = replication.toPouch(src, opts);
	  target = replication.toPouch(target, opts);
	  return new Sync(src, target, opts, callback);
	}

	function Sync(src, target, opts, callback) {
	  var self = this;
	  this.canceled = false;

	  var onChange, complete;
	  if ('onChange' in opts) {
	    onChange = opts.onChange;
	    delete opts.onChange;
	  }
	  if (typeof callback === 'function' && !opts.complete) {
	    complete = callback;
	  } else if ('complete' in opts) {
	    complete = opts.complete;
	    delete opts.complete;
	  }

	  this.push = replicate(src, target, opts);
	  this.pull = replicate(target, src, opts);

	  var emittedCancel = false;
	  function onCancel(data) {
	    if (!emittedCancel) {
	      emittedCancel = true;
	      self.emit('cancel', data);
	    }
	  }
	  function pullChange(change) {
	    self.emit('change', {
	      direction: 'pull',
	      change: change
	    });
	  }
	  function pushChange(change) {
	    self.emit('change', {
	      direction: 'push',
	      change: change
	    });
	  }
	  function pushDenied(doc) {
	    self.emit('denied', {
	      direction: 'push',
	      doc: doc
	    });
	  }
	  function pullDenied(doc) {
	    self.emit('denied', {
	      direction: 'pull',
	      doc: doc
	    });
	  }

	  var listeners = {};
	  var removed = {};

	  function removeAll(type) { // type is 'push' or 'pull'
	    return function (event, func) {
	      var isChange = event === 'change' &&
	        (func === pullChange || func === pushChange);
	      var isCancel = event === 'cancel' && func === onCancel;
	      var isOtherEvent = event in listeners && func === listeners[event];

	      if (isChange || isCancel || isOtherEvent) {
	        if (!(event in removed)) {
	          removed[event] = {};
	        }
	        removed[event][type] = true;
	        if (Object.keys(removed[event]).length === 2) {
	          // both push and pull have asked to be removed
	          self.removeAllListeners(event);
	        }
	      }
	    };
	  }

	  if (opts.live) {
	    this.push.on('complete', self.pull.cancel.bind(self.pull));
	    this.pull.on('complete', self.push.cancel.bind(self.push));
	  }

	  this.on('newListener', function (event) {
	    if (event === 'change') {
	      self.pull.on('change', pullChange);
	      self.push.on('change', pushChange);
	    } else if (event === 'denied') {
	      self.pull.on('denied', pullDenied);
	      self.push.on('denied', pushDenied);
	    } else if (event === 'cancel') {
	      self.pull.on('cancel', onCancel);
	      self.push.on('cancel', onCancel);
	    } else if (event !== 'error' &&
	      event !== 'removeListener' &&
	      event !== 'complete' && !(event in listeners)) {
	      listeners[event] = function (e) {
	        self.emit(event, e);
	      };
	      self.pull.on(event, listeners[event]);
	      self.push.on(event, listeners[event]);
	    }
	  });

	  this.on('removeListener', function (event) {
	    if (event === 'change') {
	      self.pull.removeListener('change', pullChange);
	      self.push.removeListener('change', pushChange);
	    } else if (event === 'cancel') {
	      self.pull.removeListener('cancel', onCancel);
	      self.push.removeListener('cancel', onCancel);
	    } else if (event in listeners) {
	      if (typeof listeners[event] === 'function') {
	        self.pull.removeListener(event, listeners[event]);
	        self.push.removeListener(event, listeners[event]);
	        delete listeners[event];
	      }
	    }
	  });

	  this.pull.on('removeListener', removeAll('pull'));
	  this.push.on('removeListener', removeAll('push'));

	  var promise = utils.Promise.all([
	    this.push,
	    this.pull
	  ]).then(function (resp) {
	    var out = {
	      push: resp[0],
	      pull: resp[1]
	    };
	    self.emit('complete', out);
	    if (complete) {
	      complete(null, out);
	    }
	    self.removeAllListeners();
	    return out;
	  }, function (err) {
	    self.cancel();
	    self.emit('error', err);
	    if (complete) {
	      complete(err);
	    }
	    self.removeAllListeners();
	    throw err;
	  });

	  this.then = function (success, err) {
	    return promise.then(success, err);
	  };

	  this.catch = function (err) {
	    return promise.catch(err);
	  };
	}

	Sync.prototype.cancel = function () {
	  if (!this.canceled) {
	    this.canceled = true;
	    this.push.cancel();
	    this.pull.cancel();
	  }
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = "3.3.1";


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {"use strict";

	var CHANGES_BATCH_SIZE = 25;

	// according to http://stackoverflow.com/a/417184/680742,
	// the de factor URL length limit is 2000 characters.
	// but since most of our measurements don't take the full
	// URL into account, we fudge it a bit.
	// TODO: we could measure the full URL to enforce exactly 2000 chars
	var MAX_URL_LENGTH = 1800;

	var utils = __webpack_require__(4);
	var errors = __webpack_require__(5);
	var log = __webpack_require__(52)('pouchdb:http');
	var isBrowser = typeof process === 'undefined' || process.browser;
	var buffer = __webpack_require__(27);

	function encodeDocId(id) {
	  if (/^_(design|local)/.test(id)) {
	    return id;
	  }
	  return encodeURIComponent(id);
	}

	function preprocessAttachments(doc) {
	  if (!doc._attachments || !Object.keys(doc._attachments)) {
	    return utils.Promise.resolve();
	  }

	  return utils.Promise.all(Object.keys(doc._attachments).map(function (key) {
	    var attachment = doc._attachments[key];
	    if (attachment.data && typeof attachment.data !== 'string') {
	      if (isBrowser) {
	        return new utils.Promise(function (resolve) {
	          utils.readAsBinaryString(attachment.data, function (binary) {
	            attachment.data = utils.btoa(binary);
	            resolve();
	          });
	        });
	      } else {
	        attachment.data = attachment.data.toString('base64');
	      }
	    }
	  }));
	}

	// Get all the information you possibly can about the URI given by name and
	// return it as a suitable object.
	function getHost(name, opts) {
	  // If the given name contains "http:"
	  if (/http(s?):/.test(name)) {
	    // Prase the URI into all its little bits
	    var uri = utils.parseUri(name);

	    // Store the fact that it is a remote URI
	    uri.remote = true;

	    // Store the user and password as a separate auth object
	    if (uri.user || uri.password) {
	      uri.auth = {username: uri.user, password: uri.password};
	    }

	    // Split the path part of the URI into parts using '/' as the delimiter
	    // after removing any leading '/' and any trailing '/'
	    var parts = uri.path.replace(/(^\/|\/$)/g, '').split('/');

	    // Store the first part as the database name and remove it from the parts
	    // array
	    uri.db = parts.pop();

	    // Restore the path by joining all the remaining parts (all the parts
	    // except for the database name) with '/'s
	    uri.path = parts.join('/');
	    opts = opts || {};
	    opts = utils.clone(opts);
	    uri.headers = opts.headers || (opts.ajax && opts.ajax.headers) || {};

	    if (opts.auth || uri.auth) {
	      var nAuth = opts.auth || uri.auth;
	      var token = utils.btoa(nAuth.username + ':' + nAuth.password);
	      uri.headers.Authorization = 'Basic ' + token;
	    }

	    if (opts.headers) {
	      uri.headers = opts.headers;
	    }

	    return uri;
	  }

	  // If the given name does not contain 'http:' then return a very basic object
	  // with no host, the current path, the given name as the database name and no
	  // username/password
	  return {host: '', path: '/', db: name, auth: false};
	}

	// Generate a URL with the host data given by opts and the given path
	function genDBUrl(opts, path) {
	  return genUrl(opts, opts.db + '/' + path);
	}

	// Generate a URL with the host data given by opts and the given path
	function genUrl(opts, path) {
	  if (opts.remote) {
	    // If the host already has a path, then we need to have a path delimiter
	    // Otherwise, the path delimiter is the empty string
	    var pathDel = !opts.path ? '' : '/';

	    // If the host already has a path, then we need to have a path delimiter
	    // Otherwise, the path delimiter is the empty string
	    return opts.protocol + '://' + opts.host + ':' + opts.port + '/' +
	           opts.path + pathDel + path;
	  }

	  return '/' + path;
	}

	// Implements the PouchDB API for dealing with CouchDB instances over HTTP
	function HttpPouch(opts, callback) {
	  // The functions that will be publicly available for HttpPouch
	  var api = this;
	  api.getHost = opts.getHost ? opts.getHost : getHost;

	  // Parse the URI given by opts.name into an easy-to-use object
	  var host = api.getHost(opts.name, opts);

	  // Generate the database URL based on the host
	  var dbUrl = genDBUrl(host, '');

	  api.getUrl = function () {return dbUrl; };
	  api.getHeaders = function () {return utils.clone(host.headers); };

	  var ajaxOpts = opts.ajax || {};
	  opts = utils.clone(opts);
	  function ajax(options, callback) {
	    var reqOpts = utils.extend({}, ajaxOpts, options);
	    log(reqOpts.method + ' ' + reqOpts.url);
	    return utils.ajax(reqOpts, callback);
	  }

	  // Create a new CouchDB database based on the given opts
	  var createDB = function () {
	    ajax({headers: host.headers, method: 'PUT', url: dbUrl}, function (err) {
	      // If we get an "Unauthorized" error
	      if (err && err.status === 401) {
	        // Test if the database already exists
	        ajax({headers: host.headers, method: 'HEAD', url: dbUrl},
	             function (err) {
	          // If there is still an error
	          if (err) {
	            // Give the error to the callback to deal with
	            callback(err);
	          } else {
	            // Continue as if there had been no errors
	            callback(null, api);
	          }
	        });
	        // If there were no errros or if the only error is "Precondition Failed"
	        // (note: "Precondition Failed" occurs when we try to create a database
	        // that already exists)
	      } else if (!err || err.status === 412) {
	        // Continue as if there had been no errors
	        callback(null, api);
	      } else {
	        callback(err);
	      }
	    });
	  };

	  if (!opts.skipSetup) {
	    ajax({headers: host.headers, method: 'GET', url: dbUrl}, function (err) {
	      //check if the db exists
	      if (err) {
	        if (err.status === 404) {
	          utils.explain404(
	            'PouchDB is just detecting if the remote DB exists.');
	          //if it doesn't, create it
	          createDB();
	        } else {
	          callback(err);
	        }
	      } else {
	        //go do stuff with the db
	        callback(null, api);
	      }
	    });
	  }

	  api.type = function () {
	    return 'http';
	  };

	  api.id = utils.adapterFun('id', function (callback) {
	    ajax({
	      headers: host.headers,
	      method: 'GET',
	      url: genUrl(host, '')
	    }, function (err, result) {
	      var uuid = (result && result.uuid) ?
	        result.uuid + host.db : genDBUrl(host, '');
	      callback(null, uuid);
	    });
	  });

	  api.request = utils.adapterFun('request', function (options, callback) {
	    options.headers = host.headers;
	    options.url = genDBUrl(host, options.url);
	    ajax(options, callback);
	  });

	  // Sends a POST request to the host calling the couchdb _compact function
	  //    version: The version of CouchDB it is running
	  api.compact = utils.adapterFun('compact', function (opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    opts = utils.clone(opts);
	    ajax({
	      headers: host.headers,
	      url: genDBUrl(host, '_compact'),
	      method: 'POST'
	    }, function () {
	      function ping() {
	        api.info(function (err, res) {
	          if (!res.compact_running) {
	            callback(null, {ok: true});
	          } else {
	            setTimeout(ping, opts.interval || 200);
	          }
	        });
	      }
	      // Ping the http if it's finished compaction
	      if (typeof callback === "function") {
	        ping();
	      }
	    });
	  });

	  // Calls GET on the host, which gets back a JSON string containing
	  //    couchdb: A welcome string
	  //    version: The version of CouchDB it is running
	  api._info = function (callback) {
	    ajax({
	      headers: host.headers,
	      method: 'GET',
	      url: genDBUrl(host, '')
	    }, function (err, res) {
	      if (err) {
	        callback(err);
	      } else {
	        res.host = genDBUrl(host, '');
	        callback(null, res);
	      }
	    });
	  };

	  // Get the document with the given id from the database given by host.
	  // The id could be solely the _id in the database, or it may be a
	  // _design/ID or _local/ID path
	  api.get = utils.adapterFun('get', function (id, opts, callback) {
	    // If no options were given, set the callback to the second parameter
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    opts = utils.clone(opts);
	    if (opts.auto_encode === undefined) {
	      opts.auto_encode = true;
	    }

	    // List of parameters to add to the GET request
	    var params = [];

	    // If it exists, add the opts.revs value to the list of parameters.
	    // If revs=true then the resulting JSON will include a field
	    // _revisions containing an array of the revision IDs.
	    if (opts.revs) {
	      params.push('revs=true');
	    }

	    // If it exists, add the opts.revs_info value to the list of parameters.
	    // If revs_info=true then the resulting JSON will include the field
	    // _revs_info containing an array of objects in which each object
	    // representing an available revision.
	    if (opts.revs_info) {
	      params.push('revs_info=true');
	    }

	    if (opts.local_seq) {
	      params.push('local_seq=true');
	    }
	    // If it exists, add the opts.open_revs value to the list of parameters.
	    // If open_revs=all then the resulting JSON will include all the leaf
	    // revisions. If open_revs=["rev1", "rev2",...] then the resulting JSON
	    // will contain an array of objects containing data of all revisions
	    if (opts.open_revs) {
	      if (opts.open_revs !== "all") {
	        opts.open_revs = JSON.stringify(opts.open_revs);
	      }
	      params.push('open_revs=' + opts.open_revs);
	    }

	    // If it exists, add the opts.attachments value to the list of parameters.
	    // If attachments=true the resulting JSON will include the base64-encoded
	    // contents in the "data" property of each attachment.
	    if (opts.attachments) {
	      params.push('attachments=true');
	    }

	    // If it exists, add the opts.rev value to the list of parameters.
	    // If rev is given a revision number then get the specified revision.
	    if (opts.rev) {
	      params.push('rev=' + opts.rev);
	    }

	    // If it exists, add the opts.conflicts value to the list of parameters.
	    // If conflicts=true then the resulting JSON will include the field
	    // _conflicts containing all the conflicting revisions.
	    if (opts.conflicts) {
	      params.push('conflicts=' + opts.conflicts);
	    }

	    // Format the list of parameters into a valid URI query string
	    params = params.join('&');
	    params = params === '' ? '' : '?' + params;

	    if (opts.auto_encode) {
	      id = encodeDocId(id);
	    }

	    // Set the options for the ajax call
	    var options = {
	      headers: host.headers,
	      method: 'GET',
	      url: genDBUrl(host, id + params)
	    };

	    // If the given id contains at least one '/' and the part before the '/'
	    // is NOT "_design" and is NOT "_local"
	    // OR
	    // If the given id contains at least two '/' and the part before the first
	    // '/' is "_design".
	    // TODO This second condition seems strange since if parts[0] === '_design'
	    // then we already know that parts[0] !== '_local'.
	    var parts = id.split('/');
	    if ((parts.length > 1 && parts[0] !== '_design' && parts[0] !== '_local') ||
	        (parts.length > 2 && parts[0] === '_design' && parts[0] !== '_local')) {
	      // Binary is expected back from the server
	      options.binary = true;
	    }

	    // Get the document
	    ajax(options, function (err, doc, xhr) {
	      // If the document does not exist, send an error to the callback
	      if (err) {
	        return callback(err);
	      }

	      // Send the document to the callback
	      callback(null, doc, xhr);
	    });
	  });

	  // Delete the document given by doc from the database given by host.
	  api.remove = utils.adapterFun('remove',
	      function (docOrId, optsOrRev, opts, callback) {
	    var doc;
	    if (typeof optsOrRev === 'string') {
	      // id, rev, opts, callback style
	      doc = {
	        _id: docOrId,
	        _rev: optsOrRev
	      };
	      if (typeof opts === 'function') {
	        callback = opts;
	        opts = {};
	      }
	    } else {
	      // doc, opts, callback style
	      doc = docOrId;
	      if (typeof optsOrRev === 'function') {
	        callback = optsOrRev;
	        opts = {};
	      } else {
	        callback = opts;
	        opts = optsOrRev;
	      }
	    }

	    var rev = (doc._rev || opts.rev);

	    // Delete the document
	    ajax({
	      headers: host.headers,
	      method: 'DELETE',
	      url: genDBUrl(host, encodeDocId(doc._id)) + '?rev=' + rev
	    }, callback);
	  });

	  function encodeAttachmentId(attachmentId) {
	    return attachmentId.split("/").map(encodeURIComponent).join("/");
	  }

	  // Get the attachment
	  api.getAttachment =
	    utils.adapterFun('getAttachment', function (docId, attachmentId, opts,
	                                                callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    opts = utils.clone(opts);
	    if (opts.auto_encode === undefined) {
	      opts.auto_encode = true;
	    }
	    if (opts.auto_encode) {
	      docId = encodeDocId(docId);
	    }
	    opts.auto_encode = false;
	    api.get(docId + '/' + encodeAttachmentId(attachmentId), opts, callback);
	  });

	  // Remove the attachment given by the id and rev
	  api.removeAttachment =
	    utils.adapterFun('removeAttachment', function (docId, attachmentId, rev,
	                                                   callback) {

	    var url = genDBUrl(host, encodeDocId(docId) + '/' +
	      encodeAttachmentId(attachmentId)) + '?rev=' + rev;

	    ajax({
	      headers: host.headers,
	      method: 'DELETE',
	      url: url
	    }, callback);
	  });

	  // Add the attachment given by blob and its contentType property
	  // to the document with the given id, the revision given by rev, and
	  // add it to the database given by host.
	  api.putAttachment =
	    utils.adapterFun('putAttachment', function (docId, attachmentId, rev, blob,
	                                                type, callback) {
	    if (typeof type === 'function') {
	      callback = type;
	      type = blob;
	      blob = rev;
	      rev = null;
	    }
	    if (typeof type === 'undefined') {
	      type = blob;
	      blob = rev;
	      rev = null;
	    }
	    var id = encodeDocId(docId) + '/' + encodeAttachmentId(attachmentId);
	    var url = genDBUrl(host, id);
	    if (rev) {
	      url += '?rev=' + rev;
	    }

	    if (typeof blob === 'string') {
	      var binary;
	      try {
	        binary = utils.atob(blob);
	      } catch (err) {
	        // it's not base64-encoded, so throw error
	        return callback(errors.error(errors.BAD_ARG,
	                        'Attachments need to be base64 encoded'));
	      }
	      if (isBrowser) {
	        blob = utils.createBlob([utils.fixBinary(binary)], {type: type});
	      } else {
	        blob = binary ? new buffer(binary, 'binary') : '';
	      }
	    }

	    var opts = {
	      headers: utils.clone(host.headers),
	      method: 'PUT',
	      url: url,
	      processData: false,
	      body: blob,
	      timeout: 60000
	    };
	    opts.headers['Content-Type'] = type;
	    // Add the attachment
	    ajax(opts, callback);
	  });

	  // Add the document given by doc (in JSON string format) to the database
	  // given by host. This fails if the doc has no _id field.
	  api.put = utils.adapterFun('put', utils.getArguments(function (args) {
	    var temp, temptype, opts;
	    var doc = args.shift();
	    var id = '_id' in doc;
	    var callback = args.pop();
	    if (typeof doc !== 'object' || Array.isArray(doc)) {
	      return callback(errors.error(errors.NOT_AN_OBJECT));
	    }

	    doc = utils.clone(doc);

	    preprocessAttachments(doc).then(function () {
	      while (true) {
	        temp = args.shift();
	        temptype = typeof temp;
	        if (temptype === "string" && !id) {
	          doc._id = temp;
	          id = true;
	        } else if (temptype === "string" && id && !('_rev' in doc)) {
	          doc._rev = temp;
	        } else if (temptype === "object") {
	          opts = utils.clone(temp);
	        }
	        if (!args.length) {
	          break;
	        }
	      }
	      opts = opts || {};
	      var error = utils.invalidIdError(doc._id);
	      if (error) {
	        throw error;
	      }

	      // List of parameter to add to the PUT request
	      var params = [];

	      // If it exists, add the opts.new_edits value to the list of parameters.
	      // If new_edits = false then the database will NOT assign this document a
	      // new revision number
	      if (opts && typeof opts.new_edits !== 'undefined') {
	        params.push('new_edits=' + opts.new_edits);
	      }

	      // Format the list of parameters into a valid URI query string
	      params = params.join('&');
	      if (params !== '') {
	        params = '?' + params;
	      }

	      // Add the document
	      ajax({
	        headers: host.headers,
	        method: 'PUT',
	        url: genDBUrl(host, encodeDocId(doc._id)) + params,
	        body: doc
	      }, function (err, res) {
	        if (err) {
	          return callback(err);
	        }
	        res.ok = true;
	        callback(null, res);
	      });
	    }).catch(callback);

	  }));

	  // Add the document given by doc (in JSON string format) to the database
	  // given by host. This does not assume that doc is a new document 
	  // (i.e. does not have a _id or a _rev field.)
	  api.post = utils.adapterFun('post', function (doc, opts, callback) {
	    // If no options were given, set the callback to be the second parameter
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    opts = utils.clone(opts);
	    if (typeof doc !== 'object') {
	      return callback(errors.error(errors.NOT_AN_OBJECT));
	    }
	    if (! ("_id" in doc)) {
	      doc._id = utils.uuid();
	    }
	    api.put(doc, opts, function (err, res) {
	      if (err) {
	        return callback(err);
	      }
	      res.ok = true;
	      callback(null, res);
	    });
	  });

	  // Update/create multiple documents given by req in the database
	  // given by host.
	  api._bulkDocs = function (req, opts, callback) {
	    // If opts.new_edits exists add it to the document data to be
	    // send to the database.
	    // If new_edits=false then it prevents the database from creating
	    // new revision numbers for the documents. Instead it just uses
	    // the old ones. This is used in database replication.
	    if (typeof opts.new_edits !== 'undefined') {
	      req.new_edits = opts.new_edits;
	    }

	    utils.Promise.all(req.docs.map(preprocessAttachments)).then(function () {
	      // Update/create the documents
	      ajax({
	        headers: host.headers,
	        method: 'POST',
	        url: genDBUrl(host, '_bulk_docs'),
	        body: req
	      }, function (err, results) {
	        if (err) {
	          return callback(err);
	        }
	        results.forEach(function (result) {
	          result.ok = true; // smooths out cloudant not adding this
	        });
	        callback(null, results);
	      });
	    }).catch(callback);
	  };

	  // Get a listing of the documents in the database given
	  // by host and ordered by increasing id.
	  api.allDocs = utils.adapterFun('allDocs', function (opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    opts = utils.clone(opts);
	    // List of parameters to add to the GET request
	    var params = [];
	    var body;
	    var method = 'GET';

	    if (opts.conflicts) {
	      params.push('conflicts=true');
	    }

	    // If opts.descending is truthy add it to params
	    if (opts.descending) {
	      params.push('descending=true');
	    }

	    // If opts.include_docs exists, add the include_docs value to the
	    // list of parameters.
	    // If include_docs=true then include the associated document with each
	    // result.
	    if (opts.include_docs) {
	      params.push('include_docs=true');
	    }

	    if (opts.attachments) {
	      // added in CouchDB 1.6.0
	      params.push('attachments=true');
	    }

	    if (opts.key) {
	      params.push('key=' + encodeURIComponent(JSON.stringify(opts.key)));
	    }

	    // If opts.startkey exists, add the startkey value to the list of
	    // parameters.
	    // If startkey is given then the returned list of documents will
	    // start with the document whose id is startkey.
	    if (opts.startkey) {
	      params.push('startkey=' +
	        encodeURIComponent(JSON.stringify(opts.startkey)));
	    }

	    // If opts.endkey exists, add the endkey value to the list of parameters.
	    // If endkey is given then the returned list of docuemnts will
	    // end with the document whose id is endkey.
	    if (opts.endkey) {
	      params.push('endkey=' + encodeURIComponent(JSON.stringify(opts.endkey)));
	    }

	    if (typeof opts.inclusive_end !== 'undefined') {
	      params.push('inclusive_end=' + !!opts.inclusive_end);
	    }

	    // If opts.limit exists, add the limit value to the parameter list.
	    if (typeof opts.limit !== 'undefined') {
	      params.push('limit=' + opts.limit);
	    }

	    if (typeof opts.skip !== 'undefined') {
	      params.push('skip=' + opts.skip);
	    }

	    // Format the list of parameters into a valid URI query string
	    params = params.join('&');
	    if (params !== '') {
	      params = '?' + params;
	    }

	    if (typeof opts.keys !== 'undefined') {


	      var keysAsString =
	        'keys=' + encodeURIComponent(JSON.stringify(opts.keys));
	      if (keysAsString.length + params.length + 1 <= MAX_URL_LENGTH) {
	        // If the keys are short enough, do a GET. we do this to work around
	        // Safari not understanding 304s on POSTs (see issue #1239)
	        params += (params.indexOf('?') !== -1 ? '&' : '?') + keysAsString;
	      } else {
	        // If keys are too long, issue a POST request to circumvent GET
	        // query string limits
	        // see http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options
	        method = 'POST';
	        body = JSON.stringify({keys: opts.keys});
	      }
	    }

	    // Get the document listing
	    ajax({
	      headers: host.headers,
	      method: method,
	      url: genDBUrl(host, '_all_docs' + params),
	      body: body
	    }, callback);
	  });

	  // Get a list of changes made to documents in the database given by host.
	  // TODO According to the README, there should be two other methods here,
	  // api.changes.addListener and api.changes.removeListener.
	  api._changes = function (opts) {
	    // We internally page the results of a changes request, this means
	    // if there is a large set of changes to be returned we can start
	    // processing them quicker instead of waiting on the entire
	    // set of changes to return and attempting to process them at once
	    var batchSize = 'batch_size' in opts ? opts.batch_size : CHANGES_BATCH_SIZE;

	    opts = utils.clone(opts);
	    opts.timeout = opts.timeout || 30 * 1000;

	    // We give a 5 second buffer for CouchDB changes to respond with
	    // an ok timeout
	    var params = { timeout: opts.timeout - (5 * 1000) };
	    var limit = (typeof opts.limit !== 'undefined') ? opts.limit : false;
	    if (limit === 0) {
	      limit = 1;
	    }
	    var returnDocs;
	    if ('returnDocs' in opts) {
	      returnDocs = opts.returnDocs;
	    } else {
	      returnDocs = true;
	    }
	    //
	    var leftToFetch = limit;

	    if (opts.style) {
	      params.style = opts.style;
	    }

	    if (opts.include_docs || opts.filter && typeof opts.filter === 'function') {
	      params.include_docs = true;
	    }

	    if (opts.attachments) {
	      params.attachments = true;
	    }

	    if (opts.continuous) {
	      params.feed = 'longpoll';
	    }

	    if (opts.conflicts) {
	      params.conflicts = true;
	    }

	    if (opts.descending) {
	      params.descending = true;
	    }

	    if (opts.filter && typeof opts.filter === 'string') {
	      params.filter = opts.filter;
	      if (opts.filter === '_view' &&
	          opts.view &&
	          typeof opts.view === 'string') {
	        params.view = opts.view;
	      }
	    }

	    // If opts.query_params exists, pass it through to the changes request.
	    // These parameters may be used by the filter on the source database.
	    if (opts.query_params && typeof opts.query_params === 'object') {
	      for (var param_name in opts.query_params) {
	        if (opts.query_params.hasOwnProperty(param_name)) {
	          params[param_name] = opts.query_params[param_name];
	        }
	      }
	    }

	    var method = 'GET';
	    var body;

	    if (opts.doc_ids) {
	      // set this automagically for the user; it's annoying that couchdb
	      // requires both a "filter" and a "doc_ids" param.
	      params.filter = '_doc_ids';

	      var docIdsJson = JSON.stringify(opts.doc_ids);

	      if (docIdsJson.length < MAX_URL_LENGTH) {
	        params.doc_ids = docIdsJson;
	      } else {
	        // anything greater than ~2000 is unsafe for gets, so
	        // use POST instead
	        method = 'POST';
	        body = {doc_ids: opts.doc_ids };
	      }
	    }

	    if (opts.continuous && api._useSSE) {
	      return  api.sse(opts, params, returnDocs);
	    }
	    var xhr;
	    var lastFetchedSeq;

	    // Get all the changes starting wtih the one immediately after the
	    // sequence number given by since.
	    var fetch = function (since, callback) {
	      if (opts.aborted) {
	        return;
	      }
	      params.since = since;
	      if (typeof params.since === "object") {
	        params.since = JSON.stringify(params.since);
	      }

	      if (opts.descending) {
	        if (limit) {
	          params.limit = leftToFetch;
	        }
	      } else {
	        params.limit = (!limit || leftToFetch > batchSize) ?
	          batchSize : leftToFetch;
	      }

	      var paramStr = '?' + Object.keys(params).map(function (k) {
	        return k + '=' + params[k];
	      }).join('&');

	      // Set the options for the ajax call
	      var xhrOpts = {
	        headers: host.headers,
	        method: method,
	        url: genDBUrl(host, '_changes' + paramStr),
	        // _changes can take a long time to generate, especially when filtered
	        timeout: opts.timeout,
	        body: body
	      };
	      lastFetchedSeq = since;

	      if (opts.aborted) {
	        return;
	      }

	      // Get the changes
	      xhr = ajax(xhrOpts, callback);
	    };

	    // If opts.since exists, get all the changes from the sequence
	    // number given by opts.since. Otherwise, get all the changes
	    // from the sequence number 0.
	    var fetchTimeout = 10;
	    var fetchRetryCount = 0;

	    var results = {results: []};

	    var fetched = function (err, res) {
	      if (opts.aborted) {
	        return;
	      }
	      var raw_results_length = 0;
	      // If the result of the ajax call (res) contains changes (res.results)
	      if (res && res.results) {
	        raw_results_length = res.results.length;
	        results.last_seq = res.last_seq;
	        // For each change
	        var req = {};
	        req.query = opts.query_params;
	        res.results = res.results.filter(function (c) {
	          leftToFetch--;
	          var ret = utils.filterChange(opts)(c);
	          if (ret) {
	            if (returnDocs) {
	              results.results.push(c);
	            }
	            utils.call(opts.onChange, c);
	          }
	          return ret;
	        });
	      } else if (err) {
	        // In case of an error, stop listening for changes and call
	        // opts.complete
	        opts.aborted = true;
	        utils.call(opts.complete, err);
	        return;
	      }

	      // The changes feed may have timed out with no results
	      // if so reuse last update sequence
	      if (res && res.last_seq) {
	        lastFetchedSeq = res.last_seq;
	      }

	      var finished = (limit && leftToFetch <= 0) ||
	        (res && raw_results_length < batchSize) ||
	        (opts.descending);

	      if ((opts.continuous && !(limit && leftToFetch <= 0)) || !finished) {
	        // Increase retry delay exponentially as long as errors persist
	        if (err) {
	          fetchRetryCount += 1;
	        } else {
	          fetchRetryCount = 0;
	        }
	        var timeoutMultiplier = 1 << fetchRetryCount;
	        var retryWait = fetchTimeout * timeoutMultiplier;
	        var maximumWait = opts.maximumWait || 30000;

	        if (retryWait > maximumWait) {
	          utils.call(opts.complete, err || errors.error(errors.UNKNOWN_ERROR));
	          return;
	        }

	        // Queue a call to fetch again with the newest sequence number
	        setTimeout(function () { fetch(lastFetchedSeq, fetched); }, retryWait);
	      } else {
	        // We're done, call the callback
	        utils.call(opts.complete, null, results);
	      }
	    };

	    fetch(opts.since || 0, fetched);

	    // Return a method to cancel this method from processing any more
	    return {
	      cancel: function () {
	        opts.aborted = true;
	        if (xhr) {
	          xhr.abort();
	        }
	      }
	    };
	  };

	  api.sse = function (opts, params, returnDocs) {
	    params.feed = 'eventsource';
	    params.since = opts.since || 0;
	    params.limit = opts.limit;
	    delete params.timeout;
	    var paramStr = '?' + Object.keys(params).map(function (k) {
	      return k + '=' + params[k];
	    }).join('&');
	    var url = genDBUrl(host, '_changes' + paramStr);
	    var source = new EventSource(url);
	    var results = {
	      results: [],
	      last_seq: false
	    };
	    var dispatched = false;
	    var open = false;
	    source.addEventListener('message', msgHandler, false);
	    source.onopen = function () {
	      open = true;
	    };
	    source.onerror = errHandler;
	    return {
	      cancel: function () {
	        if (dispatched) {
	          return dispatched.cancel();
	        }
	        source.removeEventListener('message', msgHandler, false);
	        source.close();
	      }
	    };
	    function msgHandler(e) {
	      var data = JSON.parse(e.data);
	      if (returnDocs) {
	        results.results.push(data);
	      }
	      results.last_seq = data.seq;
	      utils.call(opts.onChange, data);
	    }
	    function errHandler(err) {
	      source.removeEventListener('message', msgHandler, false);
	      if (open === false) {
	        // errored before it opened
	        // likely doesn't support EventSource
	        api._useSSE = false;
	        dispatched = api._changes(opts);
	        return;
	      }
	      source.close();
	      utils.call(opts.complete, err);
	    }
	    
	  };

	  api._useSSE = false;
	  // Currently disabled due to failing chrome tests in saucelabs
	  // api._useSSE = typeof global.EventSource === 'function';

	  // Given a set of document/revision IDs (given by req), tets the subset of
	  // those that do NOT correspond to revisions stored in the database.
	  // See http://wiki.apache.org/couchdb/HttpPostRevsDiff
	  api.revsDiff = utils.adapterFun('revsDiff', function (req, opts, callback) {
	    // If no options were given, set the callback to be the second parameter
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }

	    // Get the missing document/revision IDs
	    ajax({
	      headers: host.headers,
	      method: 'POST',
	      url: genDBUrl(host, '_revs_diff'),
	      body: JSON.stringify(req)
	    }, callback);
	  });

	  api._close = function (callback) {
	    callback();
	  };

	  api.destroy = utils.adapterFun('destroy', function (callback) {
	    ajax({
	      url: genDBUrl(host, ''),
	      method: 'DELETE',
	      headers: host.headers
	    }, function (err, resp) {
	      if (err) {
	        api.emit('error', err);
	        callback(err);
	      } else {
	        api.emit('destroyed');
	        callback(null, resp);
	      }
	    });
	  });
	}

	// Delete the HttpPouch specified by the given name.
	HttpPouch.destroy = utils.toPromise(function (name, opts, callback) {
	  var host = getHost(name, opts);
	  opts = opts || {};
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  opts = utils.clone(opts);
	  opts.headers = host.headers;
	  opts.method = 'DELETE';
	  opts.url = genDBUrl(host, '');
	  var ajaxOpts = opts.ajax || {};
	  opts = utils.extend({}, opts, ajaxOpts);
	  utils.ajax(opts, callback);
	});

	// HttpPouch is a valid adapter.
	HttpPouch.valid = function () {
	  return true;
	};

	module.exports = HttpPouch;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	var utils = __webpack_require__(4);
	var merge = __webpack_require__(19);
	var errors = __webpack_require__(5);
	var idbUtils = __webpack_require__(28);
	var idbConstants = __webpack_require__(29);
	var idbBulkDocs = __webpack_require__(30);
	var checkBlobSupport = __webpack_require__(31);

	var ADAPTER_VERSION = idbConstants.ADAPTER_VERSION;
	var ATTACH_AND_SEQ_STORE = idbConstants.ATTACH_AND_SEQ_STORE;
	var ATTACH_STORE = idbConstants.ATTACH_STORE;
	var BY_SEQ_STORE = idbConstants.BY_SEQ_STORE;
	var DETECT_BLOB_SUPPORT_STORE = idbConstants.DETECT_BLOB_SUPPORT_STORE;
	var DOC_STORE = idbConstants.DOC_STORE;
	var LOCAL_STORE = idbConstants.LOCAL_STORE;
	var META_STORE = idbConstants.META_STORE;

	var applyNext = idbUtils.applyNext;
	var compactRevs = idbUtils.compactRevs;
	var decodeDoc = idbUtils.decodeDoc;
	var decodeMetadata = idbUtils.decodeMetadata;
	var encodeMetadata = idbUtils.encodeMetadata;
	var fetchAttachmentsIfNecessary = idbUtils.fetchAttachmentsIfNecessary;
	var idbError = idbUtils.idbError;
	var postProcessAttachments = idbUtils.postProcessAttachments;
	var readBlobData = idbUtils.readBlobData;
	var taskQueue = idbUtils.taskQueue;
	var openTransactionSafely = idbUtils.openTransactionSafely;

	var cachedDBs = {};
	var blobSupportPromise;

	function IdbPouch(opts, callback) {
	  var api = this;

	  taskQueue.queue.push({
	    action: function (thisCallback) {
	      init(api, opts, thisCallback);
	    },
	    callback: callback
	  });
	  applyNext();
	}

	function init(api, opts, callback) {

	  var name = opts.name;

	  var instanceId = null;
	  var idStored = false;
	  var idb = null;
	  api._docCount = -1;
	  api._blobSupport = null;
	  api._name = name;

	  // called when creating a fresh new database
	  function createSchema(db) {
	    var docStore = db.createObjectStore(DOC_STORE, {keyPath : 'id'});
	    db.createObjectStore(BY_SEQ_STORE, {autoIncrement: true})
	      .createIndex('_doc_id_rev', '_doc_id_rev', {unique: true});
	    db.createObjectStore(ATTACH_STORE, {keyPath: 'digest'});
	    db.createObjectStore(META_STORE, {keyPath: 'id', autoIncrement: false});
	    db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);

	    // added in v2
	    docStore.createIndex('deletedOrLocal', 'deletedOrLocal', {unique : false});

	    // added in v3
	    db.createObjectStore(LOCAL_STORE, {keyPath: '_id'});

	    // added in v4
	    var attAndSeqStore = db.createObjectStore(ATTACH_AND_SEQ_STORE,
	      {autoIncrement: true});
	    attAndSeqStore.createIndex('seq', 'seq');
	    attAndSeqStore.createIndex('digestSeq', 'digestSeq', {unique: true});
	  }

	  // migration to version 2
	  // unfortunately "deletedOrLocal" is a misnomer now that we no longer
	  // store local docs in the main doc-store, but whaddyagonnado
	  function addDeletedOrLocalIndex(txn, callback) {
	    var docStore = txn.objectStore(DOC_STORE);
	    docStore.createIndex('deletedOrLocal', 'deletedOrLocal', {unique : false});

	    docStore.openCursor().onsuccess = function (event) {
	      var cursor = event.target.result;
	      if (cursor) {
	        var metadata = cursor.value;
	        var deleted = utils.isDeleted(metadata);
	        metadata.deletedOrLocal = deleted ? "1" : "0";
	        docStore.put(metadata);
	        cursor.continue();
	      } else {
	        callback();
	      }
	    };
	  }

	  // migration to version 3 (part 1)
	  function createLocalStoreSchema(db) {
	    db.createObjectStore(LOCAL_STORE, {keyPath: '_id'})
	      .createIndex('_doc_id_rev', '_doc_id_rev', {unique: true});
	  }

	  // migration to version 3 (part 2)
	  function migrateLocalStore(txn, cb) {
	    var localStore = txn.objectStore(LOCAL_STORE);
	    var docStore = txn.objectStore(DOC_STORE);
	    var seqStore = txn.objectStore(BY_SEQ_STORE);

	    var cursor = docStore.openCursor();
	    cursor.onsuccess = function (event) {
	      var cursor = event.target.result;
	      if (cursor) {
	        var metadata = cursor.value;
	        var docId = metadata.id;
	        var local = utils.isLocalId(docId);
	        var rev = merge.winningRev(metadata);
	        if (local) {
	          var docIdRev = docId + "::" + rev;
	          // remove all seq entries
	          // associated with this docId
	          var start = docId + "::";
	          var end = docId + "::~";
	          var index = seqStore.index('_doc_id_rev');
	          var range = IDBKeyRange.bound(start, end, false, false);
	          var seqCursor = index.openCursor(range);
	          seqCursor.onsuccess = function (e) {
	            seqCursor = e.target.result;
	            if (!seqCursor) {
	              // done
	              docStore.delete(cursor.primaryKey);
	              cursor.continue();
	            } else {
	              var data = seqCursor.value;
	              if (data._doc_id_rev === docIdRev) {
	                localStore.put(data);
	              }
	              seqStore.delete(seqCursor.primaryKey);
	              seqCursor.continue();
	            }
	          };
	        } else {
	          cursor.continue();
	        }
	      } else if (cb) {
	        cb();
	      }
	    };
	  }

	  // migration to version 4 (part 1)
	  function addAttachAndSeqStore(db) {
	    var attAndSeqStore = db.createObjectStore(ATTACH_AND_SEQ_STORE,
	      {autoIncrement: true});
	    attAndSeqStore.createIndex('seq', 'seq');
	    attAndSeqStore.createIndex('digestSeq', 'digestSeq', {unique: true});
	  }

	  // migration to version 4 (part 2)
	  function migrateAttsAndSeqs(txn, callback) {
	    var seqStore = txn.objectStore(BY_SEQ_STORE);
	    var attStore = txn.objectStore(ATTACH_STORE);
	    var attAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);

	    // need to actually populate the table. this is the expensive part,
	    // so as an optimization, check first that this database even
	    // contains attachments
	    var req = attStore.count();
	    req.onsuccess = function (e) {
	      var count = e.target.result;
	      if (!count) {
	        return callback(); // done
	      }

	      seqStore.openCursor().onsuccess = function (e) {
	        var cursor = e.target.result;
	        if (!cursor) {
	          return callback(); // done
	        }
	        var doc = cursor.value;
	        var seq = cursor.primaryKey;
	        var atts = Object.keys(doc._attachments || {});
	        var digestMap = {};
	        for (var j = 0; j < atts.length; j++) {
	          var att = doc._attachments[atts[j]];
	          digestMap[att.digest] = true; // uniq digests, just in case
	        }
	        var digests = Object.keys(digestMap);
	        for (j = 0; j < digests.length; j++) {
	          var digest = digests[j];
	          attAndSeqStore.put({
	            seq: seq,
	            digestSeq: digest + '::' + seq
	          });
	        }
	        cursor.continue();
	      };
	    };
	  }

	  // migration to version 5
	  // Instead of relying on on-the-fly migration of metadata,
	  // this brings the doc-store to its modern form:
	  // - metadata.winningrev
	  // - metadata.seq
	  // - stringify the metadata when storing it
	  function migrateMetadata(txn) {

	    function decodeMetadataCompat(storedObject) {
	      if (!storedObject.data) {
	        // old format, when we didn't store it stringified
	        storedObject.deletedOrLocal = storedObject.deletedOrLocal === '1';
	        return storedObject;
	      }
	      return decodeMetadata(storedObject);
	    }

	    // ensure that every metadata has a winningRev and seq,
	    // which was previously created on-the-fly but better to migrate
	    var bySeqStore = txn.objectStore(BY_SEQ_STORE);
	    var docStore = txn.objectStore(DOC_STORE);
	    var cursor = docStore.openCursor();
	    cursor.onsuccess = function (e) {
	      var cursor = e.target.result;
	      if (!cursor) {
	        return; // done
	      }
	      var metadata = decodeMetadataCompat(cursor.value);

	      metadata.winningRev = metadata.winningRev || merge.winningRev(metadata);

	      function fetchMetadataSeq() {
	        // metadata.seq was added post-3.2.0, so if it's missing,
	        // we need to fetch it manually
	        var start = metadata.id + '::';
	        var end = metadata.id + '::\uffff';
	        var req = bySeqStore.index('_doc_id_rev').openCursor(
	          IDBKeyRange.bound(start, end));

	        var metadataSeq = 0;
	        req.onsuccess = function (e) {
	          var cursor = e.target.result;
	          if (!cursor) {
	            metadata.seq = metadataSeq;
	            return onGetMetadataSeq();
	          }
	          var seq = cursor.primaryKey;
	          if (seq > metadataSeq) {
	            metadataSeq = seq;
	          }
	          cursor.continue();
	        };
	      }

	      function onGetMetadataSeq() {
	        var metadataToStore = encodeMetadata(metadata,
	          metadata.winningRev, metadata.deletedOrLocal);

	        var req = docStore.put(metadataToStore);
	        req.onsuccess = function () {
	          cursor.continue();
	        };
	      }

	      if (metadata.seq) {
	        return onGetMetadataSeq();
	      }

	      fetchMetadataSeq();
	    };

	  }

	  api.type = function () {
	    return 'idb';
	  };

	  api._id = utils.toPromise(function (callback) {
	    callback(null, instanceId);
	  });

	  api._bulkDocs = function idb_bulkDocs(req, opts, callback) {
	    idbBulkDocs(req, opts, api, idb, IdbPouch.Changes, callback);
	  };

	  // First we look up the metadata in the ids database, then we fetch the
	  // current revision(s) from the by sequence store
	  api._get = function idb_get(id, opts, callback) {
	    var doc;
	    var metadata;
	    var err;
	    var txn;
	    opts = utils.clone(opts);
	    if (opts.ctx) {
	      txn = opts.ctx;
	    } else {
	      var txnResult = openTransactionSafely(idb,
	        [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE], 'readonly');
	      if (txnResult.error) {
	        return callback(txnResult.error);
	      }
	      txn = txnResult.txn;
	    }

	    function finish() {
	      callback(err, {doc: doc, metadata: metadata, ctx: txn});
	    }

	    txn.objectStore(DOC_STORE).get(id).onsuccess = function (e) {
	      metadata = decodeMetadata(e.target.result);
	      // we can determine the result here if:
	      // 1. there is no such document
	      // 2. the document is deleted and we don't ask about specific rev
	      // When we ask with opts.rev we expect the answer to be either
	      // doc (possibly with _deleted=true) or missing error
	      if (!metadata) {
	        err = errors.error(errors.MISSING_DOC, 'missing');
	        return finish();
	      }
	      if (utils.isDeleted(metadata) && !opts.rev) {
	        err = errors.error(errors.MISSING_DOC, "deleted");
	        return finish();
	      }
	      var objectStore = txn.objectStore(BY_SEQ_STORE);

	      var rev = opts.rev || metadata.winningRev;
	      var key = metadata.id + '::' + rev;

	      objectStore.index('_doc_id_rev').get(key).onsuccess = function (e) {
	        doc = e.target.result;
	        if (doc) {
	          doc = decodeDoc(doc);
	        }
	        if (!doc) {
	          err = errors.error(errors.MISSING_DOC, 'missing');
	          return finish();
	        }
	        finish();
	      };
	    };
	  };

	  api._getAttachment = function (attachment, opts, callback) {
	    var txn;
	    opts = utils.clone(opts);
	    if (opts.ctx) {
	      txn = opts.ctx;
	    } else {
	      var txnResult = openTransactionSafely(idb,
	        [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE], 'readonly');
	      if (txnResult.error) {
	        return callback(txnResult.error);
	      }
	      txn = txnResult.txn;
	    }
	    var digest = attachment.digest;
	    var type = attachment.content_type;

	    txn.objectStore(ATTACH_STORE).get(digest).onsuccess = function (e) {
	      var body = e.target.result.body;
	      readBlobData(body, type, opts.encode, function (blobData) {
	        callback(null, blobData);
	      });
	    };
	  };

	  function createKeyRange(start, end, inclusiveEnd, key, descending) {
	    try {
	      if (start && end) {
	        if (descending) {
	          return IDBKeyRange.bound(end, start, !inclusiveEnd, false);
	        } else {
	          return IDBKeyRange.bound(start, end, false, !inclusiveEnd);
	        }
	      } else if (start) {
	        if (descending) {
	          return IDBKeyRange.upperBound(start);
	        } else {
	          return IDBKeyRange.lowerBound(start);
	        }
	      } else if (end) {
	        if (descending) {
	          return IDBKeyRange.lowerBound(end, !inclusiveEnd);
	        } else {
	          return IDBKeyRange.upperBound(end, !inclusiveEnd);
	        }
	      } else if (key) {
	        return IDBKeyRange.only(key);
	      }
	    } catch (e) {
	      return {error: e};
	    }
	    return null;
	  }

	  function allDocsQuery(totalRows, opts, callback) {
	    var start = 'startkey' in opts ? opts.startkey : false;
	    var end = 'endkey' in opts ? opts.endkey : false;
	    var key = 'key' in opts ? opts.key : false;
	    var skip = opts.skip || 0;
	    var limit = typeof opts.limit === 'number' ? opts.limit : -1;
	    var inclusiveEnd = opts.inclusive_end !== false;
	    var descending = 'descending' in opts && opts.descending ? 'prev' : null;

	    var keyRange = createKeyRange(start, end, inclusiveEnd, key, descending);
	    if (keyRange && keyRange.error) {
	      var err = keyRange.error;
	      if (err.name === "DataError" && err.code === 0) {
	        // data error, start is less than end
	         return callback(null, {
	           total_rows : totalRows,
	           offset : opts.skip,
	           rows : []
	         });
	      }
	      return callback(errors.error(errors.IDB_ERROR, err.name, err.message));
	    }

	    var stores = [DOC_STORE, BY_SEQ_STORE];
	    if (opts.attachments) {
	      stores.push(ATTACH_STORE);
	    }
	    var txnResult = openTransactionSafely(idb, stores, 'readonly');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var transaction = txnResult.txn;

	    function onResultsReady() {
	      callback(null, {
	        total_rows: totalRows,
	        offset: opts.skip,
	        rows: results
	      });
	    }

	    transaction.oncomplete = function () {
	      if (opts.attachments) {
	        postProcessAttachments(results).then(onResultsReady);
	      } else {
	        onResultsReady();
	      }
	    };

	    var oStore = transaction.objectStore(DOC_STORE);
	    var oCursor = descending ? oStore.openCursor(keyRange, descending)
	      : oStore.openCursor(keyRange);
	    var results = [];
	    oCursor.onsuccess = function (e) {
	      if (!e.target.result) {
	        return;
	      }
	      var cursor = e.target.result;
	      var metadata = decodeMetadata(cursor.value);
	      var winningRev = metadata.winningRev;

	      function allDocsInner(metadata, data) {
	        var doc = {
	          id: metadata.id,
	          key: metadata.id,
	          value: {
	            rev: winningRev
	          }
	        };
	        if (opts.include_docs) {
	          doc.doc = data;
	          if (opts.conflicts) {
	            doc.doc._conflicts = merge.collectConflicts(metadata);
	          }
	          fetchAttachmentsIfNecessary(doc.doc, opts, transaction);
	        }
	        var deleted = utils.isDeleted(metadata, winningRev);
	        if (opts.deleted === 'ok') {
	          // deleted docs are okay with keys_requests
	          if (deleted) {
	            doc.value.deleted = true;
	            doc.doc = null;
	          }
	          results.push(doc);
	        } else if (!deleted && skip-- <= 0) {
	          results.push(doc);
	          if (--limit === 0) {
	            return;
	          }
	        }
	        cursor.continue();
	      }

	      if (!opts.include_docs) {
	        allDocsInner(metadata);
	      } else {
	        var index = transaction.objectStore(BY_SEQ_STORE).index('_doc_id_rev');
	        var key = metadata.id + "::" + winningRev;
	        index.get(key).onsuccess = function (event) {
	          allDocsInner(decodeMetadata(cursor.value),
	            decodeDoc(event.target.result));
	        };
	      }
	    };
	  }

	  function countDocs(callback) {
	    if (api._docCount !== -1) {
	      return callback(null, api._docCount);
	    }

	    var count;
	    var txnResult = openTransactionSafely(idb, [DOC_STORE], 'readonly');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var txn = txnResult.txn;
	    var index = txn.objectStore(DOC_STORE).index('deletedOrLocal');
	    index.count(IDBKeyRange.only("0")).onsuccess = function (e) {
	      count = e.target.result;
	    };
	    txn.onerror = idbError(callback);
	    txn.oncomplete = function () {
	      api._docCount = count;
	      callback(null, api._docCount);
	    };
	  }

	  api._allDocs = function idb_allDocs(opts, callback) {

	    // first count the total_rows
	    countDocs(function (err, totalRows) {
	      if (err) {
	        return callback(err);
	      }
	      if (opts.limit === 0) {
	        return callback(null, {
	          total_rows : totalRows,
	          offset : opts.skip,
	          rows : []
	        });
	      }
	      allDocsQuery(totalRows, opts, callback);
	    });
	  };

	  api._info = function idb_info(callback) {

	    countDocs(function (err, count) {
	      if (err) {
	        return callback(err);
	      }
	      if (idb === null || !cachedDBs[api._name]) {
	        var error = new Error('db isn\'t open');
	        error.id = 'idbNull';
	        return callback(error);
	      }
	      var updateSeq = 0;
	      var txnResult = openTransactionSafely(idb, [BY_SEQ_STORE], 'readonly');
	      if (txnResult.error) {
	        return callback(txnResult.error);
	      }
	      var txn = txnResult.txn;
	      txn.objectStore(BY_SEQ_STORE).openCursor(null, "prev").onsuccess =
	        function (event) {
	        var cursor = event.target.result;
	        if (cursor) {
	          updateSeq = cursor.key;
	        } else {
	          updateSeq = 0;
	        }
	      };

	      txn.oncomplete = function () {
	        callback(null, {
	          doc_count: count,
	          update_seq: updateSeq,
	          // for debugging
	          idb_attachment_format: (api._blobSupport ? 'binary' : 'base64')
	        });
	      };
	    });
	  };

	  api._changes = function (opts) {
	    opts = utils.clone(opts);

	    if (opts.continuous) {
	      var id = name + ':' + utils.uuid();
	      IdbPouch.Changes.addListener(name, id, api, opts);
	      IdbPouch.Changes.notify(name);
	      return {
	        cancel: function () {
	          IdbPouch.Changes.removeListener(name, id);
	        }
	      };
	    }

	    var docIds = opts.doc_ids && new utils.Set(opts.doc_ids);
	    var descending = opts.descending ? 'prev' : null;

	    opts.since = opts.since || 0;
	    var lastSeq = opts.since;

	    var limit = 'limit' in opts ? opts.limit : -1;
	    if (limit === 0) {
	      limit = 1; // per CouchDB _changes spec
	    }
	    var returnDocs;
	    if ('returnDocs' in opts) {
	      returnDocs = opts.returnDocs;
	    } else {
	      returnDocs = true;
	    }

	    var results = [];
	    var numResults = 0;
	    var filter = utils.filterChange(opts);
	    var docIdsToMetadata = new utils.Map();

	    var txn;
	    var bySeqStore;
	    var docStore;

	    function onGetCursor(cursor) {

	      var doc = decodeDoc(cursor.value);
	      var seq = cursor.key;

	      if (docIds && !docIds.has(doc._id)) {
	        return cursor.continue();
	      }

	      var metadata;

	      function onGetMetadata() {
	        if (metadata.seq !== seq) {
	          // some other seq is later
	          return cursor.continue();
	        }

	        lastSeq = seq;

	        if (metadata.winningRev === doc._rev) {
	          return onGetWinningDoc(doc);
	        }

	        fetchWinningDoc();
	      }

	      function fetchWinningDoc() {
	        var docIdRev = doc._id + '::' + metadata.winningRev;
	        var req = bySeqStore.index('_doc_id_rev').openCursor(
	          IDBKeyRange.bound(docIdRev, docIdRev + '\uffff'));
	        req.onsuccess = function (e) {
	          onGetWinningDoc(decodeDoc(e.target.result.value));
	        };
	      }

	      function onGetWinningDoc(winningDoc) {

	        var change = opts.processChange(winningDoc, metadata, opts);
	        change.seq = metadata.seq;
	        if (filter(change)) {
	          numResults++;
	          if (returnDocs) {
	            results.push(change);
	          }
	          // process the attachment immediately
	          // for the benefit of live listeners
	          if (opts.attachments && opts.include_docs) {
	            fetchAttachmentsIfNecessary(winningDoc, opts, txn, function () {
	              postProcessAttachments([change]).then(function () {
	                opts.onChange(change);
	              });
	            });
	          } else {
	            opts.onChange(change);
	          }
	        }
	        if (numResults !== limit) {
	          cursor.continue();
	        }
	      }

	      metadata = docIdsToMetadata.get(doc._id);
	      if (metadata) { // cached
	        return onGetMetadata();
	      }
	      // metadata not cached, have to go fetch it
	      docStore.get(doc._id).onsuccess = function (event) {
	        metadata = decodeMetadata(event.target.result);
	        docIdsToMetadata.set(doc._id, metadata);
	        onGetMetadata();
	      };
	    }

	    function onsuccess(event) {
	      var cursor = event.target.result;

	      if (!cursor) {
	        return;
	      }
	      onGetCursor(cursor);
	    }

	    function fetchChanges() {
	      var objectStores = [DOC_STORE, BY_SEQ_STORE];
	      if (opts.attachments) {
	        objectStores.push(ATTACH_STORE);
	      }
	      var txnResult = openTransactionSafely(idb, objectStores, 'readonly');
	      if (txnResult.error) {
	        return opts.complete(txnResult.error);
	      }
	      txn = txnResult.txn;
	      txn.onerror = idbError(opts.complete);
	      txn.oncomplete = onTxnComplete;

	      bySeqStore = txn.objectStore(BY_SEQ_STORE);
	      docStore = txn.objectStore(DOC_STORE);

	      var req;

	      if (descending) {
	        req = bySeqStore.openCursor(

	          null, descending);
	      } else {
	        req = bySeqStore.openCursor(
	          IDBKeyRange.lowerBound(opts.since, true));
	      }

	      req.onsuccess = onsuccess;
	    }

	    fetchChanges();

	    function onTxnComplete() {

	      function finish() {
	        opts.complete(null, {
	          results: results,
	          last_seq: lastSeq
	        });
	      }

	      if (!opts.continuous && opts.attachments) {
	        // cannot guarantee that postProcessing was already done,
	        // so do it again
	        postProcessAttachments(results).then(finish);
	      } else {
	        finish();
	      }
	    }
	  };

	  api._close = function (callback) {
	    if (idb === null) {
	      return callback(errors.error(errors.NOT_OPEN));
	    }

	    // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBDatabase#close
	    // "Returns immediately and closes the connection in a separate thread..."
	    idb.close();
	    delete cachedDBs[name];
	    idb = null;
	    callback();
	  };

	  api._getRevisionTree = function (docId, callback) {
	    var txnResult = openTransactionSafely(idb, [DOC_STORE], 'readonly');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var txn = txnResult.txn;
	    var req = txn.objectStore(DOC_STORE).get(docId);
	    req.onsuccess = function (event) {
	      var doc = decodeMetadata(event.target.result);
	      if (!doc) {
	        callback(errors.error(errors.MISSING_DOC));
	      } else {
	        callback(null, doc.rev_tree);
	      }
	    };
	  };

	  // This function removes revisions of document docId
	  // which are listed in revs and sets this document
	  // revision to to rev_tree
	  api._doCompaction = function (docId, revs, callback) {
	    var stores = [
	      DOC_STORE,
	      BY_SEQ_STORE,
	      ATTACH_STORE,
	      ATTACH_AND_SEQ_STORE
	    ];
	    var txnResult = openTransactionSafely(idb, stores, 'readwrite');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var txn = txnResult.txn;

	    var docStore = txn.objectStore(DOC_STORE);

	    docStore.get(docId).onsuccess = function (event) {
	      var metadata = decodeMetadata(event.target.result);
	      merge.traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
	                                                         revHash, ctx, opts) {
	        var rev = pos + '-' + revHash;
	        if (revs.indexOf(rev) !== -1) {
	          opts.status = 'missing';
	        }
	      });
	      compactRevs(revs, docId, txn);
	      var winningRev = metadata.winningRev;
	      var deleted = metadata.deletedOrLocal;
	      txn.objectStore(DOC_STORE).put(
	        encodeMetadata(metadata, winningRev, deleted));
	    };
	    txn.onerror = idbError(callback);
	    txn.oncomplete = function () {
	      utils.call(callback);
	    };
	  };


	  api._getLocal = function (id, callback) {
	    var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readonly');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var tx = txnResult.txn;
	    var req = tx.objectStore(LOCAL_STORE).get(id);

	    req.onerror = idbError(callback);
	    req.onsuccess = function (e) {
	      var doc = e.target.result;
	      if (!doc) {
	        callback(errors.error(errors.MISSING_DOC));
	      } else {
	        delete doc['_doc_id_rev']; // for backwards compat
	        callback(null, doc);
	      }
	    };
	  };

	  api._putLocal = function (doc, opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    delete doc._revisions; // ignore this, trust the rev
	    var oldRev = doc._rev;
	    var id = doc._id;
	    if (!oldRev) {
	      doc._rev = '0-1';
	    } else {
	      doc._rev = '0-' + (parseInt(oldRev.split('-')[1], 10) + 1);
	    }

	    var tx = opts.ctx;
	    var ret;
	    if (!tx) {
	      var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readwrite');
	      if (txnResult.error) {
	        return callback(txnResult.error);
	      }
	      tx = txnResult.txn;
	      tx.onerror = idbError(callback);
	      tx.oncomplete = function () {
	        if (ret) {
	          callback(null, ret);
	        }
	      };
	    }

	    var oStore = tx.objectStore(LOCAL_STORE);
	    var req;
	    if (oldRev) {
	      req = oStore.get(id);
	      req.onsuccess = function (e) {
	        var oldDoc = e.target.result;
	        if (!oldDoc || oldDoc._rev !== oldRev) {
	          callback(errors.error(errors.REV_CONFLICT));
	        } else { // update
	          var req = oStore.put(doc);
	          req.onsuccess = function () {
	            ret = {ok: true, id: doc._id, rev: doc._rev};
	            if (opts.ctx) { // return immediately
	              callback(null, ret);
	            }
	          };
	        }
	      };
	    } else { // new doc
	      req = oStore.add(doc);
	      req.onerror = function (e) {
	        // constraint error, already exists
	        callback(errors.error(errors.REV_CONFLICT));
	        e.preventDefault(); // avoid transaction abort
	        e.stopPropagation(); // avoid transaction onerror
	      };
	      req.onsuccess = function () {
	        ret = {ok: true, id: doc._id, rev: doc._rev};
	        if (opts.ctx) { // return immediately
	          callback(null, ret);
	        }
	      };
	    }
	  };

	  api._removeLocal = function (doc, callback) {
	    var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readwrite');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var tx = txnResult.txn;
	    var ret;
	    tx.oncomplete = function () {
	      if (ret) {
	        callback(null, ret);
	      }
	    };
	    var id = doc._id;
	    var oStore = tx.objectStore(LOCAL_STORE);
	    var req = oStore.get(id);

	    req.onerror = idbError(callback);
	    req.onsuccess = function (e) {
	      var oldDoc = e.target.result;
	      if (!oldDoc || oldDoc._rev !== doc._rev) {
	        callback(errors.error(errors.MISSING_DOC));
	      } else {
	        oStore.delete(id);
	        ret = {ok: true, id: id, rev: '0-0'};
	      }
	    };
	  };

	  var cached = cachedDBs[name];

	  if (cached) {
	    idb = cached.idb;
	    instanceId = cached.instanceId;
	    api._blobSupport = cached.blobSupport;
	    process.nextTick(function () {
	      callback(null, api);
	    });
	    return;
	  }

	  var req = indexedDB.open(name, ADAPTER_VERSION);

	  if (!('openReqList' in IdbPouch)) {
	    IdbPouch.openReqList = {};
	  }
	  IdbPouch.openReqList[name] = req;

	  req.onupgradeneeded = function (e) {
	    var db = e.target.result;
	    if (e.oldVersion < 1) {
	      return createSchema(db); // new db, initial schema
	    }
	    // do migrations

	    var txn = e.currentTarget.transaction;
	    // these migrations have to be done in this function, before
	    // control is returned to the event loop, because IndexedDB

	    if (e.oldVersion < 3) {
	      createLocalStoreSchema(db); // v2 -> v3
	    }
	    if (e.oldVersion < 4) {
	      addAttachAndSeqStore(db); // v3 -> v4
	    }

	    var migrations = [
	      addDeletedOrLocalIndex, // v1 -> v2
	      migrateLocalStore,      // v2 -> v3
	      migrateAttsAndSeqs,     // v3 -> v4
	      migrateMetadata         // v4 -> v5
	    ];

	    var i = e.oldVersion;

	    function next() {
	      var migration = migrations[i - 1];
	      i++;
	      if (migration) {
	        migration(txn, next);
	      }
	    }

	    next();
	  };

	  req.onsuccess = function (e) {

	    idb = e.target.result;

	    idb.onversionchange = function () {
	      idb.close();
	      delete cachedDBs[name];
	    };
	    idb.onabort = function () {
	      idb.close();
	      delete cachedDBs[name];
	    };

	    var txn = idb.transaction([META_STORE, DETECT_BLOB_SUPPORT_STORE],
	      'readwrite');

	    var req = txn.objectStore(META_STORE).get(META_STORE);

	    req.onsuccess = function (e) {

	      var checkSetupComplete = function () {
	        if (api._blobSupport === null || !idStored) {
	          return;
	        } else {
	          cachedDBs[name] = {
	            idb: idb,
	            instanceId: instanceId,
	            blobSupport: api._blobSupport,
	            loaded: true
	          };
	          callback(null, api);
	        }
	      };

	      var meta = e.target.result || {id: META_STORE};
	      if (name  + '_id' in meta) {
	        instanceId = meta[name + '_id'];
	        idStored = true;
	        checkSetupComplete();
	      } else {
	        instanceId = utils.uuid();
	        meta[name + '_id'] = instanceId;
	        txn.objectStore(META_STORE).put(meta).onsuccess = function () {
	          idStored = true;
	          checkSetupComplete();
	        };
	      }

	      if (!blobSupportPromise) {
	        // make sure blob support is only checked once
	        blobSupportPromise = checkBlobSupport(txn, idb);
	      }

	      blobSupportPromise.then(function (val) {
	        api._blobSupport = val;
	        checkSetupComplete();
	      });
	    };
	  };

	  req.onerror = idbError(callback);

	}

	IdbPouch.valid = function () {
	  // Issue #2533, we finally gave up on doing bug
	  // detection instead of browser sniffing. Safari brought us
	  // to our knees.
	  var isSafari = typeof openDatabase !== 'undefined' &&
	    /(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent) &&
	    !/Chrome/.test(navigator.userAgent);

	  // some outdated implementations of IDB that appear on Samsung
	  // and HTC Android devices <4.4 are missing IDBKeyRange
	  return !isSafari && typeof indexedDB !== 'undefined' &&
	    typeof IDBKeyRange !== 'undefined';
	};

	function destroy(name, opts, callback) {
	  if (!('openReqList' in IdbPouch)) {
	    IdbPouch.openReqList = {};
	  }
	  IdbPouch.Changes.removeAllListeners(name);

	  //Close open request for "name" database to fix ie delay.
	  if (IdbPouch.openReqList[name] && IdbPouch.openReqList[name].result) {
	    IdbPouch.openReqList[name].result.close();
	    delete cachedDBs[name];
	  }
	  var req = indexedDB.deleteDatabase(name);

	  req.onsuccess = function () {
	    //Remove open request from the list.
	    if (IdbPouch.openReqList[name]) {
	      IdbPouch.openReqList[name] = null;
	    }
	    if (utils.hasLocalStorage() && (name in localStorage)) {
	      delete localStorage[name];
	    }
	    callback(null, { 'ok': true });
	  };

	  req.onerror = idbError(callback);
	}

	IdbPouch.destroy = utils.toPromise(function (name, opts, callback) {
	  taskQueue.queue.push({
	    action: function (thisCallback) {
	      destroy(name, opts, thisCallback);
	    },
	    callback: callback
	  });
	  applyNext();
	});

	IdbPouch.Changes = new utils.Changes();

	module.exports = IdbPouch;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(4);
	var merge = __webpack_require__(19);
	var errors = __webpack_require__(5);
	var parseHexString = __webpack_require__(32);

	var websqlConstants = __webpack_require__(33);
	var websqlUtils = __webpack_require__(34);
	var websqlBulkDocs = __webpack_require__(35);

	var ADAPTER_VERSION = websqlConstants.ADAPTER_VERSION;
	var DOC_STORE = websqlConstants.DOC_STORE;
	var BY_SEQ_STORE = websqlConstants.BY_SEQ_STORE;
	var ATTACH_STORE = websqlConstants.ATTACH_STORE;
	var LOCAL_STORE = websqlConstants.LOCAL_STORE;
	var META_STORE = websqlConstants.META_STORE;
	var ATTACH_AND_SEQ_STORE = websqlConstants.ATTACH_AND_SEQ_STORE;

	var qMarks = websqlUtils.qMarks;
	var stringifyDoc = websqlUtils.stringifyDoc;
	var unstringifyDoc = websqlUtils.unstringifyDoc;
	var select = websqlUtils.select;
	var compactRevs = websqlUtils.compactRevs;
	var unknownError = websqlUtils.unknownError;
	var getSize = websqlUtils.getSize;
	var openDB = websqlUtils.openDB;

	function fetchAttachmentsIfNecessary(doc, opts, api, txn, cb) {
	  var attachments = Object.keys(doc._attachments || {});
	  if (!attachments.length) {
	    return cb && cb();
	  }
	  var numDone = 0;

	  function checkDone() {
	    if (++numDone === attachments.length && cb) {
	      cb();
	    }
	  }

	  function fetchAttachment(doc, att) {
	    var attObj = doc._attachments[att];
	    var attOpts = {encode: true, ctx: txn};
	    api._getAttachment(attObj, attOpts, function (_, base64) {
	      doc._attachments[att] = utils.extend(
	        utils.pick(attObj, ['digest', 'content_type']),
	        { data: base64 }
	      );
	      checkDone();
	    });
	  }

	  attachments.forEach(function (att) {
	    if (opts.attachments && opts.include_docs) {
	      fetchAttachment(doc, att);
	    } else {
	      doc._attachments[att].stub = true;
	      checkDone();
	    }
	  });
	}

	var POUCH_VERSION = 1;

	// these indexes cover the ground for most allDocs queries
	var BY_SEQ_STORE_DELETED_INDEX_SQL =
	  'CREATE INDEX IF NOT EXISTS \'by-seq-deleted-idx\' ON ' +
	  BY_SEQ_STORE + ' (seq, deleted)';
	var BY_SEQ_STORE_DOC_ID_REV_INDEX_SQL =
	  'CREATE UNIQUE INDEX IF NOT EXISTS \'by-seq-doc-id-rev\' ON ' +
	    BY_SEQ_STORE + ' (doc_id, rev)';
	var DOC_STORE_WINNINGSEQ_INDEX_SQL =
	  'CREATE INDEX IF NOT EXISTS \'doc-winningseq-idx\' ON ' +
	  DOC_STORE + ' (winningseq)';
	var ATTACH_AND_SEQ_STORE_SEQ_INDEX_SQL =
	  'CREATE INDEX IF NOT EXISTS \'attach-seq-seq-idx\' ON ' +
	    ATTACH_AND_SEQ_STORE + ' (seq)';
	var ATTACH_AND_SEQ_STORE_ATTACH_INDEX_SQL =
	  'CREATE UNIQUE INDEX IF NOT EXISTS \'attach-seq-digest-idx\' ON ' +
	    ATTACH_AND_SEQ_STORE + ' (digest, seq)';

	var DOC_STORE_AND_BY_SEQ_JOINER = BY_SEQ_STORE +
	  '.seq = ' + DOC_STORE + '.winningseq';

	var SELECT_DOCS = BY_SEQ_STORE + '.seq AS seq, ' +
	  BY_SEQ_STORE + '.deleted AS deleted, ' +
	  BY_SEQ_STORE + '.json AS data, ' +
	  BY_SEQ_STORE + '.rev AS rev, ' +
	  DOC_STORE + '.json AS metadata';

	function WebSqlPouch(opts, callback) {
	  var api = this;
	  var instanceId = null;
	  var size = getSize(opts);
	  var idRequests = [];
	  var encoding;

	  api._docCount = -1; // cache sqlite count(*) for performance
	  api._name = opts.name;

	  var db = openDB(api._name, POUCH_VERSION, api._name, size);
	  if (!db) {
	    return callback(errors.error(errors.UNKNOWN_ERROR));
	  } else if (typeof db.readTransaction !== 'function') {
	    // doesn't exist in sqlite plugin
	    db.readTransaction = db.transaction;
	  }

	  function dbCreated() {
	    // note the db name in case the browser upgrades to idb
	    if (utils.hasLocalStorage()) {
	      window.localStorage['_pouch__websqldb_' + api._name] = true;
	    }
	    callback(null, api);
	  }

	  // In this migration, we added the 'deleted' and 'local' columns to the
	  // by-seq and doc store tables.
	  // To preserve existing user data, we re-process all the existing JSON
	  // and add these values.
	  // Called migration2 because it corresponds to adapter version (db_version) #2
	  function runMigration2(tx, callback) {
	    // index used for the join in the allDocs query
	    tx.executeSql(DOC_STORE_WINNINGSEQ_INDEX_SQL);

	    tx.executeSql('ALTER TABLE ' + BY_SEQ_STORE +
	      ' ADD COLUMN deleted TINYINT(1) DEFAULT 0', [], function () {
	      tx.executeSql(BY_SEQ_STORE_DELETED_INDEX_SQL);
	      tx.executeSql('ALTER TABLE ' + DOC_STORE +
	        ' ADD COLUMN local TINYINT(1) DEFAULT 0', [], function () {
	        tx.executeSql('CREATE INDEX IF NOT EXISTS \'doc-store-local-idx\' ON ' +
	          DOC_STORE + ' (local, id)');

	        var sql = 'SELECT ' + DOC_STORE + '.winningseq AS seq, ' + DOC_STORE +
	          '.json AS metadata FROM ' + BY_SEQ_STORE + ' JOIN ' + DOC_STORE +
	          ' ON ' + BY_SEQ_STORE + '.seq = ' + DOC_STORE + '.winningseq';

	        tx.executeSql(sql, [], function (tx, result) {

	          var deleted = [];
	          var local = [];

	          for (var i = 0; i < result.rows.length; i++) {
	            var item = result.rows.item(i);
	            var seq = item.seq;
	            var metadata = JSON.parse(item.metadata);
	            if (utils.isDeleted(metadata)) {
	              deleted.push(seq);
	            }
	            if (utils.isLocalId(metadata.id)) {
	              local.push(metadata.id);
	            }
	          }
	          tx.executeSql('UPDATE ' + DOC_STORE + 'SET local = 1 WHERE id IN ' +
	            qMarks(local.length), local, function () {
	            tx.executeSql('UPDATE ' + BY_SEQ_STORE +
	              ' SET deleted = 1 WHERE seq IN ' +
	              qMarks(deleted.length), deleted, callback);
	          });
	        });
	      });
	    });
	  }

	  // in this migration, we make all the local docs unversioned
	  function runMigration3(tx, callback) {
	    var local = 'CREATE TABLE IF NOT EXISTS ' + LOCAL_STORE +
	      ' (id UNIQUE, rev, json)';
	    tx.executeSql(local, [], function () {
	      var sql = 'SELECT ' + DOC_STORE + '.id AS id, ' +
	        BY_SEQ_STORE + '.json AS data ' +
	        'FROM ' + BY_SEQ_STORE + ' JOIN ' +
	        DOC_STORE + ' ON ' + BY_SEQ_STORE + '.seq = ' +
	        DOC_STORE + '.winningseq WHERE local = 1';
	      tx.executeSql(sql, [], function (tx, res) {
	        var rows = [];
	        for (var i = 0; i < res.rows.length; i++) {
	          rows.push(res.rows.item(i));
	        }
	        function doNext() {
	          if (!rows.length) {
	            return callback(tx);
	          }
	          var row = rows.shift();
	          var rev = JSON.parse(row.data)._rev;
	          tx.executeSql('INSERT INTO ' + LOCAL_STORE +
	              ' (id, rev, json) VALUES (?,?,?)',
	              [row.id, rev, row.data], function (tx) {
	            tx.executeSql('DELETE FROM ' + DOC_STORE + ' WHERE id=?',
	                [row.id], function (tx) {
	              tx.executeSql('DELETE FROM ' + BY_SEQ_STORE + ' WHERE seq=?',
	                  [row.seq], function () {
	                doNext();
	              });
	            });
	          });
	        }
	        doNext();
	      });
	    });
	  }

	  // in this migration, we remove doc_id_rev and just use rev
	  function runMigration4(tx, callback) {

	    function updateRows(rows) {
	      function doNext() {
	        if (!rows.length) {
	          return callback(tx);
	        }
	        var row = rows.shift();
	        var doc_id_rev = parseHexString(row.hex, encoding);
	        var idx = doc_id_rev.lastIndexOf('::');
	        var doc_id = doc_id_rev.substring(0, idx);
	        var rev = doc_id_rev.substring(idx + 2);
	        var sql = 'UPDATE ' + BY_SEQ_STORE +
	          ' SET doc_id=?, rev=? WHERE doc_id_rev=?';
	        tx.executeSql(sql, [doc_id, rev, doc_id_rev], function () {
	          doNext();
	        });
	      }
	      doNext();
	    }

	    var sql = 'ALTER TABLE ' + BY_SEQ_STORE + ' ADD COLUMN doc_id';
	    tx.executeSql(sql, [], function (tx) {
	      var sql = 'ALTER TABLE ' + BY_SEQ_STORE + ' ADD COLUMN rev';
	      tx.executeSql(sql, [], function (tx) {
	        tx.executeSql(BY_SEQ_STORE_DOC_ID_REV_INDEX_SQL, [], function (tx) {
	          var sql = 'SELECT hex(doc_id_rev) as hex FROM ' + BY_SEQ_STORE;
	          tx.executeSql(sql, [], function (tx, res) {
	            var rows = [];
	            for (var i = 0; i < res.rows.length; i++) {
	              rows.push(res.rows.item(i));
	            }
	            updateRows(rows);
	          });
	        });
	      });
	    });
	  }

	  // in this migration, we add the attach_and_seq table
	  // for issue #2818
	  function runMigration5(tx, callback) {

	    function migrateAttsAndSeqs(tx) {
	      // need to actually populate the table. this is the expensive part,
	      // so as an optimization, check first that this database even
	      // contains attachments
	      var sql = 'SELECT COUNT(*) AS cnt FROM ' + ATTACH_STORE;
	      tx.executeSql(sql, [], function (tx, res) {
	        var count = res.rows.item(0).cnt;
	        if (!count) {
	          return callback(tx);
	        }

	        var offset = 0;
	        var pageSize = 10;
	        function nextPage() {
	          var sql = select(
	            SELECT_DOCS + ', ' + DOC_STORE + '.id AS id',
	            [DOC_STORE, BY_SEQ_STORE],
	            DOC_STORE_AND_BY_SEQ_JOINER,
	            null,
	            DOC_STORE + '.id '
	          );
	          sql += ' LIMIT ' + pageSize + ' OFFSET ' + offset;
	          offset += pageSize;
	          tx.executeSql(sql, [], function (tx, res) {
	            if (!res.rows.length) {
	              return callback(tx);
	            }
	            var digestSeqs = {};
	            function addDigestSeq(digest, seq) {
	              // uniq digest/seq pairs, just in case there are dups
	              var seqs = digestSeqs[digest] = (digestSeqs[digest] || []);
	              if (seqs.indexOf(seq) === -1) {
	                seqs.push(seq);
	              }
	            }
	            for (var i = 0; i < res.rows.length; i++) {
	              var row = res.rows.item(i);
	              var doc = unstringifyDoc(row.data, row.id, row.rev);
	              var atts = Object.keys(doc._attachments || {});
	              for (var j = 0; j < atts.length; j++) {
	                var att = doc._attachments[atts[j]];
	                addDigestSeq(att.digest, row.seq);
	              }
	            }
	            var digestSeqPairs = [];
	            Object.keys(digestSeqs).forEach(function (digest) {
	              var seqs = digestSeqs[digest];
	              seqs.forEach(function (seq) {
	                digestSeqPairs.push([digest, seq]);
	              });
	            });
	            if (!digestSeqPairs.length) {
	              return nextPage();
	            }
	            var numDone = 0;
	            digestSeqPairs.forEach(function (pair) {
	              var sql = 'INSERT INTO ' + ATTACH_AND_SEQ_STORE +
	                ' (digest, seq) VALUES (?,?)';
	              tx.executeSql(sql, pair, function () {
	                if (++numDone === digestSeqPairs.length) {
	                  nextPage();
	                }
	              });
	            });
	          });
	        }
	        nextPage();
	      });
	    }

	    var attachAndRev = 'CREATE TABLE IF NOT EXISTS ' +
	      ATTACH_AND_SEQ_STORE + ' (digest, seq INTEGER)';
	    tx.executeSql(attachAndRev, [], function (tx) {
	      tx.executeSql(
	        ATTACH_AND_SEQ_STORE_ATTACH_INDEX_SQL, [], function (tx) {
	          tx.executeSql(
	            ATTACH_AND_SEQ_STORE_SEQ_INDEX_SQL, [],
	            migrateAttsAndSeqs);
	        });
	    });
	  }

	  // in this migration, we use escapeBlob() and unescapeBlob()
	  // instead of reading out the binary as HEX, which is slow
	  function runMigration6(tx, callback) {
	    var sql = 'ALTER TABLE ' + ATTACH_STORE +
	      ' ADD COLUMN escaped TINYINT(1) DEFAULT 0';
	    tx.executeSql(sql, [], callback);
	  }

	  // issue #3136, in this migration we need a "latest seq" as well
	  // as the "winning seq" in the doc store
	  function runMigration7(tx, callback) {
	    var sql = 'ALTER TABLE ' + DOC_STORE +
	      ' ADD COLUMN max_seq INTEGER';
	    tx.executeSql(sql, [], function (tx) {
	      var sql = 'UPDATE ' + DOC_STORE + ' SET max_seq=(SELECT MAX(seq) FROM ' +
	        BY_SEQ_STORE + ' WHERE doc_id=id)';
	      tx.executeSql(sql, [], function (tx) {
	        // add unique index after filling, else we'll get a constraint
	        // error when we do the ALTER TABLE
	        var sql =
	          'CREATE UNIQUE INDEX IF NOT EXISTS \'doc-max-seq-idx\' ON ' +
	          DOC_STORE + ' (max_seq)';
	        tx.executeSql(sql, [], callback);
	      });
	    });
	  }

	  function checkEncoding(tx, cb) {
	    // UTF-8 on chrome/android, UTF-16 on safari < 7.1
	    tx.executeSql('SELECT HEX("a") AS hex', [], function (tx, res) {
	        var hex = res.rows.item(0).hex;
	        encoding = hex.length === 2 ? 'UTF-8' : 'UTF-16';
	        cb();
	      }
	    );
	  }

	  function onGetInstanceId() {
	    while (idRequests.length > 0) {
	      var idCallback = idRequests.pop();
	      idCallback(null, instanceId);
	    }
	  }

	  function onGetVersion(tx, dbVersion) {
	    if (dbVersion === 0) {
	      // initial schema

	      var meta = 'CREATE TABLE IF NOT EXISTS ' + META_STORE +
	        ' (dbid, db_version INTEGER)';
	      var attach = 'CREATE TABLE IF NOT EXISTS ' + ATTACH_STORE +
	        ' (digest UNIQUE, escaped TINYINT(1), body BLOB)';
	      var attachAndRev = 'CREATE TABLE IF NOT EXISTS ' +
	        ATTACH_AND_SEQ_STORE + ' (digest, seq INTEGER)';
	      // TODO: migrate winningseq to INTEGER
	      var doc = 'CREATE TABLE IF NOT EXISTS ' + DOC_STORE +
	        ' (id unique, json, winningseq, max_seq INTEGER UNIQUE)';
	      var seq = 'CREATE TABLE IF NOT EXISTS ' + BY_SEQ_STORE +
	        ' (seq INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
	        'json, deleted TINYINT(1), doc_id, rev)';
	      var local = 'CREATE TABLE IF NOT EXISTS ' + LOCAL_STORE +
	        ' (id UNIQUE, rev, json)';

	      // creates
	      tx.executeSql(attach);
	      tx.executeSql(local);
	      tx.executeSql(attachAndRev, [], function () {
	        tx.executeSql(ATTACH_AND_SEQ_STORE_SEQ_INDEX_SQL);
	        tx.executeSql(ATTACH_AND_SEQ_STORE_ATTACH_INDEX_SQL);
	      });
	      tx.executeSql(doc, [], function () {
	        tx.executeSql(DOC_STORE_WINNINGSEQ_INDEX_SQL);
	        tx.executeSql(seq, [], function () {
	          tx.executeSql(BY_SEQ_STORE_DELETED_INDEX_SQL);
	          tx.executeSql(BY_SEQ_STORE_DOC_ID_REV_INDEX_SQL);
	          tx.executeSql(meta, [], function () {
	            // mark the db version, and new dbid
	            var initSeq = 'INSERT INTO ' + META_STORE +
	              ' (db_version, dbid) VALUES (?,?)';
	            instanceId = utils.uuid();
	            var initSeqArgs = [ADAPTER_VERSION, instanceId];
	            tx.executeSql(initSeq, initSeqArgs, function () {
	              onGetInstanceId();
	            });
	          });
	        });
	      });
	    } else { // version > 0

	      var setupDone = function () {
	        var migrated = dbVersion < ADAPTER_VERSION;
	        if (migrated) {
	          // update the db version within this transaction
	          tx.executeSql('UPDATE ' + META_STORE + ' SET db_version = ' +
	            ADAPTER_VERSION);
	        }
	        // notify db.id() callers
	        var sql = 'SELECT dbid FROM ' + META_STORE;
	        tx.executeSql(sql, [], function (tx, result) {
	          instanceId = result.rows.item(0).dbid;
	          onGetInstanceId();
	        });
	      };

	      // would love to use promises here, but then websql
	      // ends the transaction early
	      var tasks = [
	        runMigration2,
	        runMigration3,
	        runMigration4,
	        runMigration5,
	        runMigration6,
	        runMigration7,
	        setupDone
	      ];

	      // run each migration sequentially
	      var i = dbVersion;
	      var nextMigration = function (tx) {
	        tasks[i - 1](tx, nextMigration);
	        i++;
	      };
	      nextMigration(tx);
	    }
	  }

	  function setup() {
	    db.transaction(function (tx) {
	      // first check the encoding
	      checkEncoding(tx, function () {
	        // then get the version
	        fetchVersion(tx);
	      });
	    }, unknownError(callback), dbCreated);
	  }

	  function fetchVersion(tx) {
	    var sql = 'SELECT sql FROM sqlite_master WHERE tbl_name = ' + META_STORE;
	    tx.executeSql(sql, [], function (tx, result) {
	      if (!result.rows.length) {
	        // database hasn't even been created yet (version 0)
	        onGetVersion(tx, 0);
	      } else if (!/db_version/.test(result.rows.item(0).sql)) {
	        // table was created, but without the new db_version column,
	        // so add it.
	        tx.executeSql('ALTER TABLE ' + META_STORE +
	          ' ADD COLUMN db_version INTEGER', [], function () {
	          // before version 2, this column didn't even exist
	          onGetVersion(tx, 1);
	        });
	      } else { // column exists, we can safely get it
	        tx.executeSql('SELECT db_version FROM ' + META_STORE,
	          [], function (tx, result) {
	          var dbVersion = result.rows.item(0).db_version;
	          onGetVersion(tx, dbVersion);
	        });
	      }
	    });
	  }

	  if (utils.isCordova()) {
	    //to wait until custom api is made in pouch.adapters before doing setup
	    window.addEventListener(api._name + '_pouch', function cordova_init() {
	      window.removeEventListener(api._name + '_pouch', cordova_init, false);
	      setup();
	    }, false);
	  } else {
	    setup();
	  }

	  api.type = function () {
	    return 'websql';
	  };

	  api._id = utils.toPromise(function (callback) {
	    callback(null, instanceId);
	  });

	  api._info = function (callback) {
	    db.readTransaction(function (tx) {
	      countDocs(tx, function (docCount) {
	        var sql = 'SELECT MAX(seq) AS seq FROM ' + BY_SEQ_STORE;
	        tx.executeSql(sql, [], function (tx, res) {
	          var updateSeq = res.rows.item(0).seq || 0;
	          callback(null, {
	            doc_count: docCount,
	            update_seq: updateSeq,
	            // for debugging
	            sqlite_plugin: db._sqlitePlugin,
	            websql_encoding: encoding
	          });
	        });
	      });
	    }, unknownError(callback));
	  };

	  api._bulkDocs = function (req, opts, callback) {
	    websqlBulkDocs(req, opts, api, db, WebSqlPouch.Changes, callback);
	  };

	  api._get = function (id, opts, callback) {
	    opts = utils.clone(opts);
	    var doc;
	    var metadata;
	    var err;
	    if (!opts.ctx) {
	      db.readTransaction(function (txn) {
	        opts.ctx = txn;
	        api._get(id, opts, callback);
	      });
	      return;
	    }
	    var tx = opts.ctx;

	    function finish() {
	      callback(err, {doc: doc, metadata: metadata, ctx: tx});
	    }

	    var sql;
	    var sqlArgs;
	    if (opts.rev) {
	      sql = select(
	        SELECT_DOCS,
	        [DOC_STORE, BY_SEQ_STORE],
	        DOC_STORE + '.id=' + BY_SEQ_STORE + '.doc_id',
	        [BY_SEQ_STORE + '.doc_id=?', BY_SEQ_STORE + '.rev=?']);
	      sqlArgs = [id, opts.rev];
	    } else {
	      sql = select(
	        SELECT_DOCS,
	        [DOC_STORE, BY_SEQ_STORE],
	        DOC_STORE_AND_BY_SEQ_JOINER,
	        DOC_STORE + '.id=?');
	      sqlArgs = [id];
	    }
	    tx.executeSql(sql, sqlArgs, function (a, results) {
	      if (!results.rows.length) {
	        err = errors.error(errors.MISSING_DOC, 'missing');
	        return finish();
	      }
	      var item = results.rows.item(0);
	      metadata = utils.safeJsonParse(item.metadata);
	      if (item.deleted && !opts.rev) {
	        err = errors.error(errors.MISSING_DOC, 'deleted');
	        return finish();
	      }
	      doc = unstringifyDoc(item.data, metadata.id, item.rev);
	      finish();
	    });
	  };

	  function countDocs(tx, callback) {

	    if (api._docCount !== -1) {
	      return callback(api._docCount);
	    }

	    // count the total rows
	    var sql = select(
	      'COUNT(' + DOC_STORE + '.id) AS \'num\'',
	      [DOC_STORE, BY_SEQ_STORE],
	      DOC_STORE_AND_BY_SEQ_JOINER,
	      BY_SEQ_STORE + '.deleted=0');

	    tx.executeSql(sql, [], function (tx, result) {
	      api._docCount = result.rows.item(0).num;
	      callback(api._docCount);
	    });
	  }

	  api._allDocs = function (opts, callback) {
	    var results = [];
	    var totalRows;

	    var start = 'startkey' in opts ? opts.startkey : false;
	    var end = 'endkey' in opts ? opts.endkey : false;
	    var key = 'key' in opts ? opts.key : false;
	    var descending = 'descending' in opts ? opts.descending : false;
	    var limit = 'limit' in opts ? opts.limit : -1;
	    var offset = 'skip' in opts ? opts.skip : 0;
	    var inclusiveEnd = opts.inclusive_end !== false;

	    var sqlArgs = [];
	    var criteria = [];

	    if (key !== false) {
	      criteria.push(DOC_STORE + '.id = ?');
	      sqlArgs.push(key);
	    } else if (start !== false || end !== false) {
	      if (start !== false) {
	        criteria.push(DOC_STORE + '.id ' + (descending ? '<=' : '>=') + ' ?');
	        sqlArgs.push(start);
	      }
	      if (end !== false) {
	        var comparator = descending ? '>' : '<';
	        if (inclusiveEnd) {
	          comparator += '=';
	        }
	        criteria.push(DOC_STORE + '.id ' + comparator + ' ?');
	        sqlArgs.push(end);
	      }
	      if (key !== false) {
	        criteria.push(DOC_STORE + '.id = ?');
	        sqlArgs.push(key);
	      }
	    }

	    if (opts.deleted !== 'ok') {
	      // report deleted if keys are specified
	      criteria.push(BY_SEQ_STORE + '.deleted = 0');
	    }

	    db.readTransaction(function (tx) {

	      // first count up the total rows
	      countDocs(tx, function (count) {
	        totalRows = count;

	        if (limit === 0) {
	          return;
	        }

	        // then actually fetch the documents
	        var sql = select(
	          SELECT_DOCS,
	          [DOC_STORE, BY_SEQ_STORE],
	          DOC_STORE_AND_BY_SEQ_JOINER,
	          criteria,
	          DOC_STORE + '.id ' + (descending ? 'DESC' : 'ASC')
	          );
	        sql += ' LIMIT ' + limit + ' OFFSET ' + offset;

	        tx.executeSql(sql, sqlArgs, function (tx, result) {
	          for (var i = 0, l = result.rows.length; i < l; i++) {
	            var item = result.rows.item(i);
	            var metadata = utils.safeJsonParse(item.metadata);
	            var id = metadata.id;
	            var data = unstringifyDoc(item.data, id, item.rev);
	            var winningRev = data._rev;
	            var doc = {
	              id: id,
	              key: id,
	              value: {rev: winningRev}
	            };
	            if (opts.include_docs) {
	              doc.doc = data;
	              doc.doc._rev = winningRev;
	              if (opts.conflicts) {
	                doc.doc._conflicts = merge.collectConflicts(metadata);
	              }
	              fetchAttachmentsIfNecessary(doc.doc, opts, api, tx);
	            }
	            if (item.deleted) {
	              if (opts.deleted === 'ok') {
	                doc.value.deleted = true;
	                doc.doc = null;
	              } else {
	                continue;
	              }
	            }
	            results.push(doc);
	          }
	        });
	      });
	    }, unknownError(callback), function () {
	      callback(null, {
	        total_rows: totalRows,
	        offset: opts.skip,
	        rows: results
	      });
	    });
	  };

	  api._changes = function (opts) {
	    opts = utils.clone(opts);

	    if (opts.continuous) {
	      var id = api._name + ':' + utils.uuid();
	      WebSqlPouch.Changes.addListener(api._name, id, api, opts);
	      WebSqlPouch.Changes.notify(api._name);
	      return {
	        cancel: function () {
	          WebSqlPouch.Changes.removeListener(api._name, id);
	        }
	      };
	    }

	    var descending = opts.descending;

	    // Ignore the `since` parameter when `descending` is true
	    opts.since = opts.since && !descending ? opts.since : 0;

	    var limit = 'limit' in opts ? opts.limit : -1;
	    if (limit === 0) {
	      limit = 1; // per CouchDB _changes spec
	    }

	    var returnDocs;
	    if ('returnDocs' in opts) {
	      returnDocs = opts.returnDocs;
	    } else {
	      returnDocs = true;
	    }
	    var results = [];
	    var numResults = 0;

	    function fetchChanges() {

	      var selectStmt =
	        DOC_STORE + '.json AS metadata, ' +
	        DOC_STORE + '.max_seq AS maxSeq, ' +
	        BY_SEQ_STORE + '.json AS winningDoc, ' +
	        BY_SEQ_STORE + '.rev AS winningRev ';

	      var from = DOC_STORE + ' JOIN ' + BY_SEQ_STORE;

	      var joiner = DOC_STORE + '.id=' + BY_SEQ_STORE + '.doc_id' +
	        ' AND ' + DOC_STORE + '.winningseq=' + BY_SEQ_STORE + '.seq';

	      var criteria = ['maxSeq > ?'];
	      var sqlArgs = [opts.since];

	      if (opts.doc_ids) {
	        criteria.push(DOC_STORE + '.id IN ' + qMarks(opts.doc_ids.length));
	        sqlArgs = sqlArgs.concat(opts.doc_ids);
	      }

	      var orderBy = 'maxSeq ' + (descending ? 'DESC' : 'ASC');

	      var sql = select(selectStmt, from, joiner, criteria, orderBy);

	      var filter = utils.filterChange(opts);
	      if (!opts.view && !opts.filter) {
	        // we can just limit in the query
	        sql += ' LIMIT ' + limit;
	      }

	      var lastSeq = opts.since || 0;
	      db.readTransaction(function (tx) {
	        tx.executeSql(sql, sqlArgs, function (tx, result) {
	          function reportChange(change) {
	            return function () {
	              opts.onChange(change);
	            };
	          }
	          for (var i = 0, l = result.rows.length; i < l; i++) {
	            var item = result.rows.item(i);
	            var metadata = utils.safeJsonParse(item.metadata);
	            lastSeq = item.maxSeq;

	            var doc = unstringifyDoc(item.winningDoc, metadata.id,
	              item.winningRev);
	            var change = opts.processChange(doc, metadata, opts);
	            change.seq = item.maxSeq;
	            if (filter(change)) {
	              numResults++;
	              if (returnDocs) {
	                results.push(change);
	              }
	              // process the attachment immediately
	              // for the benefit of live listeners
	              if (opts.attachments && opts.include_docs) {
	                fetchAttachmentsIfNecessary(doc, opts, api, tx,
	                  reportChange(change));
	              } else {
	                reportChange(change)();
	              }
	            }
	            if (numResults === limit) {
	              break;
	            }
	          }
	        });
	      }, unknownError(opts.complete), function () {
	        if (!opts.continuous) {
	          opts.complete(null, {
	            results: results,
	            last_seq: lastSeq
	          });
	        }
	      });
	    }

	    fetchChanges();
	  };

	  api._close = function (callback) {
	    //WebSQL databases do not need to be closed
	    callback();
	  };

	  api._getAttachment = function (attachment, opts, callback) {
	    var res;
	    var tx = opts.ctx;
	    var digest = attachment.digest;
	    var type = attachment.content_type;
	    var sql = 'SELECT escaped, ' +
	      'CASE WHEN escaped = 1 THEN body ELSE HEX(body) END AS body FROM ' +
	      ATTACH_STORE + ' WHERE digest=?';
	    tx.executeSql(sql, [digest], function (tx, result) {
	      // websql has a bug where \u0000 causes early truncation in strings
	      // and blobs. to work around this, we used to use the hex() function,
	      // but that's not performant. after migration 6, we remove \u0000
	      // and add it back in afterwards
	      var item = result.rows.item(0);
	      var data = item.escaped ? websqlUtils.unescapeBlob(item.body) :
	        parseHexString(item.body, encoding);
	      if (opts.encode) {
	        res = btoa(data);
	      } else {
	        data = utils.fixBinary(data);
	        res = utils.createBlob([data], {type: type});
	      }
	      callback(null, res);
	    });
	  };

	  api._getRevisionTree = function (docId, callback) {
	    db.readTransaction(function (tx) {
	      var sql = 'SELECT json AS metadata FROM ' + DOC_STORE + ' WHERE id = ?';
	      tx.executeSql(sql, [docId], function (tx, result) {
	        if (!result.rows.length) {
	          callback(errors.error(errors.MISSING_DOC));
	        } else {
	          var data = utils.safeJsonParse(result.rows.item(0).metadata);
	          callback(null, data.rev_tree);
	        }
	      });
	    });
	  };

	  api._doCompaction = function (docId, revs, callback) {
	    if (!revs.length) {
	      return callback();
	    }
	    db.transaction(function (tx) {

	      // update doc store
	      var sql = 'SELECT json AS metadata FROM ' + DOC_STORE + ' WHERE id = ?';
	      tx.executeSql(sql, [docId], function (tx, result) {
	        var metadata = utils.safeJsonParse(result.rows.item(0).metadata);
	        merge.traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
	                                                           revHash, ctx, opts) {
	          var rev = pos + '-' + revHash;
	          if (revs.indexOf(rev) !== -1) {
	            opts.status = 'missing';
	          }
	        });

	        var sql = 'UPDATE ' + DOC_STORE + ' SET json = ? WHERE id = ?';
	        tx.executeSql(sql, [utils.safeJsonStringify(metadata), docId]);
	      });

	      compactRevs(revs, docId, tx);
	    }, unknownError(callback), function () {
	      callback();
	    });
	  };

	  api._getLocal = function (id, callback) {
	    db.readTransaction(function (tx) {
	      var sql = 'SELECT json, rev FROM ' + LOCAL_STORE + ' WHERE id=?';
	      tx.executeSql(sql, [id], function (tx, res) {
	        if (res.rows.length) {
	          var item = res.rows.item(0);
	          var doc = unstringifyDoc(item.json, id, item.rev);
	          callback(null, doc);
	        } else {
	          callback(errors.error(errors.MISSING_DOC));
	        }
	      });
	    });
	  };

	  api._putLocal = function (doc, opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    delete doc._revisions; // ignore this, trust the rev
	    var oldRev = doc._rev;
	    var id = doc._id;
	    var newRev;
	    if (!oldRev) {
	      newRev = doc._rev = '0-1';
	    } else {
	      newRev = doc._rev = '0-' + (parseInt(oldRev.split('-')[1], 10) + 1);
	    }
	    var json = stringifyDoc(doc);

	    var ret;
	    function putLocal(tx) {
	      var sql;
	      var values;
	      if (oldRev) {
	        sql = 'UPDATE ' + LOCAL_STORE + ' SET rev=?, json=? ' +
	          'WHERE id=? AND rev=?';
	        values = [newRev, json, id, oldRev];
	      } else {
	        sql = 'INSERT INTO ' + LOCAL_STORE + ' (id, rev, json) VALUES (?,?,?)';
	        values = [id, newRev, json];
	      }
	      tx.executeSql(sql, values, function (tx, res) {
	        if (res.rowsAffected) {
	          ret = {ok: true, id: id, rev: newRev};
	          if (opts.ctx) { // return immediately
	            callback(null, ret);
	          }
	        } else {
	          callback(errors.error(errors.REV_CONFLICT));
	        }
	      }, function () {
	        callback(errors.error(errors.REV_CONFLICT));
	        return false; // ack that we handled the error
	      });
	    }

	    if (opts.ctx) {
	      putLocal(opts.ctx);
	    } else {
	      db.transaction(function (tx) {
	        putLocal(tx);
	      }, unknownError(callback), function () {
	        if (ret) {
	          callback(null, ret);
	        }
	      });
	    }
	  };

	  api._removeLocal = function (doc, callback) {
	    var ret;
	    db.transaction(function (tx) {
	      var sql = 'DELETE FROM ' + LOCAL_STORE + ' WHERE id=? AND rev=?';
	      var params = [doc._id, doc._rev];
	      tx.executeSql(sql, params, function (tx, res) {
	        if (!res.rowsAffected) {
	          return callback(errors.error(errors.MISSING_DOC));
	        }
	        ret = {ok: true, id: doc._id, rev: '0-0'};
	      });
	    }, unknownError(callback), function () {
	      if (ret) {
	        callback(null, ret);
	      }
	    });
	  };
	}

	WebSqlPouch.valid = websqlUtils.valid;

	WebSqlPouch.destroy = utils.toPromise(function (name, opts, callback) {
	  WebSqlPouch.Changes.removeAllListeners(name);
	  var size = getSize(opts);
	  var db = openDB(name, POUCH_VERSION, name, size);
	  db.transaction(function (tx) {
	    var stores = [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE, META_STORE,
	      LOCAL_STORE, ATTACH_AND_SEQ_STORE];
	    stores.forEach(function (store) {
	      tx.executeSql('DROP TABLE IF EXISTS ' + store, []);
	    });
	  }, unknownError(callback), function () {
	    if (utils.hasLocalStorage()) {
	      delete window.localStorage['_pouch__websqldb_' + name];
	      delete window.localStorage[name];
	    }
	    callback(null, {'ok': true});
	  });
	});

	WebSqlPouch.Changes = new utils.Changes();

	module.exports = WebSqlPouch;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process, Buffer) {'use strict';

	var levelup = __webpack_require__(15);
	var sublevel = __webpack_require__(44);
	var through = __webpack_require__(58).obj;

	var originalLeveldown;
	function requireLeveldown() {
	  // wrapped try/catch inside a function to confine code
	  // de-optimalization
	  try {
	    originalLeveldown = __webpack_require__(16);
	  } catch (e) {}
	}
	requireLeveldown();

	var errors = __webpack_require__(5);
	var merge = __webpack_require__(19);
	var utils = __webpack_require__(4);
	var migrate = __webpack_require__(36);
	var Deque = __webpack_require__(59);

	var LevelTransaction = __webpack_require__(37);

	var DOC_STORE = 'document-store';
	var BY_SEQ_STORE = 'by-sequence';
	var ATTACHMENT_STORE = 'attach-store';
	var BINARY_STORE = 'attach-binary-store';
	var LOCAL_STORE = 'local-store';
	var META_STORE = 'meta-store';

	// leveldb barks if we try to open a db multiple times
	// so we cache opened connections here for initstore()
	var dbStores = new utils.Map();

	// store the value of update_seq in the by-sequence store the key name will
	// never conflict, since the keys in the by-sequence store are integers
	var UPDATE_SEQ_KEY = '_local_last_update_seq';
	var DOC_COUNT_KEY = '_local_doc_count';
	var UUID_KEY = '_local_uuid';

	var MD5_PREFIX = 'md5-';

	var safeJsonEncoding = {
	  encode: utils.safeJsonStringify,
	  decode: utils.safeJsonParse,
	  buffer: false,
	  type: 'cheap-json'
	};

	function fetchAttachments(results, stores) {
	  return utils.Promise.all(results.map(function (row) {
	    if (row.doc && row.doc._attachments) {
	      var attNames = Object.keys(row.doc._attachments);
	      return utils.Promise.all(attNames.map(function (att) {
	        var attObj = row.doc._attachments[att];
	        if ('data' in attObj) { // already fetched
	          return;
	        }
	        return new utils.Promise(function (resolve, reject) {
	          stores.binaryStore.get(attObj.digest, function (err, buffer) {
	            var base64 = '';
	            if (err && err.name !== 'NotFoundError') {
	              return reject(err);
	            } else if (!err) {
	              base64 = utils.btoa(buffer);
	            }
	            row.doc._attachments[att] = utils.extend(
	              utils.pick(attObj, ['digest', 'content_type']),
	              {data: base64}
	            );
	            resolve();
	          });
	        });
	      }));
	    }
	  }));
	}

	function LevelPouch(opts, callback) {
	  opts = utils.clone(opts);
	  var api = this;
	  var instanceId;
	  var stores = {};
	  var db;
	  var name = opts.name;
	  if (typeof opts.createIfMissing === 'undefined') {
	    opts.createIfMissing = true;
	  }

	  var leveldown = opts.db || originalLeveldown;
	  if (!leveldown) {
	    return callback(new Error(
	      "leveldown not available " +
	      "(specify another backend using the 'db' option)"
	    ));
	  }

	  if (typeof leveldown.destroy !== 'function') {
	    leveldown.destroy = function (name, cb) { cb(); };
	  }
	  var dbStore;
	  if (dbStores.has(leveldown.name)) {
	    dbStore = dbStores.get(leveldown.name);
	  } else {
	    dbStore = new utils.Map();
	    dbStores.set(leveldown.name, dbStore);
	  }
	  if (dbStore.has(name)) {
	    db = dbStore.get(name);
	    afterDBCreated();
	  } else {
	    dbStore.set(name, sublevel(levelup(name, opts, function (err) {
	      if (err) {
	        dbStore.delete(name);
	        return callback(err);
	      }
	      db = dbStore.get(name);
	      db._docCount  = -1;
	      db._queue = new Deque();
	      if (opts.db || opts.noMigrate) {
	        afterDBCreated();
	      } else {
	        migrate.toSublevel(name, db, afterDBCreated);
	      }
	    })));
	  }

	  function afterDBCreated() {
	    stores.docStore = db.sublevel(DOC_STORE, {valueEncoding: safeJsonEncoding});
	    stores.bySeqStore = db.sublevel(BY_SEQ_STORE, {valueEncoding: 'json'});
	    stores.attachmentStore =
	      db.sublevel(ATTACHMENT_STORE, {valueEncoding: 'json'});
	    stores.binaryStore = db.sublevel(BINARY_STORE, {valueEncoding: 'binary'});
	    stores.localStore = db.sublevel(LOCAL_STORE, {valueEncoding: 'json'});
	    stores.metaStore = db.sublevel(META_STORE, {valueEncoding: 'json'});
	    migrate.localAndMetaStores(db, stores, function () {
	      stores.metaStore.get(UPDATE_SEQ_KEY, function (err, value) {
	        if (typeof db._updateSeq === 'undefined') {
	          db._updateSeq = value || 0;
	        }
	        stores.metaStore.get(DOC_COUNT_KEY, function (err, value) {
	          db._docCount = !err ? value : 0;
	          stores.metaStore.get(UUID_KEY, function (err, value) {
	            instanceId = !err ? value : utils.uuid();
	            stores.metaStore.put(UUID_KEY, instanceId, function (err, value) {
	              process.nextTick(function () {
	                callback(null, api);
	              });
	            });
	          });
	        });
	      });
	    });
	  }

	  function countDocs(callback) {
	    if (db.isClosed()) {
	      return callback(new Error('database is closed'));
	    }
	    return callback(null, db._docCount); // use cached value
	  }

	  api.type = function () {
	    return 'leveldb';
	  };

	  api._id = function (callback) {
	    callback(null, instanceId);
	  };

	  api._info = function (callback) {
	    var res = {
	      doc_count: db._docCount,
	      update_seq: db._updateSeq
	    };
	    return process.nextTick(function () {
	      callback(null, res);
	    });
	  };

	  function tryCode(fun, args) {
	    try {
	      fun.apply(null, args);
	    } catch (err) {
	      args[args.length - 1](err);
	    }
	  }

	  function executeNext() {
	    var firstTask = db._queue.peekFront();

	    if (firstTask.type === 'read') {
	      runReadOperation(firstTask);
	    } else { // write, only do one at a time
	      runWriteOperation(firstTask);
	    }
	  }

	  function runReadOperation(firstTask) {
	    // do multiple reads at once simultaneously, because it's safe

	    var readTasks = [firstTask];
	    var i = 1;
	    var nextTask = db._queue.get(i);
	    while (typeof nextTask !== 'undefined' && nextTask.type === 'read') {
	      readTasks.push(nextTask);
	      i++;
	      nextTask = db._queue.get(i);
	    }

	    var numDone = 0;

	    readTasks.forEach(function (readTask) {
	      var args = readTask.args;
	      var callback = args[args.length - 1];
	      args[args.length - 1] = utils.getArguments(function (cbArgs) {
	        callback.apply(null, cbArgs);
	        if (++numDone === readTasks.length) {
	          process.nextTick(function () {
	            // all read tasks have finished
	            readTasks.forEach(function () {
	              db._queue.shift();
	            });
	            if (db._queue.length) {
	              executeNext();
	            }
	          });
	        }
	      });
	      tryCode(readTask.fun, args);
	    });
	  }

	  function runWriteOperation(firstTask) {
	    var args = firstTask.args;
	    var callback = args[args.length - 1];
	    args[args.length - 1] = utils.getArguments(function (cbArgs) {
	      callback.apply(null, cbArgs);
	      process.nextTick(function () {
	        db._queue.shift();
	        if (db._queue.length) {
	          executeNext();
	        }
	      });
	    });
	    tryCode(firstTask.fun, args);
	  }

	  // all read/write operations to the database are done in a queue,
	  // similar to how websql/idb works. this avoids problems such
	  // as e.g. compaction needing to have a lock on the database while
	  // it updates stuff. in the future we can revisit this.
	  function writeLock(fun) {
	    return utils.getArguments(function (args) {
	      db._queue.push({
	        fun: fun,
	        args: args,
	        type: 'write'
	      });

	      if (db._queue.length === 1) {
	        process.nextTick(executeNext);
	      }
	    });
	  }

	  // same as the writelock, but multiple can run at once
	  function readLock(fun) {
	    return utils.getArguments(function (args) {
	      db._queue.push({
	        fun: fun,
	        args: args,
	        type: 'read'
	      });

	      if (db._queue.length === 1) {
	        process.nextTick(executeNext);
	      }
	    });
	  }

	  function formatSeq(n) {
	    return ('0000000000000000' + n).slice(-16);
	  }

	  function parseSeq(s) {
	    return parseInt(s, 10);
	  }

	  api._get = readLock(function (id, opts, callback) {
	    opts = utils.clone(opts);

	    stores.docStore.get(id, function (err, metadata) {

	      if (err || !metadata) {
	        return callback(errors.error(errors.MISSING_DOC, 'missing'));
	      }

	      if (utils.isDeleted(metadata) && !opts.rev) {
	        return callback(errors.error(errors.MISSING_DOC, "deleted"));
	      }

	      var rev = merge.winningRev(metadata);
	      rev = opts.rev ? opts.rev : rev;

	      var seq = metadata.rev_map[rev];

	      stores.bySeqStore.get(formatSeq(seq), function (err, doc) {
	        if (!doc) {
	          return callback(errors.error(errors.MISSING_DOC));
	        }
	        if ('_id' in doc && doc._id !== metadata.id) {
	          // this failing implies something very wrong
	          return callback(new Error('wrong doc returned'));
	        }
	        doc._id = metadata.id;
	        if ('_rev' in doc) {
	          if (doc._rev !== rev) {
	            // this failing implies something very wrong
	            return callback(new Error('wrong doc returned'));
	          }
	        } else {
	          // we didn't always store this
	          doc._rev = rev;
	        }
	        return callback(null, {doc: doc, metadata: metadata});
	      });
	    });
	  });

	  // not technically part of the spec, but if putAttachment has its own
	  // method...
	  api._getAttachment = function (attachment, opts, callback) {
	    var digest = attachment.digest;

	    stores.binaryStore.get(digest, function (err, attach) {
	      var data;

	      if (err && err.name === 'NotFoundError') {
	        // Empty attachment
	        data = opts.encode ? '' : process.browser ?
	          utils.createBlob([''], {type: attachment.content_type}) :
	          new Buffer('');
	        return callback(null, data);
	      }

	      if (err) {
	        return callback(err);
	      }

	      if (process.browser) {
	        if (opts.encode) {
	          data = utils.btoa(attach);
	        } else {
	          data = utils.createBlob([utils.fixBinary(attach)],
	            {type: attachment.content_type});
	        }
	      } else {
	        data = opts.encode ? utils.btoa(attach) : attach;
	      }
	      callback(null, data);
	    });
	  };

	  api._bulkDocs = writeLock(function (req, opts, callback) {
	    var newEdits = opts.new_edits;
	    var results = new Array(req.docs.length);
	    var fetchedDocs = new utils.Map();
	    var txn = new LevelTransaction();
	    var docCountDelta = 0;
	    var newUpdateSeq = db._updateSeq;

	    // parse the docs and give each a sequence number
	    var userDocs = req.docs;
	    var docInfos = userDocs.map(function (doc, i) {
	      if (doc._id && utils.isLocalId(doc._id)) {
	        return doc;
	      }
	      var newDoc = utils.parseDoc(doc, newEdits);

	      if (newDoc.metadata && !newDoc.metadata.rev_map) {
	        newDoc.metadata.rev_map = {};
	      }

	      return newDoc;
	    });
	    var infoErrors = docInfos.filter(function (doc) {
	      return doc.error;
	    });

	    if (infoErrors.length) {
	      return callback(infoErrors[0]);
	    }

	    // verify any stub attachments as a precondition test

	    function verifyAttachment(digest, callback) {
	      txn.get(stores.attachmentStore, digest, function (levelErr) {
	        if (levelErr) {
	          var err = errors.error(errors.MISSING_STUB,
	                                'unknown stub attachment with digest ' +
	                                digest);
	          callback(err);
	        } else {
	          callback();
	        }
	      });
	    }

	    function verifyAttachments(finish) {
	      var digests = [];
	      userDocs.forEach(function (doc) {
	        if (doc && doc._attachments) {
	          Object.keys(doc._attachments).forEach(function (filename) {
	            var att = doc._attachments[filename];
	            if (att.stub) {
	              digests.push(att.digest);
	            }
	          });
	        }
	      });
	      if (!digests.length) {
	        return finish();
	      }
	      var numDone = 0;
	      var err;

	      digests.forEach(function (digest) {
	        verifyAttachment(digest, function (attErr) {
	          if (attErr && !err) {
	            err = attErr;
	          }

	          if (++numDone === digests.length) {
	            finish(err);
	          }
	        });
	      });
	    }

	    function fetchExistingDocs(finish) {
	      var numDone = 0;
	      var overallErr;
	      function checkDone() {
	        if (++numDone === userDocs.length) {
	          return finish(overallErr);
	        }
	      }

	      userDocs.forEach(function (doc) {
	        if (doc._id && utils.isLocalId(doc._id)) {
	          // skip local docs
	          return checkDone();
	        }
	        txn.get(stores.docStore, doc._id, function (err, info) {
	          if (err) {
	            if (err.name !== 'NotFoundError') {
	              overallErr = err;
	            }
	          } else {
	            fetchedDocs.set(doc._id, info);
	          }
	          checkDone();
	        });
	      });
	    }

	    function autoCompact(callback) {

	      var promise = utils.Promise.resolve();

	      fetchedDocs.forEach(function (metadata, docId) {
	        // TODO: parallelize, for now need to be sequential to
	        // pass orphaned attachment tests
	        promise = promise.then(function () {
	          return new utils.Promise(function (resolve, reject) {
	            var revs = utils.compactTree(metadata);
	            api._doCompactionNoLock(docId, revs, {ctx: txn}, function (err) {
	              if (err) {
	                return reject(err);
	              }
	              resolve();
	            });
	          });
	        });
	      });
	      
	      promise.then(function () {
	        callback();
	      }, callback);
	    }

	    function finish() {
	      if (api.auto_compaction) {
	        return autoCompact(complete);
	      }
	      return complete();
	    }

	    function writeDoc(doc, winningRev, deleted, callback2,
	                      isUpdate, delta, index) {
	      docCountDelta += delta;

	      var err = null;
	      var recv = 0;

	      doc.data._id = doc.metadata.id;
	      doc.data._rev = doc.metadata.rev;

	      if (deleted) {
	        doc.data._deleted = true;
	      }

	      var attachments = doc.data._attachments ?
	        Object.keys(doc.data._attachments) :
	        [];

	      function attachmentSaved(attachmentErr) {
	        recv++;
	        if (!err) {
	          if (attachmentErr) {
	            err = attachmentErr;
	            callback2(err);
	          } else if (recv === attachments.length) {
	            finish();
	          }
	        }
	      }

	      function onMD5Load(doc, key, data, attachmentSaved) {
	        return function (result) {
	          saveAttachment(doc, MD5_PREFIX + result, key, data, attachmentSaved);
	        };
	      }

	      function onLoadEnd(doc, key, attachmentSaved) {
	        return function (data) {
	          utils.MD5(data).then(
	            onMD5Load(doc, key, data, attachmentSaved)
	          );
	        };
	      }

	      for (var i = 0; i < attachments.length; i++) {
	        var key = attachments[i];
	        var att = doc.data._attachments[key];

	        if (att.stub) {
	          // still need to update the refs mapping
	          var id = doc.data._id;
	          var rev = doc.data._rev;
	          saveAttachmentRefs(id, rev, att.digest, attachmentSaved);
	          continue;
	        }
	        var data;
	        if (typeof att.data === 'string') {
	          try {
	            data = utils.atob(att.data);
	          } catch (e) {
	            callback(errors.error(errors.BAD_ARG,
	                     'Attachments need to be base64 encoded'));
	            return;
	          }
	        } else if (!process.browser) {
	          data = att.data;
	        } else { // browser
	          utils.readAsBinaryString(att.data,
	            onLoadEnd(doc, key, attachmentSaved));
	          continue;
	        }
	        utils.MD5(data).then(
	          onMD5Load(doc, key, data, attachmentSaved)
	        );
	      }

	      function finish() {
	        var seq = doc.metadata.rev_map[doc.metadata.rev];
	        if (seq) {
	          // check that there aren't any existing revisions with the same
	          // revision id, else we shouldn't do anything
	          return callback2();
	        }
	        seq = ++newUpdateSeq;
	        doc.metadata.rev_map[doc.metadata.rev] = doc.metadata.seq = seq;
	        var seqKey = formatSeq(seq);
	        var batch = [{
	          key: seqKey,
	          value: doc.data,
	          prefix: stores.bySeqStore,
	          type: 'put',
	          valueEncoding: 'json'
	        }, {
	          key: doc.metadata.id,
	          value: doc.metadata,
	          prefix: stores.docStore,
	          type: 'put',
	          valueEncoding: safeJsonEncoding
	        }];
	        txn.batch(batch);
	        results[index] = {
	          ok: true,
	          id: doc.metadata.id,
	          rev: winningRev
	        };
	        fetchedDocs.set(doc.metadata.id, doc.metadata);
	        callback2();
	      }

	      if (!attachments.length) {
	        finish();
	      }
	    }

	    // attachments are queued per-digest, otherwise the refs could be
	    // overwritten by concurrent writes in the same bulkDocs session
	    var attachmentQueues = {};

	    function saveAttachmentRefs(id, rev, digest, callback) {

	      function fetchAtt() {
	        return new utils.Promise(function (resolve, reject) {
	          txn.get(stores.attachmentStore, digest, function (err, oldAtt) {
	            if (err && err.name !== 'NotFoundError') {
	              return reject(err);
	            }
	            resolve(oldAtt);
	          });
	        });
	      }

	      function saveAtt(oldAtt) {
	        var ref = [id, rev].join('@');
	        var newAtt = {};

	        if (oldAtt) {
	          if (oldAtt.refs) {
	            // only update references if this attachment already has them
	            // since we cannot migrate old style attachments here without
	            // doing a full db scan for references
	            newAtt.refs = oldAtt.refs;
	            newAtt.refs[ref] = true;
	          }
	        } else {
	          newAtt.refs = {};
	          newAtt.refs[ref] = true;
	        }

	        return new utils.Promise(function (resolve, reject) {
	          txn.batch([{
	            type: 'put',
	            prefix: stores.attachmentStore,
	            key: digest,
	            value: newAtt,
	            valueEncoding: 'json'
	          }]);
	          resolve(!oldAtt);
	        });
	      }

	      // put attachments in a per-digest queue, to avoid two docs with the same
	      // attachment overwriting each other
	      var queue = attachmentQueues[digest] || utils.Promise.resolve();
	      attachmentQueues[digest] = queue.then(function () {
	        return fetchAtt().then(saveAtt).then(function (isNewAttachment) {
	          callback(null, isNewAttachment);
	        }, callback);
	      });
	    }

	    function saveAttachment(docInfo, digest, key, data, callback) {
	      var att = docInfo.data._attachments[key];
	      delete att.data;
	      att.digest = digest;
	      att.length = data.length;
	      var id = docInfo.metadata.id;
	      var rev = docInfo.metadata.rev;

	      saveAttachmentRefs(id, rev, digest, function (err, isNewAttachment) {
	        if (err) {
	          return callback(err);
	        }
	        // do not try to store empty attachments
	        if (data.length === 0) {
	          return callback(err);
	        }
	        if (!isNewAttachment) {
	          // small optimization - don't bother writing it again
	          return callback(err);
	        }
	        txn.batch([{
	          type: 'put',
	          prefix: stores.binaryStore,
	          key: digest,
	          value: new Buffer(data, 'binary'),
	          encoding: 'binary'
	        }]);
	        callback();
	      });
	    }

	    function complete(err) {
	      if (err) {
	        return process.nextTick(function () {
	          callback(err);
	        });
	      }
	      txn.batch([
	        {
	          prefix: stores.metaStore,
	          type: 'put',
	          key: UPDATE_SEQ_KEY,
	          value: newUpdateSeq,
	          encoding: 'json'
	        },
	        {
	          prefix: stores.metaStore,
	          type: 'put',
	          key: DOC_COUNT_KEY,
	          value: db._docCount + docCountDelta,
	          encoding: 'json'
	        }
	      ]);
	      txn.execute(db, function (err) {
	        if (err) {
	          return callback(err);
	        }
	        db._docCount += docCountDelta;
	        db._updateSeq = newUpdateSeq;
	        LevelPouch.Changes.notify(name);
	        process.nextTick(function () {
	          callback(null, results);
	        });
	      });
	    }

	    if (!docInfos.length) {
	      return callback(null, []);
	    }

	    verifyAttachments(function (err) {
	      if (err) {
	        return callback(err);
	      }
	      fetchExistingDocs(function (err) {
	        if (err) {
	          return callback(err);
	        }
	        utils.processDocs(docInfos, api, fetchedDocs,
	          txn, results, writeDoc, opts, finish);
	      });
	    });
	  });
	  api._allDocs = readLock(function (opts, callback) {
	    opts = utils.clone(opts);
	    countDocs(function (err, docCount) {
	      if (err) {
	        return callback(err);
	      }
	      var readstreamOpts = {};
	      var skip = opts.skip || 0;
	      if (opts.startkey) {
	        readstreamOpts.start = opts.startkey;
	      }
	      if (opts.endkey) {
	        readstreamOpts.end = opts.endkey;
	      }
	      if (opts.key) {
	        readstreamOpts.start = readstreamOpts.end = opts.key;
	      }
	      if (opts.descending) {
	        readstreamOpts.reverse = true;
	        // switch start and ends
	        var tmp = readstreamOpts.start;
	        readstreamOpts.start = readstreamOpts.end;
	        readstreamOpts.end = tmp;
	      }
	      var limit;
	      if (typeof opts.limit === 'number') {
	        limit = opts.limit;
	      } else {
	        limit = -1;
	      }
	      if (limit === 0 ||
	          ('start' in readstreamOpts && 'end' in readstreamOpts &&
	          readstreamOpts.start > readstreamOpts.end)) {
	        // should return 0 results when start is greater than end.
	        // normally level would "fix" this for us by reversing the order,
	        // so short-circuit instead
	        return callback(null, {
	          total_rows: docCount,
	          offset: opts.skip,
	          rows: []
	        });
	      }
	      var results = [];
	      var docstream = stores.docStore.readStream(readstreamOpts);

	      var throughStream = through(function (entry, _, next) {
	        if (!utils.isDeleted(entry.value)) {
	          if (skip-- > 0) {
	            next();
	            return;
	          } else if (limit-- === 0) {
	            docstream.unpipe();
	            docstream.destroy();
	            next();
	            return;
	          }
	        } else if (opts.deleted !== 'ok') {
	          next();
	          return;
	        }
	        function allDocsInner(metadata, data) {
	          var doc = {
	            id: metadata.id,
	            key: metadata.id,
	            value: {
	              rev: merge.winningRev(metadata)
	            }
	          };
	          if (opts.include_docs) {
	            doc.doc = data;
	            doc.doc._rev = doc.value.rev;
	            if (opts.conflicts) {
	              doc.doc._conflicts = merge.collectConflicts(metadata);
	            }
	            for (var att in doc.doc._attachments) {
	              if (doc.doc._attachments.hasOwnProperty(att)) {
	                doc.doc._attachments[att].stub = true;
	              }
	            }
	          }
	          if (opts.inclusive_end === false && metadata.id === opts.endkey) {
	            return next();
	          } else if (utils.isDeleted(metadata)) {
	            if (opts.deleted === 'ok') {
	              doc.value.deleted = true;
	              doc.doc = null;
	            } else {
	              return next();
	            }
	          }
	          results.push(doc);
	          next();
	        }
	        var metadata = entry.value;
	        if (opts.include_docs) {
	          var seq = metadata.rev_map[merge.winningRev(metadata)];
	          stores.bySeqStore.get(formatSeq(seq), function (err, data) {
	            allDocsInner(metadata, data);
	          });
	        }
	        else {
	          allDocsInner(metadata);
	        }
	      }, function (next) {
	        utils.Promise.resolve().then(function () {
	          return opts.attachments && fetchAttachments(results, stores);
	        }).then(function () {
	          callback(null, {
	            total_rows: docCount,
	            offset: opts.skip,
	            rows: results
	          });
	        }, callback);
	        next();
	      }).on('unpipe', function () {
	        throughStream.end();
	      });

	      docstream.on('error', callback);

	      docstream.pipe(throughStream);
	    });
	  });

	  api._changes = function (opts) {
	    opts = utils.clone(opts);

	    if (opts.continuous) {
	      var id = name + ':' + utils.uuid();
	      LevelPouch.Changes.addListener(name, id, api, opts);
	      LevelPouch.Changes.notify(name);
	      return {
	        cancel: function () {
	          LevelPouch.Changes.removeListener(name, id);
	        }
	      };
	    }

	    var descending = opts.descending;
	    var results = [];
	    var lastSeq = opts.since || 0;
	    var called = 0;
	    var streamOpts = {
	      reverse: descending
	    };
	    var limit;
	    if ('limit' in opts && opts.limit > 0) {
	      limit = opts.limit;
	    }
	    if (!streamOpts.reverse) {
	      streamOpts.start = formatSeq(opts.since || 0);
	    }

	    var docIds = opts.doc_ids && new utils.Set(opts.doc_ids);
	    var filter = utils.filterChange(opts);
	    var docIdsToMetadata = new utils.Map();

	    var returnDocs;
	    if ('returnDocs' in opts) {
	      returnDocs = opts.returnDocs;
	    } else {
	      returnDocs = true;
	    }

	    function complete() {
	      opts.done = true;
	      if (returnDocs && opts.limit) {
	        if (opts.limit < results.length) {
	          results.length = opts.limit;
	        }
	      }
	      changeStream.unpipe(throughStream);
	      changeStream.destroy();
	      if (!opts.continuous && !opts.cancelled) {
	        utils.Promise.resolve().then(function () {
	          if (opts.include_docs && opts.attachments) {
	            return fetchAttachments(results, stores);
	          }
	        }).then(function () {
	          opts.complete(null, {results: results, last_seq: lastSeq});
	        });
	      }
	    }
	    var changeStream = stores.bySeqStore.readStream(streamOpts);
	    var throughStream = through(function (data, _, next) {
	      if (limit && called >= limit) {
	        complete();
	        return next();
	      }
	      if (opts.cancelled || opts.done) {
	        return next();
	      }

	      var seq = parseSeq(data.key);
	      var doc = data.value;

	      if (seq === opts.since && !descending) {
	        // couchdb ignores `since` if descending=true
	        return next();
	      }

	      if (docIds && !docIds.has(doc._id)) {
	        return next();
	      }

	      var metadata;

	      function onGetMetadata(metadata) {
	        var winningRev = merge.winningRev(metadata);

	        function onGetWinningDoc(winningDoc) {

	          var change = opts.processChange(winningDoc, metadata, opts);
	          change.seq = metadata.seq;

	          if (filter(change)) {
	            called++;

	            if (opts.attachments && opts.include_docs) {
	              // fetch attachment immediately for the benefit
	              // of live listeners
	              fetchAttachments([change], stores).then(function () {
	                opts.onChange(change);
	              });
	            } else {
	              opts.onChange(change);
	            }

	            if (returnDocs) {
	              results.push(change);
	            }
	          }
	          next();
	        }

	        if (metadata.seq !== seq) {
	          // some other seq is later
	          return next();
	        }

	        lastSeq = seq;

	        if (winningRev === doc._rev) {
	          return onGetWinningDoc(doc);
	        }

	        // fetch the winner

	        var winningSeq = metadata.rev_map[winningRev];

	        stores.bySeqStore.get(formatSeq(winningSeq), function (err, doc) {
	          onGetWinningDoc(doc);
	        });
	      }

	      metadata = docIdsToMetadata.get(doc._id);
	      if (metadata) { // cached
	        return onGetMetadata(metadata);
	      }
	      // metadata not cached, have to go fetch it
	      stores.docStore.get(doc._id, function (err, metadata) {
	        if (opts.cancelled || opts.done || db.isClosed() ||
	          utils.isLocalId(metadata.id)) {
	          return next();
	        }
	        docIdsToMetadata.set(doc._id, metadata);
	        onGetMetadata(metadata);
	      });
	    }, function (next) {
	      if (opts.cancelled) {
	        return next();
	      }
	      if (returnDocs && opts.limit) {
	        if (opts.limit < results.length) {
	          results.length = opts.limit;
	        }
	      }

	      next();
	    }).on('unpipe', function () {
	      throughStream.end();
	      complete();
	    });
	    changeStream.pipe(throughStream);
	    return {
	      cancel: function () {
	        opts.cancelled = true;
	        complete();
	      }
	    };
	  };

	  api._close = function (callback) {
	    if (db.isClosed()) {
	      return callback(errors.error(errors.NOT_OPEN));
	    }
	    db.close(function (err) {
	      if (err) {
	        callback(err);
	      } else {
	        dbStore.delete(name);
	        callback();
	      }
	    });
	  };

	  api._getRevisionTree = function (docId, callback) {
	    stores.docStore.get(docId, function (err, metadata) {
	      if (err) {
	        callback(errors.error(errors.MISSING_DOC));
	      } else {
	        callback(null, metadata.rev_tree);
	      }
	    });
	  };

	  api._doCompaction = writeLock(function (docId, revs, opts, callback) {
	    api._doCompactionNoLock(docId, revs, opts, callback);
	  });

	  // the NoLock version is for use by bulkDocs
	  api._doCompactionNoLock = function (docId, revs, opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }

	    if (!revs.length) {
	      return callback();
	    }
	    var txn = opts.ctx || new LevelTransaction();

	    txn.get(stores.docStore, docId, function (err, metadata) {
	      if (err) {
	        return callback(err);
	      }
	      var seqs = metadata.rev_map; // map from rev to seq
	      merge.traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
	                                                         revHash, ctx, opts) {
	        var rev = pos + '-' + revHash;
	        if (revs.indexOf(rev) !== -1) {
	          opts.status = 'missing';
	        }
	      });
	      var batch = [];
	      batch.push({
	        key: metadata.id,
	        value: metadata,
	        type: 'put',
	        valueEncoding: safeJsonEncoding,
	        prefix: stores.docStore
	      });

	      var digestMap = {};
	      var numDone = 0;
	      var overallErr;
	      function checkDone(err) {
	        if (err) {
	          overallErr = err;
	        }
	        if (++numDone === revs.length) { // done
	          if (overallErr) {
	            return callback(overallErr);
	          }
	          deleteOrphanedAttachments();
	        }
	      }

	      function finish(err) {
	        if (err) {
	          return callback(err);
	        }
	        txn.batch(batch);
	        if (opts.ctx) {
	          // don't execute immediately
	          return callback();
	        }
	        txn.execute(db, callback);
	      }

	      function deleteOrphanedAttachments() {
	        var possiblyOrphanedAttachments = Object.keys(digestMap);
	        if (!possiblyOrphanedAttachments.length) {
	          return finish();
	        }
	        var numDone = 0;
	        var overallErr;
	        function checkDone(err) {
	          if (err) {
	            overallErr = err;
	          }
	          if (++numDone === possiblyOrphanedAttachments.length) {
	            finish(overallErr);
	          }
	        }
	        var refsToDelete = new utils.Map();
	        revs.forEach(function (rev) {
	          refsToDelete.set(docId + '@' + rev, true);
	        });
	        possiblyOrphanedAttachments.forEach(function (digest) {
	          txn.get(stores.attachmentStore, digest, function (err, attData) {
	            if (err) {
	              if (err.name === 'NotFoundError') {
	                return checkDone();
	              } else {
	                return checkDone(err);
	              }
	            }
	            var refs = Object.keys(attData.refs || {}).filter(function (ref) {
	              return !refsToDelete.has(ref);
	            });
	            var newRefs = {};
	            refs.forEach(function (ref) {
	              newRefs[ref] = true;
	            });
	            if (refs.length) { // not orphaned
	              batch.push({
	                key: digest,
	                type: 'put',
	                valueEncoding: 'json',
	                value: {refs: newRefs},
	                prefix: stores.attachmentStore
	              });
	            } else { // orphaned, can safely delete
	              batch = batch.concat([{
	                key: digest,
	                type: 'del',
	                prefix: stores.attachmentStore
	              }, {
	                key: digest,
	                type: 'del',
	                prefix: stores.binaryStore
	              }]);
	            }
	            checkDone();
	          });
	        });
	      }

	      revs.forEach(function (rev) {
	        var seq = seqs[rev];
	        batch.push({
	          key: formatSeq(seq),
	          type: 'del',
	          prefix: stores.bySeqStore
	        });
	        txn.get(stores.bySeqStore, formatSeq(seq), function (err, doc) {
	          if (err) {
	            if (err.name === 'NotFoundError') {
	              return checkDone();
	            } else {
	              return checkDone(err);
	            }
	          }
	          var atts = Object.keys(doc._attachments || {});
	          atts.forEach(function (attName) {
	            var digest = doc._attachments[attName].digest;
	            digestMap[digest] = true;
	          });
	          checkDone();
	        });
	      });
	    });
	  };

	  api._getLocal = function (id, callback) {
	    stores.localStore.get(id, function (err, doc) {
	      if (err) {
	        callback(errors.error(errors.MISSING_DOC));
	      } else {
	        callback(null, doc);
	      }
	    });
	  };

	  api._putLocal = function (doc, opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    if (opts.ctx) {
	      api._putLocalNoLock(doc, opts, callback);
	    } else {
	      api._putLocalWithLock(doc, opts, callback);
	    }
	  };

	  api._putLocalWithLock = writeLock(function (doc, opts, callback) {
	    api._putLocalNoLock(doc, opts, callback);
	  });

	  // the NoLock version is for use by bulkDocs
	  api._putLocalNoLock = function (doc, opts, callback) {
	    delete doc._revisions; // ignore this, trust the rev
	    var oldRev = doc._rev;
	    var id = doc._id;

	    var txn = opts.ctx || new LevelTransaction();

	    txn.get(stores.localStore, id, function (err, resp) {
	      if (err && oldRev) {
	        return callback(errors.error(errors.REV_CONFLICT));
	      }
	      if (resp && resp._rev !== oldRev) {
	        return callback(errors.error(errors.REV_CONFLICT));
	      }
	      doc._rev =
	          oldRev ? '0-' + (parseInt(oldRev.split('-')[1], 10) + 1) : '0-1';
	      var batch = [
	        {
	          type: 'put',
	          prefix: stores.localStore,
	          key: id,
	          value: doc,
	          valueEncoding: 'json'
	        }
	      ];

	      txn.batch(batch);
	      var ret = {ok: true, id: doc._id, rev: doc._rev};

	      if (opts.ctx) {
	        // don't execute immediately
	        return callback(null, ret);
	      }
	      txn.execute(db, function (err) {
	        if (err) {
	          return callback(err);
	        }
	        callback(null, ret);
	      });
	    });
	  };

	  api._removeLocal = function (doc, opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    if (opts.ctx) {
	      api._removeLocalNoLock(doc, opts, callback);
	    } else {
	      api._removeLocalWithLock(doc, opts, callback);
	    }
	  };

	  api._removeLocalWithLock = writeLock(function (doc, opts, callback) {
	    api._removeLocalNoLock(doc, opts, callback);
	  });

	  // the NoLock version is for use by bulkDocs
	  api._removeLocalNoLock = function (doc, opts, callback) {
	    var txn = opts.ctx || new LevelTransaction();
	    txn.get(stores.localStore, doc._id, function (err, resp) {
	      if (err) {
	        return callback(err);
	      }
	      if (resp._rev !== doc._rev) {
	        return callback(errors.error(errors.REV_CONFLICT));
	      }
	      txn.batch([{
	        prefix: stores.localStore,
	        type: 'del',
	        key: doc._id
	      }]);
	      var ret = {ok: true, id: doc._id, rev: '0-0'};
	      if (opts.ctx) {
	        // don't execute immediately
	        return callback(null, ret);
	      }
	      txn.execute(db, function (err) {
	        if (err) {
	          return callback(err);
	        }
	        callback(null, ret);
	      });
	    });
	  };
	}

	LevelPouch.valid = function () {
	  return process && !process.browser;
	};

	// close and delete open leveldb stores
	LevelPouch.destroy = utils.toPromise(function (name, opts, callback) {
	  opts = utils.clone(opts);

	  var leveldown = opts.db || originalLeveldown;
	  function callDestroy(name, cb) {
	    if (typeof leveldown.destroy === 'function') {
	      leveldown.destroy(name, cb);
	    } else {
	      process.nextTick(callback);
	    }
	  }

	  var dbStore;
	  if (dbStores.has(leveldown.name)) {
	    dbStore = dbStores.get(leveldown.name);
	  } else {
	    return callDestroy(name, callback);
	  }

	  if (dbStore.has(name)) {

	    LevelPouch.Changes.removeAllListeners(name);

	    dbStore.get(name).close(function () {
	      dbStore.delete(name);
	      callDestroy(name, callback);
	    });
	  } else {
	    callDestroy(name, callback);
	  }
	});

	LevelPouch.use_prefix = false;

	LevelPouch.Changes = new utils.Changes();

	module.exports = LevelPouch;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13), __webpack_require__(45).Buffer))

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	// shim for using process in browser

	var process = module.exports = {};

	process.nextTick = (function () {
	    var canSetImmediate = typeof window !== 'undefined'
	    && window.setImmediate;
	    var canMutationObserver = typeof window !== 'undefined'
	    && window.MutationObserver;
	    var canPost = typeof window !== 'undefined'
	    && window.postMessage && window.addEventListener
	    ;

	    if (canSetImmediate) {
	        return function (f) { return window.setImmediate(f) };
	    }

	    var queue = [];

	    if (canMutationObserver) {
	        var hiddenDiv = document.createElement("div");
	        var observer = new MutationObserver(function () {
	            var queueList = queue.slice();
	            queue.length = 0;
	            queueList.forEach(function (fn) {
	                fn();
	            });
	        });

	        observer.observe(hiddenDiv, { attributes: true });

	        return function nextTick(fn) {
	            if (!queue.length) {
	                hiddenDiv.setAttribute('yes', 'no');
	            }
	            queue.push(fn);
	        };
	    }

	    if (canPost) {
	        window.addEventListener('message', function (ev) {
	            var source = ev.source;
	            if ((source === window || source === null) && ev.data === 'process-tick') {
	                ev.stopPropagation();
	                if (queue.length > 0) {
	                    var fn = queue.shift();
	                    fn();
	                }
	            }
	        }, true);

	        return function nextTick(fn) {
	            queue.push(fn);
	            window.postMessage('process-tick', '*');
	        };
	    }

	    return function nextTick(fn) {
	        setTimeout(fn, 0);
	    };
	})();

	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];

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


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	var pouchCollate = __webpack_require__(61);
	var TaskQueue = __webpack_require__(46);
	var collate = pouchCollate.collate;
	var toIndexableString = pouchCollate.toIndexableString;
	var normalizeKey = pouchCollate.normalizeKey;
	var createView = __webpack_require__(47);
	var evalFunc = __webpack_require__(48);
	var log; 
	/* istanbul ignore else */
	if ((typeof console !== 'undefined') && (typeof console.log === 'function')) {
	  log = Function.prototype.bind.call(console.log, console);
	} else {
	  log = function () {};
	}
	var utils = __webpack_require__(49);
	var Promise = utils.Promise;
	var persistentQueues = {};
	var tempViewQueue = new TaskQueue();
	var CHANGES_BATCH_SIZE = 50;

	function parseViewName(name) {
	  // can be either 'ddocname/viewname' or just 'viewname'
	  // (where the ddoc name is the same)
	  return name.indexOf('/') === -1 ? [name, name] : name.split('/');
	}

	function isGenOne(changes) {
	  // only return true if the current change is 1-
	  // and there are no other leafs
	  return changes.length === 1 && /^1-/.test(changes[0].rev);
	}

	function emitError(db, e) {
	  try {
	    db.emit('error', e);
	  } catch (err) {
	    console.error(
	      'The user\'s map/reduce function threw an uncaught error.\n' +
	      'You can debug this error by doing:\n' +
	      'myDatabase.on(\'error\', function (err) { debugger; });\n' +
	      'Please double-check your map/reduce function.');
	    console.error(e);
	  }
	}

	function tryCode(db, fun, args) {
	  // emit an event if there was an error thrown by a map/reduce function.
	  // putting try/catches in a single function also avoids deoptimizations.
	  try {
	    return {
	      output : fun.apply(null, args)
	    };
	  } catch (e) {
	    emitError(db, e);
	    return {error: e};
	  }
	}

	function sortByKeyThenValue(x, y) {
	  var keyCompare = collate(x.key, y.key);
	  return keyCompare !== 0 ? keyCompare : collate(x.value, y.value);
	}

	function sliceResults(results, limit, skip) {
	  skip = skip || 0;
	  if (typeof limit === 'number') {
	    return results.slice(skip, limit + skip);
	  } else if (skip > 0) {
	    return results.slice(skip);
	  }
	  return results;
	}

	function rowToDocId(row) {
	  var val = row.value;
	  // Users can explicitly specify a joined doc _id, or it
	  // defaults to the doc _id that emitted the key/value.
	  var docId = (val && typeof val === 'object' && val._id) || row.id;
	  return docId;
	}

	function createBuiltInError(name) {
	  var message = 'builtin ' + name +
	    ' function requires map values to be numbers' +
	    ' or number arrays';
	  return new BuiltInError(message);
	}

	function sum(values) {
	  var result = 0;
	  for (var i = 0, len = values.length; i < len; i++) {
	    var num = values[i];
	    if (typeof num !== 'number') {
	      if (Array.isArray(num)) {
	        // lists of numbers are also allowed, sum them separately
	        result = typeof result === 'number' ? [result] : result;
	        for (var j = 0, jLen = num.length; j < jLen; j++) {
	          var jNum = num[j];
	          if (typeof jNum !== 'number') {
	            throw createBuiltInError('_sum');
	          } else if (typeof result[j] === 'undefined') {
	            result.push(jNum);
	          } else {
	            result[j] += jNum;
	          }
	        }
	      } else { // not array/number
	        throw createBuiltInError('_sum');
	      }
	    } else if (typeof result === 'number') {
	      result += num;
	    } else { // add number to array
	      result[0] += num;
	    }
	  }
	  return result;
	}

	var builtInReduce = {
	  _sum: function (keys, values) {
	    return sum(values);
	  },

	  _count: function (keys, values) {
	    return values.length;
	  },

	  _stats: function (keys, values) {
	    // no need to implement rereduce=true, because Pouch
	    // will never call it
	    function sumsqr(values) {
	      var _sumsqr = 0;
	      for (var i = 0, len = values.length; i < len; i++) {
	        var num = values[i];
	        _sumsqr += (num * num);
	      }
	      return _sumsqr;
	    }
	    return {
	      sum     : sum(values),
	      min     : Math.min.apply(null, values),
	      max     : Math.max.apply(null, values),
	      count   : values.length,
	      sumsqr : sumsqr(values)
	    };
	  }
	};

	function addHttpParam(paramName, opts, params, asJson) {
	  // add an http param from opts to params, optionally json-encoded
	  var val = opts[paramName];
	  if (typeof val !== 'undefined') {
	    if (asJson) {
	      val = encodeURIComponent(JSON.stringify(val));
	    }
	    params.push(paramName + '=' + val);
	  }
	}

	function checkQueryParseError(options, fun) {
	  var startkeyName = options.descending ? 'endkey' : 'startkey';
	  var endkeyName = options.descending ? 'startkey' : 'endkey';

	  if (typeof options[startkeyName] !== 'undefined' &&
	    typeof options[endkeyName] !== 'undefined' &&
	    collate(options[startkeyName], options[endkeyName]) > 0) {
	    throw new QueryParseError('No rows can match your key range, reverse your ' +
	        'start_key and end_key or set {descending : true}');
	  } else if (fun.reduce && options.reduce !== false) {
	    if (options.include_docs) {
	      throw new QueryParseError('{include_docs:true} is invalid for reduce');
	    } else if (options.keys && options.keys.length > 1 &&
	        !options.group && !options.group_level) {
	      throw new QueryParseError('Multi-key fetches for reduce views must use {group: true}');
	    }
	  }
	  if (options.group_level) {
	    if (typeof options.group_level !== 'number') {
	      throw new QueryParseError('Invalid value for integer: "' + options.group_level + '"');
	    }
	    if (options.group_level < 0) {
	      throw new QueryParseError('Invalid value for positive integer: ' +
	        '"' + options.group_level + '"');
	    }
	  }
	}

	function httpQuery(db, fun, opts) {
	  // List of parameters to add to the PUT request
	  var params = [];
	  var body;
	  var method = 'GET';

	  // If opts.reduce exists and is defined, then add it to the list
	  // of parameters.
	  // If reduce=false then the results are that of only the map function
	  // not the final result of map and reduce.
	  addHttpParam('reduce', opts, params);
	  addHttpParam('include_docs', opts, params);
	  addHttpParam('attachments', opts, params);
	  addHttpParam('limit', opts, params);
	  addHttpParam('descending', opts, params);
	  addHttpParam('group', opts, params);
	  addHttpParam('group_level', opts, params);
	  addHttpParam('skip', opts, params);
	  addHttpParam('stale', opts, params);
	  addHttpParam('conflicts', opts, params);
	  addHttpParam('startkey', opts, params, true);
	  addHttpParam('endkey', opts, params, true);
	  addHttpParam('inclusive_end', opts, params);
	  addHttpParam('key', opts, params, true);

	  // Format the list of parameters into a valid URI query string
	  params = params.join('&');
	  params = params === '' ? '' : '?' + params;

	  // If keys are supplied, issue a POST request to circumvent GET query string limits
	  // see http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options
	  if (typeof opts.keys !== 'undefined') {
	    var MAX_URL_LENGTH = 2000;
	    // according to http://stackoverflow.com/a/417184/680742,
	    // the de facto URL length limit is 2000 characters

	    var keysAsString =
	      'keys=' + encodeURIComponent(JSON.stringify(opts.keys));
	    if (keysAsString.length + params.length + 1 <= MAX_URL_LENGTH) {
	      // If the keys are short enough, do a GET. we do this to work around
	      // Safari not understanding 304s on POSTs (see pouchdb/pouchdb#1239)
	      params += (params[0] === '?' ? '&' : '?') + keysAsString;
	    } else {
	      method = 'POST';
	      if (typeof fun === 'string') {
	        body = JSON.stringify({keys: opts.keys});
	      } else { // fun is {map : mapfun}, so append to this
	        fun.keys = opts.keys;
	      }
	    }
	  }

	  // We are referencing a query defined in the design doc
	  if (typeof fun === 'string') {
	    var parts = parseViewName(fun);
	    return db.request({
	      method: method,
	      url: '_design/' + parts[0] + '/_view/' + parts[1] + params,
	      body: body
	    });
	  }

	  // We are using a temporary view, terrible for performance but good for testing
	  body = body || {};
	  Object.keys(fun).forEach(function (key) {
	    if (Array.isArray(fun[key])) {
	      body[key] = fun[key];
	    } else {
	      body[key] = fun[key].toString();
	    }
	  });
	  return db.request({
	    method: 'POST',
	    url: '_temp_view' + params,
	    body: body
	  });
	}

	function defaultsTo(value) {
	  return function (reason) {
	    /* istanbul ignore else */
	    if (reason.status === 404) {
	      return value;
	    } else {
	      throw reason;
	    }
	  };
	}

	// returns a promise for a list of docs to update, based on the input docId.
	// the order doesn't matter, because post-3.2.0, bulkDocs
	// is an atomic operation in all three adapters.
	function getDocsToPersist(docId, view, docIdsToChangesAndEmits) {
	  var metaDocId = '_local/doc_' + docId;
	  var defaultMetaDoc = {_id: metaDocId, keys: []};
	  var docData = docIdsToChangesAndEmits[docId];
	  var indexableKeysToKeyValues = docData.indexableKeysToKeyValues;
	  var changes = docData.changes;

	  function getMetaDoc() {
	    if (isGenOne(changes)) {
	      // generation 1, so we can safely assume initial state
	      // for performance reasons (avoids unnecessary GETs)
	      return Promise.resolve(defaultMetaDoc);
	    }
	    return view.db.get(metaDocId).catch(defaultsTo(defaultMetaDoc));
	  }

	  function getKeyValueDocs(metaDoc) {
	    if (!metaDoc.keys.length) {
	      // no keys, no need for a lookup
	      return Promise.resolve({rows: []});
	    }
	    return view.db.allDocs({
	      keys: metaDoc.keys,
	      include_docs: true
	    });
	  }

	  function processKvDocs(metaDoc, kvDocsRes) {
	    var kvDocs = [];
	    var oldKeysMap = {};

	    for (var i = 0, len = kvDocsRes.rows.length; i < len; i++) {
	      var row = kvDocsRes.rows[i];
	      var doc = row.doc;
	      if (!doc) { // deleted
	        continue;
	      }
	      kvDocs.push(doc);
	      oldKeysMap[doc._id] = true;
	      doc._deleted = !indexableKeysToKeyValues[doc._id];
	      if (!doc._deleted) {
	        var keyValue = indexableKeysToKeyValues[doc._id];
	        if ('value' in keyValue) {
	          doc.value = keyValue.value;
	        }
	      }
	    }

	    var newKeys = Object.keys(indexableKeysToKeyValues);
	    newKeys.forEach(function (key) {
	      if (!oldKeysMap[key]) {
	        // new doc
	        var kvDoc = {
	          _id: key
	        };
	        var keyValue = indexableKeysToKeyValues[key];
	        if ('value' in keyValue) {
	          kvDoc.value = keyValue.value;
	        }
	        kvDocs.push(kvDoc);
	      }
	    });
	    metaDoc.keys = utils.uniq(newKeys.concat(metaDoc.keys));
	    kvDocs.push(metaDoc);

	    return kvDocs;
	  }

	  return getMetaDoc().then(function (metaDoc) {
	    return getKeyValueDocs(metaDoc).then(function (kvDocsRes) {
	      return processKvDocs(metaDoc, kvDocsRes);
	    });
	  });
	}

	// updates all emitted key/value docs and metaDocs in the mrview database
	// for the given batch of documents from the source database
	function saveKeyValues(view, docIdsToChangesAndEmits, seq) {
	  var seqDocId = '_local/lastSeq';
	  return view.db.get(seqDocId)
	  .catch(defaultsTo({_id: seqDocId, seq: 0}))
	  .then(function (lastSeqDoc) {
	    var docIds = Object.keys(docIdsToChangesAndEmits);
	    return Promise.all(docIds.map(function (docId) {
	      return getDocsToPersist(docId, view, docIdsToChangesAndEmits);
	    })).then(function (listOfDocsToPersist) {
	      var docsToPersist = utils.flatten(listOfDocsToPersist);
	      lastSeqDoc.seq = seq;
	      docsToPersist.push(lastSeqDoc);
	      // write all docs in a single operation, update the seq once
	      return view.db.bulkDocs({docs : docsToPersist});
	    });
	  });
	}

	function getQueue(view) {
	  var viewName = typeof view === 'string' ? view : view.name;
	  var queue = persistentQueues[viewName];
	  if (!queue) {
	    queue = persistentQueues[viewName] = new TaskQueue();
	  }
	  return queue;
	}

	function updateView(view) {
	  return utils.sequentialize(getQueue(view), function () {
	    return updateViewInQueue(view);
	  })();
	}

	function updateViewInQueue(view) {
	  // bind the emit function once
	  var mapResults;
	  var doc;

	  function emit(key, value) {
	    var output = {id: doc._id, key: normalizeKey(key)};
	    // Don't explicitly store the value unless it's defined and non-null.
	    // This saves on storage space, because often people don't use it.
	    if (typeof value !== 'undefined' && value !== null) {
	      output.value = normalizeKey(value);
	    }
	    mapResults.push(output);
	  }

	  var mapFun;
	  // for temp_views one can use emit(doc, emit), see #38
	  if (typeof view.mapFun === "function" && view.mapFun.length === 2) {
	    var origMap = view.mapFun;
	    mapFun = function (doc) {
	      return origMap(doc, emit);
	    };
	  } else {
	    mapFun = evalFunc(view.mapFun.toString(), emit, sum, log, Array.isArray, JSON.parse);
	  }

	  var currentSeq = view.seq || 0;

	  function processChange(docIdsToChangesAndEmits, seq) {
	    return function () {
	      return saveKeyValues(view, docIdsToChangesAndEmits, seq);
	    };
	  }

	  var queue = new TaskQueue();
	  // TODO(neojski): https://github.com/daleharvey/pouchdb/issues/1521

	  return new Promise(function (resolve, reject) {

	    function complete() {
	      queue.finish().then(function () {
	        view.seq = currentSeq;
	        resolve();
	      });
	    }

	    function processNextBatch() {
	      view.sourceDB.changes({
	        conflicts: true,
	        include_docs: true,
	        style: 'all_docs',
	        since: currentSeq,
	        limit: CHANGES_BATCH_SIZE
	      }).on('complete', function (response) {
	        var results = response.results;
	        if (!results.length) {
	          return complete();
	        }
	        var docIdsToChangesAndEmits = {};
	        for (var i = 0, l = results.length; i < l; i++) {
	          var change = results[i];
	          if (change.doc._id[0] !== '_') {
	            mapResults = [];
	            doc = change.doc;

	            if (!doc._deleted) {
	              tryCode(view.sourceDB, mapFun, [doc]);
	            }
	            mapResults.sort(sortByKeyThenValue);

	            var indexableKeysToKeyValues = {};
	            var lastKey;
	            for (var j = 0, jl = mapResults.length; j < jl; j++) {
	              var obj = mapResults[j];
	              var complexKey = [obj.key, obj.id];
	              if (collate(obj.key, lastKey) === 0) {
	                complexKey.push(j); // dup key+id, so make it unique
	              }
	              var indexableKey = toIndexableString(complexKey);
	              indexableKeysToKeyValues[indexableKey] = obj;
	              lastKey = obj.key;
	            }
	            docIdsToChangesAndEmits[change.doc._id] = {
	              indexableKeysToKeyValues: indexableKeysToKeyValues,
	              changes: change.changes
	            };
	          }
	          currentSeq = change.seq;
	        }
	        queue.add(processChange(docIdsToChangesAndEmits, currentSeq));
	        if (results.length < CHANGES_BATCH_SIZE) {
	          return complete();
	        }
	        return processNextBatch();
	      }).on('error', onError);
	      /* istanbul ignore next */
	      function onError(err) {
	        reject(err);
	      }
	    }

	    processNextBatch();
	  });
	}

	function reduceView(view, results, options) {
	  if (options.group_level === 0) {
	    delete options.group_level;
	  }

	  var shouldGroup = options.group || options.group_level;

	  var reduceFun;
	  if (builtInReduce[view.reduceFun]) {
	    reduceFun = builtInReduce[view.reduceFun];
	  } else {
	    reduceFun = evalFunc(
	      view.reduceFun.toString(), null, sum, log, Array.isArray, JSON.parse);
	  }

	  var groups = [];
	  var lvl = options.group_level;
	  results.forEach(function (e) {
	    var last = groups[groups.length - 1];
	    var key = shouldGroup ? e.key : null;

	    // only set group_level for array keys
	    if (shouldGroup && Array.isArray(key) && typeof lvl === 'number') {
	      key = key.length > lvl ? key.slice(0, lvl) : key;
	    }

	    if (last && collate(last.key[0][0], key) === 0) {
	      last.key.push([key, e.id]);
	      last.value.push(e.value);
	      return;
	    }
	    groups.push({key: [
	      [key, e.id]
	    ], value: [e.value]});
	  });
	  for (var i = 0, len = groups.length; i < len; i++) {
	    var e = groups[i];
	    var reduceTry = tryCode(view.sourceDB, reduceFun, [e.key, e.value, false]);
	    if (reduceTry.error && reduceTry.error instanceof BuiltInError) {
	      // CouchDB returns an error if a built-in errors out
	      throw reduceTry.error;
	    }
	    // CouchDB just sets the value to null if a non-built-in errors out
	    e.value = reduceTry.error ? null : reduceTry.output;
	    e.key = e.key[0][0];
	  }
	  // no total_rows/offset when reducing
	  return {rows: sliceResults(groups, options.limit, options.skip)};
	}

	function queryView(view, opts) {
	  return utils.sequentialize(getQueue(view), function () {
	    return queryViewInQueue(view, opts);
	  })();
	}

	function queryViewInQueue(view, opts) {
	  var totalRows;
	  var shouldReduce = view.reduceFun && opts.reduce !== false;
	  var skip = opts.skip || 0;
	  if (typeof opts.keys !== 'undefined' && !opts.keys.length) {
	    // equivalent query
	    opts.limit = 0;
	    delete opts.keys;
	  }

	  function fetchFromView(viewOpts) {
	    viewOpts.include_docs = true;
	    return view.db.allDocs(viewOpts).then(function (res) {
	      totalRows = res.total_rows;
	      return res.rows.map(function (result) {

	        // implicit migration - in older versions of PouchDB,
	        // we explicitly stored the doc as {id: ..., key: ..., value: ...}
	        // this is tested in a migration test
	        /* istanbul ignore next */
	        if ('value' in result.doc && typeof result.doc.value === 'object' &&
	            result.doc.value !== null) {
	          var keys = Object.keys(result.doc.value).sort();
	          // this detection method is not perfect, but it's unlikely the user
	          // emitted a value which was an object with these 3 exact keys
	          var expectedKeys = ['id', 'key', 'value'];
	          if (!(keys < expectedKeys || keys > expectedKeys)) {
	            return result.doc.value;
	          }
	        }

	        var parsedKeyAndDocId = pouchCollate.parseIndexableString(result.doc._id);
	        return {
	          key: parsedKeyAndDocId[0],
	          id: parsedKeyAndDocId[1],
	          value: ('value' in result.doc ? result.doc.value : null)
	        };
	      });
	    });
	  }

	  function onMapResultsReady(rows) {
	    var finalResults;
	    if (shouldReduce) {
	      finalResults = reduceView(view, rows, opts);
	    } else {
	      finalResults = {
	        total_rows: totalRows,
	        offset: skip,
	        rows: rows
	      };
	    }
	    if (opts.include_docs) {
	      var docIds = utils.uniq(rows.map(rowToDocId));

	      return view.sourceDB.allDocs({
	        keys: docIds,
	        include_docs: true,
	        conflicts: opts.conflicts,
	        attachments: opts.attachments
	      }).then(function (allDocsRes) {
	        var docIdsToDocs = {};
	        allDocsRes.rows.forEach(function (row) {
	          if (row.doc) {
	            docIdsToDocs['$' + row.id] = row.doc;
	          }
	        });
	        rows.forEach(function (row) {
	          var docId = rowToDocId(row);
	          var doc = docIdsToDocs['$' + docId];
	          if (doc) {
	            row.doc = doc;
	          }
	        });
	        return finalResults;
	      });
	    } else {
	      return finalResults;
	    }
	  }

	  var flatten = function (array) {
	    return array.reduce(function (prev, cur) {
	      return prev.concat(cur);
	    });
	  };

	  if (typeof opts.keys !== 'undefined') {
	    var keys = opts.keys;
	    var fetchPromises = keys.map(function (key) {
	      var viewOpts = {
	        startkey : toIndexableString([key]),
	        endkey   : toIndexableString([key, {}])
	      };
	      return fetchFromView(viewOpts);
	    });
	    return Promise.all(fetchPromises).then(flatten).then(onMapResultsReady);
	  } else { // normal query, no 'keys'
	    var viewOpts = {
	      descending : opts.descending
	    };
	    if (typeof opts.startkey !== 'undefined') {
	      viewOpts.startkey = opts.descending ?
	        toIndexableString([opts.startkey, {}]) :
	        toIndexableString([opts.startkey]);
	    }
	    if (typeof opts.endkey !== 'undefined') {
	      var inclusiveEnd = opts.inclusive_end !== false;
	      if (opts.descending) {
	        inclusiveEnd = !inclusiveEnd;
	      }

	      viewOpts.endkey = toIndexableString(inclusiveEnd ? [opts.endkey, {}] : [opts.endkey]);
	    }
	    if (typeof opts.key !== 'undefined') {
	      var keyStart = toIndexableString([opts.key]);
	      var keyEnd = toIndexableString([opts.key, {}]);
	      if (viewOpts.descending) {
	        viewOpts.endkey = keyStart;
	        viewOpts.startkey = keyEnd;
	      } else {
	        viewOpts.startkey = keyStart;
	        viewOpts.endkey = keyEnd;
	      }
	    }
	    if (!shouldReduce) {
	      if (typeof opts.limit === 'number') {
	        viewOpts.limit = opts.limit;
	      }
	      viewOpts.skip = skip;
	    }
	    return fetchFromView(viewOpts).then(onMapResultsReady);
	  }
	}

	function httpViewCleanup(db) {
	  return db.request({
	    method: 'POST',
	    url: '_view_cleanup'
	  });
	}

	function localViewCleanup(db) {
	  return db.get('_local/mrviews').then(function (metaDoc) {
	    var docsToViews = {};
	    Object.keys(metaDoc.views).forEach(function (fullViewName) {
	      var parts = parseViewName(fullViewName);
	      var designDocName = '_design/' + parts[0];
	      var viewName = parts[1];
	      docsToViews[designDocName] = docsToViews[designDocName] || {};
	      docsToViews[designDocName][viewName] = true;
	    });
	    var opts = {
	      keys : Object.keys(docsToViews),
	      include_docs : true
	    };
	    return db.allDocs(opts).then(function (res) {
	      var viewsToStatus = {};
	      res.rows.forEach(function (row) {
	        var ddocName = row.key.substring(8);
	        Object.keys(docsToViews[row.key]).forEach(function (viewName) {
	          var fullViewName = ddocName + '/' + viewName;
	          /* istanbul ignore if */
	          if (!metaDoc.views[fullViewName]) {
	            // new format, without slashes, to support PouchDB 2.2.0
	            // migration test in pouchdb's browser.migration.js verifies this
	            fullViewName = viewName;
	          }
	          var viewDBNames = Object.keys(metaDoc.views[fullViewName]);
	          // design doc deleted, or view function nonexistent
	          var statusIsGood = row.doc && row.doc.views && row.doc.views[viewName];
	          viewDBNames.forEach(function (viewDBName) {
	            viewsToStatus[viewDBName] = viewsToStatus[viewDBName] || statusIsGood;
	          });
	        });
	      });
	      var dbsToDelete = Object.keys(viewsToStatus).filter(function (viewDBName) {
	        return !viewsToStatus[viewDBName];
	      });
	      var destroyPromises = dbsToDelete.map(function (viewDBName) {
	        return utils.sequentialize(getQueue(viewDBName), function () {
	          return new db.constructor(viewDBName, db.__opts).destroy();
	        })();
	      });
	      return Promise.all(destroyPromises).then(function () {
	        return {ok: true};
	      });
	    });
	  }, defaultsTo({ok: true}));
	}

	exports.viewCleanup = utils.callbackify(function () {
	  var db = this;
	  if (db.type() === 'http') {
	    return httpViewCleanup(db);
	  }
	  return localViewCleanup(db);
	});

	function queryPromised(db, fun, opts) {
	  if (db.type() === 'http') {
	    return httpQuery(db, fun, opts);
	  }

	  if (typeof fun !== 'string') {
	    // temp_view
	    checkQueryParseError(opts, fun);

	    var createViewOpts = {
	      db : db,
	      viewName : 'temp_view/temp_view',
	      map : fun.map,
	      reduce : fun.reduce,
	      temporary : true
	    };
	    tempViewQueue.add(function () {
	      return createView(createViewOpts).then(function (view) {
	        function cleanup() {
	          return view.db.destroy();
	        }
	        return utils.fin(updateView(view).then(function () {
	          return queryView(view, opts);
	        }), cleanup);
	      });
	    });
	    return tempViewQueue.finish();
	  } else {
	    // persistent view
	    var fullViewName = fun;
	    var parts = parseViewName(fullViewName);
	    var designDocName = parts[0];
	    var viewName = parts[1];
	    return db.get('_design/' + designDocName).then(function (doc) {
	      var fun = doc.views && doc.views[viewName];

	      if (!fun || typeof fun.map !== 'string') {
	        throw new NotFoundError('ddoc ' + designDocName + ' has no view named ' +
	          viewName);
	      }
	      checkQueryParseError(opts, fun);

	      var createViewOpts = {
	        db : db,
	        viewName : fullViewName,
	        map : fun.map,
	        reduce : fun.reduce
	      };
	      return createView(createViewOpts).then(function (view) {
	        if (opts.stale === 'ok' || opts.stale === 'update_after') {
	          if (opts.stale === 'update_after') {
	            process.nextTick(function () {
	              updateView(view);
	            });
	          }
	          return queryView(view, opts);
	        } else { // stale not ok
	          return updateView(view).then(function () {
	            return queryView(view, opts);
	          });
	        }
	      });
	    });
	  }
	}

	exports.query = function (fun, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  opts = utils.extend(true, {}, opts);

	  if (typeof fun === 'function') {
	    fun = {map : fun};
	  }

	  var db = this;
	  var promise = Promise.resolve().then(function () {
	    return queryPromised(db, fun, opts);
	  });
	  utils.promisedCallback(promise, callback);
	  return promise;
	};

	function QueryParseError(message) {
	  this.status = 400;
	  this.name = 'query_parse_error';
	  this.message = message;
	  this.error = true;
	  try {
	    Error.captureStackTrace(this, QueryParseError);
	  } catch (e) {}
	}

	utils.inherits(QueryParseError, Error);

	function NotFoundError(message) {
	  this.status = 404;
	  this.name = 'not_found';
	  this.message = message;
	  this.error = true;
	  try {
	    Error.captureStackTrace(this, NotFoundError);
	  } catch (e) {}
	}

	utils.inherits(NotFoundError, Error);

	function BuiltInError(message) {
	  this.status = 500;
	  this.name = 'invalid_value';
	  this.message = message;
	  this.error = true;
	  try {
	    Error.captureStackTrace(this, BuiltInError);
	  } catch (e) {}
	}

	utils.inherits(BuiltInError, Error);
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {/*globals cordova */
	"use strict";

	var Adapter = __webpack_require__(56);
	var utils = __webpack_require__(4);
	var TaskQueue = __webpack_require__(57);
	var Promise = utils.Promise;

	function defaultCallback(err) {
	  if (err && global.debug) {
	    console.error(err);
	  }
	}

	utils.inherits(PouchDB, Adapter);
	function PouchDB(name, opts, callback) {

	  if (!(this instanceof PouchDB)) {
	    return new PouchDB(name, opts, callback);
	  }
	  var self = this;
	  if (typeof opts === 'function' || typeof opts === 'undefined') {
	    callback = opts;
	    opts = {};
	  }

	  if (name && typeof name === 'object') {
	    opts = name;
	    name = undefined;
	  }
	  if (typeof callback === 'undefined') {
	    callback = defaultCallback;
	  }
	  opts = opts || {};
	  this.__opts = opts;
	  var oldCB = callback;
	  self.auto_compaction = opts.auto_compaction;
	  self.prefix = PouchDB.prefix;
	  Adapter.call(self);
	  self.taskqueue = new TaskQueue();
	  var promise = new Promise(function (fulfill, reject) {
	    callback = function (err, resp) {
	      if (err) {
	        return reject(err);
	      }
	      delete resp.then;
	      fulfill(resp);
	    };
	  
	    opts = utils.clone(opts);
	    var originalName = opts.name || name;
	    var backend, error;
	    (function () {
	      try {

	        if (typeof originalName !== 'string') {
	          error = new Error('Missing/invalid DB name');
	          error.code = 400;
	          throw error;
	        }

	        backend = PouchDB.parseAdapter(originalName, opts);
	        
	        opts.originalName = originalName;
	        opts.name = backend.name;
	        if (opts.prefix && backend.adapter !== 'http' &&
	            backend.adapter !== 'https') {
	          opts.name = opts.prefix + opts.name;
	        }
	        opts.adapter = opts.adapter || backend.adapter;
	        self._adapter = opts.adapter;
	        self._db_name = originalName;
	        if (!PouchDB.adapters[opts.adapter]) {
	          error = new Error('Adapter is missing');
	          error.code = 404;
	          throw error;
	        }

	        if (!PouchDB.adapters[opts.adapter].valid()) {
	          error = new Error('Invalid Adapter');
	          error.code = 404;
	          throw error;
	        }
	      } catch (err) {
	        self.taskqueue.fail(err);
	        self.changes = utils.toPromise(function (opts) {
	          if (opts.complete) {
	            opts.complete(err);
	          }
	        });
	      }
	    }());
	    if (error) {
	      return reject(error); // constructor error, see above
	    }
	    self.adapter = opts.adapter;

	    // needs access to PouchDB;
	    self.replicate = {};

	    self.replicate.from = function (url, opts, callback) {
	      return self.constructor.replicate(url, self, opts, callback);
	    };

	    self.replicate.to = function (url, opts, callback) {
	      return self.constructor.replicate(self, url, opts, callback);
	    };

	    self.sync = function (dbName, opts, callback) {
	      return self.constructor.sync(self, dbName, opts, callback);
	    };

	    self.replicate.sync = self.sync;

	    self.destroy = utils.adapterFun('destroy', function (callback) {
	      var self = this;
	      var opts = this.__opts || {};
	      self.info(function (err, info) {
	        if (err) {
	          return callback(err);
	        }
	        opts.internal = true;
	        self.constructor.destroy(info.db_name, opts, callback);
	      });
	    });

	    PouchDB.adapters[opts.adapter].call(self, opts, function (err) {
	      if (err) {
	        if (callback) {
	          self.taskqueue.fail(err);
	          callback(err);
	        }
	        return;
	      }
	      function destructionListener(event) {
	        if (event === 'destroyed') {
	          self.emit('destroyed');
	          PouchDB.removeListener(originalName, destructionListener);
	        }
	      }
	      PouchDB.on(originalName, destructionListener);
	      self.emit('created', self);
	      PouchDB.emit('created', opts.originalName);
	      self.taskqueue.ready(self);
	      callback(null, self);
	    });

	    if (opts.skipSetup) {
	      self.taskqueue.ready(self);
	      process.nextTick(function () {
	        callback(null, self);
	      });
	    }

	    if (utils.isCordova()) {
	      //to inform websql adapter that we can use api
	      cordova.fireWindowEvent(opts.name + "_pouch", {});
	    }
	  });
	  promise.then(function (resp) {
	    oldCB(null, resp);
	  }, oldCB);
	  self.then = promise.then.bind(promise);
	  self.catch = promise.catch.bind(promise);
	}

	PouchDB.debug = __webpack_require__(52);

	module.exports = PouchDB;
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(13)))

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var createBlob = __webpack_require__(20);
	var utils = __webpack_require__(4);

	module.exports = function(options, callback) {

	  var xhr, timer, hasUpload;

	  var abortReq = function () {
	    xhr.abort();
	  };

	  if (options.xhr) {
	    xhr = new options.xhr();
	  } else {
	    xhr = new XMLHttpRequest();
	  }

	  // cache-buster, specifically designed to work around IE's aggressive caching
	  // see http://www.dashbay.com/2011/05/internet-explorer-caches-ajax/
	  if (options.method === 'GET' && !options.cache) {
	    var hasArgs = options.url.indexOf('?') !== -1;
	    options.url += (hasArgs ? '&' : '?') + '_nonce=' + Date.now();
	  }

	  xhr.open(options.method, options.url);
	  xhr.withCredentials = true;

	  if (options.json) {
	    options.headers.Accept = 'application/json';
	    options.headers['Content-Type'] = options.headers['Content-Type'] ||
	      'application/json';
	    if (options.body &&
	        options.processData &&
	        typeof options.body !== "string") {
	      options.body = JSON.stringify(options.body);
	    }
	  }

	  if (options.binary) {
	    xhr.responseType = 'arraybuffer';
	  }

	  if (!('body' in options)) {
	    options.body = null;
	  }

	  for (var key in options.headers) {
	    if (options.headers.hasOwnProperty(key)) {
	      xhr.setRequestHeader(key, options.headers[key]);
	    }
	  }

	  if (options.timeout > 0) {
	    timer = setTimeout(abortReq, options.timeout);
	    xhr.onprogress = function () {
	      clearTimeout(timer);
	      timer = setTimeout(abortReq, options.timeout);
	    };
	    if (typeof hasUpload === 'undefined') {
	      // IE throws an error if you try to access it directly
	      hasUpload = Object.keys(xhr).indexOf('upload') !== -1;
	    }
	    if (hasUpload) { // does not exist in ie9
	      xhr.upload.onprogress = xhr.onprogress;
	    }
	  }

	  xhr.onreadystatechange = function () {
	    if (xhr.readyState !== 4) {
	      return;
	    }

	    var response = {
	      statusCode: xhr.status
	    };

	    if (xhr.status >= 200 && xhr.status < 300) {
	      var data;
	      if (options.binary) {
	        data = createBlob([xhr.response || ''], {
	          type: xhr.getResponseHeader('Content-Type')
	        });
	      } else {
	        data = xhr.responseText;
	      }
	      callback(null, response, data);
	    } else {
	      var err = {};
	      try {
	        err = JSON.parse(xhr.response);
	      } catch(e) {}
	      callback(err, response);
	    }
	  };

	  if (options.body && (options.body instanceof Blob)) {
	    utils.readAsBinaryString(options.body, function (binary) {
	      xhr.send(utils.fixBinary(binary));
	    });
	  } else {
	    xhr.send(options.body);
	  }

	  return {abort: abortReq};
	};


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var extend = __webpack_require__(39);


	// for a better overview of what this is doing, read:
	// https://github.com/apache/couchdb/blob/master/src/couchdb/couch_key_tree.erl
	//
	// But for a quick intro, CouchDB uses a revision tree to store a documents
	// history, A -> B -> C, when a document has conflicts, that is a branch in the
	// tree, A -> (B1 | B2 -> C), We store these as a nested array in the format
	//
	// KeyTree = [Path ... ]
	// Path = {pos: position_from_root, ids: Tree}
	// Tree = [Key, Opts, [Tree, ...]], in particular single node: [Key, []]

	// classic binary search
	function binarySearch(arr, item, comparator) {
	  var low = 0;
	  var high = arr.length;
	  var mid;
	  while (low < high) {
	    mid = (low + high) >>> 1;
	    if (comparator(arr[mid], item) < 0) {
	      low = mid + 1;
	    } else {
	      high = mid;
	    }
	  }
	  return low;
	}

	// assuming the arr is sorted, insert the item in the proper place
	function insertSorted(arr, item, comparator) {
	  var idx = binarySearch(arr, item, comparator);
	  arr.splice(idx, 0, item);
	}

	// Turn a path as a flat array into a tree with a single branch
	function pathToTree(path) {
	  var doc = path.shift();
	  var root = [doc.id, doc.opts, []];
	  var leaf = root;
	  var nleaf;

	  while (path.length) {
	    doc = path.shift();
	    nleaf = [doc.id, doc.opts, []];
	    leaf[2].push(nleaf);
	    leaf = nleaf;
	  }
	  return root;
	}

	// compare the IDs of two trees
	function compareTree(a, b) {
	  return a[0] < b[0] ? -1 : 1;
	}

	// Merge two trees together
	// The roots of tree1 and tree2 must be the same revision
	function mergeTree(in_tree1, in_tree2) {
	  var queue = [{tree1: in_tree1, tree2: in_tree2}];
	  var conflicts = false;
	  while (queue.length > 0) {
	    var item = queue.pop();
	    var tree1 = item.tree1;
	    var tree2 = item.tree2;

	    if (tree1[1].status || tree2[1].status) {
	      tree1[1].status =
	        (tree1[1].status ===  'available' ||
	         tree2[1].status === 'available') ? 'available' : 'missing';
	    }

	    for (var i = 0; i < tree2[2].length; i++) {
	      if (!tree1[2][0]) {
	        conflicts = 'new_leaf';
	        tree1[2][0] = tree2[2][i];
	        continue;
	      }

	      var merged = false;
	      for (var j = 0; j < tree1[2].length; j++) {
	        if (tree1[2][j][0] === tree2[2][i][0]) {
	          queue.push({tree1: tree1[2][j], tree2: tree2[2][i]});
	          merged = true;
	        }
	      }
	      if (!merged) {
	        conflicts = 'new_branch';
	        insertSorted(tree1[2], tree2[2][i], compareTree);
	      }
	    }
	  }
	  return {conflicts: conflicts, tree: in_tree1};
	}

	function doMerge(tree, path, dontExpand) {
	  var restree = [];
	  var conflicts = false;
	  var merged = false;
	  var res;

	  if (!tree.length) {
	    return {tree: [path], conflicts: 'new_leaf'};
	  }

	  tree.forEach(function (branch) {
	    if (branch.pos === path.pos && branch.ids[0] === path.ids[0]) {
	      // Paths start at the same position and have the same root, so they need
	      // merged
	      res = mergeTree(branch.ids, path.ids);
	      restree.push({pos: branch.pos, ids: res.tree});
	      conflicts = conflicts || res.conflicts;
	      merged = true;
	    } else if (dontExpand !== true) {
	      // The paths start at a different position, take the earliest path and
	      // traverse up until it as at the same point from root as the path we
	      // want to merge.  If the keys match we return the longer path with the
	      // other merged After stemming we dont want to expand the trees

	      var t1 = branch.pos < path.pos ? branch : path;
	      var t2 = branch.pos < path.pos ? path : branch;
	      var diff = t2.pos - t1.pos;

	      var candidateParents = [];

	      var trees = [];
	      trees.push({ids: t1.ids, diff: diff, parent: null, parentIdx: null});
	      while (trees.length > 0) {
	        var item = trees.pop();
	        if (item.diff === 0) {
	          if (item.ids[0] === t2.ids[0]) {
	            candidateParents.push(item);
	          }
	          continue;
	        }
	        if (!item.ids) {
	          continue;
	        }
	        /*jshint loopfunc:true */
	        item.ids[2].forEach(function (el, idx) {
	          trees.push(
	            {ids: el, diff: item.diff - 1, parent: item.ids, parentIdx: idx});
	        });
	      }

	      var el = candidateParents[0];

	      if (!el) {
	        restree.push(branch);
	      } else {
	        res = mergeTree(el.ids, t2.ids);
	        el.parent[2][el.parentIdx] = res.tree;
	        restree.push({pos: t1.pos, ids: t1.ids});
	        conflicts = conflicts || res.conflicts;
	        merged = true;
	      }
	    } else {
	      restree.push(branch);
	    }
	  });

	  // We didnt find
	  if (!merged) {
	    restree.push(path);
	  }

	  restree.sort(function (a, b) {
	    return a.pos - b.pos;
	  });

	  return {
	    tree: restree,
	    conflicts: conflicts || 'internal_node'
	  };
	}

	// To ensure we dont grow the revision tree infinitely, we stem old revisions
	function stem(tree, depth) {
	  // First we break out the tree into a complete list of root to leaf paths,
	  // we cut off the start of the path and generate a new set of flat trees
	  var stemmedPaths = PouchMerge.rootToLeaf(tree).map(function (path) {
	    var stemmed = path.ids.slice(-depth);
	    return {
	      pos: path.pos + (path.ids.length - stemmed.length),
	      ids: pathToTree(stemmed)
	    };
	  });
	  // Then we remerge all those flat trees together, ensuring that we dont
	  // connect trees that would go beyond the depth limit
	  return stemmedPaths.reduce(function (prev, current) {
	    return doMerge(prev, current, true).tree;
	  }, [stemmedPaths.shift()]);
	}

	var PouchMerge = {};

	PouchMerge.merge = function (tree, path, depth) {
	  // Ugh, nicer way to not modify arguments in place?
	  tree = extend(true, [], tree);
	  path = extend(true, {}, path);
	  var newTree = doMerge(tree, path);
	  return {
	    tree: stem(newTree.tree, depth),
	    conflicts: newTree.conflicts
	  };
	};

	// We fetch all leafs of the revision tree, and sort them based on tree length
	// and whether they were deleted, undeleted documents with the longest revision
	// tree (most edits) win
	// The final sort algorithm is slightly documented in a sidebar here:
	// http://guide.couchdb.org/draft/conflicts.html
	PouchMerge.winningRev = function (metadata) {
	  var leafs = [];
	  PouchMerge.traverseRevTree(metadata.rev_tree,
	                              function (isLeaf, pos, id, something, opts) {
	    if (isLeaf) {
	      leafs.push({pos: pos, id: id, deleted: !!opts.deleted});
	    }
	  });
	  leafs.sort(function (a, b) {
	    if (a.deleted !== b.deleted) {
	      return a.deleted > b.deleted ? 1 : -1;
	    }
	    if (a.pos !== b.pos) {
	      return b.pos - a.pos;
	    }
	    return a.id < b.id ? 1 : -1;
	  });

	  return leafs[0].pos + '-' + leafs[0].id;
	};

	// Pretty much all below can be combined into a higher order function to
	// traverse revisions
	// The return value from the callback will be passed as context to all
	// children of that node
	PouchMerge.traverseRevTree = function (revs, callback) {
	  var toVisit = revs.slice();

	  var node;
	  while ((node = toVisit.pop())) {
	    var pos = node.pos;
	    var tree = node.ids;
	    var branches = tree[2];
	    var newCtx =
	      callback(branches.length === 0, pos, tree[0], node.ctx, tree[1]);
	    for (var i = 0, len = branches.length; i < len; i++) {
	      toVisit.push({pos: pos + 1, ids: branches[i], ctx: newCtx});
	    }
	  }
	};

	PouchMerge.collectLeaves = function (revs) {
	  var leaves = [];
	  PouchMerge.traverseRevTree(revs, function (isLeaf, pos, id, acc, opts) {
	    if (isLeaf) {
	      leaves.push({rev: pos + "-" + id, pos: pos, opts: opts});
	    }
	  });
	  leaves.sort(function (a, b) {
	    return b.pos - a.pos;
	  });
	  leaves.forEach(function (leaf) { delete leaf.pos; });
	  return leaves;
	};

	// returns revs of all conflicts that is leaves such that
	// 1. are not deleted and
	// 2. are different than winning revision
	PouchMerge.collectConflicts = function (metadata) {
	  var win = PouchMerge.winningRev(metadata);
	  var leaves = PouchMerge.collectLeaves(metadata.rev_tree);
	  var conflicts = [];
	  leaves.forEach(function (leaf) {
	    if (leaf.rev !== win && !leaf.opts.deleted) {
	      conflicts.push(leaf.rev);
	    }
	  });
	  return conflicts;
	};

	PouchMerge.rootToLeaf = function (tree) {
	  var paths = [];
	  PouchMerge.traverseRevTree(tree, function (isLeaf, pos, id, history, opts) {
	    history = history ? history.slice(0) : [];
	    history.push({id: id, opts: opts});
	    if (isLeaf) {
	      var rootPos = pos + 1 - history.length;
	      paths.unshift({pos: rootPos, ids: history});
	    }
	    return history;
	  });
	  return paths;
	};


	module.exports = PouchMerge;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {"use strict";

	//Abstracts constructing a Blob object, so it also works in older
	//browsers that don't support the native Blob constructor. (i.e.
	//old QtWebKit versions, at least).
	function createBlob(parts, properties) {
	  parts = parts || [];
	  properties = properties || {};
	  try {
	    return new Blob(parts, properties);
	  } catch (e) {
	    if (e.name !== "TypeError") {
	      throw e;
	    }
	    var BlobBuilder = global.BlobBuilder ||
	                      global.MSBlobBuilder ||
	                      global.MozBlobBuilder ||
	                      global.WebKitBlobBuilder;
	    var builder = new BlobBuilder();
	    for (var i = 0; i < parts.length; i += 1) {
	      builder.append(parts[i]);
	    }
	    return builder.getBlob(properties.type);
	  }
	}

	module.exports = createBlob;

	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// BEGIN Math.uuid.js

	/*!
	Math.uuid.js (v1.4)
	http://www.broofa.com
	mailto:robert@broofa.com

	Copyright (c) 2010 Robert Kieffer
	Dual licensed under the MIT and GPL licenses.
	*/

	/*
	 * Generate a random uuid.
	 *
	 * USAGE: Math.uuid(length, radix)
	 *   length - the desired number of characters
	 *   radix  - the number of allowable values for each character.
	 *
	 * EXAMPLES:
	 *   // No arguments  - returns RFC4122, version 4 ID
	 *   >>> Math.uuid()
	 *   "92329D39-6F5C-4520-ABFC-AAB64544E172"
	 *
	 *   // One argument - returns ID of the specified length
	 *   >>> Math.uuid(15)     // 15 character ID (default base=62)
	 *   "VcydxgltxrVZSTV"
	 *
	 *   // Two arguments - returns ID of the specified length, and radix. 
	 *   // (Radix must be <= 62)
	 *   >>> Math.uuid(8, 2)  // 8 character ID (base=2)
	 *   "01001010"
	 *   >>> Math.uuid(8, 10) // 8 character ID (base=10)
	 *   "47473046"
	 *   >>> Math.uuid(8, 16) // 8 character ID (base=16)
	 *   "098F4D35"
	 */
	var chars = (
	  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
	  'abcdefghijklmnopqrstuvwxyz'
	).split('');
	function getValue(radix) {
	  return 0 | Math.random() * radix;
	}
	function uuid(len, radix) {
	  radix = radix || chars.length;
	  var out = '';
	  var i = -1;

	  if (len) {
	    // Compact form
	    while (++i < len) {
	      out += chars[getValue(radix)];
	    }
	    return out;
	  }
	    // rfc4122, version 4 form
	    // Fill in random data.  At i==19 set the high bits of clock sequence as
	    // per rfc4122, sec. 4.1.5
	  while (++i < 36) {
	    switch (i) {
	      case 8:
	      case 13:
	      case 18:
	      case 23:
	        out += '-';
	        break;
	      case 19:
	        out += chars[(getValue(16) & 0x3) | 0x8];
	        break;
	      default:
	        out += chars[getValue(16)];
	    }
	  }

	  return out;
	}



	module.exports = uuid;



/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var errors = __webpack_require__(5);
	var uuid = __webpack_require__(21);

	function toObject(array) {
	  return array.reduce(function (obj, item) {
	    obj[item] = true;
	    return obj;
	  }, {});
	}
	// List of top level reserved words for doc
	var reservedWords = toObject([
	  '_id',
	  '_rev',
	  '_attachments',
	  '_deleted',
	  '_revisions',
	  '_revs_info',
	  '_conflicts',
	  '_deleted_conflicts',
	  '_local_seq',
	  '_rev_tree',
	  //replication documents
	  '_replication_id',
	  '_replication_state',
	  '_replication_state_time',
	  '_replication_state_reason',
	  '_replication_stats',
	  // Specific to Couchbase Sync Gateway
	  '_removed'
	]);

	// List of reserved words that should end up the document
	var dataWords = toObject([
	  '_attachments',
	  //replication documents
	  '_replication_id',
	  '_replication_state',
	  '_replication_state_time',
	  '_replication_state_reason',
	  '_replication_stats'
	]);

	// Determine id an ID is valid
	//   - invalid IDs begin with an underescore that does not begin '_design' or
	//     '_local'
	//   - any other string value is a valid id
	// Returns the specific error object for each case
	exports.invalidIdError = function (id) {
	  var err;
	  if (!id) {
	    err = errors.error(errors.MISSING_ID);
	  } else if (typeof id !== 'string') {
	    err = errors.error(errors.INVALID_ID);
	  } else if (/^_/.test(id) && !(/^_(design|local)/).test(id)) {
	    err = errors.error(errors.RESERVED_ID);
	  }
	  if (err) {
	    throw err;
	  }
	};

	function parseRevisionInfo(rev) {
	  if (!/^\d+\-./.test(rev)) {
	    return errors.error(errors.INVALID_REV);
	  }
	  var idx = rev.indexOf('-');
	  var left = rev.substring(0, idx);
	  var right = rev.substring(idx + 1);
	  return {
	    prefix: parseInt(left, 10),
	    id: right
	  };
	}

	function makeRevTreeFromRevisions(revisions, opts) {
	  var pos = revisions.start - revisions.ids.length + 1;

	  var revisionIds = revisions.ids;
	  var ids = [revisionIds[0], opts, []];

	  for (var i = 1, len = revisionIds.length; i < len; i++) {
	    ids = [revisionIds[i], {status: 'missing'}, [ids]];
	  }

	  return [{
	    pos: pos,
	    ids: ids
	  }];
	}

	// Preprocess documents, parse their revisions, assign an id and a
	// revision for new writes that are missing them, etc
	exports.parseDoc = function (doc, newEdits) {

	  var nRevNum;
	  var newRevId;
	  var revInfo;
	  var opts = {status: 'available'};
	  if (doc._deleted) {
	    opts.deleted = true;
	  }

	  if (newEdits) {
	    if (!doc._id) {
	      doc._id = uuid();
	    }
	    newRevId = uuid(32, 16).toLowerCase();
	    if (doc._rev) {
	      revInfo = parseRevisionInfo(doc._rev);
	      if (revInfo.error) {
	        return revInfo;
	      }
	      doc._rev_tree = [{
	        pos: revInfo.prefix,
	        ids: [revInfo.id, {status: 'missing'}, [[newRevId, opts, []]]]
	      }];
	      nRevNum = revInfo.prefix + 1;
	    } else {
	      doc._rev_tree = [{
	        pos: 1,
	        ids : [newRevId, opts, []]
	      }];
	      nRevNum = 1;
	    }
	  } else {
	    if (doc._revisions) {
	      doc._rev_tree = makeRevTreeFromRevisions(doc._revisions, opts);
	      nRevNum = doc._revisions.start;
	      newRevId = doc._revisions.ids[0];
	    }
	    if (!doc._rev_tree) {
	      revInfo = parseRevisionInfo(doc._rev);
	      if (revInfo.error) {
	        return revInfo;
	      }
	      nRevNum = revInfo.prefix;
	      newRevId = revInfo.id;
	      doc._rev_tree = [{
	        pos: nRevNum,
	        ids: [newRevId, opts, []]
	      }];
	    }
	  }

	  exports.invalidIdError(doc._id);

	  doc._rev = nRevNum + '-' + newRevId;

	  var result = {metadata : {}, data : {}};
	  for (var key in doc) {
	    if (doc.hasOwnProperty(key)) {
	      var specialKey = key[0] === '_';
	      if (specialKey && !reservedWords[key]) {
	        var error = errors.error(errors.DOC_VALIDATION, key);
	        error.message = errors.DOC_VALIDATION.message + ': ' + key;
	        throw error;
	      } else if (specialKey && !dataWords[key]) {
	        result.metadata[key.slice(1)] = doc[key];
	      } else {
	        result.data[key] = doc[key];
	      }
	    }
	  }
	  return result;
	};

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {'use strict';

	var crypto = __webpack_require__(43);
	var Md5 = __webpack_require__(67);
	var setImmediateShim = global.setImmediate || global.setTimeout;
	var MD5_CHUNK_SIZE = 32768;

	function sliceShim(arrayBuffer, begin, end) {
	  if (typeof arrayBuffer.slice === 'function') {
	    if (!begin && !end) {
	      return arrayBuffer.slice();
	    } else if (!end) {
	      return arrayBuffer.slice(begin);
	    } else {
	      return arrayBuffer.slice(begin, end);
	    }
	  }
	  //
	  // shim for IE courtesy of http://stackoverflow.com/a/21440217
	  //

	  //If `begin`/`end` is unspecified, Chrome assumes 0, so we do the same
	  //Chrome also converts the values to integers via flooring
	  begin = Math.floor(begin || 0);
	  end = Math.floor(end || 0);

	  var len = arrayBuffer.byteLength;

	  //If either `begin` or `end` is negative, it refers to an
	  //index from the end of the array, as opposed to from the beginning.
	  //The range specified by the `begin` and `end` values is clamped to the
	  //valid index range for the current array.
	  begin = begin < 0 ? Math.max(begin + len, 0) : Math.min(len, begin);
	  end = end < 0 ? Math.max(end + len, 0) : Math.min(len, end);

	  //If the computed length of the new ArrayBuffer would be negative, it
	  //is clamped to zero.
	  if (end - begin <= 0) {
	    return new ArrayBuffer(0);
	  }

	  var result = new ArrayBuffer(end - begin);
	  var resultBytes = new Uint8Array(result);
	  var sourceBytes = new Uint8Array(arrayBuffer, begin, end - begin);

	  resultBytes.set(sourceBytes);

	  return result;
	}

	// convert a 64-bit int to a binary string
	function intToString(int) {
	  var bytes = [
	    (int & 0xff),
	    ((int >>> 8) & 0xff),
	    ((int >>> 16) & 0xff),
	    ((int >>> 24) & 0xff)
	  ];
	  return bytes.map(function (byte) {
	    return String.fromCharCode(byte);
	  }).join('');
	}

	// convert an array of 64-bit ints into
	// a base64-encoded string
	function rawToBase64(raw) {
	  var res = '';
	  for (var i = 0; i < raw.length; i++) {
	    res += intToString(raw[i]);
	  }
	  return btoa(res);
	}

	module.exports = function (data, callback) {
	  if (!process.browser) {
	    var base64 = crypto.createHash('md5').update(data).digest('base64');
	    callback(null, base64);
	    return;
	  }
	  var inputIsString = typeof data === 'string';
	  var len = inputIsString ? data.length : data.byteLength;
	  var chunkSize = Math.min(MD5_CHUNK_SIZE, len);
	  var chunks = Math.ceil(len / chunkSize);
	  var currentChunk = 0;
	  var buffer = inputIsString ? new Md5() : new Md5.ArrayBuffer();

	  function append(buffer, data, start, end) {
	    if (inputIsString) {
	      buffer.appendBinary(data.substring(start, end));
	    } else {
	      buffer.append(sliceShim(data, start, end));
	    }
	  }

	  function loadNextChunk() {
	    var start = currentChunk * chunkSize;
	    var end = start + chunkSize;
	    currentChunk++;
	    if (currentChunk < chunks) {
	      append(buffer, data, start, end);
	      setImmediateShim(loadNextChunk);
	    } else {
	      append(buffer, data, start, end);
	      var raw = buffer.end(true);
	      var base64 = rawToBase64(raw);
	      callback(null, base64);
	      buffer.destroy();
	    }
	  }
	  loadNextChunk();
	};
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(13)))

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// originally parseUri 1.2.2, now patched by us
	// (c) Steven Levithan <stevenlevithan.com>
	// MIT License
	var options = {
	  strictMode: false,
	  key: ["source", "protocol", "authority", "userInfo", "user", "password",
	    "host", "port", "relative", "path", "directory", "file", "query",
	    "anchor"],
	  q:   {
	    name:   "queryKey",
	    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	  },
	  parser: {
	    /* jshint maxlen: false */
	    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
	    loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	  }
	};
	function parseUri(str) {
	  var o = options;
	  var m = o.parser[o.strictMode ? "strict" : "loose"].exec(str);
	  var uri = {};
	  var i = 14;

	  while (i--) {
	    var key = o.key[i];
	    var value = m[i] || "";
	    var encoded = ['user', 'password'].indexOf(key) !== -1;
	    uri[key] = encoded ? decodeURIComponent(value) : value;
	  }

	  uri[o.q.name] = {};
	  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
	    if ($1) {
	      uri[o.q.name][$1] = $2;
	    }
	  });

	  return uri;
	}


	module.exports = parseUri;

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(4);
	var pouchCollate = __webpack_require__(61);
	var collate = pouchCollate.collate;

	function updateCheckpoint(db, id, checkpoint, returnValue) {
	  return db.get(id).catch(function (err) {
	    if (err.status === 404) {
	      if (db.type() === 'http') {
	        utils.explain404(
	          'PouchDB is just checking if a remote checkpoint exists.');
	      }
	      return {_id: id};
	    }
	    throw err;
	  }).then(function (doc) {
	    if (returnValue.cancelled) {
	      return;
	    }
	    doc.last_seq = checkpoint;
	    return db.put(doc);
	  });
	}

	function Checkpointer(src, target, id, returnValue) {
	  this.src = src;
	  this.target = target;
	  this.id = id;
	  this.returnValue = returnValue;
	}

	Checkpointer.prototype.writeCheckpoint = function (checkpoint) {
	  var self = this;
	  return this.updateTarget(checkpoint).then(function () {
	    return self.updateSource(checkpoint);
	  });
	};

	Checkpointer.prototype.updateTarget = function (checkpoint) {
	  return updateCheckpoint(this.target, this.id, checkpoint, this.returnValue);
	};

	Checkpointer.prototype.updateSource = function (checkpoint) {
	  var self = this;
	  if (this.readOnlySource) {
	    return utils.Promise.resolve(true);
	  }
	  return updateCheckpoint(this.src, this.id, checkpoint, this.returnValue)
	    .catch(function (err) {
	      var isForbidden = typeof err.status === 'number' &&
	        Math.floor(err.status / 100) === 4;
	      if (isForbidden) {
	        self.readOnlySource = true;
	        return true;
	      }
	      throw err;
	    });
	};

	Checkpointer.prototype.getCheckpoint = function () {
	  var self = this;
	  return self.target.get(self.id).then(function (targetDoc) {
	    return self.src.get(self.id).then(function (sourceDoc) {
	      if (collate(targetDoc.last_seq, sourceDoc.last_seq) === 0) {
	        return sourceDoc.last_seq;
	      }
	      return 0;
	    }, function (err) {
	      if (err.status === 404 && targetDoc.last_seq) {
	        return self.src.put({
	          _id: self.id,
	          last_seq: 0
	        }).then(function () {
	          return 0;
	        }, function (err) {
	          if (err.status === 401) {
	            self.readOnlySource = true;
	            return targetDoc.last_seq;
	          }
	          return 0;
	        });
	      }
	      throw err;
	    });
	  }).catch(function (err) {
	    if (err.status !== 404) {
	      throw err;
	    }
	    return 0;
	  });
	};

	module.exports = Checkpointer;


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = ['idb', 'websql'];

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	// hey guess what, we don't need this in the browser
	module.exports = {};

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	var errors = __webpack_require__(5);
	var utils = __webpack_require__(4);
	var constants = __webpack_require__(29);

	function tryCode(fun, that, args) {
	  try {
	    fun.apply(that, args);
	  } catch (err) { // shouldn't happen
	    if (typeof PouchDB !== 'undefined') {
	      PouchDB.emit('error', err);
	    }
	  }
	}

	exports.taskQueue = {
	  running: false,
	  queue: []
	};

	exports.applyNext = function () {
	  if (exports.taskQueue.running || !exports.taskQueue.queue.length) {
	    return;
	  }
	  exports.taskQueue.running = true;
	  var item = exports.taskQueue.queue.shift();
	  item.action(function (err, res) {
	    tryCode(item.callback, this, [err, res]);
	    exports.taskQueue.running = false;
	    process.nextTick(exports.applyNext);
	  });
	};

	exports.idbError = function (callback) {
	  return function (event) {
	    var message = (event.target && event.target.error &&
	      event.target.error.name) || event.target;
	    callback(errors.error(errors.IDB_ERROR, message, event.type));
	  };
	};

	// Unfortunately, the metadata has to be stringified
	// when it is put into the database, because otherwise
	// IndexedDB can throw errors for deeply-nested objects.
	// Originally we just used JSON.parse/JSON.stringify; now
	// we use this custom vuvuzela library that avoids recursion.
	// If we could do it all over again, we'd probably use a
	// format for the revision trees other than JSON.
	exports.encodeMetadata = function (metadata, winningRev, deleted) {
	  return {
	    data: utils.safeJsonStringify(metadata),
	    winningRev: winningRev,
	    deletedOrLocal: deleted ? '1' : '0',
	    seq: metadata.seq, // highest seq for this doc
	    id: metadata.id
	  };
	};

	exports.decodeMetadata = function (storedObject) {
	  if (!storedObject) {
	    return null;
	  }
	  var metadata = utils.safeJsonParse(storedObject.data);
	  metadata.winningRev = storedObject.winningRev;
	  metadata.deletedOrLocal = storedObject.deletedOrLocal === '1';
	  metadata.seq = storedObject.seq;
	  return metadata;
	};

	// read the doc back out from the database. we don't store the
	// _id or _rev because we already have _doc_id_rev.
	exports.decodeDoc = function (doc) {
	  if (!doc) {
	    return doc;
	  }
	  var idx = utils.lastIndexOf(doc._doc_id_rev, ':');
	  doc._id = doc._doc_id_rev.substring(0, idx - 1);
	  doc._rev = doc._doc_id_rev.substring(idx + 1);
	  delete doc._doc_id_rev;
	  return doc;
	};

	// Read a blob from the database, encoding as necessary
	// and translating from base64 if the IDB doesn't support
	// native Blobs
	exports.readBlobData = function (body, type, encode, callback) {
	  if (encode) {
	    if (!body) {
	      callback('');
	    } else if (typeof body !== 'string') { // we have blob support
	      utils.readAsBinaryString(body, function (binary) {
	        callback(utils.btoa(binary));
	      });
	    } else { // no blob support
	      callback(body);
	    }
	  } else {
	    if (!body) {
	      callback(utils.createBlob([''], {type: type}));
	    } else if (typeof body !== 'string') { // we have blob support
	      callback(body);
	    } else { // no blob support
	      body = utils.fixBinary(atob(body));
	      callback(utils.createBlob([body], {type: type}));
	    }
	  }
	};

	exports.fetchAttachmentsIfNecessary = function (doc, opts, txn, cb) {
	  var attachments = Object.keys(doc._attachments || {});
	  if (!attachments.length) {
	    return cb && cb();
	  }
	  var numDone = 0;

	  function checkDone() {
	    if (++numDone === attachments.length && cb) {
	      cb();
	    }
	  }

	  function fetchAttachment(doc, att) {
	    var attObj = doc._attachments[att];
	    var digest = attObj.digest;
	    var req = txn.objectStore(constants.ATTACH_STORE).get(digest);
	    req.onsuccess = function (e) {
	      attObj.body = e.target.result.body;
	      checkDone();
	    };
	  }

	  attachments.forEach(function (att) {
	    if (opts.attachments && opts.include_docs) {
	      fetchAttachment(doc, att);
	    } else {
	      doc._attachments[att].stub = true;
	      checkDone();
	    }
	  });
	};

	// IDB-specific postprocessing necessary because
	// we don't know whether we stored a true Blob or
	// a base64-encoded string, and if it's a Blob it
	// needs to be read outside of the transaction context
	exports.postProcessAttachments = function (results) {
	  return utils.Promise.all(results.map(function (row) {
	    if (row.doc && row.doc._attachments) {
	      var attNames = Object.keys(row.doc._attachments);
	      return utils.Promise.all(attNames.map(function (att) {
	        var attObj = row.doc._attachments[att];
	        if (!('body' in attObj)) { // already processed
	          return;
	        }
	        var body = attObj.body;
	        var type = attObj.content_type;
	        return new utils.Promise(function (resolve) {
	          exports.readBlobData(body, type, true, function (base64) {
	            row.doc._attachments[att] = utils.extend(
	              utils.pick(attObj, ['digest', 'content_type']),
	              {data: base64}
	            );
	            resolve();
	          });
	        });
	      }));
	    }
	  }));
	};

	exports.compactRevs = function (revs, docId, txn) {

	  var possiblyOrphanedDigests = [];
	  var seqStore = txn.objectStore(constants.BY_SEQ_STORE);
	  var attStore = txn.objectStore(constants.ATTACH_STORE);
	  var attAndSeqStore = txn.objectStore(constants.ATTACH_AND_SEQ_STORE);
	  var count = revs.length;

	  function checkDone() {
	    count--;
	    if (!count) { // done processing all revs
	      deleteOrphanedAttachments();
	    }
	  }

	  function deleteOrphanedAttachments() {
	    if (!possiblyOrphanedDigests.length) {
	      return;
	    }
	    possiblyOrphanedDigests.forEach(function (digest) {
	      var countReq = attAndSeqStore.index('digestSeq').count(
	        IDBKeyRange.bound(
	          digest + '::', digest + '::\uffff', false, false));
	      countReq.onsuccess = function (e) {
	        var count = e.target.result;
	        if (!count) {
	          // orphaned
	          attStore.delete(digest);
	        }
	      };
	    });
	  }

	  revs.forEach(function (rev) {
	    var index = seqStore.index('_doc_id_rev');
	    var key = docId + "::" + rev;
	    index.getKey(key).onsuccess = function (e) {
	      var seq = e.target.result;
	      if (typeof seq !== 'number') {
	        return checkDone();
	      }
	      seqStore.delete(seq);

	      var cursor = attAndSeqStore.index('seq')
	        .openCursor(IDBKeyRange.only(seq));

	      cursor.onsuccess = function (event) {
	        var cursor = event.target.result;
	        if (cursor) {
	          var digest = cursor.value.digestSeq.split('::')[0];
	          possiblyOrphanedDigests.push(digest);
	          attAndSeqStore.delete(cursor.primaryKey);
	          cursor.continue();
	        } else { // done
	          checkDone();
	        }
	      };
	    };
	  });
	};

	exports.openTransactionSafely = function (idb, stores, mode) {
	  try {
	    return {
	      txn: idb.transaction(stores, mode)
	    };
	  } catch (err) {
	    return {
	      error: err
	    };
	  }
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// IndexedDB requires a versioned database structure, so we use the
	// version here to manage migrations.
	exports.ADAPTER_VERSION = 5;

	// The object stores created for each database
	// DOC_STORE stores the document meta data, its revision history and state
	// Keyed by document id
	exports. DOC_STORE = 'document-store';
	// BY_SEQ_STORE stores a particular version of a document, keyed by its
	// sequence id
	exports.BY_SEQ_STORE = 'by-sequence';
	// Where we store attachments
	exports.ATTACH_STORE = 'attach-store';
	// Where we store many-to-many relations
	// between attachment digests and seqs
	exports.ATTACH_AND_SEQ_STORE = 'attach-seq-store';

	// Where we store database-wide meta data in a single record
	// keyed by id: META_STORE
	exports.META_STORE = 'meta-store';
	// Where we store local documents
	exports.LOCAL_STORE = 'local-store';
	// Where we detect blob support
	exports.DETECT_BLOB_SUPPORT_STORE = 'detect-blob-support';

/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(4);
	var errors = __webpack_require__(5);
	var idbUtils = __webpack_require__(28);
	var idbConstants = __webpack_require__(29);

	var ATTACH_AND_SEQ_STORE = idbConstants.ATTACH_AND_SEQ_STORE;
	var ATTACH_STORE = idbConstants.ATTACH_STORE;
	var BY_SEQ_STORE = idbConstants.BY_SEQ_STORE;
	var DOC_STORE = idbConstants.DOC_STORE;
	var LOCAL_STORE = idbConstants.LOCAL_STORE;
	var META_STORE = idbConstants.META_STORE;

	var compactRevs = idbUtils.compactRevs;
	var decodeMetadata = idbUtils.decodeMetadata;
	var encodeMetadata = idbUtils.encodeMetadata;
	var idbError = idbUtils.idbError;
	var openTransactionSafely = idbUtils.openTransactionSafely;

	function idbBulkDocs(req, opts, api, idb, Changes, callback) {
	  var docInfos = req.docs;
	  var txn;
	  var docStore;
	  var bySeqStore;
	  var attachStore;
	  var attachAndSeqStore;
	  var docInfoError;

	  for (var i = 0, len = docInfos.length; i < len; i++) {
	    var doc = docInfos[i];
	    if (doc._id && utils.isLocalId(doc._id)) {
	      continue;
	    }
	    doc = docInfos[i] = utils.parseDoc(doc, opts.new_edits);
	    if (doc.error && !docInfoError) {
	      docInfoError = doc;
	    }
	  }

	  if (docInfoError) {
	    return callback(docInfoError);
	  }

	  var results = new Array(docInfos.length);
	  var fetchedDocs = new utils.Map();
	  var preconditionErrored = false;
	  var blobType = api._blobSupport ? 'blob' : 'base64';

	  utils.preprocessAttachments(docInfos, blobType, function (err) {
	    if (err) {
	      return callback(err);
	    }
	    startTransaction();
	  });

	  function startTransaction() {

	    var stores = [
	      DOC_STORE, BY_SEQ_STORE,
	      ATTACH_STORE, META_STORE,
	      LOCAL_STORE, ATTACH_AND_SEQ_STORE
	    ];
	    var txnResult = openTransactionSafely(idb, stores, 'readwrite');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    txn = txnResult.txn;
	    txn.onerror = idbError(callback);
	    txn.ontimeout = idbError(callback);
	    txn.oncomplete = complete;
	    docStore = txn.objectStore(DOC_STORE);
	    bySeqStore = txn.objectStore(BY_SEQ_STORE);
	    attachStore = txn.objectStore(ATTACH_STORE);
	    attachAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);

	    verifyAttachments(function (err) {
	      if (err) {
	        preconditionErrored = true;
	        return callback(err);
	      }
	      fetchExistingDocs();
	    });
	  }

	  function processDocs() {

	    utils.processDocs(docInfos, api, fetchedDocs, txn, results,
	      writeDoc, opts);
	  }

	  function fetchExistingDocs() {

	    if (!docInfos.length) {
	      return;
	    }

	    var numFetched = 0;

	    function checkDone() {
	      if (++numFetched === docInfos.length) {
	        processDocs();
	      }
	    }

	    function readMetadata(event) {
	      var metadata = decodeMetadata(event.target.result);

	      if (metadata) {
	        fetchedDocs.set(metadata.id, metadata);
	      }
	      checkDone();
	    }

	    for (var i = 0, len = docInfos.length; i < len; i++) {
	      var docInfo = docInfos[i];
	      if (docInfo._id && utils.isLocalId(docInfo._id)) {
	        checkDone(); // skip local docs
	        continue;
	      }
	      var req = docStore.get(docInfo.metadata.id);
	      req.onsuccess = readMetadata;
	    }
	  }

	  function complete() {
	    if (preconditionErrored) {
	      return;
	    }

	    Changes.notify(api._name);
	    api._docCount = -1; // invalidate
	    callback(null, results);
	  }

	  function verifyAttachment(digest, callback) {

	    var req = attachStore.get(digest);
	    req.onsuccess = function (e) {
	      if (!e.target.result) {
	        var err = errors.error(errors.MISSING_STUB,
	          'unknown stub attachment with digest ' +
	          digest);
	        err.status = 412;
	        callback(err);
	      } else {
	        callback();
	      }
	    };
	  }

	  function verifyAttachments(finish) {


	    var digests = [];
	    docInfos.forEach(function (docInfo) {
	      if (docInfo.data && docInfo.data._attachments) {
	        Object.keys(docInfo.data._attachments).forEach(function (filename) {
	          var att = docInfo.data._attachments[filename];
	          if (att.stub) {
	            digests.push(att.digest);
	          }
	        });
	      }
	    });
	    if (!digests.length) {
	      return finish();
	    }
	    var numDone = 0;
	    var err;

	    function checkDone() {
	      if (++numDone === digests.length) {
	        finish(err);
	      }
	    }
	    digests.forEach(function (digest) {
	      verifyAttachment(digest, function (attErr) {
	        if (attErr && !err) {
	          err = attErr;
	        }
	        checkDone();
	      });
	    });
	  }

	  function writeDoc(docInfo, winningRev, deleted, callback, isUpdate,
	                    delta, resultsIdx) {

	    var doc = docInfo.data;
	    doc._id = docInfo.metadata.id;
	    doc._rev = docInfo.metadata.rev;

	    if (deleted) {
	      doc._deleted = true;
	    }

	    var hasAttachments = doc._attachments &&
	      Object.keys(doc._attachments).length;
	    if (hasAttachments) {
	      return writeAttachments(docInfo, winningRev, deleted,
	        callback, isUpdate, resultsIdx);
	    }

	    finishDoc(docInfo, winningRev, deleted,
	      callback, isUpdate, resultsIdx);
	  }

	  function autoCompact(docInfo) {

	    var revsToDelete = utils.compactTree(docInfo.metadata);
	    compactRevs(revsToDelete, docInfo.metadata.id, txn);
	  }

	  function finishDoc(docInfo, winningRev, deleted, callback, isUpdate,
	                     resultsIdx) {

	    var doc = docInfo.data;
	    var metadata = docInfo.metadata;

	    doc._doc_id_rev = metadata.id + '::' + metadata.rev;
	    delete doc._id;
	    delete doc._rev;

	    function afterPutDoc(e) {
	      if (isUpdate && api.auto_compaction) {
	        autoCompact(docInfo);
	      }
	      metadata.seq = e.target.result;
	      // Current _rev is calculated from _rev_tree on read
	      delete metadata.rev;
	      var metadataToStore = encodeMetadata(metadata, winningRev, deleted);
	      var metaDataReq = docStore.put(metadataToStore);
	      metaDataReq.onsuccess = afterPutMetadata;
	    }

	    function afterPutDocError(e) {
	      // ConstraintError, need to update, not put (see #1638 for details)
	      e.preventDefault(); // avoid transaction abort
	      e.stopPropagation(); // avoid transaction onerror
	      var index = bySeqStore.index('_doc_id_rev');
	      var getKeyReq = index.getKey(doc._doc_id_rev);
	      getKeyReq.onsuccess = function (e) {
	        var putReq = bySeqStore.put(doc, e.target.result);
	        putReq.onsuccess = afterPutDoc;
	      };
	    }

	    function afterPutMetadata() {
	      results[resultsIdx] = {
	        ok: true,
	        id: metadata.id,
	        rev: winningRev
	      };
	      fetchedDocs.set(docInfo.metadata.id, docInfo.metadata);
	      insertAttachmentMappings(docInfo, metadata.seq, callback);
	    }

	    var putReq = bySeqStore.put(doc);

	    putReq.onsuccess = afterPutDoc;
	    putReq.onerror = afterPutDocError;
	  }

	  function writeAttachments(docInfo, winningRev, deleted, callback,
	                            isUpdate, resultsIdx) {


	    var doc = docInfo.data;

	    var numDone = 0;
	    var attachments = Object.keys(doc._attachments);

	    function collectResults() {
	      if (numDone === attachments.length) {
	        finishDoc(docInfo, winningRev, deleted, callback, isUpdate,
	          resultsIdx);
	      }
	    }

	    function attachmentSaved() {
	      numDone++;
	      collectResults();
	    }

	    attachments.forEach(function (key) {
	      var att = docInfo.data._attachments[key];
	      if (!att.stub) {
	        var data = att.data;
	        delete att.data;
	        var digest = att.digest;
	        saveAttachment(digest, data, attachmentSaved);
	      } else {
	        numDone++;
	        collectResults();
	      }
	    });
	  }

	  // map seqs to attachment digests, which
	  // we will need later during compaction
	  function insertAttachmentMappings(docInfo, seq, callback) {

	    var attsAdded = 0;
	    var attsToAdd = Object.keys(docInfo.data._attachments || {});

	    if (!attsToAdd.length) {
	      return callback();
	    }

	    function checkDone() {
	      if (++attsAdded === attsToAdd.length) {
	        callback();
	      }
	    }

	    function add(att) {
	      var digest = docInfo.data._attachments[att].digest;
	      var req = attachAndSeqStore.put({
	        seq: seq,
	        digestSeq: digest + '::' + seq
	      });

	      req.onsuccess = checkDone;
	      req.onerror = function (e) {
	        // this callback is for a constaint error, which we ignore
	        // because this docid/rev has already been associated with
	        // the digest (e.g. when new_edits == false)
	        e.preventDefault(); // avoid transaction abort
	        e.stopPropagation(); // avoid transaction onerror
	        checkDone();
	      };
	    }
	    for (var i = 0; i < attsToAdd.length; i++) {
	      add(attsToAdd[i]); // do in parallel
	    }
	  }

	  function saveAttachment(digest, data, callback) {


	    var getKeyReq = attachStore.count(digest);
	    getKeyReq.onsuccess = function(e) {
	      var count = e.target.result;
	      if (count) {
	        return callback(); // already exists
	      }
	      var newAtt = {
	        digest: digest,
	        body: data
	      };
	      var putReq = attachStore.put(newAtt);
	      putReq.onsuccess = callback;
	    };
	  }
	}

	module.exports = idbBulkDocs;

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(4);
	var idbConstants = __webpack_require__(29);
	var DETECT_BLOB_SUPPORT_STORE = idbConstants.DETECT_BLOB_SUPPORT_STORE;

	//
	// Detect blob support. Chrome didn't support it until version 38.
	// In version 37 they had a broken version where PNGs (and possibly
	// other binary types) aren't stored correctly, because when you fetch
	// them, the content type is always null.
	//
	// Furthermore, they have some outstanding bugs where blobs occasionally
	// are read by FileReader as null, or by ajax as 404s.
	//
	// Sadly we use the 404 bug to detect the FileReader bug, so if they
	// get fixed independently and released in different versions of Chrome,
	// then the bug could come back. So it's worthwhile to watch these issues:
	// 404 bug: https://code.google.com/p/chromium/issues/detail?id=447916
	// FileReader bug: https://code.google.com/p/chromium/issues/detail?id=447836
	//
	function checkBlobSupport(txn, idb) {
	  return new utils.Promise(function (resolve, reject) {
	    var blob = utils.createBlob([''], {type: 'image/png'});
	    txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob, 'key');
	    txn.oncomplete = function () {
	      // have to do it in a separate transaction, else the correct
	      // content type is always returned
	      var blobTxn = idb.transaction([DETECT_BLOB_SUPPORT_STORE],
	        'readwrite');
	      var getBlobReq = blobTxn.objectStore(
	        DETECT_BLOB_SUPPORT_STORE).get('key');
	      getBlobReq.onerror = reject;
	      getBlobReq.onsuccess = function (e) {

	        var storedBlob = e.target.result;
	        var url = URL.createObjectURL(storedBlob);

	        utils.ajax({
	          url: url,
	          cache: true,
	          binary: true
	        }, function (err, res) {
	          if (err && err.status === 405) {
	            // firefox won't let us do that. but firefox doesn't
	            // have the blob type bug that Chrome does, so that's ok
	            resolve(true);
	          } else {
	            resolve(!!(res && res.type === 'image/png'));
	            if (err && err.status === 404) {
	              utils.explain404('PouchDB is just detecting blob URL support.');
	            }
	          }
	          URL.revokeObjectURL(url);
	        });
	      };
	    };
	  }).catch(function () {
	    return false; // error, so assume unsupported
	  });
	}

	module.exports = checkBlobSupport;

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	//
	// Parsing hex strings. Yeah.
	//
	// So basically we need this because of a bug in WebSQL:
	// https://code.google.com/p/chromium/issues/detail?id=422690
	// https://bugs.webkit.org/show_bug.cgi?id=137637
	//
	// UTF-8 and UTF-16 are provided as separate functions
	// for meager performance improvements
	//

	function decodeUtf8(str) {
	  return decodeURIComponent(window.escape(str));
	}

	function hexToInt(charCode) {
	  // '0'-'9' is 48-57
	  // 'A'-'F' is 65-70
	  // SQLite will only give us uppercase hex
	  return charCode < 65 ? (charCode - 48) : (charCode - 55);
	}


	// Example:
	// pragma encoding=utf8;
	// select hex('A');
	// returns '41'
	function parseHexUtf8(str, start, end) {
	  var result = '';
	  while (start < end) {
	    result += String.fromCharCode(
	      (hexToInt(str.charCodeAt(start++)) << 4) |
	        hexToInt(str.charCodeAt(start++)));
	  }
	  return result;
	}

	// Example:
	// pragma encoding=utf16;
	// select hex('A');
	// returns '4100'
	// notice that the 00 comes after the 41 (i.e. it's swizzled)
	function parseHexUtf16(str, start, end) {
	  var result = '';
	  while (start < end) {
	    // UTF-16, so swizzle the bytes
	    result += String.fromCharCode(
	      (hexToInt(str.charCodeAt(start + 2)) << 12) |
	        (hexToInt(str.charCodeAt(start + 3)) << 8) |
	        (hexToInt(str.charCodeAt(start)) << 4) |
	        hexToInt(str.charCodeAt(start + 1)));
	    start += 4;
	  }
	  return result;
	}

	function parseHexString(str, encoding) {
	  if (encoding === 'UTF-8') {
	    return decodeUtf8(parseHexUtf8(str, 0, str.length));
	  } else {
	    return parseHexUtf16(str, 0, str.length);
	  }
	}

	module.exports = parseHexString;

/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function quote(str) {
	  return "'" + str + "'";
	}

	exports.ADAPTER_VERSION = 7; // used to manage migrations

	// The object stores created for each database
	// DOC_STORE stores the document meta data, its revision history and state
	exports.DOC_STORE = quote('document-store');
	// BY_SEQ_STORE stores a particular version of a document, keyed by its
	// sequence id
	exports.BY_SEQ_STORE = quote('by-sequence');
	// Where we store attachments
	exports.ATTACH_STORE = quote('attach-store');
	exports.LOCAL_STORE = quote('local-store');
	exports.META_STORE = quote('metadata-store');
	// where we store many-to-many relations between attachment
	// digests and seqs
	exports.ATTACH_AND_SEQ_STORE = quote('attach-seq-store');



/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(4);
	var errors = __webpack_require__(5);

	var websqlConstants = __webpack_require__(33);

	var BY_SEQ_STORE = websqlConstants.BY_SEQ_STORE;
	var ATTACH_STORE = websqlConstants.ATTACH_STORE;
	var ATTACH_AND_SEQ_STORE = websqlConstants.ATTACH_AND_SEQ_STORE;

	// escapeBlob and unescapeBlob are workarounds for a websql bug:
	// https://code.google.com/p/chromium/issues/detail?id=422690
	// https://bugs.webkit.org/show_bug.cgi?id=137637
	// The goal is to never actually insert the \u0000 character
	// in the database.
	function escapeBlob(str) {
	  return str
	    .replace(/\u0002/g, '\u0002\u0002')
	    .replace(/\u0001/g, '\u0001\u0002')
	    .replace(/\u0000/g, '\u0001\u0001');
	}

	function unescapeBlob(str) {
	  return str
	    .replace(/\u0001\u0001/g, '\u0000')
	    .replace(/\u0001\u0002/g, '\u0001')
	    .replace(/\u0002\u0002/g, '\u0002');
	}

	function stringifyDoc(doc) {
	  // don't bother storing the id/rev. it uses lots of space,
	  // in persistent map/reduce especially
	  delete doc._id;
	  delete doc._rev;
	  return JSON.stringify(doc);
	}

	function unstringifyDoc(doc, id, rev) {
	  doc = JSON.parse(doc);
	  doc._id = id;
	  doc._rev = rev;
	  return doc;
	}

	// question mark groups IN queries, e.g. 3 -> '(?,?,?)'
	function qMarks(num) {
	  var s = '(';
	  while (num--) {
	    s += '?';
	    if (num) {
	      s += ',';
	    }
	  }
	  return s + ')';
	}

	function select(selector, table, joiner, where, orderBy) {
	  return 'SELECT ' + selector + ' FROM ' +
	    (typeof table === 'string' ? table : table.join(' JOIN ')) +
	    (joiner ? (' ON ' + joiner) : '') +
	    (where ? (' WHERE ' +
	    (typeof where === 'string' ? where : where.join(' AND '))) : '') +
	    (orderBy ? (' ORDER BY ' + orderBy) : '');
	}

	function compactRevs(revs, docId, tx) {

	  if (!revs.length) {
	    return;
	  }

	  var numDone = 0;
	  var seqs = [];

	  function checkDone() {
	    if (++numDone === revs.length) { // done
	      deleteOrphans();
	    }
	  }

	  function deleteOrphans() {
	    // find orphaned attachment digests

	    if (!seqs.length) {
	      return;
	    }

	    var sql = 'SELECT DISTINCT digest AS digest FROM ' +
	      ATTACH_AND_SEQ_STORE + ' WHERE seq IN ' + qMarks(seqs.length);

	    tx.executeSql(sql, seqs, function (tx, res) {

	      var digestsToCheck = [];
	      for (var i = 0; i < res.rows.length; i++) {
	        digestsToCheck.push(res.rows.item(i).digest);
	      }
	      if (!digestsToCheck.length) {
	        return;
	      }

	      var sql = 'DELETE FROM ' + ATTACH_AND_SEQ_STORE +
	        ' WHERE seq IN (' +
	        seqs.map(function () { return '?'; }).join(',') +
	        ')';
	      tx.executeSql(sql, seqs, function (tx) {

	        var sql = 'SELECT digest FROM ' + ATTACH_AND_SEQ_STORE +
	          ' WHERE digest IN (' +
	          digestsToCheck.map(function () { return '?'; }).join(',') +
	          ')';
	        tx.executeSql(sql, digestsToCheck, function (tx, res) {
	          var nonOrphanedDigests = new utils.Set();
	          for (var i = 0; i < res.rows.length; i++) {
	            nonOrphanedDigests.add(res.rows.item(i).digest);
	          }
	          digestsToCheck.forEach(function (digest) {
	            if (nonOrphanedDigests.has(digest)) {
	              return;
	            }
	            tx.executeSql(
	              'DELETE FROM ' + ATTACH_AND_SEQ_STORE + ' WHERE digest=?',
	              [digest]);
	            tx.executeSql(
	              'DELETE FROM ' + ATTACH_STORE + ' WHERE digest=?', [digest]);
	          });
	        });
	      });
	    });
	  }

	  // update by-seq and attach stores in parallel
	  revs.forEach(function (rev) {
	    var sql = 'SELECT seq FROM ' + BY_SEQ_STORE +
	      ' WHERE doc_id=? AND rev=?';

	    tx.executeSql(sql, [docId, rev], function (tx, res) {
	      if (!res.rows.length) { // already deleted
	        return checkDone();
	      }
	      var seq = res.rows.item(0).seq;
	      seqs.push(seq);

	      tx.executeSql(
	        'DELETE FROM ' + BY_SEQ_STORE + ' WHERE seq=?', [seq], checkDone);
	    });
	  });
	}

	function unknownError(callback) {
	  return function (event) {
	    // event may actually be a SQLError object, so report is as such
	    var errorNameMatch = event && event.constructor.toString()
	        .match(/function ([^\(]+)/);
	    var errorName = (errorNameMatch && errorNameMatch[1]) || event.type;
	    var errorReason = event.target || event.message;
	    callback(errors.error(errors.WSQ_ERROR, errorReason, errorName));
	  };
	}

	function getSize(opts) {
	  if ('size' in opts) {
	    // triggers immediate popup in iOS, fixes #2347
	    // e.g. 5000001 asks for 5 MB, 10000001 asks for 10 MB,
	    return opts.size * 1000000;
	  }
	  // In iOS, doesn't matter as long as it's <= 5000000.
	  // Except that if you request too much, our tests fail
	  // because of the native "do you accept?" popup.
	  // In Android <=4.3, this value is actually used as an
	  // honest-to-god ceiling for data, so we need to
	  // set it to a decently high number.
	  var isAndroid = /Android/.test(window.navigator.userAgent);
	  return isAndroid ? 5000000 : 1; // in PhantomJS, if you use 0 it will crash
	}

	var cachedDatabases = {};

	function openDB(name, version, desc, size) {
	  var sqlitePluginOpenDBFunction =
	    typeof sqlitePlugin !== 'undefined' &&
	    sqlitePlugin.openDatabase &&
	    sqlitePlugin.openDatabase.bind(sqlitePlugin);

	  var openDBFunction = sqlitePluginOpenDBFunction ||
	    (typeof openDatabase !== 'undefined' && openDatabase);

	  var db = cachedDatabases[name];
	  if (!db) {
	    db = cachedDatabases[name] = openDBFunction(name, version, desc, size);
	    db._sqlitePlugin = !!sqlitePluginOpenDBFunction;
	  }
	  return db;
	}

	function valid() {
	  // SQLitePlugin leaks this global object, which we can use
	  // to detect if it's installed or not. The benefit is that it's
	  // declared immediately, before the 'deviceready' event has fired.
	  return typeof openDatabase !== 'undefined' ||
	    typeof SQLitePlugin !== 'undefined';
	}

	module.exports = {
	  escapeBlob: escapeBlob,
	  unescapeBlob: unescapeBlob,
	  stringifyDoc: stringifyDoc,
	  unstringifyDoc: unstringifyDoc,
	  qMarks: qMarks,
	  select: select,
	  compactRevs: compactRevs,
	  unknownError: unknownError,
	  getSize: getSize,
	  openDB: openDB,
	  valid: valid
	};

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(4);
	var errors = __webpack_require__(5);

	var websqlUtils = __webpack_require__(34);
	var websqlConstants = __webpack_require__(33);

	var DOC_STORE = websqlConstants.DOC_STORE;
	var BY_SEQ_STORE = websqlConstants.BY_SEQ_STORE;
	var ATTACH_STORE = websqlConstants.ATTACH_STORE;
	var ATTACH_AND_SEQ_STORE = websqlConstants.ATTACH_AND_SEQ_STORE;

	var select = websqlUtils.select;
	var stringifyDoc = websqlUtils.stringifyDoc;
	var compactRevs = websqlUtils.compactRevs;
	var unknownError = websqlUtils.unknownError;

	function websqlBulkDocs(req, opts, api, db, Changes, callback) {
	  var newEdits = opts.new_edits;
	  var userDocs = req.docs;

	  // Parse the docs, give them a sequence number for the result
	  var docInfos = userDocs.map(function (doc) {
	    if (doc._id && utils.isLocalId(doc._id)) {
	      return doc;
	    }
	    var newDoc = utils.parseDoc(doc, newEdits);
	    return newDoc;
	  });

	  var docInfoErrors = docInfos.filter(function (docInfo) {
	    return docInfo.error;
	  });
	  if (docInfoErrors.length) {
	    return callback(docInfoErrors[0]);
	  }

	  var tx;
	  var results = new Array(docInfos.length);
	  var fetchedDocs = new utils.Map();

	  var preconditionErrored;
	  function complete() {
	    if (preconditionErrored) {
	      return callback(preconditionErrored);
	    }
	    Changes.notify(api._name);
	    api._docCount = -1; // invalidate
	    callback(null, results);
	  }

	  function verifyAttachment(digest, callback) {
	    var sql = 'SELECT count(*) as cnt FROM ' + ATTACH_STORE +
	      ' WHERE digest=?';
	    tx.executeSql(sql, [digest], function (tx, result) {
	      if (result.rows.item(0).cnt === 0) {
	        var err = errors.error(errors.MISSING_STUB,
	          'unknown stub attachment with digest ' +
	          digest);
	        callback(err);
	      } else {
	        callback();
	      }
	    });
	  }

	  function verifyAttachments(finish) {
	    var digests = [];
	    docInfos.forEach(function (docInfo) {
	      if (docInfo.data && docInfo.data._attachments) {
	        Object.keys(docInfo.data._attachments).forEach(function (filename) {
	          var att = docInfo.data._attachments[filename];
	          if (att.stub) {
	            digests.push(att.digest);
	          }
	        });
	      }
	    });
	    if (!digests.length) {
	      return finish();
	    }
	    var numDone = 0;
	    var err;

	    function checkDone() {
	      if (++numDone === digests.length) {
	        finish(err);
	      }
	    }
	    digests.forEach(function (digest) {
	      verifyAttachment(digest, function (attErr) {
	        if (attErr && !err) {
	          err = attErr;
	        }
	        checkDone();
	      });
	    });
	  }


	  function writeDoc(docInfo, winningRev, deleted, callback, isUpdate,
	                    docCount, resultsIdx) {

	    function finish() {
	      var data = docInfo.data;
	      var deletedInt = deleted ? 1 : 0;

	      var id = data._id;
	      var rev = data._rev;
	      var json = stringifyDoc(data);
	      var sql = 'INSERT INTO ' + BY_SEQ_STORE +
	        ' (doc_id, rev, json, deleted) VALUES (?, ?, ?, ?);';
	      var sqlArgs = [id, rev, json, deletedInt];

	      // map seqs to attachment digests, which
	      // we will need later during compaction
	      function insertAttachmentMappings(seq, callback) {
	        var attsAdded = 0;
	        var attsToAdd = Object.keys(data._attachments || {});

	        if (!attsToAdd.length) {
	          return callback();
	        }
	        function checkDone() {
	          if (++attsAdded === attsToAdd.length) {
	            callback();
	          }
	          return false; // ack handling a constraint error
	        }
	        function add(att) {
	          var sql = 'INSERT INTO ' + ATTACH_AND_SEQ_STORE +
	            ' (digest, seq) VALUES (?,?)';
	          var sqlArgs = [data._attachments[att].digest, seq];
	          tx.executeSql(sql, sqlArgs, checkDone, checkDone);
	          // second callback is for a constaint error, which we ignore
	          // because this docid/rev has already been associated with
	          // the digest (e.g. when new_edits == false)
	        }
	        for (var i = 0; i < attsToAdd.length; i++) {
	          add(attsToAdd[i]); // do in parallel
	        }
	      }

	      tx.executeSql(sql, sqlArgs, function (tx, result) {
	        var seq = result.insertId;
	        insertAttachmentMappings(seq, function () {
	          dataWritten(tx, seq);
	        });
	      }, function () {
	        // constraint error, recover by updating instead (see #1638)
	        var fetchSql = select('seq', BY_SEQ_STORE, null,
	          'doc_id=? AND rev=?');
	        tx.executeSql(fetchSql, [id, rev], function (tx, res) {
	          var seq = res.rows.item(0).seq;
	          var sql = 'UPDATE ' + BY_SEQ_STORE +
	            ' SET json=?, deleted=? WHERE doc_id=? AND rev=?;';
	          var sqlArgs = [json, deletedInt, id, rev];
	          tx.executeSql(sql, sqlArgs, function (tx) {
	            insertAttachmentMappings(seq, function () {
	              dataWritten(tx, seq);
	            });
	          });
	        });
	        return false; // ack that we've handled the error
	      });
	    }

	    function collectResults(attachmentErr) {
	      if (!err) {
	        if (attachmentErr) {
	          err = attachmentErr;
	          callback(err);
	        } else if (recv === attachments.length) {
	          finish();
	        }
	      }
	    }

	    var err = null;
	    var recv = 0;

	    docInfo.data._id = docInfo.metadata.id;
	    docInfo.data._rev = docInfo.metadata.rev;
	    var attachments = Object.keys(docInfo.data._attachments || {});


	    if (deleted) {
	      docInfo.data._deleted = true;
	    }

	    function attachmentSaved(err) {
	      recv++;
	      collectResults(err);
	    }

	    attachments.forEach(function (key) {
	      var att = docInfo.data._attachments[key];
	      if (!att.stub) {
	        var data = att.data;
	        delete att.data;
	        var digest = att.digest;
	        saveAttachment(digest, data, attachmentSaved);
	      } else {
	        recv++;
	        collectResults();
	      }
	    });

	    if (!attachments.length) {
	      finish();
	    }

	    function autoCompact() {
	      if (!isUpdate || !api.auto_compaction) {
	        return; // nothing to do
	      }
	      var id = docInfo.metadata.id;
	      var revsToDelete = utils.compactTree(docInfo.metadata);
	      compactRevs(revsToDelete, id, tx);
	    }

	    function dataWritten(tx, seq) {
	      autoCompact();
	      docInfo.metadata.seq = seq;
	      delete docInfo.metadata.rev;

	      var sql = isUpdate ?
	      'UPDATE ' + DOC_STORE +
	      ' SET json=?, max_seq=?, winningseq=' +
	      '(SELECT seq FROM ' + BY_SEQ_STORE +
	      ' WHERE doc_id=' + DOC_STORE + '.id AND rev=?) WHERE id=?'
	        : 'INSERT INTO ' + DOC_STORE +
	      ' (id, winningseq, max_seq, json) VALUES (?,?,?,?);';
	      var metadataStr = utils.safeJsonStringify(docInfo.metadata);
	      var id = docInfo.metadata.id;
	      var params = isUpdate ?
	        [metadataStr, seq, winningRev, id] :
	        [id, seq, seq, metadataStr];
	      tx.executeSql(sql, params, function () {
	        results[resultsIdx] = {
	          ok: true,
	          id: docInfo.metadata.id,
	          rev: winningRev
	        };
	        fetchedDocs.set(id, docInfo.metadata);
	        callback();
	      });
	    }
	  }

	  function processDocs() {
	    utils.processDocs(docInfos, api, fetchedDocs,
	      tx, results, writeDoc, opts);
	  }

	  function fetchExistingDocs(callback) {
	    if (!docInfos.length) {
	      return callback();
	    }

	    var numFetched = 0;

	    function checkDone() {
	      if (++numFetched === docInfos.length) {
	        callback();
	      }
	    }

	    docInfos.forEach(function (docInfo) {
	      if (docInfo._id && utils.isLocalId(docInfo._id)) {
	        return checkDone(); // skip local docs
	      }
	      var id = docInfo.metadata.id;
	      tx.executeSql('SELECT json FROM ' + DOC_STORE +
	      ' WHERE id = ?', [id], function (tx, result) {
	        if (result.rows.length) {
	          var metadata = utils.safeJsonParse(result.rows.item(0).json);
	          fetchedDocs.set(id, metadata);
	        }
	        checkDone();
	      });
	    });
	  }

	  function saveAttachment(digest, data, callback) {
	    var sql = 'SELECT digest FROM ' + ATTACH_STORE + ' WHERE digest=?';
	    tx.executeSql(sql, [digest], function (tx, result) {
	      if (result.rows.length) { // attachment already exists
	        return callback();
	      }
	      // we could just insert before selecting and catch the error,
	      // but my hunch is that it's cheaper not to serialize the blob
	      // from JS to C if we don't have to (TODO: confirm this)
	      sql = 'INSERT INTO ' + ATTACH_STORE +
	      ' (digest, body, escaped) VALUES (?,?,1)';
	      tx.executeSql(sql, [digest, websqlUtils.escapeBlob(data)], function () {
	        callback();
	      }, function () {
	        // ignore constaint errors, means it already exists
	        callback();
	        return false; // ack we handled the error
	      });
	    });
	  }

	  utils.preprocessAttachments(docInfos, 'binary', function (err) {
	    if (err) {
	      return callback(err);
	    }
	    db.transaction(function (txn) {
	      tx = txn;
	      verifyAttachments(function (err) {
	        if (err) {
	          preconditionErrored = err;
	        } else {
	          fetchExistingDocs(processDocs);
	        }
	      });
	    }, unknownError(callback), complete);
	  });
	}

	module.exports = websqlBulkDocs;


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var fs = __webpack_require__(53);
	var path = __webpack_require__(64);
	var utils = __webpack_require__(4);
	var merge = __webpack_require__(19);
	var levelup = __webpack_require__(54);
	var through = __webpack_require__(58).obj;

	var stores = [
	  'document-store',
	  'by-sequence',
	  'attach-store',
	  'attach-binary-store'
	];
	function formatSeq(n) {
	  return ('0000000000000000' + n).slice(-16);
	}
	var UPDATE_SEQ_KEY = '_local_last_update_seq';
	var DOC_COUNT_KEY = '_local_doc_count';
	var UUID_KEY = '_local_uuid';

	exports.toSublevel = function (name, db, callback) {
	  // local require to prevent crashing if leveldown isn't installed.
	  var leveldown = __webpack_require__(55);

	  var base = path.resolve(name);
	  function move(store, index, cb) {
	    var storePath = path.join(base, store);
	    var opts;
	    if (index === 3) {
	      opts = {
	        valueEncoding: 'binary'
	      };
	    } else {
	      opts = {
	        valueEncoding: 'json'
	      };
	    }
	    var sub = db.sublevel(store, opts);
	    var orig = levelup(storePath, opts);
	    var from = orig.createReadStream();
	    var to = sub.createWriteStream();
	    from.on('end', function () {
	      orig.close(function (err) {
	        cb(err, storePath);
	      });
	    });
	    from.pipe(to);
	  }
	  fs.unlink(base + '.uuid', function (err) {
	    if (err) {
	      return callback();
	    }
	    var todo = 4;
	    var done = [];
	    stores.forEach(function (store, i) {
	      move(store, i, function (err, storePath) {
	        if (err) {
	          return callback(err);
	        }
	        done.push(storePath);
	        if (!(--todo)) {
	          done.forEach(function (item) {
	            leveldown.destroy(item, function () {
	              if (++todo === done.length) {
	                fs.rmdir(base, callback);
	              }
	            });
	          });
	        }
	      });
	    });
	  });
	};
	exports.localAndMetaStores = function (db, stores, callback) {
	  var batches = [];
	  stores.bySeqStore.get(UUID_KEY, function (err, value) {
	    if (err) {
	      // no uuid key, so don't need to migrate;
	      return callback();
	    }
	    batches.push({
	      key: UUID_KEY,
	      value: value,
	      prefix: stores.metaStore,
	      type: 'put',
	      valueEncoding: 'json'
	    });
	    batches.push({
	      key: UUID_KEY,
	      prefix: stores.bySeqStore,
	      type: 'del'
	    });
	    stores.bySeqStore.get(DOC_COUNT_KEY, function (err, value) {
	      if (value) {
	        // if no doc count key,
	        // just skip
	        // we can live with this
	        batches.push({
	          key: DOC_COUNT_KEY,
	          value: value,
	          prefix: stores.metaStore,
	          type: 'put',
	          valueEncoding: 'json'
	        });
	        batches.push({
	          key: DOC_COUNT_KEY,
	          prefix: stores.bySeqStore,
	          type: 'del'
	        });
	      }
	      stores.bySeqStore.get(UPDATE_SEQ_KEY, function (err, value) {
	        if (value) {
	          // if no UPDATE_SEQ_KEY
	          // just skip
	          // we've gone to far to stop.
	          batches.push({
	            key: UPDATE_SEQ_KEY,
	            value: value,
	            prefix: stores.metaStore,
	            type: 'put',
	            valueEncoding: 'json'
	          });
	          batches.push({
	            key: UPDATE_SEQ_KEY,
	            prefix: stores.bySeqStore,
	            type: 'del'
	          });
	        }
	        var deletedSeqs = {};
	        stores.docStore.createReadStream({
	          startKey: '_',
	          endKey: '_\xFF'
	        }).pipe(through(function (ch, _, next) {
	          if (!utils.isLocalId(ch.key)) {
	            return next();
	          }
	          batches.push({
	            key: ch.key,
	            prefix: stores.docStore,
	            type: 'del'
	          });
	          var winner = merge.winningRev(ch.value);
	          Object.keys(ch.value.rev_map).forEach(function (key) {
	            if (key !== 'winner') {
	              this.push(formatSeq(ch.value.rev_map[key]));
	            }
	          }, this);
	          var winningSeq = ch.value.rev_map[winner];
	          stores.bySeqStore.get(formatSeq(winningSeq), function (err, value) {
	            if (!err) {
	              batches.push({
	                key: ch.key,
	                value: value,
	                prefix: stores.localStore,
	                type: 'put',
	                valueEncoding: 'json'
	              });
	            }
	            next();
	          });

	        })).pipe(through(function (seq, _, next) {
	          if (deletedSeqs[seq]) {
	            return next();
	          }
	          deletedSeqs[seq] = true;
	          stores.bySeqStore.get(seq, function (err, resp) {
	            if (err || !utils.isLocalId(resp._id)) {
	              return next();
	            }
	            batches.push({
	              key: seq,
	              prefix: stores.bySeqStore,
	              type: 'del'
	            });
	            next();
	          });
	        }, function (next) {
	          db.batch(batches, callback);
	        }));
	      });
	    });
	  });

	};


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	// similar to an idb or websql transaction object
	// designed to be passed around. basically just caches
	// things in-memory and then does a big batch() operation
	// when you're done

	var utils = __webpack_require__(4);

	function getCacheFor(transaction, store) {
	  var prefix = store.prefix();
	  var cache = transaction._cache;
	  var subCache = cache.get(prefix);
	  if (!subCache) {
	    subCache = new utils.Map();
	    cache.set(prefix, subCache);
	  }
	  return subCache;
	}

	function LevelTransaction() {
	  this._batch = [];
	  this._cache = new utils.Map();
	}

	LevelTransaction.prototype.get = function (store, key, callback) {
	  var cache = getCacheFor(this, store);
	  var exists = cache.get(key);
	  if (exists) {
	    return process.nextTick(function () {
	      callback(null, exists);
	    });
	  } else if (exists === null) { // deleted marker
	    return process.nextTick(function () {
	      callback({name: 'NotFoundError'});
	    });
	  }
	  store.get(key, function (err, res) {
	    if (err) {
	      if (err.name === 'NotFoundError') {
	        cache.set(key, null);
	      }
	      return callback(err);
	    }
	    cache.set(key, res);
	    callback(null, res);
	  });
	};

	LevelTransaction.prototype.batch = function (batch) {
	  for (var i = 0, len = batch.length; i < len; i++) {
	    var operation = batch[i];

	    var cache = getCacheFor(this, operation.prefix);

	    if (operation.type === 'put') {
	      cache.set(operation.key, operation.value);
	    } else {
	      cache.set(operation.key, null);
	    }
	  }
	  this._batch = this._batch.concat(batch);
	};

	LevelTransaction.prototype.execute = function (db, callback) {

	  var keys = new utils.Set();
	  var uniqBatches = [];

	  // remove duplicates; last one wins
	  for (var i = this._batch.length - 1; i >= 0; i--) {
	    var operation = this._batch[i];
	    var lookupKey = operation.prefix.prefix() + '\xff' + operation.key;
	    if (keys.has(lookupKey)) {
	      continue;
	    }
	    keys.add(lookupKey);
	    uniqBatches.push(operation);
	  }

	  db.batch(uniqBatches, callback);
	};

	module.exports = LevelTransaction;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        len = arguments.length;
	        args = new Array(len - 1);
	        for (i = 1; i < len; i++)
	          args[i - 1] = arguments[i];
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    len = arguments.length;
	    args = new Array(len - 1);
	    for (i = 1; i < len; i++)
	      args[i - 1] = arguments[i];

	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    var m;
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  var ret;
	  if (!emitter._events || !emitter._events[type])
	    ret = 0;
	  else if (isFunction(emitter._events[type]))
	    ret = 1;
	  else
	    ret = emitter._events[type].length;
	  return ret;
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// Extends method
	// (taken from http://code.jquery.com/jquery-1.9.0.js)
	// Populate the class2type map
	var class2type = {};

	var types = [
	  "Boolean", "Number", "String", "Function", "Array",
	  "Date", "RegExp", "Object", "Error"
	];
	for (var i = 0; i < types.length; i++) {
	  var typename = types[i];
	  class2type["[object " + typename + "]"] = typename.toLowerCase();
	}

	var core_toString = class2type.toString;
	var core_hasOwn = class2type.hasOwnProperty;

	function type(obj) {
	  if (obj === null) {
	    return String(obj);
	  }
	  return typeof obj === "object" || typeof obj === "function" ?
	    class2type[core_toString.call(obj)] || "object" :
	    typeof obj;
	}

	function isWindow(obj) {
	  return obj !== null && obj === obj.window;
	}

	function isPlainObject(obj) {
	  // Must be an Object.
	  // Because of IE, we also have to check the presence of
	  // the constructor property.
	  // Make sure that DOM nodes and window objects don't pass through, as well
	  if (!obj || type(obj) !== "object" || obj.nodeType || isWindow(obj)) {
	    return false;
	  }

	  try {
	    // Not own constructor property must be Object
	    if (obj.constructor &&
	      !core_hasOwn.call(obj, "constructor") &&
	      !core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
	      return false;
	    }
	  } catch ( e ) {
	    // IE8,9 Will throw exceptions on certain host objects #9897
	    return false;
	  }

	  // Own properties are enumerated firstly, so to speed up,
	  // if last one is own, then all properties are own.
	  var key;
	  for (key in obj) {}

	  return key === undefined || core_hasOwn.call(obj, key);
	}


	function isFunction(obj) {
	  return type(obj) === "function";
	}

	var isArray = Array.isArray || function (obj) {
	  return type(obj) === "array";
	};

	function extend() {
	  // originally extend() was recursive, but this ended up giving us
	  // "call stack exceeded", so it's been unrolled to use a literal stack
	  // (see https://github.com/pouchdb/pouchdb/issues/2543)
	  var stack = [];
	  var i = -1;
	  var len = arguments.length;
	  var args = new Array(len);
	  while (++i < len) {
	    args[i] = arguments[i];
	  }
	  var container = {};
	  stack.push({args: args, result: {container: container, key: 'key'}});
	  var next;
	  while ((next = stack.pop())) {
	    extendInner(stack, next.args, next.result);
	  }
	  return container.key;
	}

	function extendInner(stack, args, result) {
	  var options, name, src, copy, copyIsArray, clone,
	    target = args[0] || {},
	    i = 1,
	    length = args.length,
	    deep = false,
	    numericStringRegex = /\d+/,
	    optionsIsArray;

	  // Handle a deep copy situation
	  if (typeof target === "boolean") {
	    deep = target;
	    target = args[1] || {};
	    // skip the boolean and the target
	    i = 2;
	  }

	  // Handle case when target is a string or something (possible in deep copy)
	  if (typeof target !== "object" && !isFunction(target)) {
	    target = {};
	  }

	  // extend jQuery itself if only one argument is passed
	  if (length === i) {
	    /* jshint validthis: true */
	    target = this;
	    --i;
	  }

	  for (; i < length; i++) {
	    // Only deal with non-null/undefined values
	    if ((options = args[i]) != null) {
	      optionsIsArray = isArray(options);
	      // Extend the base object
	      for (name in options) {
	        //if (options.hasOwnProperty(name)) {
	        if (!(name in Object.prototype)) {
	          if (optionsIsArray && !numericStringRegex.test(name)) {
	            continue;
	          }

	          src = target[name];
	          copy = options[name];

	          // Prevent never-ending loop
	          if (target === copy) {
	            continue;
	          }

	          // Recurse if we're merging plain objects or arrays
	          if (deep && copy && (isPlainObject(copy) ||
	              (copyIsArray = isArray(copy)))) {
	            if (copyIsArray) {
	              copyIsArray = false;
	              clone = src && isArray(src) ? src : [];

	            } else {
	              clone = src && isPlainObject(src) ? src : {};
	            }

	            // Never move original objects, clone them
	            stack.push({
	              args: [deep, clone, copy],
	              result: {
	                container: target,
	                key: name
	              }
	            });

	          // Don't bring in undefined values
	          } else if (copy !== undefined) {
	            if (!(isArray(options) && isFunction(copy))) {
	              target[name] = copy;
	            }
	          }
	        }
	      }
	    }
	  }

	  // "Return" the modified object by setting the key
	  // on the given container
	  result.container[result.key] = target;
	}


	module.exports = extend;




/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = argsArray;

	function argsArray(fun) {
	  return function () {
	    var len = arguments.length;
	    if (len) {
	      var args = [];
	      var i = -1;
	      while (++i < len) {
	        args[i] = arguments[i];
	      }
	      return fun.call(this, args);
	    } else {
	      return fun.call(this, []);
	    }
	  };
	}

/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	exports.Map = LazyMap; // TODO: use ES6 map
	exports.Set = LazySet; // TODO: use ES6 set
	// based on https://github.com/montagejs/collections
	function LazyMap() {
	  this.store = {};
	}
	LazyMap.prototype.mangle = function (key) {
	  if (typeof key !== "string") {
	    throw new TypeError("key must be a string but Got " + key);
	  }
	  return '$' + key;
	};
	LazyMap.prototype.unmangle = function (key) {
	  return key.substring(1);
	};
	LazyMap.prototype.get = function (key) {
	  var mangled = this.mangle(key);
	  if (mangled in this.store) {
	    return this.store[mangled];
	  } else {
	    return void 0;
	  }
	};
	LazyMap.prototype.set = function (key, value) {
	  var mangled = this.mangle(key);
	  this.store[mangled] = value;
	  return true;
	};
	LazyMap.prototype.has = function (key) {
	  var mangled = this.mangle(key);
	  return mangled in this.store;
	};
	LazyMap.prototype.delete = function (key) {
	  var mangled = this.mangle(key);
	  if (mangled in this.store) {
	    delete this.store[mangled];
	    return true;
	  }
	  return false;
	};
	LazyMap.prototype.forEach = function (cb) {
	  var self = this;
	  var keys = Object.keys(self.store);
	  keys.forEach(function (key) {
	    var value = self.store[key];
	    key = self.unmangle(key);
	    cb(value, key);
	  });
	};

	function LazySet(array) {
	  this.store = new LazyMap();

	  // init with an array
	  if (array && Array.isArray(array)) {
	    for (var i = 0, len = array.length; i < len; i++) {
	      this.add(array[i]);
	    }
	  }
	}
	LazySet.prototype.add = function (key) {
	  return this.store.set(key, true);
	};
	LazySet.prototype.has = function (key) {
	  return this.store.has(key);
	};
	LazySet.prototype.delete = function (key) {
	  return this.store.delete(key);
	};


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Stringify/parse functions that don't operate
	 * recursively, so they avoid call stack exceeded
	 * errors.
	 */
	exports.stringify = function stringify(input) {
	  var queue = [];
	  queue.push({obj: input});

	  var res = '';
	  var next, obj, prefix, val, i, arrayPrefix, keys, k, key, value, objPrefix;
	  while ((next = queue.pop())) {
	    obj = next.obj;
	    prefix = next.prefix || '';
	    val = next.val || '';
	    res += prefix;
	    if (val) {
	      res += val;
	    } else if (typeof obj !== 'object') {
	      res += typeof obj === 'undefined' ? null : JSON.stringify(obj);
	    } else if (obj === null) {
	      res += 'null';
	    } else if (Array.isArray(obj)) {
	      queue.push({val: ']'});
	      for (i = obj.length - 1; i >= 0; i--) {
	        arrayPrefix = i === 0 ? '' : ',';
	        queue.push({obj: obj[i], prefix: arrayPrefix});
	      }
	      queue.push({val: '['});
	    } else { // object
	      keys = [];
	      for (k in obj) {
	        if (obj.hasOwnProperty(k)) {
	          keys.push(k);
	        }
	      }
	      queue.push({val: '}'});
	      for (i = keys.length - 1; i >= 0; i--) {
	        key = keys[i];
	        value = obj[key];
	        objPrefix = (i > 0 ? ',' : '');
	        objPrefix += JSON.stringify(key) + ':';
	        queue.push({obj: value, prefix: objPrefix});
	      }
	      queue.push({val: '{'});
	    }
	  }
	  return res;
	};

	// Convenience function for the parse function.
	// This pop function is basically copied from
	// pouchCollate.parseIndexableString
	function pop(obj, stack, metaStack) {
	  var lastMetaElement = metaStack[metaStack.length - 1];
	  if (obj === lastMetaElement.element) {
	    // popping a meta-element, e.g. an object whose value is another object
	    metaStack.pop();
	    lastMetaElement = metaStack[metaStack.length - 1];
	  }
	  var element = lastMetaElement.element;
	  var lastElementIndex = lastMetaElement.index;
	  if (Array.isArray(element)) {
	    element.push(obj);
	  } else if (lastElementIndex === stack.length - 2) { // obj with key+value
	    var key = stack.pop();
	    element[key] = obj;
	  } else {
	    stack.push(obj); // obj with key only
	  }
	}

	exports.parse = function (str) {
	  var stack = [];
	  var metaStack = []; // stack for arrays and objects
	  var i = 0;
	  var collationIndex,parsedNum,numChar;
	  var parsedString,lastCh,numConsecutiveSlashes,ch;
	  var arrayElement, objElement;
	  while (true) {
	    collationIndex = str[i++];
	    if (collationIndex === '}' ||
	        collationIndex === ']' ||
	        typeof collationIndex === 'undefined') {
	      if (stack.length === 1) {
	        return stack.pop();
	      } else {
	        pop(stack.pop(), stack, metaStack);
	        continue;
	      }
	    }
	    switch (collationIndex) {
	      case ' ':
	      case '\t':
	      case '\n':
	      case ':':
	      case ',':
	        break;
	      case 'n':
	        i += 3; // 'ull'
	        pop(null, stack, metaStack);
	        break;
	      case 't':
	        i += 3; // 'rue'
	        pop(true, stack, metaStack);
	        break;
	      case 'f':
	        i += 4; // 'alse'
	        pop(false, stack, metaStack);
	        break;
	      case '0':
	      case '1':
	      case '2':
	      case '3':
	      case '4':
	      case '5':
	      case '6':
	      case '7':
	      case '8':
	      case '9':
	      case '-':
	        parsedNum = '';
	        i--;
	        while (true) {
	          numChar = str[i++];
	          if (/[\d\.\-e\+]/.test(numChar)) {
	            parsedNum += numChar;
	          } else {
	            i--;
	            break;
	          }
	        }
	        pop(parseFloat(parsedNum), stack, metaStack);
	        break;
	      case '"':
	        parsedString = '';
	        lastCh = void 0;
	        numConsecutiveSlashes = 0;
	        while (true) {
	          ch = str[i++];
	          if (ch !== '"' || (lastCh === '\\' &&
	              numConsecutiveSlashes % 2 === 1)) {
	            parsedString += ch;
	            lastCh = ch;
	            if (lastCh === '\\') {
	              numConsecutiveSlashes++;
	            } else {
	              numConsecutiveSlashes = 0;
	            }
	          } else {
	            break;
	          }
	        }
	        pop(JSON.parse('"' + parsedString + '"'), stack, metaStack);
	        break;
	      case '[':
	        arrayElement = { element: [], index: stack.length };
	        stack.push(arrayElement.element);
	        metaStack.push(arrayElement);
	        break;
	      case '{':
	        objElement = { element: {}, index: stack.length };
	        stack.push(objElement.element);
	        metaStack.push(objElement);
	        break;
	      default:
	        throw new Error(
	          'unexpectedly reached end of input: ' + collationIndex);
	    }
	  }
	};


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {var EventEmitter = __webpack_require__(38).EventEmitter
	var next         = process.nextTick
	var SubDb        = __webpack_require__(62)
	var Batch        = __webpack_require__(63)
	var fixRange     = __webpack_require__(70)

	var Hooks   = __webpack_require__(71)

	module.exports   = function (_db, options) {
	  function DB () {}
	  DB.prototype = _db
	  var db = new DB()

	  if (db.sublevel) return db

	  options = options || {}

	  //use \xff (255) as the seperator,
	  //so that sections of the database will sort after the regular keys
	  var sep = options.sep = options.sep || '\xff'
	  db._options = options

	  Hooks(db)

	  db.sublevels = {}

	  db.sublevel = function (prefix, options) {
	    if(db.sublevels[prefix])
	      return db.sublevels[prefix]
	    return new SubDb(db, prefix, options || this._options)
	  }

	  db.methods = {}

	  db.prefix = function (key) {
	    return '' + (key || '')
	  }

	  db.pre = function (range, hook) {
	    if(!hook)
	      hook = range, range = {
	        max  : sep
	      }
	    return db.hooks.pre(range, hook)
	  }

	  db.post = function (range, hook) {
	    if(!hook)
	      hook = range, range = {
	        max : sep
	      }
	    return db.hooks.post(range, hook)
	  }

	  function safeRange(fun) {
	    return function (opts) {
	      opts = opts || {}
	      opts = fixRange(opts)

	      if(opts.reverse) opts.start = opts.start || sep
	      else             opts.end   = opts.end || sep

	      return fun.call(db, opts)
	    }
	  }

	  db.readStream =
	  db.createReadStream  = safeRange(db.createReadStream)
	  db.keyStream =
	  db.createKeyStream   = safeRange(db.createKeyStream)
	  db.valuesStream =
	  db.createValueStream = safeRange(db.createValueStream)

	  var batch = db.batch
	  db.batch = function (changes, opts, cb) {
	    if(!Array.isArray(changes))
	      return new Batch(db)
	    changes.forEach(function (e) {
	      if(e.prefix) {
	        if('function' === typeof e.prefix.prefix)
	          e.key = e.prefix.prefix(e.key)
	        else if('string'  === typeof e.prefix)
	          e.key = e.prefix + e.key
	      }
	    })
	    batch.call(db, changes, opts, cb)
	  }
	  return db
	}

	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */

	var base64 = __webpack_require__(77)
	var ieee754 = __webpack_require__(72)
	var isArray = __webpack_require__(73)

	exports.Buffer = Buffer
	exports.SlowBuffer = Buffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192 // not used by this implementation

	var kMaxLength = 0x3fffffff

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Note:
	 *
	 * - Implementation must support adding new properties to `Uint8Array` instances.
	 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
	 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *    incorrect length in some situations.
	 *
	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
	 * get the Object implementation, which is slower but will work correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = (function () {
	  try {
	    var buf = new ArrayBuffer(0)
	    var arr = new Uint8Array(buf)
	    arr.foo = function () { return 42 }
	    return 42 === arr.foo() && // typed array instances can be augmented
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	})()

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (subject, encoding, noZero) {
	  if (!(this instanceof Buffer))
	    return new Buffer(subject, encoding, noZero)

	  var type = typeof subject

	  // Find the length
	  var length
	  if (type === 'number')
	    length = subject > 0 ? subject >>> 0 : 0
	  else if (type === 'string') {
	    if (encoding === 'base64')
	      subject = base64clean(subject)
	    length = Buffer.byteLength(subject, encoding)
	  } else if (type === 'object' && subject !== null) { // assume object is array-like
	    if (subject.type === 'Buffer' && isArray(subject.data))
	      subject = subject.data
	    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
	  } else
	    throw new TypeError('must start with number, buffer, array or string')

	  if (this.length > kMaxLength)
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	      'size: 0x' + kMaxLength.toString(16) + ' bytes')

	  var buf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Preferred: Return an augmented `Uint8Array` instance for best performance
	    buf = Buffer._augment(new Uint8Array(length))
	  } else {
	    // Fallback: Return THIS instance of Buffer (created by `new`)
	    buf = this
	    buf.length = length
	    buf._isBuffer = true
	  }

	  var i
	  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
	    // Speed optimization -- use set if we're copying from a typed array
	    buf._set(subject)
	  } else if (isArrayish(subject)) {
	    // Treat array-ish objects as a byte array
	    if (Buffer.isBuffer(subject)) {
	      for (i = 0; i < length; i++)
	        buf[i] = subject.readUInt8(i)
	    } else {
	      for (i = 0; i < length; i++)
	        buf[i] = ((subject[i] % 256) + 256) % 256
	    }
	  } else if (type === 'string') {
	    buf.write(subject, 0, encoding)
	  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
	    for (i = 0; i < length; i++) {
	      buf[i] = 0
	    }
	  }

	  return buf
	}

	Buffer.isBuffer = function (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
	    throw new TypeError('Arguments must be Buffers')

	  var x = a.length
	  var y = b.length
	  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
	  if (i !== len) {
	    x = a[i]
	    y = b[i]
	  }
	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function (list, totalLength) {
	  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

	  if (list.length === 0) {
	    return new Buffer(0)
	  } else if (list.length === 1) {
	    return list[0]
	  }

	  var i
	  if (totalLength === undefined) {
	    totalLength = 0
	    for (i = 0; i < list.length; i++) {
	      totalLength += list[i].length
	    }
	  }

	  var buf = new Buffer(totalLength)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	Buffer.byteLength = function (str, encoding) {
	  var ret
	  str = str + ''
	  switch (encoding || 'utf8') {
	    case 'ascii':
	    case 'binary':
	    case 'raw':
	      ret = str.length
	      break
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      ret = str.length * 2
	      break
	    case 'hex':
	      ret = str.length >>> 1
	      break
	    case 'utf8':
	    case 'utf-8':
	      ret = utf8ToBytes(str).length
	      break
	    case 'base64':
	      ret = base64ToBytes(str).length
	      break
	    default:
	      ret = str.length
	  }
	  return ret
	}

	// pre-set for values that may exist in the future
	Buffer.prototype.length = undefined
	Buffer.prototype.parent = undefined

	// toString(encoding, start=0, end=buffer.length)
	Buffer.prototype.toString = function (encoding, start, end) {
	  var loweredCase = false

	  start = start >>> 0
	  end = end === undefined || end === Infinity ? this.length : end >>> 0

	  if (!encoding) encoding = 'utf8'
	  if (start < 0) start = 0
	  if (end > this.length) end = this.length
	  if (end <= start) return ''

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'binary':
	        return binarySlice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase)
	          throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.equals = function (b) {
	  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max)
	      str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  return Buffer.compare(this, b)
	}

	// `get` will be removed in Node 0.13+
	Buffer.prototype.get = function (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` will be removed in Node 0.13+
	Buffer.prototype.set = function (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var byte = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(byte)) throw new Error('Invalid hex string')
	    buf[offset + i] = byte
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function asciiWrite (buf, string, offset, length) {
	  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function binaryWrite (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function utf16leWrite (buf, string, offset, length) {
	  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length, 2)
	  return charsWritten
	}

	Buffer.prototype.write = function (string, offset, length, encoding) {
	  // Support both (string, offset, length, encoding)
	  // and the legacy (string, encoding, offset, length)
	  if (isFinite(offset)) {
	    if (!isFinite(length)) {
	      encoding = length
	      length = undefined
	    }
	  } else {  // legacy
	    var swap = encoding
	    encoding = offset
	    offset = length
	    length = swap
	  }

	  offset = Number(offset) || 0
	  var remaining = this.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }
	  encoding = String(encoding || 'utf8').toLowerCase()

	  var ret
	  switch (encoding) {
	    case 'hex':
	      ret = hexWrite(this, string, offset, length)
	      break
	    case 'utf8':
	    case 'utf-8':
	      ret = utf8Write(this, string, offset, length)
	      break
	    case 'ascii':
	      ret = asciiWrite(this, string, offset, length)
	      break
	    case 'binary':
	      ret = binaryWrite(this, string, offset, length)
	      break
	    case 'base64':
	      ret = base64Write(this, string, offset, length)
	      break
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      ret = utf16leWrite(this, string, offset, length)
	      break
	    default:
	      throw new TypeError('Unknown encoding: ' + encoding)
	  }
	  return ret
	}

	Buffer.prototype.toJSON = function () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  var res = ''
	  var tmp = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    if (buf[i] <= 0x7F) {
	      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
	      tmp = ''
	    } else {
	      tmp += '%' + buf[i].toString(16)
	    }
	  }

	  return res + decodeUtf8Char(tmp)
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function binarySlice (buf, start, end) {
	  return asciiSlice(buf, start, end)
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len;
	    if (start < 0)
	      start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0)
	      end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start)
	    end = start

	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    return Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    var newBuf = new Buffer(sliceLen, undefined, true)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	    return newBuf
	  }
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0)
	    throw new RangeError('offset is not uint')
	  if (offset + ext > length)
	    throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUInt8 = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	      ((this[offset + 1] << 16) |
	      (this[offset + 2] << 8) |
	      this[offset + 3])
	}

	Buffer.prototype.readInt8 = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80))
	    return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16) |
	      (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	      (this[offset + 1] << 16) |
	      (this[offset + 2] << 8) |
	      (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
	  if (value > max || value < min) throw new TypeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new TypeError('index out of range')
	}

	Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = value
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	  } else objectWriteUInt16(this, value, offset, true)
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = value
	  } else objectWriteUInt16(this, value, offset, false)
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = value
	  } else objectWriteUInt32(this, value, offset, true)
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = value
	  } else objectWriteUInt32(this, value, offset, false)
	  return offset + 4
	}

	Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = value
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	  } else objectWriteUInt16(this, value, offset, true)
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = value
	  } else objectWriteUInt16(this, value, offset, false)
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else objectWriteUInt32(this, value, offset, true)
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = value
	  } else objectWriteUInt32(this, value, offset, false)
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (value > max || value < min) throw new TypeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new TypeError('index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert)
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert)
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function (target, target_start, start, end) {
	  var source = this

	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (!target_start) target_start = 0

	  // Copy 0 bytes; we're done
	  if (end === start) return
	  if (target.length === 0 || source.length === 0) return

	  // Fatal error conditions
	  if (end < start) throw new TypeError('sourceEnd < sourceStart')
	  if (target_start < 0 || target_start >= target.length)
	    throw new TypeError('targetStart out of bounds')
	  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
	  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length)
	    end = this.length
	  if (target.length - target_start < end - start)
	    end = target.length - target_start + start

	  var len = end - start

	  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < len; i++) {
	      target[i + target_start] = this[i + start]
	    }
	  } else {
	    target._set(this.subarray(start, start + len), target_start)
	  }
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (end < start) throw new TypeError('end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
	  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

	  var i
	  if (typeof value === 'number') {
	    for (i = start; i < end; i++) {
	      this[i] = value
	    }
	  } else {
	    var bytes = utf8ToBytes(value.toString())
	    var len = bytes.length
	    for (i = start; i < end; i++) {
	      this[i] = bytes[i % len]
	    }
	  }

	  return this
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer.TYPED_ARRAY_SUPPORT) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1) {
	        buf[i] = this[i]
	      }
	      return buf.buffer
	    }
	  } else {
	    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function (arr) {
	  arr.constructor = Buffer
	  arr._isBuffer = true

	  // save reference to original Uint8Array get/set methods before overwriting
	  arr._get = arr.get
	  arr._set = arr.set

	  // deprecated, will be removed in node 0.13+
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.equals = BP.equals
	  arr.compare = BP.compare
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function isArrayish (subject) {
	  return isArray(subject) || Buffer.isBuffer(subject) ||
	      subject && typeof subject === 'object' &&
	      typeof subject.length === 'number'
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    var b = str.charCodeAt(i)
	    if (b <= 0x7F) {
	      byteArray.push(b)
	    } else {
	      var start = i
	      if (b >= 0xD800 && b <= 0xDFFF) i++
	      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
	      for (var j = 0; j < h.length; j++) {
	        byteArray.push(parseInt(h[j], 16))
	      }
	    }
	  }
	  return byteArray
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(str)
	}

	function blitBuffer (src, dst, offset, length, unitSize) {
	  if (unitSize) length -= length % unitSize;
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length))
	      break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	function decodeUtf8Char (str) {
	  try {
	    return decodeURIComponent(str)
	  } catch (err) {
	    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
	  }
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(45).Buffer))

/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	/*
	 * Simple task queue to sequentialize actions. Assumes callbacks will eventually fire (once).
	 */

	var Promise = __webpack_require__(49).Promise;

	function TaskQueue() {
	  this.promise = new Promise(function (fulfill) {fulfill(); });
	}
	TaskQueue.prototype.add = function (promiseFactory) {
	  this.promise = this.promise.catch(function () {
	    // just recover
	  }).then(function () {
	    return promiseFactory();
	  });
	  return this.promise;
	};
	TaskQueue.prototype.finish = function () {
	  return this.promise;
	};

	module.exports = TaskQueue;


/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var upsert = __webpack_require__(65);
	var utils = __webpack_require__(49);
	var Promise = utils.Promise;

	module.exports = function (opts) {
	  var sourceDB = opts.db;
	  var viewName = opts.viewName;
	  var mapFun = opts.map;
	  var reduceFun = opts.reduce;
	  var temporary = opts.temporary;

	  // the "undefined" part is for backwards compatibility
	  var viewSignature = mapFun.toString() + (reduceFun && reduceFun.toString()) +
	    'undefined';

	  if (!temporary && sourceDB._cachedViews) {
	    var cachedView = sourceDB._cachedViews[viewSignature];
	    if (cachedView) {
	      return Promise.resolve(cachedView);
	    }
	  }

	  return sourceDB.info().then(function (info) {

	    var depDbName = info.db_name + '-mrview-' +
	      (temporary ? 'temp' : utils.MD5(viewSignature));

	    // save the view name in the source PouchDB so it can be cleaned up if necessary
	    // (e.g. when the _design doc is deleted, remove all associated view data)
	    function diffFunction(doc) {
	      doc.views = doc.views || {};
	      var fullViewName = viewName;
	      if (fullViewName.indexOf('/') === -1) {
	        fullViewName = viewName + '/' + viewName;
	      }
	      var depDbs = doc.views[fullViewName] = doc.views[fullViewName] || {};
	      /* istanbul ignore if */
	      if (depDbs[depDbName]) {
	        return; // no update necessary
	      }
	      depDbs[depDbName] = true;
	      return doc;
	    }
	    return upsert(sourceDB, '_local/mrviews', diffFunction).then(function () {
	      return sourceDB.registerDependentDatabase(depDbName).then(function (res) {
	        var db = res.db;
	        db.auto_compaction = true;
	        var view = {
	          name: depDbName,
	          db: db, 
	          sourceDB: sourceDB,
	          adapter: sourceDB.adapter,
	          mapFun: mapFun,
	          reduceFun: reduceFun
	        };
	        return view.db.get('_local/lastSeq').catch(function (err) {
	          /* istanbul ignore if */
	          if (err.status !== 404) {
	            throw err;
	          }
	        }).then(function (lastSeqDoc) {
	          view.seq = lastSeqDoc ? lastSeqDoc.seq : 0;
	          if (!temporary) {
	            sourceDB._cachedViews = sourceDB._cachedViews || {};
	            sourceDB._cachedViews[viewSignature] = view;
	            view.db.on('destroyed', function () {
	              delete sourceDB._cachedViews[viewSignature];
	            });
	          }
	          return view;
	        });
	      });
	    });
	  });
	};


/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = function (func, emit, sum, log, isArray, toJSON) {
	  /*jshint evil:true,unused:false */
	  return eval("'use strict'; (" + func.replace(/;\s*$/, "") + ");");
	};


/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {'use strict';
	/* istanbul ignore if */
	if (typeof global.Promise === 'function') {
	  exports.Promise = global.Promise;
	} else {
	  exports.Promise = __webpack_require__(50);
	}

	exports.inherits = __webpack_require__(51);
	exports.extend = __webpack_require__(39);
	var argsarray = __webpack_require__(40);

	exports.promisedCallback = function (promise, callback) {
	  if (callback) {
	    promise.then(function (res) {
	      process.nextTick(function () {
	        callback(null, res);
	      });
	    }, function (reason) {
	      process.nextTick(function () {
	        callback(reason);
	      });
	    });
	  }
	  return promise;
	};

	exports.callbackify = function (fun) {
	  return argsarray(function (args) {
	    var cb = args.pop();
	    var promise = fun.apply(this, args);
	    if (typeof cb === 'function') {
	      exports.promisedCallback(promise, cb);
	    }
	    return promise;
	  });
	};

	// Promise finally util similar to Q.finally
	exports.fin = function (promise, cb) {
	  return promise.then(function (res) {
	    var promise2 = cb();
	    if (typeof promise2.then === 'function') {
	      return promise2.then(function () {
	        return res;
	      });
	    }
	    return res;
	  }, function (reason) {
	    var promise2 = cb();
	    if (typeof promise2.then === 'function') {
	      return promise2.then(function () {
	        throw reason;
	      });
	    }
	    throw reason;
	  });
	};

	exports.sequentialize = function (queue, promiseFactory) {
	  return function () {
	    var args = arguments;
	    var that = this;
	    return queue.add(function () {
	      return promiseFactory.apply(that, args);
	    });
	  };
	};

	exports.flatten = function (arrs) {
	  var res = [];
	  for (var i = 0, len = arrs.length; i < len; i++) {
	    res = res.concat(arrs[i]);
	  }
	  return res;
	};

	// uniq an array of strings, order not guaranteed
	// similar to underscore/lodash _.uniq
	exports.uniq = function (arr) {
	  var map = {};

	  for (var i = 0, len = arr.length; i < len; i++) {
	    map['$' + arr[i]] = true;
	  }

	  var keys = Object.keys(map);
	  var output = new Array(keys.length);

	  for (i = 0, len = keys.length; i < len; i++) {
	    output[i] = keys[i].substring(1);
	  }
	  return output;
	};

	var crypto = __webpack_require__(60);
	var Md5 = __webpack_require__(67);

	exports.MD5 = function (string) {
	  /* istanbul ignore else */
	  if (!process.browser) {
	    return crypto.createHash('md5').update(string).digest('hex');
	  } else {
	    return Md5.hash(string);
	  }
	};
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(13)))

/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
	'use strict';

	module.exports = INTERNAL;

	function INTERNAL() {}
	},{}],2:[function(_dereq_,module,exports){
	'use strict';
	var Promise = _dereq_('./promise');
	var reject = _dereq_('./reject');
	var resolve = _dereq_('./resolve');
	var INTERNAL = _dereq_('./INTERNAL');
	var handlers = _dereq_('./handlers');
	module.exports = all;
	function all(iterable) {
	  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
	    return reject(new TypeError('must be an array'));
	  }

	  var len = iterable.length;
	  var called = false;
	  if (!len) {
	    return resolve([]);
	  }

	  var values = new Array(len);
	  var resolved = 0;
	  var i = -1;
	  var promise = new Promise(INTERNAL);
	  
	  while (++i < len) {
	    allResolver(iterable[i], i);
	  }
	  return promise;
	  function allResolver(value, i) {
	    resolve(value).then(resolveFromAll, function (error) {
	      if (!called) {
	        called = true;
	        handlers.reject(promise, error);
	      }
	    });
	    function resolveFromAll(outValue) {
	      values[i] = outValue;
	      if (++resolved === len & !called) {
	        called = true;
	        handlers.resolve(promise, values);
	      }
	    }
	  }
	}
	},{"./INTERNAL":1,"./handlers":3,"./promise":5,"./reject":8,"./resolve":9}],3:[function(_dereq_,module,exports){
	'use strict';
	var tryCatch = _dereq_('./tryCatch');
	var resolveThenable = _dereq_('./resolveThenable');
	var states = _dereq_('./states');

	exports.resolve = function (self, value) {
	  var result = tryCatch(getThen, value);
	  if (result.status === 'error') {
	    return exports.reject(self, result.value);
	  }
	  var thenable = result.value;

	  if (thenable) {
	    resolveThenable.safely(self, thenable);
	  } else {
	    self.state = states.FULFILLED;
	    self.outcome = value;
	    var i = -1;
	    var len = self.queue.length;
	    while (++i < len) {
	      self.queue[i].callFulfilled(value);
	    }
	  }
	  return self;
	};
	exports.reject = function (self, error) {
	  self.state = states.REJECTED;
	  self.outcome = error;
	  var i = -1;
	  var len = self.queue.length;
	  while (++i < len) {
	    self.queue[i].callRejected(error);
	  }
	  return self;
	};

	function getThen(obj) {
	  // Make sure we only access the accessor once as required by the spec
	  var then = obj && obj.then;
	  if (obj && typeof obj === 'object' && typeof then === 'function') {
	    return function appyThen() {
	      then.apply(obj, arguments);
	    };
	  }
	}
	},{"./resolveThenable":10,"./states":11,"./tryCatch":12}],4:[function(_dereq_,module,exports){
	module.exports = exports = _dereq_('./promise');

	exports.resolve = _dereq_('./resolve');
	exports.reject = _dereq_('./reject');
	exports.all = _dereq_('./all');
	exports.race = _dereq_('./race');
	},{"./all":2,"./promise":5,"./race":7,"./reject":8,"./resolve":9}],5:[function(_dereq_,module,exports){
	'use strict';

	var unwrap = _dereq_('./unwrap');
	var INTERNAL = _dereq_('./INTERNAL');
	var resolveThenable = _dereq_('./resolveThenable');
	var states = _dereq_('./states');
	var QueueItem = _dereq_('./queueItem');

	module.exports = Promise;
	function Promise(resolver) {
	  if (!(this instanceof Promise)) {
	    return new Promise(resolver);
	  }
	  if (typeof resolver !== 'function') {
	    throw new TypeError('resolver must be a function');
	  }
	  this.state = states.PENDING;
	  this.queue = [];
	  this.outcome = void 0;
	  if (resolver !== INTERNAL) {
	    resolveThenable.safely(this, resolver);
	  }
	}

	Promise.prototype['catch'] = function (onRejected) {
	  return this.then(null, onRejected);
	};
	Promise.prototype.then = function (onFulfilled, onRejected) {
	  if (typeof onFulfilled !== 'function' && this.state === states.FULFILLED ||
	    typeof onRejected !== 'function' && this.state === states.REJECTED) {
	    return this;
	  }
	  var promise = new Promise(INTERNAL);

	  
	  if (this.state !== states.PENDING) {
	    var resolver = this.state === states.FULFILLED ? onFulfilled: onRejected;
	    unwrap(promise, resolver, this.outcome);
	  } else {
	    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
	  }

	  return promise;
	};

	},{"./INTERNAL":1,"./queueItem":6,"./resolveThenable":10,"./states":11,"./unwrap":13}],6:[function(_dereq_,module,exports){
	'use strict';
	var handlers = _dereq_('./handlers');
	var unwrap = _dereq_('./unwrap');

	module.exports = QueueItem;
	function QueueItem(promise, onFulfilled, onRejected) {
	  this.promise = promise;
	  if (typeof onFulfilled === 'function') {
	    this.onFulfilled = onFulfilled;
	    this.callFulfilled = this.otherCallFulfilled;
	  }
	  if (typeof onRejected === 'function') {
	    this.onRejected = onRejected;
	    this.callRejected = this.otherCallRejected;
	  }
	}
	QueueItem.prototype.callFulfilled = function (value) {
	  handlers.resolve(this.promise, value);
	};
	QueueItem.prototype.otherCallFulfilled = function (value) {
	  unwrap(this.promise, this.onFulfilled, value);
	};
	QueueItem.prototype.callRejected = function (value) {
	  handlers.reject(this.promise, value);
	};
	QueueItem.prototype.otherCallRejected = function (value) {
	  unwrap(this.promise, this.onRejected, value);
	};
	},{"./handlers":3,"./unwrap":13}],7:[function(_dereq_,module,exports){
	'use strict';
	var Promise = _dereq_('./promise');
	var reject = _dereq_('./reject');
	var resolve = _dereq_('./resolve');
	var INTERNAL = _dereq_('./INTERNAL');
	var handlers = _dereq_('./handlers');
	module.exports = race;
	function race(iterable) {
	  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
	    return reject(new TypeError('must be an array'));
	  }

	  var len = iterable.length;
	  var called = false;
	  if (!len) {
	    return resolve([]);
	  }

	  var resolved = 0;
	  var i = -1;
	  var promise = new Promise(INTERNAL);
	  
	  while (++i < len) {
	    resolver(iterable[i]);
	  }
	  return promise;
	  function resolver(value) {
	    resolve(value).then(function (response) {
	      if (!called) {
	        called = true;
	        handlers.resolve(promise, response);
	      }
	    }, function (error) {
	      if (!called) {
	        called = true;
	        handlers.reject(promise, error);
	      }
	    });
	  }
	}
	},{"./INTERNAL":1,"./handlers":3,"./promise":5,"./reject":8,"./resolve":9}],8:[function(_dereq_,module,exports){
	'use strict';

	var Promise = _dereq_('./promise');
	var INTERNAL = _dereq_('./INTERNAL');
	var handlers = _dereq_('./handlers');
	module.exports = reject;

	function reject(reason) {
		var promise = new Promise(INTERNAL);
		return handlers.reject(promise, reason);
	}
	},{"./INTERNAL":1,"./handlers":3,"./promise":5}],9:[function(_dereq_,module,exports){
	'use strict';

	var Promise = _dereq_('./promise');
	var INTERNAL = _dereq_('./INTERNAL');
	var handlers = _dereq_('./handlers');
	module.exports = resolve;

	var FALSE = handlers.resolve(new Promise(INTERNAL), false);
	var NULL = handlers.resolve(new Promise(INTERNAL), null);
	var UNDEFINED = handlers.resolve(new Promise(INTERNAL), void 0);
	var ZERO = handlers.resolve(new Promise(INTERNAL), 0);
	var EMPTYSTRING = handlers.resolve(new Promise(INTERNAL), '');

	function resolve(value) {
	  if (value) {
	    if (value instanceof Promise) {
	      return value;
	    }
	    return handlers.resolve(new Promise(INTERNAL), value);
	  }
	  var valueType = typeof value;
	  switch (valueType) {
	    case 'boolean':
	      return FALSE;
	    case 'undefined':
	      return UNDEFINED;
	    case 'object':
	      return NULL;
	    case 'number':
	      return ZERO;
	    case 'string':
	      return EMPTYSTRING;
	  }
	}
	},{"./INTERNAL":1,"./handlers":3,"./promise":5}],10:[function(_dereq_,module,exports){
	'use strict';
	var handlers = _dereq_('./handlers');
	var tryCatch = _dereq_('./tryCatch');
	function safelyResolveThenable(self, thenable) {
	  // Either fulfill, reject or reject with error
	  var called = false;
	  function onError(value) {
	    if (called) {
	      return;
	    }
	    called = true;
	    handlers.reject(self, value);
	  }

	  function onSuccess(value) {
	    if (called) {
	      return;
	    }
	    called = true;
	    handlers.resolve(self, value);
	  }

	  function tryToUnwrap() {
	    thenable(onSuccess, onError);
	  }
	  
	  var result = tryCatch(tryToUnwrap);
	  if (result.status === 'error') {
	    onError(result.value);
	  }
	}
	exports.safely = safelyResolveThenable;
	},{"./handlers":3,"./tryCatch":12}],11:[function(_dereq_,module,exports){
	// Lazy man's symbols for states

	exports.REJECTED = ['REJECTED'];
	exports.FULFILLED = ['FULFILLED'];
	exports.PENDING = ['PENDING'];
	},{}],12:[function(_dereq_,module,exports){
	'use strict';

	module.exports = tryCatch;

	function tryCatch(func, value) {
	  var out = {};
	  try {
	    out.value = func(value);
	    out.status = 'success';
	  } catch (e) {
	    out.status = 'error';
	    out.value = e;
	  }
	  return out;
	}
	},{}],13:[function(_dereq_,module,exports){
	'use strict';

	var immediate = _dereq_('immediate');
	var handlers = _dereq_('./handlers');
	module.exports = unwrap;

	function unwrap(promise, func, value) {
	  immediate(function () {
	    var returnValue;
	    try {
	      returnValue = func(value);
	    } catch (e) {
	      return handlers.reject(promise, e);
	    }
	    if (returnValue === promise) {
	      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
	    } else {
	      handlers.resolve(promise, returnValue);
	    }
	  });
	}
	},{"./handlers":3,"immediate":15}],14:[function(_dereq_,module,exports){

	},{}],15:[function(_dereq_,module,exports){
	'use strict';
	var types = [
	  _dereq_('./nextTick'),
	  _dereq_('./mutation.js'),
	  _dereq_('./messageChannel'),
	  _dereq_('./stateChange'),
	  _dereq_('./timeout')
	];
	var draining;
	var queue = [];
	function drainQueue() {
	  draining = true;
	  var i, oldQueue;
	  var len = queue.length;
	  while (len) {
	    oldQueue = queue;
	    queue = [];
	    i = -1;
	    while (++i < len) {
	      oldQueue[i]();
	    }
	    len = queue.length;
	  }
	  draining = false;
	}
	var scheduleDrain;
	var i = -1;
	var len = types.length;
	while (++ i < len) {
	  if (types[i] && types[i].test && types[i].test()) {
	    scheduleDrain = types[i].install(drainQueue);
	    break;
	  }
	}
	module.exports = immediate;
	function immediate(task) {
	  if (queue.push(task) === 1 && !draining) {
	    scheduleDrain();
	  }
	}
	},{"./messageChannel":16,"./mutation.js":17,"./nextTick":14,"./stateChange":18,"./timeout":19}],16:[function(_dereq_,module,exports){
	(function (global){
	'use strict';

	exports.test = function () {
	  if (global.setImmediate) {
	    // we can only get here in IE10
	    // which doesn't handel postMessage well
	    return false;
	  }
	  return typeof global.MessageChannel !== 'undefined';
	};

	exports.install = function (func) {
	  var channel = new global.MessageChannel();
	  channel.port1.onmessage = func;
	  return function () {
	    channel.port2.postMessage(0);
	  };
	};
	}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
	},{}],17:[function(_dereq_,module,exports){
	(function (global){
	'use strict';
	//based off rsvp https://github.com/tildeio/rsvp.js
	//license https://github.com/tildeio/rsvp.js/blob/master/LICENSE
	//https://github.com/tildeio/rsvp.js/blob/master/lib/rsvp/asap.js

	var Mutation = global.MutationObserver || global.WebKitMutationObserver;

	exports.test = function () {
	  return Mutation;
	};

	exports.install = function (handle) {
	  var called = 0;
	  var observer = new Mutation(handle);
	  var element = global.document.createTextNode('');
	  observer.observe(element, {
	    characterData: true
	  });
	  return function () {
	    element.data = (called = ++called % 2);
	  };
	};
	}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
	},{}],18:[function(_dereq_,module,exports){
	(function (global){
	'use strict';

	exports.test = function () {
	  return 'document' in global && 'onreadystatechange' in global.document.createElement('script');
	};

	exports.install = function (handle) {
	  return function () {

	    // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
	    // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
	    var scriptEl = global.document.createElement('script');
	    scriptEl.onreadystatechange = function () {
	      handle();

	      scriptEl.onreadystatechange = null;
	      scriptEl.parentNode.removeChild(scriptEl);
	      scriptEl = null;
	    };
	    global.document.documentElement.appendChild(scriptEl);

	    return handle;
	  };
	};
	}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
	},{}],19:[function(_dereq_,module,exports){
	'use strict';
	exports.test = function () {
	  return true;
	};

	exports.install = function (t) {
	  return function () {
	    setTimeout(t, 0);
	  };
	};
	},{}]},{},[4])(4)
	});


/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * This is the web browser implementation of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = __webpack_require__(66);
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = 'undefined' != typeof chrome
	               && 'undefined' != typeof chrome.storage
	                  ? chrome.storage.local
	                  : localstorage();

	/**
	 * Colors.
	 */

	exports.colors = [
	  'lightseagreen',
	  'forestgreen',
	  'goldenrod',
	  'dodgerblue',
	  'darkorchid',
	  'crimson'
	];

	/**
	 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
	 * and the Firebug extension (any Firefox version) are known
	 * to support "%c" CSS customizations.
	 *
	 * TODO: add a `localStorage` variable to explicitly enable/disable colors
	 */

	function useColors() {
	  // is webkit? http://stackoverflow.com/a/16459606/376773
	  return ('WebkitAppearance' in document.documentElement.style) ||
	    // is firebug? http://stackoverflow.com/a/398120/376773
	    (window.console && (console.firebug || (console.exception && console.table))) ||
	    // is firefox >= v31?
	    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
	    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
	}

	/**
	 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	 */

	exports.formatters.j = function(v) {
	  return JSON.stringify(v);
	};


	/**
	 * Colorize log arguments if enabled.
	 *
	 * @api public
	 */

	function formatArgs() {
	  var args = arguments;
	  var useColors = this.useColors;

	  args[0] = (useColors ? '%c' : '')
	    + this.namespace
	    + (useColors ? ' %c' : ' ')
	    + args[0]
	    + (useColors ? '%c ' : ' ')
	    + '+' + exports.humanize(this.diff);

	  if (!useColors) return args;

	  var c = 'color: ' + this.color;
	  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

	  // the final "%c" is somewhat tricky, because there could be other
	  // arguments passed either before or after the %c, so we need to
	  // figure out the correct index to insert the CSS into
	  var index = 0;
	  var lastC = 0;
	  args[0].replace(/%[a-z%]/g, function(match) {
	    if ('%%' === match) return;
	    index++;
	    if ('%c' === match) {
	      // we only are interested in the *last* %c
	      // (the user may have provided their own)
	      lastC = index;
	    }
	  });

	  args.splice(lastC, 0, c);
	  return args;
	}

	/**
	 * Invokes `console.log()` when available.
	 * No-op when `console.log` is not a "function".
	 *
	 * @api public
	 */

	function log() {
	  // this hackery is required for IE8/9, where
	  // the `console.log` function doesn't have 'apply'
	  return 'object' === typeof console
	    && console.log
	    && Function.prototype.apply.call(console.log, console, arguments);
	}

	/**
	 * Save `namespaces`.
	 *
	 * @param {String} namespaces
	 * @api private
	 */

	function save(namespaces) {
	  try {
	    if (null == namespaces) {
	      exports.storage.removeItem('debug');
	    } else {
	      exports.storage.debug = namespaces;
	    }
	  } catch(e) {}
	}

	/**
	 * Load `namespaces`.
	 *
	 * @return {String} returns the previously persisted debug modes
	 * @api private
	 */

	function load() {
	  var r;
	  try {
	    r = exports.storage.debug;
	  } catch(e) {}
	  return r;
	}

	/**
	 * Enable namespaces listed in `localStorage.debug` initially.
	 */

	exports.enable(load());

	/**
	 * Localstorage attempts to return the localstorage.
	 *
	 * This is necessary because safari throws
	 * when a user disables cookies/localstorage
	 * and you attempt to access it.
	 *
	 * @return {LocalStorage}
	 * @api private
	 */

	function localstorage(){
	  try {
	    return window.localStorage;
	  } catch (e) {}
	}


/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var utils = __webpack_require__(4);
	var merge = __webpack_require__(19);
	var errors = __webpack_require__(5);
	var EventEmitter = __webpack_require__(38).EventEmitter;
	var upsert = __webpack_require__(68);
	var Changes = __webpack_require__(69);
	var Promise = utils.Promise;

	/*
	 * A generic pouch adapter
	 */

	// returns first element of arr satisfying callback predicate
	function arrayFirst(arr, callback) {
	  for (var i = 0; i < arr.length; i++) {
	    if (callback(arr[i], i) === true) {
	      return arr[i];
	    }
	  }
	  return false;
	}

	// Wrapper for functions that call the bulkdocs api with a single doc,
	// if the first result is an error, return an error
	function yankError(callback) {
	  return function (err, results) {
	    if (err || (results[0] && results[0].error)) {
	      callback(err || results[0]);
	    } else {
	      callback(null, results.length ? results[0]  : results);
	    }
	  };
	}

	// for every node in a revision tree computes its distance from the closest
	// leaf
	function computeHeight(revs) {
	  var height = {};
	  var edges = [];
	  merge.traverseRevTree(revs, function (isLeaf, pos, id, prnt) {
	    var rev = pos + "-" + id;
	    if (isLeaf) {
	      height[rev] = 0;
	    }
	    if (prnt !== undefined) {
	      edges.push({from: prnt, to: rev});
	    }
	    return rev;
	  });

	  edges.reverse();
	  edges.forEach(function (edge) {
	    if (height[edge.from] === undefined) {
	      height[edge.from] = 1 + height[edge.to];
	    } else {
	      height[edge.from] = Math.min(height[edge.from], 1 + height[edge.to]);
	    }
	  });
	  return height;
	}

	function allDocsKeysQuery(api, opts, callback) {
	  var keys =  ('limit' in opts) ?
	      opts.keys.slice(opts.skip, opts.limit + opts.skip) :
	      (opts.skip > 0) ? opts.keys.slice(opts.skip) : opts.keys;
	  if (opts.descending) {
	    keys.reverse();
	  }
	  if (!keys.length) {
	    return api._allDocs({limit: 0}, callback);
	  }
	  var finalResults = {
	    offset: opts.skip
	  };
	  return Promise.all(keys.map(function (key) {
	    var subOpts = utils.extend(true, {key: key, deleted: 'ok'}, opts);
	    ['limit', 'skip', 'keys'].forEach(function (optKey) {
	      delete subOpts[optKey];
	    });
	    return new Promise(function (resolve, reject) {
	      api._allDocs(subOpts, function (err, res) {
	        if (err) {
	          return reject(err);
	        }
	        finalResults.total_rows = res.total_rows;
	        resolve(res.rows[0] || {key: key, error: 'not_found'});
	      });
	    });
	  })).then(function (results) {
	    finalResults.rows = results;
	    return finalResults;
	  });
	}

	utils.inherits(AbstractPouchDB, EventEmitter);
	module.exports = AbstractPouchDB;

	function AbstractPouchDB() {
	  var self = this;
	  EventEmitter.call(this);

	  var listeners = 0, changes;
	  var eventNames = ['change', 'delete', 'create', 'update'];
	  this.on('newListener', function (eventName) {
	    if (~eventNames.indexOf(eventName)) {
	      if (listeners) {
	        listeners++;
	        return;
	      } else {
	        listeners++;
	      }
	    } else {
	      return;
	    }
	    var lastChange = 0;
	    changes = this.changes({
	      conflicts: true,
	      include_docs: true,
	      continuous: true,
	      since: 'now',
	      onChange: function (change) {
	        if (change.seq <= lastChange) {
	          return;
	        }
	        lastChange = change.seq;
	        self.emit('change', change);
	        if (change.doc._deleted) {
	          self.emit('delete', change);
	        } else if (change.doc._rev.split('-')[0] === '1') {
	          self.emit('create', change);
	        } else {
	          self.emit('update', change);
	        }
	      }
	    });
	  });
	  this.on('removeListener', function (eventName) {
	    if (~eventNames.indexOf(eventName)) {
	      listeners--;
	      if (listeners) {
	        return;
	      }
	    } else {
	      return;
	    }
	    changes.cancel();
	  });
	}

	AbstractPouchDB.prototype.post =
	  utils.adapterFun('post', function (doc, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  if (typeof doc !== 'object' || Array.isArray(doc)) {
	    return callback(errors.error(errors.NOT_AN_OBJECT));
	  }
	  this.bulkDocs({docs: [doc]}, opts, yankError(callback));
	});

	AbstractPouchDB.prototype.put =
	  utils.adapterFun('put', utils.getArguments(function (args) {
	  var temp, temptype, opts, callback;
	  var doc = args.shift();
	  var id = '_id' in doc;
	  if (typeof doc !== 'object' || Array.isArray(doc)) {
	    callback = args.pop();
	    return callback(errors.error(errors.NOT_AN_OBJECT));
	  }
	  doc = utils.clone(doc);
	  while (true) {
	    temp = args.shift();
	    temptype = typeof temp;
	    if (temptype === "string" && !id) {
	      doc._id = temp;
	      id = true;
	    } else if (temptype === "string" && id && !('_rev' in doc)) {
	      doc._rev = temp;
	    } else if (temptype === "object") {
	      opts = temp;
	    } else if (temptype === "function") {
	      callback = temp;
	    }
	    if (!args.length) {
	      break;
	    }
	  }
	  opts = opts || {};
	  var error = utils.invalidIdError(doc._id);
	  if (error) {
	    return callback(error);
	  }
	  if (utils.isLocalId(doc._id) && typeof this._putLocal === 'function') {
	    if (doc._deleted) {
	      return this._removeLocal(doc, callback);
	    } else {
	      return this._putLocal(doc, callback);
	    }
	  }
	  this.bulkDocs({docs: [doc]}, opts, yankError(callback));
	}));

	AbstractPouchDB.prototype.putAttachment =
	  utils.adapterFun('putAttachment', function (docId, attachmentId, rev,
	                                              blob, type, callback) {
	  var api = this;
	  if (typeof type === 'function') {
	    callback = type;
	    type = blob;
	    blob = rev;
	    rev = null;
	  }
	  if (typeof type === 'undefined') {
	    type = blob;
	    blob = rev;
	    rev = null;
	  }

	  function createAttachment(doc) {
	    doc._attachments = doc._attachments || {};
	    doc._attachments[attachmentId] = {
	      content_type: type,
	      data: blob
	    };
	    return api.put(doc);
	  }

	  return api.get(docId).then(function (doc) {
	    if (doc._rev !== rev) {
	      throw errors.error(errors.REV_CONFLICT);
	    }

	    return createAttachment(doc);
	  }, function (err) {
	     // create new doc
	    if (err.reason === errors.MISSING_DOC.message) {
	      return createAttachment({_id: docId});
	    } else {
	      throw err;
	    }
	  });
	});

	AbstractPouchDB.prototype.removeAttachment =
	  utils.adapterFun('removeAttachment', function (docId, attachmentId, rev,
	                                                 callback) {
	  var self = this;
	  self.get(docId, function (err, obj) {
	    if (err) {
	      callback(err);
	      return;
	    }
	    if (obj._rev !== rev) {
	      callback(errors.error(errors.REV_CONFLICT));
	      return;
	    }
	    if (!obj._attachments) {
	      return callback();
	    }
	    delete obj._attachments[attachmentId];
	    if (Object.keys(obj._attachments).length === 0) {
	      delete obj._attachments;
	    }
	    self.put(obj, callback);
	  });
	});

	AbstractPouchDB.prototype.remove =
	  utils.adapterFun('remove', function (docOrId, optsOrRev, opts, callback) {
	  var doc;
	  if (typeof optsOrRev === 'string') {
	    // id, rev, opts, callback style
	    doc = {
	      _id: docOrId,
	      _rev: optsOrRev
	    };
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	  } else {
	    // doc, opts, callback style
	    doc = docOrId;
	    if (typeof optsOrRev === 'function') {
	      callback = optsOrRev;
	      opts = {};
	    } else {
	      callback = opts;
	      opts = optsOrRev;
	    }
	  }
	  opts = utils.clone(opts || {});
	  opts.was_delete = true;
	  var newDoc = {_id: doc._id, _rev: (doc._rev || opts.rev)};
	  newDoc._deleted = true;
	  if (utils.isLocalId(newDoc._id) && typeof this._removeLocal === 'function') {
	    return this._removeLocal(doc, callback);
	  }
	  this.bulkDocs({docs: [newDoc]}, opts, yankError(callback));
	});

	AbstractPouchDB.prototype.revsDiff =
	  utils.adapterFun('revsDiff', function (req, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  opts = utils.clone(opts);
	  var ids = Object.keys(req);

	  if (!ids.length) {
	    return callback(null, {});
	  }

	  var count = 0;
	  var missing = new utils.Map();

	  function addToMissing(id, revId) {
	    if (!missing.has(id)) {
	      missing.set(id, {missing: []});
	    }
	    missing.get(id).missing.push(revId);
	  }

	  function processDoc(id, rev_tree) {
	    // Is this fast enough? Maybe we should switch to a set simulated by a map
	    var missingForId = req[id].slice(0);
	    merge.traverseRevTree(rev_tree, function (isLeaf, pos, revHash, ctx,
	      opts) {
	        var rev = pos + '-' + revHash;
	        var idx = missingForId.indexOf(rev);
	        if (idx === -1) {
	          return;
	        }

	        missingForId.splice(idx, 1);
	        if (opts.status !== 'available') {
	          addToMissing(id, rev);
	        }
	      });

	    // Traversing the tree is synchronous, so now `missingForId` contains
	    // revisions that were not found in the tree
	    missingForId.forEach(function (rev) {
	      addToMissing(id, rev);
	    });
	  }

	  ids.map(function (id) {
	    this._getRevisionTree(id, function (err, rev_tree) {
	      if (err && err.status === 404 && err.message === 'missing') {
	        missing.set(id, {missing: req[id]});
	      } else if (err) {
	        return callback(err);
	      } else {
	        processDoc(id, rev_tree);
	      }

	      if (++count === ids.length) {
	        // convert LazyMap to object
	        var missingObj = {};
	        missing.forEach(function (value, key) {
	          missingObj[key] = value;
	        });
	        return callback(null, missingObj);
	      }
	    });
	  }, this);
	});

	// compact one document and fire callback
	// by compacting we mean removing all revisions which
	// are further from the leaf in revision tree than max_height
	AbstractPouchDB.prototype.compactDocument =
	  utils.adapterFun('compactDocument', function (docId, maxHeight, callback) {
	  var self = this;
	  this._getRevisionTree(docId, function (err, revTree) {
	    if (err) {
	      return callback(err);
	    }
	    var height = computeHeight(revTree);
	    var candidates = [];
	    var revs = [];
	    Object.keys(height).forEach(function (rev) {
	      if (height[rev] > maxHeight) {
	        candidates.push(rev);
	      }
	    });

	    merge.traverseRevTree(revTree, function (isLeaf, pos, revHash, ctx, opts) {
	      var rev = pos + '-' + revHash;
	      if (opts.status === 'available' && candidates.indexOf(rev) !== -1) {
	        revs.push(rev);
	      }
	    });
	    self._doCompaction(docId, revs, callback);
	  });
	});

	// compact the whole database using single document
	// compaction
	AbstractPouchDB.prototype.compact =
	  utils.adapterFun('compact', function (opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  var self = this;

	  opts = utils.clone(opts || {});

	  self.get('_local/compaction').catch(function () {
	    return false;
	  }).then(function (doc) {
	    if (typeof self._compact === 'function') {
	      if (doc && doc.last_seq) {
	        opts.last_seq = doc.last_seq;
	      }
	      return self._compact(opts, callback);
	    }

	  });
	});
	AbstractPouchDB.prototype._compact = function (opts, callback) {
	  var self = this;
	  var changesOpts = {
	    returnDocs: false,
	    last_seq: opts.last_seq || 0
	  };
	  var promises = [];

	  function onChange(row) {
	    promises.push(self.compactDocument(row.id, 0));
	  }
	  function onComplete(resp) {
	    var lastSeq = resp.last_seq;
	    Promise.all(promises).then(function () {
	      return upsert(self, '_local/compaction', function deltaFunc(doc) {
	        if (!doc.last_seq || doc.last_seq < lastSeq) {
	          doc.last_seq = lastSeq;
	          return doc;
	        }
	        return false; // somebody else got here first, don't update
	      });
	    }).then(function () {
	      callback(null, {ok: true});
	    }).catch(callback);
	  }
	  self.changes(changesOpts)
	    .on('change', onChange)
	    .on('complete', onComplete)
	    .on('error', callback);
	};
	/* Begin api wrappers. Specific functionality to storage belongs in the 
	   _[method] */
	AbstractPouchDB.prototype.get =
	  utils.adapterFun('get', function (id, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  if (typeof id !== 'string') {
	    return callback(errors.error(errors.INVALID_ID));
	  }
	  if (utils.isLocalId(id) && typeof this._getLocal === 'function') {
	    return this._getLocal(id, callback);
	  }
	  var leaves = [], self = this;

	  function finishOpenRevs() {
	    var result = [];
	    var count = leaves.length;
	    if (!count) {
	      return callback(null, result);
	    }
	    // order with open_revs is unspecified
	    leaves.forEach(function (leaf) {
	      self.get(id, {
	        rev: leaf,
	        revs: opts.revs,
	        attachments: opts.attachments
	      }, function (err, doc) {
	        if (!err) {
	          result.push({ok: doc});
	        } else {
	          result.push({missing: leaf});
	        }
	        count--;
	        if (!count) {
	          callback(null, result);
	        }
	      });
	    });
	  }

	  if (opts.open_revs) {
	    if (opts.open_revs === "all") {
	      this._getRevisionTree(id, function (err, rev_tree) {
	        if (err) {
	          return callback(err);
	        }
	        leaves = merge.collectLeaves(rev_tree).map(function (leaf) {
	          return leaf.rev;
	        });
	        finishOpenRevs();
	      });
	    } else {
	      if (Array.isArray(opts.open_revs)) {
	        leaves = opts.open_revs;
	        for (var i = 0; i < leaves.length; i++) {
	          var l = leaves[i];
	          // looks like it's the only thing couchdb checks
	          if (!(typeof(l) === "string" && /^\d+-/.test(l))) {
	            return callback(errors.error(errors.INVALID_REV));
	          }
	        }
	        finishOpenRevs();
	      } else {
	        return callback(errors.error(errors.UNKNOWN_ERROR,
	          'function_clause'));
	      }
	    }
	    return; // open_revs does not like other options
	  }

	  return this._get(id, opts, function (err, result) {
	    opts = utils.clone(opts);
	    if (err) {
	      return callback(err);
	    }

	    var doc = result.doc;
	    var metadata = result.metadata;
	    var ctx = result.ctx;

	    if (opts.conflicts) {
	      var conflicts = merge.collectConflicts(metadata);
	      if (conflicts.length) {
	        doc._conflicts = conflicts;
	      }
	    }

	    if (utils.isDeleted(metadata, doc._rev)) {
	      doc._deleted = true;
	    }

	    if (opts.revs || opts.revs_info) {
	      var paths = merge.rootToLeaf(metadata.rev_tree);
	      var path = arrayFirst(paths, function (arr) {
	        return arr.ids.map(function (x) { return x.id; })
	          .indexOf(doc._rev.split('-')[1]) !== -1;
	      });

	      var indexOfRev = path.ids.map(function (x) {return x.id; })
	        .indexOf(doc._rev.split('-')[1]) + 1;
	      var howMany = path.ids.length - indexOfRev;
	      path.ids.splice(indexOfRev, howMany);
	      path.ids.reverse();

	      if (opts.revs) {
	        doc._revisions = {
	          start: (path.pos + path.ids.length) - 1,
	          ids: path.ids.map(function (rev) {
	            return rev.id;
	          })
	        };
	      }
	      if (opts.revs_info) {
	        var pos =  path.pos + path.ids.length;
	        doc._revs_info = path.ids.map(function (rev) {
	          pos--;
	          return {
	            rev: pos + '-' + rev.id,
	            status: rev.opts.status
	          };
	        });
	      }
	    }

	    if (opts.local_seq) {
	      utils.info('The "local_seq" option is deprecated and will be removed');
	      doc._local_seq = result.metadata.seq;
	    }

	    if (opts.attachments && doc._attachments) {
	      var attachments = doc._attachments;
	      var count = Object.keys(attachments).length;
	      if (count === 0) {
	        return callback(null, doc);
	      }
	      Object.keys(attachments).forEach(function (key) {
	        this._getAttachment(attachments[key],
	                            {encode: true, ctx: ctx}, function (err, data) {
	          var att = doc._attachments[key];
	          att.data = data;
	          delete att.stub;
	          delete att.length;
	          if (!--count) {
	            callback(null, doc);
	          }
	        });
	      }, self);
	    } else {
	      if (doc._attachments) {
	        for (var key in doc._attachments) {
	          if (doc._attachments.hasOwnProperty(key)) {
	            doc._attachments[key].stub = true;
	          }
	        }
	      }
	      callback(null, doc);
	    }
	  });
	});

	AbstractPouchDB.prototype.getAttachment =
	  utils.adapterFun('getAttachment', function (docId, attachmentId, opts,
	                                              callback) {
	  var self = this;
	  if (opts instanceof Function) {
	    callback = opts;
	    opts = {};
	  }
	  opts = utils.clone(opts);
	  this._get(docId, opts, function (err, res) {
	    if (err) {
	      return callback(err);
	    }
	    if (res.doc._attachments && res.doc._attachments[attachmentId]) {
	      opts.ctx = res.ctx;
	      self._getAttachment(res.doc._attachments[attachmentId], opts, callback);
	    } else {
	      return callback(errors.error(errors.MISSING_DOC));
	    }
	  });
	});

	AbstractPouchDB.prototype.allDocs =
	  utils.adapterFun('allDocs', function (opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  opts = utils.clone(opts);
	  opts.skip = typeof opts.skip !== 'undefined' ? opts.skip : 0;
	  if ('keys' in opts) {
	    if (!Array.isArray(opts.keys)) {
	      return callback(new TypeError('options.keys must be an array'));
	    }
	    var incompatibleOpt =
	      ['startkey', 'endkey', 'key'].filter(function (incompatibleOpt) {
	      return incompatibleOpt in opts;
	    })[0];
	    if (incompatibleOpt) {
	      callback(errors.error(errors.QUERY_PARSE_ERROR,
	        'Query parameter `' + incompatibleOpt +
	        '` is not compatible with multi-get'
	      ));
	      return;
	    }
	    if (this.type() !== 'http') {
	      return allDocsKeysQuery(this, opts, callback);
	    }
	  }

	  return this._allDocs(opts, callback);
	});

	AbstractPouchDB.prototype.changes = function (opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  return new Changes(this, opts, callback);
	};

	AbstractPouchDB.prototype.close =
	  utils.adapterFun('close', function (callback) {
	  this._closed = true;
	  return this._close(callback);
	});

	AbstractPouchDB.prototype.info = utils.adapterFun('info', function (callback) {
	  var self = this;
	  this._info(function (err, info) {
	    if (err) {
	      return callback(err);
	    }
	    // assume we know better than the adapter, unless it informs us
	    info.db_name = info.db_name || self._db_name;
	    info.auto_compaction = !!(self.auto_compaction && self.type() !== 'http');
	    callback(null, info);
	  });
	});

	AbstractPouchDB.prototype.id = utils.adapterFun('id', function (callback) {
	  return this._id(callback);
	});

	AbstractPouchDB.prototype.type = function () {
	  return (typeof this._type === 'function') ? this._type() : this.adapter;
	};

	AbstractPouchDB.prototype.bulkDocs =
	  utils.adapterFun('bulkDocs', function (req, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }

	  opts = utils.clone(opts);

	  if (Array.isArray(req)) {
	    req = {
	      docs: req
	    };
	  }

	  if (!req || !req.docs || !Array.isArray(req.docs)) {
	    return callback(errors.error(errors.MISSING_BULK_DOCS));
	  }

	  for (var i = 0; i < req.docs.length; ++i) {
	    if (typeof req.docs[i] !== 'object' || Array.isArray(req.docs[i])) {
	      return callback(errors.error(errors.NOT_AN_OBJECT));
	    }
	  }

	  req = utils.clone(req);
	  if (!('new_edits' in opts)) {
	    if ('new_edits' in req) {
	      opts.new_edits = req.new_edits;
	    } else {
	      opts.new_edits = true;
	    }
	  }

	  if (!opts.new_edits && this.type() !== 'http') {
	    // ensure revisions of the same doc are sorted, so that
	    // the local adapter processes them correctly (#2935)
	    req.docs.sort(function (a, b) {
	      var idCompare = utils.compare(a._id, b._id);
	      if (idCompare !== 0) {
	        return idCompare;
	      }
	      var aStart = a._revisions ? a._revisions.start : 0;
	      var bStart = b._revisions ? b._revisions.start : 0;
	      return utils.compare(aStart, bStart);
	    });
	  }

	  req.docs.forEach(function (doc) {
	    if (doc._deleted) {
	      delete doc._attachments; // ignore atts for deleted docs
	    }
	  });

	  return this._bulkDocs(req, opts, function (err, res) {
	    if (err) {
	      return callback(err);
	    }
	    if (!opts.new_edits) {
	      // this is what couch does when new_edits is false
	      res = res.filter(function (x) {
	        return x.error;
	      });
	    }
	    callback(null, res);
	  });
	});

	AbstractPouchDB.prototype.registerDependentDatabase =
	  utils.adapterFun('registerDependentDatabase', function (dependentDb,
	                                                          callback) {
	  var depDB = new this.constructor(dependentDb, this.__opts || {});

	  function diffFun(doc) {
	    doc.dependentDbs = doc.dependentDbs || {};
	    if (doc.dependentDbs[dependentDb]) {
	      return false; // no update required
	    }
	    doc.dependentDbs[dependentDb] = true;
	    return doc;
	  }
	  upsert(this, '_local/_pouch_dependentDbs', diffFun, function (err) {
	    if (err) {
	      return callback(err);
	    }
	    return callback(null, {db: depDB});
	  });
	});


/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = TaskQueue;

	function TaskQueue() {
	  this.isReady = false;
	  this.failed = false;
	  this.queue = [];
	}

	TaskQueue.prototype.execute = function () {
	  var d, func;
	  if (this.failed) {
	    while ((d = this.queue.shift())) {
	      if (typeof d === 'function') {
	        d(this.failed);
	        continue;
	      }
	      func = d.parameters[d.parameters.length - 1];
	      if (typeof func === 'function') {
	        func(this.failed);
	      } else if (d.name === 'changes' && typeof func.complete === 'function') {
	        func.complete(this.failed);
	      }
	    }
	  } else if (this.isReady) {
	    while ((d = this.queue.shift())) {

	      if (typeof d === 'function') {
	        d();
	      } else {
	        d.task = this.db[d.name].apply(this.db, d.parameters);
	      }
	    }
	  }
	};

	TaskQueue.prototype.fail = function (err) {
	  this.failed = err;
	  this.execute();
	};

	TaskQueue.prototype.ready = function (db) {
	  if (this.failed) {
	    return false;
	  } else if (arguments.length === 0) {
	    return this.isReady;
	  }
	  this.isReady = db ? true: false;
	  this.db = db;
	  this.execute();
	};

	TaskQueue.prototype.addTask = function (name, parameters) {
	  if (typeof name === 'function') {
	    this.queue.push(name);
	    if (this.failed) {
	      this.execute();
	    }
	  } else {
	    var task = { name: name, parameters: parameters };
	    this.queue.push(task);
	    if (this.failed) {
	      this.execute();
	    }
	    return task;
	  }
	};


/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	var Transform = __webpack_require__(78)
	  , inherits  = __webpack_require__(74).inherits
	  , xtend     = __webpack_require__(76)


	// a noop _transform function
	function noop (chunk, enc, callback) {
	  callback(null, chunk)
	}


	// create a new export function, used by both the main export and
	// the .ctor export, contains common logic for dealing with arguments
	function through2 (construct) {
	  return function (options, transform, flush) {
	    if (typeof options == 'function') {
	      flush     = transform
	      transform = options
	      options   = {}
	    }

	    if (typeof transform != 'function')
	      transform = noop

	    if (typeof flush != 'function')
	      flush = null

	    return construct(options, transform, flush)
	  }
	}


	// main export, just make me a transform stream!
	module.exports = through2(function (options, transform, flush) {
	  var t2 = new Transform(options)

	  t2._transform = transform

	  if (flush)
	    t2._flush = flush

	  return t2
	})


	// make me a reusable prototype that I can `new`, or implicitly `new`
	// with a constructor call
	module.exports.ctor = through2(function (options, transform, flush) {
	  function Through2 (override) {
	    if (!(this instanceof Through2))
	      return new Through2(override)

	    this.options = xtend(options, override)

	    Transform.call(this, this.options)
	  }

	  inherits(Through2, Transform)

	  Through2.prototype._transform = transform

	  if (flush)
	    Through2.prototype._flush = flush

	  return Through2
	})


	module.exports.obj = through2(function (options, transform, flush) {
	  var t2 = new Transform(xtend({ objectMode: true }, options))

	  t2._transform = transform

	  if (flush)
	    t2._flush = flush

	  return t2
	})


/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2013 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
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
	 */
	"use strict";
	function Deque(capacity) {
	    this._capacity = getCapacity(capacity);
	    this._length = 0;
	    this._front = 0;
	    this._makeCapacity();
	    if (isArray(capacity)) {
	        var len = capacity.length;
	        for (var i = 0; i < len; ++i) {
	            this[i] = capacity[i];
	        }
	        this._length = len;
	    }
	}

	Deque.prototype.toArray = function Deque$toArray() {
	    var len = this._length;
	    var ret = new Array(len);
	    var front = this._front;
	    var capacity = this._capacity;
	    for (var j = 0; j < len; ++j) {
	        ret[j] = this[(front + j) & (capacity - 1)];
	    }
	    return ret;
	};

	Deque.prototype.push = function Deque$push(item) {
	    var argsLength = arguments.length;
	    var length = this._length;
	    if (argsLength > 1) {
	        var capacity = this._capacity;
	        if (length + argsLength > capacity) {
	            for (var i = 0; i < argsLength; ++i) {
	                this._checkCapacity(length + 1);
	                var j = (this._front + length) & (this._capacity - 1);
	                this[j] = arguments[i];
	                length++;
	                this._length = length;
	            }
	            return length;
	        }
	        else {
	            var j = this._front;
	            for (var i = 0; i < argsLength; ++i) {
	                this[(j + length) & (capacity - 1)] = arguments[i];
	                j++;
	            }
	            this._length = length + argsLength;
	            return length + argsLength;
	        }

	    }

	    if (argsLength === 0) return length;

	    this._checkCapacity(length + 1);
	    var i = (this._front + length) & (this._capacity - 1);
	    this[i] = item;
	    this._length = length + 1;
	    return length + 1;
	};

	Deque.prototype.pop = function Deque$pop() {
	    var length = this._length;
	    if (length === 0) {
	        return void 0;
	    }
	    var i = (this._front + length - 1) & (this._capacity - 1);
	    var ret = this[i];
	    this[i] = void 0;
	    this._length = length - 1;
	    return ret;
	};

	Deque.prototype.shift = function Deque$shift() {
	    var length = this._length;
	    if (length === 0) {
	        return void 0;
	    }
	    var front = this._front;
	    var ret = this[front];
	    this[front] = void 0;
	    this._front = (front + 1) & (this._capacity - 1);
	    this._length = length - 1;
	    return ret;
	};

	Deque.prototype.unshift = function Deque$unshift(item) {
	    var length = this._length;
	    var argsLength = arguments.length;


	    if (argsLength > 1) {
	        var capacity = this._capacity;
	        if (length + argsLength > capacity) {
	            for (var i = argsLength - 1; i >= 0; i--) {
	                this._checkCapacity(length + 1);
	                var capacity = this._capacity;
	                var j = (((( this._front - 1 ) &
	                    ( capacity - 1) ) ^ capacity ) - capacity );
	                this[j] = arguments[i];
	                length++;
	                this._length = length;
	                this._front = j;
	            }
	            return length;
	        }
	        else {
	            var front = this._front;
	            for (var i = argsLength - 1; i >= 0; i--) {
	                var j = (((( front - 1 ) &
	                    ( capacity - 1) ) ^ capacity ) - capacity );
	                this[j] = arguments[i];
	                front = j;
	            }
	            this._front = front;
	            this._length = length + argsLength;
	            return length + argsLength;
	        }
	    }

	    if (argsLength === 0) return length;

	    this._checkCapacity(length + 1);
	    var capacity = this._capacity;
	    var i = (((( this._front - 1 ) &
	        ( capacity - 1) ) ^ capacity ) - capacity );
	    this[i] = item;
	    this._length = length + 1;
	    this._front = i;
	    return length + 1;
	};

	Deque.prototype.peekBack = function Deque$peekBack() {
	    var length = this._length;
	    if (length === 0) {
	        return void 0;
	    }
	    var index = (this._front + length - 1) & (this._capacity - 1);
	    return this[index];
	};

	Deque.prototype.peekFront = function Deque$peekFront() {
	    if (this._length === 0) {
	        return void 0;
	    }
	    return this[this._front];
	};

	Deque.prototype.get = function Deque$get(index) {
	    var i = index;
	    if ((i !== (i | 0))) {
	        return void 0;
	    }
	    var len = this._length;
	    if (i < 0) {
	        i = i + len;
	    }
	    if (i < 0 || i >= len) {
	        return void 0;
	    }
	    return this[(this._front + i) & (this._capacity - 1)];
	};

	Deque.prototype.isEmpty = function Deque$isEmpty() {
	    return this._length === 0;
	};

	Deque.prototype.clear = function Deque$clear() {
	    this._length = 0;
	    this._front = 0;
	    this._makeCapacity();
	};

	Deque.prototype.toString = function Deque$toString() {
	    return this.toArray().toString();
	};

	Deque.prototype.valueOf = Deque.prototype.toString;
	Deque.prototype.removeFront = Deque.prototype.shift;
	Deque.prototype.removeBack = Deque.prototype.pop;
	Deque.prototype.insertFront = Deque.prototype.unshift;
	Deque.prototype.insertBack = Deque.prototype.push;
	Deque.prototype.enqueue = Deque.prototype.push;
	Deque.prototype.dequeue = Deque.prototype.shift;
	Deque.prototype.toJSON = Deque.prototype.toArray;

	Object.defineProperty(Deque.prototype, "length", {
	    get: function() {
	        return this._length;
	    },
	    set: function() {
	        throw new RangeError("");
	    }
	});

	Deque.prototype._makeCapacity = function Deque$_makeCapacity() {
	    var len = this._capacity;
	    for (var i = 0; i < len; ++i) {
	        this[i] = void 0;
	    }
	};

	Deque.prototype._checkCapacity = function Deque$_checkCapacity(size) {
	    if (this._capacity < size) {
	        this._resizeTo(getCapacity(this._capacity * 1.5 + 16));
	    }
	};

	Deque.prototype._resizeTo = function Deque$_resizeTo(capacity) {
	    var oldFront = this._front;
	    var oldCapacity = this._capacity;
	    var oldDeque = new Array(oldCapacity);
	    var length = this._length;

	    arrayCopy(this, 0, oldDeque, 0, oldCapacity);
	    this._capacity = capacity;
	    this._makeCapacity();
	    this._front = 0;
	    if (oldFront + length <= oldCapacity) {
	        arrayCopy(oldDeque, oldFront, this, 0, length);
	    } else {        var lengthBeforeWrapping =
	            length - ((oldFront + length) & (oldCapacity - 1));

	        arrayCopy(oldDeque, oldFront, this, 0, lengthBeforeWrapping);
	        arrayCopy(oldDeque, 0, this, lengthBeforeWrapping,
	            length - lengthBeforeWrapping);
	    }
	};


	var isArray = Array.isArray;

	function arrayCopy(src, srcIndex, dst, dstIndex, len) {
	    for (var j = 0; j < len; ++j) {
	        dst[j + dstIndex] = src[j + srcIndex];
	    }
	}

	function pow2AtLeast(n) {
	    n = n >>> 0;
	    n = n - 1;
	    n = n | (n >> 1);
	    n = n | (n >> 2);
	    n = n | (n >> 4);
	    n = n | (n >> 8);
	    n = n | (n >> 16);
	    return n + 1;
	}

	function getCapacity(capacity) {
	    if (typeof capacity !== "number") {
	        if (isArray(capacity)) {
	            capacity = capacity.length;
	        }
	        else {
	            return 16;
	        }
	    }
	    return pow2AtLeast(
	        Math.min(
	            Math.max(16, capacity), 1073741824)
	    );
	}

	module.exports = Deque;


/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var MIN_MAGNITUDE = -324; // verified by -Number.MIN_VALUE
	var MAGNITUDE_DIGITS = 3; // ditto
	var SEP = ''; // set to '_' for easier debugging 

	var utils = __webpack_require__(75);

	exports.collate = function (a, b) {

	  if (a === b) {
	    return 0;
	  }

	  a = exports.normalizeKey(a);
	  b = exports.normalizeKey(b);

	  var ai = collationIndex(a);
	  var bi = collationIndex(b);
	  if ((ai - bi) !== 0) {
	    return ai - bi;
	  }
	  if (a === null) {
	    return 0;
	  }
	  switch (typeof a) {
	    case 'number':
	      return a - b;
	    case 'boolean':
	      return a === b ? 0 : (a < b ? -1 : 1);
	    case 'string':
	      return stringCollate(a, b);
	  }
	  return Array.isArray(a) ? arrayCollate(a, b) : objectCollate(a, b);
	};

	// couch considers null/NaN/Infinity/-Infinity === undefined,
	// for the purposes of mapreduce indexes. also, dates get stringified.
	exports.normalizeKey = function (key) {
	  switch (typeof key) {
	    case 'undefined':
	      return null;
	    case 'number':
	      if (key === Infinity || key === -Infinity || isNaN(key)) {
	        return null;
	      }
	      return key;
	    case 'object':
	      var origKey = key;
	      if (Array.isArray(key)) {
	        var len = key.length;
	        key = new Array(len);
	        for (var i = 0; i < len; i++) {
	          key[i] = exports.normalizeKey(origKey[i]);
	        }
	      } else if (key instanceof Date) {
	        return key.toJSON();
	      } else if (key !== null) { // generic object
	        key = {};
	        for (var k in origKey) {
	          if (origKey.hasOwnProperty(k)) {
	            var val = origKey[k];
	            if (typeof val !== 'undefined') {
	              key[k] = exports.normalizeKey(val);
	            }
	          }
	        }
	      }
	  }
	  return key;
	};

	function indexify(key) {
	  if (key !== null) {
	    switch (typeof key) {
	      case 'boolean':
	        return key ? 1 : 0;
	      case 'number':
	        return numToIndexableString(key);
	      case 'string':
	        // We've to be sure that key does not contain \u0000
	        // Do order-preserving replacements:
	        // 0 -> 1, 1
	        // 1 -> 1, 2
	        // 2 -> 2, 2
	        return key
	          .replace(/\u0002/g, '\u0002\u0002')
	          .replace(/\u0001/g, '\u0001\u0002')
	          .replace(/\u0000/g, '\u0001\u0001');
	      case 'object':
	        var isArray = Array.isArray(key);
	        var arr = isArray ? key : Object.keys(key);
	        var i = -1;
	        var len = arr.length;
	        var result = '';
	        if (isArray) {
	          while (++i < len) {
	            result += exports.toIndexableString(arr[i]);
	          }
	        } else {
	          while (++i < len) {
	            var objKey = arr[i];
	            result += exports.toIndexableString(objKey) +
	                exports.toIndexableString(key[objKey]);
	          }
	        }
	        return result;
	    }
	  }
	  return '';
	}

	// convert the given key to a string that would be appropriate
	// for lexical sorting, e.g. within a database, where the
	// sorting is the same given by the collate() function.
	exports.toIndexableString = function (key) {
	  var zero = '\u0000';
	  key = exports.normalizeKey(key);
	  return collationIndex(key) + SEP + indexify(key) + zero;
	};

	function parseNumber(str, i) {
	  var originalIdx = i;
	  var num;
	  var zero = str[i] === '1';
	  if (zero) {
	    num = 0;
	    i++;
	  } else {
	    var neg = str[i] === '0';
	    i++;
	    var numAsString = '';
	    var magAsString = str.substring(i, i + MAGNITUDE_DIGITS);
	    var magnitude = parseInt(magAsString, 10) + MIN_MAGNITUDE;
	    if (neg) {
	      magnitude = -magnitude;
	    }
	    i += MAGNITUDE_DIGITS;
	    while (true) {
	      var ch = str[i];
	      if (ch === '\u0000') {
	        break;
	      } else {
	        numAsString += ch;
	      }
	      i++;
	    }
	    numAsString = numAsString.split('.');
	    if (numAsString.length === 1) {
	      num = parseInt(numAsString, 10);
	    } else {
	      num = parseFloat(numAsString[0] + '.' + numAsString[1]);
	    }
	    if (neg) {
	      num = num - 10;
	    }
	    if (magnitude !== 0) {
	      // parseFloat is more reliable than pow due to rounding errors
	      // e.g. Number.MAX_VALUE would return Infinity if we did
	      // num * Math.pow(10, magnitude);
	      num = parseFloat(num + 'e' + magnitude);
	    }
	  }
	  return {num: num, length : i - originalIdx};
	}

	// move up the stack while parsing
	// this function moved outside of parseIndexableString for performance
	function pop(stack, metaStack) {
	  var obj = stack.pop();

	  if (metaStack.length) {
	    var lastMetaElement = metaStack[metaStack.length - 1];
	    if (obj === lastMetaElement.element) {
	      // popping a meta-element, e.g. an object whose value is another object
	      metaStack.pop();
	      lastMetaElement = metaStack[metaStack.length - 1];
	    }
	    var element = lastMetaElement.element;
	    var lastElementIndex = lastMetaElement.index;
	    if (Array.isArray(element)) {
	      element.push(obj);
	    } else if (lastElementIndex === stack.length - 2) { // obj with key+value
	      var key = stack.pop();
	      element[key] = obj;
	    } else {
	      stack.push(obj); // obj with key only
	    }
	  }
	}

	exports.parseIndexableString = function (str) {
	  var stack = [];
	  var metaStack = []; // stack for arrays and objects
	  var i = 0;

	  while (true) {
	    var collationIndex = str[i++];
	    if (collationIndex === '\u0000') {
	      if (stack.length === 1) {
	        return stack.pop();
	      } else {
	        pop(stack, metaStack);
	        continue;
	      }
	    }
	    switch (collationIndex) {
	      case '1':
	        stack.push(null);
	        break;
	      case '2':
	        stack.push(str[i] === '1');
	        i++;
	        break;
	      case '3':
	        var parsedNum = parseNumber(str, i);
	        stack.push(parsedNum.num);
	        i += parsedNum.length;
	        break;
	      case '4':
	        var parsedStr = '';
	        while (true) {
	          var ch = str[i];
	          if (ch === '\u0000') {
	            break;
	          }
	          parsedStr += ch;
	          i++;
	        }
	        // perform the reverse of the order-preserving replacement
	        // algorithm (see above)
	        parsedStr = parsedStr.replace(/\u0001\u0001/g, '\u0000')
	          .replace(/\u0001\u0002/g, '\u0001')
	          .replace(/\u0002\u0002/g, '\u0002');
	        stack.push(parsedStr);
	        break;
	      case '5':
	        var arrayElement = { element: [], index: stack.length };
	        stack.push(arrayElement.element);
	        metaStack.push(arrayElement);
	        break;
	      case '6':
	        var objElement = { element: {}, index: stack.length };
	        stack.push(objElement.element);
	        metaStack.push(objElement);
	        break;
	      default:
	        throw new Error(
	          'bad collationIndex or unexpectedly reached end of input: ' + collationIndex);
	    }
	  }
	};

	function arrayCollate(a, b) {
	  var len = Math.min(a.length, b.length);
	  for (var i = 0; i < len; i++) {
	    var sort = exports.collate(a[i], b[i]);
	    if (sort !== 0) {
	      return sort;
	    }
	  }
	  return (a.length === b.length) ? 0 :
	    (a.length > b.length) ? 1 : -1;
	}
	function stringCollate(a, b) {
	  // See: https://github.com/daleharvey/pouchdb/issues/40
	  // This is incompatible with the CouchDB implementation, but its the
	  // best we can do for now
	  return (a === b) ? 0 : ((a > b) ? 1 : -1);
	}
	function objectCollate(a, b) {
	  var ak = Object.keys(a), bk = Object.keys(b);
	  var len = Math.min(ak.length, bk.length);
	  for (var i = 0; i < len; i++) {
	    // First sort the keys
	    var sort = exports.collate(ak[i], bk[i]);
	    if (sort !== 0) {
	      return sort;
	    }
	    // if the keys are equal sort the values
	    sort = exports.collate(a[ak[i]], b[bk[i]]);
	    if (sort !== 0) {
	      return sort;
	    }

	  }
	  return (ak.length === bk.length) ? 0 :
	    (ak.length > bk.length) ? 1 : -1;
	}
	// The collation is defined by erlangs ordered terms
	// the atoms null, true, false come first, then numbers, strings,
	// arrays, then objects
	// null/undefined/NaN/Infinity/-Infinity are all considered null
	function collationIndex(x) {
	  var id = ['boolean', 'number', 'string', 'object'];
	  var idx = id.indexOf(typeof x);
	  //false if -1 otherwise true, but fast!!!!1
	  if (~idx) {
	    if (x === null) {
	      return 1;
	    }
	    if (Array.isArray(x)) {
	      return 5;
	    }
	    return idx < 3 ? (idx + 2) : (idx + 3);
	  }
	  if (Array.isArray(x)) {
	    return 5;
	  }
	}

	// conversion:
	// x yyy zz...zz
	// x = 0 for negative, 1 for 0, 2 for positive
	// y = exponent (for negative numbers negated) moved so that it's >= 0
	// z = mantisse
	function numToIndexableString(num) {

	  if (num === 0) {
	    return '1';
	  }

	  // convert number to exponential format for easier and
	  // more succinct string sorting
	  var expFormat = num.toExponential().split(/e\+?/);
	  var magnitude = parseInt(expFormat[1], 10);

	  var neg = num < 0;

	  var result = neg ? '0' : '2';

	  // first sort by magnitude
	  // it's easier if all magnitudes are positive
	  var magForComparison = ((neg ? -magnitude : magnitude) - MIN_MAGNITUDE);
	  var magString = utils.padLeft((magForComparison).toString(), '0', MAGNITUDE_DIGITS);

	  result += SEP + magString;

	  // then sort by the factor
	  var factor = Math.abs(parseFloat(expFormat[0])); // [1..10)
	  if (neg) { // for negative reverse ordering
	    factor = 10 - factor;
	  }

	  var factorStr = factor.toFixed(20);

	  // strip zeros from the end
	  factorStr = factorStr.replace(/\.?0+$/, '');

	  result += SEP + factorStr;

	  return result;
	}


/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	var EventEmitter = __webpack_require__(38).EventEmitter
	var inherits     = __webpack_require__(74).inherits
	var ranges       = __webpack_require__(81)
	var fixRange     = __webpack_require__(70)
	var xtend        = __webpack_require__(82)
	var Batch        = __webpack_require__(63)

	inherits(SubDB, EventEmitter)

	function SubDB (db, prefix, options) {
	  if('string' === typeof options) {
	    console.error('db.sublevel(name, seperator<string>) is depreciated')
	    console.error('use db.sublevel(name, {sep: separator})) if you must')
	    options = {sep: options}
	  }
	  if(!(this instanceof SubDB)) return new SubDB(db, prefix, options)
	  if(!db)     throw new Error('must provide db')
	  if(!prefix) throw new Error('must provide prefix')

	  options = options || {}
	  options.sep = options.sep || '\xff'

	  this._parent = db
	  this._options = options
	  this.options = options
	  this._prefix = prefix
	  this._root = root(this)
	  db.sublevels[prefix] = this
	  this.sublevels = {}
	  this.methods = {}
	  var self = this
	  this.hooks = {
	    pre: function () {
	      return self.pre.apply(self, arguments)
	    },
	    post: function () {
	      return self.post.apply(self, arguments)
	    }
	  }
	}

	var SDB = SubDB.prototype

	SDB._key = function (key) {
	  var sep = this._options.sep
	  return sep
	    + this._prefix
	    + sep
	    + key
	}

	SDB._getOptsAndCb = function (opts, cb) {
	  if (typeof opts == 'function') {
	    cb = opts
	    opts = {}
	  }
	  return { opts: xtend(opts, this._options), cb: cb }
	}

	SDB.sublevel = function (prefix, options) {
	  if(this.sublevels[prefix])
	    return this.sublevels[prefix]
	  return new SubDB(this, prefix, options || this._options)
	}

	SDB.put = function (key, value, opts, cb) {
	  var res = this._getOptsAndCb(opts, cb)
	  this._root.put(this.prefix(key), value, res.opts, res.cb)
	}

	SDB.get = function (key, opts, cb) {
	  var res = this._getOptsAndCb(opts, cb)
	  this._root.get(this.prefix(key), res.opts, res.cb)
	}

	SDB.del = function (key, opts, cb) {
	  var res = this._getOptsAndCb(opts, cb)
	  this._root.del(this.prefix(key), res.opts, res.cb)
	}

	SDB.batch = function (changes, opts, cb) {
	  if(!Array.isArray(changes))
	    return new Batch(this)
	  var self = this,
	      res = this._getOptsAndCb(opts, cb)
	  changes.forEach(function (ch) {

	    //OH YEAH, WE NEED TO VALIDATE THAT UPDATING THIS KEY/PREFIX IS ALLOWED
	    if('string' === typeof ch.prefix)
	      ch.key = ch.prefix + ch.key
	    else
	      ch.key = (ch.prefix || self).prefix(ch.key)

	    if(ch.prefix) ch.prefix = null
	  })
	  this._root.batch(changes, res.opts, res.cb)
	}

	SDB._getKeyEncoding = function () {
	  if(this.options.keyEncoding)
	    return this.options.keyEncoding
	  if(this._parent && this._parent._getKeyEncoding)
	    return this._parent._getKeyEncoding()
	}

	SDB._getValueEncoding = function () {
	  if(this.options.valueEncoding)
	    return this.options.valueEncoding
	  if(this._parent && this._parent._getValueEncoding)
	    return this._parent._getValueEncoding()
	}

	SDB.prefix = function (key) {
	  var sep = this._options.sep
	  return this._parent.prefix() + sep + this._prefix + sep + (key || '')
	}

	SDB.keyStream =
	SDB.createKeyStream = function (opts) {
	  opts = opts || {}
	  opts.keys = true
	  opts.values = false
	  return this.createReadStream(opts)
	}

	SDB.valueStream =
	SDB.createValueStream = function (opts) {
	  opts = opts || {}
	  opts.keys = false
	  opts.values = true
	  opts.keys = false
	  return this.createReadStream(opts)
	}

	function selectivelyMerge(_opts, opts) {
	  [ 'valueEncoding'
	  , 'encoding'
	  , 'keyEncoding'
	  , 'reverse'
	  , 'values'
	  , 'keys'
	  , 'limit'
	  , 'fillCache'
	  ]
	  .forEach(function (k) {
	    if (opts.hasOwnProperty(k)) _opts[k] = opts[k]
	  })
	}

	SDB.readStream =
	SDB.createReadStream = function (opts) {
	  opts = opts || {}
	  var r = root(this)
	  var p = this.prefix()

	  var _opts = ranges.prefix(opts, p)
	  selectivelyMerge(_opts, xtend(opts, this._options))

	  var s = r.createReadStream(_opts)

	  if(_opts.values === false) {
	    var read = s.read
	    if (read) {
	      s.read = function (size) {
	        var val = read.call(this, size)
	        if (val) val = val.substring(p.length)
	        return val
	      }
	    } else {
	      var emit = s.emit
	      s.emit = function (event, val) {
	        if(event === 'data') {
	          emit.call(this, 'data', val.substring(p.length))
	        } else
	          emit.call(this, event, val)
	      }
	    }
	    return s
	  } else if(_opts.keys === false)
	    return s
	  else {
	    var read = s.read
	    if (read) {
	      s.read = function (size) {
	        var d = read.call(this, size)
	        if (d) d.key = d.key.substring(p.length)
	        return d
	      }
	    } else {
	      s.on('data', function (d) {
	        //mutate the prefix!
	        //this doesn't work for createKeyStream admittedly.
	        d.key = d.key.substring(p.length)
	      })
	    }
	    return s
	  }
	}


	SDB.writeStream =
	SDB.createWriteStream = function () {
	  var r = root(this)
	  var p = this.prefix()
	  var ws = r.createWriteStream.apply(r, arguments)
	  var write = ws.write

	  var encoding = this._options.encoding
	  var valueEncoding = this._options.valueEncoding
	  var keyEncoding = this._options.keyEncoding

	  // slight optimization, if no encoding was specified at all,
	  // which will be the case most times, make write not check at all
	  var nocheck = !encoding && !valueEncoding && !keyEncoding

	  ws.write = nocheck
	    ? function (data) {
	        data.key = p + data.key
	        return write.call(ws, data)
	      }
	    : function (data) {
	        data.key = p + data.key

	        // not merging all options here since this happens on every write and things could get slowed down
	        // at this point we only consider encoding important to propagate
	        if (encoding && typeof data.encoding === 'undefined')
	          data.encoding = encoding
	        if (valueEncoding && typeof data.valueEncoding === 'undefined')
	          data.valueEncoding = valueEncoding
	        if (keyEncoding && typeof data.keyEncoding === 'undefined')
	          data.keyEncoding = keyEncoding

	        return write.call(ws, data)
	      }
	  return ws
	}

	SDB.approximateSize = function () {
	  var r = root(db)
	  return r.approximateSize.apply(r, arguments)
	}

	function root(db) {
	  if(!db._parent) return db
	  return root(db._parent)
	}

	SDB.pre = function (range, hook) {
	  if(!hook) hook = range, range = null
	  range = ranges.prefix(range, this.prefix(), this._options.sep)
	  var r = root(this._parent)
	  var p = this.prefix()
	  return r.hooks.pre(fixRange(range), function (ch, add, batch) {
	    hook({
	      key: ch.key.substring(p.length),
	      value: ch.value,
	      type: ch.type
	    }, function (ch, _p) {
	      //maybe remove the second add arg now
	      //that op can have prefix?
	      add(ch, ch.prefix ? _p : (_p || p))
	    }, batch)
	  })
	}

	SDB.post = function (range, hook) {
	  if(!hook) hook = range, range = null
	  var r = root(this._parent)
	  var p = this.prefix()
	  range = ranges.prefix(range, p, this._options.sep)
	  return r.hooks.post(fixRange(range), function (data) {
	    hook({key: data.key.substring(p.length), value: data.value, type: data.type})
	  })
	}

	var exports = module.exports = SubDB



/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

	function addOperation (type, key, value, options) {
	  var operation = {
	    type: type,
	    key: key,
	    value: value,
	    options: options
	  }

	  if (options && options.prefix) {
	    operation.prefix = options.prefix
	    delete options.prefix
	  }

	  this._operations.push(operation)

	  return this
	}

	function Batch(sdb) {
	  this._operations = []
	  this._sdb = sdb

	  this.put = addOperation.bind(this, 'put')
	  this.del = addOperation.bind(this, 'del')
	}

	var B = Batch.prototype


	B.clear = function () {
	  this._operations = []
	}

	B.write = function (cb) {
	  this._sdb.batch(this._operations, cb)
	}

	module.exports = Batch


/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// resolves . and .. elements in a path array with directory names there
	// must be no slashes, empty elements, or device names (c:\) in the array
	// (so also no leading and trailing slashes - it does not distinguish
	// relative and absolute paths)
	function normalizeArray(parts, allowAboveRoot) {
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = parts.length - 1; i >= 0; i--) {
	    var last = parts[i];
	    if (last === '.') {
	      parts.splice(i, 1);
	    } else if (last === '..') {
	      parts.splice(i, 1);
	      up++;
	    } else if (up) {
	      parts.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (allowAboveRoot) {
	    for (; up--; up) {
	      parts.unshift('..');
	    }
	  }

	  return parts;
	}

	// Split a filename into [root, dir, basename, ext], unix version
	// 'root' is just a slash, or nothing.
	var splitPathRe =
	    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
	var splitPath = function(filename) {
	  return splitPathRe.exec(filename).slice(1);
	};

	// path.resolve([from ...], to)
	// posix version
	exports.resolve = function() {
	  var resolvedPath = '',
	      resolvedAbsolute = false;

	  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
	    var path = (i >= 0) ? arguments[i] : process.cwd();

	    // Skip empty and invalid entries
	    if (typeof path !== 'string') {
	      throw new TypeError('Arguments to path.resolve must be strings');
	    } else if (!path) {
	      continue;
	    }

	    resolvedPath = path + '/' + resolvedPath;
	    resolvedAbsolute = path.charAt(0) === '/';
	  }

	  // At this point the path should be resolved to a full absolute path, but
	  // handle relative paths to be safe (might happen when process.cwd() fails)

	  // Normalize the path
	  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
	    return !!p;
	  }), !resolvedAbsolute).join('/');

	  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
	};

	// path.normalize(path)
	// posix version
	exports.normalize = function(path) {
	  var isAbsolute = exports.isAbsolute(path),
	      trailingSlash = substr(path, -1) === '/';

	  // Normalize the path
	  path = normalizeArray(filter(path.split('/'), function(p) {
	    return !!p;
	  }), !isAbsolute).join('/');

	  if (!path && !isAbsolute) {
	    path = '.';
	  }
	  if (path && trailingSlash) {
	    path += '/';
	  }

	  return (isAbsolute ? '/' : '') + path;
	};

	// posix version
	exports.isAbsolute = function(path) {
	  return path.charAt(0) === '/';
	};

	// posix version
	exports.join = function() {
	  var paths = Array.prototype.slice.call(arguments, 0);
	  return exports.normalize(filter(paths, function(p, index) {
	    if (typeof p !== 'string') {
	      throw new TypeError('Arguments to path.join must be strings');
	    }
	    return p;
	  }).join('/'));
	};


	// path.relative(from, to)
	// posix version
	exports.relative = function(from, to) {
	  from = exports.resolve(from).substr(1);
	  to = exports.resolve(to).substr(1);

	  function trim(arr) {
	    var start = 0;
	    for (; start < arr.length; start++) {
	      if (arr[start] !== '') break;
	    }

	    var end = arr.length - 1;
	    for (; end >= 0; end--) {
	      if (arr[end] !== '') break;
	    }

	    if (start > end) return [];
	    return arr.slice(start, end - start + 1);
	  }

	  var fromParts = trim(from.split('/'));
	  var toParts = trim(to.split('/'));

	  var length = Math.min(fromParts.length, toParts.length);
	  var samePartsLength = length;
	  for (var i = 0; i < length; i++) {
	    if (fromParts[i] !== toParts[i]) {
	      samePartsLength = i;
	      break;
	    }
	  }

	  var outputParts = [];
	  for (var i = samePartsLength; i < fromParts.length; i++) {
	    outputParts.push('..');
	  }

	  outputParts = outputParts.concat(toParts.slice(samePartsLength));

	  return outputParts.join('/');
	};

	exports.sep = '/';
	exports.delimiter = ':';

	exports.dirname = function(path) {
	  var result = splitPath(path),
	      root = result[0],
	      dir = result[1];

	  if (!root && !dir) {
	    // No dirname whatsoever
	    return '.';
	  }

	  if (dir) {
	    // It has a dirname, strip trailing slash
	    dir = dir.substr(0, dir.length - 1);
	  }

	  return root + dir;
	};


	exports.basename = function(path, ext) {
	  var f = splitPath(path)[2];
	  // TODO: make this comparison case-insensitive on windows?
	  if (ext && f.substr(-1 * ext.length) === ext) {
	    f = f.substr(0, f.length - ext.length);
	  }
	  return f;
	};


	exports.extname = function(path) {
	  return splitPath(path)[3];
	};

	function filter (xs, f) {
	    if (xs.filter) return xs.filter(f);
	    var res = [];
	    for (var i = 0; i < xs.length; i++) {
	        if (f(xs[i], i, xs)) res.push(xs[i]);
	    }
	    return res;
	}

	// String.prototype.substr - negative index don't work in IE8
	var substr = 'ab'.substr(-1) === 'b'
	    ? function (str, start, len) { return str.substr(start, len) }
	    : function (str, start, len) {
	        if (start < 0) start = str.length + start;
	        return str.substr(start, len);
	    }
	;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var upsert = __webpack_require__(83).upsert;

	module.exports = function (db, doc, diffFun) {
	  return upsert.apply(db, [doc, diffFun]);
	};

/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * This is the common logic for both the Node.js and web browser
	 * implementations of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = debug;
	exports.coerce = coerce;
	exports.disable = disable;
	exports.enable = enable;
	exports.enabled = enabled;
	exports.humanize = __webpack_require__(84);

	/**
	 * The currently active debug mode names, and names to skip.
	 */

	exports.names = [];
	exports.skips = [];

	/**
	 * Map of special "%n" handling functions, for the debug "format" argument.
	 *
	 * Valid key names are a single, lowercased letter, i.e. "n".
	 */

	exports.formatters = {};

	/**
	 * Previously assigned color.
	 */

	var prevColor = 0;

	/**
	 * Previous log timestamp.
	 */

	var prevTime;

	/**
	 * Select a color.
	 *
	 * @return {Number}
	 * @api private
	 */

	function selectColor() {
	  return exports.colors[prevColor++ % exports.colors.length];
	}

	/**
	 * Create a debugger with the given `namespace`.
	 *
	 * @param {String} namespace
	 * @return {Function}
	 * @api public
	 */

	function debug(namespace) {

	  // define the `disabled` version
	  function disabled() {
	  }
	  disabled.enabled = false;

	  // define the `enabled` version
	  function enabled() {

	    var self = enabled;

	    // set `diff` timestamp
	    var curr = +new Date();
	    var ms = curr - (prevTime || curr);
	    self.diff = ms;
	    self.prev = prevTime;
	    self.curr = curr;
	    prevTime = curr;

	    // add the `color` if not set
	    if (null == self.useColors) self.useColors = exports.useColors();
	    if (null == self.color && self.useColors) self.color = selectColor();

	    var args = Array.prototype.slice.call(arguments);

	    args[0] = exports.coerce(args[0]);

	    if ('string' !== typeof args[0]) {
	      // anything else let's inspect with %o
	      args = ['%o'].concat(args);
	    }

	    // apply any `formatters` transformations
	    var index = 0;
	    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
	      // if we encounter an escaped % then don't increase the array index
	      if (match === '%%') return match;
	      index++;
	      var formatter = exports.formatters[format];
	      if ('function' === typeof formatter) {
	        var val = args[index];
	        match = formatter.call(self, val);

	        // now we need to remove `args[index]` since it's inlined in the `format`
	        args.splice(index, 1);
	        index--;
	      }
	      return match;
	    });

	    if ('function' === typeof exports.formatArgs) {
	      args = exports.formatArgs.apply(self, args);
	    }
	    var logFn = enabled.log || exports.log || console.log.bind(console);
	    logFn.apply(self, args);
	  }
	  enabled.enabled = true;

	  var fn = exports.enabled(namespace) ? enabled : disabled;

	  fn.namespace = namespace;

	  return fn;
	}

	/**
	 * Enables a debug mode by namespaces. This can include modes
	 * separated by a colon and wildcards.
	 *
	 * @param {String} namespaces
	 * @api public
	 */

	function enable(namespaces) {
	  exports.save(namespaces);

	  var split = (namespaces || '').split(/[\s,]+/);
	  var len = split.length;

	  for (var i = 0; i < len; i++) {
	    if (!split[i]) continue; // ignore empty strings
	    namespaces = split[i].replace(/\*/g, '.*?');
	    if (namespaces[0] === '-') {
	      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
	    } else {
	      exports.names.push(new RegExp('^' + namespaces + '$'));
	    }
	  }
	}

	/**
	 * Disable debug output.
	 *
	 * @api public
	 */

	function disable() {
	  exports.enable('');
	}

	/**
	 * Returns true if the given mode name is enabled, false otherwise.
	 *
	 * @param {String} name
	 * @return {Boolean}
	 * @api public
	 */

	function enabled(name) {
	  var i, len;
	  for (i = 0, len = exports.skips.length; i < len; i++) {
	    if (exports.skips[i].test(name)) {
	      return false;
	    }
	  }
	  for (i = 0, len = exports.names.length; i < len; i++) {
	    if (exports.names[i].test(name)) {
	      return true;
	    }
	  }
	  return false;
	}

	/**
	 * Coerce `val`.
	 *
	 * @param {Mixed} val
	 * @return {Mixed}
	 * @api private
	 */

	function coerce(val) {
	  if (val instanceof Error) return val.stack || val.message;
	  return val;
	}


/***/ },
/* 67 */
/***/ function(module, exports, __webpack_require__) {

	/*jshint bitwise:false*/
	/*global unescape*/

	(function (factory) {
	    if (true) {
	        // Node/CommonJS
	        module.exports = factory();
	    } else if (typeof define === 'function' && define.amd) {
	        // AMD
	        define(factory);
	    } else {
	        // Browser globals (with support for web workers)
	        var glob;
	        try {
	            glob = window;
	        } catch (e) {
	            glob = self;
	        }

	        glob.SparkMD5 = factory();
	    }
	}(function (undefined) {

	    'use strict';

	    ////////////////////////////////////////////////////////////////////////////

	    /*
	     * Fastest md5 implementation around (JKM md5)
	     * Credits: Joseph Myers
	     *
	     * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
	     * @see http://jsperf.com/md5-shootout/7
	     */

	    /* this function is much faster,
	      so if possible we use it. Some IEs
	      are the only ones I know of that
	      need the idiotic second function,
	      generated by an if clause.  */
	    var add32 = function (a, b) {
	        return (a + b) & 0xFFFFFFFF;
	    },

	    cmn = function (q, a, b, x, s, t) {
	        a = add32(add32(a, q), add32(x, t));
	        return add32((a << s) | (a >>> (32 - s)), b);
	    },

	    ff = function (a, b, c, d, x, s, t) {
	        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
	    },

	    gg = function (a, b, c, d, x, s, t) {
	        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
	    },

	    hh = function (a, b, c, d, x, s, t) {
	        return cmn(b ^ c ^ d, a, b, x, s, t);
	    },

	    ii = function (a, b, c, d, x, s, t) {
	        return cmn(c ^ (b | (~d)), a, b, x, s, t);
	    },

	    md5cycle = function (x, k) {
	        var a = x[0],
	            b = x[1],
	            c = x[2],
	            d = x[3];

	        a = ff(a, b, c, d, k[0], 7, -680876936);
	        d = ff(d, a, b, c, k[1], 12, -389564586);
	        c = ff(c, d, a, b, k[2], 17, 606105819);
	        b = ff(b, c, d, a, k[3], 22, -1044525330);
	        a = ff(a, b, c, d, k[4], 7, -176418897);
	        d = ff(d, a, b, c, k[5], 12, 1200080426);
	        c = ff(c, d, a, b, k[6], 17, -1473231341);
	        b = ff(b, c, d, a, k[7], 22, -45705983);
	        a = ff(a, b, c, d, k[8], 7, 1770035416);
	        d = ff(d, a, b, c, k[9], 12, -1958414417);
	        c = ff(c, d, a, b, k[10], 17, -42063);
	        b = ff(b, c, d, a, k[11], 22, -1990404162);
	        a = ff(a, b, c, d, k[12], 7, 1804603682);
	        d = ff(d, a, b, c, k[13], 12, -40341101);
	        c = ff(c, d, a, b, k[14], 17, -1502002290);
	        b = ff(b, c, d, a, k[15], 22, 1236535329);

	        a = gg(a, b, c, d, k[1], 5, -165796510);
	        d = gg(d, a, b, c, k[6], 9, -1069501632);
	        c = gg(c, d, a, b, k[11], 14, 643717713);
	        b = gg(b, c, d, a, k[0], 20, -373897302);
	        a = gg(a, b, c, d, k[5], 5, -701558691);
	        d = gg(d, a, b, c, k[10], 9, 38016083);
	        c = gg(c, d, a, b, k[15], 14, -660478335);
	        b = gg(b, c, d, a, k[4], 20, -405537848);
	        a = gg(a, b, c, d, k[9], 5, 568446438);
	        d = gg(d, a, b, c, k[14], 9, -1019803690);
	        c = gg(c, d, a, b, k[3], 14, -187363961);
	        b = gg(b, c, d, a, k[8], 20, 1163531501);
	        a = gg(a, b, c, d, k[13], 5, -1444681467);
	        d = gg(d, a, b, c, k[2], 9, -51403784);
	        c = gg(c, d, a, b, k[7], 14, 1735328473);
	        b = gg(b, c, d, a, k[12], 20, -1926607734);

	        a = hh(a, b, c, d, k[5], 4, -378558);
	        d = hh(d, a, b, c, k[8], 11, -2022574463);
	        c = hh(c, d, a, b, k[11], 16, 1839030562);
	        b = hh(b, c, d, a, k[14], 23, -35309556);
	        a = hh(a, b, c, d, k[1], 4, -1530992060);
	        d = hh(d, a, b, c, k[4], 11, 1272893353);
	        c = hh(c, d, a, b, k[7], 16, -155497632);
	        b = hh(b, c, d, a, k[10], 23, -1094730640);
	        a = hh(a, b, c, d, k[13], 4, 681279174);
	        d = hh(d, a, b, c, k[0], 11, -358537222);
	        c = hh(c, d, a, b, k[3], 16, -722521979);
	        b = hh(b, c, d, a, k[6], 23, 76029189);
	        a = hh(a, b, c, d, k[9], 4, -640364487);
	        d = hh(d, a, b, c, k[12], 11, -421815835);
	        c = hh(c, d, a, b, k[15], 16, 530742520);
	        b = hh(b, c, d, a, k[2], 23, -995338651);

	        a = ii(a, b, c, d, k[0], 6, -198630844);
	        d = ii(d, a, b, c, k[7], 10, 1126891415);
	        c = ii(c, d, a, b, k[14], 15, -1416354905);
	        b = ii(b, c, d, a, k[5], 21, -57434055);
	        a = ii(a, b, c, d, k[12], 6, 1700485571);
	        d = ii(d, a, b, c, k[3], 10, -1894986606);
	        c = ii(c, d, a, b, k[10], 15, -1051523);
	        b = ii(b, c, d, a, k[1], 21, -2054922799);
	        a = ii(a, b, c, d, k[8], 6, 1873313359);
	        d = ii(d, a, b, c, k[15], 10, -30611744);
	        c = ii(c, d, a, b, k[6], 15, -1560198380);
	        b = ii(b, c, d, a, k[13], 21, 1309151649);
	        a = ii(a, b, c, d, k[4], 6, -145523070);
	        d = ii(d, a, b, c, k[11], 10, -1120210379);
	        c = ii(c, d, a, b, k[2], 15, 718787259);
	        b = ii(b, c, d, a, k[9], 21, -343485551);

	        x[0] = add32(a, x[0]);
	        x[1] = add32(b, x[1]);
	        x[2] = add32(c, x[2]);
	        x[3] = add32(d, x[3]);
	    },

	    /* there needs to be support for Unicode here,
	       * unless we pretend that we can redefine the MD-5
	       * algorithm for multi-byte characters (perhaps
	       * by adding every four 16-bit characters and
	       * shortening the sum to 32 bits). Otherwise
	       * I suggest performing MD-5 as if every character
	       * was two bytes--e.g., 0040 0025 = @%--but then
	       * how will an ordinary MD-5 sum be matched?
	       * There is no way to standardize text to something
	       * like UTF-8 before transformation; speed cost is
	       * utterly prohibitive. The JavaScript standard
	       * itself needs to look at this: it should start
	       * providing access to strings as preformed UTF-8
	       * 8-bit unsigned value arrays.
	       */
	    md5blk = function (s) {
	        var md5blks = [],
	            i; /* Andy King said do it this way. */

	        for (i = 0; i < 64; i += 4) {
	            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
	        }
	        return md5blks;
	    },

	    md5blk_array = function (a) {
	        var md5blks = [],
	            i; /* Andy King said do it this way. */

	        for (i = 0; i < 64; i += 4) {
	            md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
	        }
	        return md5blks;
	    },

	    md51 = function (s) {
	        var n = s.length,
	            state = [1732584193, -271733879, -1732584194, 271733878],
	            i,
	            length,
	            tail,
	            tmp,
	            lo,
	            hi;

	        for (i = 64; i <= n; i += 64) {
	            md5cycle(state, md5blk(s.substring(i - 64, i)));
	        }
	        s = s.substring(i - 64);
	        length = s.length;
	        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	        for (i = 0; i < length; i += 1) {
	            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
	        }
	        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
	        if (i > 55) {
	            md5cycle(state, tail);
	            for (i = 0; i < 16; i += 1) {
	                tail[i] = 0;
	            }
	        }

	        // Beware that the final length might not fit in 32 bits so we take care of that
	        tmp = n * 8;
	        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
	        lo = parseInt(tmp[2], 16);
	        hi = parseInt(tmp[1], 16) || 0;

	        tail[14] = lo;
	        tail[15] = hi;

	        md5cycle(state, tail);
	        return state;
	    },

	    md51_array = function (a) {
	        var n = a.length,
	            state = [1732584193, -271733879, -1732584194, 271733878],
	            i,
	            length,
	            tail,
	            tmp,
	            lo,
	            hi;

	        for (i = 64; i <= n; i += 64) {
	            md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
	        }

	        // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
	        // containing the last element of the parent array if the sub array specified starts
	        // beyond the length of the parent array - weird.
	        // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
	        a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);

	        length = a.length;
	        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	        for (i = 0; i < length; i += 1) {
	            tail[i >> 2] |= a[i] << ((i % 4) << 3);
	        }

	        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
	        if (i > 55) {
	            md5cycle(state, tail);
	            for (i = 0; i < 16; i += 1) {
	                tail[i] = 0;
	            }
	        }

	        // Beware that the final length might not fit in 32 bits so we take care of that
	        tmp = n * 8;
	        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
	        lo = parseInt(tmp[2], 16);
	        hi = parseInt(tmp[1], 16) || 0;

	        tail[14] = lo;
	        tail[15] = hi;

	        md5cycle(state, tail);

	        return state;
	    },

	    hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'],

	    rhex = function (n) {
	        var s = '',
	            j;
	        for (j = 0; j < 4; j += 1) {
	            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
	        }
	        return s;
	    },

	    hex = function (x) {
	        var i;
	        for (i = 0; i < x.length; i += 1) {
	            x[i] = rhex(x[i]);
	        }
	        return x.join('');
	    },

	    md5 = function (s) {
	        return hex(md51(s));
	    },



	    ////////////////////////////////////////////////////////////////////////////

	    /**
	     * SparkMD5 OOP implementation.
	     *
	     * Use this class to perform an incremental md5, otherwise use the
	     * static methods instead.
	     */
	    SparkMD5 = function () {
	        // call reset to init the instance
	        this.reset();
	    };


	    // In some cases the fast add32 function cannot be used..
	    if (md5('hello') !== '5d41402abc4b2a76b9719d911017c592') {
	        add32 = function (x, y) {
	            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
	                msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	            return (msw << 16) | (lsw & 0xFFFF);
	        };
	    }


	    /**
	     * Appends a string.
	     * A conversion will be applied if an utf8 string is detected.
	     *
	     * @param {String} str The string to be appended
	     *
	     * @return {SparkMD5} The instance itself
	     */
	    SparkMD5.prototype.append = function (str) {
	        // converts the string to utf8 bytes if necessary
	        if (/[\u0080-\uFFFF]/.test(str)) {
	            str = unescape(encodeURIComponent(str));
	        }

	        // then append as binary
	        this.appendBinary(str);

	        return this;
	    };

	    /**
	     * Appends a binary string.
	     *
	     * @param {String} contents The binary string to be appended
	     *
	     * @return {SparkMD5} The instance itself
	     */
	    SparkMD5.prototype.appendBinary = function (contents) {
	        this._buff += contents;
	        this._length += contents.length;

	        var length = this._buff.length,
	            i;

	        for (i = 64; i <= length; i += 64) {
	            md5cycle(this._state, md5blk(this._buff.substring(i - 64, i)));
	        }

	        this._buff = this._buff.substr(i - 64);

	        return this;
	    };

	    /**
	     * Finishes the incremental computation, reseting the internal state and
	     * returning the result.
	     * Use the raw parameter to obtain the raw result instead of the hex one.
	     *
	     * @param {Boolean} raw True to get the raw result, false to get the hex result
	     *
	     * @return {String|Array} The result
	     */
	    SparkMD5.prototype.end = function (raw) {
	        var buff = this._buff,
	            length = buff.length,
	            i,
	            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	            ret;

	        for (i = 0; i < length; i += 1) {
	            tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
	        }

	        this._finish(tail, length);
	        ret = !!raw ? this._state : hex(this._state);

	        this.reset();

	        return ret;
	    };

	    /**
	     * Finish the final calculation based on the tail.
	     *
	     * @param {Array}  tail   The tail (will be modified)
	     * @param {Number} length The length of the remaining buffer
	     */
	    SparkMD5.prototype._finish = function (tail, length) {
	        var i = length,
	            tmp,
	            lo,
	            hi;

	        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
	        if (i > 55) {
	            md5cycle(this._state, tail);
	            for (i = 0; i < 16; i += 1) {
	                tail[i] = 0;
	            }
	        }

	        // Do the final computation based on the tail and length
	        // Beware that the final length may not fit in 32 bits so we take care of that
	        tmp = this._length * 8;
	        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
	        lo = parseInt(tmp[2], 16);
	        hi = parseInt(tmp[1], 16) || 0;

	        tail[14] = lo;
	        tail[15] = hi;
	        md5cycle(this._state, tail);
	    };

	    /**
	     * Resets the internal state of the computation.
	     *
	     * @return {SparkMD5} The instance itself
	     */
	    SparkMD5.prototype.reset = function () {
	        this._buff = "";
	        this._length = 0;
	        this._state = [1732584193, -271733879, -1732584194, 271733878];

	        return this;
	    };

	    /**
	     * Releases memory used by the incremental buffer and other aditional
	     * resources. If you plan to use the instance again, use reset instead.
	     */
	    SparkMD5.prototype.destroy = function () {
	        delete this._state;
	        delete this._buff;
	        delete this._length;
	    };


	    /**
	     * Performs the md5 hash on a string.
	     * A conversion will be applied if utf8 string is detected.
	     *
	     * @param {String}  str The string
	     * @param {Boolean} raw True to get the raw result, false to get the hex result
	     *
	     * @return {String|Array} The result
	     */
	    SparkMD5.hash = function (str, raw) {
	        // converts the string to utf8 bytes if necessary
	        if (/[\u0080-\uFFFF]/.test(str)) {
	            str = unescape(encodeURIComponent(str));
	        }

	        var hash = md51(str);

	        return !!raw ? hash : hex(hash);
	    };

	    /**
	     * Performs the md5 hash on a binary string.
	     *
	     * @param {String}  content The binary string
	     * @param {Boolean} raw     True to get the raw result, false to get the hex result
	     *
	     * @return {String|Array} The result
	     */
	    SparkMD5.hashBinary = function (content, raw) {
	        var hash = md51(content);

	        return !!raw ? hash : hex(hash);
	    };

	    /**
	     * SparkMD5 OOP implementation for array buffers.
	     *
	     * Use this class to perform an incremental md5 ONLY for array buffers.
	     */
	    SparkMD5.ArrayBuffer = function () {
	        // call reset to init the instance
	        this.reset();
	    };

	    ////////////////////////////////////////////////////////////////////////////

	    /**
	     * Appends an array buffer.
	     *
	     * @param {ArrayBuffer} arr The array to be appended
	     *
	     * @return {SparkMD5.ArrayBuffer} The instance itself
	     */
	    SparkMD5.ArrayBuffer.prototype.append = function (arr) {
	        // TODO: we could avoid the concatenation here but the algorithm would be more complex
	        //       if you find yourself needing extra performance, please make a PR.
	        var buff = this._concatArrayBuffer(this._buff, arr),
	            length = buff.length,
	            i;

	        this._length += arr.byteLength;

	        for (i = 64; i <= length; i += 64) {
	            md5cycle(this._state, md5blk_array(buff.subarray(i - 64, i)));
	        }

	        // Avoids IE10 weirdness (documented above)
	        this._buff = (i - 64) < length ? buff.subarray(i - 64) : new Uint8Array(0);

	        return this;
	    };

	    /**
	     * Finishes the incremental computation, reseting the internal state and
	     * returning the result.
	     * Use the raw parameter to obtain the raw result instead of the hex one.
	     *
	     * @param {Boolean} raw True to get the raw result, false to get the hex result
	     *
	     * @return {String|Array} The result
	     */
	    SparkMD5.ArrayBuffer.prototype.end = function (raw) {
	        var buff = this._buff,
	            length = buff.length,
	            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	            i,
	            ret;

	        for (i = 0; i < length; i += 1) {
	            tail[i >> 2] |= buff[i] << ((i % 4) << 3);
	        }

	        this._finish(tail, length);
	        ret = !!raw ? this._state : hex(this._state);

	        this.reset();

	        return ret;
	    };

	    SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;

	    /**
	     * Resets the internal state of the computation.
	     *
	     * @return {SparkMD5.ArrayBuffer} The instance itself
	     */
	    SparkMD5.ArrayBuffer.prototype.reset = function () {
	        this._buff = new Uint8Array(0);
	        this._length = 0;
	        this._state = [1732584193, -271733879, -1732584194, 271733878];

	        return this;
	    };

	    /**
	     * Releases memory used by the incremental buffer and other aditional
	     * resources. If you plan to use the instance again, use reset instead.
	     */
	    SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;

	    /**
	     * Concats two array buffers, returning a new one.
	     *
	     * @param  {ArrayBuffer} first  The first array buffer
	     * @param  {ArrayBuffer} second The second array buffer
	     *
	     * @return {ArrayBuffer} The new array buffer
	     */
	    SparkMD5.ArrayBuffer.prototype._concatArrayBuffer = function (first, second) {
	        var firstLength = first.length,
	            result = new Uint8Array(firstLength + second.byteLength);

	        result.set(first);
	        result.set(new Uint8Array(second), firstLength);

	        return result;
	    };

	    /**
	     * Performs the md5 hash on an array buffer.
	     *
	     * @param {ArrayBuffer} arr The array buffer
	     * @param {Boolean}     raw True to get the raw result, false to get the hex result
	     *
	     * @return {String|Array} The result
	     */
	    SparkMD5.ArrayBuffer.hash = function (arr, raw) {
	        var hash = md51_array(new Uint8Array(arr));

	        return !!raw ? hash : hex(hash);
	    };

	    return SparkMD5;
	}));


/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var upsert = __webpack_require__(83).upsert;

	module.exports = function (db, doc, diffFun, cb) {
	  return upsert.call(db, doc, diffFun, cb);
	};


/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var utils = __webpack_require__(4);
	var merge = __webpack_require__(19);
	var errors = __webpack_require__(5);
	var EE = __webpack_require__(38).EventEmitter;
	var evalFilter = __webpack_require__(79);
	var evalView = __webpack_require__(80);
	module.exports = Changes;
	utils.inherits(Changes, EE);

	function Changes(db, opts, callback) {
	  EE.call(this);
	  var self = this;
	  this.db = db;
	  opts = opts ? utils.clone(opts) : {};
	  var oldComplete = callback || opts.complete || function () {};
	  var complete = opts.complete = utils.once(function (err, resp) {
	    if (err) {
	      self.emit('error', err);
	    } else {
	      self.emit('complete', resp);
	    }
	    self.removeAllListeners();
	    db.removeListener('destroyed', onDestroy);
	  });
	  if (oldComplete) {
	    self.on('complete', function (resp) {
	      oldComplete(null, resp);
	    });
	    self.on('error', function (err) {
	      oldComplete(err);
	    });
	  }
	  var oldOnChange = opts.onChange;
	  if (oldOnChange) {
	    self.on('change', oldOnChange);
	  }
	  function onDestroy() {
	    self.cancel();
	  }
	  db.once('destroyed', onDestroy);

	  opts.onChange = function (change) {
	    if (opts.isCancelled) {
	      return;
	    }
	    self.emit('change', change);
	    if (self.startSeq && self.startSeq <= change.seq) {
	      self.emit('uptodate');
	      self.startSeq = false;
	    }
	    if (change.deleted) {
	      self.emit('delete', change);
	    } else if (change.changes.length === 1 &&
	      change.changes[0].rev.slice(0, 2) === '1-') {
	      self.emit('create', change);
	    } else {
	      self.emit('update', change);
	    }
	  };

	  var promise = new utils.Promise(function (fulfill, reject) {
	    opts.complete = function (err, res) {
	      if (err) {
	        reject(err);
	      } else {
	        fulfill(res);
	      }
	    };
	  });
	  self.once('cancel', function () {
	    if (oldOnChange) {
	      self.removeListener('change', oldOnChange);
	    }
	    opts.complete(null, {status: 'cancelled'});
	  });
	  this.then = promise.then.bind(promise);
	  this['catch'] = promise['catch'].bind(promise);
	  this.then(function (result) {
	    complete(null, result);
	  }, complete);



	  if (!db.taskqueue.isReady) {
	    db.taskqueue.addTask(function () {
	      if (self.isCancelled) {
	        self.emit('cancel');
	      } else {
	        self.doChanges(opts);
	      }
	    });
	  } else {
	    self.doChanges(opts);
	  }
	}
	Changes.prototype.cancel = function () {
	  this.isCancelled = true;
	  if (this.db.taskqueue.isReady) {
	    this.emit('cancel');
	  }
	};
	function processChange(doc, metadata, opts) {
	  var changeList = [{rev: doc._rev}];
	  if (opts.style === 'all_docs') {
	    changeList = merge.collectLeaves(metadata.rev_tree)
	    .map(function (x) { return {rev: x.rev}; });
	  }
	  var change = {
	    id: metadata.id,
	    changes: changeList,
	    doc: doc
	  };

	  if (utils.isDeleted(metadata, doc._rev)) {
	    change.deleted = true;
	  }
	  if (opts.conflicts) {
	    change.doc._conflicts = merge.collectConflicts(metadata);
	    if (!change.doc._conflicts.length) {
	      delete change.doc._conflicts;
	    }
	  }
	  return change;
	}

	Changes.prototype.doChanges = function (opts) {
	  var self = this;
	  var callback = opts.complete;

	  opts = utils.clone(opts);
	  if ('live' in opts && !('continuous' in opts)) {
	    opts.continuous = opts.live;
	  }
	  opts.processChange = processChange;

	  if (opts.since === 'latest') {
	    opts.since = 'now';
	  }
	  if (!opts.since) {
	    opts.since = 0;
	  }
	  if (opts.since === 'now') {
	    this.db.info().then(function (info) {
	      if (self.isCancelled) {
	        callback(null, {status: 'cancelled'});
	        return;
	      }
	      opts.since = info.update_seq;
	      self.doChanges(opts);
	    }, callback);
	    return;
	  }

	  if (opts.continuous && opts.since !== 'now') {
	    this.db.info().then(function (info) {
	      self.startSeq = info.update_seq;
	    }, function (err) {
	      if (err.id === 'idbNull') {
	        //db closed before this returned
	        //thats ok
	        return;
	      }
	      throw err;
	    });
	  }

	  if (this.db.type() !== 'http' &&
	      opts.filter && typeof opts.filter === 'string' &&
	      !opts.doc_ids) {
	    return this.filterChanges(opts);
	  }

	  if (!('descending' in opts)) {
	    opts.descending = false;
	  }

	  // 0 and 1 should return 1 document
	  opts.limit = opts.limit === 0 ? 1 : opts.limit;
	  opts.complete = callback;
	  var newPromise = this.db._changes(opts);
	  if (newPromise && typeof newPromise.cancel === 'function') {
	    var cancel = self.cancel;
	    self.cancel = utils.getArguments(function (args) {
	      newPromise.cancel();
	      cancel.apply(this, args);
	    });
	  }
	};

	Changes.prototype.filterChanges = function (opts) {
	  var self = this;
	  var callback = opts.complete;
	  if (opts.filter === '_view') {
	    if (!opts.view || typeof opts.view !== 'string') {
	      var err = errors.error(errors.BAD_REQUEST,
	                             '`view` filter parameter is not provided.');
	      callback(err);
	      return;
	    }
	    // fetch a view from a design doc, make it behave like a filter
	    var viewName = opts.view.split('/');
	    this.db.get('_design/' + viewName[0], function (err, ddoc) {
	      if (self.isCancelled) {
	        callback(null, {status: 'cancelled'});
	        return;
	      }
	      if (err) {
	        callback(errors.generateErrorFromResponse(err));
	        return;
	      }
	      if (ddoc && ddoc.views && ddoc.views[viewName[1]]) {
	        
	        var filter = evalView(ddoc.views[viewName[1]].map);
	        opts.filter = filter;
	        self.doChanges(opts);
	        return;
	      }
	      var msg = ddoc.views ? 'missing json key: ' + viewName[1] :
	        'missing json key: views';
	      if (!err) {
	        err = errors.error(errors.MISSING_DOC, msg);
	      }
	      callback(err);
	      return;
	    });
	  } else {
	    // fetch a filter from a design doc
	    var filterName = opts.filter.split('/');
	    this.db.get('_design/' + filterName[0], function (err, ddoc) {
	      if (self.isCancelled) {
	        callback(null, {status: 'cancelled'});
	        return;
	      }
	      if (err) {
	        callback(errors.generateErrorFromResponse(err));
	        return;
	      }
	      if (ddoc && ddoc.filters && ddoc.filters[filterName[1]]) {
	        var filter = evalFilter(ddoc.filters[filterName[1]]);
	        opts.filter = filter;
	        self.doChanges(opts);
	        return;
	      } else {
	        var msg = (ddoc && ddoc.filters) ? 'missing json key: ' + filterName[1]
	          : 'missing json key: filters';
	        if (!err) {
	          err = errors.error(errors.MISSING_DOC, msg);
	        }
	        callback(err);
	        return;
	      }
	    });
	  }
	};

/***/ },
/* 70 */
/***/ function(module, exports, __webpack_require__) {

	var clone = __webpack_require__(89)

	module.exports = 
	function fixRange(opts) {
	  opts = clone(opts)

	  var reverse = opts.reverse
	  var end     = opts.max || opts.end
	  var start   = opts.min || opts.start

	  var range = [start, end]
	  if(start != null && end != null)
	    range.sort()
	  if(reverse)
	    range = range.reverse()

	  opts.start   = range[0]
	  opts.end     = range[1]

	  delete opts.min
	  delete opts.max

	  return opts
	}


/***/ },
/* 71 */
/***/ function(module, exports, __webpack_require__) {

	var ranges = __webpack_require__(81)

	module.exports = function (db) {

	  if(db.hooks) {
	    return     
	  }

	  var posthooks = []
	  var prehooks  = []

	  function getPrefix (p) {
	    return p && (
	        'string' ===   typeof p        ? p
	      : 'string' ===   typeof p.prefix ? p.prefix
	      : 'function' === typeof p.prefix ? p.prefix()
	      :                                  ''
	      )
	  }

	  function getKeyEncoding (db) {
	    if(db && db._getKeyEncoding)
	      return db._getKeyEncoding(db)
	  }

	  function getValueEncoding (db) {
	    if(db && db._getValueEncoding)
	      return db._getValueEncoding(db)
	  }

	  function remover (array, item) {
	    return function () {
	      var i = array.indexOf(item)
	      if(!~i) return false        
	      array.splice(i, 1)
	      return true
	    }
	  }

	  db.hooks = {
	    post: function (prefix, hook) {
	      if(!hook) hook = prefix, prefix = ''
	      var h = {test: ranges.checker(prefix), hook: hook}
	      posthooks.push(h)
	      return remover(posthooks, h)
	    },
	    pre: function (prefix, hook) {
	      if(!hook) hook = prefix, prefix = ''
	      var h = {
	        test: ranges.checker(prefix),
	        hook: hook,
	        safe: false !== prefix.safe
	      }
	      prehooks.push(h)
	      return remover(prehooks, h)
	    },
	    posthooks: posthooks,
	    prehooks: prehooks
	  }

	  //POST HOOKS

	  function each (e) {
	    if(e && e.type) {
	      posthooks.forEach(function (h) {
	        if(h.test(e.key)) h.hook(e)
	      })
	    }
	  }

	  db.on('put', function (key, val) {
	    each({type: 'put', key: key, value: val})
	  })
	  db.on('del', function (key, val) {
	    each({type: 'del', key: key, value: val})
	  })
	  db.on('batch', function onBatch (ary) {
	    ary.forEach(each)
	  })

	  //PRE HOOKS

	  var put = db.put
	  var del = db.del
	  var batch = db.batch

	  function callHooks (isBatch, b, opts, cb) {
	    try {
	    b.forEach(function hook(e, i) {
	      prehooks.forEach(function (h) {
	        if(h.test(String(e.key))) {
	          //optimize this?
	          //maybe faster to not create a new object each time?
	          //have one object and expose scope to it?
	          var context = {
	            add: function (ch, db) {
	              if(typeof ch === 'undefined') {
	                return this
	              }
	              if(ch === false)
	                return delete b[i]
	              var prefix = (
	                getPrefix(ch.prefix) || 
	                getPrefix(db) || 
	                h.prefix || ''
	              )  
	              //don't leave a circular json object there incase using multilevel.
	              if(prefix) ch.prefix = prefix
	              ch.key = prefix + ch.key
	              if(h.safe && h.test(String(ch.key))) {
	                //this usually means a stack overflow.
	                throw new Error('prehook cannot insert into own range')
	              }
	              var ke = ch.keyEncoding   || getKeyEncoding(ch.prefix)
	              var ve = ch.valueEncoding || getValueEncoding(ch.prefix)
	              if(ke) ch.keyEncoding = ke
	              if(ve) ch.valueEncoding = ve

	              b.push(ch)
	              hook(ch, b.length - 1)
	              return this
	            },
	            put: function (ch, db) {
	              if('object' === typeof ch) ch.type = 'put'
	              return this.add(ch, db)
	            },
	            del: function (ch, db) {
	              if('object' === typeof ch) ch.type = 'del'
	              return this.add(ch, db)
	            },
	            veto: function () {
	              return this.add(false)
	            }
	          }
	          h.hook.call(context, e, context.add, b)
	        }
	      })
	    })
	    } catch (err) {
	      return (cb || opts)(err)
	    }
	    b = b.filter(function (e) {
	      return e && e.type //filter out empty items
	    })

	    if(b.length == 1 && !isBatch) {
	      var change = b[0]
	      return change.type == 'put' 
	        ? put.call(db, change.key, change.value, opts, cb) 
	        : del.call(db, change.key, opts, cb)  
	    }
	    return batch.call(db, b, opts, cb)
	  }

	  db.put = function (key, value, opts, cb ) {
	    var batch = [{key: key, value: value, type: 'put'}]
	    return callHooks(false, batch, opts, cb)
	  }

	  db.del = function (key, opts, cb) {
	    var batch = [{key: key, type: 'del'}]
	    return callHooks(false, batch, opts, cb)
	  }

	  db.batch = function (batch, opts, cb) {
	    return callHooks(true, batch, opts, cb)
	  }
	}


/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	exports.read = function(buffer, offset, isLE, mLen, nBytes) {
	  var e, m,
	      eLen = nBytes * 8 - mLen - 1,
	      eMax = (1 << eLen) - 1,
	      eBias = eMax >> 1,
	      nBits = -7,
	      i = isLE ? (nBytes - 1) : 0,
	      d = isLE ? -1 : 1,
	      s = buffer[offset + i];

	  i += d;

	  e = s & ((1 << (-nBits)) - 1);
	  s >>= (-nBits);
	  nBits += eLen;
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

	  m = e & ((1 << (-nBits)) - 1);
	  e >>= (-nBits);
	  nBits += mLen;
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

	  if (e === 0) {
	    e = 1 - eBias;
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity);
	  } else {
	    m = m + Math.pow(2, mLen);
	    e = e - eBias;
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
	};

	exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c,
	      eLen = nBytes * 8 - mLen - 1,
	      eMax = (1 << eLen) - 1,
	      eBias = eMax >> 1,
	      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
	      i = isLE ? 0 : (nBytes - 1),
	      d = isLE ? 1 : -1,
	      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	  value = Math.abs(value);

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0;
	    e = eMax;
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2);
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--;
	      c *= 2;
	    }
	    if (e + eBias >= 1) {
	      value += rt / c;
	    } else {
	      value += rt * Math.pow(2, 1 - eBias);
	    }
	    if (value * c >= 2) {
	      e++;
	      c /= 2;
	    }

	    if (e + eBias >= eMax) {
	      m = 0;
	      e = eMax;
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen);
	      e = e + eBias;
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	      e = 0;
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

	  e = (e << mLen) | m;
	  eLen += mLen;
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

	  buffer[offset + i - d] |= s * 128;
	};


/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * isArray
	 */

	var isArray = Array.isArray;

	/**
	 * toString
	 */

	var str = Object.prototype.toString;

	/**
	 * Whether or not the given `val`
	 * is an array.
	 *
	 * example:
	 *
	 *        isArray([]);
	 *        // > true
	 *        isArray(arguments);
	 *        // > false
	 *        isArray('');
	 *        // > false
	 *
	 * @param {mixed} val
	 * @return {bool}
	 */

	module.exports = isArray || function (val) {
	  return !! val && '[object Array]' == str.call(val);
	};


/***/ },
/* 74 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	exports.deprecate = function(fn, msg) {
	  // Allow for deprecating things in the process of starting up.
	  if (isUndefined(global.process)) {
	    return function() {
	      return exports.deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  if (process.noDeprecation === true) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnviron;
	exports.debuglog = function(set) {
	  if (isUndefined(debugEnviron))
	    debugEnviron = process.env.NODE_DEBUG || '';
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
	      var pid = process.pid;
	      debugs[set] = function() {
	        var msg = exports.format.apply(exports, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    exports._extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}
	exports.inspect = inspect;


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== exports.inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').substr(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.substr(1, name.length - 2);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var numLinesEst = 0;
	  var length = output.reduce(function(prev, cur) {
	    numLinesEst++;
	    if (cur.indexOf('\n') >= 0) numLinesEst++;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = __webpack_require__(87);

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	exports.log = function() {
	  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
	};


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */
	exports.inherits = __webpack_require__(91);

	exports._extend = function(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	};

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(13)))

/***/ },
/* 75 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function pad(str, padWith, upToLength) {
	  var padding = '';
	  var targetLength = upToLength - str.length;
	  while (padding.length < targetLength) {
	    padding += padWith;
	  }
	  return padding;
	}

	exports.padLeft = function (str, padWith, upToLength) {
	  var padding = pad(str, padWith, upToLength);
	  return padding + str;
	};

	exports.padRight = function (str, padWith, upToLength) {
	  var padding = pad(str, padWith, upToLength);
	  return str + padding;
	};

	exports.stringLexCompare = function (a, b) {

	  var aLen = a.length;
	  var bLen = b.length;

	  var i;
	  for (i = 0; i < aLen; i++) {
	    if (i === bLen) {
	      // b is shorter substring of a
	      return 1;
	    }
	    var aChar = a.charAt(i);
	    var bChar = b.charAt(i);
	    if (aChar !== bChar) {
	      return aChar < bChar ? -1 : 1;
	    }
	  }

	  if (aLen < bLen) {
	    // a is shorter substring of b
	    return -1;
	  }

	  return 0;
	};

	/*
	 * returns the decimal form for the given integer, i.e. writes
	 * out all the digits (in base-10) instead of using scientific notation
	 */
	exports.intToDecimalForm = function (int) {

	  var isNeg = int < 0;
	  var result = '';

	  do {
	    var remainder = isNeg ? -Math.ceil(int % 10) : Math.floor(int % 10);

	    result = remainder + result;
	    int = isNeg ? Math.ceil(int / 10) : Math.floor(int / 10);
	  } while (int);


	  if (isNeg && result !== '0') {
	    result = '-' + result;
	  }

	  return result;
	};

/***/ },
/* 76 */
/***/ function(module, exports, __webpack_require__) {

	var Keys = __webpack_require__(90)
	var hasKeys = __webpack_require__(85)

	module.exports = extend

	function extend() {
	    var target = {}

	    for (var i = 0; i < arguments.length; i++) {
	        var source = arguments[i]

	        if (!hasKeys(source)) {
	            continue
	        }

	        var keys = Keys(source)

	        for (var j = 0; j < keys.length; j++) {
	            var name = keys[j]
	            target[name] = source[name]
	        }
	    }

	    return target
	}


/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS)
				return 62 // '+'
			if (code === SLASH)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}(false ? (this.base64js = {}) : exports))


/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(86)


/***/ },
/* 79 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = evalFilter;
	function evalFilter(input) {
	  /*jshint evil: true */
	  return eval([
	    '(function () { return ',
	    input,
	    ' })()'
	  ].join(''));
	}

/***/ },
/* 80 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = evalView;
	function evalView(input) {
	  /*jshint evil: true */
	  return eval([
	    '(function () {',
	    '  return function (doc) {',
	    '    var emitted = false;',
	    '    var emit = function (a, b) {',
	    '      emitted = true;',
	    '    };',
	    '    var view = ' + input + ';',
	    '    view(doc);',
	    '    if (emitted) {',
	    '      return true;',
	    '    }',
	    '  }',
	    '})()'
	  ].join('\n'));
	}

/***/ },
/* 81 */
/***/ function(module, exports, __webpack_require__) {

	
	//force to a valid range
	var range = exports.range = function (obj) {
	  return null == obj ? {} : 'string' === typeof range ? {
	      min: range, max: range + '\xff'
	    } :  obj
	}

	//turn into a sub range.
	var prefix = exports.prefix = function (range, within, term) {
	  range = exports.range(range)
	  var _range = {}
	  term = term || '\xff'
	  if(range instanceof RegExp || 'function' == typeof range) {
	    _range.min = within
	    _range.max   = within + term,
	    _range.inner = function (k) {
	      var j = k.substring(within.length)
	      if(range.test)
	        return range.test(j)
	      return range(j)
	    }
	  }
	  else if('object' === typeof range) {
	    _range.min = within + (range.min || range.start || '')
	    _range.max = within + (range.max || range.end   || (term || '~'))
	    _range.reverse = !!range.reverse
	  }
	  return _range
	}

	//return a function that checks a range
	var checker = exports.checker = function (range) {
	  if(!range) range = {}

	  if ('string' === typeof range)
	    return function (key) {
	      return key.indexOf(range) == 0
	    }
	  else if(range instanceof RegExp)
	    return function (key) {
	      return range.test(key)
	    }
	  else if('object' === typeof range)
	    return function (key) {
	      var min = range.min || range.start
	      var max = range.max || range.end

	      // fixes keys passed as ints from sublevels
	      key = String(key)

	      return (
	        !min || key >= min
	      ) && (
	        !max || key <= max
	      ) && (
	        !range.inner || (
	          range.inner.test 
	            ? range.inner.test(key)
	            : range.inner(key)
	        )
	      )
	    }
	  else if('function' === typeof range)
	    return range
	}
	//check if a key is within a range.
	var satifies = exports.satisfies = function (key, range) {
	  return checker(range)(key)
	}




/***/ },
/* 82 */
/***/ function(module, exports, __webpack_require__) {

	var Keys = __webpack_require__(92)
	var hasKeys = __webpack_require__(88)

	module.exports = extend

	function extend() {
	    var target = {}

	    for (var i = 0; i < arguments.length; i++) {
	        var source = arguments[i]

	        if (!hasKeys(source)) {
	            continue
	        }

	        var keys = Keys(source)

	        for (var j = 0; j < keys.length; j++) {
	            var name = keys[j]
	            target[name] = source[name]
	        }
	    }

	    return target
	}


/***/ },
/* 83 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var PouchPromise;
	/* istanbul ignore next */
	if (typeof window !== 'undefined' && window.PouchDB) {
	  PouchPromise = window.PouchDB.utils.Promise;
	} else {
	  PouchPromise = typeof global.Promise === 'function' ? global.Promise : __webpack_require__(50);
	}

	// this is essentially the "update sugar" function from daleharvey/pouchdb#1388
	// the diffFun tells us what delta to apply to the doc.  it either returns
	// the doc, or false if it doesn't need to do an update after all
	function upsertInner(db, docId, diffFun) {
	  return new PouchPromise(function (fulfill, reject) {
	    if (typeof docId !== 'string') {
	      return reject(new Error('doc id is required'));
	    }

	    db.get(docId, function (err, doc) {
	      if (err) {
	        /* istanbul ignore next */
	        if (err.status !== 404) {
	          return reject(err);
	        }
	        doc = {};
	      }

	      // the user might change the _rev, so save it for posterity
	      var docRev = doc._rev;
	      var newDoc = diffFun(doc);

	      if (!newDoc) {
	        // if the diffFun returns falsy, we short-circuit as
	        // an optimization
	        return fulfill({updated: false, rev: docRev});
	      }

	      // users aren't allowed to modify these values,
	      // so reset them here
	      newDoc._id = docId;
	      newDoc._rev = docRev;
	      fulfill(tryAndPut(db, newDoc, diffFun));
	    });
	  });
	}

	function tryAndPut(db, doc, diffFun) {
	  return db.put(doc).then(function (res) {
	    return {
	      updated: true,
	      rev: res.rev
	    };
	  }, function (err) {
	    /* istanbul ignore next */
	    if (err.status !== 409) {
	      throw err;
	    }
	    return upsertInner(db, doc._id, diffFun);
	  });
	}

	exports.upsert = function upsert(docId, diffFun, cb) {
	  var db = this;
	  var promise = upsertInner(db, docId, diffFun);
	  if (typeof cb !== 'function') {
	    return promise;
	  }
	  promise.then(function (resp) {
	    cb(null, resp);
	  }, cb);
	};

	exports.putIfNotExists = function putIfNotExists(docId, doc, cb) {
	  var db = this;

	  if (typeof docId !== 'string') {
	    cb = doc;
	    doc = docId;
	    docId = doc._id;
	  }

	  var diffFun = function (existingDoc) {
	    if (existingDoc._rev) {
	      return false; // do nothing
	    }
	    return doc;
	  };

	  var promise = upsertInner(db, docId, diffFun);
	  if (typeof cb !== 'function') {
	    return promise;
	  }
	  promise.then(function (resp) {
	    cb(null, resp);
	  }, cb);
	};


	/* istanbul ignore next */
	if (typeof window !== 'undefined' && window.PouchDB) {
	  window.PouchDB.plugin(exports);
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 84 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Helpers.
	 */

	var s = 1000;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var y = d * 365.25;

	/**
	 * Parse or format the given `val`.
	 *
	 * Options:
	 *
	 *  - `long` verbose formatting [false]
	 *
	 * @param {String|Number} val
	 * @param {Object} options
	 * @return {String|Number}
	 * @api public
	 */

	module.exports = function(val, options){
	  options = options || {};
	  if ('string' == typeof val) return parse(val);
	  return options.long
	    ? long(val)
	    : short(val);
	};

	/**
	 * Parse the given `str` and return milliseconds.
	 *
	 * @param {String} str
	 * @return {Number}
	 * @api private
	 */

	function parse(str) {
	  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
	  if (!match) return;
	  var n = parseFloat(match[1]);
	  var type = (match[2] || 'ms').toLowerCase();
	  switch (type) {
	    case 'years':
	    case 'year':
	    case 'yrs':
	    case 'yr':
	    case 'y':
	      return n * y;
	    case 'days':
	    case 'day':
	    case 'd':
	      return n * d;
	    case 'hours':
	    case 'hour':
	    case 'hrs':
	    case 'hr':
	    case 'h':
	      return n * h;
	    case 'minutes':
	    case 'minute':
	    case 'mins':
	    case 'min':
	    case 'm':
	      return n * m;
	    case 'seconds':
	    case 'second':
	    case 'secs':
	    case 'sec':
	    case 's':
	      return n * s;
	    case 'milliseconds':
	    case 'millisecond':
	    case 'msecs':
	    case 'msec':
	    case 'ms':
	      return n;
	  }
	}

	/**
	 * Short format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function short(ms) {
	  if (ms >= d) return Math.round(ms / d) + 'd';
	  if (ms >= h) return Math.round(ms / h) + 'h';
	  if (ms >= m) return Math.round(ms / m) + 'm';
	  if (ms >= s) return Math.round(ms / s) + 's';
	  return ms + 'ms';
	}

	/**
	 * Long format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function long(ms) {
	  return plural(ms, d, 'day')
	    || plural(ms, h, 'hour')
	    || plural(ms, m, 'minute')
	    || plural(ms, s, 'second')
	    || ms + ' ms';
	}

	/**
	 * Pluralization helper.
	 */

	function plural(ms, n, name) {
	  if (ms < n) return;
	  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
	  return Math.ceil(ms / n) + ' ' + name + 's';
	}


/***/ },
/* 85 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = hasKeys

	function hasKeys(source) {
	    return source !== null &&
	        (typeof source === "object" ||
	        typeof source === "function")
	}


/***/ },
/* 86 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.


	// a transform stream is a readable/writable stream where you do
	// something with the data.  Sometimes it's called a "filter",
	// but that's not a great name for it, since that implies a thing where
	// some bits pass through, and others are simply ignored.  (That would
	// be a valid example of a transform, of course.)
	//
	// While the output is causally related to the input, it's not a
	// necessarily symmetric or synchronous transformation.  For example,
	// a zlib stream might take multiple plain-text writes(), and then
	// emit a single compressed chunk some time in the future.
	//
	// Here's how this works:
	//
	// The Transform stream has all the aspects of the readable and writable
	// stream classes.  When you write(chunk), that calls _write(chunk,cb)
	// internally, and returns false if there's a lot of pending writes
	// buffered up.  When you call read(), that calls _read(n) until
	// there's enough pending readable data buffered up.
	//
	// In a transform stream, the written data is placed in a buffer.  When
	// _read(n) is called, it transforms the queued up data, calling the
	// buffered _write cb's as it consumes chunks.  If consuming a single
	// written chunk would result in multiple output chunks, then the first
	// outputted bit calls the readcb, and subsequent chunks just go into
	// the read buffer, and will cause it to emit 'readable' if necessary.
	//
	// This way, back-pressure is actually determined by the reading side,
	// since _read has to be called to start processing a new chunk.  However,
	// a pathological inflate type of transform can cause excessive buffering
	// here.  For example, imagine a stream where every byte of input is
	// interpreted as an integer from 0-255, and then results in that many
	// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
	// 1kb of data being output.  In this case, you could write a very small
	// amount of input, and end up with a very large amount of output.  In
	// such a pathological inflating mechanism, there'd be no way to tell
	// the system to stop doing the transform.  A single 4MB write could
	// cause the system to run out of memory.
	//
	// However, even in such a pathological case, only a single written chunk
	// would be consumed, and then the rest would wait (un-transformed) until
	// the results of the previous transformed chunk were consumed.

	module.exports = Transform;

	var Duplex = __webpack_require__(93);

	/*<replacement>*/
	var util = __webpack_require__(98);
	util.inherits = __webpack_require__(51);
	/*</replacement>*/

	util.inherits(Transform, Duplex);


	function TransformState(options, stream) {
	  this.afterTransform = function(er, data) {
	    return afterTransform(stream, er, data);
	  };

	  this.needTransform = false;
	  this.transforming = false;
	  this.writecb = null;
	  this.writechunk = null;
	}

	function afterTransform(stream, er, data) {
	  var ts = stream._transformState;
	  ts.transforming = false;

	  var cb = ts.writecb;

	  if (!cb)
	    return stream.emit('error', new Error('no writecb in Transform class'));

	  ts.writechunk = null;
	  ts.writecb = null;

	  if (data !== null && data !== undefined)
	    stream.push(data);

	  if (cb)
	    cb(er);

	  var rs = stream._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    stream._read(rs.highWaterMark);
	  }
	}


	function Transform(options) {
	  if (!(this instanceof Transform))
	    return new Transform(options);

	  Duplex.call(this, options);

	  var ts = this._transformState = new TransformState(options, this);

	  // when the writable side finishes, then flush out anything remaining.
	  var stream = this;

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;

	  this.once('finish', function() {
	    if ('function' === typeof this._flush)
	      this._flush(function(er) {
	        done(stream, er);
	      });
	    else
	      done(stream);
	  });
	}

	Transform.prototype.push = function(chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function(chunk, encoding, cb) {
	  throw new Error('not implemented');
	};

	Transform.prototype._write = function(chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform ||
	        rs.needReadable ||
	        rs.length < rs.highWaterMark)
	      this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function(n) {
	  var ts = this._transformState;

	  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};


	function done(stream, er) {
	  if (er)
	    return stream.emit('error', er);

	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  var ws = stream._writableState;
	  var rs = stream._readableState;
	  var ts = stream._transformState;

	  if (ws.length)
	    throw new Error('calling transform done when ws.length != 0');

	  if (ts.transforming)
	    throw new Error('calling transform done when still transforming');

	  return stream.push(null);
	}


/***/ },
/* 87 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function isBuffer(arg) {
	  return arg && typeof arg === 'object'
	    && typeof arg.copy === 'function'
	    && typeof arg.fill === 'function'
	    && typeof arg.readUInt8 === 'function';
	}

/***/ },
/* 88 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = hasKeys

	function hasKeys(source) {
	    return source !== null &&
	        (typeof source === "object" ||
	        typeof source === "function")
	}


/***/ },
/* 89 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {'use strict';

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}

	// shim for Node's 'util' package
	// DO NOT REMOVE THIS! It is required for compatibility with EnderJS (http://enderjs.com/).
	var util = {
	  isArray: function (ar) {
	    return Array.isArray(ar) || (typeof ar === 'object' && objectToString(ar) === '[object Array]');
	  },
	  isDate: function (d) {
	    return typeof d === 'object' && objectToString(d) === '[object Date]';
	  },
	  isRegExp: function (re) {
	    return typeof re === 'object' && objectToString(re) === '[object RegExp]';
	  },
	  getRegExpFlags: function (re) {
	    var flags = '';
	    re.global && (flags += 'g');
	    re.ignoreCase && (flags += 'i');
	    re.multiline && (flags += 'm');
	    return flags;
	  }
	};


	if (true)
	  module.exports = clone;

	/**
	 * Clones (copies) an Object using deep copying.
	 *
	 * This function supports circular references by default, but if you are certain
	 * there are no circular references in your object, you can save some CPU time
	 * by calling clone(obj, false).
	 *
	 * Caution: if `circular` is false and `parent` contains circular references,
	 * your program may enter an infinite loop and crash.
	 *
	 * @param `parent` - the object to be cloned
	 * @param `circular` - set to true if the object to be cloned may contain
	 *    circular references. (optional - true by default)
	 * @param `depth` - set to a number if the object is only to be cloned to
	 *    a particular depth. (optional - defaults to Infinity)
	 * @param `prototype` - sets the prototype to be used when cloning an object.
	 *    (optional - defaults to parent prototype).
	*/

	function clone(parent, circular, depth, prototype) {
	  // maintain two arrays for circular references, where corresponding parents
	  // and children have the same index
	  var allParents = [];
	  var allChildren = [];

	  var useBuffer = typeof Buffer != 'undefined';

	  if (typeof circular == 'undefined')
	    circular = true;

	  if (typeof depth == 'undefined')
	    depth = Infinity;

	  // recurse this function so we don't reset allParents and allChildren
	  function _clone(parent, depth) {
	    // cloning null always returns null
	    if (parent === null)
	      return null;

	    if (depth == 0)
	      return parent;

	    var child;
	    var proto;
	    if (typeof parent != 'object') {
	      return parent;
	    }

	    if (util.isArray(parent)) {
	      child = [];
	    } else if (util.isRegExp(parent)) {
	      child = new RegExp(parent.source, util.getRegExpFlags(parent));
	      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
	    } else if (util.isDate(parent)) {
	      child = new Date(parent.getTime());
	    } else if (useBuffer && Buffer.isBuffer(parent)) {
	      child = new Buffer(parent.length);
	      parent.copy(child);
	      return child;
	    } else {
	      if (typeof prototype == 'undefined') {
	        proto = Object.getPrototypeOf(parent);
	        child = Object.create(proto);
	      }
	      else {
	        child = Object.create(prototype);
	        proto = prototype;
	      }
	    }

	    if (circular) {
	      var index = allParents.indexOf(parent);

	      if (index != -1) {
	        return allChildren[index];
	      }
	      allParents.push(parent);
	      allChildren.push(child);
	    }

	    for (var i in parent) {
	      var attrs;
	      if (proto) {
	        attrs = Object.getOwnPropertyDescriptor(proto, i);
	      }
	      
	      if (attrs && attrs.set == null) {
	        continue;
	      }
	      child[i] = _clone(parent[i], depth - 1);
	    }

	    return child;
	  }

	  return _clone(parent, depth);
	}

	/**
	 * Simple flat clone using prototype, accepts only objects, usefull for property
	 * override on FLAT configuration object (no nested props).
	 *
	 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
	 * works.
	 */
	clone.clonePrototype = function(parent) {
	  if (parent === null)
	    return null;

	  var c = function () {};
	  c.prototype = parent;
	  return new c();
	};
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(45).Buffer))

/***/ },
/* 90 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = Object.keys || __webpack_require__(94);



/***/ },
/* 91 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 92 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = Object.keys || __webpack_require__(95);



/***/ },
/* 93 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a duplex stream is just a stream that is both readable and writable.
	// Since JS doesn't have multiple prototypal inheritance, this class
	// prototypally inherits from Readable, and then parasitically from
	// Writable.

	module.exports = Duplex;

	/*<replacement>*/
	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}
	/*</replacement>*/


	/*<replacement>*/
	var util = __webpack_require__(98);
	util.inherits = __webpack_require__(51);
	/*</replacement>*/

	var Readable = __webpack_require__(96);
	var Writable = __webpack_require__(97);

	util.inherits(Duplex, Readable);

	forEach(objectKeys(Writable.prototype), function(method) {
	  if (!Duplex.prototype[method])
	    Duplex.prototype[method] = Writable.prototype[method];
	});

	function Duplex(options) {
	  if (!(this instanceof Duplex))
	    return new Duplex(options);

	  Readable.call(this, options);
	  Writable.call(this, options);

	  if (options && options.readable === false)
	    this.readable = false;

	  if (options && options.writable === false)
	    this.writable = false;

	  this.allowHalfOpen = true;
	  if (options && options.allowHalfOpen === false)
	    this.allowHalfOpen = false;

	  this.once('end', onend);
	}

	// the no-half-open enforcer
	function onend() {
	  // if we allow half-open state, or if the writable side ended,
	  // then we're ok.
	  if (this.allowHalfOpen || this._writableState.ended)
	    return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  process.nextTick(this.end.bind(this));
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 94 */
/***/ function(module, exports, __webpack_require__) {

	(function () {
		"use strict";

		// modified from https://github.com/kriskowal/es5-shim
		var has = Object.prototype.hasOwnProperty,
			toString = Object.prototype.toString,
			forEach = __webpack_require__(99),
			isArgs = __webpack_require__(100),
			hasDontEnumBug = !({'toString': null}).propertyIsEnumerable('toString'),
			hasProtoEnumBug = (function () {}).propertyIsEnumerable('prototype'),
			dontEnums = [
				"toString",
				"toLocaleString",
				"valueOf",
				"hasOwnProperty",
				"isPrototypeOf",
				"propertyIsEnumerable",
				"constructor"
			],
			keysShim;

		keysShim = function keys(object) {
			var isObject = object !== null && typeof object === 'object',
				isFunction = toString.call(object) === '[object Function]',
				isArguments = isArgs(object),
				theKeys = [];

			if (!isObject && !isFunction && !isArguments) {
				throw new TypeError("Object.keys called on a non-object");
			}

			if (isArguments) {
				forEach(object, function (value) {
					theKeys.push(value);
				});
			} else {
				var name,
					skipProto = hasProtoEnumBug && isFunction;

				for (name in object) {
					if (!(skipProto && name === 'prototype') && has.call(object, name)) {
						theKeys.push(name);
					}
				}
			}

			if (hasDontEnumBug) {
				var ctor = object.constructor,
					skipConstructor = ctor && ctor.prototype === object;

				forEach(dontEnums, function (dontEnum) {
					if (!(skipConstructor && dontEnum === 'constructor') && has.call(object, dontEnum)) {
						theKeys.push(dontEnum);
					}
				});
			}
			return theKeys;
		};

		module.exports = keysShim;
	}());



/***/ },
/* 95 */
/***/ function(module, exports, __webpack_require__) {

	(function () {
		"use strict";

		// modified from https://github.com/kriskowal/es5-shim
		var has = Object.prototype.hasOwnProperty,
			is = __webpack_require__(104),
			forEach = __webpack_require__(105),
			hasDontEnumBug = !({'toString': null}).propertyIsEnumerable('toString'),
			dontEnums = [
				"toString",
				"toLocaleString",
				"valueOf",
				"hasOwnProperty",
				"isPrototypeOf",
				"propertyIsEnumerable",
				"constructor"
			],
			keysShim;

		keysShim = function keys(object) {
			if (!is.object(object) && !is.array(object)) {
				throw new TypeError("Object.keys called on a non-object");
			}

			var name, theKeys = [];
			for (name in object) {
				if (has.call(object, name)) {
					theKeys.push(name);
				}
			}

			if (hasDontEnumBug) {
				forEach(dontEnums, function (dontEnum) {
					if (has.call(object, dontEnum)) {
						theKeys.push(dontEnum);
					}
				});
			}
			return theKeys;
		};

		module.exports = keysShim;
	}());



/***/ },
/* 96 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Readable;

	/*<replacement>*/
	var isArray = __webpack_require__(101);
	/*</replacement>*/


	/*<replacement>*/
	var Buffer = __webpack_require__(45).Buffer;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	var EE = __webpack_require__(38).EventEmitter;

	/*<replacement>*/
	if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	var Stream = __webpack_require__(102);

	/*<replacement>*/
	var util = __webpack_require__(98);
	util.inherits = __webpack_require__(51);
	/*</replacement>*/

	var StringDecoder;

	util.inherits(Readable, Stream);

	function ReadableState(options, stream) {
	  options = options || {};

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  var hwm = options.highWaterMark;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.buffer = [];
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = false;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // In streams that never have any data, and do push(null) right away,
	  // the consumer can miss the 'end' event if they do some I/O before
	  // consuming the stream.  So, we don't emit('end') until some reading
	  // happens.
	  this.calledRead = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, becuase any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;


	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // when piping, we only care about 'readable' events that happen
	  // after read()ing all the bytes and not getting any pushback.
	  this.ranOut = false;

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;

	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder)
	      StringDecoder = __webpack_require__(103).StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  if (!(this instanceof Readable))
	    return new Readable(options);

	  this._readableState = new ReadableState(options, this);

	  // legacy
	  this.readable = true;

	  Stream.call(this);
	}

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function(chunk, encoding) {
	  var state = this._readableState;

	  if (typeof chunk === 'string' && !state.objectMode) {
	    encoding = encoding || state.defaultEncoding;
	    if (encoding !== state.encoding) {
	      chunk = new Buffer(chunk, encoding);
	      encoding = '';
	    }
	  }

	  return readableAddChunk(this, state, chunk, encoding, false);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function(chunk) {
	  var state = this._readableState;
	  return readableAddChunk(this, state, chunk, '', true);
	};

	function readableAddChunk(stream, state, chunk, encoding, addToFront) {
	  var er = chunkInvalid(state, chunk);
	  if (er) {
	    stream.emit('error', er);
	  } else if (chunk === null || chunk === undefined) {
	    state.reading = false;
	    if (!state.ended)
	      onEofChunk(stream, state);
	  } else if (state.objectMode || chunk && chunk.length > 0) {
	    if (state.ended && !addToFront) {
	      var e = new Error('stream.push() after EOF');
	      stream.emit('error', e);
	    } else if (state.endEmitted && addToFront) {
	      var e = new Error('stream.unshift() after end event');
	      stream.emit('error', e);
	    } else {
	      if (state.decoder && !addToFront && !encoding)
	        chunk = state.decoder.write(chunk);

	      // update the buffer info.
	      state.length += state.objectMode ? 1 : chunk.length;
	      if (addToFront) {
	        state.buffer.unshift(chunk);
	      } else {
	        state.reading = false;
	        state.buffer.push(chunk);
	      }

	      if (state.needReadable)
	        emitReadable(stream);

	      maybeReadMore(stream, state);
	    }
	  } else if (!addToFront) {
	    state.reading = false;
	  }

	  return needMoreData(state);
	}



	// if it's past the high water mark, we can push in some more.
	// Also, if we have no data yet, we can stand some
	// more bytes.  This is to work around cases where hwm=0,
	// such as the repl.  Also, if the push() triggered a
	// readable event, and the user called read(largeNumber) such that
	// needReadable was set, then we ought to push more, so that another
	// 'readable' event will be triggered.
	function needMoreData(state) {
	  return !state.ended &&
	         (state.needReadable ||
	          state.length < state.highWaterMark ||
	          state.length === 0);
	}

	// backwards compatibility.
	Readable.prototype.setEncoding = function(enc) {
	  if (!StringDecoder)
	    StringDecoder = __webpack_require__(103).StringDecoder;
	  this._readableState.decoder = new StringDecoder(enc);
	  this._readableState.encoding = enc;
	};

	// Don't raise the hwm > 128MB
	var MAX_HWM = 0x800000;
	function roundUpToNextPowerOf2(n) {
	  if (n >= MAX_HWM) {
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2
	    n--;
	    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
	    n++;
	  }
	  return n;
	}

	function howMuchToRead(n, state) {
	  if (state.length === 0 && state.ended)
	    return 0;

	  if (state.objectMode)
	    return n === 0 ? 0 : 1;

	  if (n === null || isNaN(n)) {
	    // only flow one buffer at a time
	    if (state.flowing && state.buffer.length)
	      return state.buffer[0].length;
	    else
	      return state.length;
	  }

	  if (n <= 0)
	    return 0;

	  // If we're asking for more than the target buffer level,
	  // then raise the water mark.  Bump up to the next highest
	  // power of 2, to prevent increasing it excessively in tiny
	  // amounts.
	  if (n > state.highWaterMark)
	    state.highWaterMark = roundUpToNextPowerOf2(n);

	  // don't have that much.  return null, unless we've ended.
	  if (n > state.length) {
	    if (!state.ended) {
	      state.needReadable = true;
	      return 0;
	    } else
	      return state.length;
	  }

	  return n;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function(n) {
	  var state = this._readableState;
	  state.calledRead = true;
	  var nOrig = n;
	  var ret;

	  if (typeof n !== 'number' || n > 0)
	    state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 &&
	      state.needReadable &&
	      (state.length >= state.highWaterMark || state.ended)) {
	    emitReadable(this);
	    return null;
	  }

	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    ret = null;

	    // In cases where the decoder did not receive enough data
	    // to produce a full chunk, then immediately received an
	    // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
	    // howMuchToRead will see this and coerce the amount to
	    // read to zero (because it's looking at the length of the
	    // first <Buffer > in state.buffer), and we'll end up here.
	    //
	    // This can only happen via state.decoder -- no other venue
	    // exists for pushing a zero-length chunk into state.buffer
	    // and triggering this behavior. In this case, we return our
	    // remaining data and end the stream, if appropriate.
	    if (state.length > 0 && state.decoder) {
	      ret = fromList(n, state);
	      state.length -= ret.length;
	    }

	    if (state.length === 0)
	      endReadable(this);

	    return ret;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length - n <= state.highWaterMark)
	    doRead = true;

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading)
	    doRead = false;

	  if (doRead) {
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0)
	      state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	  }

	  // If _read called its callback synchronously, then `reading`
	  // will be false, and we need to re-evaluate how much data we
	  // can return to the user.
	  if (doRead && !state.reading)
	    n = howMuchToRead(nOrig, state);

	  if (n > 0)
	    ret = fromList(n, state);
	  else
	    ret = null;

	  if (ret === null) {
	    state.needReadable = true;
	    n = 0;
	  }

	  state.length -= n;

	  // If we have nothing in the buffer, then we want to know
	  // as soon as we *do* get something into the buffer.
	  if (state.length === 0 && !state.ended)
	    state.needReadable = true;

	  // If we happened to read() exactly the remaining amount in the
	  // buffer, and the EOF has been seen at this point, then make sure
	  // that we emit 'end' on the very next tick.
	  if (state.ended && !state.endEmitted && state.length === 0)
	    endReadable(this);

	  return ret;
	};

	function chunkInvalid(state, chunk) {
	  var er = null;
	  if (!Buffer.isBuffer(chunk) &&
	      'string' !== typeof chunk &&
	      chunk !== null &&
	      chunk !== undefined &&
	      !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  return er;
	}


	function onEofChunk(stream, state) {
	  if (state.decoder && !state.ended) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;

	  // if we've ended and we have some data left, then emit
	  // 'readable' now to make sure it gets picked up.
	  if (state.length > 0)
	    emitReadable(stream);
	  else
	    endReadable(stream);
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  state.needReadable = false;
	  if (state.emittedReadable)
	    return;

	  state.emittedReadable = true;
	  if (state.sync)
	    process.nextTick(function() {
	      emitReadable_(stream);
	    });
	  else
	    emitReadable_(stream);
	}

	function emitReadable_(stream) {
	  stream.emit('readable');
	}


	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    process.nextTick(function() {
	      maybeReadMore_(stream, state);
	    });
	  }
	}

	function maybeReadMore_(stream, state) {
	  var len = state.length;
	  while (!state.reading && !state.flowing && !state.ended &&
	         state.length < state.highWaterMark) {
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;
	    else
	      len = state.length;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function(n) {
	  this.emit('error', new Error('not implemented'));
	};

	Readable.prototype.pipe = function(dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;

	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;

	  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
	              dest !== process.stdout &&
	              dest !== process.stderr;

	  var endFn = doEnd ? onend : cleanup;
	  if (state.endEmitted)
	    process.nextTick(endFn);
	  else
	    src.once('end', endFn);

	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable) {
	    if (readable !== src) return;
	    cleanup();
	  }

	  function onend() {
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);

	  function cleanup() {
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', cleanup);

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (!dest._writableState || dest._writableState.needDrain)
	      ondrain();
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  function onerror(er) {
	    unpipe();
	    dest.removeListener('error', onerror);
	    if (EE.listenerCount(dest, 'error') === 0)
	      dest.emit('error', er);
	  }
	  // This is a brutally ugly hack to make sure that our error handler
	  // is attached before any userland ones.  NEVER DO THIS.
	  if (!dest._events || !dest._events.error)
	    dest.on('error', onerror);
	  else if (isArray(dest._events.error))
	    dest._events.error.unshift(onerror);
	  else
	    dest._events.error = [onerror, dest._events.error];



	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);

	  function unpipe() {
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    // the handler that waits for readable events after all
	    // the data gets sucked out in flow.
	    // This would be easier to follow with a .once() handler
	    // in flow(), but that is too slow.
	    this.on('readable', pipeOnReadable);

	    state.flowing = true;
	    process.nextTick(function() {
	      flow(src);
	    });
	  }

	  return dest;
	};

	function pipeOnDrain(src) {
	  return function() {
	    var dest = this;
	    var state = src._readableState;
	    state.awaitDrain--;
	    if (state.awaitDrain === 0)
	      flow(src);
	  };
	}

	function flow(src) {
	  var state = src._readableState;
	  var chunk;
	  state.awaitDrain = 0;

	  function write(dest, i, list) {
	    var written = dest.write(chunk);
	    if (false === written) {
	      state.awaitDrain++;
	    }
	  }

	  while (state.pipesCount && null !== (chunk = src.read())) {

	    if (state.pipesCount === 1)
	      write(state.pipes, 0, null);
	    else
	      forEach(state.pipes, write);

	    src.emit('data', chunk);

	    // if anyone needs a drain, then we have to wait for that.
	    if (state.awaitDrain > 0)
	      return;
	  }

	  // if every destination was unpiped, either before entering this
	  // function, or in the while loop, then stop flowing.
	  //
	  // NB: This is a pretty rare edge case.
	  if (state.pipesCount === 0) {
	    state.flowing = false;

	    // if there were data event listeners added, then switch to old mode.
	    if (EE.listenerCount(src, 'data') > 0)
	      emitDataEvents(src);
	    return;
	  }

	  // at this point, no one needed a drain, so we just ran out of data
	  // on the next readable event, start it over again.
	  state.ranOut = true;
	}

	function pipeOnReadable() {
	  if (this._readableState.ranOut) {
	    this._readableState.ranOut = false;
	    flow(this);
	  }
	}


	Readable.prototype.unpipe = function(dest) {
	  var state = this._readableState;

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0)
	    return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes)
	      return this;

	    if (!dest)
	      dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    this.removeListener('readable', pipeOnReadable);
	    state.flowing = false;
	    if (dest)
	      dest.emit('unpipe', this);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    this.removeListener('readable', pipeOnReadable);
	    state.flowing = false;

	    for (var i = 0; i < len; i++)
	      dests[i].emit('unpipe', this);
	    return this;
	  }

	  // try to find the right one.
	  var i = indexOf(state.pipes, dest);
	  if (i === -1)
	    return this;

	  state.pipes.splice(i, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1)
	    state.pipes = state.pipes[0];

	  dest.emit('unpipe', this);

	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function(ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);

	  if (ev === 'data' && !this._readableState.flowing)
	    emitDataEvents(this);

	  if (ev === 'readable' && this.readable) {
	    var state = this._readableState;
	    if (!state.readableListening) {
	      state.readableListening = true;
	      state.emittedReadable = false;
	      state.needReadable = true;
	      if (!state.reading) {
	        this.read(0);
	      } else if (state.length) {
	        emitReadable(this, state);
	      }
	    }
	  }

	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function() {
	  emitDataEvents(this);
	  this.read(0);
	  this.emit('resume');
	};

	Readable.prototype.pause = function() {
	  emitDataEvents(this, true);
	  this.emit('pause');
	};

	function emitDataEvents(stream, startPaused) {
	  var state = stream._readableState;

	  if (state.flowing) {
	    // https://github.com/isaacs/readable-stream/issues/16
	    throw new Error('Cannot switch to old mode now.');
	  }

	  var paused = startPaused || false;
	  var readable = false;

	  // convert to an old-style stream.
	  stream.readable = true;
	  stream.pipe = Stream.prototype.pipe;
	  stream.on = stream.addListener = Stream.prototype.on;

	  stream.on('readable', function() {
	    readable = true;

	    var c;
	    while (!paused && (null !== (c = stream.read())))
	      stream.emit('data', c);

	    if (c === null) {
	      readable = false;
	      stream._readableState.needReadable = true;
	    }
	  });

	  stream.pause = function() {
	    paused = true;
	    this.emit('pause');
	  };

	  stream.resume = function() {
	    paused = false;
	    if (readable)
	      process.nextTick(function() {
	        stream.emit('readable');
	      });
	    else
	      this.read(0);
	    this.emit('resume');
	  };

	  // now make it start, just in case it hadn't already.
	  stream.emit('readable');
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function(stream) {
	  var state = this._readableState;
	  var paused = false;

	  var self = this;
	  stream.on('end', function() {
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length)
	        self.push(chunk);
	    }

	    self.push(null);
	  });

	  stream.on('data', function(chunk) {
	    if (state.decoder)
	      chunk = state.decoder.write(chunk);

	    // don't skip over falsy values in objectMode
	    //if (state.objectMode && util.isNullOrUndefined(chunk))
	    if (state.objectMode && (chunk === null || chunk === undefined))
	      return;
	    else if (!state.objectMode && (!chunk || !chunk.length))
	      return;

	    var ret = self.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (typeof stream[i] === 'function' &&
	        typeof this[i] === 'undefined') {
	      this[i] = function(method) { return function() {
	        return stream[method].apply(stream, arguments);
	      }}(i);
	    }
	  }

	  // proxy certain important events.
	  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
	  forEach(events, function(ev) {
	    stream.on(ev, self.emit.bind(self, ev));
	  });

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  self._read = function(n) {
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };

	  return self;
	};



	// exposed for testing purposes only.
	Readable._fromList = fromList;

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	function fromList(n, state) {
	  var list = state.buffer;
	  var length = state.length;
	  var stringMode = !!state.decoder;
	  var objectMode = !!state.objectMode;
	  var ret;

	  // nothing in the list, definitely empty.
	  if (list.length === 0)
	    return null;

	  if (length === 0)
	    ret = null;
	  else if (objectMode)
	    ret = list.shift();
	  else if (!n || n >= length) {
	    // read it all, truncate the array.
	    if (stringMode)
	      ret = list.join('');
	    else
	      ret = Buffer.concat(list, length);
	    list.length = 0;
	  } else {
	    // read just some of it.
	    if (n < list[0].length) {
	      // just take a part of the first list item.
	      // slice is the same for buffers and strings.
	      var buf = list[0];
	      ret = buf.slice(0, n);
	      list[0] = buf.slice(n);
	    } else if (n === list[0].length) {
	      // first list is a perfect match
	      ret = list.shift();
	    } else {
	      // complex case.
	      // we have enough to cover it, but it spans past the first buffer.
	      if (stringMode)
	        ret = '';
	      else
	        ret = new Buffer(n);

	      var c = 0;
	      for (var i = 0, l = list.length; i < l && c < n; i++) {
	        var buf = list[0];
	        var cpy = Math.min(n - c, buf.length);

	        if (stringMode)
	          ret += buf.slice(0, cpy);
	        else
	          buf.copy(ret, c, 0, cpy);

	        if (cpy < buf.length)
	          list[0] = buf.slice(cpy);
	        else
	          list.shift();

	        c += cpy;
	      }
	    }
	  }

	  return ret;
	}

	function endReadable(stream) {
	  var state = stream._readableState;

	  // If we get here before consuming all the bytes, then that is a
	  // bug in node.  Should never happen.
	  if (state.length > 0)
	    throw new Error('endReadable called on non-empty stream');

	  if (!state.endEmitted && state.calledRead) {
	    state.ended = true;
	    process.nextTick(function() {
	      // Check that we didn't get one last unshift.
	      if (!state.endEmitted && state.length === 0) {
	        state.endEmitted = true;
	        stream.readable = false;
	        stream.emit('end');
	      }
	    });
	  }
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	function indexOf (xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 97 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// A bit simpler than readable streams.
	// Implement an async ._write(chunk, cb), and it'll handle all
	// the drain event emission and buffering.

	module.exports = Writable;

	/*<replacement>*/
	var Buffer = __webpack_require__(45).Buffer;
	/*</replacement>*/

	Writable.WritableState = WritableState;


	/*<replacement>*/
	var util = __webpack_require__(98);
	util.inherits = __webpack_require__(51);
	/*</replacement>*/

	var Stream = __webpack_require__(102);

	util.inherits(Writable, Stream);

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	}

	function WritableState(options, stream) {
	  options = options || {};

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  var hwm = options.highWaterMark;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, becuase any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function(er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;

	  this.buffer = [];

	  // True if the error was already emitted and should not be thrown again
	  this.errorEmitted = false;
	}

	function Writable(options) {
	  var Duplex = __webpack_require__(93);

	  // Writable ctor is applied to Duplexes, though they're not
	  // instanceof Writable, they're instanceof Readable.
	  if (!(this instanceof Writable) && !(this instanceof Duplex))
	    return new Writable(options);

	  this._writableState = new WritableState(options, this);

	  // legacy.
	  this.writable = true;

	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function() {
	  this.emit('error', new Error('Cannot pipe. Not readable.'));
	};


	function writeAfterEnd(stream, state, cb) {
	  var er = new Error('write after end');
	  // TODO: defer error events consistently everywhere, not just the cb
	  stream.emit('error', er);
	  process.nextTick(function() {
	    cb(er);
	  });
	}

	// If we get something that is not a buffer, string, null, or undefined,
	// and we're not in objectMode, then that's an error.
	// Otherwise stream chunks are all considered to be of length=1, and the
	// watermarks determine how many objects to keep in the buffer, rather than
	// how many bytes or characters.
	function validChunk(stream, state, chunk, cb) {
	  var valid = true;
	  if (!Buffer.isBuffer(chunk) &&
	      'string' !== typeof chunk &&
	      chunk !== null &&
	      chunk !== undefined &&
	      !state.objectMode) {
	    var er = new TypeError('Invalid non-string/buffer chunk');
	    stream.emit('error', er);
	    process.nextTick(function() {
	      cb(er);
	    });
	    valid = false;
	  }
	  return valid;
	}

	Writable.prototype.write = function(chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;

	  if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }

	  if (Buffer.isBuffer(chunk))
	    encoding = 'buffer';
	  else if (!encoding)
	    encoding = state.defaultEncoding;

	  if (typeof cb !== 'function')
	    cb = function() {};

	  if (state.ended)
	    writeAfterEnd(this, state, cb);
	  else if (validChunk(this, state, chunk, cb))
	    ret = writeOrBuffer(this, state, chunk, encoding, cb);

	  return ret;
	};

	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode &&
	      state.decodeStrings !== false &&
	      typeof chunk === 'string') {
	    chunk = new Buffer(chunk, encoding);
	  }
	  return chunk;
	}

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, chunk, encoding, cb) {
	  chunk = decodeChunk(state, chunk, encoding);
	  if (Buffer.isBuffer(chunk))
	    encoding = 'buffer';
	  var len = state.objectMode ? 1 : chunk.length;

	  state.length += len;

	  var ret = state.length < state.highWaterMark;
	  // we must ensure that previous needDrain will not be reset to false.
	  if (!ret)
	    state.needDrain = true;

	  if (state.writing)
	    state.buffer.push(new WriteReq(chunk, encoding, cb));
	  else
	    doWrite(stream, state, len, chunk, encoding, cb);

	  return ret;
	}

	function doWrite(stream, state, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}

	function onwriteError(stream, state, sync, er, cb) {
	  if (sync)
	    process.nextTick(function() {
	      cb(er);
	    });
	  else
	    cb(er);

	  stream._writableState.errorEmitted = true;
	  stream.emit('error', er);
	}

	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}

	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;

	  onwriteStateUpdate(state);

	  if (er)
	    onwriteError(stream, state, sync, er, cb);
	  else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(stream, state);

	    if (!finished && !state.bufferProcessing && state.buffer.length)
	      clearBuffer(stream, state);

	    if (sync) {
	      process.nextTick(function() {
	        afterWrite(stream, state, finished, cb);
	      });
	    } else {
	      afterWrite(stream, state, finished, cb);
	    }
	  }
	}

	function afterWrite(stream, state, finished, cb) {
	  if (!finished)
	    onwriteDrain(stream, state);
	  cb();
	  if (finished)
	    finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}


	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;

	  for (var c = 0; c < state.buffer.length; c++) {
	    var entry = state.buffer[c];
	    var chunk = entry.chunk;
	    var encoding = entry.encoding;
	    var cb = entry.callback;
	    var len = state.objectMode ? 1 : chunk.length;

	    doWrite(stream, state, len, chunk, encoding, cb);

	    // if we didn't call the onwrite immediately, then
	    // it means that we need to wait until it does.
	    // also, that means that the chunk and cb are currently
	    // being processed, so move the buffer counter past them.
	    if (state.writing) {
	      c++;
	      break;
	    }
	  }

	  state.bufferProcessing = false;
	  if (c < state.buffer.length)
	    state.buffer = state.buffer.slice(c);
	  else
	    state.buffer.length = 0;
	}

	Writable.prototype._write = function(chunk, encoding, cb) {
	  cb(new Error('not implemented'));
	};

	Writable.prototype.end = function(chunk, encoding, cb) {
	  var state = this._writableState;

	  if (typeof chunk === 'function') {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }

	  if (typeof chunk !== 'undefined' && chunk !== null)
	    this.write(chunk, encoding);

	  // ignore unnecessary end() calls.
	  if (!state.ending && !state.finished)
	    endWritable(this, state, cb);
	};


	function needFinish(stream, state) {
	  return (state.ending &&
	          state.length === 0 &&
	          !state.finished &&
	          !state.writing);
	}

	function finishMaybe(stream, state) {
	  var need = needFinish(stream, state);
	  if (need) {
	    state.finished = true;
	    stream.emit('finish');
	  }
	  return need;
	}

	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished)
	      process.nextTick(cb);
	    else
	      stream.once('finish', cb);
	  }
	  state.ended = true;
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 98 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	function isBuffer(arg) {
	  return Buffer.isBuffer(arg);
	}
	exports.isBuffer = isBuffer;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(45).Buffer))

/***/ },
/* 99 */
/***/ function(module, exports, __webpack_require__) {

	var hasOwn = Object.prototype.hasOwnProperty;
	var toString = Object.prototype.toString;

	var isFunction = function (fn) {
		var isFunc = (typeof fn === 'function' && !(fn instanceof RegExp)) || toString.call(fn) === '[object Function]';
		if (!isFunc && typeof window !== 'undefined') {
			isFunc = fn === window.setTimeout || fn === window.alert || fn === window.confirm || fn === window.prompt;
		}
		return isFunc;
	};

	module.exports = function forEach(obj, fn) {
		if (!isFunction(fn)) {
			throw new TypeError('iterator must be a function');
		}
		var i, k,
			isString = typeof obj === 'string',
			l = obj.length,
			context = arguments.length > 2 ? arguments[2] : null;
		if (l === +l) {
			for (i = 0; i < l; i++) {
				if (context === null) {
					fn(isString ? obj.charAt(i) : obj[i], i, obj);
				} else {
					fn.call(context, isString ? obj.charAt(i) : obj[i], i, obj);
				}
			}
		} else {
			for (k in obj) {
				if (hasOwn.call(obj, k)) {
					if (context === null) {
						fn(obj[k], k, obj);
					} else {
						fn.call(context, obj[k], k, obj);
					}
				}
			}
		}
	};



/***/ },
/* 100 */
/***/ function(module, exports, __webpack_require__) {

	var toString = Object.prototype.toString;

	module.exports = function isArguments(value) {
		var str = toString.call(value);
		var isArguments = str === '[object Arguments]';
		if (!isArguments) {
			isArguments = str !== '[object Array]'
				&& value !== null
				&& typeof value === 'object'
				&& typeof value.length === 'number'
				&& value.length >= 0
				&& toString.call(value.callee) === '[object Function]';
		}
		return isArguments;
	};



/***/ },
/* 101 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = Array.isArray || function (arr) {
	  return Object.prototype.toString.call(arr) == '[object Array]';
	};


/***/ },
/* 102 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Stream;

	var EE = __webpack_require__(38).EventEmitter;
	var inherits = __webpack_require__(111);

	inherits(Stream, EE);
	Stream.Readable = __webpack_require__(106);
	Stream.Writable = __webpack_require__(107);
	Stream.Duplex = __webpack_require__(108);
	Stream.Transform = __webpack_require__(109);
	Stream.PassThrough = __webpack_require__(110);

	// Backwards-compat with node 0.4.x
	Stream.Stream = Stream;



	// old-style streams.  Note that the pipe method (the only relevant
	// part of this class) is overridden in the Readable class.

	function Stream() {
	  EE.call(this);
	}

	Stream.prototype.pipe = function(dest, options) {
	  var source = this;

	  function ondata(chunk) {
	    if (dest.writable) {
	      if (false === dest.write(chunk) && source.pause) {
	        source.pause();
	      }
	    }
	  }

	  source.on('data', ondata);

	  function ondrain() {
	    if (source.readable && source.resume) {
	      source.resume();
	    }
	  }

	  dest.on('drain', ondrain);

	  // If the 'end' option is not supplied, dest.end() will be called when
	  // source gets the 'end' or 'close' events.  Only dest.end() once.
	  if (!dest._isStdio && (!options || options.end !== false)) {
	    source.on('end', onend);
	    source.on('close', onclose);
	  }

	  var didOnEnd = false;
	  function onend() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    dest.end();
	  }


	  function onclose() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    if (typeof dest.destroy === 'function') dest.destroy();
	  }

	  // don't leave dangling pipes when there are errors.
	  function onerror(er) {
	    cleanup();
	    if (EE.listenerCount(this, 'error') === 0) {
	      throw er; // Unhandled stream error in pipe.
	    }
	  }

	  source.on('error', onerror);
	  dest.on('error', onerror);

	  // remove all the event listeners that were added.
	  function cleanup() {
	    source.removeListener('data', ondata);
	    dest.removeListener('drain', ondrain);

	    source.removeListener('end', onend);
	    source.removeListener('close', onclose);

	    source.removeListener('error', onerror);
	    dest.removeListener('error', onerror);

	    source.removeListener('end', cleanup);
	    source.removeListener('close', cleanup);

	    dest.removeListener('close', cleanup);
	  }

	  source.on('end', cleanup);
	  source.on('close', cleanup);

	  dest.on('close', cleanup);

	  dest.emit('pipe', source);

	  // Allow for unix-like usage: A.pipe(B).pipe(C)
	  return dest;
	};


/***/ },
/* 103 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Buffer = __webpack_require__(45).Buffer;

	var isBufferEncoding = Buffer.isEncoding
	  || function(encoding) {
	       switch (encoding && encoding.toLowerCase()) {
	         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
	         default: return false;
	       }
	     }


	function assertEncoding(encoding) {
	  if (encoding && !isBufferEncoding(encoding)) {
	    throw new Error('Unknown encoding: ' + encoding);
	  }
	}

	// StringDecoder provides an interface for efficiently splitting a series of
	// buffers into a series of JS strings without breaking apart multi-byte
	// characters. CESU-8 is handled as part of the UTF-8 encoding.
	//
	// @TODO Handling all encodings inside a single object makes it very difficult
	// to reason about this code, so it should be split up in the future.
	// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
	// points as used by CESU-8.
	var StringDecoder = exports.StringDecoder = function(encoding) {
	  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
	  assertEncoding(encoding);
	  switch (this.encoding) {
	    case 'utf8':
	      // CESU-8 represents each of Surrogate Pair by 3-bytes
	      this.surrogateSize = 3;
	      break;
	    case 'ucs2':
	    case 'utf16le':
	      // UTF-16 represents each of Surrogate Pair by 2-bytes
	      this.surrogateSize = 2;
	      this.detectIncompleteChar = utf16DetectIncompleteChar;
	      break;
	    case 'base64':
	      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
	      this.surrogateSize = 3;
	      this.detectIncompleteChar = base64DetectIncompleteChar;
	      break;
	    default:
	      this.write = passThroughWrite;
	      return;
	  }

	  // Enough space to store all bytes of a single character. UTF-8 needs 4
	  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
	  this.charBuffer = new Buffer(6);
	  // Number of bytes received for the current incomplete multi-byte character.
	  this.charReceived = 0;
	  // Number of bytes expected for the current incomplete multi-byte character.
	  this.charLength = 0;
	};


	// write decodes the given buffer and returns it as JS string that is
	// guaranteed to not contain any partial multi-byte characters. Any partial
	// character found at the end of the buffer is buffered up, and will be
	// returned when calling write again with the remaining bytes.
	//
	// Note: Converting a Buffer containing an orphan surrogate to a String
	// currently works, but converting a String to a Buffer (via `new Buffer`, or
	// Buffer#write) will replace incomplete surrogates with the unicode
	// replacement character. See https://codereview.chromium.org/121173009/ .
	StringDecoder.prototype.write = function(buffer) {
	  var charStr = '';
	  // if our last write ended with an incomplete multibyte character
	  while (this.charLength) {
	    // determine how many remaining bytes this buffer has to offer for this char
	    var available = (buffer.length >= this.charLength - this.charReceived) ?
	        this.charLength - this.charReceived :
	        buffer.length;

	    // add the new bytes to the char buffer
	    buffer.copy(this.charBuffer, this.charReceived, 0, available);
	    this.charReceived += available;

	    if (this.charReceived < this.charLength) {
	      // still not enough chars in this buffer? wait for more ...
	      return '';
	    }

	    // remove bytes belonging to the current character from the buffer
	    buffer = buffer.slice(available, buffer.length);

	    // get the character that was split
	    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

	    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	    var charCode = charStr.charCodeAt(charStr.length - 1);
	    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	      this.charLength += this.surrogateSize;
	      charStr = '';
	      continue;
	    }
	    this.charReceived = this.charLength = 0;

	    // if there are no more bytes in this buffer, just emit our char
	    if (buffer.length === 0) {
	      return charStr;
	    }
	    break;
	  }

	  // determine and set charLength / charReceived
	  this.detectIncompleteChar(buffer);

	  var end = buffer.length;
	  if (this.charLength) {
	    // buffer the incomplete character bytes we got
	    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
	    end -= this.charReceived;
	  }

	  charStr += buffer.toString(this.encoding, 0, end);

	  var end = charStr.length - 1;
	  var charCode = charStr.charCodeAt(end);
	  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	    var size = this.surrogateSize;
	    this.charLength += size;
	    this.charReceived += size;
	    this.charBuffer.copy(this.charBuffer, size, 0, size);
	    buffer.copy(this.charBuffer, 0, 0, size);
	    return charStr.substring(0, end);
	  }

	  // or just emit the charStr
	  return charStr;
	};

	// detectIncompleteChar determines if there is an incomplete UTF-8 character at
	// the end of the given buffer. If so, it sets this.charLength to the byte
	// length that character, and sets this.charReceived to the number of bytes
	// that are available for this character.
	StringDecoder.prototype.detectIncompleteChar = function(buffer) {
	  // determine how many bytes we have to check at the end of this buffer
	  var i = (buffer.length >= 3) ? 3 : buffer.length;

	  // Figure out if one of the last i bytes of our buffer announces an
	  // incomplete char.
	  for (; i > 0; i--) {
	    var c = buffer[buffer.length - i];

	    // See http://en.wikipedia.org/wiki/UTF-8#Description

	    // 110XXXXX
	    if (i == 1 && c >> 5 == 0x06) {
	      this.charLength = 2;
	      break;
	    }

	    // 1110XXXX
	    if (i <= 2 && c >> 4 == 0x0E) {
	      this.charLength = 3;
	      break;
	    }

	    // 11110XXX
	    if (i <= 3 && c >> 3 == 0x1E) {
	      this.charLength = 4;
	      break;
	    }
	  }
	  this.charReceived = i;
	};

	StringDecoder.prototype.end = function(buffer) {
	  var res = '';
	  if (buffer && buffer.length)
	    res = this.write(buffer);

	  if (this.charReceived) {
	    var cr = this.charReceived;
	    var buf = this.charBuffer;
	    var enc = this.encoding;
	    res += buf.slice(0, cr).toString(enc);
	  }

	  return res;
	};

	function passThroughWrite(buffer) {
	  return buffer.toString(this.encoding);
	}

	function utf16DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 2;
	  this.charLength = this.charReceived ? 2 : 0;
	}

	function base64DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 3;
	  this.charLength = this.charReceived ? 3 : 0;
	}


/***/ },
/* 104 */
/***/ function(module, exports, __webpack_require__) {

	
	/**!
	 * is
	 * the definitive JavaScript type testing library
	 * 
	 * @copyright 2013 Enrico Marino
	 * @license MIT
	 */

	var objProto = Object.prototype;
	var owns = objProto.hasOwnProperty;
	var toString = objProto.toString;
	var isActualNaN = function (value) {
	  return value !== value;
	};
	var NON_HOST_TYPES = {
	  "boolean": 1,
	  "number": 1,
	  "string": 1,
	  "undefined": 1
	};

	/**
	 * Expose `is`
	 */

	var is = module.exports = {};

	/**
	 * Test general.
	 */

	/**
	 * is.type
	 * Test if `value` is a type of `type`.
	 *
	 * @param {Mixed} value value to test
	 * @param {String} type type
	 * @return {Boolean} true if `value` is a type of `type`, false otherwise
	 * @api public
	 */

	is.a =
	is.type = function (value, type) {
	  return typeof value === type;
	};

	/**
	 * is.defined
	 * Test if `value` is defined.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if 'value' is defined, false otherwise
	 * @api public
	 */

	is.defined = function (value) {
	  return value !== undefined;
	};

	/**
	 * is.empty
	 * Test if `value` is empty.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is empty, false otherwise
	 * @api public
	 */

	is.empty = function (value) {
	  var type = toString.call(value);
	  var key;

	  if ('[object Array]' === type || '[object Arguments]' === type) {
	    return value.length === 0;
	  }

	  if ('[object Object]' === type) {
	    for (key in value) if (owns.call(value, key)) return false;
	    return true;
	  }

	  if ('[object String]' === type) {
	    return '' === value;
	  }

	  return false;
	};

	/**
	 * is.equal
	 * Test if `value` is equal to `other`.
	 *
	 * @param {Mixed} value value to test
	 * @param {Mixed} other value to compare with
	 * @return {Boolean} true if `value` is equal to `other`, false otherwise
	 */

	is.equal = function (value, other) {
	  var type = toString.call(value)
	  var key;

	  if (type !== toString.call(other)) {
	    return false;
	  }

	  if ('[object Object]' === type) {
	    for (key in value) {
	      if (!is.equal(value[key], other[key])) {
	        return false;
	      }
	    }
	    return true;
	  }

	  if ('[object Array]' === type) {
	    key = value.length;
	    if (key !== other.length) {
	      return false;
	    }
	    while (--key) {
	      if (!is.equal(value[key], other[key])) {
	        return false;
	      }
	    }
	    return true;
	  }

	  if ('[object Function]' === type) {
	    return value.prototype === other.prototype;
	  }

	  if ('[object Date]' === type) {
	    return value.getTime() === other.getTime();
	  }

	  return value === other;
	};

	/**
	 * is.hosted
	 * Test if `value` is hosted by `host`.
	 *
	 * @param {Mixed} value to test
	 * @param {Mixed} host host to test with
	 * @return {Boolean} true if `value` is hosted by `host`, false otherwise
	 * @api public
	 */

	is.hosted = function (value, host) {
	  var type = typeof host[value];
	  return type === 'object' ? !!host[value] : !NON_HOST_TYPES[type];
	};

	/**
	 * is.instance
	 * Test if `value` is an instance of `constructor`.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is an instance of `constructor`
	 * @api public
	 */

	is.instance = is['instanceof'] = function (value, constructor) {
	  return value instanceof constructor;
	};

	/**
	 * is.null
	 * Test if `value` is null.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is null, false otherwise
	 * @api public
	 */

	is['null'] = function (value) {
	  return value === null;
	};

	/**
	 * is.undefined
	 * Test if `value` is undefined.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is undefined, false otherwise
	 * @api public
	 */

	is.undefined = function (value) {
	  return value === undefined;
	};

	/**
	 * Test arguments.
	 */

	/**
	 * is.arguments
	 * Test if `value` is an arguments object.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is an arguments object, false otherwise
	 * @api public
	 */

	is.arguments = function (value) {
	  var isStandardArguments = '[object Arguments]' === toString.call(value);
	  var isOldArguments = !is.array(value) && is.arraylike(value) && is.object(value) && is.fn(value.callee);
	  return isStandardArguments || isOldArguments;
	};

	/**
	 * Test array.
	 */

	/**
	 * is.array
	 * Test if 'value' is an array.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is an array, false otherwise
	 * @api public
	 */

	is.array = function (value) {
	  return '[object Array]' === toString.call(value);
	};

	/**
	 * is.arguments.empty
	 * Test if `value` is an empty arguments object.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is an empty arguments object, false otherwise
	 * @api public
	 */
	is.arguments.empty = function (value) {
	  return is.arguments(value) && value.length === 0;
	};

	/**
	 * is.array.empty
	 * Test if `value` is an empty array.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is an empty array, false otherwise
	 * @api public
	 */
	is.array.empty = function (value) {
	  return is.array(value) && value.length === 0;
	};

	/**
	 * is.arraylike
	 * Test if `value` is an arraylike object.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is an arguments object, false otherwise
	 * @api public
	 */

	is.arraylike = function (value) {
	  return !!value && !is.boolean(value)
	    && owns.call(value, 'length')
	    && isFinite(value.length)
	    && is.number(value.length)
	    && value.length >= 0;
	};

	/**
	 * Test boolean.
	 */

	/**
	 * is.boolean
	 * Test if `value` is a boolean.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is a boolean, false otherwise
	 * @api public
	 */

	is.boolean = function (value) {
	  return '[object Boolean]' === toString.call(value);
	};

	/**
	 * is.false
	 * Test if `value` is false.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is false, false otherwise
	 * @api public
	 */

	is['false'] = function (value) {
	  return is.boolean(value) && (value === false || value.valueOf() === false);
	};

	/**
	 * is.true
	 * Test if `value` is true.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is true, false otherwise
	 * @api public
	 */

	is['true'] = function (value) {
	  return is.boolean(value) && (value === true || value.valueOf() === true);
	};

	/**
	 * Test date.
	 */

	/**
	 * is.date
	 * Test if `value` is a date.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is a date, false otherwise
	 * @api public
	 */

	is.date = function (value) {
	  return '[object Date]' === toString.call(value);
	};

	/**
	 * Test element.
	 */

	/**
	 * is.element
	 * Test if `value` is an html element.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is an HTML Element, false otherwise
	 * @api public
	 */

	is.element = function (value) {
	  return value !== undefined
	    && typeof HTMLElement !== 'undefined'
	    && value instanceof HTMLElement
	    && value.nodeType === 1;
	};

	/**
	 * Test error.
	 */

	/**
	 * is.error
	 * Test if `value` is an error object.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is an error object, false otherwise
	 * @api public
	 */

	is.error = function (value) {
	  return '[object Error]' === toString.call(value);
	};

	/**
	 * Test function.
	 */

	/**
	 * is.fn / is.function (deprecated)
	 * Test if `value` is a function.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is a function, false otherwise
	 * @api public
	 */

	is.fn = is['function'] = function (value) {
	  var isAlert = typeof window !== 'undefined' && value === window.alert;
	  return isAlert || '[object Function]' === toString.call(value);
	};

	/**
	 * Test number.
	 */

	/**
	 * is.number
	 * Test if `value` is a number.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is a number, false otherwise
	 * @api public
	 */

	is.number = function (value) {
	  return '[object Number]' === toString.call(value);
	};

	/**
	 * is.infinite
	 * Test if `value` is positive or negative infinity.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is positive or negative Infinity, false otherwise
	 * @api public
	 */
	is.infinite = function (value) {
	  return value === Infinity || value === -Infinity;
	};

	/**
	 * is.decimal
	 * Test if `value` is a decimal number.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is a decimal number, false otherwise
	 * @api public
	 */

	is.decimal = function (value) {
	  return is.number(value) && !isActualNaN(value) && !is.infinite(value) && value % 1 !== 0;
	};

	/**
	 * is.divisibleBy
	 * Test if `value` is divisible by `n`.
	 *
	 * @param {Number} value value to test
	 * @param {Number} n dividend
	 * @return {Boolean} true if `value` is divisible by `n`, false otherwise
	 * @api public
	 */

	is.divisibleBy = function (value, n) {
	  var isDividendInfinite = is.infinite(value);
	  var isDivisorInfinite = is.infinite(n);
	  var isNonZeroNumber = is.number(value) && !isActualNaN(value) && is.number(n) && !isActualNaN(n) && n !== 0;
	  return isDividendInfinite || isDivisorInfinite || (isNonZeroNumber && value % n === 0);
	};

	/**
	 * is.int
	 * Test if `value` is an integer.
	 *
	 * @param value to test
	 * @return {Boolean} true if `value` is an integer, false otherwise
	 * @api public
	 */

	is.int = function (value) {
	  return is.number(value) && !isActualNaN(value) && value % 1 === 0;
	};

	/**
	 * is.maximum
	 * Test if `value` is greater than 'others' values.
	 *
	 * @param {Number} value value to test
	 * @param {Array} others values to compare with
	 * @return {Boolean} true if `value` is greater than `others` values
	 * @api public
	 */

	is.maximum = function (value, others) {
	  if (isActualNaN(value)) {
	    throw new TypeError('NaN is not a valid value');
	  } else if (!is.arraylike(others)) {
	    throw new TypeError('second argument must be array-like');
	  }
	  var len = others.length;

	  while (--len >= 0) {
	    if (value < others[len]) {
	      return false;
	    }
	  }

	  return true;
	};

	/**
	 * is.minimum
	 * Test if `value` is less than `others` values.
	 *
	 * @param {Number} value value to test
	 * @param {Array} others values to compare with
	 * @return {Boolean} true if `value` is less than `others` values
	 * @api public
	 */

	is.minimum = function (value, others) {
	  if (isActualNaN(value)) {
	    throw new TypeError('NaN is not a valid value');
	  } else if (!is.arraylike(others)) {
	    throw new TypeError('second argument must be array-like');
	  }
	  var len = others.length;

	  while (--len >= 0) {
	    if (value > others[len]) {
	      return false;
	    }
	  }

	  return true;
	};

	/**
	 * is.nan
	 * Test if `value` is not a number.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is not a number, false otherwise
	 * @api public
	 */

	is.nan = function (value) {
	  return !is.number(value) || value !== value;
	};

	/**
	 * is.even
	 * Test if `value` is an even number.
	 *
	 * @param {Number} value value to test
	 * @return {Boolean} true if `value` is an even number, false otherwise
	 * @api public
	 */

	is.even = function (value) {
	  return is.infinite(value) || (is.number(value) && value === value && value % 2 === 0);
	};

	/**
	 * is.odd
	 * Test if `value` is an odd number.
	 *
	 * @param {Number} value value to test
	 * @return {Boolean} true if `value` is an odd number, false otherwise
	 * @api public
	 */

	is.odd = function (value) {
	  return is.infinite(value) || (is.number(value) && value === value && value % 2 !== 0);
	};

	/**
	 * is.ge
	 * Test if `value` is greater than or equal to `other`.
	 *
	 * @param {Number} value value to test
	 * @param {Number} other value to compare with
	 * @return {Boolean}
	 * @api public
	 */

	is.ge = function (value, other) {
	  if (isActualNaN(value) || isActualNaN(other)) {
	    throw new TypeError('NaN is not a valid value');
	  }
	  return !is.infinite(value) && !is.infinite(other) && value >= other;
	};

	/**
	 * is.gt
	 * Test if `value` is greater than `other`.
	 *
	 * @param {Number} value value to test
	 * @param {Number} other value to compare with
	 * @return {Boolean}
	 * @api public
	 */

	is.gt = function (value, other) {
	  if (isActualNaN(value) || isActualNaN(other)) {
	    throw new TypeError('NaN is not a valid value');
	  }
	  return !is.infinite(value) && !is.infinite(other) && value > other;
	};

	/**
	 * is.le
	 * Test if `value` is less than or equal to `other`.
	 *
	 * @param {Number} value value to test
	 * @param {Number} other value to compare with
	 * @return {Boolean} if 'value' is less than or equal to 'other'
	 * @api public
	 */

	is.le = function (value, other) {
	  if (isActualNaN(value) || isActualNaN(other)) {
	    throw new TypeError('NaN is not a valid value');
	  }
	  return !is.infinite(value) && !is.infinite(other) && value <= other;
	};

	/**
	 * is.lt
	 * Test if `value` is less than `other`.
	 *
	 * @param {Number} value value to test
	 * @param {Number} other value to compare with
	 * @return {Boolean} if `value` is less than `other`
	 * @api public
	 */

	is.lt = function (value, other) {
	  if (isActualNaN(value) || isActualNaN(other)) {
	    throw new TypeError('NaN is not a valid value');
	  }
	  return !is.infinite(value) && !is.infinite(other) && value < other;
	};

	/**
	 * is.within
	 * Test if `value` is within `start` and `finish`.
	 *
	 * @param {Number} value value to test
	 * @param {Number} start lower bound
	 * @param {Number} finish upper bound
	 * @return {Boolean} true if 'value' is is within 'start' and 'finish'
	 * @api public
	 */
	is.within = function (value, start, finish) {
	  if (isActualNaN(value) || isActualNaN(start) || isActualNaN(finish)) {
	    throw new TypeError('NaN is not a valid value');
	  } else if (!is.number(value) || !is.number(start) || !is.number(finish)) {
	    throw new TypeError('all arguments must be numbers');
	  }
	  var isAnyInfinite = is.infinite(value) || is.infinite(start) || is.infinite(finish);
	  return isAnyInfinite || (value >= start && value <= finish);
	};

	/**
	 * Test object.
	 */

	/**
	 * is.object
	 * Test if `value` is an object.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is an object, false otherwise
	 * @api public
	 */

	is.object = function (value) {
	  return value && '[object Object]' === toString.call(value);
	};

	/**
	 * is.hash
	 * Test if `value` is a hash - a plain object literal.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is a hash, false otherwise
	 * @api public
	 */

	is.hash = function (value) {
	  return is.object(value) && value.constructor === Object && !value.nodeType && !value.setInterval;
	};

	/**
	 * Test regexp.
	 */

	/**
	 * is.regexp
	 * Test if `value` is a regular expression.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if `value` is a regexp, false otherwise
	 * @api public
	 */

	is.regexp = function (value) {
	  return '[object RegExp]' === toString.call(value);
	};

	/**
	 * Test string.
	 */

	/**
	 * is.string
	 * Test if `value` is a string.
	 *
	 * @param {Mixed} value value to test
	 * @return {Boolean} true if 'value' is a string, false otherwise
	 * @api public
	 */

	is.string = function (value) {
	  return '[object String]' === toString.call(value);
	};



/***/ },
/* 105 */
/***/ function(module, exports, __webpack_require__) {

	
	var hasOwn = Object.prototype.hasOwnProperty;
	var toString = Object.prototype.toString;

	module.exports = function forEach (obj, fn, ctx) {
	    if (toString.call(fn) !== '[object Function]') {
	        throw new TypeError('iterator must be a function');
	    }
	    var l = obj.length;
	    if (l === +l) {
	        for (var i = 0; i < l; i++) {
	            fn.call(ctx, obj[i], i, obj);
	        }
	    } else {
	        for (var k in obj) {
	            if (hasOwn.call(obj, k)) {
	                fn.call(ctx, obj[k], k, obj);
	            }
	        }
	    }
	};



/***/ },
/* 106 */
/***/ function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(112);
	exports.Stream = __webpack_require__(102);
	exports.Readable = exports;
	exports.Writable = __webpack_require__(113);
	exports.Duplex = __webpack_require__(114);
	exports.Transform = __webpack_require__(115);
	exports.PassThrough = __webpack_require__(116);


/***/ },
/* 107 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(113)


/***/ },
/* 108 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(114)


/***/ },
/* 109 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(115)


/***/ },
/* 110 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(116)


/***/ },
/* 111 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 112 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Readable;

	/*<replacement>*/
	var isArray = __webpack_require__(119);
	/*</replacement>*/


	/*<replacement>*/
	var Buffer = __webpack_require__(45).Buffer;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	var EE = __webpack_require__(38).EventEmitter;

	/*<replacement>*/
	if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	var Stream = __webpack_require__(102);

	/*<replacement>*/
	var util = __webpack_require__(120);
	util.inherits = __webpack_require__(121);
	/*</replacement>*/

	var StringDecoder;


	/*<replacement>*/
	var debug = __webpack_require__(117);
	if (debug && debug.debuglog) {
	  debug = debug.debuglog('stream');
	} else {
	  debug = function () {};
	}
	/*</replacement>*/


	util.inherits(Readable, Stream);

	function ReadableState(options, stream) {
	  var Duplex = __webpack_require__(114);

	  options = options || {};

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.buffer = [];
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = null;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;


	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.readableObjectMode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // when piping, we only care about 'readable' events that happen
	  // after read()ing all the bytes and not getting any pushback.
	  this.ranOut = false;

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;

	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder)
	      StringDecoder = __webpack_require__(118).StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  var Duplex = __webpack_require__(114);

	  if (!(this instanceof Readable))
	    return new Readable(options);

	  this._readableState = new ReadableState(options, this);

	  // legacy
	  this.readable = true;

	  Stream.call(this);
	}

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function(chunk, encoding) {
	  var state = this._readableState;

	  if (util.isString(chunk) && !state.objectMode) {
	    encoding = encoding || state.defaultEncoding;
	    if (encoding !== state.encoding) {
	      chunk = new Buffer(chunk, encoding);
	      encoding = '';
	    }
	  }

	  return readableAddChunk(this, state, chunk, encoding, false);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function(chunk) {
	  var state = this._readableState;
	  return readableAddChunk(this, state, chunk, '', true);
	};

	function readableAddChunk(stream, state, chunk, encoding, addToFront) {
	  var er = chunkInvalid(state, chunk);
	  if (er) {
	    stream.emit('error', er);
	  } else if (util.isNullOrUndefined(chunk)) {
	    state.reading = false;
	    if (!state.ended)
	      onEofChunk(stream, state);
	  } else if (state.objectMode || chunk && chunk.length > 0) {
	    if (state.ended && !addToFront) {
	      var e = new Error('stream.push() after EOF');
	      stream.emit('error', e);
	    } else if (state.endEmitted && addToFront) {
	      var e = new Error('stream.unshift() after end event');
	      stream.emit('error', e);
	    } else {
	      if (state.decoder && !addToFront && !encoding)
	        chunk = state.decoder.write(chunk);

	      if (!addToFront)
	        state.reading = false;

	      // if we want the data now, just emit it.
	      if (state.flowing && state.length === 0 && !state.sync) {
	        stream.emit('data', chunk);
	        stream.read(0);
	      } else {
	        // update the buffer info.
	        state.length += state.objectMode ? 1 : chunk.length;
	        if (addToFront)
	          state.buffer.unshift(chunk);
	        else
	          state.buffer.push(chunk);

	        if (state.needReadable)
	          emitReadable(stream);
	      }

	      maybeReadMore(stream, state);
	    }
	  } else if (!addToFront) {
	    state.reading = false;
	  }

	  return needMoreData(state);
	}



	// if it's past the high water mark, we can push in some more.
	// Also, if we have no data yet, we can stand some
	// more bytes.  This is to work around cases where hwm=0,
	// such as the repl.  Also, if the push() triggered a
	// readable event, and the user called read(largeNumber) such that
	// needReadable was set, then we ought to push more, so that another
	// 'readable' event will be triggered.
	function needMoreData(state) {
	  return !state.ended &&
	         (state.needReadable ||
	          state.length < state.highWaterMark ||
	          state.length === 0);
	}

	// backwards compatibility.
	Readable.prototype.setEncoding = function(enc) {
	  if (!StringDecoder)
	    StringDecoder = __webpack_require__(118).StringDecoder;
	  this._readableState.decoder = new StringDecoder(enc);
	  this._readableState.encoding = enc;
	  return this;
	};

	// Don't raise the hwm > 128MB
	var MAX_HWM = 0x800000;
	function roundUpToNextPowerOf2(n) {
	  if (n >= MAX_HWM) {
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2
	    n--;
	    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
	    n++;
	  }
	  return n;
	}

	function howMuchToRead(n, state) {
	  if (state.length === 0 && state.ended)
	    return 0;

	  if (state.objectMode)
	    return n === 0 ? 0 : 1;

	  if (isNaN(n) || util.isNull(n)) {
	    // only flow one buffer at a time
	    if (state.flowing && state.buffer.length)
	      return state.buffer[0].length;
	    else
	      return state.length;
	  }

	  if (n <= 0)
	    return 0;

	  // If we're asking for more than the target buffer level,
	  // then raise the water mark.  Bump up to the next highest
	  // power of 2, to prevent increasing it excessively in tiny
	  // amounts.
	  if (n > state.highWaterMark)
	    state.highWaterMark = roundUpToNextPowerOf2(n);

	  // don't have that much.  return null, unless we've ended.
	  if (n > state.length) {
	    if (!state.ended) {
	      state.needReadable = true;
	      return 0;
	    } else
	      return state.length;
	  }

	  return n;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function(n) {
	  debug('read', n);
	  var state = this._readableState;
	  var nOrig = n;

	  if (!util.isNumber(n) || n > 0)
	    state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 &&
	      state.needReadable &&
	      (state.length >= state.highWaterMark || state.ended)) {
	    debug('read: emitReadable', state.length, state.ended);
	    if (state.length === 0 && state.ended)
	      endReadable(this);
	    else
	      emitReadable(this);
	    return null;
	  }

	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    if (state.length === 0)
	      endReadable(this);
	    return null;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;
	  debug('need readable', doRead);

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length === 0 || state.length - n < state.highWaterMark) {
	    doRead = true;
	    debug('length less than watermark', doRead);
	  }

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading) {
	    doRead = false;
	    debug('reading or ended', doRead);
	  }

	  if (doRead) {
	    debug('do read');
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0)
	      state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	  }

	  // If _read pushed data synchronously, then `reading` will be false,
	  // and we need to re-evaluate how much data we can return to the user.
	  if (doRead && !state.reading)
	    n = howMuchToRead(nOrig, state);

	  var ret;
	  if (n > 0)
	    ret = fromList(n, state);
	  else
	    ret = null;

	  if (util.isNull(ret)) {
	    state.needReadable = true;
	    n = 0;
	  }

	  state.length -= n;

	  // If we have nothing in the buffer, then we want to know
	  // as soon as we *do* get something into the buffer.
	  if (state.length === 0 && !state.ended)
	    state.needReadable = true;

	  // If we tried to read() past the EOF, then emit end on the next tick.
	  if (nOrig !== n && state.ended && state.length === 0)
	    endReadable(this);

	  if (!util.isNull(ret))
	    this.emit('data', ret);

	  return ret;
	};

	function chunkInvalid(state, chunk) {
	  var er = null;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  return er;
	}


	function onEofChunk(stream, state) {
	  if (state.decoder && !state.ended) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;

	  // emit 'readable' now to make sure it gets picked up.
	  emitReadable(stream);
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  state.needReadable = false;
	  if (!state.emittedReadable) {
	    debug('emitReadable', state.flowing);
	    state.emittedReadable = true;
	    if (state.sync)
	      process.nextTick(function() {
	        emitReadable_(stream);
	      });
	    else
	      emitReadable_(stream);
	  }
	}

	function emitReadable_(stream) {
	  debug('emit readable');
	  stream.emit('readable');
	  flow(stream);
	}


	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    process.nextTick(function() {
	      maybeReadMore_(stream, state);
	    });
	  }
	}

	function maybeReadMore_(stream, state) {
	  var len = state.length;
	  while (!state.reading && !state.flowing && !state.ended &&
	         state.length < state.highWaterMark) {
	    debug('maybeReadMore read 0');
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;
	    else
	      len = state.length;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function(n) {
	  this.emit('error', new Error('not implemented'));
	};

	Readable.prototype.pipe = function(dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;

	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;
	  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

	  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
	              dest !== process.stdout &&
	              dest !== process.stderr;

	  var endFn = doEnd ? onend : cleanup;
	  if (state.endEmitted)
	    process.nextTick(endFn);
	  else
	    src.once('end', endFn);

	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable) {
	    debug('onunpipe');
	    if (readable === src) {
	      cleanup();
	    }
	  }

	  function onend() {
	    debug('onend');
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);

	  function cleanup() {
	    debug('cleanup');
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', cleanup);
	    src.removeListener('data', ondata);

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (state.awaitDrain &&
	        (!dest._writableState || dest._writableState.needDrain))
	      ondrain();
	  }

	  src.on('data', ondata);
	  function ondata(chunk) {
	    debug('ondata');
	    var ret = dest.write(chunk);
	    if (false === ret) {
	      debug('false write response, pause',
	            src._readableState.awaitDrain);
	      src._readableState.awaitDrain++;
	      src.pause();
	    }
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  function onerror(er) {
	    debug('onerror', er);
	    unpipe();
	    dest.removeListener('error', onerror);
	    if (EE.listenerCount(dest, 'error') === 0)
	      dest.emit('error', er);
	  }
	  // This is a brutally ugly hack to make sure that our error handler
	  // is attached before any userland ones.  NEVER DO THIS.
	  if (!dest._events || !dest._events.error)
	    dest.on('error', onerror);
	  else if (isArray(dest._events.error))
	    dest._events.error.unshift(onerror);
	  else
	    dest._events.error = [onerror, dest._events.error];



	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    debug('onfinish');
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);

	  function unpipe() {
	    debug('unpipe');
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    debug('pipe resume');
	    src.resume();
	  }

	  return dest;
	};

	function pipeOnDrain(src) {
	  return function() {
	    var state = src._readableState;
	    debug('pipeOnDrain', state.awaitDrain);
	    if (state.awaitDrain)
	      state.awaitDrain--;
	    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
	      state.flowing = true;
	      flow(src);
	    }
	  };
	}


	Readable.prototype.unpipe = function(dest) {
	  var state = this._readableState;

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0)
	    return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes)
	      return this;

	    if (!dest)
	      dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;
	    if (dest)
	      dest.emit('unpipe', this);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;

	    for (var i = 0; i < len; i++)
	      dests[i].emit('unpipe', this);
	    return this;
	  }

	  // try to find the right one.
	  var i = indexOf(state.pipes, dest);
	  if (i === -1)
	    return this;

	  state.pipes.splice(i, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1)
	    state.pipes = state.pipes[0];

	  dest.emit('unpipe', this);

	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function(ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);

	  // If listening to data, and it has not explicitly been paused,
	  // then call resume to start the flow of data on the next tick.
	  if (ev === 'data' && false !== this._readableState.flowing) {
	    this.resume();
	  }

	  if (ev === 'readable' && this.readable) {
	    var state = this._readableState;
	    if (!state.readableListening) {
	      state.readableListening = true;
	      state.emittedReadable = false;
	      state.needReadable = true;
	      if (!state.reading) {
	        var self = this;
	        process.nextTick(function() {
	          debug('readable nexttick read 0');
	          self.read(0);
	        });
	      } else if (state.length) {
	        emitReadable(this, state);
	      }
	    }
	  }

	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function() {
	  var state = this._readableState;
	  if (!state.flowing) {
	    debug('resume');
	    state.flowing = true;
	    if (!state.reading) {
	      debug('resume read 0');
	      this.read(0);
	    }
	    resume(this, state);
	  }
	  return this;
	};

	function resume(stream, state) {
	  if (!state.resumeScheduled) {
	    state.resumeScheduled = true;
	    process.nextTick(function() {
	      resume_(stream, state);
	    });
	  }
	}

	function resume_(stream, state) {
	  state.resumeScheduled = false;
	  stream.emit('resume');
	  flow(stream);
	  if (state.flowing && !state.reading)
	    stream.read(0);
	}

	Readable.prototype.pause = function() {
	  debug('call pause flowing=%j', this._readableState.flowing);
	  if (false !== this._readableState.flowing) {
	    debug('pause');
	    this._readableState.flowing = false;
	    this.emit('pause');
	  }
	  return this;
	};

	function flow(stream) {
	  var state = stream._readableState;
	  debug('flow', state.flowing);
	  if (state.flowing) {
	    do {
	      var chunk = stream.read();
	    } while (null !== chunk && state.flowing);
	  }
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function(stream) {
	  var state = this._readableState;
	  var paused = false;

	  var self = this;
	  stream.on('end', function() {
	    debug('wrapped end');
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length)
	        self.push(chunk);
	    }

	    self.push(null);
	  });

	  stream.on('data', function(chunk) {
	    debug('wrapped data');
	    if (state.decoder)
	      chunk = state.decoder.write(chunk);
	    if (!chunk || !state.objectMode && !chunk.length)
	      return;

	    var ret = self.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
	      this[i] = function(method) { return function() {
	        return stream[method].apply(stream, arguments);
	      }}(i);
	    }
	  }

	  // proxy certain important events.
	  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
	  forEach(events, function(ev) {
	    stream.on(ev, self.emit.bind(self, ev));
	  });

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  self._read = function(n) {
	    debug('wrapped _read', n);
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };

	  return self;
	};



	// exposed for testing purposes only.
	Readable._fromList = fromList;

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	function fromList(n, state) {
	  var list = state.buffer;
	  var length = state.length;
	  var stringMode = !!state.decoder;
	  var objectMode = !!state.objectMode;
	  var ret;

	  // nothing in the list, definitely empty.
	  if (list.length === 0)
	    return null;

	  if (length === 0)
	    ret = null;
	  else if (objectMode)
	    ret = list.shift();
	  else if (!n || n >= length) {
	    // read it all, truncate the array.
	    if (stringMode)
	      ret = list.join('');
	    else
	      ret = Buffer.concat(list, length);
	    list.length = 0;
	  } else {
	    // read just some of it.
	    if (n < list[0].length) {
	      // just take a part of the first list item.
	      // slice is the same for buffers and strings.
	      var buf = list[0];
	      ret = buf.slice(0, n);
	      list[0] = buf.slice(n);
	    } else if (n === list[0].length) {
	      // first list is a perfect match
	      ret = list.shift();
	    } else {
	      // complex case.
	      // we have enough to cover it, but it spans past the first buffer.
	      if (stringMode)
	        ret = '';
	      else
	        ret = new Buffer(n);

	      var c = 0;
	      for (var i = 0, l = list.length; i < l && c < n; i++) {
	        var buf = list[0];
	        var cpy = Math.min(n - c, buf.length);

	        if (stringMode)
	          ret += buf.slice(0, cpy);
	        else
	          buf.copy(ret, c, 0, cpy);

	        if (cpy < buf.length)
	          list[0] = buf.slice(cpy);
	        else
	          list.shift();

	        c += cpy;
	      }
	    }
	  }

	  return ret;
	}

	function endReadable(stream) {
	  var state = stream._readableState;

	  // If we get here before consuming all the bytes, then that is a
	  // bug in node.  Should never happen.
	  if (state.length > 0)
	    throw new Error('endReadable called on non-empty stream');

	  if (!state.endEmitted) {
	    state.ended = true;
	    process.nextTick(function() {
	      // Check that we didn't get one last unshift.
	      if (!state.endEmitted && state.length === 0) {
	        state.endEmitted = true;
	        stream.readable = false;
	        stream.emit('end');
	      }
	    });
	  }
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	function indexOf (xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 113 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// A bit simpler than readable streams.
	// Implement an async ._write(chunk, cb), and it'll handle all
	// the drain event emission and buffering.

	module.exports = Writable;

	/*<replacement>*/
	var Buffer = __webpack_require__(45).Buffer;
	/*</replacement>*/

	Writable.WritableState = WritableState;


	/*<replacement>*/
	var util = __webpack_require__(120);
	util.inherits = __webpack_require__(121);
	/*</replacement>*/

	var Stream = __webpack_require__(102);

	util.inherits(Writable, Stream);

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	}

	function WritableState(options, stream) {
	  var Duplex = __webpack_require__(114);

	  options = options || {};

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.writableObjectMode;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // when true all writes will be buffered until .uncork() call
	  this.corked = 0;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function(er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;

	  this.buffer = [];

	  // number of pending user-supplied write callbacks
	  // this must be 0 before 'finish' can be emitted
	  this.pendingcb = 0;

	  // emit prefinish if the only thing we're waiting for is _write cbs
	  // This is relevant for synchronous Transform streams
	  this.prefinished = false;

	  // True if the error was already emitted and should not be thrown again
	  this.errorEmitted = false;
	}

	function Writable(options) {
	  var Duplex = __webpack_require__(114);

	  // Writable ctor is applied to Duplexes, though they're not
	  // instanceof Writable, they're instanceof Readable.
	  if (!(this instanceof Writable) && !(this instanceof Duplex))
	    return new Writable(options);

	  this._writableState = new WritableState(options, this);

	  // legacy.
	  this.writable = true;

	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function() {
	  this.emit('error', new Error('Cannot pipe. Not readable.'));
	};


	function writeAfterEnd(stream, state, cb) {
	  var er = new Error('write after end');
	  // TODO: defer error events consistently everywhere, not just the cb
	  stream.emit('error', er);
	  process.nextTick(function() {
	    cb(er);
	  });
	}

	// If we get something that is not a buffer, string, null, or undefined,
	// and we're not in objectMode, then that's an error.
	// Otherwise stream chunks are all considered to be of length=1, and the
	// watermarks determine how many objects to keep in the buffer, rather than
	// how many bytes or characters.
	function validChunk(stream, state, chunk, cb) {
	  var valid = true;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    var er = new TypeError('Invalid non-string/buffer chunk');
	    stream.emit('error', er);
	    process.nextTick(function() {
	      cb(er);
	    });
	    valid = false;
	  }
	  return valid;
	}

	Writable.prototype.write = function(chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;

	  if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  else if (!encoding)
	    encoding = state.defaultEncoding;

	  if (!util.isFunction(cb))
	    cb = function() {};

	  if (state.ended)
	    writeAfterEnd(this, state, cb);
	  else if (validChunk(this, state, chunk, cb)) {
	    state.pendingcb++;
	    ret = writeOrBuffer(this, state, chunk, encoding, cb);
	  }

	  return ret;
	};

	Writable.prototype.cork = function() {
	  var state = this._writableState;

	  state.corked++;
	};

	Writable.prototype.uncork = function() {
	  var state = this._writableState;

	  if (state.corked) {
	    state.corked--;

	    if (!state.writing &&
	        !state.corked &&
	        !state.finished &&
	        !state.bufferProcessing &&
	        state.buffer.length)
	      clearBuffer(this, state);
	  }
	};

	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode &&
	      state.decodeStrings !== false &&
	      util.isString(chunk)) {
	    chunk = new Buffer(chunk, encoding);
	  }
	  return chunk;
	}

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, chunk, encoding, cb) {
	  chunk = decodeChunk(state, chunk, encoding);
	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  var len = state.objectMode ? 1 : chunk.length;

	  state.length += len;

	  var ret = state.length < state.highWaterMark;
	  // we must ensure that previous needDrain will not be reset to false.
	  if (!ret)
	    state.needDrain = true;

	  if (state.writing || state.corked)
	    state.buffer.push(new WriteReq(chunk, encoding, cb));
	  else
	    doWrite(stream, state, false, len, chunk, encoding, cb);

	  return ret;
	}

	function doWrite(stream, state, writev, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  if (writev)
	    stream._writev(chunk, state.onwrite);
	  else
	    stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}

	function onwriteError(stream, state, sync, er, cb) {
	  if (sync)
	    process.nextTick(function() {
	      state.pendingcb--;
	      cb(er);
	    });
	  else {
	    state.pendingcb--;
	    cb(er);
	  }

	  stream._writableState.errorEmitted = true;
	  stream.emit('error', er);
	}

	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}

	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;

	  onwriteStateUpdate(state);

	  if (er)
	    onwriteError(stream, state, sync, er, cb);
	  else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(stream, state);

	    if (!finished &&
	        !state.corked &&
	        !state.bufferProcessing &&
	        state.buffer.length) {
	      clearBuffer(stream, state);
	    }

	    if (sync) {
	      process.nextTick(function() {
	        afterWrite(stream, state, finished, cb);
	      });
	    } else {
	      afterWrite(stream, state, finished, cb);
	    }
	  }
	}

	function afterWrite(stream, state, finished, cb) {
	  if (!finished)
	    onwriteDrain(stream, state);
	  state.pendingcb--;
	  cb();
	  finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}


	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;

	  if (stream._writev && state.buffer.length > 1) {
	    // Fast case, write everything using _writev()
	    var cbs = [];
	    for (var c = 0; c < state.buffer.length; c++)
	      cbs.push(state.buffer[c].callback);

	    // count the one we are adding, as well.
	    // TODO(isaacs) clean this up
	    state.pendingcb++;
	    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
	      for (var i = 0; i < cbs.length; i++) {
	        state.pendingcb--;
	        cbs[i](err);
	      }
	    });

	    // Clear buffer
	    state.buffer = [];
	  } else {
	    // Slow case, write chunks one-by-one
	    for (var c = 0; c < state.buffer.length; c++) {
	      var entry = state.buffer[c];
	      var chunk = entry.chunk;
	      var encoding = entry.encoding;
	      var cb = entry.callback;
	      var len = state.objectMode ? 1 : chunk.length;

	      doWrite(stream, state, false, len, chunk, encoding, cb);

	      // if we didn't call the onwrite immediately, then
	      // it means that we need to wait until it does.
	      // also, that means that the chunk and cb are currently
	      // being processed, so move the buffer counter past them.
	      if (state.writing) {
	        c++;
	        break;
	      }
	    }

	    if (c < state.buffer.length)
	      state.buffer = state.buffer.slice(c);
	    else
	      state.buffer.length = 0;
	  }

	  state.bufferProcessing = false;
	}

	Writable.prototype._write = function(chunk, encoding, cb) {
	  cb(new Error('not implemented'));

	};

	Writable.prototype._writev = null;

	Writable.prototype.end = function(chunk, encoding, cb) {
	  var state = this._writableState;

	  if (util.isFunction(chunk)) {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (!util.isNullOrUndefined(chunk))
	    this.write(chunk, encoding);

	  // .end() fully uncorks
	  if (state.corked) {
	    state.corked = 1;
	    this.uncork();
	  }

	  // ignore unnecessary end() calls.
	  if (!state.ending && !state.finished)
	    endWritable(this, state, cb);
	};


	function needFinish(stream, state) {
	  return (state.ending &&
	          state.length === 0 &&
	          !state.finished &&
	          !state.writing);
	}

	function prefinish(stream, state) {
	  if (!state.prefinished) {
	    state.prefinished = true;
	    stream.emit('prefinish');
	  }
	}

	function finishMaybe(stream, state) {
	  var need = needFinish(stream, state);
	  if (need) {
	    if (state.pendingcb === 0) {
	      prefinish(stream, state);
	      state.finished = true;
	      stream.emit('finish');
	    } else
	      prefinish(stream, state);
	  }
	  return need;
	}

	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished)
	      process.nextTick(cb);
	    else
	      stream.once('finish', cb);
	  }
	  state.ended = true;
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 114 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a duplex stream is just a stream that is both readable and writable.
	// Since JS doesn't have multiple prototypal inheritance, this class
	// prototypally inherits from Readable, and then parasitically from
	// Writable.

	module.exports = Duplex;

	/*<replacement>*/
	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}
	/*</replacement>*/


	/*<replacement>*/
	var util = __webpack_require__(120);
	util.inherits = __webpack_require__(121);
	/*</replacement>*/

	var Readable = __webpack_require__(112);
	var Writable = __webpack_require__(113);

	util.inherits(Duplex, Readable);

	forEach(objectKeys(Writable.prototype), function(method) {
	  if (!Duplex.prototype[method])
	    Duplex.prototype[method] = Writable.prototype[method];
	});

	function Duplex(options) {
	  if (!(this instanceof Duplex))
	    return new Duplex(options);

	  Readable.call(this, options);
	  Writable.call(this, options);

	  if (options && options.readable === false)
	    this.readable = false;

	  if (options && options.writable === false)
	    this.writable = false;

	  this.allowHalfOpen = true;
	  if (options && options.allowHalfOpen === false)
	    this.allowHalfOpen = false;

	  this.once('end', onend);
	}

	// the no-half-open enforcer
	function onend() {
	  // if we allow half-open state, or if the writable side ended,
	  // then we're ok.
	  if (this.allowHalfOpen || this._writableState.ended)
	    return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  process.nextTick(this.end.bind(this));
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(13)))

/***/ },
/* 115 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.


	// a transform stream is a readable/writable stream where you do
	// something with the data.  Sometimes it's called a "filter",
	// but that's not a great name for it, since that implies a thing where
	// some bits pass through, and others are simply ignored.  (That would
	// be a valid example of a transform, of course.)
	//
	// While the output is causally related to the input, it's not a
	// necessarily symmetric or synchronous transformation.  For example,
	// a zlib stream might take multiple plain-text writes(), and then
	// emit a single compressed chunk some time in the future.
	//
	// Here's how this works:
	//
	// The Transform stream has all the aspects of the readable and writable
	// stream classes.  When you write(chunk), that calls _write(chunk,cb)
	// internally, and returns false if there's a lot of pending writes
	// buffered up.  When you call read(), that calls _read(n) until
	// there's enough pending readable data buffered up.
	//
	// In a transform stream, the written data is placed in a buffer.  When
	// _read(n) is called, it transforms the queued up data, calling the
	// buffered _write cb's as it consumes chunks.  If consuming a single
	// written chunk would result in multiple output chunks, then the first
	// outputted bit calls the readcb, and subsequent chunks just go into
	// the read buffer, and will cause it to emit 'readable' if necessary.
	//
	// This way, back-pressure is actually determined by the reading side,
	// since _read has to be called to start processing a new chunk.  However,
	// a pathological inflate type of transform can cause excessive buffering
	// here.  For example, imagine a stream where every byte of input is
	// interpreted as an integer from 0-255, and then results in that many
	// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
	// 1kb of data being output.  In this case, you could write a very small
	// amount of input, and end up with a very large amount of output.  In
	// such a pathological inflating mechanism, there'd be no way to tell
	// the system to stop doing the transform.  A single 4MB write could
	// cause the system to run out of memory.
	//
	// However, even in such a pathological case, only a single written chunk
	// would be consumed, and then the rest would wait (un-transformed) until
	// the results of the previous transformed chunk were consumed.

	module.exports = Transform;

	var Duplex = __webpack_require__(114);

	/*<replacement>*/
	var util = __webpack_require__(120);
	util.inherits = __webpack_require__(121);
	/*</replacement>*/

	util.inherits(Transform, Duplex);


	function TransformState(options, stream) {
	  this.afterTransform = function(er, data) {
	    return afterTransform(stream, er, data);
	  };

	  this.needTransform = false;
	  this.transforming = false;
	  this.writecb = null;
	  this.writechunk = null;
	}

	function afterTransform(stream, er, data) {
	  var ts = stream._transformState;
	  ts.transforming = false;

	  var cb = ts.writecb;

	  if (!cb)
	    return stream.emit('error', new Error('no writecb in Transform class'));

	  ts.writechunk = null;
	  ts.writecb = null;

	  if (!util.isNullOrUndefined(data))
	    stream.push(data);

	  if (cb)
	    cb(er);

	  var rs = stream._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    stream._read(rs.highWaterMark);
	  }
	}


	function Transform(options) {
	  if (!(this instanceof Transform))
	    return new Transform(options);

	  Duplex.call(this, options);

	  this._transformState = new TransformState(options, this);

	  // when the writable side finishes, then flush out anything remaining.
	  var stream = this;

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;

	  this.once('prefinish', function() {
	    if (util.isFunction(this._flush))
	      this._flush(function(er) {
	        done(stream, er);
	      });
	    else
	      done(stream);
	  });
	}

	Transform.prototype.push = function(chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function(chunk, encoding, cb) {
	  throw new Error('not implemented');
	};

	Transform.prototype._write = function(chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform ||
	        rs.needReadable ||
	        rs.length < rs.highWaterMark)
	      this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function(n) {
	  var ts = this._transformState;

	  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};


	function done(stream, er) {
	  if (er)
	    return stream.emit('error', er);

	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  var ws = stream._writableState;
	  var ts = stream._transformState;

	  if (ws.length)
	    throw new Error('calling transform done when ws.length != 0');

	  if (ts.transforming)
	    throw new Error('calling transform done when still transforming');

	  return stream.push(null);
	}


/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a passthrough stream.
	// basically just the most minimal sort of Transform stream.
	// Every written chunk gets output as-is.

	module.exports = PassThrough;

	var Transform = __webpack_require__(115);

	/*<replacement>*/
	var util = __webpack_require__(120);
	util.inherits = __webpack_require__(121);
	/*</replacement>*/

	util.inherits(PassThrough, Transform);

	function PassThrough(options) {
	  if (!(this instanceof PassThrough))
	    return new PassThrough(options);

	  Transform.call(this, options);
	}

	PassThrough.prototype._transform = function(chunk, encoding, cb) {
	  cb(null, chunk);
	};


/***/ },
/* 117 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 118 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Buffer = __webpack_require__(45).Buffer;

	var isBufferEncoding = Buffer.isEncoding
	  || function(encoding) {
	       switch (encoding && encoding.toLowerCase()) {
	         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
	         default: return false;
	       }
	     }


	function assertEncoding(encoding) {
	  if (encoding && !isBufferEncoding(encoding)) {
	    throw new Error('Unknown encoding: ' + encoding);
	  }
	}

	// StringDecoder provides an interface for efficiently splitting a series of
	// buffers into a series of JS strings without breaking apart multi-byte
	// characters. CESU-8 is handled as part of the UTF-8 encoding.
	//
	// @TODO Handling all encodings inside a single object makes it very difficult
	// to reason about this code, so it should be split up in the future.
	// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
	// points as used by CESU-8.
	var StringDecoder = exports.StringDecoder = function(encoding) {
	  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
	  assertEncoding(encoding);
	  switch (this.encoding) {
	    case 'utf8':
	      // CESU-8 represents each of Surrogate Pair by 3-bytes
	      this.surrogateSize = 3;
	      break;
	    case 'ucs2':
	    case 'utf16le':
	      // UTF-16 represents each of Surrogate Pair by 2-bytes
	      this.surrogateSize = 2;
	      this.detectIncompleteChar = utf16DetectIncompleteChar;
	      break;
	    case 'base64':
	      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
	      this.surrogateSize = 3;
	      this.detectIncompleteChar = base64DetectIncompleteChar;
	      break;
	    default:
	      this.write = passThroughWrite;
	      return;
	  }

	  // Enough space to store all bytes of a single character. UTF-8 needs 4
	  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
	  this.charBuffer = new Buffer(6);
	  // Number of bytes received for the current incomplete multi-byte character.
	  this.charReceived = 0;
	  // Number of bytes expected for the current incomplete multi-byte character.
	  this.charLength = 0;
	};


	// write decodes the given buffer and returns it as JS string that is
	// guaranteed to not contain any partial multi-byte characters. Any partial
	// character found at the end of the buffer is buffered up, and will be
	// returned when calling write again with the remaining bytes.
	//
	// Note: Converting a Buffer containing an orphan surrogate to a String
	// currently works, but converting a String to a Buffer (via `new Buffer`, or
	// Buffer#write) will replace incomplete surrogates with the unicode
	// replacement character. See https://codereview.chromium.org/121173009/ .
	StringDecoder.prototype.write = function(buffer) {
	  var charStr = '';
	  // if our last write ended with an incomplete multibyte character
	  while (this.charLength) {
	    // determine how many remaining bytes this buffer has to offer for this char
	    var available = (buffer.length >= this.charLength - this.charReceived) ?
	        this.charLength - this.charReceived :
	        buffer.length;

	    // add the new bytes to the char buffer
	    buffer.copy(this.charBuffer, this.charReceived, 0, available);
	    this.charReceived += available;

	    if (this.charReceived < this.charLength) {
	      // still not enough chars in this buffer? wait for more ...
	      return '';
	    }

	    // remove bytes belonging to the current character from the buffer
	    buffer = buffer.slice(available, buffer.length);

	    // get the character that was split
	    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

	    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	    var charCode = charStr.charCodeAt(charStr.length - 1);
	    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	      this.charLength += this.surrogateSize;
	      charStr = '';
	      continue;
	    }
	    this.charReceived = this.charLength = 0;

	    // if there are no more bytes in this buffer, just emit our char
	    if (buffer.length === 0) {
	      return charStr;
	    }
	    break;
	  }

	  // determine and set charLength / charReceived
	  this.detectIncompleteChar(buffer);

	  var end = buffer.length;
	  if (this.charLength) {
	    // buffer the incomplete character bytes we got
	    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
	    end -= this.charReceived;
	  }

	  charStr += buffer.toString(this.encoding, 0, end);

	  var end = charStr.length - 1;
	  var charCode = charStr.charCodeAt(end);
	  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	    var size = this.surrogateSize;
	    this.charLength += size;
	    this.charReceived += size;
	    this.charBuffer.copy(this.charBuffer, size, 0, size);
	    buffer.copy(this.charBuffer, 0, 0, size);
	    return charStr.substring(0, end);
	  }

	  // or just emit the charStr
	  return charStr;
	};

	// detectIncompleteChar determines if there is an incomplete UTF-8 character at
	// the end of the given buffer. If so, it sets this.charLength to the byte
	// length that character, and sets this.charReceived to the number of bytes
	// that are available for this character.
	StringDecoder.prototype.detectIncompleteChar = function(buffer) {
	  // determine how many bytes we have to check at the end of this buffer
	  var i = (buffer.length >= 3) ? 3 : buffer.length;

	  // Figure out if one of the last i bytes of our buffer announces an
	  // incomplete char.
	  for (; i > 0; i--) {
	    var c = buffer[buffer.length - i];

	    // See http://en.wikipedia.org/wiki/UTF-8#Description

	    // 110XXXXX
	    if (i == 1 && c >> 5 == 0x06) {
	      this.charLength = 2;
	      break;
	    }

	    // 1110XXXX
	    if (i <= 2 && c >> 4 == 0x0E) {
	      this.charLength = 3;
	      break;
	    }

	    // 11110XXX
	    if (i <= 3 && c >> 3 == 0x1E) {
	      this.charLength = 4;
	      break;
	    }
	  }
	  this.charReceived = i;
	};

	StringDecoder.prototype.end = function(buffer) {
	  var res = '';
	  if (buffer && buffer.length)
	    res = this.write(buffer);

	  if (this.charReceived) {
	    var cr = this.charReceived;
	    var buf = this.charBuffer;
	    var enc = this.encoding;
	    res += buf.slice(0, cr).toString(enc);
	  }

	  return res;
	};

	function passThroughWrite(buffer) {
	  return buffer.toString(this.encoding);
	}

	function utf16DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 2;
	  this.charLength = this.charReceived ? 2 : 0;
	}

	function base64DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 3;
	  this.charLength = this.charReceived ? 3 : 0;
	}


/***/ },
/* 119 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = Array.isArray || function (arr) {
	  return Object.prototype.toString.call(arr) == '[object Array]';
	};


/***/ },
/* 120 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	function isBuffer(arg) {
	  return Buffer.isBuffer(arg);
	}
	exports.isBuffer = isBuffer;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(45).Buffer))

/***/ },
/* 121 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ }
/******/ ])