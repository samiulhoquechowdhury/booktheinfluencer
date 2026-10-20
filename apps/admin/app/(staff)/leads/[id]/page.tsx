import type { Metadata } from 'next';
import { LeadWorkspace } from '@/components/lead-workspace';

export const metadata: Metadata = { title: 'Lead' };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  return <LeadWorkspace id={(await params).id} />;
}
