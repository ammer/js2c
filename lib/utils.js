(function () {
    var fs = require('fs'),
	_ = require('underscore'),
	rocambole = require('rocambole'),
	colors = require('colors');
    
    var	error = require('./errors.js');

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
	
	// which function do this state belongs to
	getMyFunction: function(state) {
	    var interestp = function(item) { return (item === "FunctionDeclaration" || item === "FunctionExpression"); };
	    
	    var parent = state.parent;
	    while (parent && !interestp(parent.type)) {
		parent = parent.parent;
	    }

	    if (!parent) {
		//utils.error( "Statement doesn't located in a function, line: " + JSON.stringify(state.range));
		return null;
	    }

	    return parent;
	},

	getFunctionOfReturn: function(returnState) {
	    var func = utils.getMyFunction(returnState);
	    if (func) return utils.getFuncName(func);
	    return null;
	},

	lambdaNameOf: function(funcNode) {
	    return "func_" + funcNode.range[0] + "_" + funcNode.range[1];
	},

	getFuncName: function(node) {
	    switch(node.type) {
	    case 'CallExpression':
		if (node.callee.type === 'Identifier') {
		    return node.callee.name;
		} else {
		    if (node.callee.type === 'FunctionExpression') {
			return utils.getFuncName(node.callee);
		    } else {
			throw new error.BadNodeFormatError(node, "Can't find function name in CallExpression node");
		    }
		}
	    case 'FunctionExpression':
		if (_.isObject(node.id)) {
		    return node.id.name;
		} else {
		    return utils.lambdaNameOf(node);
		}
	    case 'FunctionDeclaration':
		return node.id.name;
	    }

	    utils.output(node.toString());
	    throw new error.BadNodeFormatError(node, "Can't get function name from node: " + node.toString());
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
