-- Conference ticket orders (early bird + regular) for cPay integration

CREATE TABLE IF NOT EXISTS public.ticket_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  details2 text NOT NULL UNIQUE,
  language text NOT NULL DEFAULT 'mk' CHECK (language IN ('mk', 'en')),
  ticket_type text NOT NULL CHECK (ticket_type IN ('early_bird', 'regular')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 20),
  unit_amount_mkd integer NOT NULL CHECK (unit_amount_mkd > 0),
  total_amount_mkd integer NOT NULL CHECK (total_amount_mkd > 0),
  total_amount_cpay integer NOT NULL CHECK (total_amount_cpay > 0),
  currency text NOT NULL DEFAULT 'MKD',
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  telephone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  zip text NOT NULL,
  country_code text NOT NULL DEFAULT '807',
  company text,
  payment_method text NOT NULL DEFAULT 'card' CHECK (payment_method IN ('card', 'bank_transfer')),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  payment_id text,
  cpay_ref_id text,
  cpay_status text,
  event_name text NOT NULL,
  event_date date NOT NULL,
  details1 text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT ticket_orders_details2_len CHECK (char_length(details2) <= 10)
);

CREATE INDEX IF NOT EXISTS idx_ticket_orders_status ON public.ticket_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_email ON public.ticket_orders(email);

DROP TRIGGER IF EXISTS ticket_orders_set_updated_at ON public.ticket_orders;
CREATE TRIGGER ticket_orders_set_updated_at
  BEFORE UPDATE ON public.ticket_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;

-- No public direct access; API uses service role
CREATE POLICY "ticket_orders_service_only" ON public.ticket_orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
