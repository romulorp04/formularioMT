/* pdf.js — gera o PDF réplica da planilha Cemig a partir do estado do formulário */

function _v(x){ return (x==null||x==='')?'':x; }
function _num(x,d=1){ return (x==null||isNaN(x)||x==='')?'':Number(x).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function cell(k,v,wcls='',extra=''){return `<div class="pdf-cell ${wcls} ${extra}"><span class="k">${k}</span><span class="v">${_v(v)}</span></div>`;}

/* Imagem do ramal para o PDF: usa base64 embutido (sem CORS, funciona em file:// e http://) */
function imgRamalPDF(indice){
  if(typeof RAMAL_IMGS_B64!=='undefined' && RAMAL_IMGS_B64[indice]) return RAMAL_IMGS_B64[indice];
  return RAMAL_IMGS[indice]||''; // fallback para o arquivo
}

async function montarDocumentoPDF(){
  syncState();
  const s = state;
  const ehNova = (s.finalidade==='Conexão Nova');
  const tipoSE = tipoSEefetivo();

  /* ---- PÁGINA 1 ---- */
  let p1 = `<div class="pdf-page">
    <div class="pdfh">
      <div class="logos"><span class="lg">CEMIG</span></div>
      <div class="ttl"><b>Formulário Orçamento de Conexão/Alteração de Carga Urbana ou Rural em Média Tensão</b><small>Cemig Distribuição S.A · Revisão 3 — 06/05/2026</small></div>
    </div>
    <div class="pdf-version">VERSÃO PARA PREENCHIMENTO DIGITAL</div>
    <div class="pdf-legend">*Campos de preenchimento obrigatório &nbsp;&nbsp; **Campos de preenchimento obrigatório para pessoa física</div>

    <div class="pdf-sec">1. Classificação do Atendimento</div>
    <div class="pdf-grid">
      ${cell('Opção de Atendimento*', s.opcaoAtend,'w50')}
      ${cell('Finalidade*', s.finalidade,'w50 noR')}
    </div>
    <div class="pdf-grid">
      ${cell('Número da ART/TRT do Projeto:', s.artTrt,'w50')}
      ${cell('Telefone do RT — Celular:', s.rtCelular,'w25')}
      ${cell('Fixo:', s.rtFixo,'w25 noR')}
    </div>
    ${(s.finalidade && !ehNova)?`<div class="pdf-grid">${cell('Número da Instalação:', s.numInstalacao,'w100 noR')}</div>`:''}

    <div class="pdf-sec">2. Dados do Proprietário</div>
    <div class="pdf-grid">${cell('Nome Completo ou Razão Social:*', s.nome,'w100 noR')}</div>
    <div class="pdf-grid">${cell('CPF/CNPJ:*', s.cpfCnpj,'w100 noR')}</div>
    <div class="pdf-grid">
      ${cell('Telefone do cliente:*', s.telCliente,'w50')}
      ${cell('E-mail do cliente:', s.emailCliente,'w50 noR')}
    </div>
    <div class="pdf-grid">
      ${cell('Telefone do solicitante:', s.telSolicitante,'w50')}
      ${cell('E-mail do solicitante:', s.emailSolicitante,'w50 noR')}
    </div>

    <div class="pdf-sec">3. Email ou Endereço para Correspondência / Entrega da Conta</div>
    <div class="pdf-grid">
      ${cell('Deseja escolher data de vencimento?*', s.desejaVenc==='Sim'?('Sim — dia '+_v(s.diaVenc)):_v(s.desejaVenc),'w60')}
      ${cell('Modalidade da obra (se houver):', s.modalidadeObra,'w40 noR')}
    </div>
    <div class="pdf-grid">
      ${cell('Como deseja receber a correspondência?', s.formaCorresp,'w60')}
      ${cell('Informar E-mail:', s.emailCorresp,'w40 noR')}
    </div>
    <div class="pdf-subsec">Endereço para recebimento do orçamento de conexão</div>
    <div class="pdf-grid">
      ${cell('Rua/Av.:', s.ec_rua,'w60')}${cell('Nº:', s.ec_num,'w15')}${cell('Compl.:', s.ec_compl,'w25 noR')}
    </div>
    <div class="pdf-grid">
      ${cell('Bairro/Distrito:', s.ec_bairro,'w40')}${cell('CEP:', s.ec_cep,'w20')}${cell('Município:', s.ec_municipio,'w25')}${cell('Estado:', s.ec_estado,'w15 noR')}
    </div>

    <div class="pdf-sec">4. Dados da Unidade Consumidora (Endereço do Ponto de Entrega)</div>
    <div class="pdf-grid">
      ${cell('Atividade desenvolvida na unidade consumidora:*', s.atividade,'w50')}
      ${cell('Ramo da Atividade:*', s.ramoAtividade,'w50 noR')}
    </div>
    <div class="pdf-grid">
      ${cell('CEP:*', s.uc_cep,'w25')}${cell('Localização:*', s.localizacao,'w25')}${cell('Município:*', s.uc_municipio,'w30')}${cell('Estado:*', s.uc_estado,'w20 noR')}
    </div>
    <div class="pdf-grid">
      ${cell(ehNova?'Latitude atual:*':'Latitude atual:', s.latitude,'w25')}${cell(ehNova?'Longitude atual:*':'Longitude atual:', s.longitude,'w25')}
      ${cell('Latitude nova:', s.latitudeNova,'w25')}${cell('Longitude nova:', s.longitudeNova,'w25 noR')}
    </div>
    ${s.localizacao==='Urbana'?`<div class="pdf-grid">${cell('Para Urbano — Endereço:*', s.urb_endereco,'w50')}${cell('Nº:*', s.urb_num,'w15')}${cell('Bairro:*', s.urb_bairro,'w20')}${cell('Compl.:', s.urb_compl,'w15 noR')}</div>`:''}
    ${s.localizacao==='Rural'?`<div class="pdf-grid">${cell('Para Rural — Distr./Comun./Região:*', s.rur_distrito,'w50')}${cell('Nome da Propriedade:*', s.rur_propriedade,'w50 noR')}</div>`:''}
    <div class="pdf-grid">
      ${cell('Ponto de Referência:', s.pontoReferencia,'w50')}${cell('Nº Instalação do Vizinho:', s.instalVizinho,'w50 noR')}
    </div>
    <div class="pdf-grid">${cell('Inserida em APP / Unidade de Conservação?', s.app,'w50')}${cell('Inserida em Reserva Legal?', s.reservaLegal,'w50 noR')}</div>
    <div class="pdf-grid">${cell('A subestação está pronta para ser ligada?*', s.subPronta,'w100 noR')}</div>
  </div>`;

  /* ---- PÁGINA 2 — Dados Técnicos ---- */
  let trafoRows='';
  for(let i=0;i<7;i++){const t=trafos[i]||{};trafoRows+=`<tr><td>TRF${String(i+1).padStart(2,'0')}</td><td>${_v(t.potencia)}</td><td>${_v(t.quantidade)}</td><td>${_v(t.relacao)}</td></tr>`;}
  let motorRows='';
  (motores||[]).forEach(m=>{const c=CalculoMT.calcularMotor({potenciaCV:m.cv,fp:m.fp,rendimento:m.rend,tensaoV:m.volts,relacaoIpIn:m.ipIn},parseFloat(s.tensaoMT));
    motorRows+=`<tr><td>${_v(m.tipo)}</td><td>${_v(m.cv)}</td><td>${_v(m.fp)}</td><td>${_v(m.rend)}</td><td>${_v(m.volts)}</td><td>${_num(c.potkVA)}</td><td>${_num(c.potkW)}</td><td>${_num(c.iNominal)}</td><td>${_num(c.iPartida)}</td><td>${_v(m.ipIn)}</td><td>${_v(m.dispositivo)}</td></tr>`;});
  // completar linhas vazias até 8
  for(let i=(motores||[]).length;i<8;i++){motorRows+=`<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;}

  let p2 = `<div class="pdf-page">
    <div class="pdf-sec">5. Dados Técnicos</div>
    <div class="pdf-grid">
      ${cell('Nível de tensão da rede de Média Tensão:*', s.tensaoMT?String(s.tensaoMT).replace('.',',')+' kV':'','w50')}
      ${cell('Trata-se de subestação compartilhada (Multimedição)?', s.compartilhada,'w50 noR')}
    </div>
    ${s.compartilhada==='Sim'?`<div class="pdf-grid">${cell('Quantos cubículos?', s.qtdCubiculos,'w100 noR')}</div>`:''}

    <div class="pdf-tbl-title">TRANSFORMADOR(ES)*</div>
    <table class="pdf-tbl"><thead><tr><th>TRAFO*</th><th>Potência (kVA)*</th><th>QTDE*</th><th>RELAÇÃO I MAG / I NOMINAL</th></tr></thead>
      <tbody>${trafoRows}</tbody>
      <tfoot><tr class="tot"><td>Σ</td><td>${_num(s.potTotalTrafos)} kVA</td><td>${_v(s.qtdTotalTrafos)||0}</td><td></td></tr></tfoot>
    </table>

    <div class="pdf-tbl-title" style="margin-top:6px">Relação de cargas especiais</div>
    <table class="pdf-tbl"><thead><tr><th>Tipo</th><th>Pot (CV)</th><th>FP</th><th>Rend (η)</th><th>Tensão (V)</th><th>Pot (kVA)</th><th>Pot (kW)</th><th>I nominal</th><th>I partida</th><th>Ip/In</th><th>Dispositivo</th></tr></thead>
      <tbody>${motorRows}</tbody>
    </table>

    ${ehNova?`<div class="pdf-grid" style="margin-top:6px">
      ${cell('Para Conexão Nova — Potência (Trafos):*', _num(s.potTotalTrafos)+' kVA','w40')}
      ${cell('Quantidade (Trafos):*', _v(s.qtdTotalTrafos)||0,'w25')}
      ${cell('Tipo de Subestação:*', tipoSE,'w35 noR')}
    </div>`:`<div class="pdf-grid" style="margin-top:6px">
      ${cell('Pot. atual:*', _v(s.alt_potAtual),'w20')}${cell('Qtde atual:*', _v(s.alt_qtdAtual),'w13')}
      ${cell('Pot. futura:*', _num(s.potTotalTrafos)+' kVA','w20')}${cell('Qtde futura:*', _v(s.qtdTotalTrafos)||0,'w14')}
      ${cell('Troca de SE?*', s.alt_troca,'w13')}${cell('Tipo de SE:*', tipoSE,'w20 noR')}
    </div>`}

    <div class="pdf-grid">
      ${cell('Faturada por tarifa monômia?*', s.monomia,'w33')}
      ${cell('Modalidade tarifária (verde/azul)?*', s.modalidade,'w34')}
      ${cell('Haverá demanda escalonada?*', s.escalonada,'w33 noR')}
    </div>
    <div class="pdf-grid">
      ${cell(ehNova?'Demanda contratada (kW):**':'Demanda atual (kW):**', s.demanda1,'w50')}
      ${cell('Demanda futura (kW):', ehNova?'':s.demanda2,'w50 noR')}
    </div>

    <div class="pdf-grid">${cell('Possui geração em paralelismo momentâneo (Gerador a diesel)?*', s.gerMomentaneo,'w100 noR')}</div>
    <div class="pdf-grid">${cell('Possui geração em paralelismo permanente sem injeção (GRID ZERO)?*', s.gridZero,'w100 noR')}</div>
    <div class="pdf-grid">${cell('Possui unidades de Baixa Tensão (BT) na mesma propriedade?*', s.btMesmaProp,'w100 noR')}</div>
  </div>`;

  /* ---- PÁGINA 3 — Ramal + Observações + Assinatura ---- */
  let ramalImg='';
  if(s.ramalIndice!=null){
    const durl=imgRamalPDF(s.ramalIndice);
    if(durl) ramalImg=`<div class="pdf-ramal-img"><img src="${durl}"></div>`;
  }
  let p3 = `<div class="pdf-page">
    <div class="pdf-tbl-title">RAMAL DE ENTRADA*</div>
    <div class="pdf-ramal-desc">${s.ramalIndice!=null?CalculoMT.textoRamal(s.ramalIndice):'(ramal não selecionado)'}</div>
    ${ramalImg}
    <div class="pdf-text" style="border-top:none">Obs: A seleção do ramal de entrada no formulário não exime a apresentação da planta de situação do local, que deve ser anexada durante a solicitação de análise.</div>

    <div class="pdf-sec">6. Observações</div>
    <div class="pdf-grid"><div class="pdf-cell w100 noR" style="min-height:50px"><span class="v">${_v(s.observacoes)}</span></div></div>

    <div class="pdf-sign">
      Por ser verdade, firmo o presente para todos os fins de direito.
      <div class="line"></div>
      (Local e data)
      <div class="line"></div>
      Assinatura do(a) proprietário(a) ou representante legal
      <div class="pdf-foot">A assinatura é obrigatória apenas para pedidos realizados presencialmente nas agências ou postos de atendimento.<br>*Campos de preenchimento obrigatório &nbsp; **Campos de preenchimento obrigatório para pessoa física</div>
    </div>
  </div>`;

  return `<div id="pdfDoc">${p1}${p2.replace('<div class="pdf-page">','<div class="pdf-page pdf-break">')}${p3.replace('<div class="pdf-page">','<div class="pdf-page pdf-break">')}</div>`;
}

async function exportarPDF(){
  const btn=event?.target?.closest('button');
  if(btn){btn.disabled=true;btn.dataset._t=btn.innerHTML;btn.innerHTML='Gerando PDF…';}
  try{
    const docHTML = await montarDocumentoPDF();
    const wrap=document.createElement('div');
    wrap.style.cssText='position:fixed;left:0;top:0;z-index:99999;background:#fff';
    wrap.innerHTML=docHTML;
    document.body.appendChild(wrap);
    const el=wrap.querySelector('#pdfDoc');
    // força o documento visível e opaco durante a captura (html2canvas exige render real)
    el.style.cssText='position:static;width:760px;background:#fff;opacity:1;z-index:auto;pointer-events:auto;left:auto;top:auto';
    const nome = (state.nome||'formulario').toString().replace(/[^a-zA-Z0-9]/g,'_').slice(0,40);
    await html2pdf().set({
      margin:[8,8,8,8],
      filename:`Formulario_Conexao_MT_${nome}.pdf`,
      image:{type:'jpeg',quality:0.95},
      html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',windowWidth:780},
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
      pagebreak:{mode:['avoid-all','css'],before:'.pdf-break'}
    }).from(el).save();
    document.body.removeChild(wrap);
  }catch(e){ alert('Erro ao gerar PDF: '+e.message); console.error(e); }
  finally{ if(btn){btn.disabled=false;btn.innerHTML=btn.dataset._t;} }
}
