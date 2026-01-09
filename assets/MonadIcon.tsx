import * as React from 'react';
import Svg, { SvgProps, Path, Rect } from 'react-native-svg';
import { memo } from 'react';
const SvgComponent = (props: SvgProps) => (
  <Svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
    <Rect width={48} height={48} rx={24} fill="#6E54FF" />
    <Path
      d="M23.9999 8.6001C19.6121 8.6001 8.80533 19.5526 8.80533 24C8.80533 28.4474 19.6121 39.4001 23.9999 39.4001C28.3878 39.4001 39.1947 28.4472 39.1947 24C39.1947 19.5528 28.3879 8.6001 23.9999 8.6001ZM21.6321 32.8062C19.7818 32.2952 14.807 23.4755 15.3113 21.6002C15.8156 19.7247 24.5175 14.6829 26.3678 15.194C28.2182 15.705 33.193 24.5245 32.6887 26.4C32.1844 28.2754 23.4824 33.3173 21.6321 32.8062Z"
      fill="#FBFAF9"
    />
  </Svg>
);

const MonadIcon = memo(SvgComponent);
export default MonadIcon;
