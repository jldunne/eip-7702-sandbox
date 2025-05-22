// contracts/FactoryAuthorizable.sol
pragma solidity ^0.8.20;

contract SimpleDummyContract {}

contract FactoryAuthorizable {
    event ContractDeployed(address indexed deployerEOA, address newContractAddress);
    uint public deploymentCount;

    function deploySimpleDummy() public {
        new SimpleDummyContract(); // Consumes nonce of the EOA this code is delegated to
        deploymentCount++;
        emit ContractDeployed(msg.sender, address(this)); // msg.sender is the EOA
    }

    function getDeploymentCount() public view returns (uint) {
        return deploymentCount;
    }
}