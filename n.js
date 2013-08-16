var parser 						= require('./syntax.js'),
		scrapper					= require('./lib/scrapper.js'),
		styler						= require('less');
		fs 				  			= require('fs'),
		Fiber 						= require('fibers'),
		Future						= require('fibers/future'),
		Colors						= require('colors'),

		wait 							= Future.wait,
	  readdir 					= Future.wrap(fs.readdir),
	  readfile 					= Future.wrap(fs.readFile),
	  stat 							= Future.wrap(fs.stat);

const prompt = ">".magenta + ">".magenta.bold + ">".cyan.bold + "   ";

// TODO SERIOUS REFACTORING
// the readmore : /this is just plain wrong.
// instead readmore : (href: /this)


Fiber(function(){

	scrapper.scrap('./sources', './public');
	console.log(prompt + " Scrapped");

	// TODO fix this
	var files = scrapper._files;

	for (var file in files.pages )
		parser.parse(scrapper.getPage(file).toString(), undefined, undefined, file, write(file, 'Page'));

	// for (var file in files.styles )
		// styler.render(scrapper.getStyle(file).toString(), write(file, 'Style'));

}).run();

// TODO use fibers
write = function(name, type) {
	return function(err, file) {
		// scrapper.writePage(name, file);
		// console.log(prompt + type + " wrote " + name.grey);
		console.log(file);
	}
}