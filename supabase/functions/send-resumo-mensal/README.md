# send-resumo-mensal

Edge function que envia, na primeira segunda de cada mês, um resumo dos KPIs do mês anterior pros clientes ativos cujos dados foram registrados em `kpis_mensais`.

## Como funciona

1. Calcula o primeiro dia do mês anterior em `America/Sao_Paulo` (ex: hoje 02/06/2026 → `2026-05-01`).
2. Consulta `clientes` onde `status = 'projeto_ativo'`.
3. Consulta `kpis_mensais` no `mes_referencia` calculado para os clientes ativos.
4. Consulta opcional dos KPIs do mês T-2 para calcular variação percentual (setas ↑/↓ nos cards).
5. Para cada cliente elegível (ativo + com email + com KPI do mês anterior preenchido), envia email via Resend.
6. Retorna JSON com `{ mes_referencia, mes_label, total_ativos, sem_email, sem_kpi, total_elegiveis, sent, failed, errors }`.

Clientes sem KPI do mês anterior são pulados silenciosamente. O empty state correto para "não há dados ainda" vive na própria `/pasta-do-cliente`, não em email (princípio 3 da auditoria).

## KPIs no email

Quatro cards em grid 2x2 com variação opcional vs mês anterior ao referência:

- Faturamento bruto (BRL)
- Ticket médio (BRL)
- Pacientes novos (inteiro)
- Margem líquida (%)

## Variáveis de ambiente

Iguais às outras functions Resend (`send-lembretes-reuniao`, `send-cobranca-vencimento`):

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (opcional, default `Raiz Consultoria <noreply@raizconsultoriaestrategica.com.br>`)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (injetados pelo runtime)

## Configurar Cron Job (primeira segunda do mês às 9h SP)

`pg_cron` e `pg_net` já estão habilitadas (vieram de `send-lembretes-reuniao`). Cole no SQL Editor do Supabase:

```sql
SELECT cron.schedule(
  'send-resumo-mensal',
  '0 12 1-7 * 1',  -- 12:00 UTC = 9h Sao Paulo, dias 1-7 do mes, segunda-feira
  $$
  SELECT net.http_post(
    url := 'https://oaqiaxcdyfmzocsqucxv.supabase.co/functions/v1/send-resumo-mensal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

A combinação `dias 1-7` AND `dia_semana = 1 (segunda)` garante que o cron dispare exatamente uma vez por mês, na primeira segunda.

## Testar manualmente via curl

Atenção: rodar isto fora do dia/horário do cron envia email REAL pros clientes que estiverem elegíveis. Em produção, recomenda-se testar primeiro com cliente próprio (Patrick) e/ou trocar temporariamente o `email_cliente` por um endereço de teste.

```bash
curl -X POST \
  'https://oaqiaxcdyfmzocsqucxv.supabase.co/functions/v1/send-resumo-mensal' \
  -H 'Authorization: Bearer SEU_SERVICE_ROLE_KEY_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Resposta esperada (exemplo):

```json
{
  "mes_referencia": "2026-04-01",
  "mes_label": "Abril de 2026",
  "total_ativos": 2,
  "sem_email": 0,
  "sem_kpi": 1,
  "total_elegiveis": 1,
  "sent": 1,
  "failed": 0,
  "errors": []
}
```

## Filtros aplicados

- Só clientes com `status = 'projeto_ativo'`.
- Cliente sem `email_cliente` entra na contagem `sem_email` e é pulado.
- Cliente sem linha em `kpis_mensais` para o `mes_referencia` calculado entra em `sem_kpi` e é pulado.
- Sem deduplicação por banco. O cron já dispara só uma vez por mês.

## Rollback

```sql
SELECT cron.unschedule('send-resumo-mensal');
```
