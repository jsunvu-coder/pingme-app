import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <Path
      fill="#3B3A3A"
      d="M11.458 1.875v1.274a8.086 8.086 0 0 1 4.434 1.742l1.166-1.166a.625.625 0 0 1 .884.884l-1.135 1.134A8.125 8.125 0 0 1 5.213 17.118a.625.625 0 0 1 .865-.903A6.875 6.875 0 1 0 4.227 9.34a.625.625 0 0 1-1.201-.347 8.13 8.13 0 0 1 7.182-5.844V1.875H8.333a.625.625 0 1 1 0-1.25h5a.625.625 0 1 1 0 1.25h-1.875Z"
    />
    <Path
      fill="#3B3A3A"
      d="M13.808 8.74a.625.625 0 1 0-.95-.813l-2.5 2.916a.625.625 0 1 0 .95.814l2.5-2.917ZM1.042 11.667c0-.345.28-.625.625-.625h5a.625.625 0 1 1 0 1.25h-5a.625.625 0 0 1-.625-.625ZM3.333 13.542a.625.625 0 1 0 0 1.25h5a.625.625 0 0 0 0-1.25h-5Z"
    />
  </Svg>
)
const ClockIcon = memo(SvgComponent)
export default ClockIcon
