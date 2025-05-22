// contracts/Authorizable.sol
pragma solidity ^0.8.20;

contract Authorizable {
    uint256 public value;
    address public sender;
    uint public criticalValueForTest; // For state-based invalidation test

    event ValueSet(address indexed _sender, uint256 _value);
    event CriticalValueSet(address indexed _setter, uint _val);

    function setValue(uint256 _newValue) public {
        value = _newValue;
        sender = msg.sender; 
        emit ValueSet(sender, value);
    }

    function getValue() public view returns (uint256) {
        return value;
    }

    function getSender() public view returns (address) {
        return sender;
    }

    // For state-based invalidation test
    function setCriticalValueForTest(uint _val) public {
        criticalValueForTest = _val;
        emit CriticalValueSet(msg.sender, _val);
    }

    function conditionalAction(uint expectedCriticalValue, uint newValueToSet) public {
        require(criticalValueForTest == expectedCriticalValue, "Critical value mismatch, action aborted!");
        setValue(newValueToSet); // Call existing setValue
        criticalValueForTest = newValueToSet; // Update criticalValue as part of the action
    }
}