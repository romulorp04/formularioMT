/* dados.js — listas e referências de assets do formulário */

/* Imagens dos ramais (índice 0–12) → arquivos em assets/ramais/ */
const RAMAL_IMGS = {};
for (let i = 0; i <= 12; i++) {
  RAMAL_IMGS[i] = `assets/ramais/ramal_${String(i).padStart(2, '0')}.png`;
}

/* Imagens dos tipos de subestação → arquivos em assets/subestacoes/ */
const SUBESTACAO_IMGS = {1:'assets/subestacoes/subestacao_1.png',2:'assets/subestacoes/subestacao_2.png',4:'assets/subestacoes/subestacao_4.png',5:'assets/subestacoes/subestacao_5.png',8:'assets/subestacoes/subestacao_8.png'};

/* Atividades (aba Listas, coluna D) */
const ATIVIDADES = ["Administração Condominial","Agroindustrial","Agropecuária Rural","Agropecuária Rural Irrigação","Agropecuária Urbana","Água Esgoto e Saneamento","Aquicultura","Associação e Entidades Filantrópicas","Coletividade Rural","Comercial","Cooperativa Eletrificação Rural","Entidades Beneficentes Educacionais","Escola Agrotécnica","Hospitais","Iluminação em rodovias","Iluminação Pública com Medição","Iluminação Pública sem Medição","Industrial","Irrigação","Irrigação Noturna","Irrigação Noturna SUDENE","Irrigação Noturna SUDENE/IDENE","Irrigante Noturno IDENE","Monitoramento de Transito","Outros Serviços e Outras Atividades","Poder Publico Estadual","Poder Publico Federal","Poder Publico Municipal","Residencial","Residencial rural","Serviço Público Irrigação Noturna","Serviço Público Irrigação Noturna IDENE","Serviço Público Irrigação Noturna SUDENE","Serviço Público Irrigação Rural","Serviço Público Irrigação SUDENE/IDENE","Serviços de Comunicação e Telecomunicação","Serviços de Transporte","Suprim. Outras Concession.","Templos Religiosos","Tração Elétrica","Tração Elétrica Ferroviária"];

/* Dispositivos de partida de motor */
const DISPOSITIVOS = ["Chave Série-Paralelo","Partida Estrela-Triângulo","Chave Compensadora","Resistência/Reatância Primária","Resistência Rotórica","Soft-Starter","Outro"];
