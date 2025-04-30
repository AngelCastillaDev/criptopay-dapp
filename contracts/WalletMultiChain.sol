// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WalletMultiChain
/// @author 
/// @notice Permite recibir y enviar ETH desde este contrato en redes compatibles como Ethereum, Holesky, etc.
/// @dev Asegúrate de enviar fondos al contrato antes de intentar transferir.

contract WalletMultiChain {
    address public owner;

    /// @notice Emite un evento cuando el contrato recibe ETH
    event DepositoRecibido(address indexed from, uint256 amount);

    /// @notice Emite un evento cuando se transfiere ETH a otra cuenta
    event TransferenciaRealizada(address indexed to, uint256 amount);

    /// @dev Constructor, se ejecuta una vez al desplegar y define al owner.
    constructor() payable {
        owner = msg.sender;
    }

    /// @notice Permite que el contrato reciba ETH directamente (sin llamar una función específica)
    receive() external payable {
        emit DepositoRecibido(msg.sender, msg.value);
    }

    /// @notice Ver el saldo total del contrato.
    function verBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Permite al owner enviar ETH desde el contrato a otra dirección.
    /// @param destinatario Dirección que recibirá el ETH.
    /// @param monto Monto a enviar en wei.
    function enviarETH(address payable destinatario, uint256 monto) public {
        require(msg.sender == owner, "No tienes permiso");
        require(address(this).balance >= monto, "Fondos insuficientes");

        (bool enviado, ) = destinatario.call{value: monto}("");
        require(enviado, "Transferencia fallida");

        emit TransferenciaRealizada(destinatario, monto);
    }

    /// @notice Permite que cualquiera pueda enviar ETH como donación al contrato.
    function donar() public payable {
        emit DepositoRecibido(msg.sender, msg.value);
    }
}