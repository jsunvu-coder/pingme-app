import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SpinnerIcon from 'assets/SpinnerIcon';
import { goBack } from 'navigation/Navigation';
import { AccountDataService } from 'business/services/AccountDataService';
import {
  DecryptedNotification,
  MessagingService,
  NotificationType,
} from 'business/services/MessagingService';

const C_BG = '#FAFAFA';
const C_CARD = '#FFFFFF';
const C_BLACK = '#0F0F0F';
const C_BODY = '#444444';
const C_MUTED = '#909090';
const C_BORDER = '#F4F4F4';
const C_RECEIVED = '#14B957';
const C_REQUESTED = '#1079F1';
const C_ORANGE = '#FD4912';

type Group = {
  label: string;
  items: DecryptedNotification[];
};

function formatDateTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${hh}:${mm}  |  ${day} ${month}, ${year}`;
}

function formatGroupLabel(d: Date, now: Date): string {
  const dayMs = 24 * 60 * 60 * 1000;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor((startOf(now) - startOf(d)) / dayMs);
  const datePart = `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`;
  if (diffDays <= 0) return `TODAY, ${datePart}`;
  if (diffDays === 1) return `YESTERDAY, ${datePart}`;
  return `${diffDays} DAYS AGO, ${datePart}`;
}

function groupByDay(items: DecryptedNotification[]): Group[] {
  const now = new Date();
  const buckets = new Map<string, DecryptedNotification[]>();
  for (const item of items) {
    const key = `${item.createdAt.getFullYear()}-${item.createdAt.getMonth()}-${item.createdAt.getDate()}`;
    const arr = buckets.get(key) ?? [];
    arr.push(item);
    buckets.set(key, arr);
  }
  return [...buckets.entries()]
    .map(([, arr]) => ({
      label: formatGroupLabel(arr[0].createdAt, now),
      items: arr,
    }))
    .sort((a, b) => b.items[0].createdAt.getTime() - a.items[0].createdAt.getTime());
}

function TypeIcon({ type }: { type: NotificationType }) {
  if (type === 'received') {
    return <Ionicons name="add" size={16} color={C_RECEIVED} />;
  }
  if (type === 'requested') {
    return <SpinnerIcon size={16} color={C_REQUESTED} />;
  }
  return <Ionicons name="mail-outline" size={14} color={C_MUTED} />;
}

async function openNotificationLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch (err) {
    console.warn('[NotificationsScreen] failed to open deep link', url, err);
  }
}

type CardProps = {
  item: DecryptedNotification;
  onPress: (item: DecryptedNotification) => void;
};

function NotificationCard({ item, onPress }: CardProps) {
  const typeLabel =
    item.type === 'received' ? 'RECEIVED' : item.type === 'requested' ? 'REQUESTED' : 'MESSAGE';
  const unread = !item.isHandled;

  const content = (
    <>
      <View style={styles.typeRow}>
        {unread ? <View style={styles.unreadDot} /> : null}
        <Text style={styles.typeLabel}>{typeLabel}</Text>
        <View style={styles.amountWrap}>
          <TypeIcon type={item.type} />
          <Text style={[styles.amountText, unread && styles.pendingText]}>
            {item.amountUsd ?? '—'}
          </Text>
          {item.tokenName ? (
            <Text style={[styles.tokenText, unread && styles.pendingText]}>{item.tokenName}</Text>
          ) : null}
        </View>
      </View>
      <Text style={[styles.email, unread && styles.pendingText]} numberOfLines={1}>
        {item.senderEmail ?? 'Could not read this message. Please check your mailbox.'}
      </Text>
      {item.customMessage ? <Text style={styles.note}>“{item.customMessage}”</Text> : null}
      <View style={styles.divider} />
      <View style={styles.dateRow}>
        <View style={styles.dateCell}>
          <Text style={styles.dateLabel}>Created at</Text>
          <Text style={styles.dateValue}>{formatDateTime(item.createdAt)}</Text>
        </View>
        <View style={[styles.dateCell, styles.dateCellRight]}>
          <Text style={styles.dateLabel}>Expires at</Text>
          <Text style={styles.dateValue}>{formatDateTime(item.expiredAt)}</Text>
        </View>
      </View>
    </>
  );

  if (!item.actionUrl) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => onPress(item)}>
      {content}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const email = AccountDataService.getInstance().email ?? '';
  const [items, setItems] = useState<DecryptedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!email) {
      setLoading(false);
      setError('Not signed in');
      return;
    }
    try {
      setError(null);
      const data = await MessagingService.getInstance().fetchNotifications(email);
      setItems(data);
    } catch (err: any) {
      console.error('[NotificationsScreen] fetch failed', err);
      setError('Could not load notifications. Pull to retry.');
    }
  }, [email]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCardPress = useCallback(async (item: DecryptedNotification) => {
    if (!item.actionUrl) return;
    // Mark handled optimistically so the PENDING label disappears immediately.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isHandled: true } : i)));
    try {
      await MessagingService.getInstance().markHandledActive(item.id);
      // Re-dispatch Redux unhandled count so the Account badge updates too.
      void MessagingService.getInstance().refreshActive();
    } catch (err) {
      console.warn('[NotificationsScreen] markHandled failed', err);
    }
    void openNotificationLink(item.actionUrl);
  }, []);

  const groups = useMemo(() => groupByDay(items), [items]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={() => goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={C_ORANGE} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={C_MUTED} />
          </View>
        ) : error ? (
          <Text style={styles.emptyText}>{error}</Text>
        ) : groups.length === 0 ? (
          <Text style={styles.emptyText}>No notifications yet.</Text>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={styles.groupBlock}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((item) => (
                <NotificationCard key={item.id} item={item} onPress={handleCardPress} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
  },
  headerSide: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '500',
    color: C_BLACK,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 16 },
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  emptyText: {
    textAlign: 'center',
    color: C_MUTED,
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 32,
  },
  groupBlock: { gap: 4 },
  groupLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: C_BODY,
    marginBottom: 4,
  },
  card: {
    backgroundColor: C_CARD,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
    gap: 8,
  },
  typeLabel: {
    color: C_MUTED,
    fontSize: 10,
    lineHeight: 14,
  },
  pendingText: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C_ORANGE,
  },
  amountWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  amountText: {
    color: C_BLACK,
    fontSize: 14,
    lineHeight: 22,
  },
  tokenText: {
    color: C_MUTED,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    marginLeft: 2,
  },
  email: {
    color: C_BLACK,
    fontSize: 14,
    lineHeight: 22,
  },
  note: {
    color: C_BODY,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: C_BORDER,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateCell: { gap: 4 },
  dateCellRight: { alignItems: 'flex-end' },
  dateLabel: { color: C_MUTED, fontSize: 10, lineHeight: 14 },
  dateValue: { color: C_BODY, fontSize: 10, lineHeight: 14 },
});
