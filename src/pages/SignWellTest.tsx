import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * SignWell Embedded Requesting Test Page
 * This page demonstrates how to use SignWell's embedded requesting feature
 */
export const SignWellTest: React.FC = () => {
  const [documentId, setDocumentId] = useState<string>("");
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /**
   * Step 1: Create a draft document in SignWell
   * This uploads the PDF and creates a draft document with recipients
   */
  const handleCreateDocument = async () => {
    setLoading(true);
    setMessage(null);

    if (!window.electronAPI?.signwell?.createDocument) {
      setMessage({
        type: "error",
        text: "SignWell não está disponível no modo web. Utilize a versão desktop enquanto os endpoints não são implementados.",
      })
      return
    }

    try {
      // For testing, we'll use a sample PDF path
      // In production, this would come from the actual generated Promissory Note
      const testPdfPath = "D:\\LOAN-MANAGEMENT-SYSTEM\\test-document.pdf";

      const result = await window.electronAPI.signwell.createDocument({
        name: "Test Promissory Note - " + new Date().toISOString(),
        pdfPath: testPdfPath,
        pdfName: "test-promissory-note.pdf",
        recipients: [
          { name: "WMF Corp Representative", email: "operations@wmf-corp.com" },
          { name: "Client Representative", email: "client@example.com" },
        ],
      });

      if (result.success && result.documentId) {
        setDocumentId(result.documentId);
        setMessage({
          type: "success",
          text: `Document created successfully! ID: ${result.documentId}`,
        });

        // Automatically get the embed URL
        await handleGetEmbedUrl(result.documentId);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to create document",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2: Get the embedded requesting URL
   * This URL can be loaded in an iframe to allow the user to prepare the document
   */
  const handleGetEmbedUrl = async (docId?: string) => {
    const targetDocId = docId || documentId;
    if (!targetDocId) {
      setMessage({ type: "error", text: "Please create a document first" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (!window.electronAPI?.signwell?.getEmbeddedRequestingUrl) {
        setMessage({ type: "error", text: "Endpoint de embed não disponível no modo web." })
        return
      }

      const result = await window.electronAPI.signwell.getEmbeddedRequestingUrl(targetDocId);

      if (result.success && result.url) {
        setEmbedUrl(result.url);
        setMessage({
          type: "success",
          text: "Embed URL retrieved successfully! The iframe will load below.",
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to get embed URL",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Send the document for signature
   * After preparing the document in the iframe, send it to recipients
   */
  const handleSendDocument = async () => {
    if (!documentId) {
      setMessage({ type: "error", text: "No document to send" });
      return;
    }

    setLoading(true);
    setMessage(null);

    if (!window.electronAPI?.signwell?.updateAndSend) {
      setMessage({ type: "error", text: "Envio para assinatura indisponível no modo web." })
      return
    }

    try {
      const result = await window.electronAPI.signwell.updateAndSend({
        documentId,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: "Document sent for signature successfully!",
        });
        setEmbedUrl(""); // Clear the iframe
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to send document",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
          SignWell Integration Test
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Test the SignWell embedded requesting feature
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Create Document</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-4">
            Create a draft document in SignWell. This will upload your PDF and define the recipients.
          </p>
          <Button onClick={handleCreateDocument} loading={loading} disabled={!!documentId}>
            Create Test Document
          </Button>
          {documentId && (
            <p className="text-sm text-green-600 mt-3 font-mono">
              Document ID: {documentId}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Embedded Requesting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-4">
            The iframe below allows you to prepare the document by adding signature fields, text fields, etc.
          </p>
          {!embedUrl && documentId && (
            <Button onClick={() => handleGetEmbedUrl()} loading={loading}>
              Load Embedded Editor
            </Button>
          )}
          {embedUrl && (
            <div className="border border-border-gray rounded-lg overflow-hidden">
              <iframe
                src={embedUrl}
                title="SignWell Embedded Requesting"
                className="w-full h-[600px]"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {documentId && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Send for Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary mb-4">
              After preparing the document, send it to the recipients for signature.
            </p>
            <Button onClick={handleSendDocument} loading={loading} variant="primary">
              Send Document
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

