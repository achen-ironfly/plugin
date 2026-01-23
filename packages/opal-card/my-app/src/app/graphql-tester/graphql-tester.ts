import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ApiResponse {
    status: 'success' | 'error' | 'loading';
    data?: any;
    error?: string;
    timestamp?: string;
}

@Component({
    selector: 'app-graphql-tester',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './graphql-tester.html',
    styleUrls: ['./graphql-tester.css']
})
export class GraphQLTester {
    // Form fields
    username = '';
    password = '';
    
    // API states
    authResponse: ApiResponse | null = null;
    accountResponse: ApiResponse | null = null;
    transactionResponse: ApiResponse | null = null;
    
    // Loading states
    authLoading = false;
    accountLoading = false;
    transactionLoading = false;

    constructor(private cdr: ChangeDetectorRef) {}

    // Validate credentials
    private validateCredentials(): boolean {
        if (!this.username.trim() || !this.password.trim()) {
        alert('Please enter both username and password');
        return false;
        }
        return true;
    }

    // Call Auth API
    async callAuth() {
        if (!this.validateCredentials()) return;

        this.authLoading = true;
        this.authResponse = { status: 'loading' };

        try {
            const query = `
                mutation Auth($payload: JSON) {
                auth(payload: $payload) {
                    response
                    identifier
                }
                }
            `;

            const variables = {
                payload: {
                id: this.username,
                password: this.password
                }
            };

            const response = await this.callGraphQL(query, variables);
            this.authResponse = {
                status: 'success',
                data: response.data?.auth,
                timestamp: new Date().toLocaleTimeString()
            };
        } catch (error: any) {
            this.authResponse = {
                status: 'error',
                error: error.message || 'Authentication failed',
                timestamp: new Date().toLocaleTimeString()
            };
        } finally {
            this.authLoading = false;
            this.cdr.detectChanges();
        }
    }

    // Call Account API
    async callAccount() {
        if (!this.validateCredentials()) return;

        this.accountLoading = true;
        this.accountResponse = { status: 'loading' };

        try {
            const query = `
                query Account($identifier: String) {
                account(identifier: $identifier) {
                    id
                    name
                    balance
                    currency
                }
                }
            `;

            const variables = {
                identifier: this.username
            };

            const response = await this.callGraphQL(query, variables);
            this.accountResponse = {
                status: 'success',
                data: response.data?.account,
                timestamp: new Date().toLocaleTimeString()
            };
        } catch (error: any) {
            this.accountResponse = {
                status: 'error',
                error: error.message || 'Failed to fetch accounts',
                timestamp: new Date().toLocaleTimeString()
            };
        } finally {
            this.accountLoading = false;
            this.cdr.detectChanges();
        }
    }

    // Call Transaction API
    async callTransaction() {
        if (!this.validateCredentials()) return;

        this.transactionLoading = true;
        this.transactionResponse = { status: 'loading' };

        try {
            const query = `
                query Transaction($identifier: String) {
                transaction(identifier: $identifier) {
                    transactionId
                    transactionTime
                    amount
                    currency
                    description
                    status
                    balance
                }
                }
            `;

            const variables = {
                identifier: this.username
            };

            const response = await this.callGraphQL(query, variables);
            this.transactionResponse = {
                status: 'success',
                data: response.data?.transaction,
                timestamp: new Date().toLocaleTimeString()
            };
        } catch (error: any) {
            this.transactionResponse = {
                status: 'error',
                error: error.message || 'Failed to fetch transactions',
                timestamp: new Date().toLocaleTimeString()
            };
        } finally {
            this.transactionLoading = false;
            this.cdr.detectChanges();
        }
    }

    // Generic GraphQL call
    private async callGraphQL(query: string, variables: any): Promise<any> {
        const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query,
            variables
        })
        });

        if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL Error');
        }

        return result;
    }

    // Clear all responses
    clearAll() {
        this.authResponse = null;
        this.accountResponse = null;
        this.transactionResponse = null;
    }

    // Format JSON for display
    formatJSON(obj: any): string {
        return JSON.stringify(obj, null, 2);
    }
}
