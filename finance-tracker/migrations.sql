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

DROP POLICY IF EXISTS "Users update own transactions" ON transactions;
CREATE POLICY "Users update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);

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

-- 8. Buat tabel user_settings untuk menyimpan konfigurasi scheduler & pengingat per user
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  reminder_active boolean DEFAULT true,
  reminder_time text DEFAULT '21:00',
  reminder_days int[] DEFAULT '{1,2,3,4,5}',
  weekly_summary boolean DEFAULT true,
  monthly_report boolean DEFAULT true,
  last_daily_sent text DEFAULT '',
  last_weekly_sent text DEFAULT '',
  last_monthly_sent text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own settings" ON user_settings;
CREATE POLICY "Users manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role bypass settings" ON user_settings;
CREATE POLICY "Service role bypass settings" ON user_settings FOR ALL TO service_role USING (true);

-- 9. Supabase Realtime Setup
ALTER TABLE transactions REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  END IF;
END $$;

-- 10. Multi-Wallet (wallets & wallet_transfers)
CREATE TABLE IF NOT EXISTS wallets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  emoji text DEFAULT '💳',
  color text DEFAULT '#AF52DE',
  type text DEFAULT 'debit', -- 'debit' | 'credit' | 'cash' | 'ewallet'
  initial_balance numeric DEFAULT 0,
  is_archived boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own wallets" ON wallets;
CREATE POLICY "Users manage own wallets" ON wallets FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role bypass wallets" ON wallets;
CREATE POLICY "Service role bypass wallets" ON wallets FOR ALL TO service_role USING (true);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS wallet_transfers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  to_wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  note text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own transfers" ON wallet_transfers;
CREATE POLICY "Users manage own transfers" ON wallet_transfers FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role bypass transfers" ON wallet_transfers;
CREATE POLICY "Service role bypass transfers" ON wallet_transfers FOR ALL TO service_role USING (true);

-- 11. Hutang Piutang (debts)
CREATE TABLE IF NOT EXISTS debts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  direction text NOT NULL, -- 'owed_to_me' (piutang) | 'i_owe' (utang)
  person_name text NOT NULL,
  amount numeric NOT NULL,
  note text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  settled boolean DEFAULT false,
  settled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own debts" ON debts;
CREATE POLICY "Users manage own debts" ON debts FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role bypass debts" ON debts;
CREATE POLICY "Service role bypass debts" ON debts FOR ALL TO service_role USING (true);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS debt_id uuid REFERENCES debts(id) ON DELETE SET NULL;

-- 12. Recurring Transactions (recurring_transactions)
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Expense', -- 'Expense' | 'Income'
  category text NOT NULL DEFAULT 'Lainnya',
  amount numeric NOT NULL,
  wallet_id uuid REFERENCES wallets(id) ON DELETE SET NULL,
  frequency text NOT NULL DEFAULT 'monthly', -- 'daily' | 'weekly' | 'monthly' | 'yearly'
  day_of_month int DEFAULT 1,
  is_active boolean DEFAULT true,
  last_processed_date date,
  next_due_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own recurring" ON recurring_transactions;
CREATE POLICY "Users manage own recurring" ON recurring_transactions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role bypass recurring" ON recurring_transactions;
CREATE POLICY "Service role bypass recurring" ON recurring_transactions FOR ALL TO service_role USING (true);

-- 13. Savings Goals (savings_goals & goal_contributions)
CREATE TABLE IF NOT EXISTS savings_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  target_date date,
  emoji text DEFAULT '🎯',
  color text DEFAULT '#AF52DE',
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own goals" ON savings_goals;
CREATE POLICY "Users manage own goals" ON savings_goals FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role bypass goals" ON savings_goals;
CREATE POLICY "Service role bypass goals" ON savings_goals FOR ALL TO service_role USING (true);

CREATE TABLE IF NOT EXISTS goal_contributions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id uuid REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  note text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own contributions" ON goal_contributions;
CREATE POLICY "Users manage own contributions" ON goal_contributions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role bypass contributions" ON goal_contributions;
CREATE POLICY "Service role bypass contributions" ON goal_contributions FOR ALL TO service_role USING (true);

-- 14. Custom Categories (categories)
CREATE TABLE IF NOT EXISTS categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  emoji text DEFAULT '🏷️',
  color text DEFAULT '#8E8E93',
  type text DEFAULT 'Expense',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own categories" ON categories;
CREATE POLICY "Users manage own categories" ON categories FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role bypass categories" ON categories;
CREATE POLICY "Service role bypass categories" ON categories FOR ALL TO service_role USING (true);

