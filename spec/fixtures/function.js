var a = function() { return 1;};

function b() {
    return 'hello';
}

var c = (function(){ return a(); })();

var d;

d = b();
