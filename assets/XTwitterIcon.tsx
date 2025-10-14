import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={41}
    height={41}
    fill="none"
    {...props}
  >
    <Path
      fill="#fff"
      d="M22.809 17.76 34.945 3.651H32.07l-10.538 12.25-8.416-12.25H3.408l12.727 18.523L3.408 36.97h2.876l11.128-12.936L26.3 36.97h9.707l-13.199-19.21h.001Zm-3.939 4.578-1.29-1.844L7.32 5.817h4.417l8.28 11.845 1.29 1.844 10.764 15.396h-4.418L18.87 22.339Z"
    />
  </Svg>
)
const XTwitterIcon = memo(SvgComponent)
export default XTwitterIcon
