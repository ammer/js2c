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
});
