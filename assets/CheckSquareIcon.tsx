import * as React from "react"
import Svg, { SvgProps, Path, Mask } from "react-native-svg"
import { memo } from "react"
const SvgComponent = ({ isChecked, ...props }: SvgProps & { isChecked: boolean }) => (
  isChecked ? <Checked {...props} /> : <Unchecked {...props} />
)
const CheckSquareIcon = memo(SvgComponent)
export default CheckSquareIcon

const Checked = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <Path
      fill="#FD4912"
      d="M18 3c1.654 0 3 1.345 3 3v12c0 1.654-1.346 3-3 3H6c-1.655 0-3-1.346-3-3V6c0-1.655 1.345-3 3-3h12Zm-1.894 5.204a1 1 0 0 0-1.402.19l-3.783 4.97-1.634-2.087a.998.998 0 1 0-1.574 1.232l2.432 3.107c.19.242.48.384.787.384h.006a1 1 0 0 0 .79-.396l4.568-6a1 1 0 0 0-.19-1.4Z"
    />
    <Mask
      id="a"
      width={18}
      height={18}
      x={3}
      y={3}
      maskUnits="userSpaceOnUse"
      style={{
        maskType: "alpha",
      }}
    >
      <Path
        fill="#fff"
        d="M18 3c1.654 0 3 1.345 3 3v12c0 1.654-1.346 3-3 3H6c-1.655 0-3-1.346-3-3V6c0-1.655 1.345-3 3-3h12Zm-1.894 5.204a1 1 0 0 0-1.402.19l-3.783 4.97-1.634-2.087a.998.998 0 1 0-1.574 1.232l2.432 3.107c.19.242.48.384.787.384h.006a1 1 0 0 0 .79-.396l4.568-6a1 1 0 0 0-.19-1.4Z"
      />
    </Mask>
  </Svg>
)


const Unchecked = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <Path
      fill="#FD4912"
      d="M18 3v1c1.102 0 2 .897 2 2h2c0-2.208-1.794-4-4-4v1Zm3 3h-1v12h2V6h-1Zm0 12h-1c0 1.102-.898 2-2 2v2c2.206 0 4-1.794 4-4h-1Zm-3 3v-1H6v2h12v-1ZM6 21v-1c-1.103 0-2-.898-2-2H2c0 2.206 1.792 4 4 4v-1Zm-3-3h1V6H2v12h1ZM3 6h1c0-1.103.897-2 2-2V2C3.793 2 2 3.793 2 6h1Zm3-3v1h12V2H6v1Z"
    />
  </Svg>
)
