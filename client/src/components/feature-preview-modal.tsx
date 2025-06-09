import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import previewImage from "@assets/1_1749482036883.png";

interface FeaturePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export function FeaturePreviewModal({ 
  isOpen, 
  onClose, 
  title, 
  description 
}: FeaturePreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <p className="text-muted-foreground">{description}</p>
        </DialogHeader>
        <div className="mt-6">
          <img 
            src={previewImage} 
            alt="Tournament Setup Preview"
            className="w-full h-auto rounded-lg border shadow-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}