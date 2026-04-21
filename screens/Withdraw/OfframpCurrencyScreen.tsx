import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import NavigationBar from 'components/NavigationBar';
import { push } from 'navigation/Navigation';
import { FIAT_CURRENCIES } from 'screens/TopUp/OnrampCurrencyScreen';

export default function OfframpCurrencyScreen() {
  return (
    <View className="flex-1 bg-[#fafafa]">
      <NavigationBar title="Select Currency" />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-sm text-gray-500">
          Choose the currency you want to receive
        </Text>

        {FIAT_CURRENCIES.map((currency) => (
          <TouchableOpacity
            key={currency.code}
            activeOpacity={0.7}
            onPress={() => push('OfframpProviderScreen', { currency })}
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
