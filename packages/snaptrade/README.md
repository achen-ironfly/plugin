# SnapTrade 
## Features Overview

The current code implements the following features:

1. **API Status Check** – Verify that the SnapTrade API is reachable
2. **User Registration** – Register a SnapTrade user using a `userId` and receive a `userSecret`
3. **Generate Connection URL** – Create a SnapTrade connection portal URL
4. **Automated Browser Connection** – Use Playwright to open the connection flow and wait for completion
5. **List Accounts** – Retrieve all linked investment accounts
6. **Get Account Balances** – Fetch balances for a specific account
7. **Get Account Activities** – Retrieve account activity and transaction history
8. **Data Normalization** – Convert raw API responses into simplified, structured objects
9. **GraphQL API** – Query and mutate SnapTrade data through a GraphQL endpoint

## Requirements

- Node.js
- TypeScript
- node-fetch
- Playwright
- dotenv
- crypto
- graphql 

## Project Structure

```text
├── src/
│   └── snaptrade.ts       # Main application entry
├── graphql/
│   ├── server.ts          # GraphQL server setup
│   ├── schema.graphql      
│   └── resolvers.ts           
├── .env                   # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

Install dependencies:  https://nodejs.org/
```bash
npm init -y
npm install node-fetch dotenv playwright
npm install typescript ts-node @types/node
npm install @apollo/server graphql
```

## Usage
```bash
npm run dev
```
The GraphQL server will start on `http://localhost:4000`

## GraphQL API Schema

### 1. registerUser
Register a new SnapTrade user.
```graphql
mutation {
    auth(payload: { id: "xxxxxx" }) {
        response
        identifier
    }   
}
```

### 2. connectAccount
Establish account connection via redirect URL, access connect account url: "https://example.com", select `Alpaca Paper` as the institution and complete the test connection. 

### 3. account
Fetch linked account for a user.
```graphql
query {
    account {
        id
        name
        currency
        balance
    }
}
```

### 4. transaction
Retrieve transaction history for an account.
```graphql
query {
    transaction(identifier: "xxxxxx") {
        transactionId
        transactionTime
        amount
        currency
        description
        status
        balance
    }
}
```