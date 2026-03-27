import React, { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Target } from '../../../shared/types';

interface TargetUploaderProps {
  onTargetsLoaded: (targets: Target[]) => void;
}

export const TargetUploader: React.FC<TargetUploaderProps> = ({ onTargetsLoaded }) => {
  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

          const targets: Target[] = jsonData.map((row) => {
            // Extract phone number (look for common column names)
            const phoneNumber = String(
              row['Number'] ||
              row['Phone'] ||
              row['Phone Number'] ||
              row['PhoneNumber'] ||
              row['number'] ||
              row['phone'] ||
              ''
            );

            // Extract name
            const name = String(
              row['Name'] || row['name'] || row['Full Name'] || row['FullName'] || ''
            );

            // All other columns become custom fields
            const customFields: Record<string, string> = {};
            for (const [key, value] of Object.entries(row)) {
              const lowerKey = key.toLowerCase();
              if (
                !['number', 'phone', 'phone number', 'phonenumber', 'name', 'full name', 'fullname'].includes(
                  lowerKey
                )
              ) {
                customFields[key] = String(value ?? '');
              }
            }

            return {
              phoneNumber,
              name: name || undefined,
              customFields,
              status: 'pending',
            };
          });

          // Filter out rows without phone numbers
          const validTargets = targets.filter((t) => t.phoneNumber);
          onTargetsLoaded(validTargets);
        } catch (error) {
          console.error('Failed to parse Excel file:', error);
          alert('Failed to parse the Excel file. Please check the format.');
        }
      };

      reader.readAsArrayBuffer(file);
    },
    [onTargetsLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-whatsapp-light transition-colors"
    >
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="mt-4 text-gray-600">Drag and drop an Excel file here</p>
      <p className="text-sm text-gray-500 mb-4">or</p>
      <label className="cursor-pointer">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
        />
        <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
          Browse Files
        </span>
      </label>
      <p className="mt-4 text-xs text-gray-400">
        Excel file should have columns: Number (required), Name (optional), and any custom fields
      </p>
    </div>
  );
};
