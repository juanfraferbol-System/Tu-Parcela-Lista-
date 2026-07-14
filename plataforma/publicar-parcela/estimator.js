const round=value=>Math.max(100000,Math.round(value/100000)*100000);
const confidenceFor=data=>{const signals=['comuna','superficie','rol','agua','luz','acceso','topografia','distanciaCiudad'].filter(key=>String(data[key]||'').trim()).length;return signals>=7?'Alta':signals>=4?'Media':'Baja';};
export function estimateParcel(data={}){
  const surface=Math.max(0,Number(data.superficie)||0);const entered=Math.max(0,Number(data.price)||0);
  let perM2=2400;if(/metropolitana|valpara[ií]so|biob[ií]o/i.test(data.region||''))perM2*=1.2;if(/conectada|pozo|vertiente/i.test(data.agua||''))perM2*=1.08;if(/conectada|factibilidad/i.test(data.luz||''))perM2*=1.06;if(/pavimento|ripio/i.test(data.acceso||''))perM2*=1.07;if(/plana|mixta/i.test(data.topografia||''))perM2*=1.04;
  const calculated=surface?surface*perM2:0;const recommended=round(calculated&&entered?(calculated*.55+entered*.45):(calculated||entered||15000000));
  const scenarios=[
    {id:'rapida',name:'Venta más rápida',price:round(recommended*.9),time:'2 a 5 meses',interest:'Alto'},
    {id:'recomendada',name:'Precio recomendado',price:recommended,time:'4 a 8 meses',interest:'Medio a alto'},
    {id:'superior',name:'Precio superior',price:round(recommended*1.12),time:'7 a 14 meses',interest:'Selectivo'}
  ];
  return {range:[round(recommended*.88),round(recommended*1.12)],recommended,confidence:confidenceFor(data),time:'4 a 10 meses',scenarios,disclaimer:'Esta es una estimación referencial y no corresponde a una tasación bancaria, pericial ni a una garantía de venta.'};
}
