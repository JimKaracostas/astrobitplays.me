import { useContext } from "react";
import { CoverImagesContext, coverImageProps } from "./lib/cover-images";
import { placeholder } from "./lib/content";

export function CoverImage({ source = "", alt = "", priority = false, sizes }: {
  source?: string; alt?: string; priority?: boolean; sizes: string;
}) {
  const { original, ...image } = coverImageProps(source, useContext(CoverImagesContext));
  return <img className="cover" {...image} alt={alt} sizes={sizes}
    loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async"
    onError={(event) => {
      const element = event.currentTarget;
      element.removeAttribute("srcset");
      if (element.getAttribute("src") !== original && element.getAttribute("src") !== placeholder)
        element.src = original;
      else if (element.getAttribute("src") !== placeholder) element.src = placeholder;
    }} />;
}
