// refs:
//   http://piuccio.github.io/rocambole-visualize/

(function typeInfer() {
    'use strict';
    
    var _ = require('underscore'),
	rocambole = require('rocambole');

    var utils = require('./utils.js'),
	error = require('./errors.js');

    	// identify scopes
    var	renameVarInDifferentScope = function(ast) {
	    var renameAllVarUnderNode = function(node, oldName, newName) {
		rocambole.walk(node, function(subnode) {
		    if (subnode.type === 'Identifier' && subnode.name === oldName) subnode.name = newName;
		});
	    };
	    
	    var findVarDeclareWalkFn = function(node) {
		switch(node.type) {
		case 'VariableDeclarator':
		    var func = utils.getMyFunction(node);
		    if (!_.isObject(func)) return;
		    renameAllVarUnderNode(func, node.id.name, node.id.name+"_at_"+utils.getFuncName(func));
		    break;
		case 'FunctionDeclaration':
		case 'FunctionExpression':
		    _.each(node.params, function(param, idx) {
			var newName = utils.getFuncName(node)+"_p"+idx;
			renameAllVarUnderNode(node.body, param.name, newName);
			param.name = newName;
		    });
		    break;
		}
	    };

	    rocambole.moonwalk(ast, findVarDeclareWalkFn);
	};


    var	cTypeOfValue = function(v) {
	switch(typeof v) {
	case 'string':
	    return "char *";
	case 'number':
	    return "int";		// TODO: float?
	default:
	    if (_.isNull(v)) {
		return "char *";
	    } else {
		throw new error.TypeUnknowError(v, "unknown type of [" + v + "]");
	    }
	}
    };

    
    var TypeRef = function(ast, funcProtos) {
	this.ast = ast;
	this.funcDefs = funcProtos;

	this.knowTypes = {};
	this.typeGroups = [];

	return this;
    };

    
    TypeRef.prototype = {
	
	inferTypeByExpr: function(id, node) {
	    var self = this;
	    var types = {
		Identifier: function(id, node) {
		    self.markTwoIdentifiersAsSameType(id, node.name);
		},

		Literal: function(id, node) {
		    self.resolveIdentifierType(id, cTypeOfValue(node.value));
		},

		// x = function(..) {...};
		FunctionExpression: function(id, node) {
		    self.markTwoIdentifiersAsSameType(id, utils.lambdaNameOf(node));
		},
		
		CallExpression: function(id, node) {
		    var callee = node.callee;
		    // a()
		    if (callee.type === 'Identifier') {
			self.markTwoIdentifiersAsSameType(callee.name, id);
			return;
		    }
		    // (function (){})()
		    if (callee.type === 'FunctionExpression') {
			self.markTwoIdentifiersAsSameType(id, utils.lambdaNameOf(callee));
			return;
		    }
		},

		BinaryExpression: function(id, node) {
		    utils.output("1: " + id + " -> " + node.toString());
		    if(node.left.type === 'Literal') {
			types.Literal(id, node.left);
			return;
		    }
		    if(node.right.type === 'Literal') {
			types.Literal(id, node.right);
			return;
		    }
		    if(node.left.type === 'Identifier') {
			utils.output("11: " + id + " -> " + node.left.toString());
			types.Identifier(id, node.left);
			return;
		    }
		    if(node.right.type === 'Identifier') {
			types.Identifier(id, node.right);
			return;
		    }

		    throw new UnsupportNodeError(node);
		},

		UnaryExpression: function(id, node) {
		    self.inferTypeByExpr(id, node.argument);
		},

		ArrayExpression: function(id, node) {
		    var elType = null;
		    _.find(node.elements, function(el) {
			switch( el.type ) {
			case 'Literal':
			    elType = cTypeOfValue(el.value);
			    return true;
			case 'Identifier':
			    if( this.knowTypes && this.knowTypes[el.name] ) {
				elType = this.knownTypes[el.name];
				return true;
			    }
			    break;
			case 'CallExpression':
			    var fn = utils.getFuncName(el);
			    if ( this.knowTypes && this.knowTypes[fn] ) {
				var type = this.knowTypes[fn];
			    }
			    // utils.output("CallExpression in array, type: " + type +
			    // 		 "  For :" + el.toString());
			    if ( type ) {
				elType = type;
				return true;
			    }
			    break;
			default:
			    break;
			}
		    }, this);
		    
		    if( _.isNull(elType)) {
			throw new error.TypeUnknowError(node, "Array element's type unknow");
		    } else {
			self.resolveIdentifierType(id, elType+'[]');
			
			_.each(node.elements, function(el) {
			    switch( el.type ) {
			    case 'Literal':
				if (cTypeOfValue(el.value) !== elType) {
				    throw new error.BadNodeFormatError(node,
								       "Different element type in one Array: "
									+ cTypeOfValue(el.value) + " vs. "
									+ elType);
				}
			    case 'Identifier':
				self.resolveIdentifierType(el.name, elType);
				break;
			    case 'CallExpression':
				self.resolveIdentifierType(utils.getFuncName(el), elType);
				break;
			    default:
				// utils.output("Notice: Element type " + el.type + " in array.");
				break;
			    }
			}, this);
		    }
		    
		}
	    };

	    if(types[node.type]) {
		types[node.type](id, node);
	    } else {	
		//utils.debug("Can't inferer type of " + id + " by init it with " + node.type);
		throw new error.TypeUnknowError(node, "type unknow for <" + id + ">, with ast node type: " + node.type);
	    }
	},

	markIdentifierTypeAsUnknow: function(identifier) {
	    // utils.debug("Mark " + identifier + "'s type as unknow");
	    
	    if (_.isString(this.knowTypes[identifier])) {
		// utils.debug(">>>> type of " + identifier + " is " + knowTypes[identifier] + " but be marked as unknow again");
		return;
	    }

	    this.knowTypes[identifier] = null;
	    
	    if(!_.any(this.typeGroups, function(group) {
		return _.contains(group, identifier);
	    })) {
		// utils.debug("typeGroups' type: " + typeof typeGroups + " = " + JSON.stringify(typeGroups));
		this.typeGroups.push([identifier]);
	    }
	},

	
	markTwoIdentifiersAsSameType: function(id1, id2) {
	    // utils.debug("Mark type of " + id1 + " and " + id2 + " have same type");
	    if (this.knowTypes[id1] === 'void') this.knowTypes[id1] = null;
	    if (this.knowTypes[id2] === 'void') this.knowTypes[id2] = null;
	    
	    if (_.isString(this.knowTypes[id1]) && _.isString(this.knowTypes[id2]) && this.knowTypes[id1] != this.knowTypes[id2]) {
		utils.error("Conflict type, try to mark two identifier to same type: " + id1 +
			    "(type:" + this.knowTypes[id1] + ") vs. " + id2 + "(type:" + this.knowTypes[id2] + ")");
		return;
	    }

	    if (_.isString(this.knowTypes[id1])) {
		this.resolveIdentifierType(id2, this.knowTypes[id1]);
		return;
	    }

	    if (_.isString(this.knowTypes[id2])) {
		this.resolveIdentifierType(id1, this.knowTypes[id2]);
		return;
	    }
	    
	    var containp = function(group) {
		return _.contains(group, id1) || _.contains(group, id2);
	    };

	    var matchGroups = _.flatten(_.filter(this.typeGroups, containp));
	    if(matchGroups) {
		this.typeGroups = _.reject(this.typeGroups, containp);
		this.typeGroups.push(_.union([id1, id2], matchGroups));
	    } else {
		this.typeGroups = _.reject(this.typeGroups, containp).push([id1, id2]);
	    }
	},

	
	resolveIdentifierType: function(identifier, type) {
	    utils.debug("Interferer type of " + identifier + " as " + type);
	    
	    if (_.isString(this.knowTypes[identifier]) && this.knowTypes[identifier] !== 'void') {
		// no variable has type void
		// it's initial type of function, set at entry of function definition
		// a later return statement can change its type

		if (this.knowTypes[identifier] !== type) {
		    // utils.error(">>>> type for " + identifier + " conflict: '" + this.knowTypes[identifier] + "' vs. '" + type + "'");
		    // TODO
		}
		return;
	    }

	    this.knowTypes[identifier] = type;

	    var group = _.find(this.typeGroups, function(elm) {
		return _.contains(elm, identifier);
	    });
	    
	    if(group) {
		_.each(group, function(id) {
		    this.knowTypes[id] = type;
		}, this);
		// don't delete them, for void will change to others later
		// typeGroups = _.reject(typeGroups, function(group) {
		//     return _.contains(group, identifier);
		// });
	    }
	},

	// funcDef: { "returnType": "int", "paramTypes": [ "int", ..."] }
	resolveIdentifierTypeToFunction: function(id, funcDef) {
	    this.resolveIdentifierType(id, funcDef.returnType);
	    _.each(funcDef.paramTypes, function(t, i) {
		this.resolveIdentifierType(utils.getFuncParamID(id, i), funcDef.paramTypes[i]); // TODO: another function pointer
	    }, this);
	},

	// parse include file
	learnFromFuncDefs: function() {
	    _.each(this.funcDefs, function(funcInfo, key) {
		this.resolveIdentifierType(key, funcInfo.returnType);
		if (_.isArray(funcInfo.paramTypes)) {
		    _.each(funcInfo.paramTypes, function(ptype, idx) {
			this.resolveIdentifierType(utils.getFuncParamID(key, idx), ptype);
		    }, this);
		}
	    }, this);
	},

	
	walkFn: function(node) {
	    var handlers = {
		// Identifier: function(node) {
		// 	markIdentifierTypeAsUnknow(node.name);
		// },

		// [var] a = ...;
		VariableDeclarator: function(node) {
		    //utils.debug("*****: " + JSON.stringify(typeGroups));
		    if(_.isNull(node.init)) {
			this.markIdentifierTypeAsUnknow(node.id.name);
			return;
		    }

		    this.inferTypeByExpr(node.id.name, node.init);
		},
		
		// x = ...
		AssignmentExpression: function(node) {
		    if (node.left.type != 'Identifier') {
			utils.debug("! left type of assignment is: " + node.left.type);
			return;
		    }

		    this.inferTypeByExpr(node.left.name, node.right);
		},

		// return ...
		ReturnStatement: function(node) {
		    var arg = node.argument;

		    var funcName = utils.getFunctionOfReturn(node);
		    if (_.isNull(funcName)) {
			return;
		    }

		    if (_.isNull(arg)) {
			this.resolveIdentifierType(funcName, "void");
		    } else {
			this.inferTypeByExpr(funcName, arg);
		    }
		},

		// function() {...}
		FunctionExpression: function(node) {
		    this.resolveIdentifierType(utils.lambdaNameOf(node), "void");
		},

		// xx(p1, p2, p3...)
		CallExpression: function(node) {
		    if (!_.isArray(node.arguments) || node.arguments.length === 0) {
			return;
		    }
		    
		    var fName = utils.getFuncName(node);
		    if (_.isObject(this.funcDefs[fName])) {
			// calling an external function
			var ps = this.funcDefs[fName].paramTypes;
			_.each(node.arguments, function(arg, idx) {
			    // utils.output("External function's argument: " + fName + "[" + idx + "] " + ps[idx]);
			    if(_.isString(ps[idx])) {
				switch(arg.type) {
				case "Identifier":
				    this.resolveIdentifierType(arg.name, ps[idx]);
				    break;
				case 'FunctionExpression':
				    this.resolveIdentifierType(utils.lambdaNameOf(arg, ps[idx]));
				    break;
				case 'CallExpression':
				    this.resolveIdentifierType(arg.callee.name, ps[idx]);							       
				    break;
				default:
				    utils.debug("Can't assign type to node type <" + arg.type + ">");
				    break;
				}
			    } else {
				if(_.isObject(ps[idx])) {
				    // it's a function
				    switch(arg.type) {
				    case "Identifier":
					this.resolveIdentifierTypeToFunction(arg.name, ps[idx]);
					break;
				    case "FunctionExpression":
					this.resolveIdentifierTypeToFunction(utils.getFuncName(arg), ps[idx]);
					break;
				    default:
					break;
				    }
				} else {
				    throw new error.IncludeFileError("Bad param definition("+fName+"): " + JSON.stringify(ps) + " idx: " + idx);
				}
			    }
			}, this);
		    } else {
			_.each(node.arguments, function(arg, idx) {
			    this.inferTypeByExpr(utils.getFuncParamID(fName, idx), arg);
			}, this);
		    }
		},

		FunctionDeclaration: function(node) {
		    this.resolveIdentifierType(utils.getFuncName(node), 'void');
		    
		    if (!_.isArray(node.params)) return;

		    _.each(node.params, function(param, idx) {
			var pID = utils.getFuncParamID(utils.getFuncName(node), idx);
			this.markTwoIdentifiersAsSameType(param.name, pID);
			if (node.defaults[idx]) {
			    this.inferTypeByExpr(pID, node.defaults[idx]);
			}
		    }, this);
		},

		// !!! strict here
		BinaryExpression: function(node) {
		    utils.output("2: " + node.toString());
		    if( node.left.type === 'Identifier') {
			this.inferTypeByExpr(node.left.name, node.right);
			return;
		    }

		    if( node.right.type === 'Identifier') {
			this.inferTypeByExpr(node,right.name, node.left);
			return;
		    }
		}

	    };
	

	    if (_.isFunction(handlers[node.type])) {
		handlers[node.type].call(this, node);
	    } 
	},

	get types() {
	    return this.knowTypes;
	},

	run: function() {
	    this.learnFromFuncDefs();
	    
	    renameVarInDifferentScope(this.ast);
	    
	    rocambole.walk(this.ast, this.walkFn.bind(this));

	    return this.ast;
	},

    };				// TypeRef


    module.exports = function() {
	return TypeRef;
    };
    
})();
