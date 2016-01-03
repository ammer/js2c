var fs = require('fs'),
    _ = require('underscore'),
    rocambole = require('rocambole');

var utils = {
    readFile: function(path, coding) {
	if(!coding) {
	    coding = "utf-8";
	}
	
	try {
	    var content = fs.readFileSync(path, coding);
	} catch(e) {
	    console.error('Error opening: ' + path);
	    throw e;
	}
	return content;
    },

    astFromJsFile: function(path) {
	var content = this.readFile(path);
	var ast = rocambole.parse(content);
	return ast;
    },

    astFromString: function(content) {
	return rocambole.parse(content);
    },
    
    include: function(path) {
	if (_.isString(path)) {
	    eval("var __defs = " + utils.readFile(path));
	    return __defs;
	} else {
	    return {};
	}	    
    },

    lambdaNameOf: function(funcNode) {
	return "func_" + funcNode.range[0] + "_" + funcNode.range[1];
    }

}

module.exports = utils;
