-- Update restaurant onboarding plan prices (Nigerian naira).
update public.pricing_config
set value = case key
  when 'onboarding_plan_1_month' then 4999
  when 'onboarding_plan_3_months' then 10999
end,
updated_at = now()
where key in ('onboarding_plan_1_month', 'onboarding_plan_3_months');
