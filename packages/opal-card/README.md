# Opal Card Transactions Scraper

This project provides a Playwright-based scraper that logs into the NSW Opal website, filters transactions by date range, and exports them to JSON file.

## Features
- Scrapes:
  - transactionDate
  - time_local
  - time_utc
  - quantity
  - currency
  - accountId
  - mode
  - description
  - tap_on_location
  - tap_off_location
  - status
  - bankImportedBalance

## Requirements
- Node.js 18+
- Playwright
- Luxon
- Angular
- grapgQL

Install dependencies:  https://nodejs.org/
```powershell
node -v 
npm -v
npm install typescript ts-node @types/node --save-dev
npm install playwright
npm install luxon
npm install -g @angular/cli
npm install graphql @apollo/server graphql-tag
npm install @apollo/server express
```

## Usage
### Start Backend
Ensure you are in opal-card root:
```powershell
npm run serve
```

### Start Frontend
```powershell
cd my-app
npx ng serve --proxy-config proxy.conf.json
```
The app will be available at `http://localhost:4200`.

### Graphql URL
```
http://localhost:8080/graphql/
```
## Authentication

Before using any queries, first call the `authenticate` mutation to establish a user session.

### Authenticate Mutation

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

**Parameters:**
- `userId` : The user's ID
- `password` : The user's password
- `showBrowser` : Whether to display the browser window during authentication (default: true)

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

## Queries

### Get All Accounts

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

### Get Transactions

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

**Parameters:**
- `identifier` : The authenticated user's ID

## File Structure
- `scraper.ts` – Login, scraping logic, date filtering, JSON output
- `index.ts` – CLI entrypoint (prompts user, calls scraper)

## Transactions rest API

### POST `/user/:userId/auth`

```powershell
$body = @{ password = "yourPassword"; showBrowser = $false } | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri "http://localhost:8080/user/you%40email.com/auth" -Body $body -ContentType "application/json"
```

### GET `/user/:userId`

1. GET /user/:userId/accounts
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/user/yourusername/accounts"
```
2. GET /user/:userId/accounts/:accountId
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/user/yourusername/accounts/xxxx%20xxxx%20xxxx%20xxxx"
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/user/yourusername/accounts/xxxx%20xxxx%20xxxx%20xxxx"
```

3. GET /user/:userId/transactions
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/user/yourusername/transactions"
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/user/yourusername/transactions?startDate=MM-DD-YYYY&endDate=MM-DD-YYYY"
```

4. GET /user/:userId/account/:accountId/transactions
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/user/yourusername/account/xxxx%20xxxx%20xxxx%20xxxx/transactions"
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/user/yourusername/account/xxxx%20xxxx%20xxxx%20xxxx/transactions?startDate=MM-DD-YYYY&endDate=MM-DD-YYYY"
```

5. GET /user/:userId/transactions/:transactionId
```powershell
Invoke-WebRequest -Method Get -Uri "http://localhost:8080/user/yourusername/transactions/xxxxxxxxxx"
```

### Query Parameters

| parameter | description | type |
|---------|-------------|------|
| `accountId` | Filter by Opal card account ID | string |
| `mode` | Filter by transport mode (e.g. `bus`, `lightrail`, `ferry`) | string |
| `from` | Start date (MM-DD-YYYY) for filtering transactions by `time_utc` | string |
| `to` | End date (MM-DD-YYYY) for filtering transactions by `time_utc` | string |

---

## Disclaimer
This tool automates browsing of the NSW Opal website for personal use only. Ensure usage complies with Opal's terms and conditions.
