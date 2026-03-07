"use client";

import { usePathname } from "next/navigation";
import { getRootRouteFeatures } from "@/lib/rootBootstrapRoutes";
import TopProgressBar from "@/components/TopProgressBar";
import ScrollToTop from "@/components/ScrollToTop";
import GlobalHotkeys from "@/components/GlobalHotkeys";
import ModalsPreload from "@/components/ModalsPreload";
import LazysizesInit from "@/components/LazysizesInit";
import AdsScriptLoader from "@/components/AdsScriptLoader";
import ProductionConsoleGuard from "@/components/ProductionConsoleGuard";
import AnalyticsScripts from "@/components/AnalyticsScripts";
import ErrorLogCapture from "@/components/ErrorLogCapture";

export default function RootClientBootstrap() {
  const pathname = usePathname() || "/";
  const features = getRootRouteFeatures(pathname);

  return (
    <>
      <ProductionConsoleGuard />
      <ErrorLogCapture />
      <TopProgressBar />
      <ScrollToTop />
      <LazysizesInit />
      {features.loadAnalyticsScripts ? <AnalyticsScripts /> : null}
      {features.useHotkeys ? <GlobalHotkeys /> : null}
      {features.preloadModals ? <ModalsPreload /> : null}
      {features.loadAdsScripts ? <AdsScriptLoader /> : null}
    </>
  );
}
