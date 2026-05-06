# Frontend - Barbearia Monarca

Aplicacao Next.js do sistema Barbearia Monarca.

## Principais Telas

- Login e troca de senha inicial.
- Dashboard.
- Agenda e novo agendamento.
- Clientes.
- Funcionarios e comissoes.
- Servicos e categorias.
- Estoque.
- Caixa.
- Relatorios.
- Logs de auditoria.

## Desenvolvimento

```bash
npm install
npm run dev
```

A aplicacao roda em:

```text
http://localhost:3000
```

Em desenvolvimento, chamadas para `/api/*` sao encaminhadas para o backend em `http://localhost:3001`.

## Scripts

```bash
npm run dev
npm run build
npm run type-check
```

## Ambiente

Use `frontend/.env.example` como base:

```env
NEXT_PUBLIC_API_URL=
```

Deixe vazio no desenvolvimento local para usar o proxy do Next. Em producao, configure a URL publica do backend.
