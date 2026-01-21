import dotenv from "dotenv";
import { Snaptrade } from "snaptrade-typescript-sdk";
import { chromium } from "playwright";
import readline from "readline";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });
const userId = process.env.SNAPTRADE_USER_ID!;

// Ask for user input
function ask(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer: string) => {
            rl.close();
            resolve(answer);
        });
    });
}
async function initClient() {
    // 1) Initialize a client with your clientID and consumerKey.
    const snaptrade = new Snaptrade({
        consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
        clientId: process.env.SNAPTRADE_CLIENT_ID,
    });
    
    return snaptrade;
}

async function registerUser(snaptrade: any) {
    // 2) Check that the client is able to make a request to the API server.
    const status = await snaptrade.apiStatus.check();
    console.log("status:", status.data);

    // 3) Create a new user on SnapTrade
    // const userId = process.env.SNAPTRADE_USER_ID;
    const { userSecret } = (
        await snaptrade.authentication.registerSnapTradeUser({
            userId,
        })
    ).data;

    console.log("userSecret:", userSecret); 
    return { userId, userSecret };
}

async function connect(snaptrade: any, userId: string, userSecret: string) {
    // 4) Get a redirect URI. Users will need this to connect
    const data = (
        await snaptrade.authentication.loginSnapTradeUser({ userId, userSecret })
    ).data;
    if (!("redirectURI" in data)) throw Error("Should have gotten redirect URI");
    console.log("redirectURI:", data.redirectURI);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(data.redirectURI);
    await page.waitForURL('**/connection-complete/**', { timeout: 1200000 }); 
    console.log("Connection completed successfully");
    await browser.close();
}

async function getHoldings(snaptrade: any, userId: string, userSecret: string) {
    // 5) Obtaining account holdings data
    const holdings = (
        await snaptrade.accountInformation.getAllUserHoldings({
        userId,
        userSecret,
        })
    ).data;
    console.log(holdings);
    return holdings;
}

async function deleteUser(snaptrade: any, userId: string) {
    // 6) Deleting a user
    const deleteResponse = (
        await snaptrade.authentication.deleteSnapTradeUser({ userId })
    ).data;
    console.log("deleteResponse:", deleteResponse);
    return deleteResponse;
}

function saveToJson(data: any, filename: string): void {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filepath = `${filename}_${timestamp}.json`;
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filepath}`);
}

async function main() {
    const snaptrade = await initClient();
    // const { userId, userSecret } = await registerUser(snaptrade);
    // await connect(snaptrade, userId, userSecret);
    // const holdings = await getHoldings(snaptrade, userId, userSecret);
    // saveToJson(holdings, 'holdings');

    // await deleteUser(snaptrade, userId);
    await deleteUser(snaptrade, "achen@ironflytechnologies.com1");
    await deleteUser(snaptrade, "achen@ironflytechnologies.com2");
    await deleteUser(snaptrade, "achen@ironflytechnologies.com3");
    await deleteUser(snaptrade, "achen@ironflytechnologies.com4");
    await deleteUser(snaptrade, "achen@ironflytechnologies.com5");

}

main();