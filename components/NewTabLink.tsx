"use client";

import Link, { type LinkProps } from "next/link";

export default function NewTabLink({
  target = "_blank",
  rel = "noopener noreferrer",
  children,
  ...props
}: LinkProps & { children?: React.ReactNode; className?: string; target?: string; rel?: string }) {
  return <Link target={target} rel={rel} {...props}>{children}</Link>;
}
