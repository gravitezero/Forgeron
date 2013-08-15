var fs          = require('fs'),
    Fiber       = require('fibers'),
    Future      = require('fibers/future'),
    Colors      = require('colors'),

    wait        = Future.wait;
    readdir     = Future.wrap(fs.readdir),
    readfile    = Future.wrap(fs.readFile),
    writefile   = Future.wrap(fs.writeFile),
    stat        = Future.wrap(fs.stat);

const fileType    = {
  'html' : 'templates',
  'less' : 'styles',
  'mdwn' : 'pages',
};

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

var scrapper = function() {

  this._files = {
    styles        : {},
    templates     : {},
    pages         : {}
  };
  
  this.scrap = function(path){

    var files = readdir(path).wait();
    var futures = [];

    for(var file in files) { file = files[file];

      var _stat = stat(path + '/' + file).wait();

      if (_stat.isDirectory())
        futures.push(this.scrap(path + '/' + file));
      else if (_stat.isFile()) {
        name = getFileExt(file);
        if (fileType[name.ext])
          this._files[fileType[name.ext]][name.base] = path + '/' + file;
      }
    }

    wait(futures);
    return true;

  }.future();

  this._getFactory = function(type) {
    return function(name) {
      var path = this._files[type][name];
      if ( path )
        return readfile(path).wait();
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
      var path = this._files[type][name];
      console.log('dont write on source, dummy : ', path);
      // if ( path )
        // return writefile(path, file).wait();
    }.future();  }

  this.writePage = function(name, file) {
    return this._writeFactory('pages')(name, file).wait();
  }

  return this;
};

module.exports = scrapper();