var parser 						= require('./syntax.js'),
		scrapper					= require('./lib/scrapper.js'),
		fs 				  			= require('fs'),
		Fiber 						= require('fibers'),
		Future						= require('fibers/future'),
		Colors						= require('colors'),

		wait 							= Future.wait,
	  readdir 					= Future.wrap(fs.readdir),
	  readfile 					= Future.wrap(fs.readFile),
	  stat 							= Future.wrap(fs.stat);


// TODO parser and less are alike, they both process files to produce files
// TODO marked is a module of binder

Fiber(function(){

	scrapper.scrap('./sources').wait();

	console.log(">>".yellow.bold + " Scrapped");

	var files = scrapper._files;

	for (var file in files.pages )
		parser.parse(scrapper.getPage(file).toString(), undefined, undefined, write(file));

	for (var file in files.styles )
		styler.style(scrapper.getPage(file).toString())

}).run();

// TODO use fibers
write = function(name) {
	return function(err, file) {
		scrapper.writePage(name, file);
	}
}