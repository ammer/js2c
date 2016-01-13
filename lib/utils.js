(function () {
    var fs = require('fs'),
	_ = require('underscore'),
	rocambole = require('rocambole'),
	colors = require('colors');

    var utils = {
	readFile: function(path, coding) {
	    if(!coding) {
		coding = "utf-8";
	    }
	    
	    try {
		var content = fs.readFileSync(path, coding);
	    } catch(e) {
		console.error(colors.red(e.message));
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
	},

	getFuncName: function(node) {
	    switch(node.type) {
	    case 'CallExpression':
		if (node.callee.type === 'Identifier')
		    return node.callee.name;
		else
		    throw new error.BadNodeFormatError(node, "Can't find function name in CallExpression node");
	    case 'FunctionExpression':
		return this.lambdaNameOf(node);
	    case 'FunctionDeclaration':
		return node.id.name;
	    }
	    
	    throw new error.BadNodeFormat(node, "Can't get function name from node.");
	},
	
	getFuncParamID: function(fName, pIdx) {
	    return fName+"["+pIdx+"]";
	},
	
	debug: function() {
	    // console.info.apply(null, arguments);
	},

	output: function() {
	    console.log.apply(null, arguments);
	},

	error: function() {
	    console.error.apply(null, arguments);
	}

    }

    module.exports = utils;
})();
