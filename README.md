# Barbearia Monarca

Sistema web para gestao de barbearia com agenda, clientes, servicos, estoque, caixa, comissoes, relatorios e auditoria.

## Funcionalidades

- Autenticacao de usuarios com JWT em cookie HttpOnly.
- Dashboard operacional com indicadores de agenda, faturamento, caixa, estoque e desempenho.
- Agenda com criacao, edicao, cancelamento e conclusao de atendimentos.
- Cadastro de clientes, funcionarios, servicos e categorias.
- Controle de caixa com abertura, entradas, saidas, fechamento e relatorios.
- Controle de estoque com movimentacao de produtos e alerta de reposicao.
- Calculo e visualizacao de comissoes por funcionario.
- Relatorios por periodo com exportacao/processamento no frontend.
- Logs de auditoria para acoes sensiveis.
- Integracao WhatsApp/Twilio opcional para automacoes.

## Estrutura

```text
backend/
  api/                 Entrada serverless para Vercel
  scripts/             Scripts operacionais e massa de dados
  src/
    config/            Ambiente e MongoDB
    controllers/       Controladores de dominio
    lib/               Conexao MongoDB usada pela API
    middleware/        Auth, validacao, rate limit, paginacao
    models/            Modelos Mongoose
    routes/            Rotas Express em /api/*
    services/          Regras de negocio
    utils/             Formatadores, logs e validadores
    server.js          Aplicacao Express

frontend/
  public/              Imagens e favicon
  src/
    app/               Rotas do Next.js App Router
    components/        Componentes reutilizaveis
    services/          Cliente HTTP da API
    styles/            Estilos globais
    utils/             Formatadores e calendario
```

## Requisitos

- Node.js 18 ou superior.
- MongoDB local ou MongoDB Atlas.
- npm.

## Configuracao

Crie os arquivos de ambiente a partir dos exemplos:

```bash
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local
```

Variaveis principais do backend:

```env
MONGODB_URI=mongodb://localhost:27017/barbearia
JWT_SECRET=troque-este-valor
JWT_EXPIRES_IN=8h
PORT=3001
NODE_ENV=development
```

Variaveis principais do frontend:

```env
NEXT_PUBLIC_API_URL=
```

Em desenvolvimento local, o frontend usa `localhost:3000` e encaminha `/api/*` para o backend em `localhost:3001`.

## Rodando Localmente

Instale dependencias:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Suba o backend:

```bash
cd backend
npm run dev
```

Suba o frontend em outro terminal:

```bash
cd frontend
npm run dev
```

Acesse:

```text
http://localhost:3000
```

Health check local:

```text
http://localhost:3000/health
```

## Scripts Uteis

Backend:

```bash
npm run dev
npm start
npm test
npm run lint
```

Frontend:

```bash
npm run dev
npm run build
npm run type-check
```

## Deploy

- Frontend: Vercel usando `frontend/vercel.json`.
- Backend: Vercel usando `backend/vercel.json` ou Railway usando `backend/railway.json`.
- Em producao, configure `FRONTEND_URL`, `MONGODB_URI`, `JWT_SECRET` e as variaveis opcionais de email/Twilio no provedor.

## Observacoes de Seguranca

- Nao commite `.env`, `.env.local` ou credenciais reais.
- Use `JWT_SECRET` forte em cada ambiente.
- Cookies HttpOnly dependem de HTTPS em producao.
- Twilio e email sao opcionais; sem credenciais, esses servicos ficam inativos.
