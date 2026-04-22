import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useSelector } from 'react-redux';
import BellIcon from 'assets/BellIcon';
import { push } from 'navigation/Navigation';
import { selectNotificationCount } from 'store/notificationSlice';

type Props = Omit<TouchableOpacityProps, 'onPress'> & {
  /** Override default navigation behavior (go to NotificationsScreen). */
  onPress?: () => void;
  /** Override the icon fill color. Defaults to the bell's built-in orange. */
  color?: string;
  size?: number;
};

/**
 * Bell icon button that automatically swaps between the "no unread" and
 * "has unread" variants based on the Redux notification count, and navigates
 * to NotificationsScreen on press by default.
 */
export default function NotificationBellButton({
  onPress,
  color,
  size,
  hitSlop = 8,
  ...touchableProps
}: Props) {
  const count = useSelector(selectNotificationCount);
  const hasUnread = count > 0;

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => push('NotificationsScreen'))}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? `${count} new notifications` : 'Notifications'}
      {...touchableProps}>
      <BellIcon hasNotification={hasUnread} color={color} size={size} />
    </TouchableOpacity>
  );
}
