// refs:
//   http://piuccio.github.io/rocambole-visualize/

var _ = require('underscore');
var rocambole = require('rocambole');

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
	markTwoIdentifiersAsSameType(id, lambdaNameOf(node));
	return;
    }
    
    if (node.type == 'CallExpression') {
	var callee = node.callee;
	if (callee.type == 'Identifier') {
	    markTwoIdentifiersAsSameType(callee.name, id);
	    return;
	}
	if (callee.type == 'FunctionExpression') {
	    markTwoIdentifiersAsSameType(id, lambdaNameOf(callee));
	    return;
	}
    }
    
    console.log("Can't inferer type of " + id + " by init it with " + node.type);
}

function lambdaNameOf(funcNode) {
    return "func_" + funcNode.range[0] + "_" + funcNode.range[1];
}

function getFunctionOfReturn(returnState) {
    var interestp = function(item) { return (item == "FunctionDeclaration" || item == "FunctionExpression"); };
    
    var parent = returnState.parent;
    while (parent != null && !interestp(parent.type)) {
	parent = parent.parent;
    }

    if (parent == null) {
	console.log( "Return doesn't in a function, line: " + JSON.stringify(returnState.range));
	return null;
    }

    if( parent.type == "FunctionDeclaration" ) {
	return parent.id.name;
    } else {
	return lambdaNameOf(parent);
    }
}

function markIdentifierTypeAsUnknow(identifier) {
    console.log("Mark " + identifier + "'s type as unknow");
    
    if (_.isString(knowTypes[identifier])) {
	console.log(">>>> type of " + identifier + " is " + knowTypes[identifier] + " but be marked as unknow again");
	return;
    }

    knowTypes[identifier] = null;
    
    if(!_.any(typeGroups, function(group) {
	return _.contains(group, identifier);
    })) {
	console.log("typeGroups' type: " + typeof typeGroups + " = " + JSON.stringify(typeGroups));
	typeGroups.push([identifier]);
    }
}

function markTwoIdentifiersAsSameType(id1, id2) {
    console.log("Mark type of " + id1 + " and " + id2 + " have same type");

    if (_.isString(knowTypes[id1]) && _.isString(knowTypes[id2]) && knowTypes[id1] != knowTypes[id2]) {
	console.log("Conflict type, try to mark two identifier to same type: " + id1 + "(type:" + knowTypes[id1] + ") vs. " + id2 + "(type:" + knowType[id2] + ")");
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
    console.log("Interferer type of " + identifier + " as " + type);
    
    if(knowTypes[identifier] != undefined && knowTypes[identifier] != null) {
	if(knowTypes[identifier] != type) {
	    console.log(">>>> type for " + identifier + " conflict: " + knowTypes[identifier] + " vs. " + type);
	    return;
	}
    }

    knowTypes[identifier] = type;

    var group = _.find(typeGroups, function(elm) {
	return _.contains(elm, identifier);
    });
    if(group) {
	_.each(group, function(id) {
	    knowTypes[id] = type;
	});
	typeGroups = _.reject(typeGroups, function(group) {
	    return _.contains(group, identifier);
	});
    }
}

function learnFromFuncDefs() {
    _.each(funcDefs, function(funcInfo, key) {
	resolveIdentifierType(key, funcInfo.returnType);
    });
}

var handlers = {
    // Identifier: function(node) {
    // 	markIdentifierTypeAsUnknow(node.name);
    // },

    // [var] a = ...;
    VariableDeclarator: function(node) {
	//console.log("*****: " + JSON.stringify(typeGroups));
	if(node.init == null) {
	    markIdentifierTypeAsUnknow(node.id.name);
	    return;
	}

	inferTypeByExpr(node.id.name, node.init);
    },
    
    // x = ...
    AssignmentExpression: function(node) {
	if (node.left.type != 'Identifier') {
	    console.log("! left type of assignment is: " + node.left.type);
	    return;
	}

	inferTypeByExpr(node.left.name, node.right);
    },

    // return ...
    ReturnStatement: function(node) {
	var arg = node.argument;

	var funcName = getFunctionOfReturn(node);
	if (funcName == null) {
	    return;
	}

	inferTypeByExpr(funcName, arg);
    }
};

function getTypes() {
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

function run(ast, funcProtos) {
    reset();
    
    funcDefs = funcProtos;
    learnFromFuncDefs();

    rocambole.walk(ast, walkFn);
    
    console.log("Types: " + JSON.stringify(knowTypes));
    return ast;
}

module.exports = function() {
    return {
	run: run,
	getTypes: getTypes
    };
};
