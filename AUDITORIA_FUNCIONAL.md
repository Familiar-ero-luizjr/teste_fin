# Auditoria funcional — Financeiro V2 × Laboratório

Referência: ZIP `enjoy-gestao-v2-main` fornecido pelo usuário, especificamente `modules/financeiro/painel/shared/index.js`, `styles/modules/financeiro/painel.css` e `styles/core/variables.css`.

## Matriz de paridade

| Funcionalidade | No laboratório | Verificação |
|---|---|---|
| Menu lateral e abertura na Visão geral | Sim | Implementação local de navegação |
| Visão geral com saldo, ganhos, despesas e investimentos | Sim | Mesmas funções `totals` e `tableMarkup` |
| Abas Recebimentos de reservas e Vendas | Sim | Mesmo evento `gain-tab` |
| Filtro Conta | Sim | Mesma função `matches` |
| Filtro Ambiente dependente da conta | Sim | Mesmo `filtersMarkup` |
| Busca textual cumulativa e sem acentos | Sim | Mesmo `normalize` / `matches` |
| Período: todas as datas, mês atual, personalizado | Sim | Mesmo filtro e campos De/Até |
| Filtro Frequência em Despesas | Sim | Mesmo filtro diário/semanal/mensal |
| Limpar filtros | Sim | Mesmo evento `reset` |
| Ordenação crescente/decrescente por data | Sim | Mesmo evento `sort` |
| Totais filtrados e exportação CSV | Sim | Mesmas rotinas |
| Adicionar despesa / registrar investimento / registrar venda | Sim | Mesmo construtor de modal `buildDialog` |
| Editar lançamento individual | Sim | Mesmo evento `edit` e atualização de registro |
| Classificação, ambiente, categoria, conta e pagamento | Sim | Mesmo formulário e regras |
| Despesa diária, semanal e mensal | Sim | Mesma geração `recurrenceDates` |
| Vigência por tempo indeterminado ou até data | Sim | Mesmos campos condicionais |
| Validação de data, valor, descrição e categoria | Sim | Mesma rotina de validação |
| Cancelar, fechar clicando fora e salvar modal | Sim | Mesmo comportamento de `dialog` |
| Exibir reserva vinculada | Adaptado | Modal com prévia mock; original navega a Hospedagem |
| Persistência dos cadastros | Adaptado | `localStorage`, sem Supabase |
| Sincronização remota e permissões reais | Não aplicável | Substituídas por mocks, intencionalmente |

## Evidências e limites

- O arquivo de lógica original apresenta somente uma alteração no laboratório: `roots.clear()` ao montar outra área, para evitar re-renderizações simultâneas na mesma região.
- Os dois arquivos CSS financeiros utilizados são idênticos aos do ZIP de referência, verificados byte a byte.
- Teste automatizado de contrato em `tests/audit.mjs`: contagem por área, totalização, filtros cumulativos, cadastro compartilhado e persistência mock.
- A sintaxe de todos os scripts foi validada por `node --check`.
- O navegador gráfico do ambiente não iniciou; portanto **os fluxos visuais e cliques dos modais ainda precisam de validação manual no Chrome/Edge**, antes de afirmar equivalência completa de execução.

## Cenário de homologação manual

1. Abra `index.html` e confirme que a Visão geral está ativa.
2. Navegue para Despesas, faça busca por `Carlos`, selecione Picpay e um intervalo de outubro de 2026; use Limpar filtros.
3. Clique Adicionar despesa, teste frequência semanal, vigência até uma data e Salvar. Verifique as ocorrências na tabela.
4. Clique Editar numa ocorrência, altere o valor, salve e confira o total.
5. Vá à Visão geral e confira a propagação do lançamento.
6. Abra Ganhos, alterne Recebimentos de reservas e Vendas, registre uma venda.
7. Clique Abrir reserva em um recebimento para ver o modal mock.
8. Registre um investimento e confira que ele não reduz o saldo operacional.
9. Exporte CSV e confira as colunas, valores e caracteres acentuados.
