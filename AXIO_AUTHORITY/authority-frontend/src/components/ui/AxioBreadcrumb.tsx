import Link from "next/link";
import { Fragment } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

/** AxioBreadcrumb — semantic breadcrumb navigation. */
export function AxioBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              {i > 0 && (
                <li aria-hidden="true" className="text-slate-400">
                  /
                </li>
              )}
              <li>
                {isLast || !item.href ? (
                  <span aria-current={isLast ? "page" : undefined} className="font-medium text-slate-800">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-brand-700 hover:text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
