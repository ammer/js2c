// refer to:
//   http://esprima.org/demo/parse.html
//   https://github.com/estree/estree/blob/master/spec.md

var _ = require('underscore');

(function(root, factory) {
    if(typeof define === 'function' && define.amd) {
	define(['exports'], factory);
    } else if(typeof exports != 'undefined') {
	factory(exports);
    } else {
	factory((root.js2c = {}));
    }
}(this, function(exports) {

    var tp = Transformer.prototype;
    
    function Transformer(ast, entryFuncName) {
	this.ast = ast;
	this.entryFuncName = entryFuncName;
	
	this.csource = '';

	this.head = '';
	this.body = '';

	this.funcIdx = 0;

	this.definedFunctions = [];

    }

    tp.handleNode = function (node) {
	var self = this;
	
	// 定義一個名字為 name 的函數
	var defineFunction = function(name, defNode) {
	    var returnType = "void";

	    var args = _.map(defNode.params, function(param, idx) {
		if(defNode.defaults[idx] != undefined && defNode.defaults[idx] != null) {
		    return "todo " + self.handleNode(param) + " = " + self.handleNode(defNode.defaults[idx]);
		} else {
		    return "todo " + self.handleNode(param);
		}
	    }).join(", ");

	    var body = self.handleNode(defNode.body);

	    return "static " + returnType + " " + name + "(" + args + ")" + body;
	};

	var getFunctionName = function(node) {
	    if(node.id == null) {
		self.funcIdx += 1;
		return "inner_func_" + self.funcIdx;
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

		/*
		 * If doesn't init, it type is string
		 * Or, it must be init to Literal value, e.g.: var a = 1; is ok,
		 * but var a = 1; var b = a (throw error);
		 */
		var initVal = "";
		if(node.init == null) { // notice: not initialized, default to string or just reject(throw error)?
		    var varType = "char *";
		} else {
		    if(node.init.type === "Literal") {
			var varType = {"string": "char *", "number": "int"}[typeof node.init.value];
			if(varType === undefined) {
			    varType = "[Error: only support integer and string type]";
			}
			initVal = " = " + self.handleNode(node.init);
		    } else {
			var varType = "todo"; //"[Error: " + node.init.type + " as initial value of variable is not supported]";
			initVal = " = " + self.handleNode(node.init); // TODO: it can be supported technolly
		    }
		}

		return varType + " " + name + " " + initVal + ";";
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
    
    tp.transfer = function() {
	this.startParse();
	
	return this.csource;
    };


    
    exports.Transformer = Transformer;
    
}));
