// src/lib/pix.ts

/**
 * Gera um Payload PIX válido (BR Code) para QR Code
 * @param pixKey A chave PIX do recebedor
 * @param merchantName Nome da ONG/Igreja (Máx 25 chars)
 * @param merchantCity Cidade (Máx 15 chars)
 * @param amount Valor da cobrança (opcional)
 */
export function generatePixPayload(pixKey: string, merchantName: string, merchantCity: string, amount?: number): string {
  const sanitize = (str: string, maxLen: number) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, maxLen).trim();

  const name = sanitize(merchantName, 25) || "RECEBEDOR";
  const city = sanitize(merchantCity, 15) || "CIDADE";
  
  let payload = "000201"; // Payload Format Indicator
  
  // Merchant Account Information
  const gui = "0014br.gov.bcb.pix";
  const keyInfo = `01${pixKey.length.toString().padStart(2, '0')}${pixKey}`;
  const accountInfo = `${gui}${keyInfo}`;
  payload += `26${accountInfo.length.toString().padStart(2, '0')}${accountInfo}`;
  
  payload += "52040000"; // Merchant Category Code
  payload += "5303986";  // Transaction Currency (BRL)
  
  // Transaction Amount
  if (amount && amount > 0) {
    const amtStr = amount.toFixed(2);
    payload += `54${amtStr.length.toString().padStart(2, '0')}${amtStr}`;
  }
  
  payload += "5802BR"; // Country Code
  
  // Merchant Name
  payload += `59${name.length.toString().padStart(2, '0')}${name}`;
  // Merchant City
  payload += `60${city.length.toString().padStart(2, '0')}${city}`;
  
  // Additional Data Field Template (TxId)
  payload += "62070503***"; 
  
  // CRC16 (Sempre no final)
  payload += "6304";
  
  // Função para calcular CRC16-CCITT
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  
  const crcHex = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return payload + crcHex;
}