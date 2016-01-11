var a = 1;

function vs1() {
    var a = (function(a) {
	var rst = 10;
	return a*10;
    })(10);
}

a = 0;

