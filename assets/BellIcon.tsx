import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"
const SvgComponent = ({color = "#fff", ...props}: SvgProps & {color: string}) => (
  <Svg
    width={32}
    height={32}
    fill="none"
    {...props}
  >
    <Path
      fill={color}
      fillRule="evenodd"
      d="M16 1.668a9.76 9.76 0 0 0-9.72 8.877l-.237 2.608a15.177 15.177 0 0 1-2.487 7.045l-.044.066a3.047 3.047 0 0 0 2.535 4.737h19.906a3.047 3.047 0 0 0 2.535-4.737l-.044-.066a15.178 15.178 0 0 1-2.487-7.045l-.237-2.608A9.76 9.76 0 0 0 16 1.668Zm-7.728 9.058a7.76 7.76 0 0 1 15.456 0l.237 2.608a17.178 17.178 0 0 0 2.815 7.973l.044.067a1.047 1.047 0 0 1-.87 1.627H6.046a1.047 1.047 0 0 1-.871-1.627l.044-.067a17.177 17.177 0 0 0 2.814-7.973l.238-2.608Z"
      clipRule="evenodd"
    />
    <Path
      fill={color}
      d="M13.4 26.834a1 1 0 1 0-1.73 1.001 4.998 4.998 0 0 0 4.33 2.5 4.998 4.998 0 0 0 4.33-2.5 1 1 0 1 0-1.73-1.001c-.52.9-1.49 1.5-2.6 1.5a2.998 2.998 0 0 1-2.6-1.5Z"
    />
  </Svg>
)
const BellIcon = memo(SvgComponent)
export default BellIcon
