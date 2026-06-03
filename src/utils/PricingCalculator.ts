import { SERVICE_METADATA } from '../config/ServiceCatalog';

export const calculateQuote = (serviceId: string, inputData: any): number => {
  const service = SERVICE_METADATA[serviceId];
  if (!service) return 0;

  let basePrice = 0;

  switch (service.model) {
    case 'hourly': {
      const hours = Number(inputData?.hours || 0);
      basePrice = Math.max(hours * (service.basePrice || 45), service.minFee || 106);
      break;
    }

    case 'fixed': {
      const propertyType = inputData?.propertyType || '1br';
      basePrice = service.pricing?.[propertyType] || 0;
      break;
    }

    case 'per_room':
    case 'per_item': {
      // e.g. inputData = { bedroom: 2, livingRoom: 1 } or { armchair: 1, sofaSeat: 2 }
      basePrice = Object.entries(inputData || {}).reduce((total, [item, count]) => {
        if (item === 'addons') return total;
        const pricePerUnit = service.pricing?.[item] || 0;
        return total + (pricePerUnit * Number(count || 0));
      }, 0);
      break;
    }

    case 'sqm': {
      const area = Number(inputData?.sqm || 0);
      let rate = 5;
      if (service.priceTiers) {
        if (area <= 50) {
          rate = service.priceTiers["50"] || 6;
        } else if (area <= 100) {
          rate = service.priceTiers["100"] || 5.5;
        } else {
          rate = service.priceTiers["999"] || 5;
        }
      }
      basePrice = area * rate;
      break;
    }

    case 'quote_based':
    default:
      basePrice = 0; // Specialized requires manual assessment
      break;
  }

  // Handle Addon pricing
  const addonsSelected = inputData?.addons || [];
  const addonTotal = addonsSelected.reduce((sum: number, addon: string) => {
    return sum + (service.addonPrices?.[addon] || 0);
  }, 0);

  return basePrice + addonTotal;
};
