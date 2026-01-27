import { xlmToStroops, dateToTimestamp, frequencyMap } from './conversions';
// import { getGroupContract } from '@/context/contract-context';
import { getGroupContract } from '@/context/contract-context';

interface CreateGroupArgs {
  name: string;
  contribution: number;
  members: number;
  startDate: string;
  frequency: keyof typeof frequencyMap;
}

export async function createGroupOnChain(args: CreateGroupArgs) {
  const contract = getGroupContract();

  return contract.create_group({
    name: args.name,
    contribution: xlmToStroops(args.contribution),
    member_count: args.members,
    start_date: dateToTimestamp(args.startDate),
    frequency: frequencyMap[args.frequency],
  });
}
