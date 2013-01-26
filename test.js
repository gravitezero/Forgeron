var object = {

}

// Setters

setTimeout(function(o){

	o.ph = ['one', 'two'];

}, 10, object);

// Getters

// NOT WORKING pass the inexisting array inside the object
setTimeout(function(items){
	console.log(items);
}, 20, object.ph);

// WORKING pass the encolsing object, then process the array
setTimeout(function(items){
	console.log(items.ph);
}, 20, object);