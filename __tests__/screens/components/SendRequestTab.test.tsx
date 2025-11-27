import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import SendRequestTab from 'screens/Send/PingMe/SendRequestTab';

jest.mock('components/AnimatedSegmentedTabs', () => {
  const RN = jest.requireActual('react-native');
  return function AnimatedSegmentedTabs({ tabs, activeKey, onChange, children }: any) {
    return (
      <>
        {tabs.map((tab: any) => (
          <RN.Text
            key={tab.key}
            onPress={() => onChange(tab.key)}
            testID={`tab-${tab.key}`}
            className={activeKey === tab.key ? 'active' : 'inactive'}>
            {tab.label}
          </RN.Text>
        ))}
        {children}
      </>
    );
  };
});

describe('SendRequestTab', () => {
  it('should render send and request tabs', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SendRequestTab
        mode="send"
        onChange={onChange}
        sendContent={<Text>Send Content</Text>}
        requestContent={<Text>Request Content</Text>}
      />
    );

    expect(getByText('Send')).toBeTruthy();
    expect(getByText('Request')).toBeTruthy();
  });

  it('should display send content when mode is send', () => {
    const onChange = jest.fn();
    const { getByText, queryByText } = render(
      <SendRequestTab
        mode="send"
        onChange={onChange}
        sendContent={<Text>Send Content</Text>}
        requestContent={<Text>Request Content</Text>}
      />
    );

    expect(getByText('Send Content')).toBeTruthy();
    expect(queryByText('Request Content')).toBeNull();
  });

  it('should display request content when mode is request', () => {
    const onChange = jest.fn();
    const { getByText, queryByText } = render(
      <SendRequestTab
        mode="request"
        onChange={onChange}
        sendContent={<Text>Send Content</Text>}
        requestContent={<Text>Request Content</Text>}
      />
    );

    expect(getByText('Request Content')).toBeTruthy();
    expect(queryByText('Send Content')).toBeNull();
  });

  it('should call onChange when send tab is pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SendRequestTab
        mode="request"
        onChange={onChange}
        sendContent={<Text>Send Content</Text>}
        requestContent={<Text>Request Content</Text>}
      />
    );

    fireEvent.press(getByTestId('tab-send'));

    expect(onChange).toHaveBeenCalledWith('send');
  });

  it('should call onChange when request tab is pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SendRequestTab
        mode="send"
        onChange={onChange}
        sendContent={<Text>Send Content</Text>}
        requestContent={<Text>Request Content</Text>}
      />
    );

    fireEvent.press(getByTestId('tab-request'));

    expect(onChange).toHaveBeenCalledWith('request');
  });

  it('should mark send tab as active when mode is send', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SendRequestTab
        mode="send"
        onChange={onChange}
        sendContent={<Text>Send Content</Text>}
        requestContent={<Text>Request Content</Text>}
      />
    );

    const sendTab = getByTestId('tab-send');
    expect(sendTab.props.className).toBe('active');
  });

  it('should mark request tab as active when mode is request', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SendRequestTab
        mode="request"
        onChange={onChange}
        sendContent={<Text>Send Content</Text>}
        requestContent={<Text>Request Content</Text>}
      />
    );

    const requestTab = getByTestId('tab-request');
    expect(requestTab.props.className).toBe('active');
  });
});
