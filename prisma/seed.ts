import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Função utilitária Sênior: gera 5 números únicos e aleatórios para cada coluna
function generateColumn(min: number, max: number, count: number) {
  const numbers = new Set<number>()
  while (numbers.size < count) {
    numbers.add(Math.floor(Math.random() * (max - min + 1)) + min)
  }
  return Array.from(numbers).sort((a, b) => a - b)
}

async function main() {
  console.log('🧹 Limpando banco de dados...')
  await prisma.card.deleteMany()
  await prisma.sponsor.deleteMany()
  await prisma.event.deleteMany()
  await prisma.organization.deleteMany()

  console.log('⛪ Criando Paróquia...')
  const org = await prisma.organization.create({
    data: { name: 'Paróquia São José' },
  })

  console.log('🎉 Criando Evento...')
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      name: 'Bingo Beneficente de Páscoa',
      date: new Date(),
      ticketPrice: 15.00,
      drawnNumbers: [], 
      status: 'LIVE',
    },
  })

  console.log('🤝 Criando Patrocinadores...')
  await prisma.sponsor.createMany({
    data: [
      { eventId: event.id, name: 'Padaria do João', amount: 150 },
      { eventId: event.id, name: 'Mercado Central', amount: 300 },
      { eventId: event.id, name: 'Farmácia Saúde', amount: 100 },
    ],
  })

  console.log('🎟️ Gerando 10 Cartelas Mágicas...')
  for (let i = 1; i <= 10; i++) {
    const shortId = `A00${i}` // Gera IDs como A001, A002...
    
    const matrix = {
      B: generateColumn(1, 15, 5),
      I: generateColumn(16, 30, 5),
      N: generateColumn(31, 45, 5), 
      G: generateColumn(46, 60, 5),
      O: generateColumn(61, 75, 5),
    }

    await prisma.card.create({
      data: {
        eventId: event.id,
        shortId,
        matrix,
        isSold: true, 
      },
    })
  }

  console.log('✅ SEED FINALIZADO COM SUCESSO! Banco populado e pronto.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })