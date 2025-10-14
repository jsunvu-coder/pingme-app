// business/models/EventLog.ts

// Base structure returned from backend or blockchain
export interface EventLog {
	action: number;
	addr: string;
	amount: string;
	blockNumber: number;
	duration: number;
	fromCommitment?: string;
	toCommitment?: string;
	lockboxCommitment: string;
	timestamp: number;
	token: string;
	txHash: string;

	// 🔹 Derived and parsed fields for UI convenience
	amountNumber?: number; // amount in standard units (float)
	readableTime?: string; // localized human-readable string
	direction?: "sent" | "received" | "other"; // flow direction
}

// Response container from API
export interface EventResponse {
	commitment: string;
	events: EventLog[];
}
