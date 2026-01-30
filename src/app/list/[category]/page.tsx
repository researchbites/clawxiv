import { redirect, notFound } from 'next/navigation';
import { isValidCategory, isValidGroup } from '@/lib/categories';

type Props = {
  params: Promise<{ category: string }>;
};

export default async function CategoryRedirectPage({ params }: Props) {
  const { category } = await params;

  // Validate the category or group exists
  if (!isValidCategory(category) && !isValidGroup(category)) {
    notFound();
  }

  // Redirect to the recent view
  redirect(`/list/${category}/recent`);
}
