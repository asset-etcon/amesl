-- =====================================================================
-- Asset Matrix Energy — seed data
-- Run AFTER supabase/schema.sql in the Supabase SQL editor.
-- Seeds: the 29 technology partners AMESL actually represents (logos exist
-- in /public/pics/brands), a starter category set, default site settings and
-- the live homepage hero slides. No demo products are seeded — the catalogue
-- starts empty by design.
-- =====================================================================

-- ---------- brands ----------
insert into public.brands (name, slug, logo_url, website, status, display_order)
values
  ('ADI', 'adi', '/pics/brands/adi.webp', '', 'active', 1),
  ('All Test Pro', 'all-test-pro', '/pics/brands/all test pro.webp', '', 'active', 2),
  ('Artesis', 'artesis', '/pics/brands/artesis.webp', '', 'active', 3),
  ('Common SA', 'common-sa', '/pics/brands/common-SA.webp', '', 'active', 4),
  ('CS Instrument', 'cs-instrument', '/pics/brands/cs instrument.webp', '', 'active', 5),
  ('DB VB', 'db-vb', '/pics/brands/db vb.webp', '', 'active', 6),
  ('Dinnteco', 'dinnteco', '/pics/brands/dinnteco.webp', '', 'active', 7),
  ('Doble', 'doble', '/pics/brands/doble.webp', '', 'active', 8),
  ('Eagle Eye', 'eagle-eye', '/pics/brands/eagle-eye.webp', '', 'active', 9),
  ('Easy-Laser', 'easy-laser', '/pics/brands/easy-laser.webp', '', 'active', 10),
  ('Erbessd Systems', 'erbessd-systems', '/pics/brands/erbessd systems.webp', '', 'active', 11),
  ('Globecore', 'globecore', '/pics/brands/globecore.webp', '', 'active', 12),
  ('Heinrichs', 'heinrichs', '/pics/brands/heinrichs.webp', '', 'active', 13),
  ('Hioki', 'hioki', '/pics/brands/hioki.webp', '', 'active', 14),
  ('KP', 'kp', '/pics/brands/kp.webp', '', 'active', 15),
  ('Lumel', 'lumel', '/pics/brands/lumel.webp', '', 'active', 16),
  ('Luneta', 'luneta', '/pics/brands/luneta.webp', '', 'active', 17),
  ('Ofil', 'ofil', '/pics/brands/ofil.webp', '', 'active', 18),
  ('PJ Electronics', 'pj-electronics', '/pics/brands/pj electronics.webp', '', 'active', 19),
  ('PMDT', 'pmdt', '/pics/brands/PMDT.webp', '', 'active', 20),
  ('Prime UV', 'prime-uv', '/pics/brands/prime uv.webp', '', 'active', 21),
  ('Process Insights', 'process-insights', '/pics/brands/process insights.webp', '', 'active', 22),
  ('Satir', 'satir', '/pics/brands/satir.webp', '', 'active', 23),
  ('Smart Sensor', 'smart-sensor', '/pics/brands/smart sensor.webp', '', 'active', 24),
  ('Sonel', 'sonel', '/pics/brands/sonel.png', '', 'active', 25),
  ('Synergy''s Technologies', 'synergys-technologies', '/pics/brands/synergys-technologies.png', '', 'active', 26),
  ('Ubicquia', 'ubicquiad', '/pics/brands/ubicquiad.webp', '', 'active', 27),
  ('UE Systems', 'ue-systems', '/pics/brands/ue systems.webp', '', 'active', 28),
  ('VMI (Vibration Measurement Instruments)', 'vmi', '/pics/brands/w.webp', '', 'active', 29)
on conflict (slug) do nothing;

-- ---------- categories ----------
insert into public.categories (name, slug, description, status, display_order)
values
  ('Condition Monitoring', 'condition-monitoring', 'Equipment health monitoring, vibration, thermography and ultrasound.', 'active', 1),
  ('Electrical Testing & Diagnostics', 'electrical-testing-diagnostics', 'Testing and diagnostic solutions for electrical assets.', 'active', 2),
  ('Test & Measurement', 'test-measurement', 'Instruments and systems for precision test and measurement.', 'active', 3),
  ('Instrumentation & Process Control', 'instrumentation-process-control', 'Process measurement, monitoring and control solutions.', 'active', 4),
  ('Calibration Equipment', 'calibration-equipment', 'Reference standards and calibration tools.', 'active', 5),
  ('Reliability Engineering', 'reliability-engineering', 'Tools and systems supporting asset reliability programs.', 'active', 6),
  ('Industrial Equipment', 'industrial-equipment', 'General industrial and field equipment.', 'active', 7)
on conflict (slug) do nothing;

-- ---------- site settings ----------
insert into public.site_settings (key, value)
values
  ('company_name', 'Asset Matrix Energy Services Limited'),
  ('company_short_name', 'Asset Matrix Energy'),
  ('email', 'info@assetmatrixenergy.com'),
  ('phone_primary', '+234-7069176001'),
  ('phone_secondary', '+234-8176153012'),
  ('address_head_office', 'No. 23, House 13 Osogbo Street, Ogudu, Lagos, Nigeria.'),
  ('address_operations', '445 Herbert Macaulay Way, Bio-vaccine Compound, Yaba, Lagos, Nigeria.'),
  ('footer_about', 'Specialized engineering, industrial reliability and technical solutions for critical assets in Nigeria and Sub-Saharan Africa.'),
  ('training_url', 'https://training.assetmatrixenergy.com/'),
  ('copyright_text', 'Asset Matrix Energy Services Limited')
on conflict (key) do nothing;

-- ---------- hero slides ----------
insert into public.hero_slides (image_desktop, image_mobile, headline, subtext, cta_label, cta_href, status, display_order)
values
  (
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=2400&q=85',
    '',
    'Keeping Critical Infrastructure Performing.',
    'We deliver specialized engineering, reliability and technical solutions for power, oil & gas, manufacturing, marine and other asset-intensive industries across Nigeria and Africa.',
    'Explore our solutions',
    '#solutions',
    'active',
    1
  ),
  (
    '/hero/Engineering Insights for Critical Assets.jpg',
    '',
    'Engineering Insights for Critical Assets.',
    'From electrical testing and diagnostics to instrumentation, condition monitoring and predictive maintenance, we provide the technical expertise and solutions needed to make smarter asset decisions.',
    'Explore our solutions',
    '#solutions',
    'active',
    2
  ),
  (
    '/hero/EXXONMOBIL - Training.jpg',
    '',
    'Maximize Asset Reliability. Minimize Downtime.',
    'Advanced condition monitoring, testing, diagnostics and reliability solutions that help industries detect problems early, improve equipment performance and protect critical assets.',
    'Explore our solutions',
    '#solutions',
    'active',
    3
  )
on conflict (id) do nothing;