'use client';

import { FileIcon, LinkIcon, UploadIcon, XIcon } from "lucide-react";
import React, { JSX, useState, useRef, ChangeEvent } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Input } from "@/components/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { Button } from "@/components/button";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";

// --- (No changes to constants and helper functions) ---
const TRAINING_FILE_MIMES = [
  'application/pdf',
  'video/mp4',
  'text/csv',
  'text/plain',
];
const STUDENT_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
];
const getExtensionList = (mimeTypes: string[]) => {
  return mimeTypes.map(mime => {
    if (mime === 'application/pdf') return 'PDF';
    if (mime === 'video/mp4') return 'MP4';
    if (mime === 'text/csv') return 'CSV';
    if (mime === 'text/plain') return 'TXT';
    if (mime === 'video/quicktime') return 'MOV';
    if (mime === 'video/x-matroska') return 'MKV';
    if (mime === 'video/webm') return 'WEBM';
    return mime.split('/')[1]?.toUpperCase() || mime;
  }).join(', ');
};


function UploadResources(): JSX.Element {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDraggingOverTraining, setIsDraggingOverTraining] = useState(false);
  const [isDraggingOverStudent, setIsDraggingOverStudent] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState<"links" | "paste">("links");
  const inputPlaceholder = activeInputTab === "links" ? "Paste URLs here" : "Paste text here";
  const [showUploadCard, setShowUploadCard] = useState(false);
  const toggleUploadCard = () => {
    setShowUploadCard(prev => !prev);
  };
  const trainingFileInputRef = useRef<HTMLInputElement>(null);
  const studentVideoFileInputRef = useRef<HTMLInputElement>(null);

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFiles = (
    files: FileList | null,
    allowedMimes: string[],
    setErrorCallback: (error: string) => void
  ) => {
    if (!files) return;
    const newFiles: File[] = [];
    const invalidFileNames: string[] = [];
    Array.from(files).forEach(file => {
      const isDuplicate = uploadedFiles.some(existingFile => existingFile.name === file.name);
      if (allowedMimes.includes(file.type) && !isDuplicate) {
        newFiles.push(file);
      } else if (!allowedMimes.includes(file.type)) {
        invalidFileNames.push(file.name);
      }
    });
    if (invalidFileNames.length > 0) {
      const allowedExtensions = getExtensionList(allowedMimes);
      alert(`Invalid file type(s) for: ${invalidFileNames.join(', ')}. Supported types: ${allowedExtensions}.`);
    }
    if (newFiles.length > 0) {
      setUploadedFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  // --- (No changes to handler functions) ---
  const handleDragEnterTraining = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverTraining(true); };
  const handleDragLeaveTraining = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverTraining(false); };
  const handleDropTraining = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverTraining(false); processFiles(e.dataTransfer.files, TRAINING_FILE_MIMES, (msg) => console.error(msg)); };
  const handleTrainingFileSelect = (e: ChangeEvent<HTMLInputElement>) => { processFiles(e.target.files, TRAINING_FILE_MIMES, (msg) => console.error(msg)); e.target.value = ''; };
  const handleDragEnterStudent = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverStudent(true); };
  const handleDragLeaveStudent = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverStudent(false); };
  const handleDropStudent = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverStudent(false); processFiles(e.dataTransfer.files, STUDENT_VIDEO_MIMES, (msg) => console.error(msg)); };
  const handleStudentVideoSelect = (e: ChangeEvent<HTMLInputElement>) => { processFiles(e.target.files, STUDENT_VIDEO_MIMES, (msg) => console.error(msg)); e.target.value = ''; };
  const handleSubmit = () => { console.log("Submit button clicked! Uploading files:", uploadedFiles); };


  return (
    <div className="w-full h-full overflow-hidden font-jakarta-sans">
      {/* MODIFICATION: Added padding to the container for small screens */}
      <div className="relative w-full h-full p-4 md:p-0">
        <div className="flex items-center justify-center h-full">
          {showUploadCard && (
            // MODIFICATION: Card width is now responsive. It's full-width on mobile and capped at 750px on larger screens.
            <Card className="w-full max-w-[750px] rounded-[32px] border border-solid border-[#566fe980] shadow-[0px_6px_20px_#00000026] flex flex-col">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="font-display-medium text-black text-2xl sm:text-3xl">
                  Upload files
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex flex-col flex-grow p-4 sm:px-8 sm:pb-8">

                <div className="flex-grow space-y-6">

                  {/* 
                    MODIFICATION: The upload areas stack vertically on small/medium screens (`flex-col`) 
                    and go side-by-side on large screens (`lg:flex-row`). 
                  */}
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* 
                      MODIFICATION: Each upload area is full-width on smaller screens (`w-full`) and 
                      half-width on large screens (`lg:w-1/2`). Height is also adjusted.
                    */}
                    <div
                      className={`w-full lg:w-1/2 h-[180px] lg:h-[218px] rounded-xl border border-dashed border-[#9aa6f2] flex items-center justify-center cursor-pointer transition-all duration-200 ${isDraggingOverTraining ? 'border-solid border-2 border-green-500 bg-green-50/20' : ''}`}
                      onDragOver={handleDragOver} onDragEnter={handleDragEnterTraining} onDragLeave={handleDragLeaveTraining} onDrop={handleDropTraining} onClick={() => trainingFileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-3 p-4">
                        <UploadIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[#566fe9]" />
                        <p className="font-paragraph-extra-large text-center text-base sm:text-lg"><span className="text-black">Drop or </span><span className="text-[#566fe9]">Select</span><span className="text-black"> Training Files</span></p>
                        <p className="font-semibold font-weight-600 text-[#878787] text-sm text-center">File supported: {getExtensionList(TRAINING_FILE_MIMES)}</p>
                        <input type="file" ref={trainingFileInputRef} onChange={handleTrainingFileSelect} multiple accept={TRAINING_FILE_MIMES.join(',')} className="hidden" />
                      </div>
                    </div>
                    <div
                      className={`w-full lg:w-1/2 h-[180px] lg:h-[218px] rounded-xl border border-dashed border-[#9aa6f2] flex items-center justify-center cursor-pointer transition-all duration-200 ${isDraggingOverStudent ? 'border-solid border-2 border-green-500 bg-green-50/20' : ''}`}
                      onDragOver={handleDragOver} onDragEnter={handleDragEnterStudent} onDragLeave={handleDragLeaveStudent} onDrop={handleDropStudent} onClick={() => studentVideoFileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-3 p-4">
                        <UploadIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[#566fe9]" />
                        <p className="font-paragraph-extra-large text-center text-base sm:text-lg"><span className="text-black">Drop or </span><span className="text-[#566fe9]">Select</span><span className="text-black"> Student Videos</span></p>
                        <p className="font-semibold font-weight-600 text-[#878787] text-sm text-center">File supported: {getExtensionList(STUDENT_VIDEO_MIMES)}</p>
                        <input type="file" ref={studentVideoFileInputRef} onChange={handleStudentVideoSelect} multiple accept={STUDENT_VIDEO_MIMES.join(',')} className="hidden" />
                      </div>
                    </div>
                  </div>

                  {/* 
                    MODIFICATION: The input bar stacks (`flex-col`) on small screens and becomes a row (`sm:flex-row`)
                    on larger screens. Height and padding are adjusted for responsiveness.
                  */}
                  <div className="flex flex-col sm:flex-row sm:h-12 items-center gap-3 p-2 bg-white rounded-[36px] border border-solid border-[#566fe94c]">
                    <Tabs defaultValue="links" className="w-full sm:w-[260px]" onValueChange={(value: string) => setActiveInputTab(value as "links" | "paste")}>
                      {/* MODIFICATION: Used a grid to ensure tabs are evenly spaced on mobile */}
                      <TabsList className="h-10 p-0 bg-transparent grid grid-cols-2 w-full">
                        {/* MODIFICATION: Reduced padding on tabs for smaller screens */}
                        <TabsTrigger value="links" className="h-10 data-[state=active]:bg-[#566fe91a] data-[state=active]:text-[#566fe9] data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#566fe9] data-[state=inactive]:opacity-80 rounded-[40px] px-4 sm:px-10"><LinkIcon className="w-5 h-5 mr-2" />Links</TabsTrigger>
                        <TabsTrigger value="paste" className="h-10 data-[state=active]:bg-[#566fe91a] data-[state=active]:text-[#566fe9] data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#566fe9] data-[state=inactive]:opacity-80 rounded-[40px] px-4 sm:px-10">Paste text</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Input className="border-none font-paragraph-large text-black placeholder:text-gray-500 focus-visible:ring-0 pl-4 sm:pl-6 w-full" placeholder={inputPlaceholder} />
                  </div>

                  {/* Uploaded files list */}
                  <div className="flex flex-col w-full gap-3">
                    {uploadedFiles.length === 0 && (<p className="text-center text-gray-500 text-sm">No files uploaded yet.</p>)}
                    {uploadedFiles.map((file) => (
                      <div key={file.name} className="flex items-center justify-between w-full p-2 bg-gray-50 rounded-md">
                        {/* MODIFICATION: Added text truncation for very long file names on small screens */}
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          <span className="font-paragraph-large text-black truncate">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button onClick={() => handleRemoveFile(file.name)} className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded-full hover:bg-red-50 flex-shrink-0" aria-label={`Remove ${file.name}`}><XIcon className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <Button
                    className="w-full py-3 px-12 sm:px-[81px] bg-[#566fe9] text-white rounded-[100px] h-auto"
                    onClick={handleSubmit}
                    disabled={uploadedFiles.length === 0}
                  >
                    Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Sphere />
      <div className="fixed bottom-0 left-0 right-0">
        <Footer
          showUploadButtonInFooter={true}
          onUploadClick={toggleUploadCard}
        />
      </div>
    </div>
  );
}

export default UploadResources;