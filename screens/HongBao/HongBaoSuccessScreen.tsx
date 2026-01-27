import { useEffect, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { setRootScreen } from 'navigation/Navigation';
import PrimaryButton from 'components/PrimaryButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from 'store/hooks';
import { fetchHistoryToRedux } from 'store/historyThunks';
import AniCover from './AniCover';
import usePreventBackFuncAndroid from 'hooks/usePreventBackFuncAndroid';

type RankingItem = {
  rank: number;
  username: string;
  amount: string;
  isCurrentUser?: boolean;
};

export type HongBaoSuccessParams = {
  amount?: number;
  amountUsdStr?: string;
  ranking?: RankingItem[];
  remainingCount?: number;
  isClaimed?: boolean;
};

/**
 * Convert number to ordinal string (1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", etc.)
 */
const getOrdinalSuffix = (num: number): string => {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;

  // Special cases: 11th, 12th, 13th
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${num}th`;
  }

  // Regular cases
  switch (lastDigit) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
};

export default function HongBaoSuccessScreen() {
  const route = useRoute();
  const dispatch = useAppDispatch();

  const {
    amount = 0,
    amountUsdStr,
    ranking = [],
    remainingCount = 0,
    isClaimed = false,
  } = (route.params as HongBaoSuccessParams) || {};
  const displayAmount = amountUsdStr ?? amount.toFixed(2);

  usePreventBackFuncAndroid();

  // Refresh history in Redux when success screen mounts
  useEffect(() => {
    void fetchHistoryToRedux(dispatch);
  }, [dispatch]);

  const handleSendHongbao = () => {
    // Navigate to HongBao tab in MainTab
    setRootScreen([
      {
        name: 'MainTab',
        params: {
          screen: 'HongBao',
        },
      },
    ]);
  };

  const handleGoHome = () => {
    setRootScreen(['MainTab']);
  };

  return (
    <View className="flex-1 bg-[#F5E9E1]">


      <AniCover offsetAdjustment={80} containerHeightAdjustment={80}>
        {/* Amount */}
        <Text className="text-center text-3xl font-bold text-[#982C0B]">
          {isClaimed? "You are already claimed": "You claimed"}
        </Text>
        <Text className="text-center text-3xl font-bold text-[#982C0B]">
          ${displayAmount}
        </Text>

        {/* Subtitle */}
        <Text className="mt-2 text-center text-base text-[#444]">
          {remainingCount} Hongbao left to claim.{'\n'}Here's how you ranked:
        </Text>

        {/* Ranking List */}
        <View className="mt-4">
          {ranking.map((item) => (
            <View
              key={item.rank}
              className={`flex-row items-center justify-between border-b border-[#982C0B] py-4 px-2 ${item.isCurrentUser ? 'bg-[#fff]' : ''}`}
            >
              <View className="flex-row items-center">
                <Text
                  className={`w-12 text-sm font-medium ${item.isCurrentUser ? ' text-[#E85D35]' : 'text-gray-600'}`}
                >
                  {getOrdinalSuffix(item.rank)}
                </Text>
                <Text
                  className={`text-sm ${item.isCurrentUser ? 'font-bold text-[#E85D35]' : 'text-gray-800'}`}
                >
                  {item.username}
                </Text>
              </View>
              <Text
                className={`text-sm ${item.isCurrentUser ? 'font-bold text-[#E85D35]' : 'text-gray-800'}`}
              >
                {item.amount}
              </Text>
            </View>
          ))}
        </View>

        {/* Send Hongbao Button */}
        <View className="mt-8">
          <PrimaryButton title="Send a Hongbao" onPress={handleSendHongbao} />
        </View>

        <TouchableOpacity onPress={handleGoHome} className='mx-auto mt-6'>
          <Text className="text-center text-base  text-[#FD4912] underline">
            Go to Homepage
          </Text>
        </TouchableOpacity>
      </AniCover>
    </View>

  );
}
