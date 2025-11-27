import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PingMeScreen from 'screens/Send/PingMe/PingMeScreen';
import { showFlashMessage } from 'utils/flashMessage';

jest.mock('utils/flashMessage', () => ({
  showFlashMessage: jest.fn(),
}));

jest.mock('navigation/Navigation', () => ({
  push: jest.fn(),
  setRootScreen: jest.fn(),
}));

describe('PingMeScreen validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows flash message when amount missing', async () => {
    const { getByText } = render(<PingMeScreen />);

    const button = getByText('Continue');
    fireEvent.press(button);

    await waitFor(() => {
      expect(showFlashMessage).toHaveBeenCalled();
    });
  });
});
