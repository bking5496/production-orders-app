// js/utils/file-utils.js - File Upload and Export Utilities
// Utilities for file handling, uploads, and data exports

window.FileUtils = {
  // File validation
  validate: {
    size: (file, maxSize) => {
      if (file.size > maxSize) {
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
        throw new Error(`File size must be less than ${maxSizeMB}MB`);
      }
      return true;
    },

    type: (file, allowedTypes) => {
      const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
      if (!types.some(type => {
        if (type.includes('*')) {
          const [mainType] = type.split('/');
          return file.type.startsWith(mainType);
        }
        return file.type === type;
      })) {
        throw new Error(`File type ${file.type} is not allowed`);
      }
      return true;
    },

    extension: (file, allowedExtensions) => {
      const extensions = Array.isArray(allowedExtensions) ? allowedExtensions : [allowedExtensions];
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!extensions.includes(fileExt)) {
        throw new Error(`File extension .${fileExt} is not allowed`);
      }
      return true;
    },

    image: (file, options = {}) => {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
          reject(new Error('File must be an image'));
          return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);

          if (options.minWidth && img.width < options.minWidth) {
            reject(new Error(`Image width must be at least ${options.minWidth}px`));
            return;
          }

          if (options.maxWidth && img.width > options.maxWidth) {
            reject(new Error(`Image width must be no more than ${options.maxWidth}px`));
            return;
          }

          if (options.minHeight && img.height < options.minHeight) {
            reject(new Error(`Image height must be at least ${options.minHeight}px`));
            return;
          }

          if (options.maxHeight && img.height > options.maxHeight) {
            reject(new Error(`Image height must be no more than ${options.maxHeight}px`));
            return;
          }

          if (options.aspectRatio) {
            const ratio = img.width / img.height;
            const targetRatio = options.aspectRatio;
            const tolerance = options.aspectRatioTolerance || 0.1;
            
            if (Math.abs(ratio - targetRatio) > tolerance) {
              reject(new Error(`Image aspect ratio must be ${targetRatio} (±${tolerance})`));
              return;
            }
          }

          resolve({
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height
          });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };

        img.src = url;
      });
    }
  },

  // File reading
  read: {
    asText: (file, encoding = 'utf-8') => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file, encoding);
      });
    },

    asDataURL: (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },

    asArrayBuffer: (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
    },

    asJSON: async (file) => {
      const text = await FileUtils.read.asText(file);
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error('Invalid JSON file');
      }
    },

    asCSV: async (file, options = {}) => {
      const text = await FileUtils.read.asText(file);
      
      if (window.Papa) {
        return new Promise((resolve, reject) => {
          window.Papa.parse(text, {
            header: options.header !== false,
            dynamicTyping: options.dynamicTyping !== false,
            skipEmptyLines: options.skipEmptyLines !== false,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
          });
        });
      }

      // Fallback simple CSV parser
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) return [];

      const headers = options.header !== false ? lines[0].split(',').map(h => h.trim()) : null;
      const dataLines = headers ? lines.slice(1) : lines;

      return dataLines.map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        if (headers) {
          const row = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          return row;
        }
        return values;
      });
    },

    asExcel: async (file) => {
      if (!window.XLSX) {
        throw new Error('XLSX library not loaded');
      }

      const arrayBuffer = await FileUtils.read.asArrayBuffer(file);
      const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
      
      const result = {};
      workbook.SheetNames.forEach(sheetName => {
        result[sheetName] = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      });

      return result;
    }
  },

  // File processing
  process: {
    resizeImage: (file, options = {}) => {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
          reject(new Error('File must be an image'));
          return;
        }

        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);

          let { width, height } = img;
          const { maxWidth, maxHeight, quality = 0.9 } = options;

          // Calculate new dimensions
          if (maxWidth && width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (maxHeight && height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              }));
            },
            file.type,
            quality
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };

        img.src = url;
      });
    },

    compressImage: async (file, quality = 0.8) => {
      return FileUtils.process.resizeImage(file, {
        maxWidth: 9999999,
        maxHeight: 9999999,
        quality
      });
    },

    generateThumbnail: async (file, size = 200) => {
      return FileUtils.process.resizeImage(file, {
        maxWidth: size,
        maxHeight: size,
        quality: 0.8
      });
    }
  },

  // File upload
  upload: {
    single: async (file, url, options = {}) => {
      const formData = new FormData();
      formData.append(options.fieldName || 'file', file);

      // Add additional fields
      if (options.data) {
        Object.entries(options.data).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: options.headers || {},
        ...options.fetchOptions
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return response.json();
    },

    multiple: async (files, url, options = {}) => {
      const formData = new FormData();
      
      files.forEach((file, index) => {
        formData.append(options.fieldName || 'files', file);
      });

      // Add additional fields
      if (options.data) {
        Object.entries(options.data).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: options.headers || {},
        ...options.fetchOptions
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return response.json();
    },

    chunked: async (file, url, options = {}) => {
      const chunkSize = options.chunkSize || 1024 * 1024; // 1MB default
      const totalChunks = Math.ceil(file.size / chunkSize);
      const uploadId = options.uploadId || Date.now().toString();

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', i);
        formData.append('totalChunks', totalChunks);
        formData.append('filename', file.name);

        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          headers: options.headers || {},
          ...options.fetchOptions
        });

        if (!response.ok) {
          throw new Error(`Chunk ${i + 1}/${totalChunks} upload failed`);
        }

        if (options.onProgress) {
          options.onProgress({
            loaded: end,
            total: file.size,
            percentage: (end / file.size) * 100,
            chunk: i + 1,
            totalChunks
          });
        }
      }

      return { uploadId, filename: file.name, size: file.size };
    },

    withProgress: (file, url, options = {}) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        
        formData.append(options.fieldName || 'file', file);
        
        if (options.data) {
          Object.entries(options.data).forEach(([key, value]) => {
            formData.append(key, value);
          });
        }

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && options.onProgress) {
            options.onProgress({
              loaded: e.loaded,
              total: e.total,
              percentage: (e.loaded / e.total) * 100
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve(xhr.responseText);
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', url);
        
        if (options.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
        }

        xhr.send(formData);

        // Return abort function
        if (options.signal) {
          options.signal.addEventListener('abort', () => xhr.abort());
        }
      });
    }
  },

  // Data export
  export: {
    json: (data, filename = 'data.json') => {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      FileUtils.download(blob, filename);
    },

    csv: (data, filename = 'data.csv', options = {}) => {
      if (window.Papa) {
        const csv = window.Papa.unparse(data, {
          header: options.header !== false,
          delimiter: options.delimiter || ',',
          newline: options.newline || '\n'
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        FileUtils.download(blob, filename);
      } else {
        // Fallback CSV generation
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Data must be a non-empty array');
        }

        const headers = options.columns || Object.keys(data[0]);
        const rows = [headers.join(',')];

        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            // Escape values containing commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          });
          rows.push(values.join(','));
        });

        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        FileUtils.download(blob, filename);
      }
    },

    excel: (data, filename = 'data.xlsx', options = {}) => {
      if (!window.XLSX) {
        throw new Error('XLSX library not loaded');
      }

      const wb = window.XLSX.utils.book_new();

      if (options.sheets) {
        // Multiple sheets
        Object.entries(options.sheets).forEach(([sheetName, sheetData]) => {
          const ws = window.XLSX.utils.json_to_sheet(sheetData);
          window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
      } else {
        // Single sheet
        const ws = window.XLSX.utils.json_to_sheet(data);
        window.XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Data');
      }

      window.XLSX.writeFile(wb, filename);
    },

    pdf: async (content, filename = 'document.pdf', options = {}) => {
      if (!window.jsPDF) {
        throw new Error('jsPDF library not loaded');
      }

      const doc = new window.jsPDF(options.orientation || 'portrait', 'pt', 'a4');
      
      if (options.title) {
        doc.setFontSize(20);
        doc.text(options.title, 40, 40);
      }

      if (typeof content === 'string') {
        // Simple text content
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(content, 500);
        doc.text(lines, 40, 80);
      } else if (content.type === 'table') {
        // Table content
        if (window.jsPDF.AutoTable) {
          doc.autoTable({
            head: [content.headers],
            body: content.rows,
            startY: options.title ? 80 : 40,
            ...options.tableOptions
          });
        }
      } else if (content.type === 'html') {
        // HTML content
        if (doc.html) {
          await doc.html(content.html, {
            callback: () => doc.save(filename),
            x: 40,
            y: 40,
            ...options.htmlOptions
          });
          return;
        }
      }

      doc.save(filename);
    },

    image: async (canvas, filename = 'image.png', options = {}) => {
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          FileUtils.download(blob, filename);
          resolve();
        }, options.type || 'image/png', options.quality || 1);
      });
    }
  },

  // Utility functions
  download: (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getFileExtension: (filename) => {
    return filename.split('.').pop().toLowerCase();
  },

  getMimeType: (filename) => {
    const ext = FileUtils.getFileExtension(filename);
    const mimeTypes = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Text
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      
      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      
      // Media
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
};

// React Hook for file upload
window.useFileUpload = (options = {}) => {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState(null);
  const [result, setResult] = React.useState(null);

  const upload = React.useCallback(async (file, uploadOptions = {}) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Validate file
      if (options.maxSize) {
        FileUtils.validate.size(file, options.maxSize);
      }
      if (options.allowedTypes) {
        FileUtils.validate.type(file, options.allowedTypes);
      }
      if (options.allowedExtensions) {
        FileUtils.validate.extension(file, options.allowedExtensions);
      }

      // Process file if needed
      let processedFile = file;
      if (options.process) {
        processedFile = await options.process(file);
      }

      // Upload file
      const uploadResult = await FileUtils.upload.withProgress(
        processedFile,
        options.url || uploadOptions.url,
        {
          ...options,
          ...uploadOptions,
          onProgress: (evt) => {
            setProgress(evt.percentage);
            if (options.onProgress) {
              options.onProgress(evt);
            }
          }
        }
      );

      setResult(uploadResult);
      setProgress(100);
      
      if (options.onSuccess) {
        options.onSuccess(uploadResult);
      }
      
      return uploadResult;
    } catch (err) {
      setError(err);
      if (options.onError) {
        options.onError(err);
      }
      throw err;
    } finally {
      setUploading(false);
    }
  }, [options]);

  const reset = React.useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    result,
    reset
  };
};
