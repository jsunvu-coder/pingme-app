import { EventLog } from 'business/models/EventLog';
import { AccountDataService } from 'business/services/AccountDataService';

export class PingHistoryViewModel {
  private accountData = AccountDataService.getInstance();

  async loadEvents(): Promise<EventLog[]> {
    await this.accountData.refreshData();
    const records = this.accountData.getRecords();
    return this.parseEventLogs(records || []);
  }

  private parseEventLogs(rawEvents: EventLog[]): EventLog[] {
    return rawEvents.map((e) => {
      let direction: 'sent' | 'received' | 'other' = 'other';
      let amountNumber = Number(e.amount ?? 0);
      let displayLabel = '';
      let color = '';
      let iconName = '';
      let iconColor = '';
      let sign = '';

      switch (e.action) {
        case 9: // Payment → Outgoing (-)
          direction = 'sent';
          amountNumber = -Math.abs(amountNumber);
          displayLabel = 'Payment';
          sign = '-';
          color = 'text-red-500';
          iconName = 'arrow-up';
          iconColor = '#EF4444';
          break;

        case 0: // Claim → Incoming (+)
          direction = 'received';
          amountNumber = Math.abs(amountNumber);
          displayLabel = 'Claim';
          sign = '+';
          color = 'text-green-500';
          iconName = 'arrow-down';
          iconColor = '#fff';
          break;

        case 2: // New Balance → Incoming (+)
          direction = 'received';
          amountNumber = Math.abs(amountNumber);
          displayLabel = 'New Balance';
          sign = '+';
          color = 'text-green-500';
          iconName = 'arrow-down';
          iconColor = '#fff';
          break;

        default:
          direction = 'other';
          amountNumber = 0;
          displayLabel = 'Deposit';
          sign = '';
          color = 'text-gray-500';
          iconName = 'arrow-up';
          iconColor = '#fff';
          break;
      }

      const readableTime = new Date(e.timestamp * 1000).toLocaleString('en-CA', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const amountDisplay = `${sign}${(Math.abs(amountNumber) / 1_000_000).toFixed(2)}`;

      return {
        ...e,
        direction,
        amountNumber,
        readableTime,
        displayLabel,
        amountDisplay,
        color,
        iconName,
        iconColor,
      };
    });
  }

  /** Group parsed events by human-readable date */
  groupByDate(events: EventLog[]): Record<string, EventLog[]> {
    return events.reduce<Record<string, EventLog[]>>((acc, event) => {
      const timestamp = Number(event.timestamp) * 1000;
      if (!timestamp || isNaN(timestamp)) return acc;

      const label = new Date(timestamp).toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      if (!acc[label]) acc[label] = [];
      acc[label].push(event);
      return acc;
    }, {});
  }

  /** Filter events by direction */
  filterEvents(events: EventLog[], filter: 'all' | 'send' | 'receive'): EventLog[] {
    if (filter === 'all') return events;
    return events.filter((e) => {
      if (!e.direction) return false;
      if (filter === 'send') return e.direction === 'sent';
      if (filter === 'receive') return e.direction === 'received';
      return true;
    });
  }
}
