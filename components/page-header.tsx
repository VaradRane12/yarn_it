import { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-10 pt-10 md:pt-14">
      <p className="eyebrow">✺ {eyebrow}</p>
      <h1 className="mt-3 font-display text-[clamp(3rem,9vw,7rem)] uppercase leading-[0.88]">
        {title}
      </h1>
      {children ? (
        <div className="mt-4 max-w-2xl text-base font-medium leading-7 md:text-lg">
          {children}
        </div>
      ) : null}
    </header>
  );
}
