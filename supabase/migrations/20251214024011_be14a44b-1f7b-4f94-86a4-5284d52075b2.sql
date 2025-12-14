-- Allow users to delete their own sent messages
CREATE POLICY "Users can delete their own messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Allow senders to update snap views (for read receipts)
CREATE POLICY "Senders can update snap status" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);