import fetch from "node-fetch";
import * as readline from "readline";
import crypto from "crypto";
import { chromium } from "playwright";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
        resolve(answer);
        });
    });
}

function createAuthorization() {
    let credentials: { clientId: string; consumerKey: string } | null = null;
    
    return async (): Promise<{ clientId: string; consumerKey: string }> => {
        if (credentials) {
            return credentials;
        }      
        // const clientId = await askQuestion("Enter your clientId: ");
        // const consumerKey = await askQuestion("Enter your consumerKey: ");
        const clientId = process.env.SNAPTRADE_CLIENT_ID;
        const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
        if (!clientId || !consumerKey) {
            throw new Error("SNAPTRADE_CLIENT_ID or SNAPTRADE_CONSUMER_KEY environment variables are required.");
        }
        credentials = { clientId, consumerKey };
        return credentials;
    };
}

// 1.--- API Status ---
const authorization = createAuthorization();
async function getApiStatus() {
    const { clientId, consumerKey } = await authorization();
    const url = "https://api.snaptrade.com/api/v1/";
    const response = await fetch(url, {
        method: "GET",
        headers: {
        "Content-Type": "application/json",
        "clientId": clientId,
        "consumerKey": consumerKey,
        },
    });

    const data = await response.json();
    console.log("API Status:", data);

    return data;
}

// 2.--- Register User ---
function jsonOrder(obj: any) {
    const allKeys: string[] = [];
    const seen: any = {};
    JSON.stringify(obj, (key, value) => {
        if (!(key in seen)) {
        allKeys.push(key);
        seen[key] = true;
        }
        return value;
    });
    allKeys.sort();
    return JSON.stringify(obj, allKeys);
}

function signRequest(
    body: any,
    endpoint: string,
    query: string,
    consumerKey: string
    ): string {

    const sigObject: any = {
        content: body,
        path: endpoint,
        query: query,
    };
    const sigContent = jsonOrder(sigObject);

    return crypto
        .createHmac("sha256", encodeURI(consumerKey))
        .update(sigContent)
        .digest("base64");
}

async function registerUser(userId: string): Promise<string | null> {
    const { clientId, consumerKey } = await authorization();
    const endpoint = "/api/v1/snapTrade/registerUser";
    const timestamp = Math.floor(Date.now() / 1000);
    const queryParams: Record<string, string> = {
        clientId: clientId,
        timestamp: String(timestamp),
    };
    const query = Object.keys(queryParams)
        .sort()
        .map(key => `${key}=${queryParams[key]}`)
        .join("&");
    const body = { userId };
    const signature = signRequest(body, endpoint, query, consumerKey);
    const response = await fetch(`https://api.snaptrade.com${endpoint}?${query}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Signature": signature,
        },
        body: JSON.stringify(body),
    });

    const data = await response.json() as any;  
    // check register error
    if (data.status_code === 400) {
        console.error(`Error: ${data.detail}`);
        return null;
    }
    
    console.log(data);
    return data.userSecret;
}

// 2.1 --- Check Register userId ---
async function checkUserId(): Promise<{ userId: string; userSecret: string }> {
    let userSecret: string | null = null;
    let userId: string = "";
    
    while (!userSecret) {
        userId = await askQuestion("Enter userId (any string used as a unique identifier): ");
        if (!userId || userId.trim() === "") {
            console.error("Error: userId cannot be empty, please try again.\n");
            continue;
        }  
        userSecret = await registerUser(userId);

        if (!userSecret) {
            console.log("Please try with a different userId.\n");
            continue;
        }
    }
    return { userId, userSecret };
}

// 3.--- Generate Connection URL ---
async function generateUrl(userId: string, userSecret: string): Promise<string> {
    const { clientId, consumerKey } = await authorization();
    const endpoint = "/api/v1/snapTrade/login";
    const timestamp = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
        clientId,
        timestamp: String(timestamp),
        userId,
        userSecret,
  });
    const query = params.toString();
    const signature = signRequest(null, endpoint, query, consumerKey);
    const response = await fetch(`https://api.snaptrade.com${endpoint}?${query}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Signature": signature,
        },
        body: JSON.stringify({}),
    });

    const data = await response.json() as { redirectURI: string };
    console.log("Connection URL response:", data);
    return data.redirectURI;
}

// 4.--- Connection URL ---
async function connect(redirectURI: string) {
    // console.log("redirectURI:", redirectURI);
    // Open the redirect URI in browser using Playwright
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(redirectURI);
    await page.waitForURL('**/connection-complete/**', { timeout: 1200000 }); 
    console.log("Connection completed successfully");
    await browser.close();
}

// 5.--- List Accounts ---
async function listAccounts(userId: string, userSecret: string): Promise<any> {
    const { clientId, consumerKey } = await authorization();
    const endpoint = "/api/v1/accounts";
    const timestamp = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
        clientId,
        timestamp: String(timestamp),
        userId,
        userSecret,
    });
    const query = params.toString();
    const signature = signRequest(null, endpoint, query, consumerKey);
    const response = await fetch(`https://api.snaptrade.com${endpoint}?${query}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Signature": signature,
        },
    });

    const data = await response.json();
    console.log("Accounts:", data);
    return data;
}

// 6.--- List Account Balances ---
async function accountBalances(accountId: string, userId: string, userSecret: string): Promise<any> {
    const { clientId, consumerKey } = await authorization();
    const endpoint = `/api/v1/accounts/${accountId}/balances`;
    const timestamp = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
        clientId,
        timestamp: String(timestamp),
        userId,
        userSecret,
    });
    const query = params.toString();
    const signature = signRequest(null, endpoint, query, consumerKey);
    const response = await fetch(`https://api.snaptrade.com${endpoint}?${query}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Signature": signature,
        },
    });

    const data = await response.json();
    console.log("Account Balances:", data);
    return data;
}

// 7.--- List Account Activities ---
async function accountActivities(accountId: string, userId: string, userSecret: string): Promise<any> {
    const { clientId, consumerKey } = await authorization();
    const endpoint = `/api/v1/accounts/${accountId}/activities`;
    const timestamp = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
        clientId,
        timestamp: String(timestamp),
        userId,
        userSecret,
    });
    const query = params.toString();
    const signature = signRequest(null, endpoint, query, consumerKey);
    const response = await fetch(`https://api.snaptrade.com${endpoint}?${query}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Signature": signature,
        },
    });

    const data = await response.json();
    console.log("Account Activities:", data);
    return data;
}

// 8.--- Normalize Accounts Data ---
function normalizeAccounts(accounts: any[], balances: any[] = []): any[] {
    return accounts.map(account => {
        let cash: number | null = null;
        let currency: string | null = null;

        if (Array.isArray(balances) && balances.length > 0) {
            const balanceItem = balances.find(b => true); 
            cash = balanceItem?.cash ?? null;
            currency = balanceItem?.currency?.code ?? null;
        }

        const total = account.balance?.total?.amount ?? null;
        if (!currency) {
            currency = account.balance?.total?.currency ?? null;
        }

        return {
            id: account.id,
            name: account.name,
            // balance: { cash, total },
            balance: total,
            currency
        };
    });
}

// 9.--- Normalize Transactions Data ---
function normalizeTransactions(transactions: any[]): any[] {
    const reverse_transactions = [...transactions].reverse();
    let balance = 0;
    
    const final_transactions = reverse_transactions.map(transaction => {
        const date = new Date(transaction.settlement_date);
        const transactionDate = date.toISOString().replace('T', ' ').split('.')[0];
        balance = parseFloat((balance + transaction.amount).toFixed(2));

        return {
            transactionId: transaction.id,
            transactionTime: transactionDate,
            amount: transaction.amount,
            currency: transaction.currency?.code,
            description: transaction.description,
            status: transaction.status || null,
            balance: balance
        };
    });
    
    return final_transactions.reverse();
}

async function main() {
    console.log("\n--- API Status ---");
    await getApiStatus();

    console.log("\n--- Register User ---");
    const { userId, userSecret } = await checkUserId();

    console.log("\n--- Generate Connection Portal URL ---");
    const redirectURI = await generateUrl(userId, userSecret);

    console.log("\n--- Connect ---");
    await connect(redirectURI);

    console.log("\n--- List Accounts ---");
    const accounts = await listAccounts(userId, userSecret);
    const accountId = accounts[0].id;

    console.log("\n--- List Account Balances ---");
    const balances = await accountBalances(accountId, userId, userSecret);
    const normalizedAccounts = normalizeAccounts(accounts);

    console.log("\n--- List Account Activities ---");
    const activities = await accountActivities(accountId, userId, userSecret);
    const transactionsData = activities?.data || [];
    const normalizedTransactions = normalizeTransactions(transactionsData);

    console.log("\n--- Normalized data ---");
    console.log("Normalized Accounts:", normalizedAccounts);
    console.log("Normalized Transactions:", normalizedTransactions);

    process.exit(0);
}

main();

export {
    getApiStatus,
    registerUser,
    generateUrl,
    connect,
    listAccounts,
    accountBalances,
    accountActivities,
    normalizeAccounts,
    normalizeTransactions
};