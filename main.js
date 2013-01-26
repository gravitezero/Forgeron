var fs                = require('fs'),
    marked            = require('marked'),
    jsdom             = require("jsdom"),
    $                 = require('jquery'),
    less              = require('less'),
    sozu              = require('sozu');

var src           = __dirname + '/sources';
var pub           = __dirname + '/public';

var struct        = {
  styles        : [],
  templates     : [],
  pages         : []
};

var fileType      = {
  'html' : 'templates',
  'less' : 'styles',
  'mdwn' : 'pages',
};

var counter = 0;

port = process.env.PORT || 5000;



// TODO make wait pass arguments
// TODO make then prepare the struct
// TODO make collection :
//        make pages have a short description
//        make short description place the read more link
// TODO while scrapping register tags, and authors to make collection about tags or author
// TODO save scrapping result in a .forgeron file to update only changed pages


// TODO allow needs of sozu like A_sozu.needs(B_sozu)
// needs is different from wait,
// wait will delay the execution until the other sozu finish
// needs will make one sozu to wait before executing then.

function getFileExt(file){
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

function changeFileExtension(path, extension) {
  path = path.split('.');
  path[path.length - 1] = extension;
  path = path.join('.');
  return path;
};

function createPath(root, path) {
  path.split('/').forEach(function(pathPart){

    if(pathPart.length === 0) return;

    if (fs.existsSync(root)) {
      // serve file
    } else {
      fs.mkdirSync(root, 0750);
    }
    root += '/' + pathPart;
  });
};

function writeFile(fileName, data, callback) {
  fs.writeFile(fileName, data, function (err) {
    if (err) throw err;
    callback();
  });
};

function scrap(path, callback){
  var files_sozu = new sozu(this, 'files'); // TODO rename these sozu
  var file_sozu = new sozu(this, 'file');
  
  files_sozu.placeholder('files');

  files_sozu
    .needs(fs.readdir, src + path, function(err, files){
      if (err) throw err;
      files_sozu.setPlaceholder('files', files);
    })
    .then();

  file_sozu.wait(files_sozu)
    .needsEach(files_sozu.getPlaceholder('file'), fs.stat, function(file){
      var fn = function(err, stat) {
        if (!stat)
          console.log('Error : ' + stat);

        if (stat.isDirectory()) {
          file_sozu.needs(scrap, path + '/' + file, function(){});
        }

        if (stat.isFile()) {
          fileName = getFileExt(file);

          if (fileType[fileName.ext]) {
            struct[fileType[fileName.ext]][fileName.base] = path + '/' + file;
          }
        }
      }

      return [src + path + '/' + file, fn];
    })
    .then(callback);
}

function createMeta(data) {

  /*
   * Each meta is a key : value pair.
   * a line containing a key start without space, the key is finished with a :
   * the value follow either on the same line, or on the next line starting with indentation
   *
   * § indicate a template to bind against, so a same page can have multiple template (page, short, thumbsnail)
   *   a page could be called this way: footer : footer§footer
   *   calling only footer : footer will take the only template, or a template in a nondetermist way (not random).
   * {} indicate a list of items -> {.item} will clone the .item tag inside its parent element, like for tags, or author
   * @ access an attribute of a tag -> .item@href will set the href attribute (or href@.item)
   * TODO how to generate a lit with specific attributes ?
   */

  var meta = [];
  var re = RegExp('^([^ \n])', 'img');

  m = re.test(data);
  var begin = re.lastIndex - 1;
  var end = 0;

  while (end !== data.length) {
    m = re.test(data);
    end = (re.lastIndex > 0) ? re.lastIndex-1 : data.length;

    var match = data.substr(begin, end-begin).match(/^([^:\n\s]+)(\s*:?\s*).*(\s*)$/im);
    var start = begin+match[1].length+match[2].length;
    var length = end-start-match[3].length;

    //meta[match[1]] = (length === 0) ? true : marked(data.substr(start, length).replace(/\n {2}/, '\n'));
    meta[match[1]] = (length === 0) ? true : data.substr(start, length).replace(/\n {2}/, '\n');

    begin  = re.lastIndex-1;
  }

  return meta;
};

function bind(meta, callback) {

  var doc  = jsdom.jsdom(meta.template? meta.template : '').createWindow().document,
      $doc = $(doc);

  var doc_sozu = new sozu(this, meta.name);

  doc_sozu
  .needs(function(){
    for( var key in meta ) {
      if (key === 'header'){

        var headers = meta[key].split(', ');
        for (var header in headers) (function(header){
          doc_sozu.needs(buildPage,header,function(meta){
            bind(meta, function(html){
              var header = $doc.find('header');
              if (header.length) header.append(html);
              else $doc.find('content').before(html);
            });
          });
        })(headers[header]);

      } else if (key === 'footer'){

        var footers = meta[key].split(', ');
        for (var footer in footers) (function(footer){
          doc_sozu.needs(buildPage, footer, function(meta){
            bind(meta, function(html){
              var footer = $doc.find('footer');
              if (footer.length) footer.append(html);
              else $doc.find('content').after(html);
            });
          });
        })(footers[footer]);

      } else if (key === 'assets') {
        // TODO assets
      } else if (key === 'collection') {
        // TODO collection
      } else {
        $doc.find(key).html(meta[key]);
      }
    }
  })

  .then(function(){
    var content = $(doc).find('content');
    content.after(content.html());
    content.remove();
    callback(doc.innerHTML);
    console.log('>>> then finished');
  });
};


function make(meta, template, callback) {
  if (!callback) {
    callback = template;

    // the first § is the default template
    for(key in meta) if (key[0] === '§') {
      template = meta[key]//.toString();
      break;
    }
  }

  var doc;
  var template_sozu = new sozu(this, 'template for '+ meta.title);
  var doc_sozu = new sozu(this, meta.title);

  template_sozu
    .needs(fs.readFile, src + struct.templates[template], function(err, data){
      template = data.toString();
    })
    .then(function(){});

  doc_sozu.wait(template_sozu)
    .needs(function(){

      doc  = jsdom.jsdom(template).createWindow().document,
      $doc = $(doc);

      for(key in meta) {
        var ikey;

        /* INSERTION */

        if (key === 'before'){

          // var headers = meta[key].split(', ');
          // for (var header in headers) (function(header){
          //   doc_sozu.needs(buildPage,header,function(meta){
          //     bind(meta, function(html){
          //       var header = $doc.find('header');
          //       if (header.length) header.append(html);
          //       else $doc.find('content').before(html);
          //     });
          //   });
          // })(headers[header]);

          // TODO instead of inserting after and before, we should provide way to include pages into pages.
          //      this way, we could insert different pages in different tags : CLEVER
          //      (like nav, or aside)
          // TODO another stuff : how to decide to make a page or not ??
          //      the include flag isn't a good way
          // TODO also, provide some hooks on flags, or on special ? char, for example, if a page present the ?hook flag, the user might want to transform meta with a func
          //      that's means providing a way to define hooks, and to call them
          //      not so complicated : a simple hook.js, which provide a hook object
          //      if we find ?hook in a file, call the ?hook function with the meta associated

          meta[key].split(',').forEach(function(before) { // For Each tag :
            console.log(before);
            before = before.match(/^\s*(.*)@?(.*)\s*$/); // remove unnecessary white spaces
            //console.log('>>> before', before);
          });


        } else
        if (ikey = key.match(/^{(.*)}$/)) { // Extract the key inside the {}

        /* ITERATIONS */

          ikey = ikey[1];
          var refelm = $doc.find(ikey);
          if (refelm) {
            var parelm = refelm.parent();
            meta[key].split(',').forEach(function(tag) { // For Each tag :
              tag = tag.match(/^\s*(.*)\s*$/)[1]; // remove unnecessary white spaces
              refelm.clone().appendTo(parelm).html(tag); // Append tag to parent
            });
            refelm.remove();
          }
        } else {

        /* BINDING */

          if (key[0] !== '§') { // don't worry about template
            attr = key.split('@')[1]; // If an attribute is defined, extract it.
            sel = key.split('@')[0];
            if (attr)
              $doc.find(sel).attr(attr, meta[key])
            else
              $doc.find(key).html(meta[key]);
          }
        }
      }
      console.log(doc.innerHTML)
    })
    .then(function(){
      callback(doc.innerHTML);
    })

};

var struct_sozu = new sozu(this, 'struct');
var pub_sozu = new sozu(this, 'pub');
var styles_sozu = new sozu(this, 'styles');
var pages_sozu = new sozu(this, 'pages');

struct_sozu
  .needs(scrap, '', function(){})
  .then(function(){
    console.log('>>> structured', struct);
  });

styles_sozu.wait(struct_sozu)
  .needsEach(struct.styles, fs.readFile, function(style){
    var fn = function (err, data) {

      var css_sozu = new sozu(this, 'css');
      var file_sozu = new sozu(this, 'file');

      css_sozu
        .needs(less.render, data, function(err, css){
          if (err) throw err;
          css_sozu.setPlaceholder('css', css);
        })
        .needs(createPath, pub, style)
        .then();

      file_sozu.wait(css_sozu)
        .needs(writeFile, pub + changeFileExtension(style, 'css'), css_sozu.getPlaceholder('css'), function(){
          // Be aware that styles_sozu will finish BEFORE file_sozu
        })
        .then();
    };
    return [src + style, 'utf8', fn];
  })
  .then(function(){
    console.log('>>> styles published');
  });

pages_sozu.wait(struct_sozu)
  .needsEach(struct.pages, fs.readFile, function(page){
    var fn = function (err, data) {
      if (err) throw err;

      var html_sozu = new sozu(this, 'html');
      var file_sozu = new sozu(this, 'file');

      html_sozu
        .needs(make, createMeta(data), function(html){
          console.log('>>> ', page, ' binded');
          html_sozu.setPlaceholder('html', html);
        }).needs(createPath, pub, page)
        .then();

      // file_sozu.wait(html_sozu)
      //   .needs(writeFile, pub + changeFileExtension(page, 'html'), html_sozu.getPlaceholder('html'), function(){
      //     // Be aware that pages_sozu will finish BEFORE file_sozu
      //   })
      //   .then();
    };
    return [src + page, 'utf8', fn];
  })
  .then(function(){
    console.log('>>> pages published');
  })