import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SignWellEmbedModal } from "@/components/SignWellEmbedModal";
import { useAuthStore } from "@/stores/authStore";
import { formatMoney, formatDate, formatDateTime } from "@/lib/utils";

interface DisbursementDetail {
  id: number;
  requestNumber: string;
  clientId: number;
  clientName?: string;
  requestedAmount: number;
  requestDate: string;
  status: string;
  assetsList?: string[];
  description?: string;
  approvedBy?: number;
  approvedAt?: string;
  approverName?: string;
  createdAt: string;
  signatories?: string;
  wire_transfer_path?: string;
  wire_transfer_signed_path?: string;
  wire_transfer_signwell_document_id?: string;
  wire_transfer_signwell_status?: string;
}

export const DisbursementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const [disbursement, setDisbursement] = useState<DisbursementDetail | null>(
    null,
  );
  const [promissoryNote, setPromissoryNote] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPN, setGeneratingPN] = useState(false);
  const [uploadingSignedPN, setUploadingSignedPN] = useState(false);
  const [signatureInfo, setSignatureInfo] = useState<any>(null);
  
  // SignWell states
  const [showSignWellModalPN, setShowSignWellModalPN] = useState(false);
  const [showSignWellModalWT, setShowSignWellModalWT] = useState(false);
  const [signwellDocumentIdPN, setSignwellDocumentIdPN] = useState<string>("");
  const [signwellDocumentIdWT, setSignwellDocumentIdWT] = useState<string>("");
  const [sendingToSignWell, setSendingToSignWell] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [disbData, pnData, configData] = await Promise.all([
        window.electronAPI.disbursements.getById(parseInt(id!)),
        window.electronAPI.promissoryNotes.getByDisbursementId(parseInt(id!)),
        window.electronAPI.config.get(),
      ]);

      console.log("Loaded data:", { disbData, pnData, configData });
      console.log("PN Data details:", {
        id: pnData?.id,
        pn_number: pnData?.pn_number,
        pnNumber: pnData?.pnNumber,
        generated_pn_path: pnData?.generated_pn_path,
        signed_pn_path: pnData?.signed_pn_path,
        signature_status: pnData?.signature_status,
      });
      console.log("SignWell Config Debug:", {
        signwellConfigured: configData?.signwellConfigured,
        hasApiKey: configData?.signwell?.hasApiKey,
        apiKey: configData?.signwell?.apiKey ? 'SET' : 'NOT SET',
        testMode: configData?.signwell?.testMode,
      });
      setDisbursement(disbData);
      
      // Normalize pn_number to ensure it's always available
      if (pnData) {
        pnData.pn_number = pnData.pn_number || pnData.pnNumber;
      }
      
      setPromissoryNote(pnData);
      setConfig(configData);

      // Force re-render check
      console.log(
        "Should show Send to Sign button?",
        !!(pnData?.generated_pn_path && !pnData?.signed_pn_path),
      );
      console.log(
        "Will show SignWell button (not manual)?",
        configData?.signwellConfigured
      );
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Approve this disbursement and generate Promissory Note?"))
      return;

    try {
      // Approve disbursement
      const approveResult = await window.electronAPI.disbursements.approve(
        parseInt(id!),
        currentUser!.id,
      );

      if (!approveResult.success) {
        alert(approveResult.error);
        return;
      }

      // Generate Promissory Note
      await generatePromissoryNote();

      await window.electronAPI.audit.log(
        currentUser!.id,
        "DISBURSEMENT_APPROVED",
        {
          disbursementId: parseInt(id!),
          requestNumber: disbursement?.requestNumber,
        },
      );

      loadData();
    } catch (error) {
      alert("Failed to approve disbursement");
    }
  };

  const generatePromissoryNote = async () => {
    if (!disbursement || !config) return;

    // Validate config before starting
    if (!config.lender?.address || config.lender.address.trim() === "") {
      alert(
        "Lender address is not configured. Please go to Settings and fill in the Lender address.",
      );
      return;
    }
    if (!config.borrower?.address || config.borrower.address.trim() === "") {
      alert(
        "Borrower address is not configured. Please go to Settings and fill in the Borrower address.",
      );
      return;
    }

    setGeneratingPN(true);

    try {
      // Create PN in database
      const dueDate = new Date(disbursement.requestDate);
      dueDate.setDate(dueDate.getDate() + config.defaultDueDays);

      console.log("Creating PN in database...");
      const createResult = await window.electronAPI.promissoryNotes.create({
        disbursementId: disbursement.id,
        principalAmount: disbursement.requestedAmount,
        interestRate: config.interestRateAnnual,
        issueDate: disbursement.requestDate,
        dueDate: dueDate.toISOString().split("T")[0],
      });

      if (!createResult.success) {
        alert(createResult.error);
        return;
      }

      console.log("PN created in database:", createResult.pnNumber);

      // Generate PDF
      const pdfData = {
        pnNumber: createResult.pnNumber,
        principalAmount: disbursement.requestedAmount,
        interestRate: config.interestRateAnnual,
        issueDate: disbursement.requestDate,
        dueDate: dueDate.toISOString().split("T")[0],
        requestNumber: disbursement.requestNumber,
        assetsList: disbursement.assetsList,
        lender: config.lender,
        borrower: config.borrower,
      };

      console.log("Generating PDF with data:", pdfData);

      const pdfPath =
        await window.electronAPI.pdf.generatePromissoryNote(pdfData);

      console.log("PDF generated at:", pdfPath);

      // Update PN with PDF path
      await window.electronAPI.promissoryNotes.update(
        createResult.promissoryNoteId,
        {
          generatedPnPath: pdfPath,
        },
      );

      await window.electronAPI.audit.log(
        currentUser!.id,
        "PROMISSORY_NOTE_GENERATED",
        {
          pnNumber: createResult.pnNumber,
          disbursementId: disbursement.id,
        },
      );

      alert(
        `Promissory Note ${createResult.pnNumber} generated successfully!\n\nThe page will now refresh.`,
      );

      // Force reload to ensure fresh data
      await loadData();

      // Double-check: reload again after a short delay
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      console.error("Failed to generate PN:", error);
      const errorMessage =
        error?.message || "Failed to generate Promissory Note";
      alert(errorMessage);
    } finally {
      setGeneratingPN(false);
    }
  };

  const generateWireTransfer = async () => {
    if (!disbursement || !promissoryNote || !config) return;

    try {
      const wtData = {
        pnNumber: promissoryNote.pn_number,
        requestNumber: disbursement.requestNumber,
        amount: disbursement.requestedAmount,
        beneficiary: {
          name: config.borrower.name,
          address: config.borrower.address,
        },
        assetsList: disbursement.assetsList,
        reference: `${promissoryNote.pn_number} | ${disbursement.requestNumber} | ${
          disbursement.assetsList
            ? disbursement.assetsList.slice(0, 2).join(", ")
            : "Disbursement"
        }`,
      };

      const pdfPath = await window.electronAPI.pdf.generateWireTransfer(wtData);

      // Save the PDF path to the database
      await window.electronAPI.disbursements.update(disbursement.id, {
        wireTransferPath: pdfPath,
      });

      await window.electronAPI.audit.log(
        currentUser!.id,
        "WIRE_TRANSFER_GENERATED",
        {
          pnNumber: promissoryNote.pn_number,
          amount: disbursement.requestedAmount,
        },
      );

      // Open the generated PDF
      await window.electronAPI.openPDF?.(pdfPath);
      alert("Wire Transfer Order generated successfully!\n\nUse the 'Send for E-Signature' button to send via SignWell.");
      
      // Reload data to show the Wire Transfer card
      await loadData();
    } catch (error) {
      alert("Failed to generate Wire Transfer Order");
    }
  };

  const sendPNForSignature = async () => {
    if (!disbursement || !promissoryNote) return;

    const pdfPath =
      promissoryNote.generated_pn_path || promissoryNote.generatedPnPath;

    if (!pdfPath) {
      alert("Please generate the Promissory Note first");
      return;
    }

    if (
      promissoryNote.signature_status === "sent" ||
      promissoryNote.signature_status === "completed"
    ) {
      alert("This Promissory Note has already been sent for signature");
      return;
    }

    const signatories = disbursement.signatories
      ? JSON.parse(disbursement.signatories)
      : [];

    if (signatories.length === 0) {
      alert(
        "No signatories configured for this client. Please add signatories in the Clients page.",
      );
      return;
    }

    if (
      !confirm(
        `Send Promissory Note ${promissoryNote.pn_number} for signature to ${signatories.length} signator${signatories.length > 1 ? "ies" : "y"}?`,
      )
    ) {
      return;
    }

    try {
      // This is the legacy manual signature flow
      // For SignWell, use the handleSendPNToSignWell function instead
      await window.electronAPI.audit.log(
        currentUser!.id,
        "PROMISSORY_NOTE_SENT_FOR_SIGNATURE_MANUAL",
        {
          pnNumber: promissoryNote.pn_number,
          disbursementId: disbursement.id,
        },
      );
      alert(
        `Promissory Note ${promissoryNote.pn_number} ready for manual signature.\n\nTip: Configure SignWell in Settings for automatic e-signature.`,
      );
      loadData();
    } catch (error: any) {
      console.error("Failed to process PN:", error);
      alert("An error occurred");
    }
  };

  const openGeneratedPN = async () => {
    const pdfPath =
      promissoryNote?.generated_pn_path || promissoryNote?.generatedPnPath;
    if (pdfPath) {
      await window.electronAPI.openPDF?.(pdfPath);
    }
  };

  const openSignedPN = async () => {
    const pdfPath =
      promissoryNote?.signed_pn_path || promissoryNote?.signedPnPath;
    if (pdfPath) {
      await window.electronAPI.openPDF?.(pdfPath);
    }
  };

  const handleUploadSignedPN = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }

    if (!promissoryNote?.id) {
      alert("Promissory Note ID not found");
      return;
    }

    setUploadingSignedPN(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        // Upload and validate signature
        const result = await window.electronAPI.uploadSignedPN?.(
          promissoryNote.id,
          base64,
          `${promissoryNote.pn_number}_Signed.pdf`,
        );

        if (result?.success) {
          setSignatureInfo(result.signatureInfo);
          alert(
            `Signed PN uploaded successfully!${
              result.signatureInfo?.signerName
                ? `\n\nSigner: ${result.signatureInfo.signerName}`
                : ""
            }${
              result.signatureInfo?.signDate
                ? `\nSigned on: ${result.signatureInfo.signDate}`
                : ""
            }`,
          );

          await window.electronAPI.audit.log(
            currentUser!.id,
            "SIGNED_PN_UPLOADED",
            {
              pnNumber: promissoryNote.pn_number,
              signerName: result.signatureInfo?.signerName,
            },
          );

          loadData();
        } else {
          alert(`Failed to upload signed PN:\n\n${result?.error}`);
        }

        setUploadingSignedPN(false);
      };

      reader.onerror = () => {
        alert("Error reading file");
        setUploadingSignedPN(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      alert("Error uploading file");
      setUploadingSignedPN(false);
    }
  };

  // SignWell functions
  const handleSendPNToSignWell = async () => {
    const pnPath = promissoryNote?.generated_pn_path || promissoryNote?.generatedPnPath;
    if (!pnPath || !disbursement) {
      alert("Please generate the Promissory Note first");
      return;
    }

    setSendingToSignWell(true);

    try {
      // Get client info for recipient
      const client = await window.electronAPI.clients.getById(disbursement.clientId);
      
      // Validate client has email
      if (!client.contactEmail && !client.contact_email) {
        alert(`Client "${client.name}" does not have an email address registered.\n\nPlease add the client's email in the Clients section before sending for signature.`);
        setSendingToSignWell(false);
        return;
      }
      
      const representativeName =
        client.representativeName ||
        client.representative_name ||
        client.name;
      const representativeEmail = client.contactEmail || client.contact_email;

      const recipients = [
        { name: config.lender.name, email: config.email?.user || "operations@wmf-corp.com" },
        { name: representativeName, email: representativeEmail }
      ];

      // Create document in SignWell
      const pnNumber = promissoryNote.pn_number || promissoryNote.pnNumber || 'PN-Unknown';
      const result = await window.electronAPI.signwell.createDocument({
        name: `Promissory Note ${pnNumber}`,
        pdfPath: pnPath,
        pdfName: `${pnNumber}.pdf`,
        recipients,
      });

      if (result.success && result.documentId) {
        setSignwellDocumentIdPN(result.documentId);
        
        // Save to database
        await window.electronAPI.promissoryNotes.update(promissoryNote.id, {
          signwell_document_id: result.documentId,
          signwell_status: 'draft'
        });

        // Open SignWell editor in new window
        const openResult = await window.electronAPI.signwell.openEmbeddedRequesting(
          result.documentId,
          `Promissory Note ${pnNumber}`
        );

        if (!openResult.success) {
          alert(`Failed to open SignWell editor:\n\n${openResult.error}`);
          return;
        }

        await window.electronAPI.audit.log(
          currentUser!.id,
          "PN_SENT_TO_SIGNWELL",
          {
            pnNumber: pnNumber,
            documentId: result.documentId,
          }
        );
      } else {
        alert(`Failed to create SignWell document:\n\n${result.error}`);
      }
    } catch (error: any) {
      console.error("Error sending PN to SignWell:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSendingToSignWell(false);
    }
  };

  const handleSendWTToSignWell = async () => {
    if (!disbursement?.wire_transfer_path) {
      alert("Please generate the Wire Transfer Order first");
      return;
    }

    setSendingToSignWell(true);

    try {
      const lenderSignatories = config.lenderSignatories || [];
      const recipients = lenderSignatories.length > 0
        ? lenderSignatories.map((s: any) => ({ name: s.name, email: s.email }))
        : [{ name: config.lender.name, email: config.email?.user || "operations@wmf-corp.com" }];

      // Create document in SignWell
      const result = await window.electronAPI.signwell.createDocument({
        name: `Wire Transfer Order - ${disbursement.requestNumber}`,
        pdfPath: disbursement.wire_transfer_path,
        pdfName: `WireTransfer-${disbursement.requestNumber}.pdf`,
        recipients,
      });

      if (result.success && result.documentId) {
        setSignwellDocumentIdWT(result.documentId);
        
        // Save to database
        await window.electronAPI.disbursements.update(disbursement.id, {
          wireTransferSignwellDocumentId: result.documentId,
          wireTransferSignwellStatus: 'draft'
        });

        // Open SignWell editor in new window
        const openResult = await window.electronAPI.signwell.openEmbeddedRequesting(
          result.documentId,
          `Wire Transfer Order - ${disbursement.requestNumber}`
        );

        if (!openResult.success) {
          alert(`Failed to open SignWell editor:\n\n${openResult.error}`);
          return;
        }

        await window.electronAPI.audit.log(
          currentUser!.id,
          "WT_SENT_TO_SIGNWELL",
          {
            requestNumber: disbursement.requestNumber,
            documentId: result.documentId,
          }
        );
      } else {
        alert(`Failed to create SignWell document:\n\n${result.error}`);
      }
    } catch (error: any) {
      console.error("Error sending WT to SignWell:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSendingToSignWell(false);
    }
  };

  const handlePNSentForSignature = async () => {
    // Update status in database
    if (promissoryNote?.id) {
      await window.electronAPI.promissoryNotes.update(promissoryNote.id, {
        signwell_status: 'awaiting_signature'
      });
    }
    
    alert("Promissory Note sent for signature! Recipients will receive an email.");
    loadData();
  };

  const handleWTSentForSignature = async () => {
    // Update status in database
    if (disbursement?.id) {
      await window.electronAPI.disbursements.update(disbursement.id, {
        wireTransferSignwellStatus: 'awaiting_signature'
      });
    }
    
    alert("Wire Transfer Order sent for signature! Recipients will receive an email.");
    loadData();
  };

  const handleCheckPNSignatureStatus = async () => {
    if (!promissoryNote?.signwell_document_id) {
      return;
    }

    setCheckingStatus(true);
    try {
      const result = await window.electronAPI.signwell.getDocument(promissoryNote.signwell_document_id);
      
      if (result.success && result.document) {
        const doc = result.document;
        
        // Update status in database
        await window.electronAPI.promissoryNotes.update(promissoryNote.id, {
          signwell_status: doc.status
        });

        // If completed, download signed PDF
        if (doc.status === 'completed' && !promissoryNote.signed_pn_path) {
          const savePath = `${promissoryNote.generated_pn_path.replace('.pdf', '_signed.pdf')}`;
          
          const downloadResult = await window.electronAPI.signwell.downloadCompletedPDF(
            promissoryNote.signwell_document_id,
            savePath
          );

          if (downloadResult.success) {
            await window.electronAPI.promissoryNotes.update(promissoryNote.id, {
              signed_pn_path: savePath,
              signwell_completed_at: doc.completed_at
            });
            
            alert(`✅ Document signed successfully!\n\nSigned PDF saved to: ${savePath}`);
          }
        } else {
          const statusMessages: any = {
            'draft': '📝 Document is still in draft mode',
            'sent': '📤 Document sent, awaiting signatures',
            'viewed': '👀 Document was viewed by recipients',
            'in_progress': '✍️ Signature in progress',
            'completed': '✅ All signatures completed!',
            'declined': '❌ Document was declined',
            'expired': '⏰ Document expired'
          };
          
          alert(statusMessages[doc.status] || `Status: ${doc.status}`);
        }
        
        // Reload data to update UI
        await loadData();
      } else {
        alert(`Failed to check status:\n\n${result.error}`);
      }
    } catch (error: any) {
      console.error("Error checking signature status:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setCheckingStatus(false);
    }
  };

  if (loading || !disbursement) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">Loading...</h1>
      </div>
    );
  }

  const canApprove =
    currentUser?.role === "admin" && disbursement.status === "Pending";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/disbursements")}>
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              {disbursement.requestNumber}
            </h1>
            <p className="text-text-secondary mt-1">
              Disbursement Request Details
            </p>
          </div>
        </div>

        {canApprove && (
          <Button onClick={handleApprove}>Approve & Generate PN</Button>
        )}
      </div>

      {/* Status & Amount */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">Status</p>
            <Badge
              variant={disbursement.status.toLowerCase() as any}
              className="mt-2"
            >
              {disbursement.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">
              Requested Amount
            </p>
            <p className="text-2xl font-bold text-text-primary mt-2">
              {formatMoney(disbursement.requestedAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary font-medium">
              Request Date
            </p>
            <p className="text-lg font-semibold text-text-primary mt-2">
              {formatDate(disbursement.requestDate)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {disbursement.clientName && (
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Client:
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {disbursement.clientName}
                </p>
              </div>
            )}

            {disbursement.description && (
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Description:
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {disbursement.description}
                </p>
              </div>
            )}

            {disbursement.assetsList && disbursement.assetsList.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-2">
                  Assets to be Acquired:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {disbursement.assetsList.map((asset, index) => (
                    <li key={index} className="text-sm text-text-secondary">
                      {asset}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {disbursement.approvedBy && (
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Approved By:
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {disbursement.approverName} on{" "}
                  {disbursement.approvedAt
                    ? formatDateTime(disbursement.approvedAt)
                    : "N/A"}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-text-primary">
                Created:
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {formatDateTime(disbursement.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promissory Note */}
      {promissoryNote && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Promissory Note</CardTitle>
              <div className="flex gap-2">
                {(promissoryNote.generated_pn_path ||
                  promissoryNote.generatedPnPath) &&
                  !(
                    promissoryNote.signed_pn_path || promissoryNote.signedPnPath
                  ) && (
                    <button
                      onClick={sendPNForSignature}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#16a34a",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "600",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#15803d")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "#16a34a")
                      }
                    >
                      Send to Sign
                    </button>
                  )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generateWireTransfer}
                  disabled={
                    !(
                      promissoryNote.signed_pn_path ||
                      promissoryNote.signedPnPath
                    )
                  }
                >
                  Generate Wire Transfer Order
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* If PN exists but PDF not generated, show generate button */}
            {!(
              promissoryNote.generated_pn_path || promissoryNote.generatedPnPath
            ) &&
              !(
                promissoryNote.signed_pn_path || promissoryNote.signedPnPath
              ) && (
                <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-center">
                  <p className="text-sm text-yellow-800 font-medium mb-3">
                    ⚠️ Promissory Note record exists but PDF not generated yet
                  </p>
                  <button
                    onClick={generatePromissoryNote}
                    disabled={generatingPN}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#16a34a",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "600",
                      borderRadius: "6px",
                      border: "none",
                      cursor: generatingPN ? "not-allowed" : "pointer",
                      opacity: generatingPN ? 0.6 : 1,
                    }}
                  >
                    {generatingPN ? "Generating..." : "Generate PDF Now"}
                  </button>
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  PN Number:
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {promissoryNote.pn_number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Principal Amount:
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {promissoryNote.principal_amount
                    ? formatMoney(promissoryNote.principal_amount)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Interest Rate:
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {promissoryNote.interest_rate
                    ? `${promissoryNote.interest_rate}% per annum`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Due Date:
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {promissoryNote.due_date
                    ? formatDate(promissoryNote.due_date)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Status:
                </p>
                <div className="flex gap-2 mt-1">
                  <Badge
                    variant={promissoryNote.status?.toLowerCase() || "pending"}
                  >
                    {promissoryNote.status || "Unknown"}
                  </Badge>
                  
                  {/* SignWell Status Badge */}
                  {promissoryNote.signwell_status && (
                    <Badge
                      variant={
                        promissoryNote.signwell_status === 'completed' ? 'settled' :
                        promissoryNote.signwell_status === 'draft' ? 'pending' :
                        promissoryNote.signwell_status === 'declined' ? 'cancelled' :
                        'approved'
                      }
                    >
                      {promissoryNote.signwell_status === 'completed' ? '✅ Signed' :
                       promissoryNote.signwell_status === 'draft' ? '📝 Draft' :
                       promissoryNote.signwell_status === 'sent' ? '📤 Sent' :
                       promissoryNote.signwell_status === 'in_progress' ? '✍️ Signing' :
                       promissoryNote.signwell_status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* PDF Documents */}
            <div className="pt-4 border-t border-border-gray">
              <p className="text-sm font-semibold text-text-primary mb-3">
                Documents:
              </p>
              <div className="flex flex-wrap gap-2">
                {(promissoryNote.generated_pn_path ||
                  promissoryNote.generatedPnPath) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openGeneratedPN}
                  >
                    View Generated PN
                  </Button>
                )}
                {(promissoryNote.generated_pn_path ||
                  promissoryNote.generatedPnPath) &&
                  !(
                    promissoryNote.signed_pn_path || promissoryNote.signedPnPath
                  ) &&
                  promissoryNote.status !== 'Settled' && (
                    <>
                      {config?.signwellConfigured ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSendPNToSignWell}
                          loading={sendingToSignWell}
                          disabled={
                            promissoryNote.signwell_status === 'awaiting_signature' || 
                            promissoryNote.signwell_status === 'completed'
                          }
                        >
                          📝 Send for E-Signature
                        </Button>
                      ) : (
                        <button
                          onClick={sendPNForSignature}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#16a34a",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "600",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#15803d")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor = "#16a34a")
                          }
                        >
                          Send to Sign (Manual)
                        </button>
                      )}
                    </>
                  )}
                
                {/* Check Signature Status button */}
                {promissoryNote.signwell_document_id && 
                 promissoryNote.signwell_status !== 'completed' && 
                 !(promissoryNote.signed_pn_path || promissoryNote.signedPnPath) && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleCheckPNSignatureStatus}
                    loading={checkingStatus}
                  >
                    🔄 Check Signature Status
                  </Button>
                )}
                
                {(promissoryNote.signed_pn_path ||
                  promissoryNote.signedPnPath) && (
                  <Button variant="secondary" size="sm" onClick={openSignedPN}>
                    View Signed PN
                  </Button>
                )}
                {!(
                  promissoryNote.generated_pn_path ||
                  promissoryNote.generatedPnPath
                ) &&
                  !(
                    promissoryNote.signed_pn_path || promissoryNote.signedPnPath
                  ) && (
                    <p className="text-sm text-text-secondary">
                      No documents available yet
                    </p>
                  )}
              </div>
            </div>

            {/* Wire Transfer Status */}
            {!(
              promissoryNote.signed_pn_path || promissoryNote.signedPnPath
            ) && (
              <div className="mt-4 pt-4 border-t border-border-gray">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Wire Transfer Order requires signed Promissory Note
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Upload the electronically signed PN below to enable Wire
                    Transfer generation.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Signed PN */}
      {promissoryNote &&
        !(promissoryNote.signed_pn_path || promissoryNote.signedPnPath) && (
          <Card className="border-green-primary/50">
            <CardHeader>
              <CardTitle>Upload Signed Promissory Note</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Upload the Promissory Note with certified electronic
                  signature. The system will validate the digital signature
                  before allowing Wire Transfer generation.
                </p>

                <div className="border-2 border-dashed border-green-primary rounded-lg p-6 text-center bg-green-subtle/30">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUploadSignedPN}
                    className="hidden"
                    id="signed-pn-upload"
                    disabled={uploadingSignedPN}
                  />
                  <label
                    htmlFor="signed-pn-upload"
                    className={`cursor-pointer inline-flex flex-col items-center ${
                      uploadingSignedPN ? "opacity-50" : ""
                    }`}
                  >
                    <div className="w-16 h-16 bg-green-primary rounded-lg flex items-center justify-center mb-3">
                      <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {uploadingSignedPN
                        ? "Uploading and validating..."
                        : "Click to upload signed PDF"}
                    </span>
                    <span className="text-xs text-text-secondary mt-1">
                      PDF must contain valid electronic signature
                    </span>
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    Signature Requirements:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>
                      ✓ PDF must be electronically signed (certified signature)
                    </li>
                    <li>
                      ✓ Signer must be authorized representative of Whole Max
                    </li>
                    <li>✓ Signature must be valid and not expired</li>
                    <li>✓ Document integrity must be intact</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Wire Transfer Order */}
      {disbursement.wire_transfer_path && (
        <Card>
          <CardHeader>
            <CardTitle>Wire Transfer Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Wire Transfer Order has been generated. Send it to WMF Corp signatories for approval.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => window.electronAPI.openPDF?.(disbursement.wire_transfer_path!)}>
                  📄 View Wire Transfer Order
                </Button>
                
                {config?.signwellConfigured && !disbursement.wire_transfer_signed_path && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSendWTToSignWell}
                    loading={sendingToSignWell}
                    disabled={
                      disbursement.wire_transfer_signwell_status === 'completed'
                    }
                  >
                    📝 Send for E-Signature
                  </Button>
                )}
                
                {disbursement.wire_transfer_signed_path && (
                  <Button variant="primary" size="sm" onClick={() => window.electronAPI.openPDF?.(disbursement.wire_transfer_signed_path!)}>
                    ✅ View Signed Wire Transfer
                  </Button>
                )}
              </div>
              
              {disbursement.wire_transfer_signwell_status && (
                <div className="mt-2">
                  <Badge
                    variant={
                      disbursement.wire_transfer_signwell_status === 'completed' ? 'settled' :
                      disbursement.wire_transfer_signwell_status === 'draft' ? 'pending' :
                      'approved'
                    }
                  >
                    {disbursement.wire_transfer_signwell_status === 'completed' ? '✅ Signed' :
                     disbursement.wire_transfer_signwell_status === 'draft' ? '📝 Draft' :
                     disbursement.wire_transfer_signwell_status === 'sent' ? '📤 Sent' :
                     disbursement.wire_transfer_signwell_status}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {disbursement.status === "Approved" && !promissoryNote && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 bg-green-subtle rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-green-primary font-bold">PN</span>
            </div>
            <p className="text-text-secondary mb-4">
              Promissory Note not yet generated
            </p>
            <Button onClick={generatePromissoryNote} loading={generatingPN}>
              Generate Promissory Note
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SignWell Modals */}
      {signwellDocumentIdPN && (
        <SignWellEmbedModal
          isOpen={showSignWellModalPN}
          onClose={() => setShowSignWellModalPN(false)}
          documentId={signwellDocumentIdPN}
          documentName={`Promissory Note ${promissoryNote?.pn_number || promissoryNote?.pnNumber || 'PN'}`}
          onSent={handlePNSentForSignature}
        />
      )}

      {signwellDocumentIdWT && (
        <SignWellEmbedModal
          isOpen={showSignWellModalWT}
          onClose={() => setShowSignWellModalWT(false)}
          documentId={signwellDocumentIdWT}
          documentName={`Wire Transfer Order - ${disbursement.requestNumber}`}
          onSent={handleWTSentForSignature}
        />
      )}
    </div>
  );
};

