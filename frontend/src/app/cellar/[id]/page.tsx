import WineDetailClient from "./wine-detail-client";

export function generateStaticParams() {
  return [{ id: "__placeholder__" }];
}

export default function WineDetailPage() {
  return <WineDetailClient />;
}
