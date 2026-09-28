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
  ('whatsapp_number', '2348089083495'),
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

-- ---------- services ----------
-- The public /services grid and its /services/<slug> detail pages.
--
-- `overview`, `scope`, `method` and `deliverables` hold rich-text HTML rendered
-- through the sanitiser on the public side. Keep the markup to <p>, <ul>, <ol>
-- and <li> -- anything outside the allowlist in lib/sanitize.ts is discarded on
-- save, so it will not survive an edit through the admin.
--
-- Ids are never supplied, so the column default fires. The conflict target is
-- `slug` (a real unique column), NOT `id`: the hero_slides seed above uses
-- `on conflict (id)`, which never matches because no id is supplied, so
-- re-running it duplicates rows. This block is safe to re-run.
insert into public.services (name, slug, summary, icon, overview, scope, method, deliverables, status, display_order, seo_title, seo_description)
values
  (
    'Electric Motor Analysis',
    'electric-motor-analysis',
    'Assess the electrical and mechanical condition of motors so developing faults are found before they stop production.',
    'motor',
    '<p>Electric motor analysis combines electrical testing with mechanical inspection to build a complete picture of a motor''s condition. A motor that is drawing normal current can still have a winding fault, a cracked rotor bar or a bearing that is about to fail, so a single measurement is never enough on its own.</p><p>We test electrically first, then mechanically, and report on the machine as a whole. Results are benchmarked against the design data on the nameplate, so a machine that has degraded is identified even when it is not yet outside its alarm limit.</p>',
    '<ul><li>Insulation resistance, polarisation index and dielectric absorption ratio</li><li>Winding resistance, phase balance and impedance comparison</li><li>Surge and hipot testing, including phase-to-ground and phase-to-phase comparisons</li><li>Tan delta and insulation capacitance</li><li>Rotor testing for broken, cracked or shorted bars and end rings</li><li>Air-gap condition and eccentricity indicators</li><li>Mechanical checks on the shaft, bearings, coupling, end shields, fan and cooling system</li><li>Nameplate verification against measured values: kW, volts, hertz, full-load current, speed, duty and insulation class</li></ul>',
    '<ol><li>Confirm the machine identity, nameplate data and the history of any previous test or repair.</li><li>Record ambient temperature and relative humidity, since both affect insulation readings.</li><li>Isolate, lock out and prove dead. Disconnect the supply and any soft starter or VSD.</li><li>Carry out the electrical tests in a fixed order, discharging the windings between each one.</li><li>Perform the rotor and mechanical checks, with the coupling separated where the test requires it.</li><li>Compare every result against the nameplate and the manufacturer''s limits, not against a bare pass or fail.</li><li>Re-test the insulation after the mechanical work if the machine was disturbed.</li><li>Restore, prove dead and hand over.</li></ol>',
    '<ul><li>A measured value against the stated limit for every test performed</li><li>Diagnosis of each fault detected, with severity and the evidence behind it</li><li>A clear statement of whether the motor is fit to continue in service</li><li>Recommended action: repair, re-test, operate with monitoring, or replace</li><li>Machine identification details so results can be trended against future tests</li><li>Measurement uncertainty and the reference standard used</li></ul>',
    'active',
    1,
    'Electric Motor Analysis',
    'Onsite electric motor testing: insulation, winding, surge and rotor checks with a clear diagnosis and a recommendation.'
  ),
  (
    'Thermographic Survey',
    'thermographic-survey',
    'Locate abnormal heat patterns on electrical and mechanical assets before that heat becomes a failure.',
    'thermometer',
    '<p>Heat is a symptom, not a fault. A hot spot on a busbar, a warm cable gland or a bearing running above its normal temperature all point to a problem that a temperature reading alone does not identify. Thermographic survey finds the location, measures how abnormal it is, and reports the specific cause where the evidence allows it.</p><p>Surveys are most reliable under load. A panel at no load looks almost identical to a healthy one, so we agree the operating condition with you beforehand and record the load against every reading. That is what makes one survey comparable with the next.</p>',
    '<ul><li>Switchboards, motor control centres, distribution boards and panel interiors</li><li>Busbars, cable terminations, joints, lugs, compression connectors and fuses</li><li>Transformers, including bushings, radiators and tap changers</li><li>Cables in cable trenches, on trays and at route joints</li><li>Motors, generators, pumps and driven equipment</li><li>Heat exchangers, radiators and cooling fin paths, including blocked or fouled cooling</li><li>Refractory, insulation and lagging degradation</li><li>Induced heating from nearby sources, such as harmonics or stray flux</li></ul>',
    '<ol><li>Agree the scope, the assets to be surveyed and the load conditions at the time of the survey.</li><li>Record ambient temperature and the emissivity of each surface being measured.</li><li>Load the equipment to a representative duty and allow thermal conditions to stabilise.</li><li>Capture each asset under a repeatable route, at a consistent distance and angle.</li><li>Compare every hot spot against its three-phase siblings and against its own history.</li><li>Investigate the cause of each abnormal reading and, where load allows, confirm the load-related change.</li><li>Re-check after any corrective action has been made and the equipment has been reloaded.</li></ol>',
    '<ul><li>A survey record for every asset, with the thermal image and the measured temperature</li><li>The temperature difference against reference, and the rise over ambient</li><li>A severity rating for each finding, based on the standard and the equipment class</li><li>The likely cause: loose connection, overload, phase imbalance, induced current, cooling restriction or deterioration</li><li>Priority ranking, so the most urgent action comes first</li><li>Recommended corrective action and a date to repeat the survey</li></ul>',
    'active',
    2,
    'Thermographic Survey',
    'Infrared thermographic surveys of switchboards, transformers, cables and rotating equipment, with prioritised findings.'
  ),
  (
    'Airborne and Structure Borne Ultrasound',
    'airborne-structure-borne-ultrasound',
    'Detect leaks, arcing and failing bearings using high-frequency sound, at ranges that ordinary thermography cannot reach.',
    'ultrasound',
    '<p>Compressed air escaping a flange, an electrical contact arcing inside an enclosure and a rolling element beginning to fail all produce sound at frequencies well above the audible range. Ultrasound instrumentation isolates that band, so each of those faults can be heard over plant noise that hides the fault from every other technique.</p><p>The practical advantage is reach. An airborne leak is detected from several metres away, through steel grating and without touching the process. A structure-borne measurement is made with the sensor fixed directly to the machine, which carries the signal of a bearing defect through the casing and structure and lets the instrument pick it out from everything else running in the area.</p>',
    '<ul><li>Compressed air, steam, process gas and nitrogen leaks, including valve stem and flange sealing</li><li>Electrical arcing, corona discharge and tracking, including inside non-visible enclosures</li><li>Bearing condition in gearboxes, pumps, fans and motors, detected through the structure</li><li>Valve and steam trap condition, including passing and failed-open traps</li><li>Mechanical seal and packing leakage on pumps and agitators</li><li>Ultrasonic bearing, gear mesh and lubrication monitoring as a route-based technique</li></ul>',
    '<ol><li>Confirm the scope, the operating state of the plant and whether a shutdown is permitted.</li><li>Set a background reading with the source quiet, so leak sound can be compared against normal plant noise.</li><li>For airborne work, scan the area systematically with the detector and a suitable horn, then confirm each hit.</li><li>For structure-borne work, mount the sensor on a prepared flat surface at a defined location on the casing.</li><li>Apply appropriate filtering so the instrument separates the ultrasonic band from the background.</li><li>Record the sound level, the estimated leak size and the exact location of each finding.</li><li>Re-survey after repair to confirm the leak has stopped.</li></ol>',
    '<ul><li>An ultrasonic image for every reading taken</li><li>The measured sound level for each leak, arcing point or bearing</li><li>An estimated leak size and the compressed-air or energy cost it represents</li><li>A severity assessment and a recommended priority for each finding</li><li>A location list precise enough to find the leak without a full plant walk-down</li><li>Confirmation readings after repair</li></ul>',
    'active',
    3,
    'Airborne Ultrasound Survey',
    'Airborne and structure borne ultrasound inspection for leaks, arcing and bearing condition without shutting down plant.'
  ),
  (
    'Laser Alignment',
    'laser-alignment',
    'Correct shaft misalignment with laser tooling, extending bearing and seal life and reducing energy use.',
    'crosshair',
    '<p>Misalignment is one of the most common causes of premature bearing failure in rotating equipment, and it is also one of the few faults that can be corrected to a measurable tolerance without removing the machine from service. Laser alignment replaces dial-indicator guesswork with a direct, continuous reading of the offset between two shafts.</p><p>Alignment is only as good as the preparation underneath it, so soft foot and baseplate condition are checked first and corrected as part of the job. A machine aligned on a distorted baseplate or with one soft foot drifts out of tolerance within weeks, and the alignment record then describes a machine that is not actually aligned.</p>',
    '<ul><li>Soft foot measurement and correction at all motor or driven-equipment feet</li><li>Angular and parallel alignment between motor and driven equipment</li><li>Baseplate and foot bolt checks, including stretch, distortion and missing washers</li><li>Flange face runout and the correction of face mismatch</li><li>Pipe strain and strain-induced load on the machine nozzles</li><li>Thermal growth and cold alignment targets, so the machine is aligned as it runs and not only when cold</li><li>Alignment of pumps, fans, blowers, compressors, mixers and centrifuges</li><li>Verification of a coupled machine before the guards are refitted</li></ul>',
    '<ol><li>Record the as-found position with the existing shims, before anything is disturbed.</li><li>Measure and correct soft foot at each foot, in turn, before any alignment work begins.</li><li>Check the baseplate and foot bolts for distortion, stretch and loose or missing hardware.</li><li>Fit the laser units and take the as-found offset reading, including the pipe strain reading where applicable.</li><li>Calculate and apply the shim and move corrections, then take a new reading.</li><li>Iterate until the reading is inside the tolerance for the machine, working hot where that is the correct target.</li><li>Torque the foot bolts to specification in the correct pattern, then re-measure.</li><li>Record the as-left result, refit the guard and keep the certificate with the machine documentation.</li></ol>',
    '<ul><li>As-found and as-left offset values in millimetres and inches</li><li>The tolerance applied and the standard it comes from</li><li>Soft foot readings before and after correction, for every foot</li><li>Shim thicknesses removed, added and left in place</li><li>Foot bolt torque figures and the sequence used</li><li>Thermal growth figures where a hot alignment was performed</li><li>Machine identification, shaft positions and bearing frame references for the record</li></ul>',
    'active',
    4,
    'Laser Shaft Alignment',
    'Laser shaft alignment for pumps, fans and compressors: soft foot correction, baseplate checks and a documented as-left tolerance.'
  ),
  (
    'Partial Discharge Analysis',
    'partial-discharge-analysis',
    'Evaluate insulation condition in critical high-voltage equipment so deterioration is measured before it fails.',
    'scanline',
    '<p>A partial discharge is a microscopic breakdown confined to a defect inside insulation: a void, a crack, a delamination or a sharp interface. Each discharge is tiny, but they repeat continuously and they erode the insulation around them. Because the damage accumulates long before any conventional test fails, partial discharge measurement finds ageing that a standard dielectric test will miss entirely.</p><p>This matters most on the equipment that cannot be taken out of service. A transformer or a long cable run that is quietly deteriorating has no second life available to it, so the value of knowing is the ability to act while the decision is still open.</p>',
    '<ul><li>Offline testing on transformers, cables, switchgear, motors and generators, with the equipment isolated</li><li>Very low frequency, damped AC and 50/60 Hz dielectric test sets, to suit the asset and its age</li><li>Capacitance and power factor or tan delta measurement as a supporting test</li><li>Phase resolved partial discharge patterns, plotted to show where in the cycle the discharges occur</li><li>Interference and noise rejection, so external noise is not reported as a defect</li><li>In-service measurement with portable or permanently installed sensors and couplers</li><li>Onsite transformer assessment combining winding resistance, turns ratio, insulation resistance and oil condition where oil testing is in scope</li></ul>',
    '<ol><li>Agree the asset, the reason for the test and whether a shutdown is available.</li><li>Establish and record the background noise level, with the test set energised and the equipment isolated.</li><li>Apply the test voltage in defined steps, allowing the reading to stabilise at each level.</li><li>Record partial discharge magnitude in picocoulombs and build the phase resolved pattern at the significant voltage levels.</li><li>Compare the pattern against the expected void, surface and corona signatures.</li><li>Where in-service testing is agreed, energise the asset and take readings with the sensors in their installed positions.</li><li>Compare with any previous test on the same asset to establish whether the activity is stable or increasing.</li></ol>',
    '<ul><li>Measured partial discharge magnitude in picocoulombs at each test voltage</li><li>The phase resolved discharge pattern, interpreted against known defect signatures</li><li>The background noise level, to show the signal is not ambient interference</li><li>A diagnosis: void, surface discharge, corona, floating electrode, or no significant activity</li><li>A severity assessment and the consequence if the condition is allowed to continue</li><li>Recommended action, including further testing, corrective maintenance or planning for replacement</li><li>Test setup details and calibration reference, so the result can be repeated and compared</li></ul>',
    'active',
    5,
    'Partial Discharge Analysis',
    'Offline and in-service partial discharge testing of transformers, cables, switchgear, motors and generators.'
  ),
  (
    'Onsite Dynamic Balancing',
    'onsite-dynamic-balancing',
    'Correct unbalance in rotating equipment while it runs, without removing the rotor from the machine.',
    'balance',
    '<p>Unbalance is the most common source of vibration in rotating equipment, and the reason it is often left alone is that conventional balancing means stripping the machine down, lifting the rotor out and returning it to a workshop. The plant stays down for days, and a single hour of vibration is judged not worth that cost.</p><p>Onsite dynamic balancing removes both problems. The machine is balanced in place, at speed, with the rotor still fitted, using a small set of portable instruments and trial weights. Correction is normally reached within a single outage, and the machine is verified across its full speed range before the guards go back on.</p>',
    '<ul><li>Single-plane balancing of rigid rotors, most commonly on the shaft end or a balance weight ring</li><li>Two-plane and multi-plane balancing of flexible rotors, impellers, fans and long rotors</li><li>Balancing of couplings, sprockets, chain drives, sheaves, pulleys and impellers</li><li>Full assembly balancing where the machine is severely out of balance or has been repaired</li><li>Removal of buildup from impellers, fans and blades, and correction of damaged or missing blades</li><li>Work on machines running at speed, without dismantling the rotor</li><li>Re-verification across the machine''s operating speed range</li></ul>',
    '<ol><li>Measure the as-found vibration at both bearing housings and establish the machine''s operating speed range.</li><li>Confirm the rotor is clean, undamaged and secure before any correction is attempted.</li><li>Take an initial phase reading on each plane to establish the direction and size of the unbalance vector.</li><li>Calculate the trial weight and the angular position for each plane.</li><li>Fit the trial weights and re-measure at the same speed.</li><li>Iterate, adding or trimming weight, until the vibration is inside the target tolerance at every speed.</li><li>Fit permanent weights in the same position as the successful trial weights, and record them.</li><li>Run a verification pass across the full speed range, through any critical speeds, and record the result.</li></ol>',
    '<ul><li>As-found vibration levels at each bearing and speed</li><li>The unbalance vector, in millimetres per second or grams-millimetres, for each plane</li><li>Every trial weight used, with its position, mass and angle</li><li>The final permanent weights fitted, with their clocking positions</li><li>As-left vibration across the full speed range</li><li>Confirmation that the machine is inside the specified tolerance</li><li>Machine identification and the balance plane references for the record</li></ul>',
    'active',
    6,
    'Onsite Dynamic Balancing',
    'Onsite single and two-plane dynamic balancing of rotors, impellers and couplings, corrected at speed without dismantling.'
  ),
  (
    'Vibration Analysis',
    'vibration-analysis',
    'Identify rotating machinery faults and track how equipment condition is changing, route by route and trend by trend.',
    'waves',
    '<p>Vibration analysis measures what a machine is doing and compares it with what it should be doing. Overall levels answer the urgent question, is this machine in trouble, and spectral analysis answers the more useful one, what exactly is wrong. The two together turn a reading into a diagnosis and a diagnosis into a repair.</p><p>The long-term value is in the trend. A single acceptable reading can hide a slowly developing fault, but the same measurement taken consistently over months will show the change before the alarm ever fires. That is what turns condition monitoring from a report into a maintenance strategy.</p>',
    '<ul><li>Overall vibration velocity, acceleration and displacement, measured to the relevant standard</li><li>Frequency spectrum analysis, with bearing defect frequencies checked against the machine''s geometry</li><li>Envelope and demodulation analysis, which detects early rolling-element and gear defects long before they appear in the overall level</li><li>Time waveform and phase measurement, including cross-channel phase across a machine</li><li>Transient and event capture for starts, stops, load changes and switching events</li><li>Route-based monitoring with consistent measurement points, stored for trending</li><li>Alarm setting, severity classification and condition trending over time</li></ul>',
    '<ol><li>Agree the survey scope: which machines, which measurement points and what the survey is intended to answer.</li><li>Confirm machine speed, power and bearing frame, since every acceptance limit depends on them.</li><li>Take a repeat reading at each point and check the measurement is repeatable before accepting it.</li><li>Record overall levels and capture a spectrum at each point, extending the range where a defect is suspected.</li><li>Apply envelope and demodulation where bearing or gear condition is in question.</li><li>Cross-check each finding against other indicators before naming a fault: lubricant condition, temperature, current and any recent work on the machine.</li><li>Classify severity against the acceptance criteria and record it against the measurement point for trending.</li><li>Agree the action: repair now, plan into the next outage, or monitor and re-measure on a set interval.</li></ol>',
    '<ul><li>Overall levels and spectra for every measurement point, referenced to the machine''s speed and bearing frame</li><li>A severity classification against the applicable acceptance criteria</li><li>A diagnosis for each finding, with the specific evidence that supports it</li><li>Recommended action, prioritised, and the deadline by which it should be done</li><li>A measurement route sheet that can be repeated, so future surveys are directly comparable</li><li>Stored data for trending, with the previous survey included for comparison</li><li>Comments on lubrication, cooling and operating practice where these affect the diagnosis</li></ul>',
    'active',
    7,
    'Vibration Analysis',
    'Vibration surveys and route-based monitoring: spectra, envelope analysis, fault diagnosis and trended measurement routes.'
  ),
  (
    'Equipment Calibration',
    'equipment-calibration',
    'Maintain confidence in your measurement and control instruments with calibration against traceable standards.',
    'sliders',
    '<p>An instrument drifts out of specification long before anything about it looks wrong. It keeps reading, it keeps displaying a plausible number, and the process is quietly adjusted around it. Calibration is what puts a known reference against the instrument and establishes how far the two disagree.</p><p>The distinction between as-found and as-left matters commercially as well as technically. An as-found result shows what the instrument was actually reading in service, which is what your quality system is being judged on. An as-left result shows it has been brought back within tolerance. We report both, and we will not adjust an instrument unless you ask us to.</p>',
    '<ul><li>Pressure: gauges, differential pressure gauges, transmitters, recorders and switches</li><li>Temperature: thermocouples, resistance temperature detectors, transmitters, indicators and infrared thermometers</li><li>Electrical: digital multimeters, clamp meters, insulation resistance testers, micro-ohmmeters, earth testers and power quality analysers</li><li>Process: flow, level, density and mass flow instrumentation</li><li>Dimensional and mechanical: micrometers, verniers, gauges, torque tools and angle measuring instruments</li><li>Signal path instruments: transducers, transmitters, recorders, alarms and analysers</li><li>Onsite calibration in the installed position, or in the workshop where access prevents it</li><li>As-found, as-left, adjustment and certification to your documented requirement</li></ul>',
    '<ol><li>Agree the instrument list, the acceptance tolerance and the standard each will be calibrated against.</li><li>Confirm the required calibration point, normally between 10 and 90 percent of span.</li><li>Check the instrument for damage, and for evidence of the seals and the case being opened, before it is connected.</li><li>Apply the reference standard and allow the instrument and the standard to reach thermal equilibrium.</li><li>Take readings at the calibration point, and on both sides where the requirement calls for it.</li><li>Compare the readings with the reference and calculate the error.</li><li>Where adjustment is authorised, adjust the instrument and re-verify rather than only recording the error.</li><li>Fit the instrument back into service, or re-install it in its operating position.</li></ol>',
    '<ul><li>A calibration certificate for every instrument, identifying the instrument and its asset tag</li><li>As-found and as-left readings, with the reference value alongside each</li><li>The calculated error for each point and whether it is within your stated tolerance</li><li>Adjustment details, where adjustment was carried out</li><li>Identification of the reference standards used, with their own calibration status</li><li>The accredited body, certificate number and scope of the accreditation where the work is issued under one</li><li>A statement of any instrument found out of tolerance, and what that means for the process it was measuring</li></ul>',
    'active',
    8,
    'Equipment Calibration',
    'Onsite and workshop calibration of pressure, temperature, electrical and process instruments against traceable standards.'
  ),
  (
    'Equipment Rental',
    'equipment-rental',
    'Access specialist diagnostic and test equipment for planned work, without the capital cost or the lead time.',
    'wrench',
    '<p>Specialist test equipment is expensive, and it is needed in bursts rather than continuously. A single alignment job, a shutdown survey or a one-off bearing investigation does not justify owning an instrument that will sit idle for eleven months, and the lead time to specify, purchase, calibrate and commission one is often longer than the outage it is needed for.</p><p>Renting from us removes both problems. The equipment is calibrated and ready, it arrives when the work is scheduled, and it leaves afterwards. It can be supplied on a self-operated basis for your own trained technicians, or with one of our engineers operating it as part of a service.</p>',
    '<ul><li>Vibration analysers with route capability, and route kits for periodic monitoring</li><li>Laser shaft alignment systems and clamping fixtures</li><li>Dynamic balancing kits, including the portable analyser and weight tooling</li><li>Thermographic cameras, with the lens and resolution suited to the application</li><li>Partial discharge and dielectric test sets for transformers, cables and switchgear</li><li>Insulation resistance testers, winding resistance sets and micro-ohmmeters</li><li>Power quality analysers and power monitoring systems</li><li>Ultrasound detectors, both handheld and structure borne</li><li>Oil analysis sampling kits, hydraulic test pumps and associated test equipment</li></ul>',
    '<ol><li>Tell us the application, the equipment involved and the window in which the work must be done.</li><li>Confirm whether the equipment is being supplied for self-operation or with one of our engineers.</li><li>Agree the hire period, and take account of mobilisation, the survey itself and reporting.</li><li>Confirm the calibration status of the instrument being supplied and issue the certificate with it.</li><li>Deliver and hand over, with a short demonstration for self-operated hire.</li><li>Collect the equipment at the end of the hire period and confirm its condition.</li></ol>',
    '<ul><li>The equipment, calibrated and ready for use, with its calibration certificate</li><li>A clear statement of the hire period, the rates and what the charge includes</li><li>Handover and collection at your site, arranged to suit your shutdown window</li><li>A demonstration and operating guidance where the equipment is hired for self-operation</li></ul>',
    'active',
    9,
    'Equipment Rental',
    'Hire specialist vibration, alignment, thermography, ultrasound and electrical test equipment for planned work or surveys.'
  )
on conflict (slug) do nothing;
