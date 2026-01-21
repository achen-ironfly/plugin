import {
    registerUser,
    generateUrl,
    listAccounts,
    accountActivities,
    normalizeAccounts,
    normalizeTransactions,
    accountBalances,
    connect,
} from '../src/snaptrade';
import RequestQueue from "./queue";

interface Context {
    userId?: string;
    userSecret?: string;
    identifier?: string;
}

const requestQueue = new RequestQueue(3);

export const resolvers = {
    Mutation: {
        auth: async (_: any, { payload }: any) => {
            return requestQueue.enqueue(async () => {
                if (!payload || !payload.id || payload.id.trim() === "") {
                    throw new Error("payload.id cannot be empty");
                }

                const userSecret = await registerUser(payload.id);
                if (!userSecret) {
                    throw new Error("Failed to register user");
                }
 
                const url = await generateUrl(payload.id, userSecret);
                await connect(url);
                    
                return {
                    response: url,
                    identifier: JSON.stringify({
                        userId: payload.id,
                        userSecret: userSecret
                    })
                };
            });
        } 
    },

    Query: {
        account: async (_: any, args: { identifier: string }, context: Context) => {
            return requestQueue.enqueue(async () => {
                if (!args.identifier) {
                    throw new Error("identifier parameter is required");
                }

                let userId: string | undefined;
                let userSecret: string | undefined;

                // Parse identifier to get userId and userSecret
                const parsed = JSON.parse(args.identifier);
                userId = parsed.userId;
                userSecret = parsed.userSecret;
                
                if (!userId || !userSecret) {
                    throw new Error("userId and userSecret must be provided in identifier");
                }

                const accounts = await listAccounts(userId, userSecret);
                if (!accounts || accounts.length === 0) return [];

                const targetAccount = accounts[0];
                const balances = await accountBalances(targetAccount.id, userId, userSecret);
                const normalized = normalizeAccounts([targetAccount], balances);

                return [
                    {
                        id: normalized[0].id,
                        name: normalized[0].name,
                        currency: normalized[0].currency,
                        balance: normalized[0].balance,
                    }
                ];
            });
        },

        transaction: async (_: any, args: { identifier: string }, context: Context) => {
            return requestQueue.enqueue(async () => {
                if (!args.identifier) {
                    throw new Error("identifier parameter is required");
                }

                let userId: string | undefined;
                let userSecret: string | undefined;
                let accountId: string | undefined;

                // Parse identifier to get userId, userSecret, and accountId
                const parsed = JSON.parse(args.identifier);
                userId = parsed.userId;
                userSecret = parsed.userSecret;
                accountId = parsed.accountId;
                
                if (!userId || !userSecret) {
                    throw new Error("userId and userSecret must be provided in identifier");
                }
                if (!accountId) {
                    throw new Error("accountId must be provided in identifier");
                }
                
                const activities = await accountActivities(
                    accountId,
                    userId,
                    userSecret
                );
                const transactions = normalizeTransactions(activities?.data || []);

                return transactions.map((tx: any) => ({
                    transactionId: tx.transactionId,
                    transactionTime: tx.transactionTime,
                    amount: tx.amount,
                    currency: tx.currency,
                    description: tx.description,
                    status: tx.status,
                    balance: tx.balance,
                }));
            });
        },
    },
};
