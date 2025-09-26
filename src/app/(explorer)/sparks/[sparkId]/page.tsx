import SparkDetailClient from "./Client";

export default async function SparkDetailPage({ params }: { params: Promise<{ sparkId: string }> }) {
  const { sparkId } = await params;
  const decoded = decodeURIComponent(sparkId);
  return <SparkDetailClient sparkId={decoded} />;
}
