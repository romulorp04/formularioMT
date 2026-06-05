/* testes.js — valida calculo.js contra o gabarito extraído da planilha Cemig */
const C = require('../js/calculo.js');

let pass = 0, fail = 0;
function aprox(a, b, tol = 0.01) { return a != null && b != null && Math.abs(a - b) <= tol; }
function check(nome, got, exp, tol) {
  const ok = (typeof exp === 'number') ? aprox(got, exp, tol) : (got === exp);
  console.log(`${ok ? '  OK ' : ' FALHA'} | ${nome}` + (ok ? '' : `  → obtido=${got} esperado=${exp}`));
  ok ? pass++ : fail++;
}

console.log('\n===== BLOCO 1 — CPF / CNPJ =====');
// CPFs válidos conhecidos
check('CPF válido 111.444.777-35', C.validarCPF('11144477735'), true);
check('CPF inválido 111.444.777-00', C.validarCPF('11144477700'), false);
check('CPF todos iguais 111.111.111-11', C.validarCPF('11111111111'), false);
check('CPF curto', C.validarCPF('123'), false);
// CNPJs
check('CNPJ válido 11.222.333/0001-81', C.validarCNPJ('11222333000181'), true);
check('CNPJ inválido 11.222.333/0001-00', C.validarCNPJ('11222333000100'), false);
check('CNPJ todos iguais', C.validarCNPJ('11111111111111'), false);
// detecção automática
check('auto detecta CPF', C.validarCpfCnpj('111.444.777-35').tipo, 'CPF');
check('auto detecta CNPJ', C.validarCpfCnpj('11.222.333/0001-81').tipo, 'CNPJ');

console.log('\n===== BLOCO 2 — Transformadores =====');
// Estado vazio (planilha em branco): H101=0, M101=0
let t0 = C.calcularTrafos([]);
check('vazio → potência total 0', t0.potenciaTotal, 0);
check('vazio → quantidade 0', t0.quantidadeTotal, 0);
// Exemplo: 2× 300 kVA + 1× 500 kVA
let t1 = C.calcularTrafos([
  { potencia: 300, quantidade: 2, relacaoImagInom: 8 },
  { potencia: 500, quantidade: 1, relacaoImagInom: 8 },
]);
check('2×300 + 1×500 → potência total 1100 kVA', t1.potenciaTotal, 1100);
check('2×300 + 1×500 → quantidade 3', t1.quantidadeTotal, 3);
// Linha com qtde mas sem potência não conta na quantidade (SUMIF)
let t2 = C.calcularTrafos([
  { potencia: 0, quantidade: 5 },
  { potencia: 112.5, quantidade: 1 },
]);
check('potência 0 ignorada na qtde → 1', t2.quantidadeTotal, 1);
check('potência total = 112,5', t2.potenciaTotal, 112.5);

console.log('\n===== BLOCO 3 — Motores (gabarito da planilha, linhas 105–108) =====');
// Gabarito extraído: 150CV / FP0,88 / Rend0,92 / 380V / Ip/In=6
const tensaoMT = 13.8; // exemplo de nível MT preenchido
const m150 = C.calcularMotor({ potenciaCV:150, fp:0.88, rendimento:0.92, tensaoV:380, relacaoIpIn:6 }, tensaoMT);
check('150CV → Pot kVA ≈ 136,36', m150.potkVA, 136.3636, 0.01);
check('150CV → Pot kW = 120',     m150.potkW, 120, 0.01);
check('150CV → I nominal ≈ 225,20', m150.iNominal, 225.1990, 0.01);
check('150CV → I partida ≈ 1351,19', m150.iPartida, 1351.1942, 0.01);

const m50 = C.calcularMotor({ potenciaCV:50, fp:0.88, rendimento:0.92, tensaoV:380, relacaoIpIn:6 }, tensaoMT);
check('50CV → Pot kVA ≈ 45,45', m50.potkVA, 45.4545, 0.01);
check('50CV → Pot kW = 40',     m50.potkW, 40, 0.01);
check('50CV → I nominal ≈ 75,07', m50.iNominal, 75.0663, 0.01);
check('50CV → I partida ≈ 450,40', m50.iPartida, 450.3981, 0.01);

const m30 = C.calcularMotor({ potenciaCV:30, fp:0.88, rendimento:0.92, tensaoV:380, relacaoIpIn:6 }, tensaoMT);
check('30CV → I nominal ≈ 45,04', m30.iNominal, 45.0398, 0.01);
check('30CV → I partida ≈ 270,24', m30.iPartida, 270.2388, 0.01);

const m250 = C.calcularMotor({ potenciaCV:250, fp:0.88, rendimento:0.92, tensaoV:380, relacaoIpIn:6 }, tensaoMT);
check('250CV → Pot kW = 200',      m250.potkW, 200, 0.01);
check('250CV → I nominal ≈ 375,33', m250.iNominal, 375.3317, 0.01);
check('250CV → I partida ≈ 2251,99', m250.iPartida, 2251.9903, 0.01);

// Ip primário com tensão MT ausente → null (como #DIV/0! tratado por IFERROR na planilha)
const mSemMT = C.calcularMotor({ potenciaCV:150, fp:0.88, rendimento:0.92, tensaoV:380, relacaoIpIn:6 }, null);
check('Ip primário sem tensão MT → null', mSemMT.ipPrimario, null);
// Ip primário com tensão MT = 13,8 kV
check('Ip primário (13,8kV) calculado', (m150.ipPrimario != null && m150.ipPrimario > 0), true);

// Motor vazio → tudo null
const mVazio = C.calcularMotor({}, tensaoMT);
check('motor vazio → I nominal null', mVazio.iNominal, null);

console.log('\n===== BLOCO 5 — Tipo de Subestação automático =====');
const J = (arr) => arr.join(' | ');
// Conexão nova, não compartilhada, 13,8kV
check('13,8kV · não comp · 200kVA → [N4,N5,N8]',
  J(C.tiposSubestacaoPermitidos({ tensaoMTkV:13.8, compartilhada:'Não', potencia:200 })),
  J(['Subestação Nº 4','Subestação Nº 5','Subestação Nº 8']));
check('13,8kV · não comp · 500kVA → [N4]',
  J(C.tiposSubestacaoPermitidos({ tensaoMTkV:13.8, compartilhada:'Não', potencia:500 })),
  J(['Subestação Nº 4']));
// 22 / 34,5 kV não compartilhada
check('22kV · não comp · 200kVA → [N2,N4,N5,N8]',
  J(C.tiposSubestacaoPermitidos({ tensaoMTkV:22, compartilhada:'Não', potencia:200 })),
  J(['Subestação Nº 2','Subestação Nº 4','Subestação Nº 5','Subestação Nº 8']));
check('34,5kV · não comp · 500kVA → [N2,N4]',
  J(C.tiposSubestacaoPermitidos({ tensaoMTkV:34.5, compartilhada:'Não', potencia:500 })),
  J(['Subestação Nº 2','Subestação Nº 4']));
// compartilhada
check('22kV · comp · 200kVA → [N2,N4] (SECOMP)',
  J(C.tiposSubestacaoPermitidos({ tensaoMTkV:22, compartilhada:'Sim', potencia:200 })),
  J(['Subestação Nº 2','Subestação Nº 4']));
check('13,8kV · comp · 200kVA → [N4]',
  J(C.tiposSubestacaoPermitidos({ tensaoMTkV:13.8, compartilhada:'Sim', potencia:200 })),
  J(['Subestação Nº 4']));
// potência baixa → sem definição
check('13,8kV · não comp · 20kVA → [] (≤29)',
  J(C.tiposSubestacaoPermitidos({ tensaoMTkV:13.8, compartilhada:'Não', potencia:20 })), '');

console.log('\n===== BLOCO 6 — Ramal de entrada (grupo) =====');
// Conexão nova urbana, Subestação Nº 2 → RAMAL1
check('Nova · Urbana · SE Nº2 → RAMAL1',
  C.grupoRamal({ finalidade:'Conexão Nova', localizacao:'Urbana', trocaSE:'', tipoSE:'Subestação Nº 2' }).grupo, 'RAMAL1');
check('Nova · Urbana · SE Nº4 → RAMAL2',
  C.grupoRamal({ finalidade:'Conexão Nova', localizacao:'Urbana', trocaSE:'', tipoSE:'Subestação Nº 4' }).grupo, 'RAMAL2');
check('Nova · Rural · SE Nº5 → RAMAL3',
  C.grupoRamal({ finalidade:'Conexão Nova', localizacao:'Rural', trocaSE:'', tipoSE:'Subestação Nº 5' }).grupo, 'RAMAL3');
// Alteração com troca de SE
check('Alteração · troca Sim · Urbana · SE Nº8 → RAMAL2',
  C.grupoRamal({ finalidade:'Aumento de Demanda', localizacao:'Urbana', trocaSE:'Sim', tipoSE:'Subestação Nº 8' }).grupo, 'RAMAL2');
// Alteração sem troca, urbana, Nº1/Nº6 → RAMAL4
check('Alteração · sem troca · Urbana · SE Nº1 → RAMAL4',
  C.grupoRamal({ finalidade:'Aumento de Demanda', localizacao:'Urbana', trocaSE:'Não', tipoSE:'Subestação Nº 1' }).grupo, 'RAMAL4');
// Alteração sem troca, rural, Nº1/Nº6 → RAMAL5
check('Alteração · sem troca · Rural · SE Nº6 → RAMAL5',
  C.grupoRamal({ finalidade:'Redução de Demanda', localizacao:'Rural', trocaSE:'Não', tipoSE:'Subestação Nº 6' }).grupo, 'RAMAL5');
// índices, texto e imagem
check('RAMAL1 contém índices [1,2,3,4,5,8]',
  J(C.grupoRamal({ finalidade:'Conexão Nova', localizacao:'Urbana', trocaSE:'', tipoSE:'Subestação Nº 2' }).indices),
  J([1,2,3,4,5,8]));
check('texto do índice 9 começa com "Área de atendimento: Rural"',
  C.textoRamal(9).startsWith('Área de atendimento: Rural'), true);
check('imagem do índice 9 → ramais/ramal_09.png', C.imagemRamal(9), 'ramais/ramal_09.png');

console.log('\n===== BLOCO 7 — Regras de bloqueio / alerta =====');
// 7.1 demanda conexão nova
check('Nova · 20kW → erro (mín 30)',  C.validarDemandaConexaoNova(20, 'Conexão Nova').nivel, 'erro');
check('Nova · 30kW → ok',             C.validarDemandaConexaoNova(30, 'Conexão Nova').ok, true);
check('Nova · 3000kW → erro (máx 2500)', C.validarDemandaConexaoNova(3000, 'Conexão Nova').nivel, 'erro');
check('Aumento · 20kW → ok (regra só p/ Nova)', C.validarDemandaConexaoNova(20, 'Aumento de Demanda').ok, true);
// 7.2 monômia
check('Monômia · 150kVA → erro',  C.validarTarifaMonomia('Sim', 150).nivel, 'erro');
check('Monômia · 112,5kVA → ok',  C.validarTarifaMonomia('Sim', 112.5).ok, true);
check('Não monômia · 150kVA → ok', C.validarTarifaMonomia('Não', 150).ok, true);
// 7.3 coordenadas
check('Coord BH (-19,9/-43,9) → ok', C.validarCoordenadas(-19.92, -43.94).ok, true);
check('Latitude -25 → erro',         C.validarCoordenadas(-25, -43.94).nivel, 'erro');
check('Longitude -55 → erro',        C.validarCoordenadas(-19.92, -55).nivel, 'erro');
// 7.4 futura x atual
check('Aumento · futura 200 ≤ atual 200 → erro',
  C.validarDemandaFuturaVsAtual('Aumento de Demanda', 200, 200).nivel, 'erro');
check('Aumento · futura 300 > atual 200 → ok',
  C.validarDemandaFuturaVsAtual('Aumento de Demanda', 200, 300).ok, true);
check('Redução · futura 250 ≥ atual 200 → erro',
  C.validarDemandaFuturaVsAtual('Redução de Demanda', 200, 250).nivel, 'erro');
check('Redução · futura 150 < atual 200 → ok',
  C.validarDemandaFuturaVsAtual('Redução de Demanda', 200, 150).ok, true);
// 7.5 demanda ≤ potência
check('Demanda 600 > pot 500 → erro', C.validarDemandaVsPotencia(600, 500).nivel, 'erro');
check('Demanda 400 ≤ pot 500 → ok',   C.validarDemandaVsPotencia(400, 500).ok, true);
// 7.6 irrigação
check('Atividade Irrigação → alerta', C.alertaIrrigacao('Irrigação').nivel, 'alerta');
check('Atividade Aquicultura → alerta', C.alertaIrrigacao('Aquicultura').nivel, 'alerta');
check('Atividade Comercial → sem alerta', C.alertaIrrigacao('Comercial').msg, '');
// agregador
const agg = C.validarTudo({
  finalidade:'Conexão Nova', demandaKW:20, monomia:'Sim', potenciaTotalTrafos:150,
  latitude:-25, longitude:-43.9, atividade:'Irrigação',
});
check('validarTudo → não pode avançar (há erros)', agg.podeAvancar, false);
check('validarTudo → 3 erros (demanda, monômia, coord)', agg.erros.length, 3);
check('validarTudo → 1 alerta (irrigação)', agg.alertas.length, 1);
const aggOk = C.validarTudo({
  finalidade:'Conexão Nova', demandaKW:200, monomia:'Não', potenciaTotalTrafos:300,
  latitude:-19.9, longitude:-43.9, atividade:'Comercial',
});
check('validarTudo cenário válido → pode avançar', aggOk.podeAvancar, true);

console.log(`\n===== RESULTADO: ${pass} OK / ${fail} FALHA =====\n`);
process.exit(fail ? 1 : 0);
