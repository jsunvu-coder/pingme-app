import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PaymentAmountView from 'screens/Send/PingMe/PaymentAmountView';

jest.mock('components/AuthInput', () => {
  const { TextInput } = require('react-native');
  return function AuthInput(props: any) {
    return <TextInput {...props} testID="auth-input" />;
  };
});

describe('PaymentAmountView', () => {
  it('should render with send mode', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <PaymentAmountView value="" onChange={onChange} balance="100.00" mode="send" />
    );

    expect(getByText('Available: 100.00')).toBeTruthy();
  });

  it('should render with request mode', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <PaymentAmountView value="" onChange={onChange} balance="100.00" mode="request" />
    );

    expect(getByText('Current: 100.00')).toBeTruthy();
  });

  it('should call onChange when text is entered', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PaymentAmountView value="" onChange={onChange} balance="100.00" mode="send" />
    );

    const input = getByTestId('auth-input');
    fireEvent.changeText(input, '50.00');

    expect(onChange).toHaveBeenCalledWith('50.00');
  });

  it('should display the current value', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PaymentAmountView value="25.50" onChange={onChange} balance="100.00" mode="send" />
    );

    const input = getByTestId('auth-input');
    expect(input.props.value).toBe('25.50');
  });

  it('should have decimal-pad keyboard type', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PaymentAmountView value="" onChange={onChange} balance="100.00" mode="send" />
    );

    const input = getByTestId('auth-input');
    expect(input.props.keyboardType).toBe('decimal-pad');
  });

  it('should have Amount placeholder', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PaymentAmountView value="" onChange={onChange} balance="100.00" mode="send" />
    );

    const input = getByTestId('auth-input');
    expect(input.props.placeholder).toBe('Amount');
  });
});
