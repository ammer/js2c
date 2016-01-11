describe("VarTypeInferer", function() {
    var inferor,
	utils = require('../lib/utils.js');

    beforeEach(function() {
	inferor = require('../lib/typeinfer.js')();
    });

    it("Inferer type of variables", function() {
	var funcDefs = utils.include('./spec/fixtures/test.include.js'),
	    ast = utils.astFromJsFile('./spec/fixtures/var.js'),
	    newAst = inferor.run(ast, funcDefs),
	    types = inferor.getTypes();

	expect(types.a).toEqual("int");
    });

    it("Get function's return type correctly", function() {
	var ast = utils.astFromJsFile('./spec/fixtures/function.js'),
	    funcDefs = utils.include('./spec/fixtures/test.include.js'),
	    newAst = inferor.run(ast, funcDefs),
	    types = inferor.getTypes();

	utils.output("Types: " + JSON.stringify(types));
	
	expect(types.a).toEqual("int");
	expect(types.b).toEqual("char *");
	expect(types.c).toEqual("int");
	expect(types.d).toEqual("char *");
	expect(types.func_294_313).toEqual("void");
	expect(types.func_319_331).toEqual("void");

	expect(types['f1[0]']).toEqual("int");
	expect(types['f1[1]']).toEqual("char *");
	expect(types['f1']).toEqual("int");

    });

    it("Rename variable name in different scope", function() {
	var ast = utils.astFromJsFile('./spec/fixtures/varScope.js'),
	    funcDefs = utils.include('./spec/fixtures/test.include.js'),
	    newAst = inferor.run(ast, funcDefs),
	    types = inferor.getTypes();
	
	// utils.output("Types: " + JSON.stringify(types));
	
    });
    
});
