import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ReportPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  responseId: string;
}

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Inappropriate content', description: 'Nudity, sexual content, or explicit material' },
  { value: 'harassment', label: 'Harassment or bullying', description: 'Targeting someone with harmful behavior' },
  { value: 'hate_speech', label: 'Hate speech', description: 'Discriminatory or hateful content' },
  { value: 'violence', label: 'Violence or threats', description: 'Violent content or threatening behavior' },
  { value: 'spam', label: 'Spam or misleading', description: 'Fake content, scams, or spam' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' },
];

const ReportPostModal = ({ isOpen, onClose, responseId }: ReportPostModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedReason) return;

    setIsSubmitting(true);

    try {
      // Submit the report
      const { error: reportError } = await supabase
        .from('post_reports')
        .insert({
          response_id: responseId,
          user_id: user.id,
          reason: selectedReason,
          details: details.trim() || null,
        });

      if (reportError) {
        if (reportError.code === '23505') {
          toast({
            title: "Already reported",
            description: "You've already reported this post.",
            variant: "destructive",
          });
        } else {
          throw reportError;
        }
        return;
      }

      // Trigger AI moderation check
      try {
        await supabase.functions.invoke('moderate-reported-post', {
          body: { response_id: responseId }
        });
      } catch (modError) {
        // Moderation happens async, don't block on this
        console.log('Moderation triggered:', modError);
      }

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe.",
      });

      onClose();
      setSelectedReason('');
      setDetails('');

    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-foreground">Report Post</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Help us understand what's wrong
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {REPORT_REASONS.map((reason) => (
              <div 
                key={reason.value}
                className="flex items-start space-x-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedReason(reason.value)}
              >
                <RadioGroupItem value={reason.value} id={reason.value} className="mt-1" />
                <Label htmlFor={reason.value} className="cursor-pointer flex-1">
                  <span className="font-medium text-foreground">{reason.label}</span>
                  <p className="text-sm text-muted-foreground">{reason.description}</p>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === 'other' && (
            <Textarea
              placeholder="Please describe the issue..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="bg-background/50 border-border/50 resize-none"
              rows={3}
            />
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className="flex-1 bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPostModal;
