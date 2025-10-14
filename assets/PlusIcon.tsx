import * as React from "react"
import Svg, { SvgProps, G, Path, Defs, ClipPath } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={32}
    height={32}
    fill="none"
    {...props}
  >
    <G clipPath="url(#a)">
      <Path
        fill="#fff"
        fillRule="evenodd"
        d="M.333 15.999C.333 7.346 7.348.332 16 .332c8.653 0 15.667 7.014 15.667 15.667 0 8.652-7.014 15.666-15.667 15.666C7.348 31.665.333 24.651.333 16ZM16 22.332a1 1 0 0 1-1-1v-4.333h-4.333a1 1 0 1 1 0-2H15v-4.334a1 1 0 1 1 2 0V15h4.334a1 1 0 1 1 0 2H17v4.333a1 1 0 0 1-1 1Z"
        clipRule="evenodd"
      />
    </G>
    <Defs>
      <ClipPath id="a">
        <Path fill="#fff" d="M0 0h32v32H0z" />
      </ClipPath>
    </Defs>
  </Svg>
)
const PlusIcon = memo(SvgComponent)
export default PlusIcon
