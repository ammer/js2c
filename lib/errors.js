var _ = require('underscore');

(function error() {
    var location = function(node) {
	if(!_.isObject(node)) {
	    return '';
	}

	return "" + node.range[0] + "-" + node.range[1] + " : " + node.toString();
    };

    // parent error object
    var AstNodeBaseError = function(node, message) {
	Error.captureStackTrace(this, AstNodeBaseError);
	this.message += " \n" + location(node) + "\n";
	this.name = 'AstNodeBaseError';
	this.node = node;
    };
    AstNodeBaseError.prototype = Object.create(Error.prototype);
    AstNodeBaseError.prototype.constructor = AstNodeBaseError;

    // can't infer something's type
    var TypeUnknowError = function(node, message) {
	if(!message) message = 'Type Unknow Error';	
	AstNodeBaseError.call(this, node, message);
	this.name = 'TypeUnknowError';
    };

    TypeUnknowError.prototype = Object.create(AstNodeBaseError.prototype);
    TypeUnknowError.prototype.constructor = TypeUnknowError;

    // node type isn't been support
    var UnsupportNodeError = function(node, message) {
	if(!message) message = 'Unsupported node Error';
	AstNodeBaseError.call(this, node, message);
	this.name = 'UnsupportNodeError';
    };
    UnsupportNodeError.prototype = Object.create(AstNodeBaseError.prototype);
    UnsupportNodeError.prototype.constructor = UnsupportNodeError;

    // bad node format
    var BadNodeFormatError = function(node, message) {
	if(!message) message = "Bad node format.";
	AstNodeBaseError.call(this, node, message);
	this.name = 'BadNodeFormatError';
    };
    BadNodeFormatError.prototype = Object.create(AstNodeBaseError.prototype);
    BadNodeFormatError.prototype.constructor = BadNodeFormatError;

    // include error
    var IncludeFileError = function(message) {
	this.message = message || "Error in included file.";
	this.name = 'IncludeFileError';
    };
    IncludeFileError.prototype = Object.create(Error.prototype);
    IncludeFileError.prototype.constructor = IncludeFileError;
    
    module.exports = {
	TypeUnknowError: TypeUnknowError,
	UnsupportNodeError: UnsupportNodeError,
	BadNodeFormatError: BadNodeFormatError,
	IncludeFileError: IncludeFileError
    };

})();
