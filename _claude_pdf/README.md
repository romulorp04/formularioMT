# Formulário de Orçamento de Conexão MT — Cemig (Web)

Formulário web que reproduz a planilha de Orçamento de Conexão / Alteração de
Carga em Média Tensão, com a identidade visual da Cemig. Roda 100% no navegador,
sem backend.

## Como rodar

Abra o `index.html` no navegador. Para evitar bloqueios de carregamento de
arquivos locais, o ideal é servir a pasta com um servidor estático:

```bash
# opção 1 — Python
python3 -m http.server 8000
# depois abra http://localhost:8000

# opção 2 — extensão "Live Server" do VS Code (botão "Go Live")
```

## Estrutura

```
.
├── index.html              # página principal (todas as etapas)
├── css/
│   └── estilos.css         # identidade visual Cemig
├── js/
│   ├── calculo.js          # MOTOR DE CÁLCULO (validado por testes)
│   ├── dados.js            # listas (atividades, dispositivos) + caminhos das imagens
│   └── app.js              # navegação, eventos condicionais, prévia, PDF
├── assets/
│   └── ramais/             # imagens dos ramais de entrada (ramal_00..12.png)
└── tests/
    └── testes.js           # 70 testes do motor de cálculo
```

## Rodar os testes do motor de cálculo

```bash
cd tests
node testes.js
```

Os testes validam: CPF/CNPJ, somatório de transformadores, correntes de motor,
tipo de subestação automático, ramal sugerido e regras de bloqueio/alerta —
todos batendo com os números da planilha original.

## Fluxo do formulário

0. Orientações de preenchimento
1. Classificação do Atendimento
2. Dados do Proprietário + Correspondência
3. Dados da Unidade Consumidora
4. Dados Técnicos (transformadores, motores, tipo de SE automático, ramal)
5. Prévia + Exportar PDF

Botão flutuante: Anexo II — Conversão de Potências (consulta).

## Pendências / próximos passos

- [ ] Trocar o logo placeholder pelo SVG oficial da Cemig (em `index.html`, `.logo`)
- [x] Geração de PDF réplica da planilha (html2pdf, 3 páginas, offline)
- [ ] Anexo I — formulário repetível de cubículos (quando compartilhada = Sim)
- [ ] Demanda escalonada / ponta / fora-ponta (versão detalhada)
- [ ] Reativar bloco "Carga operante na partida" (hoje oculto em `#blocoCargaOperante`)

## Notas técnicas

- O motor usa `SQRT(3)` preciso nos cálculos de motor (espelha a tela da planilha)
  e mantém `1,732` literal reservado para fórmulas da aba CALCULOS.
- O índice do ramal (0–12) é interno; o usuário escolhe pela imagem (galeria visual).
- Constantes fixas: FP ref = 0,92 · Z% = 5 · I pico = I nom × 1,05.
