// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;
// @title un simulador de una Transacción
// @author Juan Condori :D
// @notice puede usar este contrato solo para la simulación de una Transacción

contract Transaction {
    
    function sendRemittance(address payable _recipient, uint256 _amount) public payable {        
        _recipient.transfer(_amount);
    }

}