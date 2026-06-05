/* ===== Estado global ===== */
const state = {};
let trafos = [];   // {potencia, quantidade, relacao}
let motores = [];  // {tipo, cv, fp, rend, volts, ipIn, tempo, dispositivo}
let ramalSelecionado = null;

/* ATIVIDADES e DISPOSITIVOS agora em dados.js */

/* ===== util ===== */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const fmt = (n,d=2)=> (n==null||isNaN(n))?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});

/* ===== Navegação ===== */
function goTo(n){
  $$('.page').forEach(p=>p.classList.remove('show'));
  $('#page-'+n).classList.add('show');
  const steps=$$('.step');
  steps.forEach((s,i)=>{s.classList.remove('active','done'); if(i<n)s.classList.add('done'); if(i===n)s.classList.add('active');});
  window.scrollTo({top:0,behavior:'smooth'});
  if(n===5) renderPreview();
}

/* ===== Bind genérico de campos (data-k) ===== */
function bindInputs(){
  $$('[data-k]').forEach(el=>{
    const k=el.dataset.k;
    if(state[k]!=null && el.value==='') el.value=state[k];
    el.addEventListener('input',()=>{state[k]=el.value;});
    el.addEventListener('change',()=>{state[k]=el.value;});
  });
}

/* ===== Etapa 1: finalidade ===== */
function onFinalidade(){
  const v=$('#f_finalidade').value; state.finalidade=v;
  const box=$('#instalBox'), lbl=$('#instalLabel');
  if(v && v!=='Conexão Nova'){
    box.style.display='block';
    const map={'Aumento de Demanda':'Para Aumento de Demanda, informe o número da instalação','Redução de Demanda':'Para Redução de Demanda, informe o número da instalação','Adequação de Subestação':'Para Adequação de Subestação, informe o número da instalação','Aderir a Tarifa Monômia':'Para Aderir a Tarifa Monômia, informe o número da instalação','Religação de Subestação':'Para Religação de Subestação, informe o número da instalação','Desconexão para encerramento contratual':'Para Desconexão, informe o número da instalação','Alteração da tensão de fornecimento BT→MT':'Para Alteração da tensão, informe o número da instalação'};
    lbl.innerHTML=(map[v]||'Para Migração Mercado livre, informe o número da instalação')+' <span class="req">*</span>';
  } else box.style.display='none';
  // mostra bloco conexão nova ou alteração na etapa técnica
  const ehNova=(v==='Conexão Nova');
  $('#blocoConexaoNova').style.display=ehNova?'block':'none';
  $('#blocoAlteracao').style.display=(v && !ehNova)?'block':'none';
  updateCoordHint(); recalcTecnico();
}

/* ===== Etapa 2: CPF/CNPJ, vencimento, correspondência ===== */
function onCpfCnpj(){
  const el=$('#f_cpfcnpj'), msg=$('#cpfMsg'); state.cpfCnpj=el.value;
  const r=CalculoMT.validarCpfCnpj(el.value);
  if(!el.value){el.classList.remove('invalid');msg.textContent='';msg.className='field-note';return;}
  if(r.valido){el.classList.remove('invalid');msg.textContent=r.tipo+' válido ✓';msg.className='field-ok';}
  else{el.classList.add('invalid');msg.textContent=(r.tipo||'Documento')+' inválido';msg.className='field-err';}
}
function onVenc(){const v=event.target.value;state.desejaVenc=v;$('#vencDiaBox').style.display=(v==='Sim')?'flex':'none';}
function onCorresp(){const v=event.target.value;state.formaCorresp=v;
  $('#correspEmailBox').style.display=(v==='E-mail')?'flex':'none';
  $('#endCorrespBox').style.display=(v==='Endereço'||v==='Agência Correios(Caixa Postal)')?'block':'none';}

/* ===== Etapa 3: atividade, localização, coordenadas, ambiental ===== */
function fillAtividades(){const s=$('#f_atividade');ATIVIDADES.forEach(a=>{const o=document.createElement('option');o.textContent=a;s.appendChild(o);});}
function onAtividade(){
  const v=$('#f_atividade').value; state.atividade=v;
  const box=$('#irrigacaoAlert');
  const r=CalculoMT.alertaIrrigacao(v);
  box.innerHTML = r.nivel==='alerta' ? alertHTML('warn',r.msg) : '';
  recalcRamal();
}
function onLocalizacao(){
  const v=$('#f_localizacao').value; state.localizacao=v;
  $('#blocoUrbano').style.display=(v==='Urbana')?'block':'none';
  $('#blocoRural').style.display=(v==='Rural')?'block':'none';
  recalcRamal();
}
function updateCoordHint(){
  const ehNova=(state.finalidade==='Conexão Nova');
  $('#coordHint').textContent=ehNova?'Informe as coordenadas do local de atendimento.':'Haverá mudança do local da subestação? Se sim, informe as novas coordenadas e as antigas.';
  $('#latLabel').innerHTML=ehNova?'Latitude <span class="req">*</span>':'Latitude atual';
  $('#lonLabel').innerHTML=ehNova?'Longitude <span class="req">*</span>':'Longitude atual';
  $('#coordNovaBox').style.display=(state.finalidade && !ehNova)?'grid':'none';
}
function onCoord(){
  state.latitude=$('[data-k=latitude]').value; state.longitude=$('[data-k=longitude]').value;
  const r=CalculoMT.validarCoordenadas(state.latitude,state.longitude);
  $('#coordAlert').innerHTML = r.nivel==='erro' ? alertHTML('err',r.msg) : '';
}
function onAmbiental(){
  state.app=$('[data-k=app]').value; state.reservaLegal=$('[data-k=reservaLegal]').value;
  const box=$('#ambientalAlert');
  if(state.app==='Sim'||state.reservaLegal==='Sim')
    box.innerHTML=alertHTML('warn','O RT deverá providenciar documentos referentes à autorização ambiental e anexá-los ao pedido de solicitação de orçamento.');
  else box.innerHTML='';
}
function onSubPronta(){
  state.subPronta=event.target.value;
  const box=$('#subProntaAlert');
  if(state.subPronta==='Sim')box.innerHTML=alertHTML('info','O pedido de vistoria e ligação será disparado automaticamente após a conclusão das etapas do orçamento de conexão.');
  else if(state.subPronta==='Não')box.innerHTML=alertHTML('info','Você deve solicitar o pedido de vistoria e ligação em até 120 dias após a conclusão das etapas do orçamento de conexão.');
  else box.innerHTML='';
}

/* ===== Etapa 4: compartilhada, trafos, motores ===== */
function onCompartilhada(){
  state.compartilhada=$('#f_compartilhada').value;
  $('#qtdCubiculosBox').style.display=(state.compartilhada==='Sim')?'flex':'none';
  $('#compartilhadaAlert').innerHTML = state.compartilhada==='Sim'
    ? alertHTML('info','Preencha as informações do cubículo principal abaixo e os demais cubículos no Anexo I — Unidades Adicionais. Após o orçamento e assinatura do CUSD, deverá ser solicitada a análise de projeto de cada UC de forma individualizada.') : '';
  recalcTecnico();
}

/* --- Transformadores --- */
function addTrafo(){ trafos.push({potencia:'',quantidade:'',relacao:''}); renderTrafos(); }
function delTrafo(i){ trafos.splice(i,1); renderTrafos(); recalcTecnico(); }
function renderTrafos(){
  const tb=$('#trafoBody'); tb.innerHTML='';
  trafos.forEach((t,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>TRF${String(i+1).padStart(2,'0')}</td>
      <td><input type="number" step="any" value="${t.potencia}" placeholder="Ex.: 300" oninput="trafos[${i}].potencia=this.value;recalcTecnico()"></td>
      <td><input type="number" value="${t.quantidade}" placeholder="Ex.: 1" oninput="trafos[${i}].quantidade=this.value;recalcTecnico()"></td>
      <td><input type="number" step="any" value="${t.relacao}" placeholder="Ex.: 8" oninput="trafos[${i}].relacao=this.value"></td>
      <td><button class="btn-del" onclick="delTrafo(${i})">×</button></td>`;
    tb.appendChild(tr);
  });
}

/* --- Motores --- */
function addMotor(){ motores.push({tipo:'Motor',cv:'',fp:'',rend:'',volts:'',ipIn:'',tempo:'',dispositivo:''}); renderMotores(); }
function delMotor(i){ motores.splice(i,1); renderMotores(); }
function renderMotores(){
  const tb=$('#motorBody'); tb.innerHTML='';
  const tMT=parseFloat(state.tensaoMT);
  motores.forEach((m,i)=>{
    const c=CalculoMT.calcularMotor({potenciaCV:m.cv,fp:m.fp,rendimento:m.rend,tensaoV:m.volts,relacaoIpIn:m.ipIn},tMT);
    const dispOpts=DISPOSITIVOS.map(d=>`<option ${m.dispositivo===d?'selected':''}>${d}</option>`).join('');
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><input type="text" value="${m.tipo}" placeholder="Ex.: Motor" oninput="motores[${i}].tipo=this.value"></td>
      <td><input type="number" step="any" value="${m.cv}" placeholder="Ex.: 150" oninput="motores[${i}].cv=this.value;renderMotores()"></td>
      <td><input type="number" step="any" value="${m.fp}" placeholder="0,88" oninput="motores[${i}].fp=this.value;renderMotores()"></td>
      <td><input type="number" step="any" value="${m.rend}" placeholder="0,92" oninput="motores[${i}].rend=this.value;renderMotores()"></td>
      <td><input type="number" step="any" value="${m.volts}" placeholder="380" oninput="motores[${i}].volts=this.value;renderMotores()"></td>
      <td><input type="number" step="any" value="${m.ipIn}" placeholder="6" oninput="motores[${i}].ipIn=this.value;renderMotores()"></td>
      <td class="calc">${fmt(c.potkVA)}</td><td class="calc">${fmt(c.potkW)}</td>
      <td class="calc">${fmt(c.iNominal)}</td><td class="calc">${fmt(c.iPartida)}</td>
      <td><input type="number" step="any" value="${m.tempo}" placeholder="10" oninput="motores[${i}].tempo=this.value"></td>
      <td class="calc">${c.ipPrimario==null?'—':fmt(c.ipPrimario)}</td>
      <td><select onchange="motores[${i}].dispositivo=this.value"><option value="">—</option>${dispOpts}</select></td>
      <td><button class="btn-del" onclick="delMotor(${i})">×</button></td>`;
    tb.appendChild(tr);
  });
}

/* ===== Recalcular bloco técnico (trafos, tipo SE, demanda) ===== */
function recalcTecnico(){
  state.tensaoMT=$('#f_tensaoMT')?.value||state.tensaoMT;
  // trafos
  const rt=CalculoMT.calcularTrafos(trafos.map(t=>({potencia:t.potencia,quantidade:t.quantidade})));
  state.potTotalTrafos=rt.potenciaTotal; state.qtdTotalTrafos=rt.quantidadeTotal;
  $('#trafoPotTotal').textContent=fmt(rt.potenciaTotal);
  $('#trafoQtdTotal').textContent=rt.quantidadeTotal;
  // conexão nova: replica pot/qtde
  if($('#cn_pot')){$('#cn_pot').value=fmt(rt.potenciaTotal);state.cn_pot=rt.potenciaTotal;}
  if($('#cn_qtd')){$('#cn_qtd').value=rt.quantidadeTotal;state.cn_qtd=rt.quantidadeTotal;}
  if($('#alt_potFutura')){$('#alt_potFutura').value=fmt(rt.potenciaTotal);state.alt_potFutura=rt.potenciaTotal;}
  if($('#alt_qtdFutura')){$('#alt_qtdFutura').value=rt.quantidadeTotal;state.alt_qtdFutura=rt.quantidadeTotal;}
  renderMotores();
  // tipo de subestação automático
  preencherTiposSE();
  // tarifa monômia
  const rm=CalculoMT.validarTarifaMonomia($('#f_monomia')?.value,rt.potenciaTotal);
  $('#monomiaAlert').innerHTML = rm.nivel==='erro' ? alertHTML('err',rm.msg) : '';
  // demanda
  validarDemandas();
  recalcRamal();
}

function preencherTiposSE(){
  const ehNova=(state.finalidade==='Conexão Nova');
  const potBase = ehNova ? state.potTotalTrafos : state.potTotalTrafos; // futura = soma trafos
  const lista=CalculoMT.tiposSubestacaoPermitidos({tensaoMTkV:state.tensaoMT,compartilhada:state.compartilhada,potencia:potBase});
  // popula dropdown da conexão nova
  const selNova=$('#cn_tipoSE');
  if(selNova){
    const atual=selNova.value;
    selNova.innerHTML='<option value="">Selecione…</option>'+lista.map(s=>`<option ${atual===s?'selected':''}>${s}</option>`).join('');
    if(lista.length===1){selNova.value=lista[0];state.cn_tipoSE=lista[0];}
  }
  // popula dropdown "Para" da alteração
  const selPara=$('#alt_tipoPara');
  if(selPara){
    const atual=selPara.value;
    selPara.innerHTML='<option value="">Selecione…</option>'+lista.map(s=>`<option ${atual===s?'selected':''}>${s}</option>`).join('');
  }
}

function onModalidade(){state.modalidade=$('#f_modalidade').value;validarDemandas();updateDemandaLabels();}
function onEscalonada(){state.escalonada=$('#f_escalonada').value;updateDemandaLabels();}
function updateDemandaLabels(){
  // simplificação: ponta/fora ponta aparecem se Azul
  const azul=(state.modalidade==='Azul');
  $('#dem3Box').style.display=azul?'flex':'none';
  $('#dem4Box').style.display=(azul && (state.finalidade!=='Conexão Nova'))?'flex':'none';
  const ehNova=(state.finalidade==='Conexão Nova');
  $('#dem2Box').style.display=ehNova?'none':'flex';
  $('#dem1Lbl').innerHTML = ehNova ? 'Demanda contratada (kW) <span class="req">*</span>' : 'Demanda atual (kW) <span class="req">*</span>';
}
function validarDemandas(){
  const d1=$('[data-k=demanda1]')?.value, d2=$('[data-k=demanda2]')?.value;
  const out=[];
  const rNova=CalculoMT.validarDemandaConexaoNova(d1,state.finalidade);
  if(rNova.nivel)out.push(rNova);
  const rPot=CalculoMT.validarDemandaVsPotencia(d1,state.potTotalTrafos);
  if(rPot.nivel)out.push(rPot);
  if(state.finalidade!=='Conexão Nova'){
    const rFut=CalculoMT.validarDemandaFuturaVsAtual(state.finalidade,d1,d2);
    if(rFut.nivel)out.push(rFut);
  }
  $('#demandaAlert').innerHTML=out.map(r=>alertHTML('err',r.msg)).join('');
}

/* ===== Alteração: troca de SE ===== */
function onTrocaSE(){
  state.alt_troca=$('#alt_troca').value;
  $('#alt_tipoParaBox').style.display=(state.alt_troca==='Sim')?'flex':'none';
  $('#alt_tipoAtualLbl').innerHTML=(state.alt_troca==='Sim')?'Tipo de Subestação (De) <span class="req">*</span>':'Tipo de Subestação atual <span class="req">*</span>';
  recalcRamal();
}

/* ===== Geração ===== */
function onGeracao(t){
  if(t==='mom'){state.gerMomentaneo=event.target.value;$('#gerMomPotBox').style.display=(state.gerMomentaneo==='Sim')?'flex':'none';}
  if(t==='grid'){state.gridZero=event.target.value;$('#gridZeroPotBox').style.display=(state.gridZero==='Sim')?'flex':'none';}
}

/* ===== RAMAL — galeria visual ===== */
function tipoSEefetivo(){
  if(state.finalidade==='Conexão Nova') return state.cn_tipoSE;
  if(state.alt_troca==='Sim') return $('#alt_tipoPara')?.value;
  return $('#alt_tipoAtual')?.value;
}
function recalcRamal(){
  state.cn_tipoSE=$('#cn_tipoSE')?.value||state.cn_tipoSE;
  const tipoSE=tipoSEefetivo();
  const g=CalculoMT.grupoRamal({finalidade:state.finalidade,localizacao:state.localizacao,trocaSE:state.alt_troca,tipoSE});
  const gallery=$('#ramalGallery'), empty=$('#ramalEmpty');
  if(!g.indices.length){gallery.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  gallery.innerHTML=g.indices.map(idx=>{
    const sel=(ramalSelecionado===idx)?'selected':'';
    return `<div class="ramal-card ${sel}" onclick="selectRamal(${idx})">
      <div class="imgwrap"><img src="${RAMAL_IMGS[idx]||''}" alt="Ramal ${idx}"><span class="check">✓</span></div>
      <div class="desc">${CalculoMT.textoRamal(idx).replace(/·/g,'<br>·')}</div></div>`;
  }).join('');
}
function selectRamal(idx){ramalSelecionado=idx;state.ramalIndice=idx;recalcRamal();}

/* ===== Helpers de alerta ===== */
function alertHTML(tipo,msg){
  const icon = tipo==='err'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    : tipo==='warn'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  return `<div class="alert ${tipo}">${icon}<div>${msg}</div></div>`;
}

/* ===== Prévia ===== */
function pvRow(k,v){const empty=(v==null||v==='');return `<div class="pv-row"><div class="k">${k}</div><div class="v ${empty?'empty':''}">${empty?'—':v}</div></div>`;}
function renderPreview(){
  syncState();
  const tipoSE=tipoSEefetivo();
  let h=`<div class="pv-title">FORMULÁRIO — ORÇAMENTO DE CONEXÃO / ALTERAÇÃO DE CARGA EM MÉDIA TENSÃO</div><div class="pv-section">`;
  h+=`<h4>1. Classificação do Atendimento</h4>`;
  h+=pvRow('Opção de Atendimento',state.opcaoAtend)+pvRow('Finalidade',state.finalidade);
  if(state.finalidade && state.finalidade!=='Conexão Nova')h+=pvRow('Nº da Instalação',state.numInstalacao);
  h+=pvRow('Nº ART/TRT',state.artTrt)+pvRow('Tel. RT (cel/fixo)',[state.rtCelular,state.rtFixo].filter(Boolean).join(' / '));
  h+=`<h4>2. Dados do Proprietário</h4>`;
  h+=pvRow('Nome / Razão Social',state.nome)+pvRow('CPF/CNPJ',state.cpfCnpj);
  h+=pvRow('Telefone do cliente',state.telCliente)+pvRow('E-mail do cliente',state.emailCliente);
  h+=pvRow('Telefone do solicitante',state.telSolicitante)+pvRow('E-mail do solicitante',state.emailSolicitante);
  h+=`<h4>3. Correspondência</h4>`;
  h+=pvRow('Vencimento escolhido',state.desejaVenc==='Sim'?('Sim — dia '+(state.diaVenc||'—')):state.desejaVenc);
  h+=pvRow('Modalidade da obra',state.modalidadeObra)+pvRow('Forma de correspondência',state.formaCorresp);
  if(state.formaCorresp==='E-mail')h+=pvRow('E-mail correspondência',state.emailCorresp);
  if(state.formaCorresp==='Endereço'||state.formaCorresp==='Agência Correios(Caixa Postal)')
    h+=pvRow('Endereço correspondência',[state.ec_rua,state.ec_num,state.ec_bairro,state.ec_municipio,state.ec_estado,state.ec_cep].filter(Boolean).join(', '));
  h+=`<h4>4. Unidade Consumidora</h4>`;
  h+=pvRow('Atividade',state.atividade)+pvRow('Ramo',state.ramoAtividade);
  h+=pvRow('CEP',state.uc_cep)+pvRow('Localização',state.localizacao)+pvRow('Município / Estado',[state.uc_municipio,state.uc_estado].filter(Boolean).join(' / '));
  h+=pvRow('Coordenadas',[state.latitude,state.longitude].filter(Boolean).join(' , '));
  if(state.finalidade && state.finalidade!=='Conexão Nova')h+=pvRow('Coordenadas novas',[state.latitudeNova,state.longitudeNova].filter(Boolean).join(' , '));
  if(state.localizacao==='Urbana')h+=pvRow('Endereço',[state.urb_endereco,state.urb_num,state.urb_bairro,state.urb_compl].filter(Boolean).join(', '));
  if(state.localizacao==='Rural')h+=pvRow('Distrito / Propriedade',[state.rur_distrito,state.rur_propriedade].filter(Boolean).join(' / '));
  h+=pvRow('APP / Unid. Conservação',state.app)+pvRow('Reserva Legal',state.reservaLegal)+pvRow('Subestação pronta?',state.subPronta);
  h+=`<h4>5. Dados Técnicos</h4>`;
  h+=pvRow('Nível de tensão MT',state.tensaoMT?state.tensaoMT.replace('.',',')+' kV':'')+pvRow('Compartilhada?',state.compartilhada);
  // tabela trafos
  if(trafos.length){let tt='<table class="tbl"><thead><tr><th>Trafo</th><th>Pot (kVA)</th><th>Qtde</th><th>Rel. Imag/In</th></tr></thead><tbody>';
    trafos.forEach((t,i)=>{tt+=`<tr><td>TRF${String(i+1).padStart(2,'0')}</td><td>${t.potencia||'—'}</td><td>${t.quantidade||'—'}</td><td>${t.relacao||'—'}</td></tr>`;});
    tt+=`</tbody><tfoot><tr><td>Σ</td><td>${fmt(state.potTotalTrafos)}</td><td>${state.qtdTotalTrafos||0}</td><td></td></tr></tfoot></table>`;
    h+=`<div class="pv-row"><div class="k">Transformadores</div><div class="v">${tt}</div></div>`;}
  if(motores.length){let mt='<table class="tbl"><thead><tr><th>Tipo</th><th>CV</th><th>FP</th><th>η</th><th>V</th><th>Ip/In</th><th>I nom</th><th>I part</th></tr></thead><tbody>';
    motores.forEach(m=>{const c=CalculoMT.calcularMotor({potenciaCV:m.cv,fp:m.fp,rendimento:m.rend,tensaoV:m.volts,relacaoIpIn:m.ipIn},parseFloat(state.tensaoMT));
      mt+=`<tr><td>${m.tipo||'—'}</td><td>${m.cv||'—'}</td><td>${m.fp||'—'}</td><td>${m.rend||'—'}</td><td>${m.volts||'—'}</td><td>${m.ipIn||'—'}</td><td>${fmt(c.iNominal)}</td><td>${fmt(c.iPartida)}</td></tr>`;});
    mt+='</tbody></table>';
    h+=`<div class="pv-row"><div class="k">Motores</div><div class="v">${mt}</div></div>`;}
  h+=pvRow('Tipo de Subestação',tipoSE);
  if(state.finalidade!=='Conexão Nova')h+=pvRow('Troca de Subestação?',state.alt_troca);
  h+=pvRow('Tarifa monômia?',state.monomia)+pvRow('Modalidade tarifária',state.modalidade)+pvRow('Demanda escalonada?',state.escalonada);
  h+=pvRow(state.finalidade==='Conexão Nova'?'Demanda contratada (kW)':'Demanda atual (kW)',state.demanda1);
  if(state.finalidade!=='Conexão Nova')h+=pvRow('Demanda futura (kW)',state.demanda2);
  h+=pvRow('Geração paralelismo momentâneo',state.gerMomentaneo)+pvRow('GRID ZERO',state.gridZero)+pvRow('BT na mesma propriedade',state.btMesmaProp);
  // ramal selecionado
  if(state.ramalIndice!=null){
    h+=`<div class="pv-row"><div class="k">Ramal de Entrada selecionado</div><div class="v"><img src="${RAMAL_IMGS[state.ramalIndice]}" style="max-width:100%;border:1px solid #ddd;border-radius:6px;margin-bottom:6px"><br>${CalculoMT.textoRamal(state.ramalIndice)}</div></div>`;
  } else h+=pvRow('Ramal de Entrada','(não selecionado)');
  if(state.observacoes)h+=pvRow('Observações',state.observacoes);
  h+='</div>';
  $('#previewContent').innerHTML=h;
}
function syncState(){$$('[data-k]').forEach(el=>{state[el.dataset.k]=el.value;});}

/* ===== Exportar PDF ===== */
function exportarPDF(){ window.print(); }

/* ===== Modal Anexo II ===== */
function abrirAnexoII(){$('#modalAnexo').classList.add('show');}
function fecharAnexoII(){$('#modalAnexo').classList.remove('show');}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded',()=>{
  fillAtividades(); bindInputs();
  addTrafo(); // começa com 1 linha de trafo
  // stepper clicável
  $$('.step').forEach((s,i)=>s.addEventListener('click',()=>goTo(i)));
});
