import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useLinkClickHandler } from 'react-router-dom';

// Pin the worker to the exact installed pdfjs-dist version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export default function PdfViewer(){
    const [file, setFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isDragOver, setIsDragOver] = useState(false);
    const [fileName, setFileName] = useState('');


    const handleFile = useCallback((f)=>{
        if(!f||f.type!=='application/pdf') return;

        setFile(f);
        setFileName(f.name);
        setCurrentPage(1);
        setNumPages(null);
    }, []);

    const onDrop = (e) =>{
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

    return(
        <div>
            
        </div>
    )

}
