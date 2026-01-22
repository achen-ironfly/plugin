import dotenv from "dotenv";
import { Snaptrade } from "snaptrade-typescript-sdk";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });
const userId = process.env.SNAPTRADE_USER_ID!;

async function initClient() {
    // 1) Initialize a client with your clientID and consumerKey.
    const snaptrade = new Snaptrade({
        consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
        clientId: process.env.SNAPTRADE_CLIENT_ID,
    });
    
    return snaptrade;
}

async function deleteUser(snaptrade: any, userId: string) {
    // 2) Deleting a user
    const deleteResponse = (
        await snaptrade.authentication.deleteSnapTradeUser({ userId })
    ).data;
    console.log("deleteResponse:", deleteResponse);
    return deleteResponse;
}

async function main() {
    const snaptrade = await initClient();
    // await deleteUser(snaptrade, userId);
    await deleteUser(snaptrade, "achen@ironflytechnologies.com1");
    await deleteUser(snaptrade, "achen@ironflytechnologies.com2");
    await deleteUser(snaptrade, "achen@ironflytechnologies.com3");
    await deleteUser(snaptrade, "achen@ironflytechnologies.com4");
    await deleteUser(snaptrade, "achen@ironflytechnologies.com5");

}

main();