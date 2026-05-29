import { useState, type ReactNode } from "react";

export interface TabDefinition {
  key: string;
  label: string;
  icon?: string;
  content: ReactNode;
}

export default function Tabs({
  tabs,
  defaultKey,
  onChange,
}: {
  tabs: TabDefinition[];
  defaultKey?: string;
  onChange?: (key: string) => void;
}) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key ?? "");

  function pick(key: string) {
    setActive(key);
    onChange?.(key);
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto scrollbar-hide -mx-2 px-2">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => pick(tab.key)}
              className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                isActive
                  ? "border-brand-500 text-brand-600 dark:text-brand-300"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div key={tab.key} className={tab.key === active ? "block" : "hidden"}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
