import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <img 
            src={previewImage} 
            alt="Tournament Setup Preview"
            className="w-full h-auto rounded-lg border shadow-sm max-h-96 object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}