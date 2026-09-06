export const SCENES = [
  {id:'exterior',src:'assets/exterior.png',title:'El último hotel de la carretera.',location:'EXTERIOR / 00:00 AM',description:'El asfalto está mojado. Una luz sigue encendida en recepción. Tu turno empieza al cruzar esa puerta.',alt:'Un viejo hotel de carretera bajo la lluvia nocturna, con luces cálidas en la entrada y un coche en el estacionamiento.'},
  {id:'reception',src:'assets/reception.png',title:'Todo parece estar en orden.',location:'PLANTA BAJA / RECEPCIÓN',description:'Madera gastada, un registro de huéspedes y un teléfono que todavía no ha sonado. El último lugar que parece seguro.',alt:'Recepción vacía con un mostrador de madera, casillero de llaves, teléfono y lámpara cálida.'},
  {id:'corridor',src:'assets/corridor.png',title:'Ya has pasado por aquí.',location:'PISO 02 / PASILLO',description:'La misma alfombra. Las mismas lámparas. Pero la puerta del fondo está un poco más lejos que antes.',alt:'Un largo pasillo de hotel vacío, con alfombra antigua, paredes estampadas y luces que se pierden en la oscuridad.'},
  {id:'security',src:'assets/security.png',title:'No apartes la mirada.',location:'PLANTA BAJA / VIGILANCIA',description:'Seis pantallas. Ningún huésped. Por un momento jurarías que alguien se ha detenido frente a una cámara.',alt:'Oficina de vigilancia con seis monitores CRT, una lámpara encendida y una silla vacía.'},
  {id:'guestroom',src:'assets/guestroom.png',title:'Alguien estuvo aquí.',location:'PISO 02 / HABITACIÓN',description:'Las cortinas están cerradas y la televisión apagada. Hay algo en esta habitación que te resulta demasiado familiar.',alt:'Una habitación de hotel vacía con cama antigua, manta de tonos burdeos, lámpara cálida y un televisor CRT.'},
  {id:'room247',src:'assets/room-247.png',title:'La habitación que no existe.',location:'PISO 02 / 247',description:'No aparece en el registro. La llamada viene de aquí. Al otro lado, el sonido de unas llaves rompe el silencio.',alt:'Puerta de madera con el número 247, una lámpara tenue y una línea de luz rojiza bajo el umbral.'}
];

export function sceneIndex(value) {
  if(typeof value==='number')return Number.isFinite(value)?((Math.trunc(value)%SCENES.length)+SCENES.length)%SCENES.length:-1;
  return SCENES.findIndex(scene=>scene.id===value);
}
