import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { generatePDFPreviewHTML } from "@/lib/pdf-generator";
import type { Round } from "@shared/schema";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
  playersCount: number;
  courtsCount: number;
  rounds: Round[];
  onDownload: () => void;
}

export function PDFPreviewModal({
  isOpen,
  onClose,
  tournamentName,
  playersCount,
  courtsCount,
  rounds,
  onDownload,
}: PDFPreviewModalProps) {
  const previewHTML = generatePDFPreviewHTML({
    tournamentName,
    playersCount,
    courtsCount,
    rounds,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Tournament Schedule Preview
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="overflow-auto max-h-[70vh] border border-border rounded-lg">
          <div className="pdf-preview-container">
            <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onDownload} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
