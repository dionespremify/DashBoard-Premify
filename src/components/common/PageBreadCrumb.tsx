import { Link } from "react-router";

interface BreadcrumbCrumb {
  label: string;
  path: string;
}

interface BreadcrumbProps {
  pageTitle: string;
  /**
   * Níveis intermediários entre Home e a página atual.
   * Ex: pageTitle="Cupom de desconto" + parents=[{label:"Campanhas",path:"/campanhas"}]
   * → "Home > Campanhas > Cupom de desconto"
   */
  parents?: BreadcrumbCrumb[];
}

const Chevron = () => (
  <svg
    className="stroke-current"
    width="17"
    height="16"
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
      stroke=""
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, parents = [] }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              to="/"
            >
              Home
              <Chevron />
            </Link>
          </li>
          {parents.map((p) => (
            <li key={p.path}>
              <Link
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                to={p.path}
              >
                {p.label}
                <Chevron />
              </Link>
            </li>
          ))}
          <li className="text-sm text-gray-800 dark:text-white/90 truncate max-w-[200px] sm:max-w-none">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
