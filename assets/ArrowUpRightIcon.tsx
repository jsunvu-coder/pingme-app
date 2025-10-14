import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"

const ArrowUpRightIcon = ({
  color = "#fff",
  size = 41,
  ...props
}: SvgProps & { color?: string; size?: number }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 41 41"   // 👈 important line added
    fill="none"
    {...props}
  >
    <Path
      fill={color}
      d="M32.542 8.375c.46 0 .833.373.833.833v18.334a.833.833 0 0 1-1.667 0V11.22L9.798 33.13a.833.833 0 1 1-1.179-1.178l21.91-21.91H14.21a.833.833 0 0 1 0-1.667h18.333Z"
    />
  </Svg>
)

export default memo(ArrowUpRightIcon)
