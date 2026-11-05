# Enjoy Gestão V2 — Laboratório Financeiro

Abra `index.html` no Chrome ou Edge, mesmo sem internet. O menu abre na **Visão geral** e alterna entre Visão geral, Ganhos, Despesas e Investimentos sem sair da janela.

## Fidelidade ao código original

- `scripts/financeiro-original.js` é uma cópia do componente financeiro de `modules/financeiro/painel/shared/index.js` do código-fonte fornecido, com uma adaptação mínima para montar uma tela por vez.
- `styles/financeiro.css` e `styles/variables.css` são cópias dos estilos originais.
- `styles/shell.css` reproduz o menu e o cabeçalho conforme as capturas, isolados do restante do aplicativo.
- `scripts/mock.js` substitui o acesso às contas, reservas, permissões e persistência remota por dados de demonstração e `localStorage`.

## Funcionamento

- Filtros cumulativos por conta, ambiente, texto, período, intervalo e frequência (em Despesas).
- Ordenação por data, totais, exportação CSV, abas de Ganhos e Vendas.
- Cadastro, edição e recorrência de despesas, criação de categoria e modais com validação baseados no componente original.
- Investimentos têm registro próprio e não são abatidos do saldo operacional.
- Alterações são salvas **somente neste navegador**, em dados mockados. Nada é enviado ao Supabase.

Para restaurar o mock inicial, abra o console do navegador (F12) e execute `EnjoyLab.reset()`.

## Limites intencionais

As reservas do mock não abrem o módulo de Hospedagem, pois o laboratório é restrito ao Financeiro. Os lançamentos iniciais são fictícios e não reproduzem fielmente os valores reais do banco. O botão de sincronização é apenas um indicador do ambiente local.
