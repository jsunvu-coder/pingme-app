// viewmodels/PingMeViewModel.ts
import { Alert } from "react-native";
import { push } from "navigation/Navigation";
import { LOCKBOX_DURATION } from "business/Constants";
import { BalanceService } from "business/services/BalanceService";
import { PayService } from "api/PayService";
import { RequestService } from "api/RequestService";
import { RecentEmailStorage } from "./RecentEmailStorage";

export class PingMeViewModel {
	private payService: PayService;
	private requestService: RequestService;
	private balanceService: BalanceService;

	constructor() {
		this.payService = PayService.getInstance();
		this.requestService = RequestService.getInstance();
		this.balanceService = BalanceService.getInstance();
	}

	getTotalBalance(): string {
		return `$${this.balanceService.totalBalance ?? 0}`;
	}

	private async confirm(message: string, okOnly: boolean = false): Promise<boolean> {
		return new Promise((resolve) => {
			Alert.alert(
				"Confirmation",
				message,
				okOnly
					? [{ text: "OK", onPress: () => resolve(true) }]
					: [
							{ text: "Cancel", style: "cancel", onPress: () => resolve(false) },
							{ text: "Confirm", onPress: () => resolve(true) },
					  ]
			);
		});
	}

	async handleContinue({
		mode,
		activeChannel,
		amount,
		email,
		entry,
		setLoading,
		setTxHash,
		setPayLink,
	}: {
		mode: "send" | "request";
		activeChannel: "Email" | "Link";
		amount: string;
		email: string;
		entry: any;
		setLoading: (v: boolean) => void;
		setTxHash: (v?: string) => void;
		setPayLink: (v?: string) => void;
	}) {
		try {
			const numericAmount = parseFloat(amount);
			if (!numericAmount || numericAmount <= 0) {
				Alert.alert("Invalid amount", "Please enter a valid payment amount.");
				return;
			}

			let recipient = "";
			if (activeChannel === "Email") {
				if (!email.trim()) {
					Alert.alert("Missing email", "Please enter a recipient email address.");
					return;
				}
				recipient = email.trim();

				// 💾 Save email to local storage
				await RecentEmailStorage.save(recipient);
			}

			// ---------- Request Mode ----------
			if (mode === "request") {
				push("RequestConfirmationScreen", {
					amount: numericAmount,
					displayAmount: `$${numericAmount.toFixed(2)}`,
					recipient,
					channel: activeChannel,
					lockboxDuration: LOCKBOX_DURATION,
					mode,
				});
				return;
			}

			// ---------- Send Mode ----------
			console.log("🚀 [PingMeViewModel] Initiating PayService flow...");
			setLoading(true);

			await this.payService.pay({
				entry,
				username: recipient,
				amount: amount,
				passphrase: "", // Optional for small payments
				days: LOCKBOX_DURATION,
				confirm: this.confirm.bind(this),
				setLoading,
				setTxHash,
				setPayLink,
			});

			console.log("🎉 [PingMeViewModel] Payment complete!");
		} catch (error) {
			console.error("❌ [PingMeViewModel] handleContinue failed:", error);
			Alert.alert("Error", "Something went wrong during the payment process.");
		} finally {
			setLoading(false);
		}
	}
}
