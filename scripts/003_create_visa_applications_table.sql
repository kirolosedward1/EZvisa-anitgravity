-- Create visa_applications table to store all wizard submissions
CREATE TABLE IF NOT EXISTS public.visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  nationality TEXT NOT NULL,
  passport_number TEXT,
  date_of_birth DATE,
  
  -- Travel Details
  destination_country TEXT NOT NULL,
  travel_purpose TEXT NOT NULL,
  entry_date DATE,
  exit_date DATE,
  duration_days INTEGER,
  
  -- Documents Status
  has_passport BOOLEAN DEFAULT false,
  has_photos BOOLEAN DEFAULT false,
  has_bank_statements BOOLEAN DEFAULT false,
  has_employment_proof BOOLEAN DEFAULT false,
  has_accommodation BOOLEAN DEFAULT false,
  has_travel_insurance BOOLEAN DEFAULT false,
  has_flight_booking BOOLEAN DEFAULT false,
  
  -- Additional Information
  previous_schengen_visa BOOLEAN DEFAULT false,
  previous_rejections BOOLEAN DEFAULT false,
  rejection_details TEXT,
  additional_notes TEXT,
  
  -- Payment & Status
  payment_status TEXT DEFAULT 'pending', -- pending, paid, processing, completed
  payment_amount DECIMAL(10,2),
  payment_id TEXT,
  application_status TEXT DEFAULT 'submitted', -- submitted, reviewing, approved, rejected
  
  -- Metadata
  submission_ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      coalesce(full_name, '') || ' ' || 
      coalesce(email, '') || ' ' ||
      coalesce(nationality, '') || ' ' ||
      coalesce(destination_country, '')
    )
  ) STORED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visa_applications_email ON public.visa_applications(email);
CREATE INDEX IF NOT EXISTS idx_visa_applications_status ON public.visa_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_visa_applications_payment ON public.visa_applications(payment_status);
CREATE INDEX IF NOT EXISTS idx_visa_applications_created ON public.visa_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visa_applications_country ON public.visa_applications(destination_country);
CREATE INDEX IF NOT EXISTS idx_visa_applications_search ON public.visa_applications USING GIN(search_vector);

-- Enable Row Level Security
ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;

-- Allow public insert (anyone can submit)
CREATE POLICY "Allow public submissions" ON public.visa_applications
  FOR INSERT WITH CHECK (true);

-- Allow users to read their own submissions by email
CREATE POLICY "Users can view own submissions" ON public.visa_applications
  FOR SELECT USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
    OR auth.role() = 'authenticated'
  );

-- Only authenticated admins can update
CREATE POLICY "Only admins can update" ON public.visa_applications
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_visa_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visa_applications_timestamp
  BEFORE UPDATE ON public.visa_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_visa_applications_updated_at();
