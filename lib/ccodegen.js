// refer to:
//   http://esprima.org/demo/parse.html
//   https://github.com/estree/estree/blob/master/spec.md

var _ = require('underscore'),
    utils = require('./utils.js');

var tp = CCodegen.prototype;

function CCodegen(ast, entryFuncName, typeInfo) {
    this.ast = ast;
    this.entryFuncName = entryFuncName;
    this.typeInfo = typeInfo; // function prototype from included json file
    
    this.csource = '';

    this.head = '';
    this.body = '';

    this.funcIdx = 0;

    this.definedFunctions = []; // function defined in script, should put to head of c source file
}

tp.handleNode = function (node) {
    var self = this;

    var getType = function(id) {
	if (_.isString(self.typeInfo[id])) {
	    return self.typeInfo[id];
	} else {
	    return 'unknowType';
	}
    };

    var getParamType = function(fName, pIdx) {
	return getType(fName + "[" + pIdx + "]");
    }
    
    // 定義一個名字為 name 的函數
    var defineFunction = function(name, defNode) {
	var returnType = getType(name);

	var args = _.map(defNode.params, function(param, idx) {
	    if(defNode.defaults[idx] != undefined && defNode.defaults[idx] != null) {
		//return "todo " + self.handleNode(param) + " = " + self.handleNode(defNode.defaults[idx]);
		return self.getParamType(name, idx) + " " + self.handleNode(param) + " = " + self.handleNode(defNode.defaults[idx]);
	    } else {
		//return "todo " + self.handleNode(param);
		return getParamType(name, idx) + " " + self.handleNode(param);
	    }
	}).join(", ");

	var body = self.handleNode(defNode.body);

	return "static " + returnType + " " + name + "(" + args + ")" + body;
    };

    var getFunctionName = function(node) {
	if(node.id == null) {
	    self.funcIdx += 1;
	    //return "inner_func_" + self.funcIdx;
	    return utils.lambdaNameOf(node);
	} else {
	    return handleNode(node.id);
	}		
    }
    
    var handlers = {
	Program: function(node) {
	    var rst = "void " + self.entryFuncName + "(void) {\n";
	    
	    rst += _.map(node.body, function(exp) {
		return self.handleNode(exp);
	    }).join("\n");

	    rst += "}\n";

	    return rst;
	},

	ExpressionStatement: function(node) {
	    return self.handleNode(node.expression) + ";\n";
	},

	CallExpression: function(node) {
	    return self.handleNode(node.callee) + " (" +
		_.map(node.arguments, function(exp) {
		    return self.handleNode(exp);
		}).join(", ") +
		")";
	},

	Identifier: function(node) {
	    return node.name;
	},

	Literal: function(node) {
	    if(typeof node.value === 'string') {
		var rst ='"' + node.raw.substr(1, node.raw.length-2).replace(/\"/g, '\\\"') + '"';
	    } else {
		var rst = node.value;
	    }
	    return rst;
	},

	BlockStatement: function(node) {
	    return "{\n" +
		_.map(node.body, function(exp) {
		    return self.handleNode(exp);
		}).join("\n")
		+ "}\n";
	},

	// function() {...}
	FunctionExpression: function(node) {
	    var funcName = getFunctionName(node);
	    self.definedFunctions.push(defineFunction(funcName, node));
	    return funcName;
	},

	// function a() {...}
	FunctionDeclaration: function(node) {
	    var funcName = getFunctionName(node);
	    self.definedFunctions.push(defineFunction(funcName, node));
	    return "";
	},

	// var a..., b..., ...;
	VariableDeclaration: function(node) {
	    return _.map(node.declarations, function(exp) {
		return self.handleNode(exp);
	    }).join(";\n");
	},

	// [var] a = 1;
	VariableDeclarator: function(node) {
	    var name = node.id.name;

	    if(node.init == null) { // notice: not initialized, default to string or just reject(throw error)?
		var initVal = "";
	    } else {
		var initVal = " = " + self.handleNode(node.init);
	    }

	    return getType(name) + " " + name + " " + initVal + ";";
	},

	IfStatement: function(node) {
	    var test = self.handleNode(node.test);

	    var _then = self.handleNode(node.consequent);

	    if(node.alternate == null) {
		return "if(" + test + ") " + _then ;
	    } else {
		return "if(" + test + ") " + _then + " else " + self.handleNode(node.alternate);
	    }
	},

	EmptyStatement: function(node) {
	    return "";
	}

	
    };

    //console.log("> " + JSON.stringify(node));
    if(!_.isObject(node)) {
	//console.log("Error: " + typeof node);
	//console.log("string: " + node);
	return node;
    }

    if(!_.has(handlers, node.type)) {
	console.error(node.type + " is not supported, failed to transfer");
	return "[Error: <" + node.type + "> not supported]";
    }
    
    return handlers[node.type](node);
};

tp.startParse = function () {
    //console.log("Start to parse AST: " + JSON.stringify(this.ast));
    
    if(typeof this.ast != 'object') {
	throw 'bad ast, type is ' + typeof this.ast;
    }

    if(this.ast.type != 'Program' || this.ast.sourceType != 'script') {
	throw 'bad script';
    }

    this.body = this.handleNode(this.ast);

    this.csource = this.definedFunctions.join("\n\n") + this.body;
    
}

tp.generate = function() {
    this.startParse();
    
    return this.csource;
};

module.exports = function() {
    return function(ast, entryName, typeInfo) { return new CCodegen(ast, entryName, typeInfo); };
};