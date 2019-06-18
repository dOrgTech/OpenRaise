pragma solidity ^0.5.4;

import "@daostack/arc/contracts/universalSchemes/UniversalScheme.sol";
import "@daostack/arc/contracts/votingMachines/VotingMachineCallbacks.sol";
import "@daostack/infra/contracts/votingMachines/ProposalExecuteInterface.sol";
import "../BondingCurve/BondingCurve.sol";

contract BondingCurveInvestScheme is UniversalScheme, VotingMachineCallbacks, ProposalExecuteInterface {

  event TokensBought(
    address indexed _avatar,
    address indexed _bondingCurve,
    uint256 _etherSpent,
    uint256 _tokensBought
  );

  event NewBuyProposal(
    address indexed _avatar,
    address indexed _bondingCurve,
    uint256 _ether
  );

  event BuyProposalExecuted(
    address indexed _avatar,
    bytes32 indexed _proposalId,
    int256 _param
  );

  event BuyProposalDeleted(
    address indexed _avatar,
    bytes32 indexed _proposalId
  );

  event TokensSold(
    address indexed _avatar,
    address indexed _bondingCurve,
    uint256 _tokensSold,
    uint256 _etherReceived
  );

  event NewSellProposal(
    address indexed _avatar,
    address indexed _bondingCurve,
    uint256 _tokens
  );

  event SellProposalExecuted(
    address indexed _avatar,
    bytes32 indexed _proposalId,
    int256 _param
  );

  event SellProposalDeleted(
    address indexed _avatar,
    bytes32 indexed _proposalId
  );

  // Buy Sell Storage Data
  struct BuySellProposal {
    BondingCurve curve;
    bool buy;
    // if (buy) amount == ether
    // else amount == tokens
    uint256 amount;
  }

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
  * @param _param a parameter of the voting result, 1 yes and 2 is no.
  */
  function executeProposal(bytes32 _proposalId, int256 _param)
  external
  onlyVotingMachine(_proposalId)
  returns(bool) {
    Avatar avatar = proposalInfo[msg.sender][_proposalId].avatar;
    BuySellProposal memory proposal = proposals[address(avatar)][_proposalId];

    require(address(proposal.curve) != address(0), "tried executing uninitialized proposal");

    delete proposals[address(avatar)][proposalId];

    if (proposal.buy) {
      emit BuyProposalDeleted(address(avatar), _proposalId);
      return _executeBuy(avatar, _proposalId, _param);
    } else {
      emit SellProposalDeleted(address(avatar), _proposalId);
      return _executeSell(avatar, _proposalId, _param);
    }
  }

  function _executeBuy(
    Avatar _avatar,
    BuySellProposal memory proposal,
    bytes32 _proposalId,
    int256 _param
  ) internal returns(bool) {
    if (_param == 1) {
      // TODO:
      // uint256 tokens = ethToTokens(proposal.amount);
      // genericCall(curve.mint(tokens), proposal.amount);
    }

    emit BuyProposalExecuted(address(avatar), _proposalId, _param);
    return true;
  }

  function _executeSell(
    Avatar _avatar,
    BuySellProposal memory proposal,
    bytes32 _proposalId,
    int256 _param
  ) internal returns(bool) {
    if (_param == 1) {
      uint256 etherReceived = proposal.curve.rewardFormBurn(proposal.amount);
      ControllerInterface controller = ControllerInterface(avatar.owner());
      bytes memory genericCallReturnValue;
      bool success;

      (success, genericCallReturnValue) = controller.genericCall(
        address(proposal.curve),
        abi.encodeWithSignature("burn(uint256)", proposal.amount),
        avatar,
        0
      );

      if (success) {
        emit TokensSold(
          address(avatar),
          address(proposal.curve),
          proposal.amount,
          etherReceived
        );
      }
    }

    emit SellProposalExecuted(address(avatar), _proposalId, _param);
    return true;
  }

  function proposeBuy(
    Avatar _avatar,
    BondingCurve _curve,
    uint256 _etherToSpend
  ) public returns(bytes32) {
    require(address(_avatar) != address(0), "avatar is zero");
    require(address(_curve) != address(0), "curve is zero");
    require(_etherToSpend != 0, "ether is zero");

    Parameters memory controllerParams = parameters[getParametersFromController(_avatar)];

    bytes32 proposalId = controllerParams.intVote.propose(
      2,
      controllerParams.voteBuyParams,
      msg.sender,
      address(_avatar)
    );

    BuySellProposal memory proposal = BuySellProposal({
      avatar: _avatar,
      curve: _curve,
      buy: true,
      amount: _etherToSpend
    });

    emit NewBuyProposal(
      address(_curve),
      _etherToSpend
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
    uint256 _tokensToSell
  ) public returns(bytes32) {
    require(address(_avatar) != address(0), "avatar is zero");
    require(address(_curve) != address(0), "curve is zero");
    require(_tokensToSell != 0, "tokens is zero");

    Parameters memory controllerParams = parameters[getParametersFromController(_avatar)];

    bytes32 proposalId = controllerParams.intVote.propose(
      2,
      controllerParams.voteSellParams,
      msg.sender,
      address(_avatar)
    );

    BuySellProposal memory proposal = BuySellProposal({
      avatar: _avatar,
      curve: _curve,
      buy: false,
      amount: _tokensToSell
    });

    emit NewSellProposal(
      address(_curve),
      _tokensToSell
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
    require(_intVote != address(0), "vote interface is zero");

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
