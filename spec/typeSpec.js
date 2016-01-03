describe("VarTypeInferer", function() {
    var inferor,
	utils = require('../lib/utils.js');

    beforeEach(function() {
	inferor = require('../lib/inferpass.js')();
    });

    it("Inferer type of variables", function() {
	var funcDefs = utils.include('./spec/fixtures/test.include.js');
	var ast = utils.astFromJsFile('./spec/fixtures/var.js');
	var newAst = inferor.run(ast, funcDefs);
	var types = inferor.getTypes();

	expect(types.a).toEqual("int");
    });

    it("Get function's return type correctly", function() {
	var ast = utils.astFromJsFile('./spec/fixtures/function.js');
	var funcDefs = utils.include('./spec/fixtures/test.include.js');
	var newAst = inferor.run(ast, funcDefs);
	var types = inferor.getTypes();

	utils.output("Types: " + JSON.stringify(types));
	
	expect(types.a).toEqual("int");
	expect(types.b).toEqual("char *");
	expect(types.c).toEqual("int");
	expect(types.d).toEqual("char *");
	expect(types.func_294_313).toEqual("void");
	expect(types.func_319_331).toEqual("void");
    });
});
