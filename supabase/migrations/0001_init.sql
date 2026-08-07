create table invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  vendor text,
  abn text,
  vendor_email text,
  vendor_phone text,
  invoice_number text,
  invoice_date date,
  due_date date,
  subtotal numeric,
  gst numeric,
  total_amount numeric,
  currency text,
  source_filename text,
  needs_review boolean default false,
  created_at timestamp default now()
);

create table invoice_line_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references invoices not null,
  user_id uuid references auth.users not null,
  product_code text,
  product_name text,
  service_date date,
  quantity numeric,
  list_price numeric,
  discount_pct numeric,
  net_total numeric,
  created_at timestamp default now()
);

create index invoices_user_id_idx on invoices (user_id);
create index invoices_invoice_date_idx on invoices (invoice_date);
create index invoices_created_at_idx on invoices (created_at);
create index invoice_line_items_invoice_id_idx on invoice_line_items (invoice_id);
create index invoice_line_items_user_id_idx on invoice_line_items (user_id);

alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

create policy "own invoices" on invoices
  for all using (auth.uid() = user_id);
create policy "own line items" on invoice_line_items
  for all using (auth.uid() = user_id);
