import { BalanceService } from "business/services/BalanceService";
import { EventService } from "business/services/EventService";
import { ContractService } from "business/services/ContractService";
import { BalanceEntry } from "business/Types";
import { EventLog } from "business/models/EventLog";

/**
 * High-level singleton data manager combining balances + event logs + forwarder.
 * Provides an in-memory cache accessible globally across the app.
 */
export class AccountDataService {
	private static instance: AccountDataService;

	private balances: BalanceEntry[] = [];
	private records: EventLog[] = [];
	private forwarder: string | null = null;

	private lastUpdated: number | null = null;
	private loading = false;
	private refreshPromise: Promise<void> | null = null;

	email?: string

	private readonly balanceService = BalanceService.getInstance();
	private readonly eventService = EventService.getInstance();
	private readonly contractService = ContractService.getInstance();

	private constructor() { }

	static getInstance(): AccountDataService {
		if (!AccountDataService.instance) {
			AccountDataService.instance = new AccountDataService();
		}
		return AccountDataService.instance;
	}

	// ---------------------------------------------------------------------
	// Public Accessors
	// ---------------------------------------------------------------------
	getBalances(): BalanceEntry[] {
		return this.balances;
	}

	getRecords(): EventLog[] {
		return this.records;
	}

	getForwarderValue(): string | null {
		return this.forwarder;
	}

	getLastUpdated(): number | null {
		return this.lastUpdated;
	}

	isLoading(): boolean {
		return this.loading;
	}

	// ---------------------------------------------------------------------
	// Refresh balances + events (cached globally)
	// ---------------------------------------------------------------------
	async refreshData(force = false): Promise<void> {
		if (this.loading && !force) {
			console.log("⏳ AccountDataService: already loading, skipping duplicate call.");
			return this.refreshPromise ?? Promise.resolve();
		}

		this.loading = true;
		this.refreshPromise = (async () => {
			try {
				console.log("🔄 AccountDataService refreshing data...");

				// 1️⃣ Fetch balance
				await this.balanceService.getBalance();
				this.balances = this.balanceService.currentBalances ?? [];

				// 2️⃣ Fetch events
				const events = await this.eventService.getEvents();
				this.records = this.parseEvents(events);

				// 3️⃣ Optionally refresh forwarder
				await this.getForwarder(true); // refresh cache silently

				this.lastUpdated = Date.now();

				console.log(
					`✅ AccountDataService refreshed: ${this.balances.length} balances, ${this.records.length} events, forwarder=${this.forwarder}`
				);
			} catch (err) {
				console.error("❌ AccountDataService refresh failed:", err);
			} finally {
				this.loading = false;
				this.refreshPromise = null;
			}
		})();

		return this.refreshPromise;
	}

	/**
	 * Returns cached data if available, otherwise fetches fresh data.
	 */
	async getOrFetchData(): Promise<{
		balances: BalanceEntry[];
		records: EventLog[];
		forwarder: string | null;
	}> {
		if (this.records.length > 0 && this.balances.length > 0 && this.forwarder) {
			console.log("📦 Returning cached AccountDataService data.");
			return {
				balances: this.balances,
				records: this.records,
				forwarder: this.forwarder,
			};
		}

		await this.refreshData();
		return {
			balances: this.balances,
			records: this.records,
			forwarder: this.forwarder,
		};
	}

	// ---------------------------------------------------------------------
	// 🔑 Forwarder Management
	// ---------------------------------------------------------------------
	async getForwarder(force = false): Promise<string | null> {
		// if cached and not forced, return existing
		if (this.forwarder && !force) {
			return this.forwarder;
		}

		try {
			const cr = this.contractService.getCrypto();
			if (!cr?.commitment) {
				console.warn("⚠️ AccountDataService: Missing commitment for forwarder request.");
				return null;
			}

			const result = await this.contractService.getForwarder(cr.commitment);
			this.forwarder = result?.forwarder || null;

			console.log("✅ Forwarder updated:", this.forwarder);
			return this.forwarder;
		} catch (err) {
			console.error("❌ GET_FORWARDER failed:", err);
			this.forwarder = null;
			return null;
		}
	}

	// ---------------------------------------------------------------------
	// Helpers: event parsing + timestamp formatting
	// ---------------------------------------------------------------------
	private parseEvents(events: EventLog[]) {
		return events.map((e) => ({
			...e,
			amountNumber: parseFloat(e.amount ?? "0") / 1_000_000,
			readableTime: this.formatTimestamp(e.timestamp),
			direction: this.classifyEvent(e),
		}));
	}

	private classifyEvent(e: EventLog): "sent" | "received" | "other" {
		if (e.action === 9) return "sent";
		if (e.action === 0) return "received";
		return "other";
	}

	private formatTimestamp(timestamp: number): string {
		if (!timestamp) return "Unknown";
		const date = new Date(timestamp * 1000);
		return date.toLocaleString("en-US", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	// ---------------------------------------------------------------------
	// Cache utilities
	// ---------------------------------------------------------------------
	getCachedEvents(): EventLog[] {
		return this.eventService.getCachedEvents();
	}

	clearCache(): void {
		this.balances = [];
		this.records = [];
		this.forwarder = null;
		this.lastUpdated = null;
		this.eventService.clearCache();
		console.log("🧹 AccountDataService cache cleared.");
	}
}
