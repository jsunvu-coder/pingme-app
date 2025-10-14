import * as React from "react"
import Svg, { SvgProps, G, Path, Defs, ClipPath } from "react-native-svg"
import { memo } from "react"
const SvgComponent = ({isActive, ...props}: SvgProps & {isActive: boolean}) => (
  <Svg
    width={25}
    height={24}
    fill="none"
    {...props}
  >
    <G fill={isActive ? "#fff": "#929393"} clipPath="url(#a)">
      <Path
        fillRule="evenodd"
        d="M9.75 2.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm-4 5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
        clipRule="evenodd"
      />
      <Path d="M2.245 21.07c.456-3.188 3.682-5.57 7.506-5.57 3.823 0 7.049 2.382 7.504 5.57a.5.5 0 1 0 .99-.14c-.544-3.812-4.317-6.43-8.494-6.43-4.178 0-7.951 2.618-8.496 6.43a.5.5 0 0 0 .99.14ZM24.25 12a.5.5 0 0 1-.5.5h-2.5V15a.5.5 0 0 1-1 0v-2.5h-2.5a.5.5 0 1 1 0-1h2.5V9a.5.5 0 1 1 1 0v2.5h2.5a.5.5 0 0 1 .5.5Z" />
    </G>
    <Defs>
      <ClipPath id="a">
        <Path fill={isActive ? "#fff": "#929393"} d="M.75 0h24v24h-24z" />
      </ClipPath>
    </Defs>
  </Svg>
)
const AddUserIcon = memo(SvgComponent)
export default AddUserIcon
