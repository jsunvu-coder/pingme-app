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
      fill="#fff"
      fillRule="evenodd"
      d="M7.65 3.232c1.042-1.81 3.659-1.81 4.7 0l6.245 10.84c1.04 1.807-.27 4.053-2.351 4.053H3.756c-2.081 0-3.391-2.246-2.35-4.053l6.243-10.84Zm1.725 8.435v-5a.625.625 0 0 1 1.25 0v5a.625.625 0 0 1-1.25 0Zm-.208 2.916a.833.833 0 1 1 1.666 0 .833.833 0 0 1-1.666 0Z"
      clipRule="evenodd"
    />
  </Svg>
)
const WarningIcon = memo(SvgComponent)
export default WarningIcon
