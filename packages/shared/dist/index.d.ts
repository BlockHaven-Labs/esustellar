export interface SavingsGroup {
    id: string;
    name: string;
    contributionAmount: number;
    frequency: 'monthly' | 'weekly';
    members: string[];
    currentRound: number;
}
export interface Contribution {
    memberId: string;
    amount: number;
    timestamp: Date;
    txHash: string;
}
export declare const STELLAR_NETWORK: {
    readonly testnet: "https://horizon-testnet.stellar.org";
    readonly mainnet: "https://horizon.stellar.org";
};
export declare function formatAmount(amount: number): string;
export declare function validateContribution(amount: number, required: number): boolean;
