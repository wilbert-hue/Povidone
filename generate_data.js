const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

// Geography: United States only, with sub-regions
const regions = {
  "United States": ["Northeast", "Midwest", "South", "Southwest", "West"]
};

// New segment definitions with market share splits (proportions within each segment type)
const segmentTypes = {
  "By Prescription Type": {
    "Prescription (Rx)": 0.58,
    "Over-the-Counter (OTC)": 0.42
  },
  "By Indication": {
    "Allergic Rhinitis": 0.28,
    "Non-Allergic Rhinitis": 0.18,
    "Chronic Rhinosinusitis / Sinusitis": 0.20,
    "Nasal Congestion (Cold / Flu)": 0.16,
    "Infection Prevention / Antiviral Protection": 0.12,
    "Other Indications (Pre/Post-Operative Nasal Antisepsis, among others)": 0.06
  },
  "By Distribution Channel": {
    "Retail Pharmacies": 0.38,
    "Hospital Pharmacies": 0.28,
    "Online Pharmacies": 0.20,
    "Supermarkets & Hypermarkets": 0.14
  },
  "By End User": {
    "Hospitals": 0.35,
    "Ambulatory Surgical Centers": 0.25,
    "ENT Clinics": 0.28,
    "Others (Long-term Care Facilities, Homecare Settings, among others)": 0.12
  }
};

// Base values (USD Million) for 2021 - total US market
// US Povidone-Iodine nasal spray market ~$280M in 2021, growing ~7.5% CAGR
const regionBaseValues = {
  "United States": 280
};

// Sub-region share within United States (must sum to ~1.0)
const countryShares = {
  "United States": {
    "Northeast": 0.22,
    "Midwest": 0.20,
    "South": 0.35,
    "Southwest": 0.12,
    "West": 0.11
  }
};

// Growth rates (CAGR) per geography
const regionGrowthRates = {
  "United States": 0.075
};

// Segment-specific growth multipliers (relative to base CAGR)
const segmentGrowthMultipliers = {
  "By Prescription Type": {
    "Prescription (Rx)": 0.92,
    "Over-the-Counter (OTC)": 1.10
  },
  "By Indication": {
    "Allergic Rhinitis": 1.05,
    "Non-Allergic Rhinitis": 0.98,
    "Chronic Rhinosinusitis / Sinusitis": 1.08,
    "Nasal Congestion (Cold / Flu)": 0.95,
    "Infection Prevention / Antiviral Protection": 1.25,
    "Other Indications (Pre/Post-Operative Nasal Antisepsis, among others)": 1.12
  },
  "By Distribution Channel": {
    "Retail Pharmacies": 0.90,
    "Hospital Pharmacies": 1.02,
    "Online Pharmacies": 1.35,
    "Supermarkets & Hypermarkets": 0.85
  },
  "By End User": {
    "Hospitals": 1.00,
    "Ambulatory Surgical Centers": 1.12,
    "ENT Clinics": 1.08,
    "Others (Long-term Care Facilities, Homecare Settings, among others)": 1.05
  }
};

// Volume multiplier: units per USD Million (rough: ~2000 units per $1M for nasal spray products)
const volumePerMillionUSD = 2000;

// Seeded pseudo-random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseValue * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;

  for (const [regionName, subRegions] of Object.entries(regions)) {
    const regionBase = regionBaseValues[regionName] * multiplier;
    const regionGrowth = regionGrowthRates[regionName];

    // Top-level geography data (United States)
    data[regionName] = {};
    for (const [segType, segments] of Object.entries(segmentTypes)) {
      data[regionName][segType] = {};
      for (const [segName, share] of Object.entries(segments)) {
        const segGrowth = regionGrowth * segmentGrowthMultipliers[segType][segName];
        const segBase = regionBase * share;
        data[regionName][segType][segName] = generateTimeSeries(segBase, segGrowth, roundFn);
      }
    }

    // Add "By Region" for United States showing sub-regions
    data[regionName]["By Region"] = {};
    for (const subRegion of subRegions) {
      const sShare = countryShares[regionName][subRegion];
      const subRegionGrowthVariation = 1 + (seededRandom() - 0.5) * 0.06;
      const subRegionBase = regionBase * sShare;
      const subRegionGrowth = regionGrowth * subRegionGrowthVariation;
      data[regionName]["By Region"][subRegion] = generateTimeSeries(subRegionBase, subRegionGrowth, roundFn);
    }

    // Sub-region level data
    for (const subRegion of subRegions) {
      const sShare = countryShares[regionName][subRegion];
      const subRegionBase = regionBase * sShare;
      const subRegionGrowthVariation = 1 + (seededRandom() - 0.5) * 0.04;
      const subRegionGrowth = regionGrowth * subRegionGrowthVariation;

      data[subRegion] = {};
      for (const [segType, segments] of Object.entries(segmentTypes)) {
        data[subRegion][segType] = {};
        for (const [segName, share] of Object.entries(segments)) {
          const segGrowth = subRegionGrowth * segmentGrowthMultipliers[segType][segName];
          const segBase = subRegionBase * share;
          const shareVariation = 1 + (seededRandom() - 0.5) * 0.1;
          data[subRegion][segType][segName] = generateTimeSeries(segBase * shareVariation, segGrowth, roundFn);
        }
      }
    }
  }

  return data;
}

// Generate both datasets
seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);

// Write files
const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));

console.log('Generated value.json and volume.json successfully');
console.log('Value geographies:', Object.keys(valueData).length);
console.log('Volume geographies:', Object.keys(volumeData).length);
console.log('Segment types:', Object.keys(valueData['United States']));
console.log('Sample - United States, By Prescription Type:', JSON.stringify(valueData['United States']['By Prescription Type'], null, 2));
