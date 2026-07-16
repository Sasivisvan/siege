"use client";

import React, { useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';

interface FileUploadProps {
  onUploadSuccess: (documentId: string, metadata: any) => void;
  maxSizeMB?: number;
}

export function FileUpload({ onUploadSuccess, maxSizeMB = 5 }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Direct fetch used here because apiFetch might stringify JSON automatically depending on its implementation
      // Since we need to send multipart/form-data, we'll construct the headers manually for the fetch.
      const token = localStorage.getItem('token');
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      onUploadSuccess(data.data.document.id, data.data.document);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="stack" style={{ gap: '8px' }}>
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--panel-border)'}`,
          background: isDragging ? 'var(--accent-glow)' : 'rgba(0,0,0,0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          style={{ display: 'none' }}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        />
        
        {isUploading ? (
          <div style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Uploading secure document...
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Click to upload or drag and drop</strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              PDF, DOC, JPG, PNG (Max {maxSizeMB}MB)
            </span>
          </div>
        )}
      </div>
      
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
    </div>
  );
}
