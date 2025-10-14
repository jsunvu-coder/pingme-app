import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={57}
    height={56}
    fill="none"
    {...props}
  >
    <Path
      fill="#14B957"
      d="M39.07 5.763a1.75 1.75 0 1 0-2.474 2.474L47.609 19.25H14.5a1.75 1.75 0 1 0 0 3.5h37.333a1.75 1.75 0 0 0 1.238-2.987l-14-14ZM17.93 50.237a1.75 1.75 0 0 0 2.474-2.474L9.392 36.75H42.5a1.75 1.75 0 1 0 0-3.5H5.167a1.75 1.75 0 0 0-1.238 2.987l14 14Z"
    />
  </Svg>
)
const ArrowLeftRightIcon = memo(SvgComponent)
export default ArrowLeftRightIcon
