-- Partner TPL Etapa 4: conciliación segura de pagos Flow y activación de planes
begin;

create table if not exists public.partner_pagos (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.partner_postulaciones(id) on delete restrict,
  contratista_id uuid references public.contratistas(id) on delete set null,
  commerce_order text not null unique,
  flow_order bigint unique,
  flow_token text,
  plan_codigo text not null check (plan_codigo in ('ideal','empresa','premium')),
  monto integer not null check (monto > 0),
  moneda text not null default 'CLP' check (moneda='CLP'),
  correo text not null,
  estado text not null default 'creado' check (estado in ('creado','pendiente','pagado','rechazado','anulado','error')),
  estado_flow integer,
  medio_pago text,
  respuesta_flow jsonb not null default '{}'::jsonb,
  pagado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists partner_pagos_postulacion_idx on public.partner_pagos(postulacion_id, creado_en desc);
create index if not exists partner_pagos_estado_idx on public.partner_pagos(estado, creado_en desc);

alter table public.partner_pagos enable row level security;
revoke all on public.partner_pagos from anon, authenticated;

alter table public.partner_postulaciones
  add column if not exists pago_estado text not null default 'sin_pago',
  add column if not exists pago_confirmado_en timestamptz;

create or replace function public.tpl_partner_confirmar_pago_flow(
  p_commerce_order text,
  p_flow_order bigint,
  p_flow_token text,
  p_estado_flow integer,
  p_respuesta jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_pago public.partner_pagos%rowtype;
  v_estado text;
  v_contratista uuid;
begin
  -- Esta RPC debe invocarse únicamente con service_role desde el callback del servidor.
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'NO_AUTORIZADO' using errcode='42501';
  end if;

  select * into v_pago
  from public.partner_pagos
  where commerce_order=p_commerce_order
  for update;
  if not found then raise exception 'PAGO_NO_ENCONTRADO'; end if;

  v_estado:=case p_estado_flow
    when 2 then 'pagado'
    when 3 then 'rechazado'
    when 4 then 'anulado'
    else 'pendiente'
  end;

  update public.partner_pagos
  set flow_order=coalesce(p_flow_order,flow_order),
      flow_token=coalesce(nullif(p_flow_token,''),flow_token),
      estado_flow=p_estado_flow,
      estado=v_estado,
      medio_pago=coalesce(p_respuesta#>>'{paymentData,media}',medio_pago),
      respuesta_flow=coalesce(p_respuesta,'{}'::jsonb),
      pagado_en=case when v_estado='pagado' then coalesce(pagado_en,now()) else pagado_en end,
      actualizado_en=now()
  where id=v_pago.id;

  if v_estado='pagado' then
    update public.partner_postulaciones
    set pago_estado='pagado', pago_confirmado_en=coalesce(pago_confirmado_en,now()), actualizado_en=now()
    where id=v_pago.postulacion_id;

    select contratista_id into v_contratista
    from public.partner_postulaciones where id=v_pago.postulacion_id;

    if v_contratista is not null then
      update public.contratistas
      set plan_solicitado=v_pago.plan_codigo,
          plan_activo=v_pago.plan_codigo,
          plan_estado='activo',
          actualizado_en=now()
      where id=v_contratista;
      update public.partner_pagos set contratista_id=v_contratista where id=v_pago.id;
    end if;
  elsif v_estado in ('rechazado','anulado') then
    update public.partner_postulaciones
    set pago_estado=v_estado, actualizado_en=now()
    where id=v_pago.postulacion_id and pago_estado<>'pagado';
  end if;

  return jsonb_build_object('ok',true,'estado',v_estado,'postulacionId',v_pago.postulacion_id,'plan',v_pago.plan_codigo);
end;
$$;
revoke all on function public.tpl_partner_confirmar_pago_flow(text,bigint,text,integer,jsonb) from public;
grant execute on function public.tpl_partner_confirmar_pago_flow(text,bigint,text,integer,jsonb) to service_role;

commit;
