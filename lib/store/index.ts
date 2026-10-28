import "server-only";
import { temSupabase } from "../supabase/server";
import { memoryStore } from "./memory";
import { supabaseStore } from "./supabase";

export const store = temSupabase ? supabaseStore : memoryStore;
