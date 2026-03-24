# pgBouncer (infra)

Status atual: temporariamente desativado.

Motivo:

- Imagens utilizadas anteriormente (`bitnami/pgbouncer`, `edoburu/pgbouncer`) ficaram indisponiveis/inconsistentes no Docker Hub.

Comportamento atual:

- O backend conecta diretamente no PostgreSQL (`5432`) via `DATABASE_URL`.

## Como reativar

1. Escolher e validar uma imagem estavel de pgBouncer.
2. Definir `PGBOUNCER_*` e credenciais no ambiente.
3. Publicar porta do pool (ex.: `6432`) apenas na rede interna.
4. Apontar `DATABASE_URL` do backend para o endpoint do pool.
5. Executar teste de carga simples para validar concorrencia e latencia.

## Checklist de validacao

- Conexao do backend estabelecida sem erro de autenticacao.
- Queries transacionais funcionando (pagamentos/transferencias).
- Sem regressao nas rotas de saude e no tempo de resposta.
