// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CriptoPay
/// @author Angel Castilla
/// @notice Permite enviar pagos en ETH directamente entre usuarios.
/// @dev Utiliza eventos para registrar cada transacción de envío de ETH.

contract CriptoPay {
    /// @notice Evento que registra cuando se envía un pago.
    /// @param from Dirección del remitente.
    /// @param to Dirección del destinatario.
    /// @param amount Cantidad enviada en wei.
    /// @param timestamp Momento en que se realizó el pago.
    event PaymentSent(address indexed from, address indexed to, uint256 amount, uint256 timestamp);

    /// @notice Envía un pago de ETH a un destinatario especificado.
    /// @dev Requiere que el monto enviado sea mayor a 0 wei.
    /// @param recipient La dirección que recibirá el pago.
    function sendPayment(address payable recipient) public payable {
        require(msg.value > 0, "Debes enviar un monto mayor a 0");
        recipient.transfer(msg.value);

        emit PaymentSent(msg.sender, recipient, msg.value, block.timestamp);
    }
}
