
import React, { useState, useEffect, useRef } from 'react';
import type { WidgetProps, WidgetComponent } from '@mcp-wip/react-widget-sdk';

// --- HELPER FUNCTIONS & ICONS ---

// Simulates fetching an image URL for a given SKU with a delay
const fetchImageUrl = (sku: string): Promise<string> => {
    const mapping: { [key: string]: string } = {
        "sku2345": 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=987',
        "sku5678": 'https://images.unsplash.com/photo-1579338559194-a162d19bf842?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDB8fHNob2VzfGVufDB8fDB8fHwy&auto=format&fit=crop&q=60&w=900',
        "shoes1": 'https://images.unsplash.com/photo-1620138546344-7b2c38516edf?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTd8fHNob2VzfGVufDB8fDB8fHwy&auto=format&fit=crop&q=60&w=900',
        "shoe343": 'https://images.unsplash.com/photo-1679800558771-0e1737f489c0?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=987',
    };
    const fallbackUrl = "https://images.unsplash.com/photo-1631984564919-1f6b2313a71c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1446";

    const url = mapping[sku] || fallbackUrl;
    // Simulate network delay
    return new Promise(resolve => setTimeout(() => resolve(url), 800));
};

const ChevronLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

// Per user code, this context is at the module level.
// This is preserved to match the original code's structure but is not instance-safe.
let widgetContext: { id: string | null; url: string | null } = { id: null, url: null };

// --- IMAGE CAROUSEL WIDGET ---

const ImageCarouselWidget: WidgetComponent = ({ parameters }) => {
    //const [params, setParams] = useState(parameters);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [urls, setUrls] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const ids = parameters?.ids ?? [];
    //console.log("Intialized with ids", ids)
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const isDragging = useRef(false);
    const minSwipeDistance = 50;

    // Limit for max dimensions of the carousel (maintain square ratio).
    // Change these values if you want a different max size.
    const MAX_SIZE = 380; // px

    useEffect(() => {
        let isMounted = true;
        const processUrls = async () => {
            setIsLoading(true);
            const imageUrls = parameters?.image_urls;
            const providedIds = parameters?.ids;

            try {
                let finalUrls: string[] = [];
                if (imageUrls && imageUrls.length > 0) {
                    finalUrls = imageUrls;
                } else if (providedIds && providedIds.length > 0) {
                    finalUrls = await Promise.all(
                        providedIds.map((id: string) => fetchImageUrl(id))
                    );
                }
                if (isMounted) setUrls(finalUrls);
            } catch (error) {
                console.error("Failed to process image URLs:", error);
                if (isMounted) setUrls([]);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        processUrls();

        return () => { isMounted = false; };
    }, [parameters]);

    useEffect(() => {
        widgetContext = {
            id: ids[currentIndex] || null,
            url: urls[currentIndex] || null,
        };
    }, [currentIndex, ids, urls]);

    const prevSlide = () => {
        if (urls.length < 2) return;
        const newIndex = currentIndex === 0 ? urls.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const nextSlide = () => {
        if (urls.length < 2) return;
        const newIndex = currentIndex === urls.length - 1 ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    const goToSlide = (slideIndex: number) => {
        setCurrentIndex(slideIndex);
    };

    const handleInteractionStart = (clientX: number) => {
        isDragging.current = true;
        touchEndX.current = 0;
        touchStartX.current = clientX;
    };
    
    const handleInteractionMove = (clientX: number) => {
        if (isDragging.current) {
            touchEndX.current = clientX;
        }
    };

    const handleInteractionEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        if (touchStartX.current && touchEndX.current) {
            const distance = touchStartX.current - touchEndX.current;
            if (distance > minSwipeDistance) nextSlide();
            else if (distance < -minSwipeDistance) prevSlide();
        }
        touchStartX.current = 0;
        touchEndX.current = 0;
    };
    
    if (isLoading) {
        return (
            <div
                className="flex items-center justify-center bg-slate-800/50 rounded-xl shadow-lg text-slate-400 backdrop-blur-sm"
                style={{
                    width: "100%",
                    maxWidth: `${MAX_SIZE}px`,
                    aspectRatio: "1 / 1",
                    margin: "0 auto",
                }}
            >
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                <span className="ml-4 text-lg">Loading Images...</span>
            </div>
        );
    }

    if (urls.length === 0) {
        return (
            <div
                className="flex items-center justify-center bg-slate-800/50 rounded-xl shadow-lg text-slate-400 backdrop-blur-sm"
                style={{
                    width: "100%",
                    maxWidth: `${MAX_SIZE}px`,
                    aspectRatio: "1 / 1",
                    margin: "0 auto",
                }}
            >
                <p className="text-lg">No images to display.</p>
            </div>
        );
    }
    
    return (
        <div
            className="relative group select-none touch-pan-y shadow-2xl shadow-black/30 m-auto"
            onMouseLeave={handleInteractionEnd}
            style={{
                width: "100%",
                maxWidth: `${MAX_SIZE}px`,
                aspectRatio: "1 / 1",
            }}
        >
            <div
                className="w-full h-full rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
                onTouchStart={(e) => handleInteractionStart(e.targetTouches[0].clientX)}
                onTouchMove={(e) => handleInteractionMove(e.targetTouches[0].clientX)}
                onTouchEnd={handleInteractionEnd}
                onMouseDown={(e) => { e.preventDefault(); handleInteractionStart(e.clientX); }}
                onMouseMove={(e) => { e.preventDefault(); handleInteractionMove(e.clientX); }}
                onMouseUp={handleInteractionEnd}
            >
                <div
                    className="w-full h-full flex transition-transform ease-out duration-500"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {urls.map((url, index) => (
                        <div
                            key={ids[index] || index}
                            className="w-full h-full flex-shrink-0 bg-slate-700"
                            style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <img
                                src={url}
                                alt={`Slide ${index + 1}`}
                                className="object-cover rounded-xl"
                                draggable="false"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    maxWidth: "100%",
                                    maxHeight: "100%",
                                    aspectRatio: "1 / 1",
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {urls.length > 1 && (
                <>
                    <button onClick={prevSlide} className="opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 left-3 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition-opacity duration-300 z-10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-800">
                        <ChevronLeftIcon />
                    </button>
                    <button onClick={nextSlide} className="opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-3 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition-opacity duration-300 z-10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-800">
                        <ChevronRightIcon />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                        {urls.map((_, slideIndex) => (
                            <button
                                key={slideIndex}
                                onClick={() => goToSlide(slideIndex)}
                                aria-label={`Go to slide ${slideIndex + 1}`}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentIndex === slideIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};



ImageCarouselWidget.initWidget = (parameters = {}, setParams?: (newParams: any) => void) => {
    if (parameters && Array.isArray(parameters.ids) && parameters.ids.length > 0) {
        //console.log("Already initialized with IDs:", parameters.ids);
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
    title.innerText = "Add Product SKUs";
    title.style.margin = "0 0 1rem";
    title.style.fontSize = "1.3em";
    title.style.fontWeight = "600";
    title.style.color = "#373e67"
    modal.appendChild(title);

    const info = document.createElement("div");
    info.innerText = "Enter product SKUs one by one. Click Add for each, then Done.";
    info.style.marginBottom = "1.5em";
    info.style.color = "#373e67";
    info.style.textAlign = "center";
    modal.appendChild(info);

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

    const skuList = document.createElement("div");
    skuList.style.margin = "1.25em 0 0.7em";
    skuList.style.display = "flex";
    skuList.style.flexWrap = "wrap";
    skuList.style.gap = "0.4em";
    modal.appendChild(skuList);

    const doneBtn = document.createElement("button");
    doneBtn.innerText = "Done";
    doneBtn.style.background = "#4338ca";
    doneBtn.style.color = "#fff";
    doneBtn.style.border = "none";
    doneBtn.style.borderRadius = "0.38em";
    doneBtn.style.fontWeight = "700";
    doneBtn.style.fontSize = "1em";
    doneBtn.style.padding = "0.44em 1.4em";
    doneBtn.style.marginTop = "0.6em";
    doneBtn.style.cursor = "pointer";
    doneBtn.disabled = true;
    doneBtn.onclick = () => {
        const newParams = { ...parameters, ids: [...ids] };
        document.body.removeChild(overlay);
        //if (onUpdate) onUpdate(newParams);
    };
    modal.appendChild(doneBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancel";
    cancelBtn.style.background = "#e2e8f0";
    cancelBtn.style.color = "#3b466b";
    cancelBtn.style.border = "none";
    cancelBtn.style.borderRadius = "0.35em";
    cancelBtn.style.fontWeight = "600";
    cancelBtn.style.fontSize = "0.95em";
    cancelBtn.style.padding = "0.42em 1.1em";
    cancelBtn.style.marginTop = "0.6em";
    //cancelBtn.style.marginLeft = "0.6em";
    cancelBtn.style.cursor = "pointer";
    modal.appendChild(cancelBtn);

    // Keep the ids local to the dialog ONLY!
    let ids: string[] = [];

    function updateSkuList() {
        skuList.innerHTML = "";
        if (ids.length === 0) {
            const none = document.createElement("span");
            none.innerText = "No SKUs added yet.";
            none.style.color = "#64748b";
            none.style.fontSize = "0.96em";
            none.style.fontStyle = "italic";
            skuList.appendChild(none);
            doneBtn.disabled = true;
        } else {
            ids.forEach((sku, idx) => {
                const chip = document.createElement("span");
                chip.innerText = sku;
                chip.style.background = "#e0e7ff";
                chip.style.color = "#373e67";
                chip.style.borderRadius = "0.38em";
                chip.style.padding = "0.2em 0.8em";
                chip.style.display = "inline-flex";
                chip.style.alignItems = "center";
                chip.style.gap = "0.4em";

                const removeBtn = document.createElement("button");
                removeBtn.innerText = "✕";
                removeBtn.style.background = "none";
                removeBtn.style.border = "none";
                removeBtn.style.color = "#373e67";
                removeBtn.style.cursor = "pointer";
                removeBtn.onclick = () => {
                    ids = ids.filter((_, i) => i !== idx);
                    updateSkuList();
                };
                chip.appendChild(removeBtn);

                skuList.appendChild(chip);
            });
            doneBtn.disabled = false;
        }
    }

    addBtn.onclick = () => {
        const sku = input.value.trim();
        if (!sku) return;
        if (!ids.includes(sku)) ids.push(sku);
        input.value = "";
        input.focus();
        updateSkuList();
    };

    /*input.onkeydown = (e) => {
        // No synthetic trigger because of pointer event type mismatch in typescript,
        // just run addBtn.onclick directly.
        if ((e as KeyboardEvent).key === "Enter") addBtn.onclick();
    };*/

    doneBtn.onclick = () => {
        //console.log("✅ SKUs added:", ids);
        // Only set ids in parameters when Done, immediately before removing dialog.
        parameters.ids = [...ids];
        const newParams = {"ids":ids}
        if (setParams){
            setParams(newParams)
        }
        document.body.removeChild(overlay);
    };

    cancelBtn.onclick = () => document.body.removeChild(overlay);

    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };

    modal.onclick = (e) => e.stopPropagation();

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 0);
};




ImageCarouselWidget.getWidgetContext = () => {
    return (widgetContext.id && widgetContext.url) 
        ? "The user is visualizing the sku:  ".concat(widgetContext.id) 
        : undefined;
};

ImageCarouselWidget.getIcon = () => (
    <span role="img" aria-label="image carousel" style={{fontSize: "1.5em", lineHeight: "1"}}>
        📺
    </span>
);
ImageCarouselWidget.widgetName = "Image Carousel";
ImageCarouselWidget.description = "A carousel widget to display a list of images.";
ImageCarouselWidget.visualization = "both";

export default ImageCarouselWidget;
