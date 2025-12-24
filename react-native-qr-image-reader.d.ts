declare module 'react-native-qr-image-reader' {
  const QrImageReader: {
    decode(options: { path: string }): Promise<{ result?: string }>;
  };

  export default QrImageReader;
}
