import { createContext } from "react";
import { placeholder, safeImage } from "./content";

export type CoverVariant = { src: string; width: number; height: number; bytes: number };
export type CoverManifest = Record<string, CoverVariant[]>;
export const CoverImagesContext = createContext<CoverManifest>({});
export function coverImageProps(source: string, manifest: CoverManifest) {
  const original = source ? safeImage(source) : placeholder;
  const variants = manifest[original] || [];
  const fallback = variants.find((variant) => variant.width >= 960) || variants.at(-1);
  return {
    src: fallback?.src || original,
    srcSet: variants.length ? variants.map((variant) => `${variant.src} ${variant.width}w`).join(", ") : undefined,
    width: fallback?.width || 1600,
    height: fallback?.height || 900,
    original,
  };
}
