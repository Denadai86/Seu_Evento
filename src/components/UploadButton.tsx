"use client";

import { CldUploadWidget } from 'next-cloudinary';

interface UploadButtonProps {
  onUpload: (url: string) => void;
  label: string;
}

export default function UploadButton({ onUpload, label }: UploadButtonProps) {
  return (
    <CldUploadWidget 
      uploadPreset="bingo_uploads" // O nome que você criou no Cloudinary
      onSuccess={(result: any) => {
        onUpload(result.info.secure_url);
      }}
    >
      {({ open }) => {
        return (
          <button 
            type="button"
            onClick={() => open()}
            className="w-full py-2 px-4 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            📷 {label}
          </button>
        );
      }}
    </CldUploadWidget>
  );
}