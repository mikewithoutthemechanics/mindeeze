-- Enable Row Level Security on all tables
ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Therapists policies
CREATE POLICY "Therapists can view own record" ON therapists
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Therapists can update own record" ON therapists
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Practices policies
CREATE POLICY "Practice owners can view their practices" ON practices
  FOR SELECT USING (owner_id::text = auth.uid()::text);

CREATE POLICY "Practice owners can update their practices" ON practices
  FOR UPDATE USING (owner_id::text = auth.uid()::text);

CREATE POLICY "Practice members can view their practices" ON practices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practice_members
      WHERE practice_members.practice_id = practices.id
      AND practice_members.therapist_id::text = auth.uid()::text
    )
  );

-- Practice members policies
CREATE POLICY "Practice owners can view practice members" ON practice_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practices
      WHERE practices.id = practice_members.practice_id
      AND practices.owner_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Practice owners can insert practice members" ON practice_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM practices
      WHERE practices.id = practice_members.practice_id
      AND practices.owner_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Practice members can view their membership" ON practice_members
  FOR SELECT USING (therapist_id::text = auth.uid()::text);

-- Clients policies
CREATE POLICY "Therapists can view own clients" ON clients
  FOR SELECT USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can insert own clients" ON clients
  FOR INSERT WITH CHECK (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can update own clients" ON clients
  FOR UPDATE USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can delete own clients" ON clients
  FOR DELETE USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Practice members can view practice clients" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practice_members
      WHERE practice_members.practice_id = clients.practice_id
      AND practice_members.therapist_id::text = auth.uid()::text
    )
  );

-- Appointments policies
CREATE POLICY "Therapists can view own appointments" ON appointments
  FOR SELECT USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can insert own appointments" ON appointments
  FOR INSERT WITH CHECK (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can update own appointments" ON appointments
  FOR UPDATE USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can delete own appointments" ON appointments
  FOR DELETE USING (therapist_id::text = auth.uid()::text);

-- Session notes policies
CREATE POLICY "Therapists can view own session notes" ON session_notes
  FOR SELECT USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can insert own session notes" ON session_notes
  FOR INSERT WITH CHECK (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can update own session notes" ON session_notes
  FOR UPDATE USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can delete own session notes" ON session_notes
  FOR DELETE USING (therapist_id::text = auth.uid()::text);

-- Invoices policies
CREATE POLICY "Therapists can view own invoices" ON invoices
  FOR SELECT USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can update own invoices" ON invoices
  FOR UPDATE USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can delete own invoices" ON invoices
  FOR DELETE USING (therapist_id::text = auth.uid()::text);

-- Questionnaires policies
CREATE POLICY "Therapists can view own questionnaires" ON questionnaires
  FOR SELECT USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can insert own questionnaires" ON questionnaires
  FOR INSERT WITH CHECK (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can update own questionnaires" ON questionnaires
  FOR UPDATE USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can delete own questionnaires" ON questionnaires
  FOR DELETE USING (therapist_id::text = auth.uid()::text);

-- Documents policies
CREATE POLICY "Therapists can view own documents" ON documents
  FOR SELECT USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can insert own documents" ON documents
  FOR INSERT WITH CHECK (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can delete own documents" ON documents
  FOR DELETE USING (therapist_id::text = auth.uid()::text);
