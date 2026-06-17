/* ===== Estado global ===== */
const state = {};
let trafos = [];   // {potencia, quantidade, relacao}
let motores = [];  // {tipo, cv, fp, rend, volts, ipIn, tempo, dispositivo}
let cubiculos = []; // Anexo I — cubículos adicionais da subestação compartilhada
                     // {instalacao, trafos:[{potencia,quantidade,relacao}], modalidade, demanda, demandaPonta, demandaForaPonta}
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
  updateCoordHint(); updateDemandaLabels(); recalcTecnico();
  if(state.compartilhada==='Sim') renderCubiculos();
}

/* ===== Etapa 2: CPF/CNPJ, vencimento, correspondência ===== */
async function onCpfCnpj(){
  const el=$('#f_cpfcnpj'), msg=$('#cpfMsg'); state.cpfCnpj=el.value;
  const r=CalculoMT.validarCpfCnpj(el.value);
  if(!el.value){el.classList.remove('invalid');msg.textContent='';msg.className='field-note';return;}
  if(!r.valido){el.classList.add('invalid');msg.textContent=(r.tipo||'Documento')+' inválido';msg.className='field-err';return;}
  el.classList.remove('invalid');
  if(r.tipo==='CNPJ'){
    msg.textContent='verificando empresa…';msg.className='field-note';
    try{
      const res=await fetch(`https://brasilapi.com.br/api/cnpj/v1/${el.value.replace(/\D/g,'')}`);
      if(res.ok){
        const d=await res.json();
        const ativo=(d.descricao_situacao_cadastral||'').toUpperCase()==='ATIVA';
        msg.textContent=`✓ ${d.razao_social} — ${d.descricao_situacao_cadastral}`;
        msg.className=ativo?'field-ok':'field-err';
        const nomeEl=$('[data-k="nome"]');
        if(nomeEl&&!nomeEl.value){nomeEl.value=d.razao_social;nomeEl.dispatchEvent(new Event('input'));}
      } else {msg.textContent='CNPJ válido ✓';msg.className='field-ok';}
    }catch(_){msg.textContent='CNPJ válido ✓';msg.className='field-ok';}
  } else {
    msg.textContent=r.tipo+' válido ✓';msg.className='field-ok';
  }
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
  $('#mudancaLocalBox').style.display=(state.finalidade && !ehNova)?'block':'none';
  if(ehNova){
    $('#coordHint').textContent='Informe as coordenadas do local de atendimento.';
    $('#latLabel').innerHTML='Latitude <span class="req">*</span>';
    $('#lonLabel').innerHTML='Longitude <span class="req">*</span>';
    $('#coordNovaBox').style.display='none';
  } else if(state.finalidade){
    $('#coordHint').textContent='Informe as coordenadas do local de atendimento atual. Caso haja mudança de local, informe também as novas coordenadas.';
    onMudancaLocal();
  } else {
    $('#coordHint').textContent='Informe as coordenadas do local de atendimento.';
    $('#latLabel').innerHTML='Latitude <span class="req">*</span>';
    $('#lonLabel').innerHTML='Longitude <span class="req">*</span>';
    $('#coordNovaBox').style.display='none';
  }
}
function onMudancaLocal(){
  state.mudancaLocal=$('#f_mudancaLocal')?.value||'';
  const sim=(state.mudancaLocal==='Sim');
  $('#coordNovaBox').style.display=sim?'grid':'none';
  $('#latLabel').innerHTML=sim?'Latitude atual <span class="req">*</span>':'Latitude';
  $('#lonLabel').innerHTML=sim?'Longitude atual <span class="req">*</span>':'Longitude';
  onCoord();
}
function _utmBandLetter(lat){
  const B='CDEFGHJKLMNPQRSTUVWXX';
  return lat<-80?'C':lat>84?'X':B[Math.floor((lat+80)/8)];
}
function latLonParaUTM(lat,lon){
  const a=6378137,f=1/298.257223563,k0=0.9996;
  const b=a*(1-f),e2=1-(b*b)/(a*a);
  const latR=lat*Math.PI/180,lonR=lon*Math.PI/180;
  const zona=Math.floor((lon+180)/6)+1;
  const lonC=((zona-1)*6-180+3)*Math.PI/180;
  const sinL=Math.sin(latR),cosL=Math.cos(latR),tanL=Math.tan(latR);
  const N=a/Math.sqrt(1-e2*sinL**2);
  const T=tanL**2,C=e2/(1-e2)*cosL**2,A=cosL*(lonR-lonC);
  const e4=e2*e2,e6=e4*e2,ep2=e2/(1-e2);
  const M=a*((1-e2/4-3*e4/64-5*e6/256)*latR
    -(3*e2/8+3*e4/32+45*e6/1024)*Math.sin(2*latR)
    +(15*e4/256+45*e6/1024)*Math.sin(4*latR)
    -(35*e6/3072)*Math.sin(6*latR));
  const E=k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120)+500000;
  let Nort=k0*(M+N*tanL*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720));
  if(lat<0) Nort+=10000000;
  return {zona,hemisferio:lat<0?'S':'N',easting:Math.round(E),northing:Math.round(Nort)};
}

function onCoord(){
  state.latitude=$('[data-k=latitude]').value; state.longitude=$('[data-k=longitude]').value;
  state.latitudeNova=$('[data-k=latitudeNova]')?.value||'';
  state.longitudeNova=$('[data-k=longitudeNova]')?.value||'';
  const r=CalculoMT.validarCoordenadas(state.latitude,state.longitude);
  const lat=parseFloat(state.latitude),lon=parseFloat(state.longitude);
  if(!isNaN(lat)&&!isNaN(lon)){
    const u=latLonParaUTM(lat,lon);
    const utmEl=$('[data-k=utm]');
    if(utmEl) utmEl.value=`${u.zona}${_utmBandLetter(lat)} E:${u.easting} N:${u.northing}`;
  }
  let erros=[];
  if(r.nivel==='erro') erros.push(r.msg);
  if($('#coordNovaBox').style.display!=='none'){
    const rNova=CalculoMT.validarCoordenadas(state.latitudeNova,state.longitudeNova);
    if(rNova.nivel==='erro') erros.push(rNova.msg);
    const latN=parseFloat(state.latitudeNova),lonN=parseFloat(state.longitudeNova);
    if(!isNaN(latN)&&!isNaN(lonN)){
      const uN=latLonParaUTM(latN,lonN);
      const utmNovaEl=$('[data-k=utmNova]');
      if(utmNovaEl) utmNovaEl.value=`${uN.zona}${_utmBandLetter(latN)} E:${uN.easting} N:${uN.northing}`;
    }
  }
  $('#coordAlert').innerHTML = erros.length ? alertHTML('err',erros.join(' ')) : '';
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

/* ===== Validação de e-mail e telefone ===== */
function _validarEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);}
function _validarTelefone(v){
  const d=v.replace(/\D/g,'');
  if(d.length<10||d.length>11) return false;
  const ddd=parseInt(d.substring(0,2),10);
  if(ddd<11||ddd>99) return false;
  if(d.length===11&&d[2]!=='9') return false;
  return true;
}
function _feedbackCampo(el,spanId,valido,msgErr){
  const sp=$('#'+spanId);
  if(!el||!el.value){if(el)el.classList.remove('invalid');if(sp){sp.textContent='';sp.className='cep-status';}return;}
  if(valido){el.classList.remove('invalid');if(sp){sp.textContent='';}}
  else{el.classList.add('invalid');if(sp){sp.textContent=msgErr;sp.className='cep-status err';}}
}
function onEmail(k){const el=$(`[data-k="${k}"]`);_feedbackCampo(el,`status-${k}`,_validarEmail(el.value),'e-mail inválido');}
function onTel(k){const el=$(`[data-k="${k}"]`);_feedbackCampo(el,`status-${k}`,_validarTelefone(el.value),'telefone inválido');}

/* ===== Etapa 4: compartilhada, trafos, motores ===== */
function onCompartilhada(){
  state.compartilhada=$('#f_compartilhada').value;
  const compart=(state.compartilhada==='Sim');
  $('#qtdCubiculosBox').style.display=compart?'flex':'none';
  $('#cubiculosBox').style.display=compart?'block':'none';
  $('#blocoTrafosIndividual').style.display=compart?'none':'block';
  $('#blocoMotoresIndividual').style.display=compart?'none':'block';
  $('#blocoTarifacaoDemanda').style.display=compart?'none':'block';
  $('#blocoTotaisConsolidados').style.display=compart?'block':'none';
  $('#compartilhadaAlert').innerHTML = compart
    ? alertHTML('info','Preencha os dados de cada cubículo abaixo. Após o orçamento e assinatura do CUSD, deverá ser solicitada a análise de projeto de cada UC de forma individualizada.') : '';
  sincronizarCubiculos();
  recalcTecnico();
}

/* --- Transformadores --- */
function addTrafo(){ trafos.push({potencia:'',quantidade:'',relacao:'8'}); renderTrafos(); }
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

/* --- Cubículos adicionais (Anexo I) --- */
function sincronizarCubiculos(){
  const qtd=parseInt($('[data-k="qtdCubiculos"]')?.value)||0;
  const n=(state.compartilhada==='Sim') ? Math.max(1,qtd) : 0;
  while(cubiculos.length<n) cubiculos.push({instalacao:'',trafos:[{potencia:'',quantidade:'',relacao:'8'}],modalidade:'',demanda:'',demandaPonta:'',demandaForaPonta:''});
  cubiculos.length=n;
  renderCubiculos();
}
function addTrafoCub(i){ cubiculos[i].trafos.push({potencia:'',quantidade:'',relacao:'8'}); renderCubiculos(); }
function delTrafoCub(i,j){ cubiculos[i].trafos.splice(j,1); renderCubiculos(); }
function recalcCubiculo(i){
  const rt=CalculoMT.calcularTrafos(cubiculos[i].trafos);
  const elPot=$('#cubTrafoPot'+i), elQtd=$('#cubTrafoQtd'+i);
  if(elPot) elPot.textContent=fmt(rt.potenciaTotal);
  if(elQtd) elQtd.textContent=rt.quantidadeTotal;
  validarDemandaCubiculo(i);
  recalcTecnico();
}
function demandaRepresentativaCubiculo(c){
  if(c.modalidade==='Azul'){
    const p=parseFloat(c.demandaPonta)||0, f=parseFloat(c.demandaForaPonta)||0;
    return Math.max(p,f);
  }
  return parseFloat(c.demanda)||0;
}
function validarDemandaCubiculo(i){
  const c=cubiculos[i]; if(!c) return;
  const el=$('#cubDemandaAlert'+i); if(!el) return;
  const potCub=CalculoMT.calcularTrafos(c.trafos).potenciaTotal;
  const demCub=demandaRepresentativaCubiculo(c);
  el.innerHTML = (demCub>0 && potCub>0 && demCub>potCub)
    ? alertHTML('err',`A demanda do cubículo não pode ser superior à potência total dos seus transformadores (${fmt(potCub)} kVA).`)
    : '';
}
function totaisCubiculos(){
  let potenciaTotal=0, quantidadeTotal=0, demandaTotal=0;
  cubiculos.forEach(c=>{
    const rt=CalculoMT.calcularTrafos(c.trafos);
    potenciaTotal+=rt.potenciaTotal;
    quantidadeTotal+=rt.quantidadeTotal;
    demandaTotal+=demandaRepresentativaCubiculo(c);
  });
  return {potenciaTotal,quantidadeTotal,demandaTotal};
}
function renderCubiculos(){
  const box=$('#cubiculosCards'); if(!box) return;
  box.innerHTML = cubiculos.map((c,i)=>{
    const rt=CalculoMT.calcularTrafos(c.trafos);
    const trafoRows=c.trafos.map((t,j)=>`<tr>
      <td>TRF${String(j+1).padStart(2,'0')}</td>
      <td><input type="number" step="any" value="${t.potencia}" placeholder="Ex.: 300" oninput="cubiculos[${i}].trafos[${j}].potencia=this.value;recalcCubiculo(${i})"></td>
      <td><input type="number" value="${t.quantidade}" placeholder="Ex.: 1" oninput="cubiculos[${i}].trafos[${j}].quantidade=this.value;recalcCubiculo(${i})"></td>
      <td><input type="number" step="any" value="${t.relacao}" placeholder="Ex.: 8" oninput="cubiculos[${i}].trafos[${j}].relacao=this.value"></td>
      <td><button class="btn-del" onclick="delTrafoCub(${i},${j})">×</button></td>
    </tr>`).join('');
    const azul=(c.modalidade==='Azul');
    const demandaFields = azul
      ? `<div class="field"><label>Demanda Ponta (kW)</label><input type="number" step="any" value="${c.demandaPonta}" oninput="cubiculos[${i}].demandaPonta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>
         <div class="field"><label>Demanda Fora de Ponta (kW)</label><input type="number" step="any" value="${c.demandaForaPonta}" oninput="cubiculos[${i}].demandaForaPonta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>`
      : `<div class="field"><label>Demanda (kW)</label><input type="number" step="any" value="${c.demanda}" oninput="cubiculos[${i}].demanda=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>`;
    return `<div class="conditional" style="margin-top:14px">
      <div class="conditional-tag">Cubículo ${i+1}</div>
      ${state.finalidade!=='Conexão Nova' ? `<div class="field"><label>N° Instalação</label><input type="text" value="${c.instalacao}" placeholder="Nº da instalação" oninput="cubiculos[${i}].instalacao=this.value"></div>` : ''}
      <div class="tbl-scroll">
        <table class="tbl">
          <thead><tr><th style="width:70px">Trafo</th><th>Potência (kVA)</th><th>Qtde</th><th>Relação I mag / I nominal</th><th style="width:46px"></th></tr></thead>
          <tbody>${trafoRows}</tbody>
          <tfoot><tr><td>Σ</td><td class="calc" id="cubTrafoPot${i}">${fmt(rt.potenciaTotal)}</td><td class="calc" id="cubTrafoQtd${i}">${rt.quantidadeTotal}</td><td colspan="2"></td></tr></tfoot>
        </table>
      </div>
      <button class="btn-add" onclick="addTrafoCub(${i})"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Adicionar transformador</button>
      <div class="grid cols-2" style="margin-top:14px">
        <div class="field"><label>Modalidade tarifária horária</label>
          <select onchange="cubiculos[${i}].modalidade=this.value;renderCubiculos()"><option value="">Selecione…</option><option ${c.modalidade==='Verde'?'selected':''}>Verde</option><option ${c.modalidade==='Azul'?'selected':''}>Azul</option></select></div>
        ${demandaFields}
      </div>
      <div id="cubDemandaAlert${i}"></div>
    </div>`;
  }).join('');
  cubiculos.forEach((c,i)=>validarDemandaCubiculo(i));
  recalcTecnico();
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
  // trafos (ou totais consolidados dos cubículos, se compartilhada)
  const rt=(state.compartilhada==='Sim')
    ? totaisCubiculos()
    : CalculoMT.calcularTrafos(trafos.map(t=>({potencia:t.potencia,quantidade:t.quantidade})));
  state.potTotalTrafos=rt.potenciaTotal; state.qtdTotalTrafos=rt.quantidadeTotal;
  $('#trafoPotTotal').textContent=fmt(rt.potenciaTotal);
  $('#trafoQtdTotal').textContent=rt.quantidadeTotal;
  // conexão nova: replica pot/qtde
  if($('#cn_pot')){$('#cn_pot').value=fmt(rt.potenciaTotal);state.cn_pot=rt.potenciaTotal;}
  if($('#cn_qtd')){$('#cn_qtd').value=rt.quantidadeTotal;state.cn_qtd=rt.quantidadeTotal;}
  if($('#alt_potFutura')){$('#alt_potFutura').value=fmt(rt.potenciaTotal);state.alt_potFutura=rt.potenciaTotal;}
  if($('#alt_qtdFutura')){$('#alt_qtdFutura').value=rt.quantidadeTotal;state.alt_qtdFutura=rt.quantidadeTotal;}
  if(state.compartilhada==='Sim'){
    state.demandaTotalCubiculos=rt.demandaTotal;
    if($('#totConsolidadoTrafos'))$('#totConsolidadoTrafos').value=fmt(rt.potenciaTotal);
    if($('#totConsolidadoDemanda'))$('#totConsolidadoDemanda').value=fmt(rt.demandaTotal);
  }
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
  // popula dropdown "Tipo de Subestação atual" da alteração
  const selAtual=$('#alt_tipoAtual');
  if(selAtual){
    const baseAtual=['Subestação Nº 1','Subestação Nº 2','Subestação Nº 4','Subestação Nº 5','Subestação Nº 6','Subestação Nº 8'];
    const potAtual=parseFloat($('[data-k=alt_potAtual]')?.value)||0;
    const listaAtual=CalculoMT.filtrarTiposPorPotencia(baseAtual,potAtual);
    const atual=selAtual.value;
    const manter=listaAtual.includes(atual);
    selAtual.innerHTML='<option value="">Selecione…</option>'+listaAtual.map(s=>`<option ${manter&&atual===s?'selected':''}>${s}</option>`).join('');
    if(!manter){selAtual.value='';state.alt_tipoAtual='';}
  }
  // popula dropdown "Para" da alteração
  const selPara=$('#alt_tipoPara');
  if(selPara){
    const atual=selPara.value;
    const listaPara=CalculoMT.filtrarTiposPorPotencia(lista,state.potTotalTrafos);
    selPara.innerHTML='<option value="">Selecione…</option>'+listaPara.map(s=>`<option ${atual===s?'selected':''}>${s}</option>`).join('');
  }
  renderGaleriaSE('seGallery_nova','cn_tipoSE');
  renderGaleriaSE('seGallery_atual','alt_tipoAtual');
  renderGaleriaSE('seGallery_para','alt_tipoPara');
}

/* ===== Galeria visual de tipos de subestação ===== */
const SE_GALLERY_MAP={cn_tipoSE:'seGallery_nova',alt_tipoAtual:'seGallery_atual',alt_tipoPara:'seGallery_para'};
function renderGaleriaSE(containerId,selectId){
  const cont=$('#'+containerId), sel=$('#'+selectId);
  if(!cont||!sel) return;
  const opts=[...sel.options].filter(o=>o.value!=='');
  cont.innerHTML=opts.map(o=>{
    const m=o.value.match(/(\d+)/);
    const img=m&&SUBESTACAO_IMGS[m[1]];
    const info=m&&SUBESTACAO_INFO[m[1]];
    const sel_=(o.value===sel.value)?'selected':'';
    return `<div class="se-card ${sel_}" onclick="selecionarSE('${selectId}','${o.value}')">
      ${info?`<span class="se-info">i<span class="se-tooltip">${info}</span></span>`:''}
      ${img?`<img src="${img}" alt="${o.value}">`:''}
      <div class="lbl">${o.value}</div>
    </div>`;
  }).join('');
}
function selecionarSE(selectId,value){
  const sel=$('#'+selectId);
  if(!sel) return;
  sel.value=value;
  if(typeof sel.onchange==='function') sel.onchange();
  renderGaleriaSE(SE_GALLERY_MAP[selectId],selectId);
}

function onModalidade(){state.modalidade=$('#f_modalidade').value;updateDemandaLabels();validarDemandas();}
function onEscalonada(){
  state.escalonada=$('#f_escalonada').value;
  $('#escalonadaBox').style.display=(state.escalonada==='Sim')?'block':'none';
  if(state.escalonada==='Sim') renderEscalonada();
}
function updateDemandaLabels(){
  const azul=(state.modalidade==='Azul');
  const ehAlteracao=(state.finalidade==='Aumento de Demanda'||state.finalidade==='Redução de Demanda');
  ['dem_atual','dem_futura','dem_ponta_atual','dem_ponta_futura','dem_foraponta_atual','dem_foraponta_futura']
    .forEach(k=>{const b=$(`#box_${k}`);if(b)b.style.display='none';});
  function show(k,lbl){const b=$(`#box_${k}`);const l=$(`#lbl_${k}`);if(b)b.style.display='';if(l&&lbl)l.innerHTML=lbl;}
  if(ehAlteracao && !azul){
    show('dem_atual','Demanda Atual (kW) <span class="req">*</span>');
    show('dem_futura','Demanda Futura (kW) <span class="req">*</span>');
  } else if(ehAlteracao && azul){
    show('dem_ponta_atual','Demanda Ponta Atual (kW) <span class="req">*</span>');
    show('dem_ponta_futura','Ponta Futura (kW) <span class="req">*</span>');
    show('dem_foraponta_atual','Fora de Ponta Atual (kW) <span class="req">*</span>');
    show('dem_foraponta_futura','Fora de Ponta Futura (kW) <span class="req">*</span>');
  } else if(!ehAlteracao && !azul){
    show('dem_atual','Informar demanda em kW <span class="req">*</span>');
  } else {
    show('dem_ponta_atual','Demanda Ponta (kW) <span class="req">*</span>');
    show('dem_foraponta_atual','Demanda Fora de Ponta (kW) <span class="req">*</span>');
  }
}
function validarDemandas(){
  const azul=(state.modalidade==='Azul');
  const ehAlteracao=(state.finalidade==='Aumento de Demanda'||state.finalidade==='Redução de Demanda');
  const out=[];
  let dAtual, dFutura;
  if(azul){
    const pa=parseFloat($('[data-k=dem_ponta_atual]')?.value)||0;
    const fa=parseFloat($('[data-k=dem_foraponta_atual]')?.value)||0;
    const pf=parseFloat($('[data-k=dem_ponta_futura]')?.value)||0;
    const ff=parseFloat($('[data-k=dem_foraponta_futura]')?.value)||0;
    dAtual=(pa||fa)?String(pa+fa):'';
    dFutura=(pf||ff)?String(pf+ff):'';
  } else {
    dAtual=$('[data-k=dem_atual]')?.value||'';
    dFutura=$('[data-k=dem_futura]')?.value||'';
  }
  if(!ehAlteracao){
    const rNova=CalculoMT.validarDemandaConexaoNova(dAtual,state.finalidade);
    if(rNova.nivel)out.push(rNova);
  }
  const rPot=CalculoMT.validarDemandaVsPotencia(dAtual,state.potTotalTrafos);
  if(rPot.nivel)out.push(rPot);
  if(ehAlteracao&&dFutura){
    const rPotFut=CalculoMT.validarDemandaVsPotencia(dFutura,state.potTotalTrafos);
    if(rPotFut.nivel)out.push(rPotFut);
  }
  if(ehAlteracao&&dAtual&&dFutura){
    const rFut=CalculoMT.validarDemandaFuturaVsAtual(state.finalidade,dAtual,dFutura);
    if(rFut.nivel)out.push(rFut);
  }
  $('#demandaAlert').innerHTML=out.map(r=>alertHTML('err',r.msg)).join('');
}

/* ===== Demanda Escalonada ===== */
let escalonada=[];
function addEscalonada(){escalonada.push({demanda:'',ponta:'',foraponta:'',inicio:''});renderEscalonada();}
function delEscalonada(i){escalonada.splice(i,1);renderEscalonada();}
function renderEscalonada(){
  const azul=(state.modalidade==='Azul');
  const head=$('#escalonadaHead'),body=$('#escalonadaBody');
  if(!head||!body) return;
  head.innerHTML=azul
    ?'<tr><th>Ponta (kW)</th><th>Fora de Ponta (kW)</th><th>Início de Uso</th><th style="width:46px"></th></tr>'
    :'<tr><th>Demanda Futura (kW)</th><th>Início de Uso</th><th style="width:46px"></th></tr>';
  body.innerHTML='';
  escalonada.forEach((e,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=azul
      ?`<td><input type="number" step="any" value="${e.ponta}" placeholder="kW" oninput="escalonada[${i}].ponta=this.value"></td>
         <td><input type="number" step="any" value="${e.foraponta}" placeholder="kW" oninput="escalonada[${i}].foraponta=this.value"></td>
         <td><input type="month" value="${e.inicio}" oninput="escalonada[${i}].inicio=this.value"></td>
         <td><button class="btn-del" onclick="delEscalonada(${i})">×</button></td>`
      :`<td><input type="number" step="any" value="${e.demanda}" placeholder="kW" oninput="escalonada[${i}].demanda=this.value"></td>
         <td><input type="month" value="${e.inicio}" oninput="escalonada[${i}].inicio=this.value"></td>
         <td><button class="btn-del" onclick="delEscalonada(${i})">×</button></td>`;
    body.appendChild(tr);
  });
}

/* ===== Alteração: troca de SE ===== */
function onTrocaSE(){
  state.alt_troca=$('#alt_troca').value;
  $('#alt_tipoParaBox').style.display=(state.alt_troca==='Sim')?'flex':'none';
  $('#seGalleryBox_para').style.display=(state.alt_troca==='Sim')?'block':'none';
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
  if(state.compartilhada==='Sim'){
    h+=pvRow('Soma dos transformadores (kVA)',fmt(state.potTotalTrafos));
    h+=pvRow('Soma das demandas (kW)',fmt(state.demandaTotalCubiculos));
    h+=pvRow('Tipo de Subestação',tipoSE);
  } else {
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
    const azulPv=(state.modalidade==='Azul');
    const ehAltPv=(state.finalidade==='Aumento de Demanda'||state.finalidade==='Redução de Demanda');
    if(azulPv){
      h+=pvRow('Demanda Ponta Atual (kW)',state.dem_ponta_atual);
      if(ehAltPv)h+=pvRow('Ponta Futura (kW)',state.dem_ponta_futura);
      h+=pvRow('Fora de Ponta Atual (kW)',state.dem_foraponta_atual);
      if(ehAltPv)h+=pvRow('Fora de Ponta Futura (kW)',state.dem_foraponta_futura);
    } else {
      h+=pvRow(ehAltPv?'Demanda Atual (kW)':'Demanda (kW)',state.dem_atual);
      if(ehAltPv)h+=pvRow('Demanda Futura (kW)',state.dem_futura);
    }
    if(escalonada.length){
      let et=azulPv?'<table class="tbl"><thead><tr><th>Ponta (kW)</th><th>Fora-ponta (kW)</th><th>Início de Uso</th></tr></thead><tbody>'
                   :'<table class="tbl"><thead><tr><th>Demanda Futura (kW)</th><th>Início de Uso</th></tr></thead><tbody>';
      escalonada.forEach(e=>{et+=azulPv?`<tr><td>${e.ponta||'—'}</td><td>${e.foraponta||'—'}</td><td>${e.inicio||'—'}</td></tr>`
                                       :`<tr><td>${e.demanda||'—'}</td><td>${e.inicio||'—'}</td></tr>`;});
      et+='</tbody></table>';
      h+=`<div class="pv-row"><div class="k">Demanda Escalonada</div><div class="v">${et}</div></div>`;
    }
  }
  if(cubiculos.length){
    h+=`<h4>Cubículos da Subestação Compartilhada</h4>`;
    cubiculos.forEach((c,i)=>{
      const rt=CalculoMT.calcularTrafos(c.trafos);
      h+=pvRow(`Cubículo ${i+1} — Nº Instalação`,c.instalacao);
      h+=pvRow(`Cubículo ${i+1} — Transformadores`,`${fmt(rt.potenciaTotal)} kVA / ${rt.quantidadeTotal} un.`);
      h+=pvRow(`Cubículo ${i+1} — Modalidade tarifária`,c.modalidade);
      if(c.modalidade==='Azul'){
        h+=pvRow(`Cubículo ${i+1} — Demanda Ponta (kW)`,c.demandaPonta);
        h+=pvRow(`Cubículo ${i+1} — Demanda Fora de Ponta (kW)`,c.demandaForaPonta);
      } else {
        h+=pvRow(`Cubículo ${i+1} — Demanda (kW)`,c.demanda);
      }
    });
  }
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

/* ===== CEP autopreenchimento ===== */
async function buscarCEP(cep){
  cep=cep.replace(/\D/g,'');
  if(cep.length!==8) return null;
  try{
    const r=await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    if(r.ok){
      const d=await r.json();
      const coords=d.location?.coordinates;
      return {logradouro:d.street||'',bairro:d.neighborhood||'',cidade:d.city||'',uf:d.state||'',
              latitude:coords?.latitude??null,longitude:coords?.longitude??null};
    }
  }catch(_){}
  try{
    const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if(r.ok){const d=await r.json();if(d.erro) return null;
      return {logradouro:d.logradouro||'',bairro:d.bairro||'',cidade:d.localidade||'',uf:d.uf||'',
              latitude:null,longitude:null};}
  }catch(_){}
  return null;
}
function _setField(k,v){const el=$(`[data-k="${k}"]`);if(!el||v==null)return;el.value=v;el.dispatchEvent(new Event('input'));}
async function onCEP(prefixo){
  const st=$(`#cep-status-${prefixo}`);
  if(st){st.textContent='buscando…';st.className='cep-status';}
  const cepEl=$(`[data-k="${prefixo==='uc'?'uc_cep':'ec_cep'}"]`);
  const d=await buscarCEP(cepEl?.value||'');
  if(!d){if(st){st.textContent='CEP não encontrado';st.className='cep-status err';}return;}
  if(st) st.textContent='';
  if(prefixo==='uc'){
    _setField('uc_municipio',d.cidade);_setField('uc_estado',d.uf);
    if(state.localizacao==='Urbana'){_setField('urb_endereco',d.logradouro);_setField('urb_bairro',d.bairro);}
    if(d.latitude!=null) _setField('latitude',d.latitude);
    if(d.longitude!=null) _setField('longitude',d.longitude);
  } else {
    _setField('ec_rua',d.logradouro);_setField('ec_bairro',d.bairro);
    _setField('ec_municipio',d.cidade);_setField('ec_estado',d.uf);
  }
}

/* ===== Exportar PDF ===== */
function exportarPDF(){ window.print(); }

/* ===== Modal Anexo II ===== */
function abrirAnexoII(){$('#modalAnexo').classList.add('show');}
function fecharAnexoII(){$('#modalAnexo').classList.remove('show');}

/* ===== Init ===== */
function aplicarAtividadeDaURL(){
  const v=new URLSearchParams(location.search).get('atividade');
  if(!v || !ATIVIDADES.includes(v)) return;
  const sel=$('#f_atividade');
  sel.value=v;
  sel.dispatchEvent(new Event('change'));
}
document.addEventListener('DOMContentLoaded',()=>{
  fillAtividades(); bindInputs();
  addTrafo(); // começa com 1 linha de trafo
  aplicarAtividadeDaURL();
  // stepper clicável
  $$('.step').forEach((s,i)=>s.addEventListener('click',()=>goTo(i)));
});
