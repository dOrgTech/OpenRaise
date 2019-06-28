pragma solidity ^0.5.4;

import "@daostack/arc/contracts/universalSchemes/UniversalScheme.sol";
import "@daostack/arc/contracts/votingMachines/VotingMachineCallbacks.sol";
import "@daostack/infra/contracts/votingMachines/ProposalExecuteInterface.sol";
import "../BondingCurve/BondingCurve.sol";

contract BondingCurveInvestScheme is UniversalScheme, VotingMachineCallbacks, ProposalExecuteInterface {

  event TokensBought(
    address indexed _avatar,
    address indexed _bondingCurve,
    uint256 _collateralSend,
    bytes _tokensBought
  );

  event NewBuyProposal(
    address indexed _avatar,
    address indexed _bondingCurve,
    uint256 _ether
  );

  event BuyProposalExecuted(
    address indexed _avatar,
    bytes32 indexed _proposalId,
    int256 _decision
  );

  event BuyProposalDeleted(
    address indexed _avatar,
    bytes32 indexed _proposalId
  );

  event TokensSold(
    address indexed _avatar,
    address indexed _bondingCurve,
    uint256 _tokensSold,
    bytes _collateralReceived
  );

  event NewSellProposal(
    address indexed _avatar,
    address indexed _bondingCurve,
    uint256 _tokens
  );

  event SellProposalExecuted(
    address indexed _avatar,
    bytes32 indexed _proposalId,
    int256 _decision
  );

  event SellProposalDeleted(
    address indexed _avatar,
    bytes32 indexed _proposalId
  );

  // Buy Sell Storage Data
  struct BuySellProposal {
    BondingCurve curve;
    bool isBuy;
    uint256 numTokens;
    uint256 priceLimit;
    address recipient;
  }

  string constant SELL_SIGNATURE = "sell(uint256,uint256,address)";
  string constant BUY_SIGNATURE = "buy(uint256,uint256,address)";

  // A mapping from the organization (Avatar) address to proposalId to proposal data
  mapping(address=>mapping(bytes32=>BuySellProposal)) public proposals;

  // Voting Machine configuration parameter hashes
  struct Parameters {
    bytes32 voteBuyParams;
    bytes32 voteSellParams;
    IntVoteInterface intVote;
  }

  // A mapping from hashes to parameters (use to store a particular configuration on the controller)
  mapping(bytes32=>Parameters) public parameters;

  /**
  * @dev execution of proposals, can only be called by the voting machine in which the vote is held.
  * @param _proposalId the ID of the voting in the voting machine
  * @param _decision a parameter of the voting result, 1 yes and 2 is no.
  */
  function executeProposal(bytes32 _proposalId, int256 _decision)
  external
  onlyVotingMachine(_proposalId)
  returns(bool) {
    Avatar avatar = proposalsInfo[msg.sender][_proposalId].avatar;
    BuySellProposal memory proposal = proposals[address(avatar)][_proposalId];

    require(address(proposal.curve) != address(0), "tried executing uninitialized proposal");

    delete proposals[address(avatar)][_proposalId];

    if (proposal.isBuy) {
      emit BuyProposalDeleted(address(avatar), _proposalId);
      return _executeBuy(avatar, proposal, _proposalId, _decision);
    } else {
      emit SellProposalDeleted(address(avatar), _proposalId);
      return _executeSell(avatar, proposal, _proposalId, _decision);
    }
  }

  function _executeBuy(
    Avatar _avatar,
    BuySellProposal memory proposal,
    bytes32 _proposalId,
    int256 _decision
  ) internal returns(bool) {
    if (_decision == 1) {
      ControllerInterface controller = ControllerInterface(_avatar.owner());
      bytes memory genericCallReturnValue;
      bool success;

      (success, genericCallReturnValue) = controller.genericCall(
        address(proposal.curve),
        abi.encodeWithSignature(BUY_SIGNATURE,
          proposal.numTokens,
          proposal.priceLimit,
          proposal.recipient
        ),
        _avatar,
        0
      );

      if (success) {
        emit TokensSold(
          address(_avatar),
          address(proposal.curve),
          proposal.numTokens,
          genericCallReturnValue
        );
      }
    }

    emit BuyProposalExecuted(address(_avatar), _proposalId, _decision);
    return true;
  }

  function _executeSell(
    Avatar _avatar,
    BuySellProposal memory proposal,
    bytes32 _proposalId,
    int256 _decision
  ) internal returns(bool) {
    if (_decision == 1) {
      ControllerInterface controller = ControllerInterface(_avatar.owner());
      bytes memory genericCallReturnValue;
      bool success;

      (success, genericCallReturnValue) = controller.genericCall(
        address(proposal.curve),
        abi.encodeWithSignature(SELL_SIGNATURE,
          proposal.numTokens,
          proposal.priceLimit,
          proposal.recipient
        ),
        _avatar,
        0
      );

      if (success) {
        emit TokensSold(
          address(_avatar),
          address(proposal.curve),
          proposal.numTokens,
          genericCallReturnValue
        );
      }
    }

    emit SellProposalExecuted(address(_avatar), _proposalId, _decision);
    return true;
  }

  function proposeBuy(
    Avatar _avatar,
    BondingCurve _curve,
    uint256 _numTokens,
    uint256 _maxPrice,
    address _recipient
  ) public returns(bytes32) {
    require(address(_avatar) != address(0), "avatar is zero");
    require(address(_curve) != address(0), "curve is zero");
    require(_numTokens != 0, "tokens to buy is zero");

    Parameters memory controllerParams = parameters[getParametersFromController(_avatar)];

    bytes32 proposalId = controllerParams.intVote.propose(
      2,
      controllerParams.voteBuyParams,
      msg.sender,
      address(_avatar)
    );

    BuySellProposal memory proposal = BuySellProposal({
      curve: _curve,
      isBuy: true,
      numTokens: _numTokens,
      priceLimit: _maxPrice,
      recipient: _recipient
    });

    emit NewBuyProposal(
      address(_avatar),
      address(_curve),
      _numTokens
    );

    proposals[address(_avatar)][proposalId] = proposal;
    proposalsInfo[address(controllerParams.intVote)][proposalId] = ProposalInfo({
      blockNumber: block.number,
      avatar: _avatar
    });

    return proposalId;
  }

  function proposeSell(
    Avatar _avatar,
    BondingCurve _curve,
    uint256 _numTokens,
    uint256 _minPrice,
    address _recipient
  ) public returns(bytes32) {
    require(address(_avatar) != address(0), "avatar is zero");
    require(address(_curve) != address(0), "curve is zero");
    require(_numTokens != 0, "tokens is zero");

    Parameters memory controllerParams = parameters[getParametersFromController(_avatar)];

    bytes32 proposalId = controllerParams.intVote.propose(
      2,
      controllerParams.voteSellParams,
      msg.sender,
      address(_avatar)
    );

    BuySellProposal memory proposal = BuySellProposal({
      curve: _curve,
      isBuy: false,
      numTokens: _numTokens,
      priceLimit: _minPrice,
      recipient: _recipient
    });

    emit NewSellProposal(
      address(_avatar),
      address(_curve),
      _numTokens
    );

    proposals[address(_avatar)][proposalId] = proposal;
    proposalsInfo[address(controllerParams.intVote)][proposalId] = ProposalInfo({
      blockNumber: block.number,
      avatar: _avatar
    });

    return proposalId;
  }

  /**
  * @dev hash the parameters, save them if necessary, and return the hash value
  * @param _voteBuyParams parameters for the voting machine used to approve a buy
  * @param _voteSellParams parameters for the voting machine used to approve a sell
  * @param _intVote the voting machine used to approve a contribution
  * @return a hash of the parameters
  */
  function setParameters(
    bytes32 _voteBuyParams,
    bytes32 _voteSellParams,
    IntVoteInterface _intVote
  ) public returns(bytes32) {
    require(_voteBuyParams != bytes32(0), "voteBuyParams is zero");
    require(_voteSellParams != bytes32(0), "voteSellParams is zero");
    require(address(_intVote) != address(0), "vote interface is zero");

    bytes32 paramsHash = getParametersHash(
      _voteBuyParams,
      _voteSellParams,
      _intVote
    );

    require(parameters[paramsHash].voteBuyParams == bytes32(0), "params already set");

    parameters[paramsHash].voteBuyParams = _voteBuyParams;
    parameters[paramsHash].voteSellParams = _voteSellParams;
    parameters[paramsHash].intVote = _intVote;
    return paramsHash;
  }

  /**
  * @dev return a hash of the given parameters
  * @param _voteBuyParams parameters for the voting machine used to approve a buy
  * @param _voteSellParams parameters for the voting machine used to approve a sell
  * @param _intVote the voting machine used to approve a contribution
  * @return a hash of the parameters
  */
  function getParametersHash(
    bytes32 _voteBuyParams,
    bytes32 _voteSellParams,
    IntVoteInterface _intVote
  ) public pure returns(bytes32) {
    return keccak256(abi.encodePacked(
      _voteBuyParams, _voteSellParams, _intVote
    ));
  }
}
