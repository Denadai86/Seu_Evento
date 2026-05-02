import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { styles } from "./pdf/styles";

export interface BingoCard {
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

export interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string | null; // ✅ agora aceita null
}

interface BingoCardPDFProps {
  cards: BingoCard[];
  eventName: string;
  sponsors: Sponsor[];
  contractorLogo?: string;
}

const LETTERS = ["B", "I", "N", "G", "O"] as const;

const getOptimizedLogo = (url?: string | null) => {
  if (!url) return undefined;

  if (url.includes("cloudinary.com")) {
    return url.replace("/upload/", "/upload/c_pad,w_100,h_100/");
  }

  return url;
};

function BingoCardView({
  card,
  eventName,
  sponsors,
  contractorLogo,
}: Omit<BingoCardPDFProps, "cards"> & { card: BingoCard }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInner}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{eventName}</Text>
            <Text style={styles.auth}>
              AUTENTICAÇÃO: {card.id.slice(-8).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.cardId}>ID: {card.shortId}</Text>
        </View>

        {/* GRID */}
        <View style={styles.grid}>
          {LETTERS.map((letter) => (
            <View key={letter} style={styles.column}>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>{letter}</Text>
              </View>

              {card.matrix[letter].map((num, i) => {
                const isFree = letter === "N" && i === 2;

                return (
                  <View
                    key={`${letter}-${i}`}
                    style={isFree ? styles.freeCell : styles.cell}
                  >
                    {isFree ? (
                      contractorLogo ? (
                        <Image
                          src={getOptimizedLogo(contractorLogo)}
                          style={styles.logo}
                        />
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

        {/* FOOTER */}
        <View style={styles.footer}>
          {sponsors.map((s) => (
            <View key={s.id} style={styles.sponsorItem}>
              {s.logoUrl && (
                <Image
                  src={getOptimizedLogo(s.logoUrl)}
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
        <Page key={index} size="A4" orientation="landscape" style={styles.page}>
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