import { useState, useRef, useEffect } from "react";
import {
	View,
	ScrollView,
	Animated,
	Text,
	Alert,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NavigationBar from "components/NavigationBar";
import PrimaryButton from "components/PrimaryButton";
import SecurityNotice from "./SecurityNotice";
import RecoveryInfoSection from "./RecoveryInfoSection";
import SaveConfirmation from "./SaveConfirmation";
import ConfirmRecoveryModal from "./ConfirmRecoveryModal";
import RecoverySuccessView from "./RecoverySuccessView";

import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { ContractService } from "business/services/ContractService";
import { CryptoUtils } from "business/CryptoUtils";
import { Utils } from "business/Utils";
import { GLOBALS, GLOBAL_SALT, ZERO_BYTES32 } from "business/Constants";
import { AuthService } from "business/services/AuthService";
import { QRCodeCard } from "./QRCodeCard";

export default function PasswordRecoveryScreen() {
	// === UI States ===
	const [saved, setSaved] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);

	// === Logic States ===
	const [loading, setLoading] = useState(true);
	const [recoveryPk, setRecoveryPk] = useState<string | null>(null);
	const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const qrRef = useRef<any | null>(null);

	// === Lifecycle: Check recovery status ===
	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				setLoading(true);
				const contract = ContractService.getInstance();
				const cr = contract.getCrypto();
				if (!cr || !cr.input_data) {
					console.warn("Recovery: crypto state missing. Please sign in first.");
					return;
				}

				const globals = Utils.getSessionObject(GLOBALS);
				const saltHex = globals?.[GLOBAL_SALT];
				const rvProof = CryptoUtils.globalHash2(cr.input_data, saltHex);
				if (!rvProof) throw new Error("Failed to compute recovery proof.");
				const rvCommit = CryptoUtils.globalHash(rvProof);
				if (!rvCommit) throw new Error("Failed to compute recovery commitment.");

				const ret = await contract.rvGetRecoveryPk(rvCommit);
				if (!isMounted) return;
				setRecoveryPk(ret?.recoveryPk ?? null);
			} catch (e: any) {
				console.error("Recovery mount failed", e);
				Alert.alert("Error", e?.message || "Failed to load recovery status");
			} finally {
				if (isMounted) setLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	// === Core: Setup recovery logic ===
	const handleSetup = async () => {
		try {
			setLoading(true);

			const contract = ContractService.getInstance();
			const auth = AuthService.getInstance();
			const cr = contract.getCrypto();
			if (!cr || !cr.input_data) throw new Error("Missing crypto state");

			// Compute recovery commitment
			const globals = Utils.getSessionObject(GLOBALS);
			const saltHex = globals?.[GLOBAL_SALT];
			const rvProof = CryptoUtils.globalHash2(cr.input_data, saltHex);
			if (!rvProof) throw new Error("Failed to compute recovery proof");
			const rvCommitment = CryptoUtils.globalHash(rvProof);
			if (!rvCommitment) throw new Error("Failed to compute recovery commitment");

			// Generate recovery code and derive keys
			const code = CryptoUtils.randomString(16);
			const codeHash = CryptoUtils.globalHash(CryptoUtils.strToHex(code));
			if (!codeHash) throw new Error("Failed to compute code hash");
			const recPriv = await CryptoUtils.hkdf32(
				CryptoUtils.hexToBytes(codeHash),
				new TextEncoder().encode("rv-seed"),
				new TextEncoder().encode("pw-recovery-v1-seed")
			);
			const recPub = CryptoUtils.x25519PublicKey(recPriv);

			const eph = CryptoUtils.x25519Ephemeral();
			const shared = CryptoUtils.x25519Shared(eph.priv, recPub);
			const aesKey = await CryptoUtils.hkdf32(
				shared,
				CryptoUtils.hexToBytes(saltHex),
				new TextEncoder().encode("pw-recovery-v1")
			);

			// Extract current password from input_data
			const inputStr = CryptoUtils.hexToStr(cr.input_data);
			const idx = inputStr.indexOf(":");
			const password = idx >= 0 ? inputStr.slice(idx + 1) : "";

			const padded = CryptoUtils.padTo32(new TextEncoder().encode(password));
			const { ct, tag, nonce } = await CryptoUtils.aesGcmEncrypt256(aesKey, padded);

			const recoveryPkHex = CryptoUtils.bytesToHex(recPub);
			const ctKemHex = CryptoUtils.bytesToHex(eph.pub);
			const ctHex = CryptoUtils.bytesToHex(ct);
			const tagHex = CryptoUtils.bytesToHex(tag);
			const nonceHex = CryptoUtils.bytesToHex(nonce);

			const rvCommitmentHash = CryptoUtils.globalHash(rvCommitment);
			if (!rvCommitmentHash) throw new Error("Failed to compute rv commitment hash");

			await auth.rvCommitProtect(
				() =>
					contract.rvInitialize(
						rvCommitment,
						recoveryPkHex,
						ctKemHex,
						ctHex,
						tagHex,
						nonceHex
					),
				rvCommitment,
				rvCommitmentHash
			);

			setRecoveryPk(recoveryPkHex);
			setRecoveryCode(code); // show QR only once
		} catch (e: any) {
			console.error("Recovery initialize failed", e);
			Alert.alert("Error", e?.message || "Failed to setup recovery");
		} finally {
			setLoading(false);
		}
	};

	// === QR Download logic ===
	const handleDownload = () => {
		qrRef.current?.toDataURL(async (data: string) => {
			try {
				const permission = await MediaLibrary.requestPermissionsAsync();
				if (!permission.granted) {
					Alert.alert(
						"Permission Required",
						"Please allow Photo Library access to save the QR image."
					);
					return;
				}

				const fileUri = FileSystem.cacheDirectory + "recovery-qr.png";
				await FileSystem.writeAsStringAsync(fileUri, data, {
					encoding: FileSystem.EncodingType.Base64,
				});
				await MediaLibrary.saveToLibraryAsync(fileUri);
				Alert.alert("Saved", "Recovery QR code has been saved to your Photos.");
			} catch (e: any) {
				Alert.alert("Error", e?.message || "Failed to save QR image");
			}
		});
	};

	// === Checkbox logic ===
	const handleCheckbox = (value: boolean) => {
		setSaved(value);
		if (value) setShowConfirm(true);
	};

	// === Confirm modal ===
	const handleConfirm = () => {
		setShowConfirm(false);
		setShowSuccess(true);
		fadeAnim.setValue(0);
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 600,
			useNativeDriver: true,
		}).start();
		// after confirmation, clear recovery code
		setRecoveryCode(null);
	};

	useEffect(() => {
		if (!showSuccess) fadeAnim.setValue(0);
	}, [showSuccess]);

	// === Loading or initialization ===
	if (loading || recoveryPk == null) {
		return (
			<View className="flex-1 bg-black items-center justify-center">
				<ActivityIndicator size="large" color="#ffffff" />
			</View>
		);
	}

	// === Already has recovery ===
	if (recoveryPk !== ZERO_BYTES32 && !recoveryCode && !showSuccess) {
		return (
			<View className="flex-1 bg-black items-center justify-center px-6 py-8">
				<Text className="text-center text-lg font-semibold text-white">
					Recovery credential already exists
				</Text>
				<Text className="mt-2 text-center text-sm text-[#CCCCCC]">
					A recovery key is already set for this account. The recovery code is only shown
					once at the time of setup and cannot be displayed again.
				</Text>
			</View>
		);
	}

	// === Main UI ===
	return (
		<View className="flex-1 bg-[#FAFAFA]">
			<SafeAreaView edges={["top"]} className="pb-4 px-4">
				<NavigationBar title="Password Recovery" />
			</SafeAreaView>

			{!showSuccess && (
				<ScrollView className="flex-1 p-6 bg-black">
					<SecurityNotice />
					<RecoveryInfoSection />

					{/* Display QR only when new recovery generated */}
					{recoveryCode && (
						<QRCodeCard value={recoveryCode} getRef={(r: any) => (qrRef.current = r)} />
					)}

					<View className="mt-8 self-center">
						<PrimaryButton
							title={recoveryPk === ZERO_BYTES32 ? "Setup Recovery" : "Download QR Code"}
							onPress={
								recoveryPk === ZERO_BYTES32
									? handleSetup
									: handleDownload
							}
							loading={loading}
						/>
					</View>

					<SaveConfirmation saved={saved} onToggle={handleCheckbox} />

					<View className="h-24" />
				</ScrollView>
			)}

			{showSuccess && <RecoverySuccessView />}

			{/* Bottom Sheet Modal */}
			<ConfirmRecoveryModal
				visible={showConfirm}
				onClose={() => setShowConfirm(false)}
				onConfirm={handleConfirm}
			/>
		</View>
	);
}
