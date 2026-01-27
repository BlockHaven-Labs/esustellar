export const mapContractError = (error: Error): string => {
  if (error.message.includes('ContributionTooLow')) {
    return 'Contribution amount is below minimum (10 XLM)';
  }
  if (error.message.includes('InvalidMemberCount')) {
    return 'Member count must be between 3 and 20';
  }
  if (error.message.includes('StartDateMustBeFuture')) {
    return 'Start date must be in the future';
  }
  return 'Failed to create group. Please try again.';
};
