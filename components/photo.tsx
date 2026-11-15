/* eslint-disable @next/next/no-img-element -- photos are storage URLs saved by sellers, not build-time images */
import type { ImgHTMLAttributes } from "react";

/** A plain lazy-loading photo for images whose URLs come from the database. */
export function Photo({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  return <img alt={alt} loading="lazy" decoding="async" {...props} />;
}
