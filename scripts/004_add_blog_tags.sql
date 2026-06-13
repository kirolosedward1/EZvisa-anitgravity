-- Add sample tags to existing blog posts to make them richer
UPDATE public.blog_posts 
SET tags = ARRAY['Schengen Visa', 'Visa Fees', 'Travel Budget', 'Europe Travel']
WHERE slug = 'schengen-visa-fees-cost-breakdown-2026';

UPDATE public.blog_posts 
SET tags = ARRAY['Visa Rejection', 'Reapplication', 'Visa Tips', 'Success Guide']
WHERE slug = 'schengen-visa-rejection-reasons-reapply';

UPDATE public.blog_posts 
SET tags = ARRAY['Travel Insurance', 'Visa Requirements', 'Europe Travel', 'Travel Safety']
WHERE slug = 'schengen-travel-insurance-requirements-guide';

UPDATE public.blog_posts 
SET tags = ARRAY['Bank Statement', 'Financial Proof', 'Visa Requirements', 'Documentation']
WHERE slug = 'bank-statement-requirements-schengen-visa';

UPDATE public.blog_posts 
SET tags = ARRAY['Multiple Entry', 'Long-term Visa', 'Frequent Traveler', 'Visa Strategy']
WHERE slug = 'multiple-entry-schengen-visa-how-to-get';

UPDATE public.blog_posts 
SET tags = ARRAY['Processing Time', 'Application Timeline', 'Visa Planning', 'Quick Guide']
WHERE slug = 'schengen-visa-processing-time-how-long';

UPDATE public.blog_posts 
SET tags = ARRAY['First Time', 'Beginner Guide', 'Visa Application', 'Step by Step']
WHERE slug = 'first-time-schengen-visa-applicant-guide';

UPDATE public.blog_posts 
SET tags = ARRAY['Requirements', 'Document Checklist', 'Visa Prep', 'Complete Guide']
WHERE slug = 'schengen-visa-requirements-document-checklist';

UPDATE public.blog_posts 
SET tags = ARRAY['Appointment', 'VFS Global', 'Application Process', 'Booking Guide']
WHERE slug = 'schengen-visa-appointment-booking-guide';

UPDATE public.blog_posts 
SET tags = ARRAY['Complete Guide', 'Step by Step', 'Visa Success', 'All You Need']
WHERE slug = 'complete-schengen-visa-application-guide-2026';

UPDATE public.blog_posts 
SET tags = ARRAY['Summer Travel', 'European Cities', 'Travel Guide', 'Best Destinations']
WHERE slug = 'best-european-cities-visit-summer-2026';

UPDATE public.blog_posts 
SET tags = ARRAY['Itinerary', 'First Trip', 'Travel Planning', 'Europe Tour']
WHERE slug = '10-day-europe-itinerary-first-timers';

UPDATE public.blog_posts 
SET tags = ARRAY['Budget Travel', 'Affordable Europe', 'Money Saving', 'Cheap Travel']
WHERE slug = 'budget-europe-travel-guide-affordable-cities';

UPDATE public.blog_posts 
SET tags = ARRAY['Hidden Gems', 'Underrated Cities', 'Off the Beaten Path', 'Unique Travel']
WHERE slug = 'hidden-gems-europe-underrated-cities';

UPDATE public.blog_posts 
SET tags = ARRAY['Autumn Travel', 'Fall Colors', 'Seasonal Guide', 'Best Time to Visit']
WHERE slug = 'europe-autumn-fall-travel-guide';
