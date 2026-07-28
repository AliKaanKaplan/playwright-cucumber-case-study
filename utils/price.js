function parsePrice(text) {
  if (/ücretsiz|bedava/i.test(text)) {
    return 0;
  }

  const cleanedPrice = text
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

  const price = Number(cleanedPrice);

  if (Number.isNaN(price)) {
    throw new Error(`parsePrice: could not parse price from "${text}"`);
  }

  return price;
}

module.exports = { parsePrice };