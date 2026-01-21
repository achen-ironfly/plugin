import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-scraper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scraper.html',
  styleUrls: ['./scraper.css']
})
export class Scraper {

  // Form fields
  username = '';
  password = '';
  startDate: string | null = null;
  endDate: string | null = null;
  showBrowser = true;
  // Runtime state 
  running = false;
  progressPercent = 0;
  progressMessage: string | null = null;
  // User messages 
  message: string | null = null;
  messageType: 'info' | 'error' = 'info';
  // Table data
  previewColumns: string[] = [];
  previewRows: Array<Record<string, any>> = [];
  tableError: string | null = null;
  // Pagination
  pageSize = 10;
  currentPage = 1;
  // Reused columns
  private readonly columns = [
    'time_local',
    'quantity',
    'currency',
    'accountId',
    'description',
    'tap_on_location',
    'tap_off_location',
    'status',
    'bankImportedBalance'
  ];

  // Server-Sent Events (SSE)
  private eventSource: EventSource | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  //Main entry
  async run() {
    if (!this.validateCredentials()) return;
    if (!this.validateAndNormalizeDates()) return;

    this.running = true;
    this.resetProgress();

    try {
      this.startScraping();
    } catch (err) {
      this.handleRequestError(err);
    }
  }

  // Validate username and password
  private validateCredentials(): boolean {
    if (!this.username || !this.password) {
      this.showMessage('Please enter username and password.', 'error');
      return false;
    }
    return true;
  }

  // Validate and normalize start/end dates
  private validateAndNormalizeDates(): boolean {
    const start = this.normalizeDate(this.startDate, 'Start date');
    if (start === false) return false;

    const end = this.normalizeDate(this.endDate, 'End date');
    if (end === false) return false;

    this.startDate = start;
    this.endDate = end;
    return true;
  }

  // Validate and normalize date-MM-DD-YYYY or MM/DD/YYYY
  private normalizeDate(
    input: string | null,
    label: string
  ): string | null | false {
    if (!input?.trim()) return null;

    const raw = input.trim().replace(/\//g, '-');
    const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(raw);

    if (!match) {
      this.showMessage(`${label} must be in MM-DD-YYYY format`, 'error');
      return false;
    }

    const mm = +match[1];
    const dd = +match[2];
    const yyyy = +match[3];
    const date = new Date(yyyy, mm - 1, dd);
    const today = new Date(new Date().setHours(0, 0, 0, 0));

    if (
      date.getFullYear() !== yyyy ||
      date.getMonth() !== mm - 1 ||
      date.getDate() !== dd
    ) {
      this.showMessage(`${label} is not a valid date`, 'error');
      return false;
    }
    if (date > today) {
      this.showMessage(`${label} cannot be in the future`, 'error');
      return false;
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(mm)}-${pad(dd)}-${yyyy}`;
  }

  // Start scraping process
  private startScraping() {
    const url = this.buildScrapeUrl();
    this.initEventSource(url);
  }

  // Build scraping request URL
  private buildScrapeUrl(): string {
    const params = new URLSearchParams({
      username: this.username.trim(),
      password: this.password,
      showBrowser: String(this.showBrowser),
      ...(this.startDate ? { startDate: this.startDate } : {}),
      ...(this.endDate ? { endDate: this.endDate } : {})
    } as any);
    return '/api/scrape/stream?' + params.toString();
  }

  // Initialize SSE connection
  private initEventSource(url: string) {
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = evt => this.zone.run(() => this.handleSseMessage(evt));
    this.eventSource.onerror = () => this.zone.run(() => this.handleSseError());
  }

  // Handle SSE messages
  private handleSseMessage(evt: MessageEvent) {
    const data = JSON.parse(evt.data);

    switch (data.type) {
      case 'progress':
        this.progressPercent = data.percent ?? 0;
        this.progressMessage = data.message ?? null;
        break;

      case 'done':
        this.handleScrapeDone(data.transactions);
        break;

      case 'error':
        this.handleScrapeError(data.message);
        break;
    }

    this.cdr.detectChanges();
  }

  // Successful scraping completion
  private handleScrapeDone(transactions: any[]) {
    this.closeEventSource();

    this.progressPercent = 100;
    this.progressMessage = 'Completed';

    this.processTransactionData(transactions);
    this.showMessage('Transactions loaded.', 'info');
    this.running = false;
  }

  // Scraping error returned by backend
  private handleScrapeError(msg?: string) {
    this.closeEventSource();
    this.showMessage(msg || 'Scraping failed', 'error');
    this.running = false;
  }

  // SSE connection error
  private handleSseError() {
    if (!this.running) return;
    this.closeEventSource();
    this.showMessage('Connection lost while receiving progress.', 'error');
    this.running = false;
  }

  // Close SSE connection
  private closeEventSource() {
    this.eventSource?.close();
    this.eventSource = null;
  }

  // Process transaction data and table display
  private processTransactionData(data: any) {
    const rows: any[] = Array.isArray(data) ? data : data?.transactions ?? [];

    if (!rows.length) {
      this.tableError = 'No transactions found.';
      return;
    }

    this.previewColumns = this.columns;
    this.previewRows = rows.map(row => Object.fromEntries(this.columns.map(c => [c, row[c]])));

    this.currentPage = 1;
    this.tableError = null;
  }

  // Load and display local JSON file
  async onFileSelected(evt: Event) {
    this.resetTable();

    const input = evt.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const rows = Array.isArray(data)
        ? data
        : data?.transactions ?? data?.items ?? [];

      if (!rows.length) {
        this.tableError = 'JSON format not recognized.';
        return;
      }

      this.previewColumns = Object.keys(rows[0]);
      this.previewRows = rows;
      this.currentPage = 1;
    } catch (err: any) {
      this.tableError = 'Failed to load JSON: ' + err.message;
    }
  }

  // Table for display
  formatCell(value: any): string {
    return value == null ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
  }

  // Pagination
  get pagedRows() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.previewRows.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.previewRows.length / this.pageSize));
  }

  goToPage(p: number) {
    this.currentPage = Math.min(Math.max(1, p), this.totalPages);
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage - 1);
  }

  // Common helper methods
  private resetProgress() {
    this.progressPercent = 0;
    this.progressMessage = 'Starting...';
  }

  private resetTable() {
    this.previewColumns = [];
    this.previewRows = [];
    this.tableError = null;
  }

  private showMessage(
    msg: string,
    type: 'info' | 'error' = 'info',
    autoClearMs = 5000
  ) {
    this.message = msg;
    this.messageType = type;

    setTimeout(() => {
      this.message = null;
      this.cdr.detectChanges();
    }, autoClearMs);
  }

  private handleRequestError(err: any) {
    if (err?.status === 401) {
      this.showMessage('Invalid username or password.', 'error');
    } else {
      this.showMessage('Request failed: ' + (err?.message || err), 'error');
    }
    this.running = false;
  }
}
