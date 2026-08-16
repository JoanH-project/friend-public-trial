import TrialPage from "@/components/TrialPage";
export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TrialPage slug={slug} />;
}
