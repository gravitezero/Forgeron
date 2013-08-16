var $                 = require('jquery'),
    fs                = require('fs'),
    jsdom             = require('jsdom'),
    scrapper          = require('./scrapper.js'),
    Future            = require('fibers/future');

module.exports = function(doc, name, callback) {

  this._name = name;
  this._doc = doc;
  this._$doc = undefined;

  // TODO argument doc should be the default template in case none have been provided
  // If we hit end() of parser, but no template have been found, callback everything with the default callback
  if (doc)
    this._$doc = new $(doc);

  this._waitqueue = [];

  this.template = function(name) {
    if (!this._doc) {
      this._doc = jsdom.jsdom(scrapper.getTemplate(name)).createWindow().document;
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

    console.log('>>   ', tag, content);

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
      this._end = true;
  }

  this.insert = function(tag, link, selector) {

    if (link === 'this')
      this.fill(tag, scrapper.getPagePath(this._name));
  }

  this.dummy = function(text) {
    console.log('>>>      ', text);
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