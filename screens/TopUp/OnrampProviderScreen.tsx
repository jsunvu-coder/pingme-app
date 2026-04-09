import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import NavigationBar from 'components/NavigationBar';
import { push } from 'navigation/Navigation';
import type { FiatCurrency } from './OnrampCurrencyScreen';

export type Provider = {
  key: string;
  name: string;
  description: string;
  supportedCurrencies: string[]; // currency codes, empty = supports all
};

const PROVIDERS: Provider[] = [
  {
    key: 'onramp',
    name: 'Onramp Money',
    description: 'Buy crypto with local payment methods including bank transfer',
    supportedCurrencies: [], // empty = all currencies
  },
];

type Props = {
  route: { params: { currency: FiatCurrency } };
};

export default function OnrampProviderScreen({ route }: Props) {
  const { currency } = route.params;

  const availableProviders = PROVIDERS.filter(
    (p) => p.supportedCurrencies.length === 0 || p.supportedCurrencies.includes(currency.code)
  );

  return (
    <View className="flex-1 bg-[#fafafa]">
      <NavigationBar title="Select Provider" />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-sm text-gray-500">
          Choose a provider to buy with{' '}
          <Text className="font-semibold text-gray-700">
            {currency.flag} {currency.code}
          </Text>
        </Text>

        {availableProviders.map((provider) => (
          <TouchableOpacity
            key={provider.key}
            activeOpacity={0.7}
            onPress={() =>
              push('OnrampScreen', {
                fiatType: currency.fiatType,
                providerKey: provider.key,
              })
            }
            className="mb-3 rounded-2xl bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-[#FD4912]">{provider.name}</Text>
              <Text className="text-[#FD4912]">›</Text>
            </View>
            <Text className="mt-2 text-sm leading-5 text-gray-600">{provider.description}</Text>
          </TouchableOpacity>
        ))}

        {availableProviders.length === 0 && (
          <View className="mt-10 items-center">
            <Text className="text-center text-sm text-gray-400">
              No providers available for {currency.code} yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
