var test  = function() {
	console.log('test');
	return [1, 2, 3, 4, 5];
}

for (var i in _test = test()) { 
	var j = _test[i]
	console.log('>> ', i, j)
}