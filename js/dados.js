/* dados.js — listas e referências de assets do formulário */

/* Imagens dos ramais (índice 0–12) → arquivos em assets/ramais/ */
const RAMAL_IMGS = {};
for (let i = 0; i <= 12; i++) {
  RAMAL_IMGS[i] = `assets/ramais/ramal_${String(i).padStart(2, '0')}.png`;
}

/* Imagens dos tipos de subestação → arquivos em assets/subestacoes/ */
const SUBESTACAO_IMGS = {1:'assets/subestacoes/subestacao_1.png',2:'assets/subestacoes/subestacao_2.png',4:'assets/subestacoes/subestacao_4.png',5:'assets/subestacoes/subestacao_5.png',8:'assets/subestacoes/subestacao_8.png'};

/* Descrições resumidas (ND-5.3) para tooltip dos tipos de subestação */
const SUBESTACAO_INFO = {
  1: "Aérea em poste: transformador instalado na rede aérea, para pequenas potências. Medição e proteção na base.",
  2: "Medição e proteção (com ou sem transformação), em alvenaria. Desde 03/07/2023 não se aplica a fornecimento individual em 13,8 kV; desde 01/01/2024 também não em compartilhado 13,8 kV. Permitida em 22/34,5 kV e uso compartilhado.",
  4: "Blindada: cubículo metálico compartimentado, com alívio de pressão e ventilação, abrigado ou ao tempo. Proteção na média tensão, sem transformação. Atende demandas de até 2500 kW.",
  5: "Medição, proteção e transformação, em alvenaria. Até 300 kW, com um transformador de 75 a 300 kVA. Proteção por chave fusível tripolar; medição a 3 elementos na média tensão.",
  8: "Blindada Simplificada (SEBS): subestação blindada metálica para uma única unidade, até 300 kW. Medição na média tensão, proteção por chave fusível tripolar e disjuntor de baixa tensão."
};

/* Atividades (aba Listas, coluna D) */
const ATIVIDADES = ["Administração Condominial","Agroindustrial","Agropecuária Rural","Agropecuária Rural Irrigação","Agropecuária Urbana","Água Esgoto e Saneamento","Aquicultura","Associação e Entidades Filantrópicas","Coletividade Rural","Comercial","Cooperativa Eletrificação Rural","Entidades Beneficentes Educacionais","Escola Agrotécnica","Hospitais","Iluminação em rodovias","Iluminação Pública com Medição","Iluminação Pública sem Medição","Industrial","Irrigação","Irrigação Noturna","Irrigação Noturna SUDENE","Irrigação Noturna SUDENE/IDENE","Irrigante Noturno IDENE","Monitoramento de Transito","Outros Serviços e Outras Atividades","Poder Publico Estadual","Poder Publico Federal","Poder Publico Municipal","Residencial","Residencial rural","Serviço Público Irrigação Noturna","Serviço Público Irrigação Noturna IDENE","Serviço Público Irrigação Noturna SUDENE","Serviço Público Irrigação Rural","Serviço Público Irrigação SUDENE/IDENE","Serviços de Comunicação e Telecomunicação","Serviços de Transporte","Suprim. Outras Concession.","Templos Religiosos","Tração Elétrica","Tração Elétrica Ferroviária"];

/* Dispositivos de partida de motor */
const DISPOSITIVOS = ["Chave Série-Paralelo","Partida Estrela-Triângulo","Chave Compensadora","Resistência/Reatância Primária","Resistência Rotórica","Soft-Starter","Outro"];
