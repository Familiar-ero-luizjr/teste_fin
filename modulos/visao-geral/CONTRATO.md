# Visão geral

**ID de área:** `overview`

## Arquitetura independente

- **Estrutura:** `index.html` contém DOM, tabela, filtros, cartões e modal.
- **Design:** tokens e CSS originais incorporados em `<style>`.
- **Funcionalidades:** funções, eventos, estados e validações originais incorporados em `<script>`.
- **Dados:** somente `../../mock/mock.js`; nenhuma chamada a Supabase ou API externa.

## Comportamentos

Saldo operacional, indicadores, filtros cumulativos, ordenação, ações da tabela e CSV.

## Regra de manutenção

Edite este HTML para modificar somente este módulo. Ele não importa CSS, lógica nem HTML de outro módulo. O mock é a única interface compartilhada.
