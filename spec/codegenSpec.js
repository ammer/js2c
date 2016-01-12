describe("CCodegen", function() {
    var TypeRef = require('../lib/typeinfer.js')(),
	utils = require('../lib/utils.js'),
	_ = require('underscore'),
	error = require('../lib/errors.js'),
	ccodegem = require('../lib/ccodegen.js')();

    beforeEach(function() {
	
    });

    var jsstr2c = function(str) {
	var ast = utils.astFromString(str),
	    funcDefs = utils.include('./spec/fixtures/test.include.js'),
	    infer = new TypeRef(ast, funcDefs),	    
	    newAst = infer.run(),
	    gem = ccodegem(newAst, 'entry', infer.types),
	    rst = gem.generate();
	return rst;
    };

    var check = function(pairs) {
	_.each(pairs, function(v) {
	    expect(jsstr2c(v.js)).toMatch(v.c);
	});
    };
    
    describe("CCodeGen", function() {

	it("Simple statements", function() {
	    var pairs = [
		{
		    js: "var a = 'hello';",
		    c: /\s*void\s*entry\s*(.*)\s*{\s*char\s*\*\s*a\s*=\s*"hello"\s*;\s*}\s*/
		}
	    ];
	    check(pairs);
	});

	it("Function call", function() {
	    
	});

	it("Define function", function() {
	    
	});

	it("If statement", function() {
	    
	});

	it("Call back function", function() {
	    
	});
    });
});
