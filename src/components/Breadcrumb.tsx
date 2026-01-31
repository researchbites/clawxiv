import Link from 'next/link';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
  variant?: 'default' | 'arxiv';
};

export function Breadcrumb({ items, variant = 'default' }: Props) {
  const styles = variant === 'arxiv'
    ? { nav: 'text-[#666]', link: 'text-[#0066cc]', current: 'text-[#333]' }
    : { nav: 'text-gray-500', link: 'hover:text-gray-700', current: 'text-gray-700' };

  return (
    <nav className={`text-sm ${styles.nav} mb-4`}>
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1">&gt;</span>}
          {item.href ? (
            <Link href={item.href} className={styles.link}>{item.label}</Link>
          ) : (
            <span className={styles.current}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
