pragma solidity ^0.5.4;

import "@daostack/arc/contracts/universalSchemes/UniversalScheme.sol";
import "@daostack/arc/contracts/votingMachines/VotingMachineCallbacks.sol";
import "@daostack/infra/contracts/votingMachines/ProposalExecuteInterface.sol";
import "../BondingCurve/factory/BondingCurveFactory.sol";

contract BondingCurveAdminScheme is UniversalScheme, VotingMachineCallbacks, ProposalExecuteInterface {

  // TODO: Should there be a base class for all BondingCurveAdminSchemes?
  //       This one is specific to EthTestBondingCurvedToken.
  //       A base class could have some cursory details like name of the bonding curve implementation.

  /// Deploy Events

  event CurveDeployed(
    address indexed _avatar,
    address indexed _bondingCurve,
    address indexed _beneficiary,
    address dividendToken
  );

  event NewDeployProposal(
    address indexed _avatar,
    bytes32 indexed _proposalId,
    address indexed _intVoteInterface,
    string _name,
    string _symbol,
    address _beneficiary,
    bytes32 _curveParams
  );

  event DeployProposalExecuted(
    address indexed _avatar,
    bytes32 indexed _proposalId,
    int256 _param
  );

  event DeployProposalDeleted(
    address indexed _avatar,
    bytes32 indexed _proposalId
  );

  /// Change Beneficiary Events

  event BeneficiaryChanged(
    address indexed _avatar,
    address indexed _bondingCurve,
    address indexed _beneficiary
  );

  event NewChangeBeneficiaryProposal(
    address indexed _avatar,
    bytes32 indexed _proposalId,
    address indexed _bondingCurve,
    address _oldBeneficiary,
    address _newBeneficiary
  );

  event ChangeBeneficiaryProposalExecuted(
    address indexed _avatar,
    address indexed _bondingCurve,
    bytes32 indexed _proposalId,
    int256 _param
  );

  event ChangeBeneficiaryProposalDeleted(
    address indexed _avatar,
    address indexed _bondingCurve,
    bytes32 indexed _proposalId
  );

  // Proposal Types
  bytes1 internal DEPLOY_PROPOSAL           = 0x01;
  bytes1 internal CHANGE_BENEFICIARY_PROPOSAL = 0x02;

  // A mapping from proposalId to the proposal type
  mapping(bytes32=>bytes1) proposalTypes;

  // Deploy Proposal Storage Data
  struct DeployProposal {
    string name;
    string symbol;
    address payable beneficiary;
    bytes32 curveParams;
  }

  // A mapping from the organization (Avatar) address to proposalId to proposal data
  mapping(address=>mapping(bytes32=>DeployProposal)) public deployProposals;

  // Change Beneficiary Proposal Storage Data
  struct ChangeBeneficiaryProposal {
    BondingCurve curve;
    address payable newBeneficiary;
  }

  // A mapping from the organization (Avatar) address to proposalId to proposal data
  mapping(address=>mapping(bytes32=>ChangeBeneficiaryProposal)) public changeBeneficiaryProposals;

  // Curve configuration parameters
  struct CurveParameters {
    uint256 buySlope;
    uint256 sellSlope;
    uint256 buyIntercept;
    uint256 sellIntercept;
    ERC20 reserveToken;
    uint dividendRatio;
  }

  // A mapping from hashes to curve configuration parameters
  mapping(bytes32=>CurveParameters) public curveParameters;

  // Voting Machine configuration parameter hashes
  struct Parameters {
    bytes32 voteDeployParams;
    bytes32 voteChangeBeneficiaryParams;
    IntVoteInterface intVote;
  }

  // A mapping from hashes to parameters (use to store a particular configuration on the controller)
  mapping(bytes32=>Parameters) public parameters;

  /**
  * @dev execution of proposals, can only be called by the voting machine in which the vote is held.
  * @param _proposalId the ID of the voting in the voting machine
  * @param _param a parameter of the voting result, 1 yes and 2 is no.
  * @return if it succeeds
  */
  function executeProposal(bytes32 _proposalId, int256 _param)
  external
  onlyVotingMachine(_proposalId)
  returns(bool) {
    require(proposalTypes[_proposalId] == 0x00, "tried executing invalid proposal");

    if (proposalTypes[_proposalId] == DEPLOY_PROPOSAL) {
      return _executeDeploy(_proposalId, _param);
    } else if (proposalTypes[_proposalId] == CHANGE_BENEFICIARY_PROPOSAL) {
      return _executeChangeBeneficiary(_proposalId, _param);
    } else {
      revert("unimplemented proposal type");
    }
  }

  /**
  * @dev execution of the deploy proposal
  * @param _proposalId the ID of the voting in the voting machine
  * @param _param a parameter of the voting result, 1 yes and 2 is no.
  * @return if it succeeds
  */
  function _executeDeploy(bytes32 _proposalId, int256 _param)
  internal
  returns(bool) {
    Avatar avatar = proposalsInfo[msg.sender][_proposalId].avatar;
    DeployProposal memory proposal = deployProposals[address(avatar)][_proposalId];

    // Ensure the proposal struct has been initialized
    require(proposal.curveParams != bytes32(0), "tried executing uninitialized proposal");

    delete deployProposals[address(avatar)][_proposalId];
    emit DeployProposalDeleted(address(avatar), _proposalId);

    if (_param == 1) {
      CurveParameters memory curveParams = curveParameters[proposal.curveParams];
      BondingCurve bondingCurve;
      DividendToken dividendToken;
      ICurveLogic buyCurve;
      ICurveLogic sellCurve;

      (bondingCurve, dividendToken, buyCurve, sellCurve)=
      BondingCurveFactory.deploy(
        proposal.name,
        proposal.symbol,
        address(avatar),
        proposal.beneficiary,
        [curveParams.buySlope, curveParams.buyIntercept],
        [curveParams.sellSlope, curveParams.sellIntercept],
        curveParams.reserveToken,
        curveParams.dividendRatio
      );

      emit CurveDeployed(
        address(avatar),
        address(bondingCurve),
        proposal.beneficiary,
        address(dividendToken)
      );
    }

    emit DeployProposalExecuted(address(avatar), _proposalId, _param);
    return true;
  }

  /**
  * @dev execution of the change beneficiary proposal
  * @param _proposalId the ID of the voting in the voting machine
  * @param _param a parameter of the voting result, 1 yes and 2 is no.
  * @return if it succeeds
  */
  function _executeChangeBeneficiary(bytes32 _proposalId, int256 _param)
  internal
  returns(bool) {
    Avatar avatar = proposalsInfo[msg.sender][_proposalId].avatar;
    ChangeBeneficiaryProposal memory proposal = changeBeneficiaryProposals[address(avatar)][_proposalId];

    // Ensure the proposal struct has been initialized
    require(address(proposal.curve) != address(0), "tried executing uninitialized proposal");

    delete changeBeneficiaryProposals[address(avatar)][_proposalId];
    emit ChangeBeneficiaryProposalDeleted(address(avatar), address(proposal.curve), _proposalId);

    if (_param == 1) {
      ControllerInterface controller = ControllerInterface(avatar.owner());
      bytes memory genericCallReturnValue;
      bool success;

      (success, genericCallReturnValue) = controller.genericCall(
        address(proposal.curve),
        abi.encodeWithSignature(
          "setBeneficiary(address)",
          proposal.newBeneficiary
        ),
        avatar,
        0
      );

      if (success) {
        emit BeneficiaryChanged(
          address(avatar),
          address(proposal.curve),
          proposal.newBeneficiary
        );
      } else {
        revert("failed to generically call 'setBeneficiary(address)'");
      }
    }

    emit ChangeBeneficiaryProposalExecuted(address(avatar), address(proposal.curve), _proposalId, _param);
    return true;
  }

  /**
  * @dev create a proposal to deploy a curve
  * @param _avatar the avatar of the DAO we're creating this proposal for
  * @param _name name of the curve
  * @param _symbol symbol of the curve's token
  * @param _beneficiary beneficiary of the curve's funds
  * @param _curveParams hash of the parameters for the curve
  * @return a proposal Id
  */
  function proposeDeploy(
    Avatar _avatar,
    string memory _name,
    string memory _symbol,
    address payable _beneficiary,
    bytes32 _curveParams
  ) public returns(bytes32) {
    require(address(_avatar) != address(0), "avatar is zero");
    require(_beneficiary != address(0), "beneficiary is zero");
    require(_curveParams != bytes32(0), "curveParams is zero");
    require(curveParameters[_curveParams].dividendRatio > 0, "curve parameters haven't been set");

    Parameters memory controllerParams = parameters[getParametersFromController(_avatar)];

    bytes32 proposalId = controllerParams.intVote.propose(
      2,
      controllerParams.voteDeployParams,
      msg.sender,
      address(_avatar)
    );

    DeployProposal memory proposal = DeployProposal({
      name: _name,
      symbol: _symbol,
      beneficiary: _beneficiary,
      curveParams: _curveParams
    });

    emit NewDeployProposal(
      address(_avatar),
      proposalId,
      address(controllerParams.intVote),
      _name,
      _symbol,
      _beneficiary,
      _curveParams
    );

    deployProposals[address(_avatar)][proposalId] = proposal;
    proposalTypes[proposalId] = DEPLOY_PROPOSAL;
    proposalsInfo[address(controllerParams.intVote)][proposalId] = ProposalInfo({
      blockNumber: block.number,
      avatar: _avatar
    });

    return proposalId;
  }

  function proposeChangeBeneficiary(
    Avatar _avatar,
    BondingCurve _curve,
    address payable _newBeneficiary
  ) public returns (bytes32) {
    require(address(_avatar) != address(0), "avatar is zero");
    require(address(_curve) != address(0), "curve is zero");
    require(_newBeneficiary != address(0), "new beneficiary is zero");
    require(_curve.owner() == address(_avatar), "this avatar is not the owner of the curve");

    Parameters memory controllerParams = parameters[getParametersFromController(_avatar)];

    bytes32 proposalId = controllerParams.intVote.propose(
      2,
      controllerParams.voteChangeBeneficiaryParams,
      msg.sender,
      address(_avatar)
    );

    ChangeBeneficiaryProposal memory proposal = ChangeBeneficiaryProposal({
      curve: _curve,
      newBeneficiary: _newBeneficiary
    });

    emit NewChangeBeneficiaryProposal(
      address(_avatar),
      proposalId,
      address(_curve),
      _curve.beneficiary(),
      _newBeneficiary
    );

    changeBeneficiaryProposals[address(_avatar)][proposalId] = proposal;
    proposalTypes[proposalId] = CHANGE_BENEFICIARY_PROPOSAL;
    proposalsInfo[address(controllerParams.intVote)][proposalId] = ProposalInfo({
      blockNumber: block.number,
      avatar: _avatar
    });

    return proposalId;
  }

  function setCurveParameters(
    uint256 _buySlope,
    uint256 _sellSlope,
    uint256 _buyIntercept,
    uint256 _sellIntercept,
    ERC20 _reserveToken,
    uint _dividendRatio
  ) public returns(bytes32) {

    // TODO: add error messages
    require(_buySlope <= 255);
    require(_sellSlope <= 255);
    require(_buyIntercept <= 1000);
    require(_sellIntercept <= 1000);
    require(address(_reserveToken) != address(0));
    require(_dividendRatio > 0);

    bytes32 paramsHash = getCurveParametersHash(
      _buySlope,
      _sellSlope,
      _buyIntercept,
      _sellIntercept,
      _reserveToken,
      _dividendRatio
    );

    require(curveParameters[paramsHash].dividendRatio == 0, "params already set");

    curveParameters[paramsHash].buySlope = _buySlope;
    curveParameters[paramsHash].sellSlope = _sellSlope;
    curveParameters[paramsHash].buyIntercept = _buyIntercept;
    curveParameters[paramsHash].sellIntercept = _sellIntercept;
    curveParameters[paramsHash].reserveToken = _reserveToken;
    curveParameters[paramsHash].dividendRatio = _dividendRatio;

    return paramsHash;
  }

  function getCurveParametersHash(
    uint256 _buySlope,
    uint256 _sellSlope,
    uint256 _buyIntercept,
    uint256 _sellIntercept,
    ERC20 _reserveToken,
    uint _dividendRatio
  ) public pure returns(bytes32) {
    return keccak256(abi.encodePacked(
      _buySlope,
      _sellSlope,
      _buyIntercept,
      _sellIntercept,
      _reserveToken,
      _dividendRatio
    ));
  }

  /**
  * @dev hash the parameters, save them if necessary, and return the hash value
  * @param _voteDeployParams parameters for the voting machine used to approve a deployment
  * @param _intVote the voting machine used to approve a contribution
  * @return a hash of the parameters
  */
  function setParameters(
    bytes32 _voteDeployParams,
    bytes32 _voteChangeBeneficiaryParams,
    IntVoteInterface _intVote
  ) public returns(bytes32) {
    require(_voteDeployParams != bytes32(0), "voteDeployParams is zero");
    require(_voteChangeBeneficiaryParams != bytes32(0), "voteChangeBeneficiaryParams is zero");
    require(address(_intVote) != address(0), "vote interface is zero");

    bytes32 paramsHash = getParametersHash(
      _voteDeployParams,
      _voteChangeBeneficiaryParams,
      _intVote
    );

    require(parameters[paramsHash].voteDeployParams == bytes32(0), "params already set");

    parameters[paramsHash].voteDeployParams = _voteDeployParams;
    parameters[paramsHash].voteChangeBeneficiaryParams = _voteChangeBeneficiaryParams;
    parameters[paramsHash].intVote = _intVote;
    return paramsHash;
  }

  /**
  * @dev return a hash of the given parameters
  * @param _voteDeployParams parameters for the voting machine used to approve a deployment
  * @param _intVote the voting machine used to approve a contribution
  * @return a hash of the parameters
  */
  function getParametersHash(
    bytes32 _voteDeployParams,
    bytes32 _voteChangeBeneficiaryParams,
    IntVoteInterface _intVote
  ) public pure returns(bytes32) {
    return keccak256(abi.encodePacked(
      _voteDeployParams, _voteChangeBeneficiaryParams, _intVote
    ));
  }
}
