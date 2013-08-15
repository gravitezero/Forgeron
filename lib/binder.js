var $                 = require('jquery'),
    fs                = require('fs'),
    jsdom             = require('jsdom'),
    scrapper          = require('./scrapper.js')

module.exports = function(doc, callback) {

  this._doc = doc;
  this._$doc = undefined;

  if (doc)
    this._$doc = new $(doc);

  this._waitqueue = [];

  this.template = function(file_name) {
    if (!this._doc) {
      this._doc = jsdom.jsdom(scrapper.getTemplate('test')).createWindow().document;
      this._$doc = new $(this._doc);

      while (this._waitqueue.length > 0) with (this._waitqueue.shift()) {
        this.fill(tag, content);
      }

      if (this._end)
        this.end();
    } else
      console.info('template already provided');
  }

  this.fill = function(tag, content) {
    if (this._$doc) {
      if (content instanceof Array)
        this._fillList(tag, content);
      else
        this._fill(tag, content);
    } else {
      this._waitqueue.push({tag: tag, content: content});
    }
  }

  this.end = function() {

    if ( this._$doc && this._waitqueue.length === 0 )
        callback(undefined, this._doc.innerHTML)
    else
      // TODO this kind of awkward logic feels a lot like a need for a sozu like lib.
      // TODO TRY BACON.JS OR FIBERS, OR BOTH
      this._end = true;
  }

  this._fill = function(tag, content) {
    this._$doc.find(tag).html(content);
  }

  this._fillList = function(tag, content) {
    var item = this._$doc.find(tag)
    for (var i in content) {
      item.clone().html(content[i]).insertBefore(item);
    }
    item.remove();
  }

  return this;
}