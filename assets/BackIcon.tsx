import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={32}
    height={32}
    fill="none"
    {...props}
  >
    <Path
      fill="#FD4912"
      d="M19.61 8.39c.52.521.52 1.365 0 1.886L13.885 16l5.723 5.724a1.333 1.333 0 1 1-1.885 1.886l-6.667-6.667a1.333 1.333 0 0 1 0-1.886l6.667-6.666c.52-.521 1.365-.521 1.885 0Z"
    />
  </Svg>
)
const BackIcon = memo(SvgComponent)
export default BackIcon
