import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#ffffff',
  },

  card: {
    flex: 1,
    padding: 10,
  },

  cardInner: {
    border: '2px solid #1f2937',
    borderRadius: 6,
    padding: 10,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  titleArea: {
    flexDirection: 'column',
  },

  title: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  auth: {
    fontSize: 8,
    color: '#555',
  },

  cardId: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  gridWrapper: {
    marginTop: 6,
  },

  grid: {
    flexDirection: 'row',
  },

  column: {
    flex: 1,
    alignItems: 'center',
  },

  headerCell: {
    border: '1px solid #1f2937',
    width: '100%',
    alignItems: 'center',
    padding: 2,
    backgroundColor: '#f1f5f9',
  },

  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  cell: {
    border: '1px solid #ccc',
    width: '100%',
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  freeCell: {
    border: '1px solid #ccc',
    width: '100%',
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },

  cellText: {
    fontSize: 10,
  },

  freeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  logo: {
    width: 16,
    height: 16,
  },

  footer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },

  sponsorItem: {
    alignItems: 'center',
    marginRight: 6,
  },

  sponsorLogo: {
    width: 20,
    height: 20,
    marginBottom: 2,
  },

  sponsor: {
    fontSize: 6,
    textAlign: 'center',
  },
});