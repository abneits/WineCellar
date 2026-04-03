"use client";

import { useRef } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanCaptureProps {
  onCapture: (file: File) => void;
  isLoading: boolean;
}

export function ScanCapture({ onCapture, isLoading }: ScanCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <div className="w-48 h-64 rounded-2xl border-2 border-dashed border-burgundy/40 flex items-center justify-center bg-wood">
        {isLoading ? (
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-cream/50">Analyzing…</p>
          </div>
        ) : (
          <p className="text-cream/20 text-sm text-center px-4 font-serif italic">
            Point at a wine bottle label
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => cameraRef.current?.click()}
          disabled={isLoading}
          className="bg-burgundy hover:bg-burgundy-600 text-cream gap-2"
          size="lg"
        >
          <Camera size={18} />
          Take Photo
        </Button>
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          variant="outline"
          className="border-burgundy/40 text-cream hover:bg-wood gap-2"
          size="lg"
        >
          <Upload size={18} />
          Upload
        </Button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
