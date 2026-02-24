import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAppDispatch } from 'store/hooks';
import { fetchHistoryToRedux } from 'store/historyThunks';
import AniCover from './AniCover';
import usePreventBackFuncAndroid from 'hooks/usePreventBackFuncAndroid';
import { Utils } from 'business/Utils';

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

  return (
    <View className="flex-1 bg-[#F5E9E1]">
      <AniCover offsetAdjustment={80} containerHeightAdjustment={80} containerBottomAdjustment={115} showSendHongbaoButton={true} >
        {/* Amount */}
        <Text className="text-center text-3xl font-bold text-[#982C0B]">
          {isClaimed? "You have already claimed": "You claimed"}
        </Text>
        <Text className="text-center text-3xl font-bold text-[#982C0B]">
          {displayAmount}
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
              <View className="flex-row items-center flex-1 mr-2">
                <Text
                  className={`w-12 text-sm font-medium ${item.isCurrentUser ? ' text-[#E85D35]' : 'text-gray-600'}`}
                >
                  {Utils.getOrdinalSuffix(item.rank)}
                </Text>
                <Text
                  className={`text-sm flex-1 ${item.isCurrentUser ? 'font-bold text-[#E85D35]' : 'text-gray-800'}`}
                  numberOfLines={1}
                  ellipsizeMode="middle"
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
      </AniCover>
    </View>

  );
}
