"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";

interface ExcelEditorProps {
  fileUrl: string;
}

declare global {
  interface Window {
    Office: typeof Office;
  }
}

const ExcelEditor: React.FC<ExcelEditorProps> = ({ fileUrl }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExcelLoaded, setIsExcelLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';
    script.onload = initializeExcel;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initializeExcel = () => {
    if (iframeRef.current) {
      iframeRef.current.onload = () => {
        window.Office.initialize = () => {
          setIsExcelLoaded(true);
        };
      };
    }
  };

  const updateExcelContent = () => {
    console.log('Clicked');
    if (!isExcelLoaded) {
      console.error('Excel is not loaded yet');
      return;
    }

    window.Office.context.document.setSelectedDataAsync(
      "Hello from Next.js!",
      {
        coercionType: window.Office.CoercionType.Text
      },
      (result) => {
        if (result.status === window.Office.AsyncResultStatus.Succeeded) {
          console.log('Content updated successfully');
        } else {
          console.error('Error updating content:', result.error.message);
        }
      }
    );
  };

  return (
    <div>
      <iframe
        ref={iframeRef}
        src={fileUrl}
        width="800"
        height="600"
        style={{ border: 'none' }}
      />
      <Button onClick={updateExcelContent} disabled={!isExcelLoaded}>
        Update Excel Content
      </Button>
    </div>
  );
};

export default ExcelEditor;