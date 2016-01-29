// refer to:
//   http://esprima.org/demo/parse.html
//   https://github.com/estree/estree/blob/master/spec.md
//   http://piuccio.github.io/rocambole-visualize/

(function() {
    var _ = require('underscore');

    var error = require('./errors.js'),
	utils = require('./utils.js');

    var tp = CCodegen.prototype;

    function CCodegen(ast, entryFuncName, typeInfo, funcDefs) {
	this.ast = ast;
	this.entryFuncName = entryFuncName;
	this.typeInfo = typeInfo; // function prototype from included json file
	this.includedFuncs = funcDefs;
	
	this.csource = '';

	this.head = '';
	this.body = '';

	this.funcIdx = 0;

	this.definedFunctions = []; // function defined in script, should put to head of c source file

	this.declares = [];	// eg: extern int a;
	this.globals = [];	// eg: int a;
    }

    tp.handleNode = function (node) {
	var self = this;

	var getType = function(id) {
	    // utils.output(" ##### " + id + " ========> " + self.typeInfo[id]);
	    if (_.isString(self.typeInfo[id])) {
		return self.typeInfo[id];
	    } else {
		throw new error.TypeUnknowError(node, "Type of " + id + " is unknow");
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

	    self.declares.push(["static", returnType, name, "(", args, ")"].join(" ")+";");
	    
	    return "static " + returnType + " " + name + "(" + args + ")" + body;
	};

	var getFunctionName = function(node) {
	    if(node.id == null) {
		return utils.lambdaNameOf(node);
	    } else {
		return self.handleNode(node.id);
	    }		
	}
	
	var codeGenerators = {
	    Program: function(node) {
		var rst = "static void " + self.entryFuncName + "(void) {\n";
		
		rst += _.map(node.body, function(exp) {
		    return self.handleNode(exp);
		}).join("\n");

		rst += "\n}\n";

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
		    var rst = '"' +
			node.raw.substr(1, node.raw.length-2) + 
			'"';
		    return rst;
		} else {
		    if( node.value === null ) {
			return "0"; // null => 0
		    } else {
			return node.value;
		    }
		}
		return "[Error: " + node.value + "]";
	    },

	    BlockStatement: function(node) {
		return "{\n" +
		    _.map(node.body, function(exp) {
			return self.handleNode(exp);
		    }).join("\n")
		    + "\n}\n";
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
	    /*
	     * Notice, here we try to simplify variable's scope:
	     *
	     * js code:
	     *   var a = 1;
	     *   function f() { return a; }
	     *   [ ... a ...]
	     * Should goto c code:
	     *   static int a = 1;
	     *   int f() { return a; }
	     *   void entry() { ... }
	     */
	    VariableDeclarator: function(node) {
		var name = node.id.name,
		    parent = utils.getMyFunction(node),
		    initVal;

		if (!_.isNull(parent)) { // declared in some function
		    if (_.isNull(node.init)) { // notice: not initialized, default to string or just reject(throw error)?
			initVal = "";
		    } else {
			initVal = " = " + self.handleNode(node.init);
		    }

		    return getType(name) + " " + name + " " + initVal + ";";
		} else {
		    self.globals.push(["static", getType(name), name].join(" ") + ";");

		    if (_.isNull(node.init)) {
			return '';
		    } else {
			//self.declares.push(["extern static", getType(name), name].join(" ") + ";");
			initVal = ["=", self.handleNode(node.init)].join(" ");
			return [name, initVal].join(" ") + ";";
		    }
		}
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
		return " ; ";
	    },

	    ReturnStatement: function(node) {
		if( _.isNull(node.argument)) return "return;";
		
		return "return " + self.handleNode(node.argument) + ";";
	    },

	    AssignmentExpression: function(node) {
		return self.handleNode(node.left) + " " + node.operator + " " + self.handleNode(node.right);
	    },

	    UnaryExpression: function(node) {
		return node.operator + self.handleNode(node.argument);
	    },

	    BinaryExpression: function(node) {
		return [self.handleNode(node.left), node.operator, self.handleNode(node.right)].join(" ");
	    },

	    LogicalExpression: function(node) {
		return [self.handleNode(node.left), node.operator, self.handleNode(node.right)].join(" ");
	    },

	    ArrayExpression: function(node) {
		return "(void*[]){" + _.map(node.elements, function(e) { // TODO
		    return self.handleNode(e);
		}).join(", ") + "}";
	    },

	    UpdateExpression: function(node) {
		return self.handleNode(node.argument) + node.operator;
	    }
	};

	//console.log("> " + JSON.stringify(node));
	if(!_.isObject(node)) {
	    throw new TypeError("Bad node to parse, it's type is " + typeof node);
	}

	if(!_.has(codeGenerators, node.type)) {
	    //console.error(node.type + " is not supported, failed to transfer");
	    throw new error.UnsupportNodeError(node, "Unsupport node type: [" + node.type + "], between: " +
					       node.range[0] + "-" + node.range[1]);
	}
	
	return codeGenerators[node.type](node);
    };

    tp.startParse = function () {
	//console.log("Start to parse AST: " + JSON.stringify(this.ast));
	
	if(typeof this.ast != 'object') {
	    throw new TypeError('bad ast, type is ' + typeof this.ast);
	}

	if(this.ast.type != 'Program' || this.ast.sourceType != 'script') {
	    throw new error.UnsupportNodeError(this.ast, "Unsupport node type: [" + this.ast.type + "], between: " +
					       this.ast.range[0] + "-" + this.ast.range[1]);
	}

	this.body = this.handleNode(this.ast);

	this.csource = [
	    this.declares.join("\n"),
	    this.globals.join("\n"),
	    this.definedFunctions.join("\n\n"),
	    this.body
	].join("\n");
    }

    tp.includeExternals = function() {
	this.declares.push("#include <stdint.h>");
	// _.each(this.includedFuncs, function(desc, func) {
	//     this.declares.push(["extern", desc.returnType, func, "(",
	// 			_.map(desc.paramTypes, function(t) {
	// 			    if (_.isString(t)) {
	// 				return t;
	// 			    } else {
	// 				return "void *";
	// 			    }
	// 			}).join(", "), ");"].join(" "));
	// }, this);
    };
    
    tp.generate = function() {
	this.includeExternals();
	this.startParse();
	
	return this.csource;
    };

    module.exports = function() {
	return function(ast, entryName, typeInfo, funcDefs) {
	    return new CCodegen(ast, entryName, typeInfo, funcDefs);
	};
    };
    
})();
