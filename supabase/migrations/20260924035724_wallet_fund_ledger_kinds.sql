-- Commit enum additions before functions use the new values.
alter type public.ledger_kind add value if not exists 'fund_contribution';
alter type public.ledger_kind add value if not exists 'fund_refund';
