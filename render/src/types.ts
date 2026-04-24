// Shape of the Phase 1 script JSON produced by the extractor agent and
// consumed by the render harness.

export type AgeBand = 'age_7_9' | 'age_10_12' | 'age_13_14';

export type VideoSpec = {
  production_spec: {
    avatar: string;
    tone: string;
    caption_style: string;
    duration_sec_target: [number, number];
  };
  caption_lines: string[];
  estimated_duration_sec: number;
};

export type VoiceSpec = {
  production_spec: {
    voice: string;
    duration_sec_target: [number, number];
  };
  full_script: string;
};

export type CardSpec = {
  title: string;
  key_message: string;
  fill_in_prompts: string[];
  remember_line: string;
};

export type SessionScript = {
  session_key: string;        // e.g. "week-03-age_10_12"
  week_number: number;
  age_band: AgeBand;
  title: string;
  core_skill: string;
  video: VideoSpec;
  voice: VoiceSpec;
  card: CardSpec;
  needs_variant: boolean;     // true if this row is a copy of the canonical
                              // script awaiting per-age rewrites
};

export type ScriptBundle = {
  version: number;
  extracted_at: string;
  source_pdf: string;
  sessions: SessionScript[];
};

export type RenderPlan = {
  session_key: string;
  week_number: number;
  age_band: AgeBand;
  title: string;
  video_estimated_cost_gbp: number;   // ~£12 avg per Avatar IV render
  voice_estimated_cost_gbp: number;   // ~£0.60 per 60-sec ElevenLabs track
  video_path: string;                 // target storage key: phase1/week-03-age_10_12.mp4
  voice_path: string;
  needs_variant: boolean;
  qa_flags: string[];                 // pre-flight QA issues we caught in scripts
};

export type RenderReport = {
  plan: RenderPlan[];
  totals: {
    sessions: number;
    variants_needed: number;
    video_gbp: number;
    voice_gbp: number;
    total_gbp: number;
  };
  mode: 'plan' | 'dry' | 'live';
  generated_at: string;
};
