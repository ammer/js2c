// refs:
//   http://piuccio.github.io/rocambole-visualize/

(function typeInfer() {
    var _ = require('underscore'),
	rocambole = require('rocambole');

    var utils = require('./utils.js');

    
    var knowTypes = {};
    var typeGroups = [];

    var funcDefs = {};

    function cTypeOfValue(v) {
	switch(typeof v) {
	case 'string':
	    return "char *";
	case 'number':
	    return "int";		// TODO: float?
	default:
	    return "unknowType";
	}
    }

    function inferTypeByExpr(id, node) {
	if (node.type == 'Identifier') {
	    markTwoIdentifiersAsSameType(id, node.name);
	    return;
	}

	if (node.type == 'Literal') {
	    resolveIdentifierType(id, cTypeOfValue(node.value));
	    return;
	}

	// x = function(..) {...};
	if (node.type == 'FunctionExpression') {
	    markTwoIdentifiersAsSameType(id, utils.lambdaNameOf(node));
	    return;
	}
	
	if (node.type == 'CallExpression') {
	    var callee = node.callee;
	    if (callee.type == 'Identifier') {
		markTwoIdentifiersAsSameType(callee.name, id);
		return;
	    }
	    if (callee.type == 'FunctionExpression') {
		markTwoIdentifiersAsSameType(id, utils.lambdaNameOf(callee));
		return;
	    }
	}
	
	utils.debug("Can't inferer type of " + id + " by init it with " + node.type);
    }

    function getMyFunction(state) {
	var interestp = function(item) { return (item === "FunctionDeclaration" || item === "FunctionExpression"); };
	
	var parent = state.parent;
	while (parent && !interestp(parent.type)) {
	    parent = parent.parent;
	}

	if (parent === null) {
	    utils.error( "Statement doesn't located in a function, line: " + JSON.stringify(state.range));
	    return null;
	}

	return parent;
    }

    function getFunctionOfReturn(returnState) {
	var func = getMyFunction(returnState);
	if (func) return utils.getFuncName(func);
	return null;
    }

    function markIdentifierTypeAsUnknow(identifier) {
	// utils.debug("Mark " + identifier + "'s type as unknow");
	
	if (_.isString(knowTypes[identifier])) {
	    // utils.debug(">>>> type of " + identifier + " is " + knowTypes[identifier] + " but be marked as unknow again");
	    return;
	}

	knowTypes[identifier] = null;
	
	if(!_.any(typeGroups, function(group) {
	    return _.contains(group, identifier);
	})) {
	    // utils.debug("typeGroups' type: " + typeof typeGroups + " = " + JSON.stringify(typeGroups));
	    typeGroups.push([identifier]);
	}
    }

    function markTwoIdentifiersAsSameType(id1, id2) {
	// utils.debug("Mark type of " + id1 + " and " + id2 + " have same type");
	if (knowTypes[id1] === 'void') knowTypes[id1] = null;
	if (knowTypes[id2] === 'void') knowTypes[id2] = null;
	
	if (_.isString(knowTypes[id1]) && _.isString(knowTypes[id2]) && knowTypes[id1] != knowTypes[id2]) {
	    utils.error("Conflict type, try to mark two identifier to same type: " + id1 + "(type:" + knowTypes[id1] + ") vs. " + id2 + "(type:" + knowTypes[id2] + ")");
	    return;
	}

	if (_.isString(knowTypes[id1])) {
	    resolveIdentifierType(id2, knowTypes[id1]);
	    return;
	}

	if (_.isString(knowTypes[id2])) {
	    resolveIdentifierType(id1, knowTypes[id2]);
	    return;
	}
	
	var containp = function(group) {
	    return _.contains(group, id1) || _.contains(group, id2);
	};

	var matchGroups = _.flatten(_.filter(typeGroups, containp));
	if(matchGroups) {
	    typeGroups = _.reject(typeGroups, containp);
	    typeGroups.push(_.union([id1, id2], matchGroups));
	} else {
	    typeGroups = _.reject(typeGroups, containp).push([id1, id2]);
	}
    }

    function resolveIdentifierType(identifier, type) {
	utils.debug("Interferer type of " + identifier + " as " + type);
	
	if (_.isString(knowTypes[identifier]) && knowTypes[identifier] !== 'void') {
	    // no variable has type void
	    // it's initial type of function, set at entry of function definition
	    // a later return statement can change its type

	    if (knowTypes[identifier] !== type) {
		utils.error(">>>> type for " + identifier + " conflict: '" + knowTypes[identifier] + "' vs. '" + type + "'");
	    }
	    return;
	}

	knowTypes[identifier] = type;

	var group = _.find(typeGroups, function(elm) {
	    return _.contains(elm, identifier);
	});
	
	if(group) {
	    _.each(group, function(id) {
		knowTypes[id] = type;
	    });
	    // don't delete them, for void will change to others later
	    // typeGroups = _.reject(typeGroups, function(group) {
	    //     return _.contains(group, identifier);
	    // });
	}
    }

    function learnFromFuncDefs() {
	_.each(funcDefs, function(funcInfo, key) {
	    resolveIdentifierType(key, funcInfo.returnType);
	    if (_.isArray(funcInfo.paramTypes)) {
		_.each(funcInfo.paramTypes, function(ptype, idx) {
		    resolveIdentifierType(utils.getFuncParamID(key, idx), ptype);
		});
	    }
	});
    }

    var handlers = {
	// Identifier: function(node) {
	// 	markIdentifierTypeAsUnknow(node.name);
	// },

	// [var] a = ...;
	VariableDeclarator: function(node) {
	    //utils.debug("*****: " + JSON.stringify(typeGroups));
	    if(_.isNull(node.init)) {
		markIdentifierTypeAsUnknow(node.id.name);
		return;
	    }

	    inferTypeByExpr(node.id.name, node.init);
	},
	
	// x = ...
	AssignmentExpression: function(node) {
	    if (node.left.type != 'Identifier') {
		utils.debug("! left type of assignment is: " + node.left.type);
		return;
	    }

	    inferTypeByExpr(node.left.name, node.right);
	},

	// return ...
	ReturnStatement: function(node) {
	    var arg = node.argument;

	    var funcName = getFunctionOfReturn(node);
	    if (_.isNull(funcName)) {
		return;
	    }

	    if (_.isNull(arg)) {
		resolveIdentifierType(funcName, "void");
	    } else {
		inferTypeByExpr(funcName, arg);
	    }
	},

	// function() {...}
	FunctionExpression: function(node) {
	    resolveIdentifierType(utils.lambdaNameOf(node), "void");
	},

	// xx(p1, p2, p3...)
	CallExpression: function(node) {
	    if (!_.isArray(node.arguments) || node.arguments.length === 0) {
		return;
	    }
	    
	    var fName = utils.getFuncName(node);
	    _.each(node.arguments, function(arg, idx) {
		inferTypeByExpr(utils.getFuncParamID(fName, idx), arg);
	    });
	},

	FunctionDeclaration: function(node) {
	    resolveIdentifierType(utils.getFuncName(node), 'void');
	    
	    if (!_.isArray(node.params)) return;

	    _.each(node.params, function(param, idx) {
		var pID = utils.getFuncParamID(utils.getFuncName(node), idx);
		markTwoIdentifiersAsSameType(param.name, pID);
		if (node.defaults[idx]) {
		    inferTypeByExpr(pID, node.defaults[idx]);
		}
	    });
	}
    };

    function getTypes() {
	utils.debug("### in getTypes: " + JSON.stringify(knowTypes));
	return knowTypes;
    }

    function walkFn(node) {
	if (_.isFunction(handlers[node.type])) {
	    handlers[node.type](node);
	}
    }

    function reset() {
	knowTypes = {};
	typeGroups = [];
	funcDefs = {};
    }


    function renameVarInDifferentScope(ast) {
	var renameAllVarUnderNode = function(node, oldName, newName) {
	    rocambole.walk(node, function(subnode) {
		if (subnode.type === 'Identifier' && subnode.name === oldName) subnode.name = newName;
	    });
	};
	
	var findVarDeclareWalkFn = function(node) {
	    switch(node.type) {
	    case 'VariableDeclarator':
		var func = getMyFunction(node);
		if (!_.isObject(func)) return;
		renameAllVarUnderNode(func, node.id.name, node.id.name+"_at_"+utils.getFuncName(func));
		break;
	    case 'FunctionDeclaration':
	    case 'FunctionExpression':
		_.each(node.params, function(param, idx) {
		    renameAllVarUnderNode(node.body, param.name, utils.getFuncName(node)+"_p"+idx);
		});
		break;
	    }
	};

	rocambole.moonwalk(ast, findVarDeclareWalkFn);
    }

    function run(ast, funcProtos) {
	reset();
	
	funcDefs = funcProtos;
	learnFromFuncDefs();

	renameVarInDifferentScope(ast);
	
	utils.debug("After parse include file, types: " + JSON.stringify(knowTypes));
	
	rocambole.walk(ast, walkFn);
	
	utils.debug("After infer, types: " + JSON.stringify(knowTypes));
	return ast;
    }

    module.exports = function() {
	return {
	    run: run,
	    getTypes: getTypes
	};
    };
})();
