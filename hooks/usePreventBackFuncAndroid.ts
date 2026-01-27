import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

const usePreventBackFuncAndroid = (disablePreventBack: boolean = false) => {
  useFocusEffect(
    useCallback(() => {
      if (!disablePreventBack) {
        const onBackPress = () => {
          // return true to prevent back, don't exit app
          return true;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => {
          subscription.remove();
        };
      }
    }, [disablePreventBack])
  );
};

export default usePreventBackFuncAndroid;
