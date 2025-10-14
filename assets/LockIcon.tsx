import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <Path
      fill="#3B3A3A"
      fillRule="evenodd"
      d="M14.909 5.909a2.25 2.25 0 1 1 3.182 3.182 2.25 2.25 0 0 1-3.182-3.182Zm1.06 1.06A.75.75 0 1 1 17.03 8.03a.75.75 0 0 1-1.06-1.06Z"
      clipRule="evenodd"
    />
    <Path
      fill="#3B3A3A"
      fillRule="evenodd"
      d="M20.626 3.374a7.25 7.25 0 0 0-12.171 6.84c.038.16-.01.28-.068.338l-6.624 6.625a1.75 1.75 0 0 0-.513 1.237V21.5c0 .69.56 1.25 1.25 1.25h3c.69 0 1.25-.56 1.25-1.25v-1.75h2.043c.331 0 .65-.132.884-.366l3.77-3.771c.06-.059.18-.106.338-.068a7.25 7.25 0 0 0 6.841-12.172Zm-9.192 1.06a5.75 5.75 0 1 1 8.132 8.132 5.746 5.746 0 0 1-5.427 1.521c-.587-.142-1.268-.018-1.752.465L8.689 18.25H6.5c-.69 0-1.25.56-1.25 1.25v1.75h-2.5v-2.836a.25.25 0 0 1 .073-.177l6.625-6.624c.483-.483.607-1.165.465-1.752a5.746 5.746 0 0 1 1.521-5.427Z"
      clipRule="evenodd"
    />
  </Svg>
)
const LockIcon = memo(SvgComponent)
export default LockIcon
