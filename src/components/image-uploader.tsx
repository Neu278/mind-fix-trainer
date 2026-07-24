import "react-image-crop/dist/ReactCrop.css";
import { useCallback, useRef, useState } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Crop as CropIcon, RotateCcw } from "lucide-react";

export type UploaderValue = {
  dataUrl: string;
  mimeType: string;
};

export function ImageUploader({
  value,
  onChange,
}: {
  value: UploaderValue | null;
  onChange: (v: UploaderValue | null) => void;
}) {
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [dragOver, setDragOver] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setRawUrl(reader.result as string);
      onChange(null);
      setCrop(undefined);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: "%", width: 90 }, width / height, width, height), width, height));
  };

  const applyCrop = () => {
    if (!imgRef.current || !crop || !crop.width || !crop.height) return;
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const cropX = (crop.unit === "%" ? (crop.x / 100) * image.width : crop.x) * scaleX;
    const cropY = (crop.unit === "%" ? (crop.y / 100) * image.height : crop.y) * scaleY;
    const cropW = (crop.unit === "%" ? (crop.width / 100) * image.width : crop.width) * scaleX;
    const cropH = (crop.unit === "%" ? (crop.height / 100) * image.height : crop.height) * scaleY;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onChange({ dataUrl, mimeType: "image/jpeg" });
  };

  const reset = () => {
    onChange(null);
    setRawUrl(null);
    setCrop(undefined);
    if (fileRef.current) fileRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
  };

  if (value) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border bg-card p-3">
          <img src={value.dataUrl} alt="선택된 문제" className="max-h-[420px] mx-auto rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-1" /> 다시 선택
          </Button>
        </div>
      </div>
    );
  }

  if (rawUrl) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border bg-card p-3">
          <ReactCrop crop={crop} onChange={(_, pc) => setCrop(pc)} keepSelection>
            <img ref={imgRef} src={rawUrl} alt="크롭할 이미지" onLoad={onImageLoad} className="max-h-[420px] mx-auto" />
          </ReactCrop>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            문제 부분만 드래그해서 선택한 뒤 <b>크롭 확정</b>을 눌러주세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-1" /> 취소
          </Button>
          <Button onClick={applyCrop} className="flex-1">
            <CropIcon className="h-4 w-4 mr-1" /> 크롭 확정
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/30"
        }`}
      >
        <Upload className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-3 font-semibold">문제 이미지를 업로드하세요</p>
        <p className="mt-1 text-sm text-muted-foreground">클릭하거나 이미지를 여기에 드래그해서 놓아주세요</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> 파일 선택
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => camRef.current?.click()}>
          <Camera className="h-4 w-4 mr-1" /> 카메라 촬영
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
