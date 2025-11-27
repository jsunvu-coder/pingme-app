import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ChannelSelectView from 'screens/Send/PingMe/ChannelSelectView';

describe('ChannelSelectView', () => {
  it('should render both Email and Link options', () => {
    const onChange = jest.fn();
    const { getByText } = render(<ChannelSelectView active="Email" onChange={onChange} />);

    expect(getByText('Send Email')).toBeTruthy();
    expect(getByText('Share Link')).toBeTruthy();
    expect(getByText('Recipient will receive the email to claim')).toBeTruthy();
    expect(getByText('You will share payment link to the recipient')).toBeTruthy();
  });

  it('should call onChange when Email option is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(<ChannelSelectView active="Link" onChange={onChange} />);

    fireEvent.press(getByText('Send Email'));

    expect(onChange).toHaveBeenCalledWith('Email');
  });

  it('should call onChange when Link option is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(<ChannelSelectView active="Email" onChange={onChange} />);

    fireEvent.press(getByText('Share Link'));

    expect(onChange).toHaveBeenCalledWith('Link');
  });

  it('should highlight active option (Email)', () => {
    const onChange = jest.fn();
    const { getByText } = render(<ChannelSelectView active="Email" onChange={onChange} />);

    const emailOption = getByText('Send Email');
    expect(emailOption.props.className).toContain('text-[#FD4912]');
  });

  it('should highlight active option (Link)', () => {
    const onChange = jest.fn();
    const { getByText } = render(<ChannelSelectView active="Link" onChange={onChange} />);

    const linkOption = getByText('Share Link');
    expect(linkOption.props.className).toContain('text-[#FD4912]');
  });

  it('should not highlight inactive option', () => {
    const onChange = jest.fn();
    const { getByText } = render(<ChannelSelectView active="Email" onChange={onChange} />);

    const linkOption = getByText('Share Link');
    expect(linkOption.props.className).toContain('text-gray-900');
    expect(linkOption.props.className).not.toContain('text-[#FD4912]');
  });
});
