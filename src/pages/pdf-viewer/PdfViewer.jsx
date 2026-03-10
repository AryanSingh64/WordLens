import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useLinkClickHandler } from 'react-router-dom';

// Import the worker locally using Vite's ?url query.
// Chrome Extension Manifest V3 blocks downloading external scripts (like unpkg),
// so this forces Vite to copy the worker into our dist/ folder.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfViewer() {
    const [file, setFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isDragOver, setIsDragOver] = useState(false);
    const [fileName, setFileName] = useState('');


    const handleFile = useCallback((f) => {
        if (!f || f.type !== 'application/pdf') return;

        setFile(f);
        setFileName(f.name);
        setCurrentPage(1);
        setNumPages(null);
    }, []);

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        handleFile(droppedFile);
    };

    const onFileInput = (e) => {
        handleFile(e.target.files[0]);
    };


    const goToPrev = () => setCurrentPage(p => Math.max(1, p - 1));
    const goToNext = () => setCurrentPage(p => Math.min(numPages, p + 1));

    return (
        <div className="min-h-screen bg-[#111] text-[#FAFAFA] font-sans flex flex-col">
            <header className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-[#2a2a2a] py-2.5 px-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <span className="font-sans font-bold text-[17px] tracking-tight">
                        WordLens
                    </span>
                    <span className="text-xs text-[#666] pl-2 border-l border-[#333]">
                        PDF Reader
                    </span>
                </div>


                {fileName && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] text-[#999] max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap pointer-events-none">
                        {fileName}
                    </span>
                )}


                {/* Action buttons */}
                <div className="flex items-center gap-3">
                    {file && (
                        <button
                            onClick={() => setFile(null)}
                            className="text-[13px] text-[#FAFAFA] cursor-pointer py-1.5 px-3.5 rounded-md border border-[#333] bg-[#1a1a1a] whitespace-nowrap transition-colors hover:bg-[#222]"
                        >
                            Close PDF
                        </button>
                    )}
                    <label className="text-[13px] text-[#4ade80] cursor-pointer py-1.5 px-3.5 rounded-md border border-[#166534] bg-[#052e16] whitespace-nowrap transition-colors hover:bg-[#064e3b]">
                        Open PDF
                        <input type="file" accept=".pdf" onChange={onFileInput} className="hidden" />
                    </label>
                </div>
            </header>

            {/* ─── Main Area ─── */}
            <main className="flex-1 flex justify-center py-8 px-6">
                {!file ? (
                    // Drop Zone
                    <div
                        onDrop={onDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        className={`flex flex-col items-center justify-center gap-4 w-full max-w-[560px] h-[320px] rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 self-center ${isDragOver ? 'border-[#4ade80] bg-[#052e16]' : 'border-[#333] bg-[#161616]'}`}
                    >
                        <span className="text-[40px]">📄</span>
                        <p className={`text-lg font-semibold m-0 ${isDragOver ? 'text-[#4ade80]' : 'text-[#FAFAFA]'}`}>
                            Drop a PDF here
                        </p>
                        <p className="text-sm text-[#666] m-0">or click to browse</p>
                        <label className="mt-2 py-2 px-5 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-[#999] cursor-pointer transition-colors duration-150 hover:border-[#444]">
                            Browse files
                            <input type="file" accept=".pdf" onChange={onFileInput} className="hidden" />
                        </label>
                    </div>
                ) : (
                    // PDF Pages
                    <Document
                        file={file}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        onLoadError={(err) => console.error('PDF load error:', err)}
                        loading={
                            <div className="text-[#666] text-sm">Loading PDF...</div>
                        }
                    >
                        <Page
                            pageNumber={currentPage}
                            width={Math.min(window.innerWidth - 80, 900)}
                            renderTextLayer={true}
                            renderAnnotationLayer={false}
                            loading={
                                <div className="w-[800px] h-[1000px] bg-[#1a1a1a] rounded-lg animate-pulse" />
                            }
                        />
                    </Document>
                )}
            </main>

            {/* Floating Page Controls at Bottom Right */}
            {numPages && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#1a1a1a] p-2 rounded-xl border border-[#333] shadow-2xl">
                    <button
                        onClick={goToPrev}
                        disabled={currentPage <= 1}
                        className={`py-1.5 px-3.5 rounded-md border text-[13px] transition-all duration-150 ${currentPage <= 1 ? 'bg-[#111] border-[#333] text-[#444] cursor-not-allowed' : 'bg-[#1a1a1a] border-[#444] text-[#FAFAFA] cursor-pointer hover:bg-[#333]'}`}
                    >
                        ← Prev
                    </button>
                    <span className="text-[13px] text-[#FAFAFA] font-medium min-w-[50px] text-center">
                        {currentPage} / {numPages}
                    </span>
                    <button
                        onClick={goToNext}
                        disabled={currentPage >= numPages}
                        className={`py-1.5 px-3.5 rounded-md border text-[13px] transition-all duration-150 ${currentPage >= numPages ? 'bg-[#111] border-[#333] text-[#444] cursor-not-allowed' : 'bg-[#1a1a1a] border-[#444] text-[#FAFAFA] cursor-pointer hover:bg-[#333]'}`}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
