import SendConfirmationView from './SendConfirmationView';

// Page-style variant of the send-confirmation flow used when opened from
// inside the app (e.g. tapping a payment request in Notifications). Registered
// with the default `card` presentation in RootNavigator so it is opaque and
// the prior screen does not bleed through on Android.
export default function SendConfirmationPageScreen() {
  return <SendConfirmationView mode="page" />;
}
