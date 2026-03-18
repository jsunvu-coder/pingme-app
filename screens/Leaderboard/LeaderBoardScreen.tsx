import NavigationBar from 'components/NavigationBar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { AccountDataService } from 'business/services/AccountDataService';
import { fetchLeaderboardData } from 'store/leaderboardSlice';
import LeaderboardSelectorTabs from './LeaderboardSelectorTabs';
import LeaderboardTable from './LeaderboardTable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabKey = 'referrals' | 'interactions' | 'pings';

type LeaderboardSectionHeaderProps = {
  title: string;
  subtitle?: string;
};

function LeaderboardSectionHeader({ title, subtitle }: LeaderboardSectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubText}>{subtitle}</Text> : null}
    </View>
  );
}

export default function LeaderBoardScreen() {
  const [selectedType, setSelectedType] = useState<TabKey>('referrals');
  const dispatch = useAppDispatch();
  const { stats, leaders, loading, error } = useAppSelector((state) => {
    const accountEmail = AccountDataService.getInstance().email;
    if (!accountEmail) {
      return {
        stats: null,
        leaders: null,
        loading: false,
        error: null,
      };
    }
    const accountKey = accountEmail.toLowerCase();
    const accountState = state.leaderboard.byAccount[accountKey];
    return (
      accountState ?? {
        stats: null,
        leaders: null,
        loading: false,
        error: null,
      }
    );
  });

  useEffect(() => {
    dispatch(fetchLeaderboardData());
  }, [dispatch]);

  const { bottom } = useSafeAreaInsets();

  const config: Record<
    TabKey,
    {
      title: string;
      subtitle: string;
      data: any[];
      columns: any[];
      emptyText: string;
    }
  > | null =
    stats && leaders
      ? {
          referrals: {
            title: 'Your stats',
            subtitle: `1st: ${stats.referrals.count} · 2nd: ${stats.referrals.second}`,
            data: leaders.referrals,
            columns: [
              {
                key: 'first',
                title: '1st Referee',
                flex: 1.3,
                align: 'right',
                getValue: (item: any) => item.first ?? item.count ?? 0,
              },
              {
                key: 'second',
                title: '2nd Referee',
                flex: 1.3,
                align: 'right',
                getValue: (item: any) => item.second ?? 0,
              },
            ],
            emptyText: 'No referrals yet.',
          },
          interactions: {
            title: 'Your stats',
            subtitle: `Total interactions: ${stats.interactions}`,
            data: leaders.interactions,
            columns: [
              {
                key: 'count',
                title: 'Interactions',
                flex: 1.3,
                align: 'right',
              },
            ],
            emptyText: 'No interactions yet.',
          },
          pings: {
            title: 'Your stats',
            subtitle: `Total pings: ${stats.pings}`,
            data: leaders.pings,
            columns: [
              {
                key: 'count',
                title: 'Total Ping',
                flex: 1.3,
                align: 'right',
              },
            ],
            emptyText: 'No pings yet.',
          },
        }
      : null;

  const current = config ? config[selectedType] : null;


  console.log('current', leaders?.pings);
  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <StatusBar barStyle="dark-content" />
      <NavigationBar title="Leaderboard" />
      <View style={{ padding: 16 }}>
        <LeaderboardSelectorTabs selectedType={selectedType} setSelectedType={setSelectedType} />
      </View>
      <View style={{ paddingHorizontal: 16, flex: 1 }}>
        {loading && (
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <ActivityIndicator />
          </View>
        )}

        {!loading && error && <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>}

        {!loading && !error && current && (
          <View style={{ flex: 1, paddingBottom: bottom }}>
            <LeaderboardTable
              data={current.data}
              columns={current.columns}
              emptyText={current.emptyText}
            />
            <LeaderboardSectionHeader title={current.title} subtitle={current.subtitle} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  sectionSubText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
});
