-- 1. Buat tabel profiles untuk mapping telegram_id ke user_id
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id bigint UNIQUE,
  display_name text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Buat tabel telegram_link_codes untuk menyimpan kode OTP linking
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  telegram_id bigint NOT NULL,
  telegram_name text,
  created_at timestamp with time zone DEFAULT now(),
  used boolean DEFAULT false
);

-- 3. Tambahkan kolom user_id ke tabel transactions & budgets
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 4. Sesuaikan constraint unik untuk tabel budgets (agar unik per user + kategori)
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_key;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_category_unique;
ALTER TABLE budgets ADD CONSTRAINT budgets_user_category_unique UNIQUE (user_id, category);

-- 5. Aktifkan Row Level Security (RLS) di Supabase
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 6. Buat Policy untuk RLS (Row Level Security)
-- Kebijakan untuk PROFILES
DROP POLICY IF EXISTS "Users see own profile" ON profiles;
CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role bypass profiles" ON profiles;
CREATE POLICY "Service role bypass profiles" ON profiles FOR ALL TO service_role USING (true);

-- Kebijakan untuk TELEGRAM_LINK_CODES
DROP POLICY IF EXISTS "Auth users can read codes" ON telegram_link_codes;
CREATE POLICY "Auth users can read codes" ON telegram_link_codes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth users can update codes" ON telegram_link_codes;
CREATE POLICY "Auth users can update codes" ON telegram_link_codes FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role bypass link codes" ON telegram_link_codes;
CREATE POLICY "Service role bypass link codes" ON telegram_link_codes FOR ALL TO service_role USING (true);

-- Kebijakan untuk TRANSACTIONS
DROP POLICY IF EXISTS "Users see own transactions" ON transactions;
CREATE POLICY "Users see own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own transactions" ON transactions;
CREATE POLICY "Users insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own transactions" ON transactions;
CREATE POLICY "Users delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role bypass transactions" ON transactions;
CREATE POLICY "Service role bypass transactions" ON transactions FOR ALL TO service_role USING (true);

-- Kebijakan untuk BUDGETS
DROP POLICY IF EXISTS "Users see own budgets" ON budgets;
CREATE POLICY "Users see own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own budgets" ON budgets;
CREATE POLICY "Users manage own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role bypass budgets" ON budgets;
CREATE POLICY "Service role bypass budgets" ON budgets FOR ALL TO service_role USING (true);

-- 7. Trigger otomatis untuk membuat profile saat user sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

