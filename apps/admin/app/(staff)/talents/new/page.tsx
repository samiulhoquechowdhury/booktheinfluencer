import type { Metadata } from 'next';
import { NewTalent } from '@/components/talents/profile-form';

export const metadata: Metadata = { title: 'New talent' };

export default function NewTalentPage() {
  return <NewTalent />;
}
