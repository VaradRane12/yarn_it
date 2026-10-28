import clsx from "clsx";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & { fill?: string };

export default function LogoIcon({ fill, className, ...rest }: Props) {
  const src = "/api/static/logo";

  return (
    <img
      src={src}
      alt={`${process.env.SITE_NAME} logo`}
      {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)}
      className={clsx("object-contain", className)}
    />
  );
}
