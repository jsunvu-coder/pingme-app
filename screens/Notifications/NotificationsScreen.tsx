import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml, { HTMLContentModel, defaultHTMLElementModels } from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SpinnerIcon from 'assets/SpinnerIcon';
import { goBack } from 'navigation/Navigation';
import { AccountDataService } from 'business/services/AccountDataService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
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
    await deepLinkHandler.handleURL(url, { keepStack: true });
  } catch (err) {
    console.warn('[NotificationsScreen] failed to open deep link', url, err);
  }
}

type CardProps = {
  item: DecryptedNotification;
  onPress: (item: DecryptedNotification) => void;
};

const HTML_BASE_STYLE = {
  color: C_BLACK,
  fontSize: 14,
  lineHeight: 22,
} as const;

const HTML_TAGS_STYLES = {
  body: { margin: 0, padding: 0 },
  p: { marginTop: 0, marginBottom: 10, color: C_BLACK },
  h1: {
    fontSize: 20,
    lineHeight: 28,
    color: C_BLACK,
    fontWeight: '700' as const,
    marginTop: 8,
    marginBottom: 16,
  },
  h2: {
    fontSize: 17,
    lineHeight: 24,
    color: C_BLACK,
    fontWeight: '700' as const,
    marginTop: 0,
    marginBottom: 8,
  },
  h3: {
    fontSize: 15,
    lineHeight: 22,
    color: C_BLACK,
    fontWeight: '600' as const,
    marginTop: 0,
    marginBottom: 6,
  },
  strong: { fontWeight: '700' as const, color: C_BLACK },
  b: { fontWeight: '700' as const, color: C_BLACK },
  em: { fontStyle: 'italic' as const },
  i: { fontStyle: 'italic' as const },
  ul: { marginTop: 0, marginBottom: 6, paddingLeft: 18 },
  ol: { marginTop: 0, marginBottom: 6, paddingLeft: 18 },
  li: { marginBottom: 2 },
  blockquote: {
    marginTop: 0,
    marginBottom: 6,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: C_BORDER,
    color: C_BODY,
    fontStyle: 'italic' as const,
  },
  hr: { marginTop: 8, marginBottom: 8, height: 1, backgroundColor: C_BORDER, borderWidth: 0 },
  code: {
    backgroundColor: C_BG,
    color: C_BLACK,
    fontFamily: 'Courier',
    fontSize: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  span: {},
};

const HTML_RENDERERS_PROPS = {
  a: {
    onPress: (_event: unknown, href: string) => {
      void openNotificationLink(href);
    },
  },
};

// Promote <a> from phrasing-only to mixed so block-level inline styles
// (background-color, padding, border-radius, display:block, margin:auto)
// from email HTML actually render — otherwise RNRH treats <a> as text only.
// Defaults live in `mixedUAStyles` (lowest CSS specificity) so any inline
// `style="..."` from the email overrides them cleanly (e.g. the orange
// "Claim Now" pill button keeps its inline color/background/radius).
const HTML_CUSTOM_ELEMENT_MODELS = {
  a: defaultHTMLElementModels.a.extend({
    contentModel: HTMLContentModel.mixed,
    mixedUAStyles: {
      color: C_REQUESTED,
      textDecorationLine: 'underline',
      fontWeight: '500',
    },
  }),
};

const HTML_SCALE = 0.8;

function isHtmlPayload(html: string): boolean {
  return html.trimStart().startsWith('<');
}

// Email templates use <table>/<tr>/<td> for client compatibility.
// react-native-render-html has no table renderer, so it drops inline styles
// on descendants. Rewrite table layout tags to <div> while preserving the
// style="..." (and other) attributes so RNRH processes them as plain blocks.
const TABLE_TAGS_RE = /<(\/?)(table|tbody|thead|tfoot|tr|td|th|colgroup|col)(\s[^>]*)?>/gi;
// Email HTML often pretty-prints inline `style="..."` across multiple lines,
// which trips RNRH's CSS-to-RN-style processor. Collapse whitespace inside
// every `style="..."` so each declaration parses cleanly.
const STYLE_ATTR_RE = /\bstyle\s*=\s*"([^"]*)"/gi;
// CSS unitless line-height (e.g. `line-height: 1.3`) means "ratio of
// font-size" in browsers, but RNRH's CSS-to-RN processor parses it as
// 1.3 pixels — collapsing the line box and clipping large heading glyphs.
// Convert it to an absolute px value using the same style block's
// font-size when available; strip it otherwise so tagsStyles takes over.
function fixUnitlessLineHeight(css: string): string {
  const fontSizeMatch = css.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i);
  return css.replace(/line-height\s*:\s*(\d+(?:\.\d+)?)\s*(?=;|$)/gi, (_full, ratio: string) => {
    if (fontSizeMatch) {
      const px = Math.round(parseFloat(ratio) * parseFloat(fontSizeMatch[1]));
      return `line-height: ${px}px`;
    }
    return '';
  });
}
function normalizeInlineStyles(html: string): string {
  return html.replace(STYLE_ATTR_RE, (_m, css: string) => {
    const collapsed = css.replace(/\s+/g, ' ').trim();
    const fixed = fixUnitlessLineHeight(collapsed)
      .replace(/;{2,}/g, ';')
      .replace(/^;|;$/g, '')
      .trim();
    return `style="${fixed}"`;
  });
}
function extractBodyInner(html: string): string {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  // No <body> — strip <!DOCTYPE>/<html>/<head> if present, else return as-is.
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html\b[^>]*>/gi, '')
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
}
// Email templates often nest 2-3 tables for layout (outer page bg + inner
// "card" with max-width / padding). On mobile we already have our own card,
// so strip the wrappers down to the innermost <td> — the one that directly
// holds the message body (heuristic: contains <h1> and no nested <td>).
const INNERMOST_TD_RE = /<td\b[^>]*>((?:(?!<\/?td\b)[\s\S])*?)<\/td>/gi;
function extractMessageBody(html: string): string {
  for (const m of html.matchAll(INNERMOST_TD_RE)) {
    if (/<h1\b/i.test(m[1])) return m[1];
  }
  return html;
}
// Heading inline shorthand `margin: 0 0 40px 0` wins over tagsStyles and
// pins marginTop to 0, which causes large heading glyphs (font-size 36px)
// to clip against the previous element on RN. Strip margin declarations
// from <h1>-<h6> so our tagsStyles spacing applies.
const HEADING_WITH_STYLE_RE = /<(h[1-6])\b([^>]*?)\sstyle\s*=\s*"([^"]*)"([^>]*)>/gi;
const MARGIN_DECL_RE = /(?:^|;)\s*margin(?:-top|-right|-bottom|-left)?\s*:\s*[^;]+;?/gi;
function stripHeadingMargins(html: string): string {
  return html.replace(
    HEADING_WITH_STYLE_RE,
    (_m, tag: string, before: string, css: string, after: string) => {
      const cleaned = css
        .replace(MARGIN_DECL_RE, ';')
        .replace(/;{2,}/g, ';')
        .replace(/^;|;$/g, '')
        .trim();
      return cleaned ? `<${tag}${before} style="${cleaned}"${after}>` : `<${tag}${before}${after}>`;
    }
  );
}
function prepareEmailHtml(html: string): string {
  const inner = extractBodyInner(html);
  const body = extractMessageBody(inner);
  const tablesStripped = body.replace(
    TABLE_TAGS_RE,
    (_m, slash: string, _tag: string, attrs?: string) => `<${slash}div${attrs ?? ''}>`
  );
  return stripHeadingMargins(normalizeInlineStyles(tablesStripped));
}

function NotificationCard({ item, onPress }: CardProps) {
  const { width } = useWindowDimensions();
  const typeLabel =
    item.type === 'received' ? 'RECEIVED' : item.type === 'requested' ? 'REQUESTED' : 'MESSAGE';
  const unread = !item.isHandled;
  const htmlMode = isHtmlPayload(item.html);
  const htmlSource = useMemo(
    () => (htmlMode ? { html: prepareEmailHtml(item.html) } : { html: '' }),
    [htmlMode, item.html]
  );
  // Card horizontal padding (12) * 2 + screen horizontal padding (16) * 2 = 56
  const htmlContentWidth = Math.max(0, width - 56);
  // Render the email body at 1/HTML_SCALE wider than the card, then scale
  // down so the visible content fits the card at HTML_SCALE size. Measure
  // the unscaled height via onLayout so the parent reserves the right space.
  const [htmlInnerHeight, setHtmlInnerHeight] = useState(0);
  const htmlScaledWidth = htmlContentWidth / HTML_SCALE;

  const content = htmlMode ? (
    <>
      <View style={styles.typeRow}>
        {unread ? <View style={styles.unreadDot} /> : null}
        <Text style={styles.typeLabel}>{typeLabel}</Text>
      </View>
      <RenderHtml
        contentWidth={htmlContentWidth}
        source={htmlSource}
        baseStyle={HTML_BASE_STYLE}
        tagsStyles={HTML_TAGS_STYLES}
        renderersProps={HTML_RENDERERS_PROPS}
        customHTMLElementModels={HTML_CUSTOM_ELEMENT_MODELS}
        enableCSSInlineProcessing
        enableExperimentalMarginCollapsing
      />
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
  ) : (
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
