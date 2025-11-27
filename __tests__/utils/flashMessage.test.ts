import { showFlashMessage } from 'utils/flashMessage';
import * as flashMessageModule from 'react-native-flash-message';

// Use the mocked module from jest.setup.js
const showMessage = flashMessageModule.showMessage as jest.Mock;

describe('showFlashMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show message with default type', () => {
    showFlashMessage({ message: 'Test message' });

    expect(showMessage).toHaveBeenCalledWith({
      message: 'Test message',
      description: undefined,
      type: 'default',
      icon: undefined,
      floating: true,
      duration: 2500,
      onHide: undefined,
    });
  });

  it('should show message with title and description', () => {
    showFlashMessage({
      message: 'Description text',
      title: 'Title text',
    });

    expect(showMessage).toHaveBeenCalledWith({
      message: 'Title text',
      description: 'Description text',
      type: 'default',
      icon: undefined,
      floating: true,
      duration: 2500,
      onHide: undefined,
    });
  });

  it('should show success message with auto icon', () => {
    showFlashMessage({
      message: 'Success!',
      type: 'success',
    });

    expect(showMessage).toHaveBeenCalledWith({
      message: 'Success!',
      description: undefined,
      type: 'success',
      icon: 'success',
      floating: true,
      duration: 2500,
      onHide: undefined,
    });
  });

  it('should show danger message with auto icon', () => {
    showFlashMessage({
      message: 'Error!',
      type: 'danger',
    });

    expect(showMessage).toHaveBeenCalledWith({
      message: 'Error!',
      description: undefined,
      type: 'danger',
      icon: 'danger',
      floating: true,
      duration: 2500,
      onHide: undefined,
    });
  });

  it('should show warning message with custom icon', () => {
    showFlashMessage({
      message: 'Warning!',
      type: 'warning',
      icon: 'info',
    });

    expect(showMessage).toHaveBeenCalledWith({
      message: 'Warning!',
      description: undefined,
      type: 'warning',
      icon: 'info',
      floating: true,
      duration: 2500,
      onHide: undefined,
    });
  });

  it('should call onHide callback', () => {
    const onHide = jest.fn();
    showFlashMessage({
      message: 'Test',
      onHide,
    });

    expect(showMessage).toHaveBeenCalledWith({
      message: 'Test',
      description: undefined,
      type: 'default',
      icon: undefined,
      floating: true,
      duration: 2500,
      onHide,
    });
  });

  it('should show info message', () => {
    showFlashMessage({
      message: 'Info message',
      type: 'info',
    });

    expect(showMessage).toHaveBeenCalledWith({
      message: 'Info message',
      description: undefined,
      type: 'info',
      icon: 'info',
      floating: true,
      duration: 2500,
      onHide: undefined,
    });
  });
});
