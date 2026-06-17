/* ===== Estado global ===== */
const state = {};

/* ===== util ===== */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const fmt = (n,d=0)=> (n==null||isNaN(n))?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});

/* ===== Bind genérico de campos (data-k) ===== */
function bindInputs(){
  $$('[data-k]').forEach(el=>{
    if(el.type==='checkbox'){
      el.addEventListener('change',()=>{state[el.dataset.k]=el.checked;});
    } else {
      const k=el.dataset.k;
      el.addEventListener('input',()=>{state[k]=el.value;});
      el.addEventListener('change',()=>{state[k]=el.value;});
    }
  });
}

/* ===== Coordenadas / UTM (mesma lógica do formulário MT) ===== */
const LIM = { LAT_MIN:-22.9, LAT_MAX:-14.23, LON_MIN:-51.04, LON_MAX:-39.85 };
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
function validarCoordenadas(latitude,longitude){
  const lat=parseFloat(latitude),lon=parseFloat(longitude);
  const erros=[];
  if(!isNaN(lat)&&(lat<LIM.LAT_MIN||lat>LIM.LAT_MAX)) erros.push('Latitude fora dos limites de Minas Gerais (−22,9 a −14,23).');
  if(!isNaN(lon)&&(lon<LIM.LON_MIN||lon>LIM.LON_MAX)) erros.push('Longitude fora dos limites de Minas Gerais (−51,04 a −39,85).');
  return erros.length ? {ok:false,msg:erros.join(' ')} : {ok:true,msg:''};
}
function onCoord(){
  state.latitude=$('[data-k=latitude]').value; state.longitude=$('[data-k=longitude]').value;
  const lat=parseFloat(state.latitude), lon=parseFloat(state.longitude);
  if(!isNaN(lat)&&!isNaN(lon)){
    const u=latLonParaUTM(lat,lon);
    $('[data-k=utm]').value=`${u.zona}${_utmBandLetter(lat)} E:${u.easting} N:${u.northing}`;
  }
  const r=validarCoordenadas(state.latitude,state.longitude);
  $('#coordAlert').innerHTML = r.ok ? '' : alertHTML('err',r.msg);
}

/* ===== Validação de e-mail / telefone ===== */
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
  if(!el.value){el.classList.remove('invalid');if(sp){sp.textContent='';sp.className='cep-status';}return;}
  if(valido){el.classList.remove('invalid');if(sp)sp.textContent='';}
  else{el.classList.add('invalid');if(sp){sp.textContent=msgErr;sp.className='cep-status err';}}
}
function onEmail(k){const el=$(`[data-k="${k}"]`);_feedbackCampo(el,`status-${k}`,_validarEmail(el.value),'e-mail inválido');}
function onTel(k){const el=$(`[data-k="${k}"]`);_feedbackCampo(el,`status-${k}`,_validarTelefone(el.value),'telefone inválido');}
function maskCelular(el){
  const d=el.value.replace(/\D/g,'').slice(0,11);
  const ddd=d.slice(0,2), rest=d.slice(2);
  let out=d.length?'('+ddd:'';
  if(d.length>=2) out+=') ';
  if(rest.length<=4) out+=rest;
  else if(d.length<=10) out+=rest.slice(0,4)+'-'+rest.slice(4);
  else out+=rest.slice(0,5)+'-'+rest.slice(5,9);
  el.value=out;
}

/* ===== Lotes por área ===== */
function recalcLotes(){
  const a=parseInt($('[data-k=lote_400]').value)||0;
  const b=parseInt($('[data-k=lote_400_600]').value)||0;
  const c=parseInt($('[data-k=lote_600]').value)||0;
  state.lote_400=a; state.lote_400_600=b; state.lote_600=c;
  $('#loteTotal').textContent=fmt(a+b+c);
}

/* ===== Alerta ===== */
function alertHTML(tipo,msg){
  const icon = tipo==='err'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  return `<div class="alert ${tipo}">${icon}<div>${msg}</div></div>`;
}

/* ===== Prévia ===== */
function pvRow(k,v){const empty=(v==null||v==='');return `<div class="pv-row"><div class="k">${k}</div><div class="v ${empty?'empty':''}">${empty?'—':v}</div></div>`;}
function renderPreview(){
  let h=`<div class="pv-title">SOLICITAÇÃO INICIAL DE FORNECIMENTO — LOTEAMENTOS E CHACREAMENTOS</div><div class="pv-section">`;
  h+=`<h4>1. Dados do Empreendimento</h4>`;
  h+=pvRow('Cliente / Empreendimento',state.cliente)+pvRow('Município',state.municipio)+pvRow('Estado',state.estado);
  h+=pvRow('Tipo de solicitante',state.tipoSolicitante)+pvRow('Tipo',state.tipo);
  h+=pvRow('Mês/ano de entrada de carga',state.mesAno);
  h+=`<h4>2. Localização</h4>`;
  h+=pvRow('Coordenadas',[state.latitude,state.longitude].filter(Boolean).join(' , '));
  h+=pvRow('UTM',state.utm)+pvRow('Local',state.local);
  h+=`<h4>3. Contato</h4>`;
  h+=pvRow('E-mail',state.email)+pvRow('Celular',state.celular);
  h+=`<h4>4. Quantidade de Lotes por Área</h4>`;
  h+=pvRow('Até 400 m²',state.lote_400)+pvRow('De 400 a 600 m²',state.lote_400_600)+pvRow('Acima de 600 m²',state.lote_600);
  h+=pvRow('Total de lotes',(parseInt(state.lote_400)||0)+(parseInt(state.lote_400_600)||0)+(parseInt(state.lote_600)||0));
  h+=`<h4>5. Declaração</h4>`;
  h+=pvRow('Declaração firmada',state.declaracao?'Sim':'Não');
  h+=`</div>`;
  $('#previewContent').innerHTML=h;
}
function exportarPDF(){ renderPreview(); window.print(); }

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded',()=>{
  bindInputs();
});
