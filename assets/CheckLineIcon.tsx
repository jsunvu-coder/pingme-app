import Svg, { SvgProps, Path } from 'react-native-svg';
import { memo } from 'react';
const SvgComponent = (props: SvgProps) => (
  <Svg width={20} height={20} fill="none" {...props}>
    <Path
      d="M18.0896 3.5056C18.415 3.18016 18.415 2.65252 18.0896 2.32709C17.7641 2.00165 17.2365 2.00165 16.9111 2.32709L7.50033 11.7378L3.08958 7.32709C2.76414 7.00165 2.23651 7.00165 1.91107 7.32709C1.58563 7.65252 1.58563 8.18016 1.91107 8.5056L6.91107 13.5056C7.23651 13.831 7.76414 13.831 8.08958 13.5056L18.0896 3.5056Z"
      fill="currentColor"
    />
    <Path
      d="M2.91699 16.2497C2.45675 16.2497 2.08366 16.6228 2.08366 17.083C2.08366 17.5432 2.45675 17.9163 2.91699 17.9163H17.0837C17.5439 17.9163 17.917 17.5432 17.917 17.083C17.917 16.6228 17.5439 16.2497 17.0837 16.2497H2.91699Z"
      fill="currentColor"
    />
  </Svg>
);
const CheckLineIcon = memo(SvgComponent);
export default CheckLineIcon;
