-- Create storage bucket for chat media (snaps, voice messages)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to chat-media
CREATE POLICY "Users can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Allow anyone to view chat media (needed for message display)
CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');