/* =========================================================================
   calculo.js — Motor de cálculo do Formulário de Orçamento de Conexão MT
   Replica a lógica das abas CALCULOS / Formulário MT da planilha Cemig.
   Versão: blocos 1, 2 e 3 (CPF/CNPJ, transformadores, motores).
   100% navegador, sem dependências.
   ========================================================================= */

const CalculoMT = (function () {

  /* ---- Constantes fixas (confirmadas, embutidas na planilha) ----
     ATENÇÃO: a planilha é inconsistente quanto ao √3.
       • A tabela de MOTORES (tela "Formulário MT") usa SQRT(3) preciso.
       • A aba CALCULOS usa o literal 1.732 em algumas fórmulas.
     Por isso mantemos as duas constantes e cada bloco usa a sua. */
  const RAIZ3_PRECISO = Math.sqrt(3); // = 1,7320508… → usado nos MOTORES (espelha a tela)
  const RAIZ3_LITERAL = 1.732;        // → usado nas fórmulas oriundas da aba CALCULOS
  const FP_REF  = 0.92;    // fator de potência de referência (o "92/100")
  const Z_PCT   = 5;       // impedância % padrão dos trafos (coluna E da CALCULOS)
  const FATOR_IPICO = 1.05;// I pico = I nominal × 1,05

  /* =======================================================================
     BLOCO 1 — Validação de CPF / CNPJ
     Aba "Valid. CPF" da planilha. Aqui implementamos os dígitos
     verificadores oficiais (algoritmo padrão Receita Federal).
     ======================================================================= */

  function soDigitos(v) {
    return (v || '').toString().replace(/\D/g, '');
  }

  function validarCPF(cpf) {
    cpf = soDigitos(cpf);
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
    let d1 = (soma * 10) % 11;
    if (d1 === 10) d1 = 0;
    if (d1 !== parseInt(cpf[9])) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
    let d2 = (soma * 10) % 11;
    if (d2 === 10) d2 = 0;
    if (d2 !== parseInt(cpf[10])) return false;

    return true;
  }

  function validarCNPJ(cnpj) {
    cnpj = soDigitos(cnpj);
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const calc = (base, pesos) => {
      let soma = 0;
      for (let i = 0; i < pesos.length; i++) soma += parseInt(base[i]) * pesos[i];
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };

    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const d1 = calc(cnpj, p1);
    if (d1 !== parseInt(cnpj[12])) return false;
    const d2 = calc(cnpj, p2);
    if (d2 !== parseInt(cnpj[13])) return false;

    return true;
  }

  /** Valida CPF ou CNPJ automaticamente pelo nº de dígitos. */
  function validarCpfCnpj(valor) {
    const n = soDigitos(valor);
    if (n.length === 11) return { tipo: 'CPF',  valido: validarCPF(n) };
    if (n.length === 14) return { tipo: 'CNPJ', valido: validarCNPJ(n) };
    return { tipo: null, valido: false };
  }

  /* =======================================================================
     BLOCO 2 — Transformadores
     Planilha: H101 = Σ(Hn × Mn)  (potência total instalada, kVA)
               M101 = Σ Mn quando houver potência (qtde total)
     Cada trafo: { potencia (kVA), quantidade, relacaoImagInom }
     ======================================================================= */

  function calcularTrafos(trafos) {
    let potenciaTotal = 0;   // H101
    let quantidadeTotal = 0; // M101 (SUMIF: soma qtde só quando há potência)

    (trafos || []).forEach(t => {
      const pot = parseFloat(t.potencia) || 0;
      const qtd = parseFloat(t.quantidade) || 0;
      potenciaTotal += pot * qtd;
      if (pot > 0) quantidadeTotal += qtd; // SUMIF(H<>"" , M)
    });

    return {
      potenciaTotal,      // kVA — usado p/ tipo de subestação, tarifa monômia, etc.
      quantidadeTotal,
    };
  }

  /* =======================================================================
     BLOCO 3 — Motores / cargas especiais
     Replica as colunas calculadas da tabela (linhas 105+ do formulário):
       Pot(kVA)   T = (CV × 736) / (FP × Rend × 1000)
       Pot(kW)    AB = (CV × 736) / (1000 × Rend)
       I nominal  AF = kW / ((V/1000) × √3 × FP × Rend)
       I partida  AK = I nominal × (Ip/In)
       Ip primário AQ = I partida / (tensaoMT_kV × 1000 / V)   [IFERROR → null]
     Observação da planilha: usa 736 W/CV (cv métrico ~735,5, arredondado p/ 736).
     tensaoMTkV: nível de tensão MT em kV (13.8 / 22 / 34.5) — vem de S85.
     ======================================================================= */

  function calcularMotor(m, tensaoMTkV) {
    const cv    = parseFloat(m.potenciaCV);
    const fp    = parseFloat(m.fp);
    const rend  = parseFloat(m.rendimento);
    const volts = parseFloat(m.tensaoV);
    const ipIn  = parseFloat(m.relacaoIpIn);

    // se faltam dados essenciais, devolve campos vazios (como célula em branco)
    if (!cv || !fp || !rend || !volts) {
      return { potkVA: null, potkW: null, iNominal: null, iPartida: null, ipPrimario: null };
    }

    const potkVA = (cv * 736) / (fp * rend * 1000);          // T
    const potkW  = (cv * 736) / (1000 * rend);               // AB
    const iNominal = potkW / ((volts / 1000) * RAIZ3_PRECISO * fp * rend); // AF
    const iPartida = (ipIn) ? iNominal * ipIn : null;        // AK

    // Ip primário — depende da tensão MT; IFERROR → null (divisão por zero)
    let ipPrimario = null;
    const tMT = parseFloat(tensaoMTkV);
    if (iPartida != null && tMT && volts) {
      const denom = (tMT * 1000) / volts;
      if (denom !== 0) ipPrimario = iPartida / denom;
    }

    return { potkVA, potkW, iNominal, iPartida, ipPrimario };
  }

  /** Calcula todos os motores de uma vez. */
  function calcularMotores(motores, tensaoMTkV) {
    return (motores || []).map(m => calcularMotor(m, tensaoMTkV));
  }

  /* =======================================================================
     BLOCO 5 — Tipo de Subestação automático
     Espelha Listas!AN3 (Conexão Nova) e Listas!AL3 (Alteração).
     Retorna a LISTA de tipos de subestação permitidos para o cenário
     (a planilha popula um dropdown com essas opções).

     Parâmetros:
       finalidade   : "Conexão Nova" | "Aumento de Demanda" | ... 
       tensaoMTkV   : 13.8 | 22 | 34.5
       compartilhada: "Sim" | "Não" | "" (multimedição / AT85)
       potencia     : kVA — usa AG131 (nova) ou AE135 (futura, alteração)
     ======================================================================= */

  const SE = {
    N2: 'Subestação Nº 2', N4: 'Subestação Nº 4',
    N5: 'Subestação Nº 5', N8: 'Subestação Nº 8',
  };
  // Listas nomeadas (valores extraídos da planilha)
  const SENOVA300KW        = [SE.N4, SE.N5, SE.N8];
  const SE_NOVA_MAIOR300KW = [SE.N2, SE.N4];
  const SECOMP             = [SE.N2, SE.N4];
  const SENAB30022         = [SE.N2, SE.N4, SE.N5, SE.N8];

  function tiposSubestacaoPermitidos({ tensaoMTkV, compartilhada, potencia }) {
    const v = parseFloat(tensaoMTkV);
    const p = parseFloat(potencia) || 0;
    const comp = compartilhada;                 // "Sim" / "Não" / ""
    const naoComp = (comp === 'Não' || comp === '' || comp == null);
    const simComp = (comp === 'Sim' || comp === '' || comp == null);
    const is138 = (v === 13.8);
    const is22ou345 = (v === 22 || v === 34.5);

    // Ordem idêntica à fórmula AN3/AL3 (primeira condição satisfeita vence)
    if (naoComp && is138 && p > 29 && p < 301) return [...SENOVA300KW];
    if (naoComp && is138 && p > 300)            return [SE.N4];
    if (naoComp && is22ou345 && p > 29 && p < 301) return [...SENAB30022];
    if (naoComp && is22ou345 && p > 300)        return [...SE_NOVA_MAIOR300KW];
    if (simComp && is22ou345 && p > 29)         return [...SECOMP];
    if (simComp && is138 && p > 29)             return [SE.N4];
    return []; // cenário sem definição (ex.: potência ≤ 29 kVA ou campos vazios)
  }

  // Subestações Nº 1, 5, 6 e 8 só existem para potências até 300 kVA
  const SE_LIMITADAS_300KVA = ['Subestação Nº 1', SE.N5, 'Subestação Nº 6', SE.N8];
  function filtrarTiposPorPotencia(tipos, potencia) {
    const p = parseFloat(potencia) || 0;
    if (p > 300) return tipos.filter(t => !SE_LIMITADAS_300KVA.includes(t));
    return [...tipos];
  }

  /* =======================================================================
     BLOCO 6 — Ramal de entrada sugerido
     Espelha CALCULOS!C130 → retorna um GRUPO de índices possíveis
     (RAMAL1..5). O usuário escolhe um índice do grupo; cada índice tem
     texto descritivo (Listas!AR) e imagem (ramal_XX.png já extraída).

     Grupos (índices) extraídos da planilha:
       RAMAL1 = [1,2,3,4,5,8]   RAMAL2 = [1,2,3,8]   RAMAL3 = [9,10,11]
       RAMAL4 = [6,7]           RAMAL5 = [12]

     Lógica (CALCULOS!C130): depende de
       finalidade (Conexão Nova ou não)
       localizacao ("Urbana"/"Rural")
       trocaSE ("Sim"/"Não"/"" — só relevante quando não é conexão nova)
       tipoSE  — o tipo de subestação efetivo:
                  • Conexão Nova        → BB131 (tipo da SE nova)
                  • Alteração c/ troca  → BB136 (tipo "para")
                  • Alteração s/ troca  → AP136 (tipo atual)
     ======================================================================= */

  const RAMAIS = {
    RAMAL1: [1, 2, 3, 4, 5, 8],
    RAMAL2: [1, 2, 3, 8],
    RAMAL3: [9, 10, 11],
    RAMAL4: [6, 7],
    RAMAL5: [12],
  };

  function grupoRamal({ finalidade, localizacao, trocaSE, tipoSE }) {
    const ehNova = (finalidade === 'Conexão Nova');
    const urb = (localizacao === 'Urbana');
    const rur = (localizacao === 'Rural');
    const troca = trocaSE; // "Sim" / "Não" / "" / 0
    const semTroca = (troca === 'Não' || troca === 0 || troca === '' || troca == null);
    const t = tipoSE;
    const ehN2ouN5 = (t === SE.N2 || t === SE.N5);
    const ehN4ouN8 = (t === SE.N4 || t === SE.N8);
    const ehN1ouN6 = (t === 'Subestação Nº 1' || t === 'Subestação Nº 6');
    const ehN2458  = (t === SE.N2 || t === SE.N4 || t === SE.N5 || t === SE.N8);

    // Conexão Nova
    if (ehNova && urb && ehN2ouN5)  return { grupo: 'RAMAL1', indices: RAMAIS.RAMAL1 };
    if (ehNova && urb && ehN4ouN8)  return { grupo: 'RAMAL2', indices: RAMAIS.RAMAL2 };
    if (ehNova && rur && ehN2458)   return { grupo: 'RAMAL3', indices: RAMAIS.RAMAL3 };

    // Alteração COM troca de SE (campo "para" = BB136)
    if (!ehNova && urb && troca === 'Sim' && ehN2ouN5) return { grupo: 'RAMAL1', indices: RAMAIS.RAMAL1 };
    if (!ehNova && urb && troca === 'Sim' && ehN4ouN8) return { grupo: 'RAMAL2', indices: RAMAIS.RAMAL2 };
    if (!ehNova && rur && troca === 'Sim' && ehN2458)  return { grupo: 'RAMAL3', indices: RAMAIS.RAMAL3 };

    // Alteração SEM troca de SE (tipo atual = AP136)
    if (!ehNova && urb && semTroca && ehN1ouN6) return { grupo: 'RAMAL4', indices: RAMAIS.RAMAL4 };
    if (!ehNova && urb && semTroca && ehN2ouN5) return { grupo: 'RAMAL1', indices: RAMAIS.RAMAL1 };
    if (!ehNova && urb && semTroca && ehN4ouN8) return { grupo: 'RAMAL2', indices: RAMAIS.RAMAL2 };
    if (!ehNova && rur && semTroca && ehN1ouN6) return { grupo: 'RAMAL5', indices: RAMAIS.RAMAL5 };
    if (!ehNova && rur && semTroca && ehN2458)  return { grupo: 'RAMAL3', indices: RAMAIS.RAMAL3 };

    return { grupo: null, indices: [] };
  }

  /** Texto descritivo de cada índice de ramal (Listas!AR3:AR14, da planilha). */
  const RAMAL_TEXTO = {
    1:  'Área de atendimento: Urbano · Atendimento à subestação: N°02, N°04, Nº05 ou N°08 · Localização: mesmo lado da rede · Ramal de conexão: Aéreo · Ramal de entrada: Subterrâneo',
    2:  'Área de atendimento: Urbano · Atendimento à subestação: N°02, N°04, Nº05 ou N°08 · Localização: mesmo lado da rede · Ramal de conexão: Aéreo · Ramal de entrada: Subterrâneo',
    3:  'Área de atendimento: Urbano · Atendimento à subestação: N°02, N°04, Nº05 ou N°08 · Localização: lado oposto à rede · Ramal de conexão: Aéreo · Ramal de entrada: Subterrâneo',
    4:  'Área de atendimento: Urbano · Atendimento à subestação: N°02, Nº05 · Localização: lado oposto à rede · Ramal de conexão: Aéreo · Ramal de entrada: Não se aplica (ancorado na parede de 6m)',
    5:  'Área de atendimento: Urbano · Atendimento à subestação: N°02, Nº05 · Localização: mesmo lado da rede · Ramal de conexão: Aéreo · Ramal de entrada: Não se aplica (ancorado na parede de 6m)',
    6:  'Área de atendimento: Urbano · Atendimento à subestação: N°01, Nº06 · Localização: mesmo lado ou lado oposto · Ramal de conexão: Aéreo com cabo isolado · Ramal de entrada: embutido e ramal de saída subterrâneo',
    7:  'Área de atendimento: Urbano · Atendimento à subestação: N°01, Nº06 · Localização: mesmo lado da rede · Ramal de conexão: Subterrâneo com cabo isolado · Ramal de entrada: ramais de entrada e saída subterrâneos',
    8:  'Área de atendimento: Urbano · Atendimento à subestação: N°02, N°04, Nº05 ou N°08 · Localização: mesmo lado da rede · Ramal de conexão: Subterrâneo · Ramal de entrada: Subterrâneo',
    9:  'Área de atendimento: Rural (rede passando fora da propriedade) · Subestação: N°02, N°04, Nº05 ou N°08 · Localização: lado oposto à rede · Ramal de conexão: Aéreo · Ramal de entrada: Subterrâneo',
    10: 'Área de atendimento: Rural (rede passando fora da propriedade) · Subestação: N°02, N°04, Nº05 ou N°08 · Localização: mesmo lado da rede · Ramal de conexão: Aéreo · Ramal de entrada: Subterrâneo',
    11: 'Área de atendimento: Rural (rede passando dentro da propriedade) · Subestação: N°02, N°04, Nº05 ou N°08 · Ramal de conexão: Aéreo · Ramal de entrada: Subterrâneo',
    12: 'Área de atendimento: Rural · Subestação: N°01, Nº06 · Localização: mesmo lado ou lado oposto · Ramal de conexão: Aéreo com ramal convencional · Ramal de entrada: embutido e ramal de saída aéreo (atendimento rural)',
  };

  function textoRamal(indice)  { return RAMAL_TEXTO[indice] || ''; }
  function imagemRamal(indice) { return `ramais/ramal_${String(indice).padStart(2, '0')}.png`; }

  /* =======================================================================
     BLOCO 7 — Regras de bloqueio / alerta
     Cada validação retorna { ok, nivel, msg }:
       nivel: 'erro'  → impede avançar (bloqueio)
              'alerta'→ apenas avisa (não impede)
              null    → sem problema
     ======================================================================= */

  // Limites confirmados na planilha
  const LIM = {
    DEMANDA_MIN: 30,      // kW (Conexão Nova)
    DEMANDA_MAX: 2500,    // kW (Conexão Nova)
    MONOMIA_MAX: 112.5,   // kVA (tarifa monômia)
    LAT_MIN: -22.9, LAT_MAX: -14.23,    // Minas Gerais
    LON_MIN: -51.04, LON_MAX: -39.85,
  };

  // Atividades que disparam exigência de carta + outorga (CALCULOS!D101)
  const ATIVIDADES_IRRIGACAO = [
    'Agropecuária Rural Irrigação', 'Aquicultura', 'Irrigação',
    'Irrigação Noturna', 'Irrigação Noturna SUDENE',
    'Irrigação Noturna SUDENE/IDENE', 'Irrigante Noturno IDENE',
  ];

  /** 7.1 — Demanda para Conexão Nova (mín. 30 / máx. 2500 kW). */
  function validarDemandaConexaoNova(demandaKW, finalidade) {
    if (finalidade !== 'Conexão Nova') return { ok: true, nivel: null, msg: '' };
    const d = parseFloat(demandaKW);
    if (isNaN(d)) return { ok: true, nivel: null, msg: '' };
    if (d < LIM.DEMANDA_MIN)
      return { ok: false, nivel: 'erro', msg: 'Demanda mínima permitida: 30 kW.' };
    if (d > LIM.DEMANDA_MAX)
      return { ok: false, nivel: 'erro', msg: 'Demanda máxima permitida: 2500 kW.' };
    return { ok: true, nivel: null, msg: '' };
  }

  /** 7.2 — Tarifa monômia: soma das potências dos trafos ≤ 112,5 kVA. */
  function validarTarifaMonomia(monomia, potenciaTotalTrafos) {
    const isMonomia = (monomia === 'Sim' || monomia === true);
    if (!isMonomia) return { ok: true, nivel: null, msg: '' };
    const p = parseFloat(potenciaTotalTrafos) || 0;
    if (p > LIM.MONOMIA_MAX)
      return {
        ok: false, nivel: 'erro',
        msg: 'Conforme REN nº 1.000/2021, Seção III, Art. 292, I — para aderir à tarifa monômia a soma das potências nominais dos transformadores deve ser ≤ 112,5 kVA.',
      };
    return { ok: true, nivel: null, msg: '' };
  }

  /** 7.3 — Coordenadas dentro de Minas Gerais. */
  function validarCoordenadas(latitude, longitude) {
    const lat = parseFloat(latitude), lon = parseFloat(longitude);
    const erros = [];
    if (!isNaN(lat) && (lat < LIM.LAT_MIN || lat > LIM.LAT_MAX))
      erros.push('Latitude fora dos limites de Minas Gerais (−22,9 a −14,23).');
    if (!isNaN(lon) && (lon < LIM.LON_MIN || lon > LIM.LON_MAX))
      erros.push('Longitude fora dos limites de Minas Gerais (−51,04 a −39,85).');
    return erros.length
      ? { ok: false, nivel: 'erro', msg: erros.join(' ') }
      : { ok: true, nivel: null, msg: '' };
  }

  /** 7.4 — Demanda futura coerente com a finalidade (aumento × redução). */
  function validarDemandaFuturaVsAtual(finalidade, demandaAtual, demandaFutura) {
    const at = parseFloat(demandaAtual), fut = parseFloat(demandaFutura);
    if (isNaN(at) || isNaN(fut)) return { ok: true, nivel: null, msg: '' };
    if (finalidade === 'Aumento de Demanda' && fut <= at)
      return { ok: false, nivel: 'erro',
        msg: 'A demanda futura deve ser superior à atual para a finalidade Aumento de Demanda.' };
    if (finalidade === 'Redução de Demanda' && fut >= at)
      return { ok: false, nivel: 'erro',
        msg: 'A demanda futura deve ser inferior à atual para a finalidade Redução de Demanda.' };
    return { ok: true, nivel: null, msg: '' };
  }

  /** 7.5 — Demanda contratada ≤ potência total instalada dos trafos. */
  function validarDemandaVsPotencia(demandaKW, potenciaTotalTrafos) {
    const d = parseFloat(demandaKW), p = parseFloat(potenciaTotalTrafos);
    if (isNaN(d) || isNaN(p) || p === 0) return { ok: true, nivel: null, msg: '' };
    if (d > p)
      return { ok: false, nivel: 'erro',
        msg: 'A demanda contratada não pode ser superior à potência total instalada dos transformadores.' };
    return { ok: true, nivel: null, msg: '' };
  }

  /** 7.6 — Irrigação/Aquicultura: exige carta de formalização + outorga. */
  function alertaIrrigacao(atividade) {
    if (ATIVIDADES_IRRIGACAO.includes(atividade))
      return {
        ok: true, nivel: 'alerta',
        msg: 'Atividade de irrigação/aquicultura: é necessário preencher a carta de formalização do pedido e anexar comprovação de licença ambiental e outorga de uso de recursos hídricos (REN nº 1.000/2021, §7º; Lei nº 12.787/2013, arts. 22 e 23).',
      };
    return { ok: true, nivel: null, msg: '' };
  }

  /** Agrega todas as validações do bloco 7 e devolve só as que têm mensagem. */
  function validarTudo(dados) {
    const r = [
      validarDemandaConexaoNova(dados.demandaKW, dados.finalidade),
      validarTarifaMonomia(dados.monomia, dados.potenciaTotalTrafos),
      validarCoordenadas(dados.latitude, dados.longitude),
      validarDemandaFuturaVsAtual(dados.finalidade, dados.demandaAtual, dados.demandaFutura),
      validarDemandaVsPotencia(dados.demandaContratada, dados.potenciaTotalTrafos),
      alertaIrrigacao(dados.atividade),
    ].filter(x => x.msg);
    return {
      erros:   r.filter(x => x.nivel === 'erro'),
      alertas: r.filter(x => x.nivel === 'alerta'),
      podeAvancar: r.every(x => x.nivel !== 'erro'),
    };
  }

  /* ---- API pública ---- */
  return {
    // constantes (expostas p/ inspeção/teste)
    constantes: { RAIZ3_PRECISO, RAIZ3_LITERAL, FP_REF, Z_PCT, FATOR_IPICO },
    limites: LIM,
    // bloco 1
    validarCPF, validarCNPJ, validarCpfCnpj, soDigitos,
    // bloco 2
    calcularTrafos,
    // bloco 3
    calcularMotor, calcularMotores,
    // bloco 5
    tiposSubestacaoPermitidos, filtrarTiposPorPotencia, SE,
    // bloco 6
    grupoRamal, textoRamal, imagemRamal, RAMAIS,
    // bloco 7
    validarDemandaConexaoNova, validarTarifaMonomia, validarCoordenadas,
    validarDemandaFuturaVsAtual, validarDemandaVsPotencia, alertaIrrigacao,
    validarTudo, ATIVIDADES_IRRIGACAO,
  };

})();

// Suporte a uso em Node (testes) e no navegador
if (typeof module !== 'undefined' && module.exports) module.exports = CalculoMT;
