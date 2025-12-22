import * as React from 'react';
import Svg, { SvgProps, Path } from 'react-native-svg';
import { memo } from 'react';
const SvgComponent = (props: SvgProps) => (
  <Svg xmlns="http://www.w3.org/2000/svg" width={80} height={80} fill="none" {...props}>
    <Path
      fill="#14B957"
      d="M57.845 24.512a1.667 1.667 0 1 0-2.357-2.357L37.155 40.488a1.667 1.667 0 1 0 2.357 2.357l18.333-18.333ZM7.845 38.821a1.667 1.667 0 0 0-2.357 2.357l16.667 16.667c.65.65 1.706.65 2.357 0l1.666-1.667a1.667 1.667 0 0 0-2.357-2.357l-.488.489L7.845 38.82Z"
    />
    <Path
      fill="#14B957"
      d="M74.512 24.512a1.667 1.667 0 1 0-2.357-2.357L40 54.309 24.512 38.822a1.667 1.667 0 0 0-2.357 2.357L38.82 57.845c.651.65 1.707.65 2.358 0l33.333-33.333Z"
    />
  </Svg>
);
const DoubleCheckIcon = memo(SvgComponent);
export default DoubleCheckIcon;
