# send-lembretes-reuniao

Edge function que envia email de lembrete pros clientes com reunião marcada para o próximo dia.

## Como funciona

1. Calcula a data de "amanhã" no timezone `America/Sao_Paulo`.
2. Consulta `reunioes` JOIN `clientes` onde `data = amanhã` e `status = 'agendada'`.
3. Para cada reunião com cliente que tem `email_cliente` cadastrado, envia email via Resend API.
4. Retorna JSON com `{ amanha, total_reunioes, sem_email, sent, failed, errors }`.

## Variáveis de ambiente necessárias

Configurar em **Project Settings → Edge Functions → Secrets** no Supabase Dashboard:

| Nome | Descrição | Exemplo |
|---|---|---|
| `RESEND_API_KEY` | API key da Resend (formato `re_...`) | já configurado |
| `RESEND_FROM_EMAIL` | (opcional) From address. Default: `Raiz Consultoria <noreply@raizconsultoriaestrategica.com.br>` | `Raiz Consultoria <noreply@raizconsultoriaestrategica.com.br>` |
| `SUPABASE_URL` | URL do projeto Supabase | já injetado automaticamente |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | já injetado automaticamente |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são populados automaticamente pelo Supabase Edge Functions runtime, não precisam ser configurados manualmente.

## Configurar Cron Job (rodar diariamente às 9h)

### Opção A: pg_cron (recomendado, fica versionado no Supabase)

No SQL Editor do Supabase, rodar **uma única vez**:

```sql
-- 1. Habilitar extensões necessárias (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Agendar chamada diária às 9h de São Paulo = 12h UTC
SELECT cron.schedule(
  'send-lembretes-reuniao-diario',
  '0 12 * * *',  -- 12:00 UTC todos os dias
  $$
  SELECT net.http_post(
    url := 'https://oaqiaxcdyfmzocsqucxv.supabase.co/functions/v1/send-lembretes-reuniao',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Antes de rodar**, definir o service role key como GUC do banco (uma vez só):

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'SEU_SERVICE_ROLE_KEY_AQUI';
```

Pega o `service_role_key` em **Project Settings → API → service_role** (formato `eyJh...`).

### Opção B: testar manualmente sem cron

Pra rodar agora mesmo via curl (qualquer terminal):

```bash
curl -X POST \
  'https://oaqiaxcdyfmzocsqucxv.supabase.co/functions/v1/send-lembretes-reuniao' \
  -H 'Authorization: Bearer SEU_SERVICE_ROLE_KEY_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Resposta esperada:

```json
{
  "amanha": "2026-05-19",
  "total_reunioes": 1,
  "sem_email": 0,
  "sent": 1,
  "failed": 0,
  "errors": []
}
```

## Como debugar

- **Edge Functions → send-lembretes-reuniao → Logs** no painel do Supabase mostra os `console.log` da execução
- A function loga: total encontrado, elegíveis com email, cada envio com `resend_id`, e cada falha com motivo
- Se cron não dispara, verificar `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

## Rollback

```sql
SELECT cron.unschedule('send-lembretes-reuniao-diario');
```
