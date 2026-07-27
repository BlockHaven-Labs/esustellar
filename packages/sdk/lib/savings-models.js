function mapGroup(n, unwrapEnum, toBigInt) {
  return {
    groupId: n.group_id ?? n.groupId,
    admin: n.admin,
    name: n.name,
    contributionAmount: toBigInt(n.contribution_amount ?? n.contributionAmount ?? 0),
    totalMembers: n.total_members ?? n.totalMembers ?? 0,
    frequency: unwrapEnum(n.frequency),
    startTimestamp: toBigInt(n.start_timestamp ?? n.startTimestamp ?? 0),
    status: unwrapEnum(n.status),
    isPublic: n.is_public ?? n.isPublic ?? false,
    currentRound: n.current_round ?? n.currentRound ?? 0,
    platformFeePercent: n.platform_fee_percent ?? n.platformFeePercent ?? 0,
  };
}

function mapMember(n, unwrapEnum, toBigInt) {
  return {
    address: n.address,
    joinTimestamp: toBigInt(n.join_timestamp ?? n.joinTimestamp ?? 0),
    joinOrder: n.join_order ?? n.joinOrder ?? 0,
    status: unwrapEnum(n.status),
    totalContributed: toBigInt(n.total_contributed ?? n.totalContributed ?? 0),
    hasReceivedPayout: n.has_received_payout ?? n.hasReceivedPayout ?? false,
    payoutRound: n.payout_round ?? n.payoutRound ?? 0,
  };
}

function mapContribution(c, toBigInt) {
  return {
    member: c.member,
    amount: toBigInt(c.amount ?? 0),
    round: c.round,
    timestamp: toBigInt(c.timestamp ?? 0),
  };
}

module.exports = { mapGroup, mapMember, mapContribution };
