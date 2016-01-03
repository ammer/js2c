describe("VarTypeInferer", function() {
    var inferor,
	utils = require('../lib/utils.js');

    beforeEach(function() {
	inferor = require('../lib/inferpass.js')();
    });

    it("Inferer type of variables", function() {
	var funcDefs = utils.include('./spec/fixtures/var.include.js');
	var ast = utils.astFromJsFile('./spec/fixtures/var.js');
	var newAst = inferor.run(ast, funcDefs);
	var types = inferor.getTypes();

	expect(types.a).toEqual("int");
    });

    it("Get function's return type correctly", function() {
	var ast = utils.astFromJsFile('./spec/fixtures/function.js');
	var newAst = inferor.run(ast);
	var types = inferor.getTypes();

	expect(types.a).toEqual("int");
	expect(types.b).toEqual("char *");
	expect(types.c).toEqual("int");
	expect(types.d).toEqual("char *");
    });
});
