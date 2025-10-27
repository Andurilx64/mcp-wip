import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { WidgetProps, WidgetComponent } from '@mcp-wip/react-widget-sdk';


let productStockWidgetContext: { sku: string | null } = { sku: null };

// Mock API call to fetch image URL
const fetchImageUrl = (_sku: string): Promise<string> => {
    // Define a few placeholder image URLs
    const placeholderUrls = [
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=987',
        'https://images.unsplash.com/photo-1579338559194-a162d19bf842?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDB8fHNob2VzfGVufDB8fDB8fHwy&auto=format&fit=crop&q=60&w=900',
        'https://images.unsplash.com/photo-1620138546344-7b2c38516edf?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTd8fHNob2VzfGVufDB8fDB8fHwy&auto=format&fit=crop&q=60&w=900',
        'https://images.unsplash.com/photo-1679800558771-0e1737f489c0?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=987',
        "https://images.unsplash.com/photo-1631984564919-1f6b2313a71c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1446",
    ];
    const mapping = {
        "sku2345": placeholderUrls[0],
        "sku5678": placeholderUrls[1],
        "shoes1": placeholderUrls[2],
        "shoe343": placeholderUrls[3],
    }
    // Return the mapped image if the SKU matches, otherwise pick a random placeholder
    if (_sku && mapping.hasOwnProperty(_sku)) {
        return new Promise(resolve => setTimeout(() => resolve(mapping[_sku]), 200));
    }else {
        return new Promise(resolve => setTimeout(() => resolve(placeholderUrls[4]), 200));
    }
   
};

const ProductStockWidget: WidgetComponent = ({ parameters }: WidgetProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const sku = parameters?.sku
    let stock_by_size = parameters?.stock_by_size

   
    if (!stock_by_size) {
        stock_by_size = [
            { size: "50", stock: 4 },
            { size: "51", stock: 1 },
            { size: "52", stock: 0 },
            { size: "53", stock: 3 },
        ];
    } 

    useEffect(() => {
        productStockWidgetContext = { sku };
        if (!sku) return;
        
        const init = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const url = await fetchImageUrl(sku);
                setImageUrl(url);
            } catch (err) {
                setError("Failed to load product image.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [sku]);

    const maxStock = Math.max(...stock_by_size.map(item => item.stock), 0) || 1;

    if (!sku) {
        return (
            <div className="w-full max-w-2xl bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col items-center justify-center sm:flex-row">
                <div className="w-full">
                    {isLoading ? (
                        <div className="w-full h-full bg-slate-700 animate-pulse"></div>
                    ) : error ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-700 text-red-400 p-4 text-center">{error}</div>
                    ) : (
                        <div className="w-full h-full bg-slate-700 animate-pulse">No sku selected</div>
                    )}
                </div>
            </div>)
    }

    return (
        <div className="w-full bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col sm:flex-row">
            <div className="w-full sm:w-1/3 h-64 sm:h-auto flex-shrink-0">
                {isLoading ? (
                    <div className="w-full h-full bg-slate-700 animate-pulse"></div>
                ) : error ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-700 text-red-400 p-4 text-center">{error}</div>
                ) : (
                    <img src={imageUrl!} alt={`Product ${sku}`} className="w-full h-full object-cover" />
                )}
            </div>
            <div className="flex-grow flex flex-col p-6 justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Product Stock</h3>
                    <p className="text-2xl font-bold text-slate-100 mt-1">{sku}</p>
                </div>
                {/* Attach bar chart to bottom of right section */}
                <div className="mt-8">
                    <h4 className="text-xs text-slate-400 mb-3">Stock by Size:</h4>
                    <div className="flex items-end justify-around h-32 space-x-2">
                        {stock_by_size.map(({ size, stock }: { size: string, stock: number }) => (
                            <div key={size} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                <div 
                                    className="w-full bg-indigo-500 hover:bg-indigo-400 transition-all duration-300 rounded-t-md"
                                    style={{ height: `${(stock / maxStock) * 100}%` }}
                                />
                                <span className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded py-1 px-2 pointer-events-none">
                                    Stock: {stock}
                                </span>
                                <p className="text-xs text-slate-300 mt-2">{size}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

ProductStockWidget.getWidgetContext = () => {
    let content = productStockWidgetContext.sku ? { sku: productStockWidgetContext.sku } : undefined;
    if (content) {
        return "The user is visualizing the sku".concat(content.sku)
    }
    return undefined
};
ProductStockWidget.initWidget = (parameters = {}, setParams?: (newParams: any) => void) => {
    if (parameters && parameters.sku) {
        return;
    }

    if (typeof document === "undefined" || typeof window === "undefined") {
        console.warn("This only works in the browser.");
        return;
    }

    if (document.getElementById("image-carousel-init-prompt")) {
        return;
    }

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = "image-carousel-init-prompt";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(30, 27, 75, 0.75)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    // Modal
    const modal = document.createElement("div");
    modal.style.background = "#fff";
    modal.style.borderRadius = "1em";
    modal.style.boxShadow = "0 4px 24px #0002";
    modal.style.minWidth = "340px";
    modal.style.maxWidth = "95vw";
    modal.style.padding = "2em 1.5em";
    modal.style.display = "flex";
    modal.style.flexDirection = "column";
    modal.style.alignItems = "center";
    modal.style.position = "relative";

    const title = document.createElement("h2");
    title.innerText = "Add Product SKU to visualize";
    title.style.margin = "0 0 1rem";
    title.style.fontSize = "1.3em";
    title.style.fontWeight = "600";
    title.style.color = "#373e67"
    modal.appendChild(title);


    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "0.5em";
    row.style.width = "100%";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Product SKU";
    input.style.flex = "1";
    input.style.fontSize = "1em";
    input.style.border = "1px solid #94a3b8";
    input.style.borderRadius = "0.35em";
    input.style.padding = "0.42em 0.75em";
    input.style.color = "#373e67";
    row.appendChild(input);

    const addBtn = document.createElement("button");
    addBtn.innerText = "Add";
    addBtn.style.background = "#4338ca";
    addBtn.style.color = "#fff";
    addBtn.style.border = "none";
    addBtn.style.borderRadius = "0.35em";
    addBtn.style.padding = "0.42em 0.95em";
    addBtn.style.fontWeight = "600";
    addBtn.style.cursor = "pointer";
    row.appendChild(addBtn);

    modal.appendChild(row);

    

    addBtn.onclick = () => {
        const sku = input.value.trim();
        if (!sku) return;
        const newParams = {"sku":sku}
        if (setParams){
            setParams(newParams)
        }
        document.body.removeChild(overlay);
    };


    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };

    modal.onclick = (e) => e.stopPropagation();

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 0);
};

ProductStockWidget.widgetName="Stock Visualizer"
ProductStockWidget.description="Visualize the availability of a given product into the warehouse"

ProductStockWidget.getIcon = () => (
    <span role="img" aria-label="image carousel" style={{fontSize: "1.5em", lineHeight: "1"}}>
        📦
    </span>
);
ProductStockWidget.visualization = "both";
export default ProductStockWidget;
