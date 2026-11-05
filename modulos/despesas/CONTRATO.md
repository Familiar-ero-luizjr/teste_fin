# Despesas — V3 atualizada

**ID de área:** `expenses`

## Contrato preservado

- Interface, regras e estilos em `modulos/despesas/index.html`.
- Única fonte de dados compartilhada: `../../mock/mock.js` (`EnjoyStore`), sem API externa.
- Os demais módulos não foram alterados; categorias financeiras e lançamentos existentes mantêm os campos de compatibilidade originais (`entries`, `days`, `amount`, `accountId`, `method`).
- O detalhamento avançado fica em `entry.enjoyExpense`; regras de recorrência e taxonomia ficam em `environment.enjoyExpenseModule`.
- Entradas financeiras existentes sem comprovante de pagamento permanecem sem pagamentos registrados; conta informada anteriormente não comprova quitação.

## Regras funcionais

1. Despesa com vários itens e soma automática; vários pagamentos independentes.
2. Categoria e subcategoria opcional, criadas sob demanda; sem seleção de ambiente no formulário.
3. Pagamento opcional/progressivo, datas e filtros de período preservados.
4. Frequências diária, semanal (vários dias) e mensal, com ocorrências independentes e geração progressiva para séries abertas.
5. Edição/cancelamento de série com escolha: esta, futuras ou toda a série; registros pagos protegidos nas edições em lote.
6. Exclusão de ocorrências com pagamentos bloqueada; cancelamento preserva histórico.
7. Nenhum anexo nesta etapa; listagem tradicional, modal de detalhes, status derivado dos pagamentos.

## Limites e riscos

- Laboratório offline; não há migrações Supabase nem integração com aplicação de produção.
- Módulos legados resumem despesas pelo campo `amount`, não por lançamentos de pagamentos. Relatórios contábeis e tratamento de cancelamentos/estornos entre módulos requerem contrato financeiro próprio antes da produção.
- Atualização de UI do módulo Despesas somente; nenhum outro módulo foi editado.
