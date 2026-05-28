import clsx from "clsx";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & { fill?: string };

export default function LogoIcon({ fill, className, ...rest }: Props) {
  const host =
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const src = `${host}/logo.svg`;

  return (
    <img
      src={src}
      alt={`${process.env.SITE_NAME} logo`}
      {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)}
      className={clsx("object-contain", className)}
    />
  );
}
