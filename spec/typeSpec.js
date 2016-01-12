describe("VarTypeInferer", function() {
    var TypeRef = require('../lib/typeinfer.js')(),
	utils = require('../lib/utils.js'),
	funcDefs = utils.include('./spec/fixtures/test.include.js');

    beforeEach(function() {
    });

    it("Inferer type of variables", function() {
	var ast = utils.astFromJsFile('./spec/fixtures/var.js'),
	    inferor = new TypeRef(ast, funcDefs),
	    newAst = inferor.run(),
	    types = inferor.types;

	// utils.output("Types1: " + JSON.stringify(types));
	
	expect(types.a).toEqual("int");
    });

    it("Get function's return type correctly", function() {
	var ast = utils.astFromJsFile('./spec/fixtures/function.js'),
	    inferor = new TypeRef(ast, funcDefs),
	    newAst = inferor.run(),
	    types = inferor.types;

	// utils.output("Types2: " + JSON.stringify(types));
	
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
	    inferor = new TypeRef(ast, funcDefs),
	    newAst = inferor.run(),
	    types = inferor.types;
	
	// utils.output("Types: " + JSON.stringify(types));
	
    });

    
    
});
