/**
 * Amenity Assessment Helper Functions
 * Updated to use correct Geoapify JSON structure
 */

/**
 * 1. 🌐 INTERNET ACCESS ASSESSMENT (35% - Most Important)
 * Menggunakan properties.facilities, datasource.raw untuk WiFi
 */
function assessInternetAccess(facilities, datasourceRaw, categories) {
  let score = 0;
  let confidence = 0;
  let reasoning = '';
  let features = [];

  // TIER 1: Confirmed facilities data (Highest confidence)
  if (facilities.internet) {
    if (facilities.internet === 'free' || facilities.internet === 'yes') {
      score = 95;
      confidence = 100;
      reasoning = 'Confirmed free internet access';
      features.push('FREE_INTERNET');
    } else if (facilities.internet === 'paid') {
      score = 75;
      confidence = 90;
      reasoning = 'Confirmed paid internet access';
      features.push('PAID_INTERNET');
    }
  } else if (facilities.wifi === 'free' || facilities.wifi === 'yes') {
    score = 90;
    confidence = 95;
    reasoning = 'Confirmed free WiFi';
    features.push('FREE_WIFI');
  } else if (facilities.wifi === 'paid') {
    score = 70;
    confidence = 85;
    reasoning = 'Confirmed paid WiFi';
    features.push('PAID_WIFI');
  }

  // TIER 2: datasource.raw indicators
  if (score === 0 && datasourceRaw) {
    if (
      datasourceRaw.amenity &&
      (datasourceRaw.amenity.includes('wifi') ||
        datasourceRaw.amenity.includes('internet') ||
        datasourceRaw.amenity.includes('wlan'))
    ) {
      score = 85;
      confidence = 80;
      reasoning = 'WiFi mentioned in venue data';
      features.push('DATASOURCE_WIFI');
    }

    if (datasourceRaw.shop === 'computer' || datasourceRaw.office === 'coworking') {
      score = Math.max(score, 80);
      confidence = Math.max(confidence, 75);
      reasoning = 'Tech/coworking venue likely has internet';
      features.push('TECH_VENUE');
    }
  }

  // TIER 3: Category-based estimation
  if (score === 0) {
    const internetLikelyCategories = {
      coworking: { score: 95, confidence: 85 },
      library: { score: 90, confidence: 80 },
      hotel: { score: 85, confidence: 75 },
      cafe: { score: 80, confidence: 70 },
      coffee: { score: 85, confidence: 75 },
      business: { score: 75, confidence: 65 },
      mall: { score: 70, confidence: 60 },
      restaurant: { score: 60, confidence: 50 }
    };

    for (const [category, values] of Object.entries(internetLikelyCategories)) {
      if (categories.some((cat) => cat.toLowerCase().includes(category))) {
        score = values.score;
        confidence = values.confidence;
        reasoning = `${category} typically has internet access`;
        features.push(`CATEGORY_${category.toUpperCase()}`);
        break;
      }
    }
  }

  // Fallback if no indicators found
  if (score === 0) {
    score = 35;
    confidence = 20;
    reasoning = 'No internet indicators found';
    features.push('NO_INDICATORS');
  }

  return { score, confidence, reasoning, features };
}

/**
 * 2. 🪑 PHYSICAL COMFORT ASSESSMENT (25%)
 * Menggunakan facilities untuk seating, tables, air conditioning, etc.
 */
function assessPhysicalComfort(facilities, datasourceRaw, categories) {
  let score = 0;
  let confidence = 60;
  let features = [];
  let reasoning = '';

  // SEATING & TABLES (40% of physical comfort)
  let seatingScore = 0;
  if (facilities.seating === 'outdoor' || facilities.seating === 'indoor') {
    seatingScore = 35;
    features.push('CONFIRMED_SEATING');
  }
  if (facilities.tables === 'yes' || facilities.tables === true) {
    seatingScore = 40;
    features.push('CONFIRMED_TABLES');
  }
  if (facilities.seating && facilities.tables) {
    seatingScore = 40; // Full seating score
    features.push('COMPLETE_SEATING_SETUP');
  }

  // CLIMATE CONTROL (30% of physical comfort)
  let climateScore = 0;
  if (facilities.air_conditioning === 'yes' || facilities.air_conditioning === true) {
    climateScore = 30;
    features.push('AIR_CONDITIONING');
  } else if (facilities.heating === 'yes') {
    climateScore = 20;
    features.push('HEATING');
  } else if (facilities.fan === 'yes') {
    climateScore = 15;
    features.push('FAN');
  }

  // LIGHTING (15% of physical comfort)
  let lightingScore = 0;
  if (facilities.lighting === 'good' || facilities.lighting === 'natural') {
    lightingScore = 15;
    features.push('GOOD_LIGHTING');
  }

  // QUIET ENVIRONMENT (15% of physical comfort)
  let quietScore = 0;
  if (facilities.quiet === 'yes' || facilities.quiet === true) {
    quietScore = 15;
    features.push('QUIET_ENVIRONMENT');
  }

  // Category-based defaults if no explicit data
  if (seatingScore === 0) {
    if (categories.some((cat) => cat.includes('cafe') || cat.includes('restaurant'))) {
      seatingScore = 30; // Cafes/restaurants have seating
      features.push('DINING_SEATING_ASSUMED');
    } else if (categories.some((cat) => cat.includes('coworking') || cat.includes('library'))) {
      seatingScore = 35; // Work spaces have good seating
      features.push('WORK_SEATING_ASSUMED');
    }
  }

  if (climateScore === 0) {
    if (categories.some((cat) => cat.includes('mall') || cat.includes('hotel'))) {
      climateScore = 25; // Malls/hotels usually have AC
      features.push('AC_ASSUMED');
    }
  }

  score = seatingScore + climateScore + lightingScore + quietScore;

  // Ensure minimum score
  if (score < 25) {
    score = 25;
    features.push('MINIMUM_COMFORT');
  }

  reasoning = `Physical comfort: ${features.join(', ')}`;

  return { score, confidence, reasoning, features };
}

/**
 * 3. ♿ ACCESSIBILITY ASSESSMENT (15%)
 */
function assessAccessibilityFeatures(facilities, categories) {
  let score = 0;
  let confidence = 50;
  let features = [];

  // WHEELCHAIR ACCESS (50% of accessibility)
  if (
    facilities.wheelchair === 'yes' ||
    facilities.wheelchair === true ||
    facilities.wheelchair === 'limited'
  ) {
    score += 50;
    features.push('WHEELCHAIR_ACCESS');
    confidence = 90;
  } else if (facilities.wheelchair === 'no') {
    score += 0; // Explicitly not accessible
    features.push('NO_WHEELCHAIR_ACCESS');
    confidence = 85;
  }

  // ELEVATOR (25% of accessibility)
  if (facilities.elevator === 'yes' || facilities.elevator === true) {
    score += 25;
    features.push('ELEVATOR');
  }

  // PARKING (15% of accessibility)
  if (
    facilities.parking === 'yes' ||
    facilities.parking === true ||
    facilities.parking === 'free' ||
    facilities.parking === 'paid'
  ) {
    score += 15;
    features.push('PARKING_AVAILABLE');
  }

  // ENTRANCE ACCESS (10% of accessibility)
  if (facilities.entrance === 'main' || facilities.entrance === 'side') {
    score += 10;
    features.push('CLEAR_ENTRANCE');
  }

  // Category-based assumptions
  if (score === 0) {
    const accessibleVenues = ['hotel', 'mall', 'library', 'coworking', 'business'];
    if (categories.some((cat) => accessibleVenues.some((venue) => cat.includes(venue)))) {
      score = 60; // Assume basic accessibility
      features.push('VENUE_TYPE_ACCESSIBLE');
      confidence = 40;
    } else {
      score = 40; // Neutral assumption
      features.push('BASIC_ACCESS_ASSUMED');
      confidence = 30;
    }
  }

  const reasoning = `Accessibility: ${features.join(', ')}`;

  return { score, confidence, reasoning, features };
}

/**
 * 4. 💳 PAYMENT OPTIONS ASSESSMENT (15%)
 * Menggunakan properties.payment_options yang benar
 */
function assessPaymentOptionsCorrect(paymentOptions, datasourceRaw) {
  let score = 0;
  let confidence = 70;
  let features = [];

  // Check payment_options object
  if (paymentOptions && typeof paymentOptions === 'object') {
    if (paymentOptions.credit_cards === true || paymentOptions.cards === true) {
      score += 40;
      features.push('CREDIT_CARDS');
    }

    if (paymentOptions.contactless === true || paymentOptions.nfc === true) {
      score += 30;
      features.push('CONTACTLESS_PAYMENT');
    }

    if (paymentOptions.mobile_payment === true || paymentOptions.digital === true) {
      score += 20;
      features.push('MOBILE_PAYMENT');
    }

    if (paymentOptions.cash === true) {
      score += 10;
      features.push('CASH_ACCEPTED');
    }
  }

  // Check datasource.raw for payment info
  if (score === 0 && datasourceRaw) {
    if (datasourceRaw.payment) {
      if (datasourceRaw.payment.includes('card') || datasourceRaw.payment.includes('visa')) {
        score += 50;
        features.push('CARDS_FROM_RAW_DATA');
      }
      if (datasourceRaw.payment.includes('contactless') || datasourceRaw.payment.includes('nfc')) {
        score += 30;
        features.push('CONTACTLESS_FROM_RAW_DATA');
      }
    }
  }

  // Default assumption if no payment data
  if (score === 0) {
    score = 50; // Assume basic payment options
    features.push('BASIC_PAYMENT_ASSUMED');
    confidence = 30;
  }

  const reasoning = `Payment: ${features.join(', ')}`;

  return { score, confidence, reasoning, features };
}

/**
 * 5. ℹ️ OPERATIONAL INFO ASSESSMENT (10%)
 */
function assessOperationalInfo(openingHours, contact, website) {
  let score = 0;
  let confidence = 80;
  let features = [];

  // OPENING HOURS (40% of operational info)
  if (openingHours && typeof openingHours === 'string' && openingHours.length > 0) {
    score += 40;
    features.push('OPENING_HOURS_AVAILABLE');
  } else if (openingHours && typeof openingHours === 'object' && openingHours.periods) {
    score += 40;
    features.push('DETAILED_OPENING_HOURS');
  }

  // CONTACT INFO (35% of operational info)
  if (contact) {
    if (contact.phone) {
      score += 20;
      features.push('PHONE_CONTACT');
    }
    if (contact.email) {
      score += 15;
      features.push('EMAIL_CONTACT');
    }
  }

  // WEBSITE (25% of operational info)
  if (website && website.length > 0) {
    score += 25;
    features.push('WEBSITE_AVAILABLE');
  }

  // Ensure minimum operational score
  if (score < 30) {
    score = 30;
    features.push('BASIC_OPERATIONAL_INFO');
    confidence = 40;
  }

  const reasoning = `Operational: ${features.join(', ')}`;

  return { score, confidence, reasoning, features };
}

// (Dihapus: Utility untuk deduplikasi response, lakukan di controller/job utama)

export {
  assessInternetAccess,
  assessPhysicalComfort,
  assessAccessibilityFeatures,
  assessPaymentOptionsCorrect,
  assessOperationalInfo
};