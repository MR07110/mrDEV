import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "window.__ENV__?.SUPABASE_URL || """;
const supabaseKey = "window.__ENV__?.SUPABASE_KEY || """;

export const supabase = createClient(supabaseUrl, supabaseKey);
export const BUCKET = "videos";
