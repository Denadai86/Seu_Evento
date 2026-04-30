//src/components/BingoCardPDF.tsx

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

interface BingoCard {
  id: string;
  shortId: string;
  matrix: {
    B: number[];
    I: number[];
    N: number[];
    G: number[];
    O: number[];
  };
}

interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string; // Adicionado para receber a imagem do banco
}

interface BingoCardPDFProps {
  cards: BingoCard[];
  eventName: string;
  sponsors: Sponsor[];
  contractorLogo?: string;
}

const COLORS = {
  border: '#1f2937',
  black: '#111111',
  green: '#10b981',
  bg: '#ffffff',
  free: '#f8fafc',
  sponsor: '#f1f5f9',
};

const CELL_HEIGHT = 52;
const HEADER_HEIGHT = 34;

const styles = StyleSheet.create({
  page: {
    padding: 18,
    backgroundColor: COLORS.bg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  /* CARTELA */
  card: {
    width: '48.5%',
    height: '100%',
    borderWidth: 4,
    borderColor: COLORS.border,
    padding: 8,
  },

  cardInner: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 10,
    flexDirection: 'column',
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 8,
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.green,
  },

  titleArea: {
    flex: 1,
    paddingRight: 8,
  },

  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
  },

  auth: {
    marginTop: 2,
    fontSize: 6.5,
    color: '#555',
  },

  cardId: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.black,
  },

  /* GRID */
  gridWrapper: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },

  grid: {
    width: '100%',
    flexDirection: 'row',
  },

  column: {
    flex: 1,
  },

  headerCell: {
    height: HEADER_HEIGHT,
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  cell: {
    height: CELL_HEIGHT,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  freeCell: {
    height: CELL_HEIGHT,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.free,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cellText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },

  freeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.green,
  },

  logo: {
    width: 28,
    height: 28,
    objectFit: 'contain',
  },

  /* FOOTER */
  footer: {
    marginTop: 'auto',
    backgroundColor: COLORS.sponsor,
    paddingVertical: 8,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  /* NOVOS ESTILOS PARA OS PATROCINADORES COM LOGO */
  sponsorItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    marginBottom: 2,
  },

  sponsorLogo: {
    width: 25,
    height: 25,
    marginBottom: 3,
    objectFit: 'contain',
  },

  sponsor: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#334155',
  },
});

const LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

/* ========================================================= */
/* CARD */
/* ========================================================= */

function BingoCardView({
  card,
  eventName,
  sponsors,
  contractorLogo,
}: {
  card: BingoCard;
  eventName: string;
  sponsors: Sponsor[];
  contractorLogo?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInner}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.titleArea}>
            <Text style={styles.title}>{eventName}</Text>

            <Text style={styles.auth}>
              AUTENTICAÇÃO: {card.id.slice(-8).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.cardId}>ID: {card.shortId}</Text>
        </View>

        {/* GRID */}
        <View style={styles.gridWrapper}>
          <View style={styles.grid}>
            {LETTERS.map((letter) => (
              <View key={letter} style={styles.column}>
                {/* TOPO */}
                <View style={styles.headerCell}>
                  <Text style={styles.headerText}>{letter}</Text>
                </View>

                {/* NUMEROS */}
                {card.matrix[letter].map((num, rowIndex) => {
                  const isFree = letter === 'N' && rowIndex === 2;

                  return (
                    <View
                      key={`${letter}-${rowIndex}`}
                      style={isFree ? styles.freeCell : styles.cell}
                    >
                      {isFree ? (
                        contractorLogo ? (
                          <Image src={contractorLogo} style={styles.logo} />
                        ) : (
                          <Text style={styles.freeText}>★</Text>
                        )
                      ) : (
                        <Text style={styles.cellText}>{num}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* FOOTER ATUALIZADO */}
        <View style={styles.footer}>
          {sponsors.map((s) => (
            <View key={s.id} style={styles.sponsorItem}>
              {s.logoUrl && (
                <Image
                  /* A mágica do redimensionamento direto na URL */
                  src={s.logoUrl.replace('/upload/', '/upload/c_pad,w_100,h_100/')}
                  style={styles.sponsorLogo}
                />
              )}
              <Text style={styles.sponsor}>{s.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ========================================================= */
/* MAIN */
/* ========================================================= */

export const BingoCardPDF = ({
  cards,
  eventName,
  sponsors,
  contractorLogo,
}: BingoCardPDFProps) => {
  const pages: BingoCard[][] = [];

  for (let i = 0; i < cards.length; i += 2) {
    pages.push(cards.slice(i, i + 2));
  }

  return (
    <Document>
      {pages.map((pair, index) => (
        <Page
          key={index}
          size="A4"
          orientation="landscape"
          style={styles.page}
        >
          {pair.map((card) => (
            <BingoCardView
              key={card.id}
              card={card}
              eventName={eventName}
              sponsors={sponsors}
              contractorLogo={contractorLogo}
            />
          ))}
        </Page>
      ))}
    </Document>
  );
};