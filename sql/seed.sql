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

-- ---------- product_labels ----------
insert into public.product_labels (name, slug, description, status, display_order)
values
  ('Vibration Monitoring', 'vibration-monitoring', 'Vibration analysers, monitoring systems and route-based data collection.', 'active', 1),
  ('Thermography', 'thermography', 'Infrared thermographic cameras and thermal imaging for electrical and mechanical inspection.', 'active', 2),
  ('Ultrasound', 'ultrasound', 'Airborne and contact ultrasound for steam, gas and bearing condition monitoring.', 'active', 3),
  ('Electrical Testing', 'electrical-testing', 'Insulation resistance, power quality and electrical safety test equipment.', 'active', 4),
  ('Portable', 'portable', 'Handheld and field-deployable instruments.', 'active', 5),
  ('Benchtop', 'benchtop', 'Laboratory and bench-mounted instruments.', 'active', 6),
  ('New Arrival', 'new-arrival', 'Recently added to the Asset Matrix Energy catalogue.', 'active', 7)
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
-- `overview` is the entire body of a service page: rich-text HTML authored in
-- the admin, sanitised against an allowlist in the write path (see
-- lib/sanitize.ts) and only ever rendered through the sanitiser's output.
-- h1-h6, p, ul/ol/li, strong, em, br and blockquote are all on the allowlist, so
-- subheadings and bulleted lists inside the overview are supported and used
-- throughout the copy below.
--
-- `icon` stores a key into the curated map in lib/service-icons.ts, not the name
-- of an SVG component: it is admin-editable input, so it is validated against
-- SERVICE_ICON_KEYS in the server action and falls back to a default on read.
--
-- status is active/inactive rather than news' draft/published/archived. A
-- service page is either offered or not, and there is nothing to schedule, so
-- there is deliberately no publish_at column.
--
-- Ids are never supplied, so the column default fires. The conflict target is
-- `slug` (a real unique column), NOT `id`: the hero_slides seed above uses
-- `on conflict (id)`, which never matches because no id is supplied, so
-- re-running it duplicates rows. This block is safe to re-run.
insert into public.services (name, slug, summary, icon, overview, status, display_order, seo_title, seo_description)
values
  (
    'Electric Motor Analysis',
    'electric-motor-analysis',
    'Assess the electrical and mechanical condition of motors so developing faults are found before they stop production.',
    'motor',
    '<h2><strong>Motor Condition Monitoring (MCA)™ and Motor Current Signature Analysis (MCSA)™ Services</strong></h2><p>Motor Circuit Analysis (MCA™), an offline (de-energized) testing procedure is the most powerful condition monitoring technology for evaluating the health of your electrical motor circuit, from the load side of the motor starter all the way through motor windings. MCA effectively identifies defects causing motor failures as well as energy inefficiencies within the motor windings. The advantage to testing from the MCC is that the entire electrical portion of the motor system, including the connections and cables between the test point and the motor, is evaluated.</p><p>Motor Circuit Analysis (MCA™) can deliver desired returns on energy savings, equipment reliability improvements and increased production capacity. Motor Circuit Analysis (MCA™) detects:</p><ul><li><p>Current imbalance and loading issues</p></li><li><p>Power quality disturbances (harmonics, voltage imbalance, power factor anomalies)</p></li><li><p>Circuitry and motor insulation breakdown/degradation</p></li><li><p>Rotor damage (loss of torque, loss of HP)</p></li><li><p>Loose motor foundation (soft foot, sprung, foot)</p></li><li><p>Eccentricity in rotors (motors, sheaves, fans)</p></li><li><p>Belt defects</p></li><li><p>Vane/blade pass</p></li><li><p>Gearing defect (broken tooth, backlash, looseness)</p></li><li><p>Bearing defects</p></li></ul><h2><strong>Motor Current Signature Analysis (MCSA)™</strong></h2><p>Motor Current (Electrical) Signature Analysis (MCSA)™ is an online (energized) test method where voltage and current waveforms are captured while the motor system is running, to assess the health of the motor system. Energized testing provides valuable information for AC induction and DC motors, generators, wound rotor motors, synchronous motors, machine tool motors, and more.</p><p>Online testing is performed while the motor is operating within its normal environment and operating conditions and provides insight regarding power quality and conditions such as voltage levels, unbalances, distortion as well as any defect in the mechanical drive train causing torsional loads back onto the motor such as misalignment, coupling problems, and certain bearing defects.</p><p>Motor Circuit Analysis (MCA™) and Motor Current (Electrical) Signature Analysis (MCSA)™ analyses conditions in:</p><ul><li><p>AC/DC motors</p></li><li><p>VFD applications</p></li><li><p>Generators / alternators</p></li><li><p>Servo motors and machine tool motors</p></li><li><p>Gearboxes</p></li></ul><p>Applications of Motor Circuit Analysis (MCA™) and Motor Current (Electrical) Signature Analysis (MCSA)™ include:</p><ul><li><p>Reliability testing</p></li><li><p>Commissioning testing for new or reconditioned motors prior to being put into service</p></li><li><p>Quality assurance (QA) tool for acceptance testing of new or reconditioned motors prior to them being stored</p></li><li><p>Troubleshooting tool to test the integrity of an installed motor''s insulation system</p></li><li><p>For energy evaluation</p></li></ul>',
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
    '<h2><strong>Infrared Thermography and Load-Based Survey</strong></h2><p>Infrared thermography is a non-contact, non-destructive technique that measures the surface temperature of equipment and converts it into a visible map of heat flow. A hot spot is a symptom rather than a fault, so the value of the survey lies in measuring how far a reading departs from its reference, comparing it against its three-phase siblings and against its own history, and identifying the cause behind it.</p><p>Surveys are only reliable under load. An electrical panel at no load looks almost identical to a healthy one, and a motor that is cool at rest can still be badly unbalanced under duty. We therefore agree the operating condition in advance, load the equipment to a representative duty, allow thermal conditions to stabilise, and record the load against every measurement. That is what makes one survey comparable with the next, and what allows a rising trend to be caught before an alarm fires.</p><p>Thermographic survey detects:</p><ul><li>Loose connections, compression lugs and poorly torqued joints generating resistive heating</li><li>Overloaded conductors, cables and switchgear rated below the load they are carrying</li><li>Phase imbalance and single-phase loading on three-phase systems</li><li>Induced heating from harmonics, stray flux or proximity to adjacent current-carrying conductors</li><li>Blocked or fouled cooling paths, obstructed radiators and degraded fan performance</li><li>Insulation and refractory deterioration, and localised loss of thermal protection</li><li>Hot spots at terminations, joints and fuses inside switchboards and motor control centres</li></ul><h2><strong>Thermographic Survey Applications</strong></h2><p>Thermographic survey is applied to:</p><ul><li>Switchboards, motor control centres, distribution boards and panel interiors</li><li>Busbars, cable terminations, joints, lugs, compression connectors and fuses</li><li>Power transformers, including bushings, radiators and tap changers</li><li>Cables in trenches, on trays and at route joints</li><li>Motors, generators, pumps and driven equipment</li><li>Heat exchangers, cooling fin paths, radiators and lagging</li></ul><p>Every survey records the thermal image, the measured temperature, the temperature difference against reference and the rise over ambient, alongside a severity rating based on the applicable standard and the equipment class. Findings are priority ranked so the most urgent action comes first, the likely cause is identified, and a re-survey after corrective action confirms the fault has been cleared.</p>',
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
    '<h2><strong>Airborne Ultrasound</strong></h2><p>Compressed air escaping a flange, an electrical contact arcing inside a sealed enclosure and a rolling element beginning to fail all produce sound at frequencies well above the audible range. Ultrasound instrumentation isolates that band and listens only to it, which allows each of these faults to be detected over plant noise that conceals it from every conventional technique.</p><p>The practical advantage of airborne measurement is reach. A leak is detected from several metres away, through steel grating, without shutting down the process and without touching the equipment. Survey areas are scanned systematically with a detector and a suitable horn, a background reading is established with the source quiet so that leak sound can be compared against normal plant noise, and each hit is confirmed before it is recorded with an estimated leak size and the running cost it represents.</p><p>Airborne ultrasound detects:</p><ul><li>Compressed air, steam, process gas and nitrogen leaks, including valve stem and flange sealing</li><li>Electrical arcing, corona discharge and tracking, including inside enclosures that cannot be seen</li><li>Steam traps that have failed open or passed while still appearing closed</li><li>Mechanical seal and packing leakage on pumps and agitators</li><li>Insulation breakdown on high-voltage equipment where the fault is not visible</li></ul><h2><strong>Structure Borne Ultrasound</strong></h2><p>Structure borne measurement is made with the sensor fixed directly to the machine casing. The high-frequency signal of a bearing or gear defect travels through the structure, and mounting the sensor on a prepared flat surface at a defined location lets the instrument separate that signal from everything else running nearby. It is the same instrument and the same principle as the airborne survey, with the sensor mounted rather than swept.</p><p>Structure borne ultrasound is applied to:</p><ul><li>Early-stage rolling-element bearing and gear mesh defects in gearboxes, pumps, fans and motors</li><li>Gearbox lubrication condition, including oil degradation and the absence of the bearing and mesh signals it should carry</li><li>Pumps, compressors and other assets where enclosure noise masks conventional vibration analysis</li></ul><p>Every reading is recorded as an ultrasonic image with its measured sound level and its precise location, and confirmation readings are taken after repair to verify that the leak has stopped, the arcing has cleared or the bearing signal has returned to normal.</p>',
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
    '<h2><strong>Laser Shaft Alignment</strong></h2><p>Misalignment is one of the most common causes of premature bearing and seal failure in rotating equipment, and one of the few faults that can be corrected to a measured tolerance without removing the machine from service. Laser alignment replaces dial-indicator guesswork with a direct, continuous reading of the offset between two shafts, so the correction can be calculated and verified rather than estimated.</p><p>Alignment is only as good as the preparation underneath it. Soft foot, baseplate condition and pipe strain are checked first and corrected as part of the job, because a machine aligned on a distorted baseplate or with one soft foot drifts out of tolerance within weeks, and the resulting record then describes a machine that is not actually aligned.</p><p>Laser alignment corrects:</p><ul><li>Soft foot at all motor or driven-equipment feet, measured and corrected in turn</li><li>Angular and parallel misalignment between motor and driven equipment</li><li>Baseplate and foot bolt defects, including stretch, distortion and loose or missing hardware</li><li>Flange face runout and the correction of face mismatch</li><li>Pipe strain and the load it imposes on the machine nozzles</li><li>Cold and hot alignment targets, so the machine is aligned as it runs and not only when shut down</li></ul><h2><strong>Alignment Applications and Records</strong></h2><p>Laser shaft alignment is applied to pumps, fans, blowers, compressors, mixers and centrifuges, with the machine verified in its coupled condition before guards are refitted.</p><p>Each alignment produces a record containing the as-found and as-left offset values in both millimetres and inches, the tolerance applied and the standard it comes from, soft foot readings before and after correction for every foot, the shim thicknesses removed, added and left in place, foot bolt torque figures with the sequence used, and thermal growth figures where a hot alignment was performed. Machine identification, shaft positions and bearing frame references are recorded against the results so the work can be compared with future alignments.</p>',
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
    '<h2><strong>Partial Discharge Measurement</strong></h2><p>A partial discharge is a microscopic electrical breakdown confined to a defect inside insulation: a void, a crack, a delamination or a sharp interface. Each individual discharge is tiny, but they repeat continuously and they erode the insulation around them. Because that damage accumulates over a long period before any conventional dielectric test fails, partial discharge measurement finds ageing that a standard test will miss entirely.</p><p>This matters most on the equipment that cannot be taken out of service. A transformer or a long cable run that is quietly deteriorating has no second life available to it, so the value of knowing is the ability to act while the decision is still open. Testing is carried out with the test set energised and the equipment isolated, so the background noise level can be established and external interference is never reported as a defect, and the test voltage is applied in defined steps with the reading allowed to stabilise at each level.</p><p>Partial discharge analysis detects:</p><ul><li>Current and future decay of internal voids within solid or liquid insulation</li><li>Surface discharge along a dielectric interface or an insulator surface</li><li>Corona discharge at sharp or poorly screened conductors</li><li>Floating electrodes and poorly formed terminations</li><li>Ageing of transformer insulation long before a power factor or ratio test becomes abnormal</li><li>Damage to cable insulation, joints and terminations</li></ul><h2><strong>Test Methods and Applications</strong></h2><p>Partial discharge testing is applied to transformers, cables, switchgear, motors and generators, either offline with the equipment isolated or in service with portable or permanently installed sensors and couplers. Offline testing employs very low frequency, damped AC and 50/60 Hz dielectric test sets, selected to suit the asset and its age, with capacitance and power factor or tan delta measurement taken as a supporting test.</p><p>Each result reports the partial discharge magnitude in picocoulombs at every test voltage, the phase resolved discharge pattern interpreted against the known void, surface and corona signatures, and the background noise level that demonstrates the signal is not ambient interference. The diagnosis is compared with any previous test on the same asset to establish whether the activity is stable or increasing, and a severity assessment is given with the consequence of allowing the condition to continue and the recommended corrective action or replacement planning.</p>',
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
    '<h2><strong>Onsite Dynamic Balancing</strong></h2><p>Unbalance is the most common source of vibration in rotating equipment, and it is frequently left alone because conventional balancing means stripping the machine down, lifting the rotor out and returning it to a workshop. The plant then stays down for days, and a single hour of vibration is judged not worth that cost.</p><p>Onsite dynamic balancing removes both problems. The machine is balanced in place, at speed, with the rotor still fitted, using a portable analyser and a set of trial weights. Correction is normally reached within a single outage, and the machine is verified across its full speed range, through any critical speeds, before the guards go back on.</p><p>Dynamic balancing corrects:</p><ul><li>Single-plane unbalance of rigid rotors, most commonly at the shaft end or a balance weight ring</li><li>Two-plane and multi-plane unbalance of flexible rotors, impellers, fans and long rotors</li><li>Imbalance introduced by a coupling, sprocket, chain drive, sheave or pulley</li><li>Buildup on impellers, fans and blades, and the correction of damaged or missing blades</li><li>Severely out-of-balance machines and rotors that have been repaired or reassembled</li></ul><h2><strong>Balancing Method</strong></h2><p>The as-found condition is measured at both bearing housings across the machine''s operating speed range, and the rotor is confirmed clean, undamaged and secure before any correction is attempted. An initial phase reading on each plane establishes the direction and size of the unbalance vector, from which a trial weight and angular position are calculated. The weights are fitted and the machine re-measured, and the process is iterated until the vibration is inside the target tolerance at every speed.</p><p>Every job is recorded with the as-found levels at each bearing and speed, the unbalance vector for each plane, every trial weight used with its position, mass and angle, the final permanent weights and their clocking positions, and the as-left vibration across the full speed range confirming the machine is inside the specified tolerance.</p>',
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
    '<h2><strong>Vibration Analysis and Monitoring</strong></h2><p>Vibration analysis measures what a machine is doing and compares it against what it should be doing. Overall vibration levels answer the urgent question of whether a machine is in trouble; spectral analysis answers the more useful question of what exactly is wrong. The two together turn a reading into a diagnosis and a diagnosis into a repair.</p><p>The long-term value lies in the trend. A single acceptable reading can hide a slowly developing fault, but the same measurement taken consistently over months will show the change before an alarm ever fires. That is what turns condition monitoring from a report into a maintenance strategy, and it is why measurement points and instrument settings are held consistent so that one survey remains directly comparable with the next.</p><p>Vibration analysis detects:</p><ul><li>Unbalance, and how it is changing over time</li><li>Angular and parallel misalignment, confirmed by cross-channel phase</li><li>Mechanical looseness, structural looseness and resonance</li><li>Early-stage rolling-element and gear defects, through envelope and demodulation analysis</li><li>Bearing defect frequencies checked against the machine''s specific geometry</li><li>Bent shafts, coupling problems and gear mesh problems</li><li>Transient events such as starts, stops, load changes and switching</li></ul><h2><strong>Methods and Applications</strong></h2><p>Measurements are taken as overall velocity, acceleration and displacement, and as a frequency spectrum extended beyond the standard band where a defect is suspected. Envelope and demodulation analysis is applied where bearing or gear condition is in question, and time waveform and phase measurement, including cross-channel phase, is used to separate faults that produce similar overall levels. Every finding is cross-checked against other indicators such as lubricant condition, temperature and current, and against any recent work carried out on the machine, before a fault is named.</p><p>Each survey reports overall levels and spectra for every measurement point, referenced to the machine''s speed and bearing frame since every acceptance limit depends on them, a severity classification against the applicable acceptance criteria, a diagnosis with the specific evidence that supports it, and a prioritised action with a deadline. A repeatable measurement route sheet is issued so future surveys remain directly comparable, and the data is stored for trending with the previous survey included for comparison.</p>',
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
    '<h2><strong>Onsite and Laboratory Calibration</strong></h2><p>An instrument drifts out of specification long before anything about it looks wrong. It keeps reading, it keeps displaying a plausible number, and the process is quietly adjusted around it. Calibration places a known reference against the instrument and establishes how far the two disagree, which is the only way to know whether a measurement can be relied upon.</p><p>Calibration is performed onsite in the installed position wherever access allows, because that is the condition the instrument actually works in, and in the workshop where the installed position prevents a proper reference being applied. The instrument is first checked for physical damage and for evidence that its case or seals have been opened, and the reference standard and the instrument are allowed to reach thermal equilibrium before readings are taken at the calibration point, normally between 10 and 90 percent of span.</p><p>The distinction between as-found and as-left matters commercially as well as technically. An as-found result shows what the instrument was actually reading in service, which is what a quality system is judged on. An as-left result shows it has been brought back within tolerance. We report both, and we will not adjust an instrument unless you ask us to.</p><p>Instruments calibrated include:</p><ul><li>Pressure: gauges, differential pressure gauges, transmitters, recorders and switches</li><li>Temperature: thermocouples, resistance temperature detectors, transmitters, indicators and infrared thermometers</li><li>Electrical: digital multimeters, clamp meters, insulation resistance testers, micro-ohmmeters, earth testers and power quality analysers</li><li>Process: flow, level, density and mass flow instrumentation</li><li>Dimensional and mechanical: micrometers, verniers, gauges, torque tools and angle measuring instruments</li><li>Signal path: transducers, transmitters, recorders, alarms and analysers</li></ul><p>Each instrument receives a certificate identifying it by asset tag, with its as-found and as-left readings against the reference value, the calculated error for each point and whether it is within the stated tolerance, the adjustment carried out where authorised, the reference standards used with their own calibration status, and the accredited body, certificate number and scope of accreditation. Any instrument found out of tolerance is reported as such, together with what that means for the process it was measuring.</p>',
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
    '<h2><strong>Equipment Hire and Rental</strong></h2><p>Specialist test equipment is expensive, and it is needed in bursts rather than continuously. A single alignment job, a shutdown survey or a one-off bearing investigation does not justify owning an instrument that will sit idle for eleven months, and the lead time to specify, purchase, calibrate and commission one is often longer than the outage it is needed for.</p><p>Renting removes both problems. The equipment is calibrated and ready, it arrives when the work is scheduled, and it leaves afterwards. It can be supplied on a self-operated basis for your own trained technicians, with a short demonstration at handover, or with one of our engineers operating it as part of a service.</p><p>Equipment available to hire:</p><ul><li>Vibration analysers with route capability, and route kits for periodic monitoring</li><li>Laser shaft alignment systems and clamping fixtures</li><li>Dynamic balancing kits, including the portable analyser and weight tooling</li><li>Thermographic cameras, with lens and resolution suited to the application</li><li>Partial discharge and dielectric test sets for transformers, cables and switchgear</li><li>Insulation resistance testers, winding resistance sets and micro-ohmmeters</li><li>Power quality analysers and power monitoring systems</li><li>Ultrasound detectors, both handheld and structure borne</li><li>Oil analysis sampling kits, hydraulic test pumps and associated test equipment</li></ul><p>Every hire is issued with the equipment calibrated and ready for use, its calibration certificate, a clear statement of the hire period and rates, and handover and collection at your site arranged to suit the shutdown window. Self-operated hire includes an operating demonstration at handover.</p>',
    'active',
    9,
    'Equipment Rental',
    'Hire specialist vibration, alignment, thermography, ultrasound and electrical test equipment for planned work or surveys.'
  )
on conflict (slug) do nothing;
