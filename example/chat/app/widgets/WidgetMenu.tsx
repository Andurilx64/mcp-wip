import React, { useState, useRef, useEffect } from 'react';
import { GridIcon, X } from 'lucide-react';
import { widgets } from './register';
import { getWidget }  from '@mcp-wip/react-widget-sdk';


interface WidgetMenuProps {
  onSelectWidget: (uri: string) => void;
}

export const WidgetMenu: React.FC<WidgetMenuProps> = ({ onSelectWidget }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // FIX: Corrected typo from `menu-ref` to `menuRef`
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (uri: string) => {
    onSelectWidget(uri);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 h-[50px] w-[50px] bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors duration-200 flex items-center justify-center shrink-0"
        aria-label="Toggle widget menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <GridIcon className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-[420px] bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-5 animate-fade-in z-10">
          <h3 className="text-white font-semibold text-base px-2 pb-3 border-b border-slate-700">
            Open a Widget Application
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            {Object.keys(widgets).map((uri) => {
              const widgetComp = getWidget(uri);
              if (!widgetComp) return null;
              const name = (widgetComp as any).widgetName || uri;
              const description = (widgetComp as any).description || '';
              // Try to get icon from widget, or use placeholder
              let IconElem: React.ReactNode = null;
              try {
                IconElem =
                  typeof widgetComp.getIcon === "function"
                    ? widgetComp.getIcon()
                    : (
                      <span
                        className="inline-block w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400"
                        aria-label="Widget icon placeholder"
                      >
                        <GridIcon className="w-5 h-5" />
                      </span>
                    );
              } catch (e) {
                IconElem = (
                  <span
                    className="inline-block w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400"
                    aria-label="Widget icon placeholder"
                  >
                    <GridIcon className="w-5 h-5" />
                  </span>
                );
              }
              return (
                <button
                  key={uri}
                  onClick={() => handleSelect(uri)}
                  className="flex items-start gap-4 w-full p-4 rounded-lg bg-slate-900/40 hover:bg-blue-500/20 transition-colors border border-transparent hover:border-blue-300/50 shadow-sm"
                >
                  <span className="flex-shrink-0">{IconElem}</span>
                  <div className="flex flex-col items-start justify-center overflow-visible min-w-0 w-full">
                    <span className="font-medium text-slate-200 text-base mb-1 break-words">{name}</span>
                    {description && (
                      <span className="text-left text-sm text-slate-400 whitespace-pre-line break-words w-full">
                        {description}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};
