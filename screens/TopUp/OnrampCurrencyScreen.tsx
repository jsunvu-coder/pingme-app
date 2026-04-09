import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import NavigationBar from 'components/NavigationBar';
import { push } from 'navigation/Navigation';

export type FiatCurrency = {
  code: string;
  name: string;
  flag: string;
  fiatType?: number; // undefined = not passed to SDK (SDK shows all dashboard-enabled currencies)
};

export const FIAT_CURRENCIES: FiatCurrency[] = [
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', fiatType: 1 },
  { code: 'AED', name: 'Arab Emirates Dirham', flag: '🇦🇪', fiatType: 3 },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽', fiatType: 4 },
  { code: 'VND', name: 'Vietnamese Dong', flag: '🇻🇳', fiatType: 5 },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬', fiatType: 6 },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷', fiatType: 7 },
  { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴', fiatType: 9 },
  { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱', fiatType: 10 },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭', fiatType: 11 },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', fiatType: 12 },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩', fiatType: 14 },
  { code: 'KES', name: 'Kenya Shillings', flag: '🇰🇪', fiatType: 15 },
  { code: 'RWF', name: 'Rwandan Franc', flag: '🇷🇼', fiatType: 18 },
  { code: 'XAF', name: 'Central African CFA Franc', flag: '🇨🇲', fiatType: 19 },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', fiatType: 20 },
  { code: 'BWP', name: 'Botswana Pula', flag: '🇧🇼', fiatType: 22 },
  { code: 'MWK', name: 'Malawian Kwacha', flag: '🇲🇼', fiatType: 23 },
  { code: 'TZS', name: 'Tanzanian Shilling', flag: '🇹🇿', fiatType: 24 },
  { code: 'UGX', name: 'Ugandan Shilling', flag: '🇺🇬', fiatType: 25 },
  { code: 'ZMW', name: 'Zambian Kwacha', flag: '🇿🇲', fiatType: 26 },
  { code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷', fiatType: 29 },
  { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱', fiatType: 33 },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', fiatType: 50 },
  { code: 'XOF', name: 'West African CFA Franc', flag: '🇧🇯', fiatType: 39 },
  { code: 'GAB', name: 'Central African CFA Franc (Gabon)', flag: '🇬🇦', fiatType: 41 },
  { code: 'COG', name: 'Central African CFA Franc (Congo)', flag: '🇨🇬', fiatType: 42 },
];

export default function OnrampCurrencyScreen() {
  return (
    <View className="flex-1 bg-[#fafafa]">
      <NavigationBar title="Select Currency" />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-sm text-gray-500">Choose the currency you want to pay with</Text>

        {FIAT_CURRENCIES.map((currency) => (
          <TouchableOpacity
            key={currency.code}
            activeOpacity={0.7}
            onPress={() => push('OnrampProviderScreen', { currency })}
            className="mb-3 flex-row items-center rounded-2xl bg-white p-5">
            <Text className="text-3xl">{currency.flag}</Text>
            <View className="ml-4 flex-1">
              <Text className="text-base font-semibold text-gray-900">{currency.code}</Text>
              <Text className="text-sm text-gray-500">{currency.name}</Text>
            </View>
            <Text className="text-[#FD4912]">›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
