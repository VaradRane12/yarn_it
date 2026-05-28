import clsx from "clsx";
import LogoIcon from "./icons/logo";

export default function LogoSquare({ size }: { size?: "sm" | undefined }) {
  return (
    <LogoIcon
      className={clsx({
        "h-[128px] w-[128px]": !size,
        "h-[80px] w-[80px]": size === "sm",
      })}
    />
  );
}
