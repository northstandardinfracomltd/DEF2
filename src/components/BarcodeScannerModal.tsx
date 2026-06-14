import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const elementId = "html5-qrcode-scanner-element";

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    let html5QrcodeInstance: Html5Qrcode | null = null;

    // Timeout to make sure target container div exists in the DOM
    const timer = setTimeout(() => {
      try {
        html5QrcodeInstance = new Html5Qrcode(elementId);
        qrCodeInstanceRef.current = html5QrcodeInstance;

        const config = {
          fps: 15,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ]
        };

        html5QrcodeInstance.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            onScanSuccess(decodedText);
            stopAndUnmount();
          },
          () => {
            // Silent error callbacks for negative frames
          }
        ).then(() => {
          setIsCameraActive(true);
        }).catch((err) => {
          console.error("Camera access error:", err);
          setErrorMsg("Impossible d'accéder à la caméra. Veuillez autoriser l'accès à la caméra pour scanner.");
        });

      } catch (err) {
        console.error("Scanner initialization error:", err);
        setErrorMsg("Une erreur s'est produite lors de l'initialisation du scanner de code-barres.");
      }
    }, 200);

    const stopAndUnmount = () => {
      if (html5QrcodeInstance && html5QrcodeInstance.isScanning) {
        html5QrcodeInstance.stop().then(() => {
          setIsCameraActive(false);
        }).catch(err => console.error("Error stopping scanner:", err));
      }
    };

    return () => {
      clearTimeout(timer);
      stopAndUnmount();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const fermerButtonStyle: React.CSSProperties = {
    backgroundColor: '#000',
    color: '#fff',
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0), 0 1px 2px rgba(8, 8, 8, 0.2), 0 4px 4px rgba(255, 255, 255, 0), 0 7px 0 -12px #000000, inset 0 6px 12px rgba(255, 255, 255, 0.21)',
    borderRadius: '10px',
    fontSize: '18px',
    padding: '9px 19px',
    fontWeight: '100',
    transition: 'all 0s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    border: 'none',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs" id="barcode-scanner-modal-backdrop">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col" id="barcode-scanner-modal-content">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-[18px] text-black font-sans font-normal" style={{ fontSize: '18px', color: '#000' }}>
              Scannez un code-barres.
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={fermerButtonStyle}
            className="font-sans cursor-pointer transition-all"
          >
            Fermer
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-black flex flex-col items-center justify-center h-72" style={{ backgroundColor: '#000' }}>
          <style>{`
            #${elementId} {
              background-color: #000 !important;
              background: #000 !important;
            }
            #${elementId} video {
              object-fit: cover !important;
              width: 100% !important;
              height: 100% !important;
              background-color: #000 !important;
              background: #000 !important;
            }
            #${elementId} canvas {
              display: none !important;
            }
          `}</style>
          <div id={elementId} className="w-full h-full max-w-full overflow-hidden" />
          
          {isCameraActive && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none flex flex-col items-center justify-center">
              {/* Clean, custom CSS cutout hole style instead of default corners or dashed lines */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-24 bg-transparent outline outline-[2000px] outline-black/65 rounded" />
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-24 flex items-center justify-center pointer-events-none">
                <span className="text-[16px] text-white font-sans font-normal bg-[#fe4eba]/80 px-4 py-1.5 rounded tracking-normal shadow-sm">
                  Veuillez aligner le code-barres.
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white z-10" style={{ backgroundColor: '#fff' }}>
              <span className="text-[16px] font-sans" style={{ fontSize: '16px', color: '#000', fontWeight: 100 }}>
                Autorisez l'accès à la caméra et essayez à nouveau.
              </span>
            </div>
          )}

          {!isCameraActive && !errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white bg-black z-10" style={{ backgroundColor: '#000' }}>
              <span className="text-[16px] text-white font-sans font-normal" style={{ fontSize: '16px', color: '#fff' }}>
                Chargement du module.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
