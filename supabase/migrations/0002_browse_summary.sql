create or replace function browse_summary(
  p_date_mode text default 'invoice',
  p_from date default null,
  p_to date default null,
  p_vendor text default null,
  p_invoice_number text default null,
  p_needs_review boolean default null
)
returns table (
  currency text,
  invoice_count bigint,
  total numeric
)
language sql
security invoker
stable
as $$
  select
    i.currency,
    count(*)::bigint as invoice_count,
    coalesce(sum(i.total_amount), 0)::numeric as total
  from invoices i
  where
    (
      p_from is null
      or (
        case
          when p_date_mode = 'upload' then i.created_at >= p_from::timestamp
          else i.invoice_date >= p_from
        end
      )
    )
    and (
      p_to is null
      or (
        case
          when p_date_mode = 'upload' then i.created_at < (p_to + 1)::timestamp
          else i.invoice_date <= p_to
        end
      )
    )
    and (p_vendor is null or i.vendor ilike '%' || p_vendor || '%')
    and (p_invoice_number is null or i.invoice_number ilike '%' || p_invoice_number || '%')
    and (p_needs_review is null or i.needs_review = p_needs_review)
  group by i.currency;
$$;

grant execute on function browse_summary to authenticated;
