export const PATENTES = [
  { name: "Prata 1", image: "prata-1.png" },
  { name: "Prata 2", image: "prata-2.png" },
  { name: "Prata 3", image: "prata-3.png" },
  { name: "Prata 4", image: "prata-4.png" },
  { name: "Prata de Elite", image: "prata-de-elite.png" },
  { name: "Prata de Elite Mestre", image: "prata-de-elite-mestre.png" },
  { name: "Ouro 1", image: "ouro-1.png" },
  { name: "Ouro 2", image: "ouro-2.png" },
  { name: "Ouro 3", image: "ouro-3.png" },
  { name: "Ouro Mestre", image: "ouro-mestre.png" },
  { name: "AK 1", image: "ak-1.png" },
  { name: "AK 2", image: "ak-2.png" },
  { name: "AK Cruzada", image: "ak-cruzada.png" },
  { name: "Águia 1", image: "aguia-1.png" },
  { name: "Águia 2", image: "aguia-2.png" },
  { name: "Xerife", image: "xerife.png" },
  { name: "Supremo", image: "supremo.png" },
  { name: "Global", image: "global.png" }
];

export function getRankFromKD(kd: number): { name: string, index: number, image: string } {
  if (kd >= 2.0) {
    return { ...PATENTES[17], index: 17 };
  }
  
  if (kd < 0) {
    return { ...PATENTES[0], index: 0 };
  }

  const index = Math.floor(kd * 8.5); // 17 / 2 = 8.5
  return { ...PATENTES[index], index };
}
