import React, { useEffect, useState } from "react";
import { Camera } from "expo-camera";
import CameraPermissionView from "./CameraPermissionView";
import { NoPermissionView } from "./NoPermissionView";
import { push } from "navigation/Navigation";
import { URL } from "business/Config";
import QRScanner from "./QrScanner";
import { useNavigation } from "@react-navigation/native";
import { handleQRCode } from "./QRHandler";

export default function ScanQRView() {
    const navigation = useNavigation<any>();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [deniedPermanently, setDeniedPermanently] = useState(false);

    useEffect(() => {
        checkPermissionStatus();
    }, []);

    const checkPermissionStatus = async () => {
        const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
        if (status === "granted") {
            setHasPermission(true);
        } else {
            setHasPermission(false);
            setDeniedPermanently(!canAskAgain);
        }
    };

    const requestPermission = async () => {
        const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
        if (status === "granted") {
            setHasPermission(true);
        } else {
            setHasPermission(false);
            setDeniedPermanently(!canAskAgain);
        }
    };

    const handleAllow = async () => {
        await requestPermission();
    };

    const handleNotAllow = () => {
        setHasPermission(false);
    };

    // === Case 1: Still loading
    if (hasPermission === null) {
        return (
            <CameraPermissionView
                allowAction={handleAllow}
                notAllowAction={handleNotAllow}
            />
        );
    }

    // === Case 2: Permission not granted
    if (!hasPermission) {
        if (deniedPermanently) {
            return <NoPermissionView />
        }

        return (
            <CameraPermissionView
                allowAction={handleAllow}
                notAllowAction={handleNotAllow}
            />
        );
    }

    // === Case 3: Permission granted
    return <QRScanner onScanSuccess={handleQRCode} />;
}
