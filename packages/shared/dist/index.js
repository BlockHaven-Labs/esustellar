"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STELLAR_NETWORK = void 0;
exports.formatAmount = formatAmount;
exports.validateContribution = validateContribution;
// Constants
exports.STELLAR_NETWORK = {
    testnet: 'https://horizon-testnet.stellar.org',
    mainnet: 'https://horizon.stellar.org'
};
// Utility functions
function formatAmount(amount) {
    return (amount / 10000000).toFixed(2); // Convert stroops to XLM
}
function validateContribution(amount, required) {
    return amount === required;
}
