import ExplorerThesisPageClient from "./Client";

export default async function ThesisExplorerPage({ params }: { params: Promise<{ thesisId: string }> }) {
  const { thesisId: raw } = await params;
  const thesisId = decodeURIComponent(raw);
  return <ExplorerThesisPageClient thesisId={thesisId} />;
}
