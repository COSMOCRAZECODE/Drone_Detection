import { useState, useRef } from 'react';
import { uploadImage } from '../api';
import { UploadCloud, Image as ImageIcon, AlertTriangle, CheckCircle } from 'lucide-react';

export default function UploadDetect() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setResult(null);
        }
    };


    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await uploadImage(file);
            setResult(res.result);
        } catch (err) {
            console.error("Upload failed", err);
            alert('Error connecting to backend');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Image Detection</h1>
                <p className="text-muted mt-2">Upload an image from your PC to scan for drones.</p>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="mb-4">
                        <label className="input-label mb-2 block">Select an image</label>
                        <div className="p-8 border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[rgba(15,23,42,0.4)] flex flex-col items-center justify-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                id="file-upload"
                                style={{ display: 'none' }}
                            />
                            <UploadCloud size={48} className="mx-auto text-muted mb-4" />
                            <label htmlFor="file-upload" className="btn btn-secondary cursor-pointer mb-2">
                                {file ? file.name : "Choose File..."}
                            </label>
                            <p className="text-sm font-semibold text-[var(--text-muted)] mt-2">JPG, PNG up to 10MB</p>
                        </div>
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={!file || loading}
                        className="btn btn-primary btn-full shadow-lg"
                    >
                        {loading ? 'Processing Image...' : 'Run YOLOv11 Detection'}
                    </button>
                </div>

                <div className="card flex flex-col items-center">
                    <h3 className="text-lg w-full mb-4 font-semibold text-muted">Preview & Results</h3>

                    <div className="image-preview-container mb-4">
                        {preview ? (
                            <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="relative" style={{ display: 'inline-block', maxHeight: '100%', maxWidth: '100%' }}>
                                    <img
                                        src={result?.filename ? `${import.meta.env.VITE_API_URL || API_URL}/uploads/${result.filename}?t=${Date.now()}` : preview}
                                        alt="Upload preview"
                                        style={{ maxHeight: '100%', maxWidth: '100%', display: 'block', objectFit: 'contain' }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-muted flex flex-col items-center">
                                <ImageIcon size={48} className="mb-2 opacity-30" />
                                <span>No image selected</span>
                            </div>
                        )}
                    </div>

                    {result && (
                        <div className="w-full mt-4 p-4 rounded-lg bg-[rgba(15,23,42,0.8)] border border-[var(--border-color)]">
                            {result.drone_detected ? (
                                <div className="flex flex-col items-center gap-2">
                                    <AlertTriangle size={32} className="text-danger" />
                                    <h4 className="text-xl font-bold text-danger">Drone Detected</h4>
                                    <p className="text-muted mt-2">
                                        Confidence: <span className="text-white font-mono">{(result.confidence * 100).toFixed(1)}%</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <CheckCircle size={32} className="text-[var(--accent)]" />
                                    <h4 className="text-xl font-bold text-[var(--accent)]">Area Clear</h4>
                                    <p className="text-muted mt-2">No drones were found in this image.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
