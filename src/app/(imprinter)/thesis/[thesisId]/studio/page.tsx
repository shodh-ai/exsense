import ThesisStudioClient from "./ThesisStudioClient";

export default async function ThesisStudioPage({
  params,
}: {
  params: Promise<{ thesisId: string }>;
}) {
  const { thesisId } = await params;
  const decoded = decodeURIComponent(thesisId);
  return <ThesisStudioClient thesisId={decoded} />;
}
