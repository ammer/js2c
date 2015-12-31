(function(root, factory) {
    if(typeof define === 'function' && define.amd) {
	define(['exports'], factory);
    } else if(typeof exports != 'undefined') {
	factory(exports);
    } else {
	factory((root.js2c = {}));
    }
}(this, function(exports) {

    function Transformer(ast) {
	this.ast = ast;
    }

    Transformer.prototype.transfer = function() {
	return this.ast;
    };
    
    exports.Transformer = Transformer;
    
}));
