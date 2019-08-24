require("./setup");
const deploy = require("../index.js");

contract("App", ([_, owner, donor, wallet]) => {
  const initialVersion = "2.5.2";
  const contractName = deploy.CONTRACT_NAMES.BancorCurveService;

  let project;
  let projectPackage;
  let directory;

  describe("setup", function() {
    beforeEach("deploying project", async function() {
      project = await deploy.setupApp({ owner });
    });

    describe("package", function() {
      beforeEach("loading package", async function() {
        projectPackage = await project.getProjectPackage();
      });

      describe("when queried for the initial version", function() {
        it("claims to have it", async function() {
          (await projectPackage.hasVersion(initialVersion)).should.be.true;
        });
      });
    });
  });

  describe("initial version", function() {
    beforeEach(async function() {
      project = await deploy.setupApp({ owner });
      directory = await project.getCurrentDirectory();
      this.bondingCurveService = await deploy.deployBancorCurveService(project);
    });

    describe("directory", function() {
      describe("when queried for the implementation", function() {
        it("returns a valid address", async function() {
          const implementation = await directory.getImplementation(
            contractName
          );
          implementation.should.be.nonzeroAddress;
        });
      });
    });
  });
});
