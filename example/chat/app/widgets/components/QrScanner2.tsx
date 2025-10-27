
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { WidgetProps, WidgetComponent } from '@mcp-wip/react-widget-sdk';
import jsQR from 'jsqr';

// Inform TypeScript that jsQR is available globally from the CDN script in index.html
//declare const jsQR: any;

type ScanState = 'idle' | 'scanning' | 'scanned' | 'error';

// Module-level variable to hold the context for the static method,
// allowing access outside the component's instance lifecycle.
let widgetContext: { data: string | null } = { data: null };

const QRIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6.5 6.5v-2.5m-6.5 2.5v-2.5m-2.5 0h2.5m11.5 0h2.5m-14 0h2.5m6.5 0h2.5m-11.5 0h2.5m6.5 0h2.5M12 4v1m-6.5 2.5v-2.5m6.5 2.5v-2.5m0 0h-2.5m2.5 0h2.5M12 4V3m-2.5 3.5H7.5M12 4V3m2.5 3.5h1.5M7.5 7.5V6m6.5 1.5V6" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExclamationCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const QRScannerWidget: WidgetComponent = ( {parameters }: WidgetProps) => {
    const [scanState, setScanState] = useState<ScanState>('idle');
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameId = useRef<number | null>(null);

    const stopScan = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const scanQRCode = useCallback(() => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    if ("vibrate" in navigator) {
                        navigator.vibrate(200); // works only on supported devices
                    }
                    setScannedData(code.data);
                    setScanState('scanned');
                    stopScan();
                }
            }
        }
        if (streamRef.current) { // Only continue if stream is still active
           animationFrameId.current = requestAnimationFrame(scanQRCode);
        }
    }, [stopScan]);

    const startScan = useCallback(async () => {
        setScanState('scanning');
        setErrorMessage(null);
        setScannedData(null);
        console.log("start scanning")
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute("playsinline", "true"); // Required for iOS
                await videoRef.current.play();
                animationFrameId.current = requestAnimationFrame(scanQRCode);
                console.log("here")
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setErrorMessage("Could not access camera. Please check permissions.");
            setScanState('error');
            stopScan();
        }
    }, [scanQRCode, stopScan]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopScan();
        };
    }, [stopScan]);

    // Update external context when data is scanned
    useEffect(() => {
        widgetContext.data = scannedData;
    }, [scannedData]);
    
    const handleCopy = () => {
        if (scannedData) {
            navigator.clipboard.writeText(scannedData);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const reset = () => {
        stopScan();
        setScannedData(null);
        setErrorMessage(null);
        setScanState('idle');
    };

    const renderContent = () => {
        switch (scanState) {
            case 'scanning':
                console.log('Scanning')
                return (
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-black">
                        <div className="relative flex-1 w-full flex items-center justify-center">
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-full max-w-full h-full aspect-video border-4 border-white/60 rounded-2xl"></div>
                            </div>
                        </div>
                        <div className="w-full flex justify-center pt-4 pb-2 px-4 bg-slate-900 rounded-b-2xl">
                            <button
                                onClick={reset}
                                className="bg-indigo-600 text-white font-semibold py-2 px-8 rounded-full shadow-lg transition-colors hover:bg-white"
                                style={{ minWidth: '120px' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                    
                );
            case 'scanned':
                return (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <CheckCircleIcon />
                        <h3 className="text-lg font-semibold mt-4 text-slate-750">Scan Successful</h3>
                        <div className="relative w-full mt-4 bg-slate-200 p-4 rounded-lg text-slate-800 break-all text-left">
                            <p className="font-mono text-sm">{scannedData}</p>
                            <button onClick={handleCopy} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-800 rounded-md transition">
                                {isCopied ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <button onClick={startScan} className="mt-6 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Scan Another Code
                        </button>
                    </div>
                );
            case 'error':
                 return (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <ExclamationCircleIcon />
                        <h3 className="text-lg font-semibold mt-4 text-slate-700">Error</h3>
                        <p className="text-slate-500 mt-2">{errorMessage}</p>
                        <button onClick={startScan} className="mt-6 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Try Again
                        </button>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <QRIcon />
                        <h3 className="text-xl font-bold mt-4 text-slate-850">QR Code Scanner</h3>
                        <p className="text-slate-500 mt-2">Position a QR code inside the viewfinder to scan it.</p>
                        <button onClick={startScan} className="mt-6 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Start Scan
                        </button>
                    </div>
                );
        }
    };
    
    return (
        <div className="w-full max-w-md bg-slate-900 rounded-xl shadow-lg overflow-hidden relative" style={{ minHeight: '400px' }}>
            {renderContent()}
        </div>
    );
};

QRScannerWidget.getWidgetContext = () => {
    console.log(widgetContext)
    if (widgetContext.data) {
        return "The user used the qr scanner widget and successfully scanned a qr code that contains the identifier of an sku. If the user request more info or actions on the scanned product here is the sku identifier:   ".concat(widgetContext.data)
    }
    return  undefined;
};

QRScannerWidget.widgetName="QR Scanner"
QRScannerWidget.description="Scan a product by QR code"
QRScannerWidget.getIcon = () => (
    <span role="img" aria-label="image carousel" style={{fontSize: "1.5em", lineHeight: "1"}}>
        🔎
    </span>
);
QRScannerWidget.visualization = "small";
export default QRScannerWidget;
