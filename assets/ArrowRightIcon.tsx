import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={24}
    height={25}
    fill="none"
    {...props}
  >
    <Path
      fill="#FD4912"
      d="M9.293 7.043a1 1 0 0 0 0 1.414l4.293 4.293-4.293 4.293a1 1 0 1 0 1.414 1.414l5-5a1 1 0 0 0 0-1.414l-5-5a1 1 0 0 0-1.414 0Z"
    />
  </Svg>
)
const ArrowRightIcon = memo(SvgComponent)
export default ArrowRightIcon
