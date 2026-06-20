import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw } from 'lucide-react';

// Resize image to prevent massive browser heap memory crashes on Safari (iOS devices)
const resizeImageToMaxDimension = (file: File, maxDimension: number): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
                lastModified: file.lastModified,
              });
              resolve(resizedFile);
            } else {
              resolve(file);
            }
          },
          file.type || 'image/jpeg',
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isScanningFile, setIsScanningFile] = useState<boolean>(false);
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementId = "html5-qrcode-scanner-element";

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setIsCameraActive(false);
    let html5QrcodeInstance: Html5Qrcode | null = null;
    let isMounted = true;

    // Timeout to make sure target container div exists in the DOM
    const timer = setTimeout(() => {
      try {
        html5QrcodeInstance = new Html5Qrcode(elementId);
        qrCodeInstanceRef.current = html5QrcodeInstance;

        const config = {
          fps: 25,
          // CRITICAL: We DO NOT pass a qrbox here. Doing so enables FULL-FRAME scanning under the hood.
          // By scanning the entire uncropped high-resolution stream, we bypass iOS canvas cropping misalignment bugs
          // and let the ZXing engine scan wide horizontal barcodes with 100% of the camera's resolution.
          // Our visual CSS frame on top is purely visual, guiding the user where to align the barcode.
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
          ],
          experimentalFeatures: {
            // Enabled native barcode detector! iOS 17+ supports this natively. It uses the Apple Neural Engine
            // to spot linear barcodes instantly and flawlessly on the camera stream with zero lag.
            useBarCodeDetectorIfSupported: true,
          }
        };

        const tryStart = (facingModeSpec: any) => {
          if (!html5QrcodeInstance) return Promise.reject("Instance not ready");
          return html5QrcodeInstance.start(
            facingModeSpec,
            config,
            (decodedText) => {
              if (isMounted) {
                onScanSuccess(decodedText);
                stopAndUnmount();
              }
            },
            () => {
              // Silent negative frame captures
            }
          );
        };

        // Try high-resolution camera on environment mode FIRST to ensure razor-sharp linear barcode lines
        tryStart({
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        })
          .then(() => {
            if (isMounted) setIsCameraActive(true);
          })
          .catch((highResErr) => {
            console.warn("High-res camera stream start failed on iOS. Trying standard environment stream...", highResErr);
            if (!isMounted) return;

            // Fallback 1: Standard environment facing mode
            tryStart({ facingMode: 'environment' })
              .then(() => {
                if (isMounted) setIsCameraActive(true);
              })
              .catch((firstErr) => {
                console.warn("First fallback scanner start failed. Trying exact constraint...", firstErr);
                if (!isMounted) return;

                // Fallback 2: Try exact environment constraint
                tryStart({ facingMode: { exact: 'environment' } })
                  .then(() => {
                    if (isMounted) setIsCameraActive(true);
                  })
                  .catch((secondErr) => {
                    console.warn("Second fallback scanner start failed. Searching devices list...", secondErr);
                    if (!isMounted) return;

                    // Fallback 3: Query available camera devices and bind first rear camera
                    Html5Qrcode.getCameras()
                      .then((devices) => {
                        if (!isMounted) return;
                        if (devices && devices.length > 0) {
                          const backCam = devices.find(device => 
                            device.label.toLowerCase().includes('back') || 
                            device.label.toLowerCase().includes('arrière') ||
                            device.label.toLowerCase().includes('environment') ||
                            device.label.toLowerCase().includes('cam 0')
                          ) || devices[0];

                          tryStart({ deviceId: backCam.id })
                            .then(() => {
                              if (isMounted) setIsCameraActive(true);
                            })
                            .catch((thirdErr) => {
                              console.error("All camera active attempts failed:", thirdErr);
                              if (isMounted) {
                                setErrorMsg("Impossible d'activer la caméra en direct.");
                              }
                            });
                        } else {
                          if (isMounted) {
                            setErrorMsg("Aucun périphérique de caméra détecté.");
                          }
                        }
                      })
                      .catch((camErr) => {
                        console.error("Camera listing lookup error:", camErr);
                        if (isMounted) {
                          setErrorMsg("Impossible de scanner en direct. Utilisez la photo failsafe.");
                        }
                      });
                  });
              });
          });

      } catch (err) {
        console.error("Scanner setup error:", err);
        if (isMounted) {
          setErrorMsg("Erreur d'initialisation du scanner.");
        }
      }
    }, 200);

    const stopAndUnmount = () => {
      if (html5QrcodeInstance && html5QrcodeInstance.isScanning) {
        html5QrcodeInstance.stop().then(() => {
          if (isMounted) setIsCameraActive(false);
        }).catch(err => console.error("Error stopping scanner on unmount:", err));
      }
    };

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopAndUnmount();
    };
  }, [isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsScanningFile(true);
    setErrorMsg(null);

    try {
      let localInstance = qrCodeInstanceRef.current;
      if (!localInstance) {
        localInstance = new Html5Qrcode(elementId);
        qrCodeInstanceRef.current = localInstance;
      }

      if (localInstance.isScanning) {
        try {
          await localInstance.stop();
        } catch (stopErr) {
          console.warn("Stopping scanner failed before file decode:", stopErr);
        }
        setIsCameraActive(false);
      }

      // 1. Optimize image resolution to a maximum of 1000px and compress.
      // This completely runs in local browser memory and avoids crashing the Safari / Chrome iOS memory sandbox!
      const optimizedFile = await resizeImageToMaxDimension(rawFile, 1000);

      // 2. Decode the resized image using ZXing. It will scan quickly and consume very low RAM resources.
      const decodedText = await localInstance.scanFile(optimizedFile, true);
      onScanSuccess(decodedText);
      onClose(); // Auto-close upon successful trigger
    } catch (err) {
      console.error("File selection scan error:", err);
      setErrorMsg("Aucun code-barres n'a pu être détecté. Prenez une photo nette et de plus près.");
    } finally {
      setIsScanningFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear file selector input cache
      }
    }
  };

  if (!isOpen) return null;

  const fermerButtonStyle: React.CSSProperties = {
    backgroundColor: '#334155',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '14px',
    padding: '7px 16px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs" id="barcode-scanner-modal-backdrop">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col" id="barcode-scanner-modal-content">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-[17px] text-slate-800 font-sans font-semibold">
              Scannez un code-barres
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={fermerButtonStyle}
            className="font-sans hover:bg-slate-700 cursor-pointer transition-all"
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
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-24 bg-transparent outline outline-[2000px] outline-black/65 rounded-md border-2 border-dashed border-indigo-400 shadow-inner" />
              <div className="absolute top-[calc(50%+4rem)] left-1/2 -translate-x-1/2 w-[90%] flex flex-col items-center justify-center pointer-events-none gap-1">
                <span className="text-[12px] text-white font-sans font-medium bg-indigo-600/95 px-4 py-1.5 rounded-full tracking-normal shadow-md text-center max-w-[90%]">
                  Alignez le code-barres dans le cadre
                </span>
                <span className="text-[10px] text-slate-200 font-sans font-normal bg-black/75 px-3 py-1 rounded-md text-center mt-1 scale-95 border border-white/10">
                  💡 Éloignez votre iPhone/iPad (15-20 cm) pour faire le focus !
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50 z-10">
              <span className="text-[14px] text-slate-700 font-sans font-medium mb-1">
                {errorMsg}
              </span>
              <span className="text-[11.5px] text-slate-400 font-sans">
                Veuillez utiliser l'option photo ci-dessous pour procéder.
              </span>
            </div>
          )}

          {!isCameraActive && !errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white bg-black z-10" style={{ backgroundColor: '#000' }}>
              <span className="text-[14px] text-white font-sans font-normal" style={{ fontSize: '14px', color: '#fff' }}>
                Recherche de caméra en cours...
              </span>
            </div>
          )}
        </div>

        {/* Action Button for iPhone (Failsafe native camera & photo picker) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col items-center justify-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanningFile}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-sans font-semibold py-3 px-4 rounded-xl shadow-md transition-all text-sm cursor-pointer border-0 active:scale-95"
          >
            {isScanningFile ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                Lecture du code-barres de l'image...
              </>
            ) : (
              <>
                <Camera className="w-4.5 h-4.5" />
                Dépannage : Prendre une photo (Failsafe iPhone)
              </>
            )}
          </button>
          
          <p className="text-[10.5px] text-slate-550 font-sans text-center max-w-xs leading-relaxed mt-1">
            Si votre iPhone/Safari bloque la caméra en direct ou affiche un écran noir, cliquez ici pour prendre une photo nette en haute définition. Elle sera décodée instantanément !
          </p>
        </div>
      </div>
    </div>
  );
};
