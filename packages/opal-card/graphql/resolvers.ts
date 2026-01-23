import { login, getAccounts, getTransactions } from '../scraper';
import RequestQueue from "./queue";

const sessions: Record<string, any> = {};
const requestQueue = new RequestQueue(3);

export const resolvers = {
    Mutation: {
        auth: async (_: any, { payload }: any) => {
            return requestQueue.enqueue(async () => {
                const { id, password } = payload || {};               
                if (!id || !password) {
                    return {
                        response: JSON.stringify({
                            message: "authentication failed",
                            error: "Missing id or password"
                        }),
                        identifier: null
                    };
                }

                const context = await login(id, password, false);
                const isAuthenticated = !!context;
                if (isAuthenticated) {
                    sessions[id] = context;
                    const page = context.pages()[0];
                    const currentUrl = page.url();
                    return {
                        response: currentUrl,
                        identifier: id
                    };
                }
                return {
                    response: "authenticated false",
                    identifier: null
                }; 
            });                      
        }
    },
    Query: {
        account: async (_: any, { identifier }: any) => {
            return requestQueue.enqueue(async () => {
                const context = sessions[identifier];
                if (!context) {
                    throw new Error('User not authenticated.');
                }
                try {
                    const accounts = await getAccounts(context);
                    console.log('[account] get account successful');
                    return accounts;
                } catch (err) {
                    console.error(err);
                    return [];
                }
            });
        },

        transaction: async (_: any, { identifier }: any) => {
            return requestQueue.enqueue(async () => {
                const context = sessions[identifier];
                if (!context) {
                    throw new Error('User not authenticated.');
                }
                try {
                    const transactions = await getTransactions(context, null, null);
                    console.log('[transaction] get transaction successful');
                    return (transactions || []).map((t: any) => ({
                        transactionId: t.transactionId,
                        transactionTime: t.transactionTime,
                        amount: t.amount,
                        currency: t.currency,
                        description: t.description,
                        status: t.status,
                        balance: t.balance
                    }));
                } catch (err) {
                        console.error(err);
                        return [];
                }
            });
        },
    }
};
