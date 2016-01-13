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
    
    it("Simple statements", function() {
	var pairs = [
	    {
		js: "var a = 'hello';",
		c: /\s*static\s*char\s*\*\s*a\s*;\s*void\s*entry\s*(.*)\s*{\s*a\s*=\s*"hello"\s*;\s*}\s*/
	    }
	];
	check(pairs);
    });

    describe("function call", function(){
	it("call external with callback param", function() {
	    check(
		[
		    {
			js: [
			    'httpGet("http://localhost/index.html",',
			    'function(data) {return "hello";},',
			    'function(error) {return 1;});'].join("\n"),
			c: / /
		    }
		]
	    );
	}),

	it("call external with callback param - named function-express", function() {
	    check([
		{
		    js: [
			'httpGet("http://localhost/index.html",',
			'function success(data) {return "hello";},',
			'function fail(error) {return 1;});'].join("\n"),
		    c: / /
		}
	    ]);
	});

	it("call lambda function", function() {
	    check([
		{
		    js: '(function(a) { return a*10; })(10);',
		    c: / /
		},
		{
		    js: '(function multiByTen(a) { return a*10; })(10);',
		    c: / /
		}
	    ]);
	});
    });

    describe("define functions", function() {
	it("void function", function() {
	    check([
		{
		    js: 'function x1() {}',
		    c: /\s*static\s*void\s*x1\s*(.*)\s*{\s*}\s*void\s*entry\s*(.*)\s*{\s*}\s*/
		}
	    ]);
	});
	
	it("call self-defined function", function() {
	    check([
		{
		    js: 'function a(){return 10;}\n  a();',
		    c: / /
		},
		{
		    js: 'var a = function(){return 11;};\n  (function(){a();})();',
		    c: / /
		}
	    ]);
	});
    });
    
    it("If statement", function() {
	
    });

    it("Call back function", function() {
	
    });

});
