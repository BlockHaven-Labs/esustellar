const { nativeToScVal } = require("@stellar/stellar-sdk");

function asAddress(value) {
  return nativeToScVal(value, { type: "address" });
}

function asString(value) {
  return nativeToScVal(value, { type: "string" });
}

function asU32(value) {
  return nativeToScVal(value, { type: "u32" });
}

module.exports = { asAddress, asString, asU32 };
