function unwrapEnum(value) {
  return Array.isArray(value) ? value[0] : value;
}

function toBigInt(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  return 0n;
}

module.exports = { unwrapEnum, toBigInt };
