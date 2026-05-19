# send-cobranca-vencimento

Edge function que envia email de lembrete de vencimento da mensalidade pros clientes ativos cujo `dia_vencimento` é o dia atual.

## Como funciona

1. Pega o dia do mês atual (1-31) no timezone `America/Sao_Paulo`.
2. Consulta `clientes` onde `dia_vencimento = dia` e `status = 'projeto_ativo'`.
3. Para cada cliente com `email_cliente` preenchido, envia email via Resend API.
4. Retorna JSON com `{ dia, data, total_clientes, sem_email, sent, failed, errors }`.

## Variáveis de ambiente

Mesmas da `send-lembretes-reuniao`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (opcional), `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (injetados pelo runtime).

## Configurar Cron Job (rodar diariamente às 8h)

Se você já configurou `app.settings.service_role_key` como GUC do banco no setup de `send-lembretes-reuniao`, pula direto pro `SELECT cron.schedule(...)`. Caso contrário, configure primeiro.

```sql
-- pg_cron e pg_net devem estar habilitadas (já foram pra send-lembretes)
SELECT cron.schedule(
  'send-cobranca-vencimento-diario',
  '0 11 * * *',  -- 11:00 UTC todos os dias = 8h Sao Paulo
  $$
  SELECT net.http_post(
    url := 'https://oaqiaxcdyfmzocsqucxv.supabase.co/functions/v1/send-cobranca-vencimento',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Testar manualmente via curl

```bash
curl -X POST \
  'https://oaqiaxcdyfmzocsqucxv.supabase.co/functions/v1/send-cobranca-vencimento' \
  -H 'Authorization: Bearer SEU_SERVICE_ROLE_KEY_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Resposta esperada:

```json
{
  "dia": 18,
  "data": "18/05/2026",
  "total_clientes": 2,
  "sem_email": 0,
  "sent": 2,
  "failed": 0,
  "errors": []
}
```

## Filtros aplicados

- Só clientes com `status = 'projeto_ativo'` recebem email. Leads, propostas e clientes encerrados são ignorados.
- Cliente sem `email_cliente` cadastrado entra na contagem mas não recebe (campo `sem_email` no retorno).
- Cliente sem `valor_mensalidade` recebe email mesmo assim (sem bloco de valor no template).

## Rollback

```sql
SELECT cron.unschedule('send-cobranca-vencimento-diario');
```
