import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface SignWellEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  onSent?: () => void;
}

export const SignWellEmbedModal: React.FC<SignWellEmbedModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentName,
  onSent,
}) => {
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embedInstance, setEmbedInstance] = useState<any>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      loadEmbedUrl();
    }
    
    // Cleanup: close SignWell iframe when modal closes
    return () => {
      if (embedInstance) {
        try {
          embedInstance.close();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documentId]);

  const loadEmbedUrl = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI?.signwell?.getEmbeddedRequestingUrl?.(documentId);

      if (result?.success && result.url) {
        setEmbedUrl(result.url);
        
        // Use SignWell's embedded library
        setTimeout(() => {
          if ((window as any).SignWellEmbed) {
            const signWellEmbed = new (window as any).SignWellEmbed({
              url: result.url,
              containerId: 'signwell-embed-container',
              events: {
                completed: (e: any) => {
                  console.log('SignWell document completed:', e);
                  if (onSent) {
                    onSent();
                  }
                  onClose();
                },
                closed: (e: any) => {
                  console.log('SignWell iframe closed:', e);
                },
                error: (e: any) => {
                  console.error('SignWell error:', e);
                  setError('An error occurred in the document editor');
                }
              }
            });
            
            signWellEmbed.open();
            setEmbedInstance(signWellEmbed);
          } else {
            console.error('SignWellEmbed library not loaded');
            setError('SignWell library not loaded. Please refresh the page.');
          }
        }, 100);
      } else {
        setError(result.error || "Failed to load editor");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-gray">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Prepare Document for Signature
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {documentName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
            disabled={loading}
            title="Close modal"
            aria-label="Close document editor modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-primary mb-4"></div>
                <p className="text-text-secondary">Loading document editor...</p>
              </div>
            </div>
          )}

          {!loading && embedUrl && (
            <div 
              id="signwell-embed-container" 
              className="h-full border border-border-gray rounded-lg overflow-hidden"
              style={{ minHeight: '600px' }}
            >
              {/* SignWellEmbed will inject the iframe here */}
            </div>
          )}

          {!loading && !embedUrl && !error && (
            <div className="flex items-center justify-center h-full">
              <p className="text-text-secondary">No embed URL available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border-gray bg-gray-50">
          <div className="text-sm text-text-secondary">
            <p className="font-medium mb-1">📝 Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Add signature fields by dragging them onto the document</li>
              <li>Assign fields to specific recipients</li>
              <li>Click "Send" in the SignWell editor when ready</li>
            </ol>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

