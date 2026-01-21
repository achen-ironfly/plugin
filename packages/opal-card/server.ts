import express from 'express';
import path from 'path';
import { login, getTransactions, validateSydneyDate, getAccounts } from './scraper';
import { createGraphQLServer } from './graphql/server';

async function main() {
    const app = express();
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

    app.use(express.json({ limit: '10mb' }));
    app.use('/', express.static(path.join(__dirname, 'my-app', 'public')));

    let transactionStore: any[] = [];
    const userSessions = new Map<string, { password: string; lastAuth: number }>();

    function generateTransactionID(t: any) {
        return {
            ...t,
            transactionId: Math.floor(new Date(String(t.time_utc)).getTime() / 1000).toString()
        };
    }

    // GET /api/transactions Method
    app.get('/api/transactions', (req, res) => {

        // Serve the in-memory transaction store (real-time)
        let result = transactionStore || [];

        const { accountId, description, startDate, endDate } = req.query as Record<string, string | undefined>;
        // Validate dates 
        let sDate: Date | null = null;
        let eDate: Date | null = null;
        if (startDate && startDate.trim()) {
            const { date, error } = validateSydneyDate(String(startDate), { allowFuture: true });
            if (!date) {
                return res.status(400).json({ error: `Invalid startDate: ${error}` });
            }
            sDate = date;
        }
        if (endDate && endDate.trim()) {
            const { date, error } = validateSydneyDate(String(endDate), { allowFuture: true });
            if (!date) {
                return res.status(400).json({ error: `Invalid endDate: ${error}` });
            }
            eDate = date;
        }
        if (sDate && eDate && sDate > eDate) {
            return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
        }

        if (accountId) {
            result = result.filter((t: any) => String(t.accountId) === String(accountId));
        }

        if (description) {
            result = result.filter((t: any) => String(t.description) === String(description));
        }

        if (sDate) {
            result = result.filter((t: any) => new Date(String(t.time_utc)) >= sDate!);
        }

        if (eDate) {
            result = result.filter((t: any) => new Date(String(t.time_utc)) <= eDate!);
        }
        res
            .type('application/json')
            .send(JSON.stringify(result, null, 2));

    });

    app.get('/api/scrape/stream', async (req, res) => {
        const { username, password, startDate, endDate, showBrowser } = req.query;
        if (!username || !password) {
            res.status(400).end();
            return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const send = (data: any) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        try {
            const context = await login(
                String(username),
                String(password),
                showBrowser === 'true'
            );

            const transactions = await getTransactions(
                context,
                startDate ? new Date(String(startDate)) : null,
                endDate ? new Date(String(endDate)) : null,
                (p: { percent: number; message?: string }) => send({ type: 'progress', ...p })
            );
            transactionStore = Array.isArray(transactions) ? transactions : [];

            send({ type: 'done', transactions });
            res.end();

            const browser = context.browser();
            if (browser) await browser.close();
            else await context.close();
        } catch (err: any) {
            send({ type: 'error', message: err.message || String(err) });
            res.end();
        }
    });

    //POST /user/:userId/auth
    app.post('/user/:userId/auth', async (req, res) => {
        const { userId } = req.params as { userId: string };
        const { password, showBrowser } = req.body ?? {};
        if (!userId || !password) {
            return res.status(400).json({ error: 'userId and password are required' });
        }

        try {
            const context = await login(String(userId), String(password), !!showBrowser);
            try {
                const browser = context.browser();
                await (browser ? browser.close() : context.close());
            } catch {
                try { await context.close(); } catch {}
            }
            // Persist session so subsequent GETs can use it without password
            userSessions.set(String(userId), { password: String(password), lastAuth: Date.now() });
            return res.status(200).json({ userId, authenticated: true });
        } catch (err: any) {
            const msg = err?.message ?? String(err);
            if (msg === 'InvalidCredentials') return res.status(401).json({ error: 'Invalid credentials' });
            console.error('Auth check failed:', err);
            return res.status(500).json({ error: msg });
        }
    });

    //GET /user/:userId/accounts
    app.get('/user/:userId/accounts', async (req, res) => {
        const { userId } = req.params as { userId: string };
        const { password, showBrowser } = req.query;
        const providedPassword = typeof password === 'string' ? password : undefined;
        const session = userSessions.get(String(userId));
        const effectivePassword = providedPassword ?? session?.password;
        if (!userId || !effectivePassword) {
            return res.status(401).json({
                error: 'Not authenticated. POST /user/:userId/auth first or provide password.'
            });
        }

        let context: any = null;

        try {
            context = await login(
                String(userId),
                String(effectivePassword),
                showBrowser === 'true'
            );

            const accounts = await getAccounts(context);
            res.status(200).type('application/json').send(JSON.stringify(accounts, null, 2));

        } catch (err: any) {
            const msg = err?.message ?? String(err);
            if (msg === 'InvalidCredentials') {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            console.error('Get accounts failed:', err);
            return res.status(500).json({ error: msg });
        } finally {
            try {
                if (context) {
                    const browser = context.browser();
                    await (browser ? browser.close() : context.close());
                }
            } catch {}
        }
    });

    //GET /user/:userId/accounts/:accountId
    app.get('/user/:userId/accounts/:accountId', async (req, res) => {
        const { userId, accountId } = req.params as { userId: string; accountId: string };
        const { password, showBrowser } = req.query;
        const providedPassword = typeof password === 'string' ? password : undefined;
        const session = userSessions.get(String(userId));
        const effectivePassword = providedPassword ?? session?.password;
        if (!userId || !accountId || !effectivePassword) {
            return res.status(401).json({
                error: 'Not authenticated. POST /user/:userId/auth first or provide password.'
            });
        }

        let context: any = null;

        try {
            context = await login(
                String(userId),
                String(effectivePassword),
                showBrowser === 'true'
            );

            const accounts = await getAccounts(context);
            const found = accounts.find((a: any) => String(a.accountId) === String(accountId));

            if (!found) {
                return res.status(404).json({ error: 'Account not found' });
            }

            return res
                .status(200)
                .type('application/json')
                .send(JSON.stringify(found, null, 2));

        } catch (err: any) {
            const msg = err?.message ?? String(err);
            if (msg === 'InvalidCredentials') {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            console.error('Get account failed:', err);
            return res.status(500).json({ error: msg });
        } finally {
            try {
                if (context) {
                    const browser = context.browser();
                    await (browser ? browser.close() : context.close());
                }
            } catch {}
        }
    });

    //GET /user/:userId/transactions
    app.get('/user/:userId/transactions', async (req, res) => {
        const { userId } = req.params as { userId: string };
        const { password, showBrowser, startDate, endDate } = req.query;

        const providedPassword =
            typeof password === 'string' ? password : undefined;

        const session = userSessions.get(String(userId));
        const effectivePassword = providedPassword ?? session?.password;

        if (!userId || !effectivePassword) {
            return res.status(401).json({
                error: 'Not authenticated. POST /user/:userId/auth first or provide password.'
            });
        }

        let sDate: Date | null = null;
        let eDate: Date | null = null;

        if (typeof startDate === 'string' && startDate.trim()) {
            const { date, error } = validateSydneyDate(startDate, { allowFuture: true });
            if (!date) {
                return res.status(400).json({ error: `Invalid startDate: ${error}` });
            }
            sDate = date;
        }

        if (typeof endDate === 'string' && endDate.trim()) {
            const { date, error } = validateSydneyDate(endDate, { allowFuture: true });
            if (!date) {
                return res.status(400).json({ error: `Invalid endDate: ${error}` });
            }
            eDate = date;
        }

        if (sDate && eDate && sDate > eDate) {
            return res.status(400).json({
                error: 'startDate must be before or equal to endDate'
            });
        }

        let context: any = null;

        try {
            context = await login(
                String(userId),
                String(effectivePassword),
                showBrowser === 'true'
            );

            const transactions = await getTransactions(context, sDate, eDate);
            res.status(200).type('application/json').send(JSON.stringify((transactions || []).map(generateTransactionID), null, 2));

        } catch (err: any) {
            const msg = err?.message ?? String(err);
            if (msg === 'InvalidCredentials') {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            console.error('Get transactions failed:', err);
            return res.status(500).json({ error: msg });
        } finally {
            try {
                if (context) {
                    const browser = context.browser();
                    await (browser ? browser.close() : context.close());
                }
            } catch {}
        }
    });

    //GET /user/:userId/account/:accountId/transactions
    app.get('/user/:userId/account/:accountId/transactions', async (req, res) => {
        const { userId, accountId } = req.params as { userId: string; accountId: string };
        const { password, showBrowser, startDate, endDate } = req.query;

        const providedPassword = typeof password === 'string' ? password : undefined;
        const session = userSessions.get(String(userId));
        const effectivePassword = providedPassword ?? session?.password;

        if (!userId || !accountId || !effectivePassword) {
            return res.status(401).json({
                error: 'Not authenticated. POST /user/:userId/auth first or provide password.'
            });
        }

        let sDate: Date | null = null;
        let eDate: Date | null = null;

        if (typeof startDate === 'string' && startDate.trim()) {
            const { date, error } = validateSydneyDate(startDate, { allowFuture: true });
            if (!date) {
                return res.status(400).json({ error: `Invalid startDate: ${error}` });
            }
            sDate = date;
        }

        if (typeof endDate === 'string' && endDate.trim()) {
            const { date, error } = validateSydneyDate(endDate, { allowFuture: true });
            if (!date) {
                return res.status(400).json({ error: `Invalid endDate: ${error}` });
            }
            eDate = date;
        }

        if (sDate && eDate && sDate > eDate) {
            return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
        }

        let context: any = null;

        try {
            context = await login(String(userId), String(effectivePassword), showBrowser === 'true');

            // Verify account exists
            const accounts = await getAccounts(context);
            const found = accounts.find((a: any) => String(a.accountId) === String(accountId));
            if (!found) {
                return res.status(404).json({ error: 'Account not found' });
            }

            const transactions = await getTransactions(context, sDate, eDate);
            const filtered = (transactions || []).filter((t: any) => String(t.accountId) === String(accountId));
            const filteredWithID = filtered.map(generateTransactionID);
            return res.status(200).type('application/json').send(JSON.stringify(filteredWithID, null, 2));

        } catch (err: any) {
            const msg = err?.message ?? String(err);
            if (msg === 'InvalidCredentials') {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            console.error('Get account transactions failed:', err);
            return res.status(500).json({ error: msg });
        } finally {
            try {
                if (context) {
                    const browser = context.browser();
                    await (browser ? browser.close() : context.close());
                }
            } catch {}
        }
    });

    //GET /user/:userId/transactions/:transactionId
    app.get('/user/:userId/transactions/:transactionId(\\d+)', async (req, res) => {
        const { userId, transactionId: TransactionsID } = req.params;
        const { password, showBrowser } = req.query;

        const providedPassword = typeof password === 'string' ? password : undefined;
        const session = userSessions.get(String(userId));
        const effectivePassword = providedPassword ?? session?.password;

        const context = await login(String(userId), String(effectivePassword), showBrowser === 'true');
        const transactions = await getTransactions(context, null, null);

        const found = (transactions || []).find(t =>
            Math.floor(new Date(String(t.time_utc)).getTime() / 1000).toString() === TransactionsID
        );

        if (!found) return res.status(404).json({ error: 'Transaction not found' });
        
        res.status(200).type('application/json').send(JSON.stringify(generateTransactionID(found), null, 2))

    });

    await createGraphQLServer(app);

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/scraper.html`);
    });
}

main().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});