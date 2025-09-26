import ExplorerThesisPageClient from "@/app/(explorer)/theses/[thesisId]/Client";

export default async function ExplorerThesisPage({ params }: { params: Promise<{ thesisId: string }> }) {
  const { thesisId: raw } = await params;
  const thesisId = decodeURIComponent(raw);
  return <ExplorerThesisPageClient thesisId={thesisId} />;
}
