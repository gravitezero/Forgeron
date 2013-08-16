var fs          = require('fs'),
    Fiber       = require('fibers'),
    Future      = require('fibers/future'),
    Colors      = require('colors');

// Bad hack to wire single value callback to a standard (err, value) callback
const unwarp = function(fn) {
  return function(a, b) {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    args.push(function(value) {
      return callback(undefined, value);
    })
    return fn.apply(undefined, args);
  }
}

var wait        = Future.wait,
    readdir     = Future.wrap(fs.readdir),
    readfile    = Future.wrap(fs.readFile),
    writefile   = Future.wrap(fs.writeFile),
    stat        = Future.wrap(fs.stat),
    exists      = Future.wrap(unwarp(fs.exists)),
    mkdir       = Future.wrap(fs.mkdir);

const fileType  = {
  'html' : 'templates',
  'less' : 'styles',
  'mdwn' : 'pages',
};

const fileExt   = {
  'pages'  : 'hmtl',
  'styles' : 'css' 
}

const getFileExt = function(file){
  var fileName = file.split('.');
  var result = {};
  if (fileName.length > 1){
    result.base = fileName.splice(0, fileName.length - 1).join('.');
    result.ext = fileName[0];
  } else {
    result.ext = undefined;
    result.base = file;
  }
  return result;
};

const setFileExt = function(path, extension) {
  path = path.split('.');
  path[path.length - 1] = extension;
  path = path.join('.');
  return path;
};

const mkPath = function(path) {
  if(!path)
    return false;

  var parts = path.split('/')
  var root = parts.shift() + '/';
  if (root === './')
    root = root + parts.shift() + '/';

  for ( var i in parts) { var pathPart = parts[i];
    if(pathPart.length === 0)
      continue;

    if (!exists(root).wait())
      mkdir(root).wait();

    root += pathPart + '/';
  };

  return true;
}.future();

var scrapper = function() {

  this._files = {
    styles        : {},
    templates     : {},
    pages         : {}
  };
  
  this.scrap = function(srcpath, pubpath) {
      this._src = srcpath;
      this._pub = pubpath;
      return this._scrap(srcpath, '').wait();
  };

  this._scrap = function(basepath, path){

    var files = readdir(basepath + path).wait();
    var futures = [];

    for(var file in files) { file = files[file];

      var _stat = stat(basepath + path + '/' + file).wait();

      if (_stat.isDirectory())
        futures.push(this._scrap(basepath, path + '/' + file));
      else if (_stat.isFile()) {
        name = getFileExt(file);
        if (fileType[name.ext])
          this._files[fileType[name.ext]][name.base] = path + '/' + file;
      }
    }

    wait(futures);
    return true;

  }.future();

  this._getPathFactory = function(type) {
    return function(name) {
      return this._files[type][name];
    }
  }

  this.getPagePath = this._getPathFactory('pages');
  // this._getStylePath = this._getPathFactory('styles');

  this._getFactory = function(type) {
    return function(name) {
      var path = this._files[type][name];
      if ( path )
        return readfile(this._src + path).wait();
    }.future();
  }

  this.getPage = function(name) {
    return this._getFactory('pages')(name).wait();
  }

  this.getTemplate = function(name) {
    return this._getFactory('templates')(name).wait();
  }

  this.getStyle = function(name) {
    return this._getFactory('styles')(name).wait();
  }

  this._writeFactory = function(type) {
    return function(name, file) {
      var path = setFileExt(this._pub + this._files[type][name], fileExt[type])
      if ( mkPath(path).wait() )
        return writefile(path, file).wait();
      else
        console.error('      unable to make path');
    }.future();
  }

  this.writePage = function(name, file) {
    return this._writeFactory('pages')(name, file).wait();
  }

  this.writeStyle = function(name, file) {
    return this._writeFactory('styles')(name, file).wait();
  }

  return this;
};

module.exports = scrapper();