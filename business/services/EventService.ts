import axios from "axios";
import { API_URL } from "business/Config";
import { EventLog, EventResponse } from "business/models/EventLog";
import { ContractService } from "business/services/ContractService";

export class EventService {
	private static instance: EventService;

	private events: EventLog[] = [];
	private lastCommitment: string | null = null;
	private lastFetchedAt: number | null = null;

	private constructor() { }

	/**
	 * Singleton accessor
	 */
	static getInstance(): EventService {
		if (!EventService.instance) {
			EventService.instance = new EventService();
		}
		return EventService.instance;
	}

	/**
	 * Fetch events automatically using the current commitment
	 * from ContractService. Caches results in memory.
	 */
	async getEvents(): Promise<EventLog[]> {
		try {
			const contractService = ContractService.getInstance();
			const cr = contractService.getCrypto();

			if (!cr?.commitment) {
				console.warn("⚠️ No active crypto commitment found — skipping event fetch.");
				return [];
			}

			const commitment = cr.commitment;
			console.log("🌐 Fetching events for commitment:", commitment);

			const res = await axios.post<EventResponse>(`${API_URL}/pm_get_events`, {
				commitment,
			});

			console.log(
				`✅ [POST] /pm_get_events (${res.status}) - ${res.data.events?.length || 0} events`
			);

			console.log("🔄 Cached events:", this.events);

			this.events = res.data.events ?? [];
			this.lastCommitment = res.data.commitment;
			this.lastFetchedAt = Date.now();

			return this.events;
		} catch (err) {
			console.error("❌ Failed to fetch events:", err);
			return [];
		}
	}

	/**
	 * Returns cached events from memory.
	 */
	getCachedEvents(): EventLog[] {
		return this.events;
	}

	/**
	 * Returns the last fetched commitment.
	 */
	getLastCommitment(): string | null {
		return this.lastCommitment;
	}

	/**
	 * Returns the timestamp of the last successful fetch.
	 */
	getLastFetchedTime(): number | null {
		return this.lastFetchedAt;
	}

	/**
	 * Clears in-memory cache.
	 */
	clearCache(): void {
		this.events = [];
		this.lastCommitment = null;
		this.lastFetchedAt = null;
		console.log("🧹 EventService cache cleared.");
	}
}
