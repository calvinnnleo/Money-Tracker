import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function main() {
  console.log("--- PROFILES ---");
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
  if (pErr) console.error(pErr);
  else console.log(profiles);

  console.log("--- TRANSACTIONS ---");
  const { data: txs, error: tErr } = await supabase.from("transactions").select("*");
  if (tErr) console.error(tErr);
  else console.log(txs);

  console.log("--- LINK CODES ---");
  const { data: codes, error: cErr } = await supabase.from("telegram_link_codes").select("*");
  if (cErr) console.error(cErr);
  else console.log(codes);
}

main();
