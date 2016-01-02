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
	return "float";
    default:
	return "unknowType";
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
    CallExpression: function(node) {
    },

    Identifier: function(node) {
	markIdentifierTypeAsUnknow(node.name);
    },

    // function() {...}
    FunctionExpression: function(node) {
    },

    // function a() {...}
    FunctionDeclaration: function(node) {
    },

    // [var] a = 1;
    VariableDeclarator: function(node) {
	console.log("*****: " + JSON.stringify(typeGroups));
	if(node.init == null) {
	    markIdentifierTypeAsUnknow(node.id.name);
	    return;
	}

	switch(node.init.type) {
	case 'Literal':
	    if (_.isString(node.init.value)) {
		resolveIdentifierType(node.id.name, "char *");
		return;
	    }

	    if (_.isNumber(node.init.value)) {
		resolveIdentifierType(node.id.name, "int");
		return;
	    }
	    break;
	case 'Identifier':
	    markTwoIdentifiersAsSameType(node.init.name, node.id.name);
	    return;
	case 'CallExpression':
	    var callee = node.init.callee;
	    if (callee.type == 'Identifier') {
		markTwoIdentifiersAsSameType(callee.name, node.id.name);
	    }
	    // TODO
	default:
	    console.log("Can't inferer type of " + node.id.name + " by init it with " + node.init.type);
	}
    },

    AssignmentExpression: function(node) {
	console.log("*****: " + JSON.stringify(typeGroups));
	if (node.left.type != 'Identifier') {
	    console.log("! left type of assignment is: " + node.left.type);
	    return;
	}

	if (node.right.type == 'Identifier') {
	    markTwoIdentifiersAsSameType(node.left.name, node.right.name);
	    return;
	}

	if (node.right.type == 'Literal') {
	    resolveIdentifierType(node.left.name, cTypeOfValue(node.right.value));
	    return;
	}

	if (node.right.type == 'CallExpression') {
	    var callee = node.right.callee;
	    if (callee.type == 'Identifier') {
		markTwoIdentifiersAsSameType(callee.name, node.left.name);
	    }
	}
	
	console.log("Assignment: right is type of " + node.right.type);
	return;
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

function run(ast, funcProtos) {
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
