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

function scrap(path, scrap_sozu){
  scrap_sozu.needs(
    fs.readdir, src + path, function(err, files){
        if (err) throw err;

        files.forEach(function(file){

          scrap_sozu.needs(
            fs.stat, src + path + '/' + file, function(err, stat) {

              if (!stat)
                console.log('Error : ' + stat);

              if (stat.isDirectory())
                scrap(path + '/' + file, scrap_sozu);

              if (stat.isFile()) {
                fileName = getFileExt(file);

                if (fileType[fileName.ext]) {
                  struct[fileType[fileName.ext]][fileName.base] = path + '/' + file;
                }
              }

            }
          );
        });

    }
  );
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

function writeFile(fileName, data) {
  fs.writeFile(fileName, data, function (err) {
    if (err) throw err;
    console.log('>>> ' + fileName + ' generated');
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

    console.log(match[1]);
  }

  meta['content'] = data;
  return meta;
};

function bind(meta, callback) {
  var doc  = jsdom.jsdom(meta.template? meta.template : '').createWindow().document,
      $doc = $(doc);

  var join = new Join(function(doc){



    var content = $(doc).find('content');
    // In a very single 
    content.after(content.html());
    content.remove();
    callback(doc.innerHTML);
  });

  join.newJob();
  for( var key in meta ) {
    if (key === 'header'){

      var headers = meta[key].split(', ');
      for (var header in headers) (function(header){
        join.newJob();
        buildPage(header,function(meta){
          bind(meta, function(html){
            var header = $doc.find('header');
            if (header.length) header.append(html);
            else $doc.find('content').before(html);
            join.callback(doc);
          });
        });
      })(headers[header]);

    } else if (key === 'footer'){

      var footers = meta[key].split(', ');
      for (var footer in footers) (function(footer){
        join.newJob();
        buildPage(footer,function(meta){
          bind(meta, function(html){
            var footer = $doc.find('footer');
            if (footer.length) footer.append(html);
            else $doc.find('content').after(html);
            join.callback(doc);
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
  join.callback(doc);  
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

function make(pub) {

  console.log('--- MAKE ---');

  for (var style in struct.styles) (function (style) {
    fs.readFile(src + struct.styles[style], 'utf8', function (err, data) {
      less.render(data, function(err, css){
        if (err) throw err;
        createPath(pub, struct.styles[style])
        writeFile(pub + changeFileExtension(struct.styles[style], 'css'), css);
      });
    });
  })(style);

  for (var page in struct.pages) (function (page) {
      buildPage(page, function(meta){
        if(!meta.included)
          bind(meta, function(html){
            createPath(pub, struct.pages[page]);
            writeFile(pub + changeFileExtension(struct.pages[page], 'html'), '<!DOCTYPE html>' + html);
          });
      });
  })(page);  
};

var struct_sozu = new sozu(this);

struct_sozu.
needs(scrap, '', struct_sozu).

then(make(pub));

var pub_sozu = new sozu(this).

wait(struct_sozu).

needs(make, pub).

then(function(){
  console.log('done');
})