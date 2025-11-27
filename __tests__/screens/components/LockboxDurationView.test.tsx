import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LockboxDurationView from 'screens/Send/PingMe/LockboxDurationView';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('LockboxDurationView', () => {
  it('should render with default value', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={14} onChange={onChange} />);

    expect(getByText('14 days')).toBeTruthy();
    expect(getByText('Recipient must claim within this time')).toBeTruthy();
  });

  it('should render singular day for value of 1', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={1} onChange={onChange} />);

    expect(getByText('1 day')).toBeTruthy();
  });

  it('should render plural days for value > 1', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={5} onChange={onChange} />);

    expect(getByText('5 days')).toBeTruthy();
  });

  it('should clamp value to MIN_DAYS when below minimum', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={0} onChange={onChange} />);

    expect(getByText('1 day')).toBeTruthy();
  });

  it('should clamp value to MAX_DAYS when above maximum', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={100} onChange={onChange} />);

    expect(getByText('30 days')).toBeTruthy();
  });

  it('should use LOCKBOX_DURATION for invalid values', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={NaN} onChange={onChange} />);

    expect(getByText('14 days')).toBeTruthy();
  });

  it('should round decimal values', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={7.6} onChange={onChange} />);

    expect(getByText('8 days')).toBeTruthy();
  });

  it('should open modal when display is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={14} onChange={onChange} />);

    const display = getByText('14 days');
    fireEvent.press(display);

    expect(getByText('Select duration')).toBeTruthy();
  });

  it('should call onChange when option is selected', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={14} onChange={onChange} />);

    // Open modal
    const display = getByText('14 days');
    fireEvent.press(display);

    // Select 7 days
    const option = getByText('7 days');
    fireEvent.press(option);

    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('should render lockbox duration label', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LockboxDurationView value={14} onChange={onChange} />);

    expect(getByText('Lockbox duration')).toBeTruthy();
  });
});
