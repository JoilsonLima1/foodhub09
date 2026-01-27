import { useState, useCallback, useRef, useEffect } from 'react';

// Web Serial API types (not yet in standard TypeScript lib)
declare global {
  interface Navigator {
    serial: Serial;
  }
  
  interface Serial {
    requestPort(): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
  }
  
  interface SerialPort {
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
  }
  
  interface SerialOptions {
    baudRate: number;
    dataBits?: 7 | 8;
    stopBits?: 1 | 2;
    parity?: 'none' | 'even' | 'odd';
    flowControl?: 'none' | 'hardware';
  }
}

export interface ScaleConfig {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  flowControl: 'none' | 'hardware';
}

export interface ScaleReading {
  weight: number;
  unit: 'kg' | 'g';
  stable: boolean;
  timestamp: Date;
}

interface UseScaleResult {
  isConnected: boolean;
  isSupported: boolean;
  currentWeight: number | null;
  unit: 'kg' | 'g';
  isStable: boolean;
  connect: (config?: Partial<ScaleConfig>) => Promise<boolean>;
  disconnect: () => Promise<void>;
  requestWeight: () => Promise<ScaleReading | null>;
  error: string | null;
}

const DEFAULT_CONFIG: ScaleConfig = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
};

/**
 * Hook para integração com balança via Web Serial API
 * Suporta balanças Toledo, Filizola, Urano e outras compatíveis com protocolo serial
 */
export function useScale(): UseScaleResult {
  const [isConnected, setIsConnected] = useState(false);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [unit, setUnit] = useState<'kg' | 'g'>('kg');
  const [isStable, setIsStable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const isReadingRef = useRef(false);

  // Check if Web Serial API is supported
  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  // Parse weight data from scale response
  const parseWeightData = useCallback((data: string): ScaleReading | null => {
    try {
      // Common scale protocols:
      // Toledo/Prix: "ST,GS, 001.234kg" or "ST,GS, 001234g"
      // Filizola: "P 001.234"
      // Generic: digits with optional decimal point
      
      const cleanData = data.trim().toUpperCase();
      
      // Check stability indicator
      const stable = cleanData.includes('ST') || !cleanData.includes('US');
      
      // Extract numeric value
      const numberMatch = cleanData.match(/[\d]+[.,]?[\d]*/);
      if (!numberMatch) return null;
      
      let weight = parseFloat(numberMatch[0].replace(',', '.'));
      
      // Detect unit
      let detectedUnit: 'kg' | 'g' = 'kg';
      if (cleanData.includes('G') && !cleanData.includes('KG')) {
        detectedUnit = 'g';
        weight = weight / 1000; // Convert to kg for consistency
      }
      
      return {
        weight,
        unit: detectedUnit,
        stable,
        timestamp: new Date(),
      };
    } catch (e) {
      console.error('Error parsing scale data:', e);
      return null;
    }
  }, []);

  // Read data from serial port continuously
  const startReading = useCallback(async () => {
    if (!portRef.current || isReadingRef.current) return;
    
    isReadingRef.current = true;
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (portRef.current?.readable && isReadingRef.current) {
        readerRef.current = portRef.current.readable.getReader();
        
        try {
          while (true) {
            const { value, done } = await readerRef.current.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Look for complete messages (usually end with CR/LF)
            const lines = buffer.split(/[\r\n]+/);
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim()) {
                const reading = parseWeightData(line);
                if (reading) {
                  setCurrentWeight(reading.weight);
                  setUnit(reading.unit);
                  setIsStable(reading.stable);
                }
              }
            }
          }
        } catch (e) {
          if (isReadingRef.current) {
            console.error('Read error:', e);
          }
        } finally {
          readerRef.current?.releaseLock();
          readerRef.current = null;
        }
      }
    } catch (e) {
      console.error('Reading loop error:', e);
    }
  }, [parseWeightData]);

  // Connect to scale
  const connect = useCallback(async (config?: Partial<ScaleConfig>): Promise<boolean> => {
    if (!isSupported) {
      setError('Web Serial API não suportada neste navegador');
      return false;
    }

    try {
      setError(null);
      
      // Request port selection from user
      const port = await navigator.serial.requestPort();
      
      const finalConfig = { ...DEFAULT_CONFIG, ...config };
      
      await port.open({
        baudRate: finalConfig.baudRate,
        dataBits: finalConfig.dataBits as 7 | 8,
        stopBits: finalConfig.stopBits as 1 | 2,
        parity: finalConfig.parity,
        flowControl: finalConfig.flowControl,
      });
      
      portRef.current = port;
      setIsConnected(true);
      
      // Start continuous reading
      startReading();
      
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erro ao conectar à balança';
      setError(errorMessage);
      setIsConnected(false);
      return false;
    }
  }, [isSupported, startReading]);

  // Disconnect from scale
  const disconnect = useCallback(async () => {
    isReadingRef.current = false;
    
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.error('Error canceling reader:', e);
      }
      readerRef.current = null;
    }
    
    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (e) {
        console.error('Error closing port:', e);
      }
      portRef.current = null;
    }
    
    setIsConnected(false);
    setCurrentWeight(null);
    setIsStable(false);
  }, []);

  // Request a single weight reading
  const requestWeight = useCallback(async (): Promise<ScaleReading | null> => {
    if (!portRef.current?.writable) {
      setError('Balança não conectada');
      return null;
    }

    try {
      // Send weight request command (varies by scale model)
      // Common commands: ENQ (0x05), 'P', 'W', '$'
      const writer = portRef.current.writable.getWriter();
      await writer.write(new Uint8Array([0x05])); // ENQ
      writer.releaseLock();
      
      // Wait a bit for response
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (currentWeight !== null) {
        return {
          weight: currentWeight,
          unit,
          stable: isStable,
          timestamp: new Date(),
        };
      }
      
      return null;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erro ao solicitar peso';
      setError(errorMessage);
      return null;
    }
  }, [currentWeight, unit, isStable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isSupported,
    currentWeight,
    unit,
    isStable,
    connect,
    disconnect,
    requestWeight,
    error,
  };
}
