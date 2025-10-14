import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"

const ArrowDownLeftIcon = ({
  color = "#fff",
  size = 41,
  ...props
}: SvgProps & { color?: string; size?: number }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 41 41"  // 👈 key for proper scaling
    fill="none"
    {...props}
  >
    <Path
      fill={color}
      d="M8.958 33.375a.833.833 0 0 1-.833-.833V14.208a.833.833 0 0 1 1.667 0V30.53l21.91-21.91a.833.833 0 1 1 1.179 1.178l-21.91 21.91h16.32a.833.833 0 0 1 0 1.667H8.959Z"
    />
  </Svg>
)

export default memo(ArrowDownLeftIcon)
