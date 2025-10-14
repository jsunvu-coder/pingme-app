import { URL } from "business/Config";
import { push } from "navigation/Navigation";

export const handleQRCode = (data: string) => {
    console.log("Scanned data:", data);
    const isSupported = data.startsWith(URL)
    const params = data.replace(URL, "")

    if (!isSupported) { return }

    if (params.startsWith("/claim")) {
        push('ClaimPaymentScreen', { qrData: params })
        return
    }

    if (params.startsWith("/send")) {
        const email = params.replace("/send/email=", "")
        push("MainTab", { screen: "Ping Now", params: { mode: "send", email } });

        return
    }

    console.warn("Invalid QR data");
};