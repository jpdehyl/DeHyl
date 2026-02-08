-- Safety Checklists for DeHyl
-- Tracks FLHA, Tailgate Meetings, PPE Inspections, etc.

-- Templates table (predefined checklist types)
CREATE TABLE safety_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- flha, tailgate, ppe, equipment
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]', -- [{id, question, type, required, options}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Completed checklists
CREATE TABLE safety_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES safety_templates(id),
  project_id UUID REFERENCES projects(id),
  completed_by UUID REFERENCES crew_members(id),
  completed_by_name TEXT, -- Fallback if no crew_member linked
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT, -- morning, afternoon, night
  weather TEXT,
  temperature TEXT,
  location TEXT,
  responses JSONB NOT NULL DEFAULT '{}', -- {item_id: response_value}
  attendees TEXT[], -- For tailgate meetings - names of people present
  hazards_identified TEXT,
  controls_implemented TEXT,
  additional_notes TEXT,
  signature_data TEXT, -- Base64 encoded signature image
  signature_url TEXT, -- URL if stored in storage
  status TEXT DEFAULT 'completed', -- draft, completed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_safety_checklists_project ON safety_checklists(project_id);
CREATE INDEX idx_safety_checklists_date ON safety_checklists(date DESC);
CREATE INDEX idx_safety_checklists_template ON safety_checklists(template_id);
CREATE INDEX idx_safety_templates_type ON safety_templates(type);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_safety_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER safety_templates_updated
  BEFORE UPDATE ON safety_templates
  FOR EACH ROW EXECUTE FUNCTION update_safety_timestamp();

CREATE TRIGGER safety_checklists_updated
  BEFORE UPDATE ON safety_checklists
  FOR EACH ROW EXECUTE FUNCTION update_safety_timestamp();

-- Insert default templates
INSERT INTO safety_templates (name, type, description, items) VALUES
(
  'Field Level Hazard Assessment (FLHA)',
  'flha',
  'Daily hazard assessment before starting work. Required for all demolition and hazmat jobs.',
  '[
    {"id": "ppe_required", "question": "Is all required PPE available and in good condition?", "type": "checkbox", "required": true},
    {"id": "area_inspected", "question": "Has the work area been inspected for hazards?", "type": "checkbox", "required": true},
    {"id": "utilities_identified", "question": "Have all utilities been identified and marked?", "type": "checkbox", "required": true},
    {"id": "emergency_access", "question": "Is emergency access clear and unobstructed?", "type": "checkbox", "required": true},
    {"id": "first_aid_available", "question": "Is first aid kit available on site?", "type": "checkbox", "required": true},
    {"id": "msds_available", "question": "Are MSDS/SDS sheets available for materials on site?", "type": "checkbox", "required": true},
    {"id": "fall_hazards", "question": "Fall Hazards", "type": "select", "required": true, "options": ["None", "Low Risk - Controlled", "Medium Risk - Additional Controls Needed", "High Risk - Stop Work"]},
    {"id": "electrical_hazards", "question": "Electrical Hazards", "type": "select", "required": true, "options": ["None", "Low Risk - Controlled", "Medium Risk - Additional Controls Needed", "High Risk - Stop Work"]},
    {"id": "hazmat_present", "question": "Hazardous Materials Present", "type": "select", "required": true, "options": ["None", "Asbestos", "Lead", "Silica", "Mold", "Multiple"]},
    {"id": "dust_controls", "question": "Dust control measures in place?", "type": "checkbox", "required": false},
    {"id": "structural_concerns", "question": "Any structural stability concerns?", "type": "checkbox", "required": true},
    {"id": "weather_suitable", "question": "Weather conditions suitable for work?", "type": "checkbox", "required": true},
    {"id": "hazards_notes", "question": "Describe hazards identified", "type": "textarea", "required": false},
    {"id": "controls_notes", "question": "Control measures implemented", "type": "textarea", "required": false}
  ]'::jsonb
),
(
  'Tailgate Safety Meeting',
  'tailgate',
  'Daily safety meeting record. Document topics discussed and attendees.',
  '[
    {"id": "meeting_date", "question": "Meeting Date", "type": "date", "required": true},
    {"id": "meeting_time", "question": "Meeting Time", "type": "time", "required": true},
    {"id": "topics_discussed", "question": "Safety Topics Discussed", "type": "multiselect", "required": true, "options": ["PPE Requirements", "Hazard Communication", "Fall Protection", "Electrical Safety", "Asbestos Awareness", "Lead Safety", "Silica Exposure", "Emergency Procedures", "Equipment Operation", "Housekeeping", "Weather Hazards", "Other"]},
    {"id": "specific_hazards", "question": "Site-specific hazards discussed today", "type": "textarea", "required": true},
    {"id": "safety_reminders", "question": "Safety reminders given", "type": "textarea", "required": false},
    {"id": "questions_raised", "question": "Questions or concerns raised", "type": "textarea", "required": false},
    {"id": "incidents_reviewed", "question": "Recent incidents/near misses reviewed?", "type": "checkbox", "required": false},
    {"id": "all_understood", "question": "All workers confirmed understanding of today''s tasks and hazards?", "type": "checkbox", "required": true}
  ]'::jsonb
),
(
  'PPE Inspection Checklist',
  'ppe',
  'Personal Protective Equipment inspection and verification.',
  '[
    {"id": "hard_hat", "question": "Hard Hat - In good condition, no cracks or damage?", "type": "select", "required": true, "options": ["Pass", "Fail - Needs Replacement", "N/A"]},
    {"id": "safety_glasses", "question": "Safety Glasses - Clean, no scratches, proper fit?", "type": "select", "required": true, "options": ["Pass", "Fail - Needs Replacement", "N/A"]},
    {"id": "hi_vis_vest", "question": "Hi-Vis Vest - Visible, clean, reflective strips intact?", "type": "select", "required": true, "options": ["Pass", "Fail - Needs Replacement", "N/A"]},
    {"id": "safety_boots", "question": "Safety Boots - Steel toe, good condition, proper fit?", "type": "select", "required": true, "options": ["Pass", "Fail - Needs Replacement", "N/A"]},
    {"id": "gloves", "question": "Work Gloves - Appropriate type, no holes or tears?", "type": "select", "required": true, "options": ["Pass", "Fail - Needs Replacement", "N/A"]},
    {"id": "hearing_protection", "question": "Hearing Protection - Available when needed?", "type": "select", "required": true, "options": ["Pass", "Fail - Needs Replacement", "N/A"]},
    {"id": "respirator", "question": "Respirator - Correct type for hazards, fit tested, cartridges current?", "type": "select", "required": true, "options": ["Pass", "Fail - Needs Replacement", "N/A"]},
    {"id": "tyvek_suit", "question": "Tyvek/Protective Suit - If required, available and proper size?", "type": "select", "required": false, "options": ["Pass", "Fail - Needs Replacement", "N/A"]},
    {"id": "fall_protection", "question": "Fall Protection Harness - Inspected, no damage, proper fit?", "type": "select", "required": false, "options": ["Pass", "Fail - Needs Replacement", "N/A"]},
    {"id": "issues_found", "question": "Issues found requiring immediate action", "type": "textarea", "required": false}
  ]'::jsonb
),
(
  'Equipment Pre-Use Inspection',
  'equipment',
  'Equipment inspection before use. Document any deficiencies.',
  '[
    {"id": "equipment_type", "question": "Equipment Type", "type": "select", "required": true, "options": ["Excavator", "Skid Steer", "Forklift", "Boom Lift", "Scissor Lift", "Generator", "Compressor", "Jackhammer", "Saw", "Other"]},
    {"id": "equipment_id", "question": "Equipment ID / Serial Number", "type": "text", "required": true},
    {"id": "visual_condition", "question": "Visual inspection - No visible damage or leaks?", "type": "checkbox", "required": true},
    {"id": "fluids_checked", "question": "Fluids checked (oil, hydraulic, coolant)?", "type": "checkbox", "required": true},
    {"id": "controls_functional", "question": "All controls functioning properly?", "type": "checkbox", "required": true},
    {"id": "safety_devices", "question": "Safety devices operational (guards, alarms, lights)?", "type": "checkbox", "required": true},
    {"id": "tires_tracks", "question": "Tires/tracks in good condition?", "type": "checkbox", "required": false},
    {"id": "attachments", "question": "Attachments secure and appropriate?", "type": "checkbox", "required": false},
    {"id": "operator_certified", "question": "Operator certification current?", "type": "checkbox", "required": true},
    {"id": "deficiencies", "question": "List any deficiencies found", "type": "textarea", "required": false},
    {"id": "fit_for_use", "question": "Equipment fit for use?", "type": "select", "required": true, "options": ["Yes - No Issues", "Yes - Minor Issues Noted", "No - Requires Repair", "No - Out of Service"]}
  ]'::jsonb
);

-- Enable RLS
ALTER TABLE safety_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checklists ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now - can restrict later)
CREATE POLICY "Allow all on safety_templates" ON safety_templates FOR ALL USING (true);
CREATE POLICY "Allow all on safety_checklists" ON safety_checklists FOR ALL USING (true);

-- Comments
COMMENT ON TABLE safety_templates IS 'Predefined safety checklist templates';
COMMENT ON TABLE safety_checklists IS 'Completed safety checklists with signatures';
COMMENT ON COLUMN safety_checklists.signature_data IS 'Base64 encoded signature from canvas';
