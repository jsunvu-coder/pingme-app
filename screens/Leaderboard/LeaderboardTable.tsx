import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { LeaderboardEntry } from 'store/leaderboardSlice';

type Column = {
  key: string;
  title: string;
  flex: number;
  align?: 'left' | 'right';
  // Optional accessor if the value does not come from `count`
  getValue?: (item: LeaderboardEntry) => number | string;
};

export type LeaderboardTableProps = {
  data: LeaderboardEntry[];
  columns: Column[];
  emptyText?: string;
};

function getOrdinal(index: number) {
  if (index === 0) return '1st';
  if (index === 1) return '2nd';
  if (index === 2) return '3rd';
  return `${index + 1}th`;
}

function maskEmail(email?: string) {
  if (!email) return '-';
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name[0]}*@${domain}`;
}

export function LeaderboardTable({ data, columns, emptyText }: LeaderboardTableProps) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 0.7 }]}>#</Text>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[
              styles.headerCell,
              {
                flex: col.flex,
                textAlign: col.align === 'right' ? 'right' : 'left',
              },
            ]}>
            {col.title}
          </Text>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyText ?? 'No data yet.'}</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const ordinal = getOrdinal(index);
          const isSelf = item.is_self;

          return (
            <View style={[styles.row, index % 2 === 1 && styles.rowAlt, isSelf && styles.rowSelf]}>
              <Text style={[styles.cellRank, isSelf && styles.cellRankSelf, { flex: 0.7 }]}>
                {isSelf ? 'YOU' : ordinal}
              </Text>
              {columns.map((col) => {
                const valueRaw =
                  col.getValue !== undefined ? col.getValue(item) : (item.count ?? 0);
                const value = typeof valueRaw === 'number' ? valueRaw : (valueRaw ?? '');
                return (
                  <Text
                    key={col.key}
                    style={[
                      styles.cellNumber,
                      isSelf && styles.cellNumberSelf,
                      {
                        flex: col.flex,
                        textAlign: col.align === 'right' ? 'right' : 'left',
                      },
                    ]}>
                    {value}
                  </Text>
                );
              })}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#FD4912',
  },
  headerCell: {
    color: '#FD4912',
    fontWeight: '400',
    fontSize: 12,
  },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E9E9E9',
  },
  rowAlt: {
    backgroundColor: '#FFF',
  },
  rowSelf: {
    borderColor: '#FD4912',
    marginVertical: 2,
    paddingHorizontal: 8,
  },
  cellRank: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F0F0F',
  },
  cellRankSelf: {
    fontSize: 14,
    color: '#FD4912',
    fontWeight: '700',
  },
  cellText: {
    fontSize: 13,
    color: '#0F0F0F',
  },
  cellNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F0F0F',
  },
  cellNumberSelf: {
    color: '#FD4912',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: '#0F0F0F',
  },
});

export default LeaderboardTable;
