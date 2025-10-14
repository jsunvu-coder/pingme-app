import * as React from "react"
import Svg, { SvgProps, G, Path, Defs, ClipPath } from "react-native-svg"
import { memo } from "react"
const SvgComponent = ({ isSelected, ...props }: SvgProps & { isSelected: boolean }) => (
  isSelected ? Selected(props) : Unselected(props)
)
const CheckCircleIcon = memo(SvgComponent)
export default CheckCircleIcon

const Selected = (props: SvgProps) => (
  <Svg
    width={14}
    height={14}
    fill="none"
    {...props}
  >
    <G clipPath="url(#a)">
      <Path
        fill="#14B957"
        fillRule="evenodd"
        d="M.146 6.999a6.854 6.854 0 1 1 13.708 0 6.854 6.854 0 0 1-13.708 0Zm9.788-1.44a.438.438 0 0 0-.618-.62L6.125 8.13l-1.44-1.44a.437.437 0 1 0-.62.618l1.75 1.75c.171.17.448.17.62 0l3.5-3.5Z"
        clipRule="evenodd"
      />
    </G>
    <Defs>
      <ClipPath id="a">
        <Path fill="#fff" d="M0 0h14v14H0z" />
      </ClipPath>
    </Defs>
  </Svg>
)


const Unselected = (props: SvgProps) => (
  <Svg
    width={14}
    height={14}
    fill="none"
    {...props}
  >
    <G fill="#939292" clipPath="url(#a)">
      <Path d="M9.934 5.558a.438.438 0 0 0-.618-.619L6.125 8.13l-1.44-1.44a.438.438 0 0 0-.62.618l1.75 1.75c.171.17.448.17.62 0l3.5-3.5Z" />
      <Path
        fillRule="evenodd"
        d="M7 .145a6.854 6.854 0 1 0 0 13.708A6.854 6.854 0 0 0 7 .145ZM1.02 6.999a5.98 5.98 0 1 1 11.96 0 5.98 5.98 0 0 1-11.96 0Z"
        clipRule="evenodd"
      />
    </G>
    <Defs>
      <ClipPath id="a">
        <Path fill="#fff" d="M0 0h14v14H0z" />
      </ClipPath>
    </Defs>
  </Svg>
)