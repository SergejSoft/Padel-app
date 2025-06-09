import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FeaturePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

export function FeaturePreviewModal({ 
  isOpen, 
  onClose, 
  title, 
  description,
  imageSrc,
  imageAlt
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
            src={imageSrc} 
            alt={imageAlt}
            className="w-full h-auto rounded-lg border shadow-sm max-h-96 object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}