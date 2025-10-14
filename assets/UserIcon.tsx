import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"
const Icon = ({ isActive, ...props }: SvgProps & {isActive: boolean}) => (
  isActive ? <ActiveIcon {...props} /> : <InactiveIcon {...props} />
)

const InactiveIcon = (props: SvgProps) => (
  <Svg
    width={33}
    height={32}
    fill="none"
    {...props}
  >
    <Path
      fill="#939292"
      fillRule="evenodd"
      d="M16.5 3.332a6.667 6.667 0 1 0 0 13.333 6.667 6.667 0 0 0 0-13.333Zm-5.333 6.667a5.333 5.333 0 1 1 10.666 0 5.333 5.333 0 0 1-10.666 0Z"
      clipRule="evenodd"
    />
    <Path
      fill="#939292"
      d="M6.493 28.093c.608-4.252 4.91-7.428 10.007-7.428 5.098 0 9.4 3.176 10.007 7.428a.667.667 0 0 0 1.32-.189c-.726-5.081-5.756-8.572-11.327-8.572-5.57 0-10.6 3.49-11.327 8.572a.667.667 0 0 0 1.32.189Z"
    />
  </Svg>
)
const UserIcon = memo(Icon)
export default UserIcon

const ActiveIcon = (props: SvgProps) => (
  <Svg
    width={33}
    height={32}
    fill="none"
    {...props}
  >
    <Path
      fill="#FD6D41"
      d="M16.5 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16.5 19C10.813 19 5.6 22.57 4.843 27.859A1 1 0 0 0 5.833 29h21.334a1 1 0 0 0 .99-1.141C27.4 22.569 22.189 19 16.5 19Z"
    />
  </Svg>
)
