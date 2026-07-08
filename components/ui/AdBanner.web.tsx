import React from "react";
import { AdBanner as SharedAdBanner, type Ad } from "./AdBannerBase";

export type { Ad } from "./AdBannerBase";

export interface AdBannerProps {
  onAdPress?: (ad: Ad) => void;
}

export function AdBanner(props: AdBannerProps) {
  return <SharedAdBanner {...props} />;
}

export default AdBanner;
