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

function extractMetaData(data) {
  // Extract Meta data
  var match;
  var meta = [];

  // TODO REPAIR THIS
  // regexp won't stop until =
  while(match = data.match(/^\s*([\#.a-z0-9_-]+)\s*:?\s*(.*)\s*\n/i)) {
    data = data.substr(match[0].length);
    meta[match[1]] = match[2] === '' ? true : match[2];

    //console.log(match[1]);
  }

  meta['content'] = data;
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
      } else if (key === 'template' ) {
        // just do nothing
      } else if (key === 'collection') {
        // TODO collection
      } else if (key === 'content') {
        $doc.find('content').html(meta.content);
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

function buildPage(page, callback){
  fs.readFile(src + struct.pages[page], 'utf8', function (err, data) {
    if (err) throw err;

    var meta = extractMetaData(data);     

    // Markdown
    meta.content = marked(meta.content);

    // Template
    if (meta['template'] && struct.templates[meta['template']]) {
      meta.template = fs.readFileSync(src + struct.templates[meta['template']], 'utf8');
    } else {
      meta.template = '<content />';
    }

    callback(meta);
  });
};

var struct_sozu = new sozu(this, 'struct');
var pub_sozu = new sozu(this, 'pub');
var styles_sozu = new sozu (this, 'styles');

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
    console.log('>>> published');
  });