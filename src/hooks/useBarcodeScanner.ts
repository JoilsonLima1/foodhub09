import { useState, useCallback, useEffect, useRef } from 'react';

export interface BarcodeScanResult {
  code: string;
  format: string;
  timestamp: Date;
}

export type ScannerMode = 'keyboard' | 'camera';

interface UseBarcodeScannerOptions {
  mode?: ScannerMode;
  onScan?: (result: BarcodeScanResult) => void;
  enabled?: boolean;
  // Keyboard mode settings
  minLength?: number;
  maxDelay?: number;
}

interface UseBarcodeScannerResult {
  // State
  isScanning: boolean;
  lastScan: BarcodeScanResult | null;
  error: string | null;
  isCameraSupported: boolean;
  
  // Camera mode controls
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  
  // Keyboard mode controls
  enableKeyboard: () => void;
  disableKeyboard: () => void;
  
  // Manual input
  processCode: (code: string) => void;
  
  // Clear last scan
  clearLastScan: () => void;
}

/**
 * Hook para leitura de código de barras
 * Suporta dois modos:
 * 1. Keyboard: leitores USB que emulam teclado
 * 2. Camera: leitura via câmera do dispositivo usando Barcode Detection API
 */
export function useBarcodeScanner(options: UseBarcodeScannerOptions = {}): UseBarcodeScannerResult {
  const {
    mode = 'keyboard',
    onScan,
    enabled = true,
    minLength = 4,
    maxDelay = 50, // ms between keystrokes
  } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<BarcodeScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyboardEnabled, setKeyboardEnabled] = useState(mode === 'keyboard' && enabled);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check camera support
  const isCameraSupported = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'BarcodeDetector' in window;

  // Process a scanned/entered code
  const processCode = useCallback((code: string) => {
    if (!code || code.length < minLength) return;
    
    const result: BarcodeScanResult = {
      code: code.trim(),
      format: detectBarcodeFormat(code),
      timestamp: new Date(),
    };
    
    setLastScan(result);
    onScan?.(result);
  }, [minLength, onScan]);

  // Detect barcode format from code structure
  const detectBarcodeFormat = (code: string): string => {
    const length = code.length;
    const isNumeric = /^\d+$/.test(code);
    
    if (isNumeric) {
      if (length === 13) return 'EAN-13';
      if (length === 12) return 'UPC-A';
      if (length === 8) return 'EAN-8';
      if (length === 14) return 'GTIN-14';
    }
    
    if (/^[A-Z0-9]+$/.test(code)) {
      if (length <= 10) return 'Code39';
      return 'Code128';
    }
    
    return 'Unknown';
  };

  // Handle keyboard input (for USB barcode scanners)
  useEffect(() => {
    if (!keyboardEnabled || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      // Check if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow normal typing in input fields, but still capture scanner input
        // Scanners type much faster than humans
        if (now - lastKeyTimeRef.current > maxDelay && bufferRef.current.length > 0) {
          // Too slow - probably human typing, reset buffer
          bufferRef.current = '';
        }
      }
      
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Handle Enter key - end of barcode scan
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          processCode(bufferRef.current);
        }
        bufferRef.current = '';
        return;
      }
      
      // Only capture printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Check timing - scanners are very fast
        if (now - lastKeyTimeRef.current > maxDelay && bufferRef.current.length > 0) {
          // Reset buffer if too much time has passed
          bufferRef.current = '';
        }
        
        bufferRef.current += e.key;
        lastKeyTimeRef.current = now;
        
        // Set timeout to process buffer if no Enter is received
        timeoutRef.current = setTimeout(() => {
          if (bufferRef.current.length >= minLength) {
            processCode(bufferRef.current);
          }
          bufferRef.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [keyboardEnabled, enabled, minLength, maxDelay, processCode]);

  // Start camera scanning
  const startCamera = useCallback(async (): Promise<boolean> => {
    if (!isCameraSupported) {
      setError('Câmera ou Barcode Detection API não suportada');
      return false;
    }

    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsScanning(true);
      
      // Start barcode detection loop
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });
      
      const detectBarcodes = async () => {
        if (!videoRef.current || !streamRef.current) return;
        
        try {
          const barcodes = await detector.detect(videoRef.current);
          
          if (barcodes.length > 0) {
            const barcode = barcodes[0];
            processCode(barcode.rawValue);
          }
        } catch (e) {
          console.error('Detection error:', e);
        }
        
        if (streamRef.current) {
          requestAnimationFrame(detectBarcodes);
        }
      };
      
      detectBarcodes();
      
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erro ao acessar câmera';
      setError(errorMessage);
      setIsScanning(false);
      return false;
    }
  }, [isCameraSupported, processCode]);

  // Stop camera scanning
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
  }, []);

  // Keyboard mode controls
  const enableKeyboard = useCallback(() => {
    setKeyboardEnabled(true);
  }, []);

  const disableKeyboard = useCallback(() => {
    setKeyboardEnabled(false);
    bufferRef.current = '';
  }, []);

  // Clear last scan
  const clearLastScan = useCallback(() => {
    setLastScan(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [stopCamera]);

  return {
    isScanning,
    lastScan,
    error,
    isCameraSupported,
    startCamera,
    stopCamera,
    videoRef,
    enableKeyboard,
    disableKeyboard,
    processCode,
    clearLastScan,
  };
}
