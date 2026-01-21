interface QueueTask<T> {
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
    execute: () => Promise<T>;
}

class RequestQueue {
    private requestQueue: QueueTask<any>[] = [];
    private activeRequests = 0;
    private maxActiveRequests: number;

    constructor(maxActiveRequests: number = 3) {
        this.maxActiveRequests = maxActiveRequests;
    }

    private async processQueue(): Promise<void> {
        if (this.activeRequests >= this.maxActiveRequests || this.requestQueue.length === 0) {
            return;
        }

        this.activeRequests++;
        const { resolve, reject, execute } = this.requestQueue.shift()!;
        console.log(`[Queue] processing request active: ${this.activeRequests}, queue length: ${this.requestQueue.length}`);

        try {
            const result = await execute();
            resolve(result);
        } catch (error) {
            console.error(`[Queue] Request error: ${error instanceof Error ? error.message : String(error)}`);
            reject(error);
        } finally {
            this.activeRequests--;
            console.log(`[Queue] request completed, active: ${this.activeRequests}, queue length: ${this.requestQueue.length}`);
            this.processQueue();
        }
    }

    async enqueue<T>(execute: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            console.log(`[Queue] new request enqueued, active: ${this.activeRequests}, queue length: ${this.requestQueue.length + 1}`);
            this.requestQueue.push({ resolve, reject, execute });
            this.processQueue();
        });
    }

    getStats() {
        return {
            activeRequests: this.activeRequests,
            queueLength: this.requestQueue.length,
            maxActiveRequests: this.maxActiveRequests
        };
    }
}

export default RequestQueue;