var _ = require('underscore');

(function error() {

    var location = function(node) {
	if(!_.isObject(node)) {
	    return '';
	}

	return "" + node.range[0] + "-" + node.range[1] + " : " + node.toString();
    };
    
    var TypeUnknowError = function(node, message) {
	this.message = message || 'Type Unknow Error';
	this.message += " \n" + location(node) + "\n";
	this.name = 'TypeUnknowError';
	this.node = node;
    };

    TypeUnknowError.prototype = Object.create(Error.prototype);
    TypeUnknowError.prototype.constructor = TypeUnknowError;


    var UnsupportNodeError = function(node, message) {
	this.message = message || 'Unsupported node Error';
	this.message += " \n" + location(node) + "\n";
	this.name = 'UnsupportNodeError';
	this.node = node;
    };
    UnsupportNodeError.prototype = Object.create(Error.prototype);
    UnsupportNodeError.prototype.constructor = UnsupportNodeError;
    
    module.exports = {
	TypeUnknowError: TypeUnknowError,
	UnsupportNodeError: UnsupportNodeError
    };
    
})();
