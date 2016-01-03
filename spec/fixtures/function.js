var a = function() { return 1;};

function b() {
    return 'hello';
}

var c = (function(){ return a(); })();

var d;

d = b();

alert((function(){return "hello";})());

httpGet("http://localhost/index.html",
	function(data) {
	    return "hello";
	},
	function(error) {
	    return 1;
	});

(function(){return;})();
(function(){})();

