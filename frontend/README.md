# HomeHost Manual — frontend

React 19 + Vite. Em desenvolvimento: `npm run dev` → [http://localhost:5173](http://localhost:5173).

## Dados e API

- **`VITE_FUNCTION_URL`**: única env var. Easy Auth (`/.auth/login/aad`), sessão com cookies, `GET /api/me`, REST de **propriedades** e **manuals** + endpoints públicos (`src/services/api.js`).
- Upload de imagens: `src/services/uploads.js` pede SAS a `POST /api/uploads/sas` e faz `PUT` direto ao Blob. Componente `<ImageUpload>` em `src/components/ImageUpload.jsx`.
- Não há acesso direto a Cosmos nem Blob (para leitura/escrita com chave) a partir do frontend — as chaves ficam nas app settings do Function App.

Variáveis `VITE_*` vêm de `frontend/.env` em local; no CI são geradas no workflow antes do `vite build`.

---

Documentação do template Vite original abaixo.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc/README.md) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
