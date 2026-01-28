# @glossplugin Monorepo

A monorepo containing multiple packages for the Gloss Plugin project.

## Packages

- **[@glossplugin/opal-card](packages/opal-card)** - Opal Card package
- **[@glossplugin/snaptrade](packages/snaptrade)** - Snaptrade integration package

## Installation

```bash
npm install
```

This will install dependencies for all packages in the workspace.

## Run build for opal-card only

Run scripts for a specific package:

```bash
# Run dev for opal-card only
npm run dev:opal-card

### Start Frontend
cd .\packages\opal-card\my-app\
npm start
```
The app will be available at `http://localhost:4200`.

### Opal Card GraphQL
```
http://localhost:8080/graphql/
```

### 1. Authenticate Mutation

```graphql
mutation {
    auth(payload: { 
            id: "user123",
            password:"yourPassword"}
        ) 
        {
            response
            identifier
        }
}
```

**Response Example:**
```json
{
    "data": {
        "auth": {
            "response": "https://transportnsw.info/xxxxxx",
            "identifier": "authenticated true"
        }
    }
}
```

### 2. Get All Accounts

Retrieve all accounts for an authenticated user.

```graphql
query {
    account(identifier: "user123") {
        id
        name
        currency
        balance
    }
}
```

**Parameters:**
- `identifier` : The authenticated user's ID

### 3. Get Transactions

Retrieve transactions with optional filtering by date range and account.

```graphql
query {
    transaction(identifier: "user123") {
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

## Run build for snaptrade only
```bash
npm run dev:snaptrade
```
The GraphQL server will start on `http://localhost:4000`

## Snaptrade GraphQL 

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
### Notes
If you encounter the error "User with the following userId already exist", run the following command to delete the user:
```bash
cd D:\plugin\packages\snaptrade
npx ts-node .\src\deleteuser.ts
```

### 2. connectAccount
Establish account connection via response URL, access connect account url: "https://example.com", select `Alpaca Paper` as the institution and complete the test connection. 

### 3. account
Fetch linked account for a user.
```graphql
query {
    account(identifier: "{\"userId\":\"xxxxxx\",\"userSecret\":\"xxxxxx\"}"
    ) {
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
    transaction(identifier: "{\"userId\":\"xxxxxx\",\"userSecret\":\"xxxxxx\",\"accountId\":\"xxxxxx\"}"
    ) {
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

## Workspace Structure

```
.
├── packages/
│   ├── opal-card/       # Opal Card package
│   └── snaptrade/       # Snaptrade package
├── package.json         # Root workspace configuration
└── README.md           # This file
```
