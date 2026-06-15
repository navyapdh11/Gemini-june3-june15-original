import { describe, it, expect } from 'vitest';
import { calculateQuote } from '../src/utils/PricingCalculator';

describe('PricingCalculator', () => {
  it('calculates hourly rate for regular cleaning with min fee', () => {
    // 1 hour at $45 should be bumped to minFee $106, + $15 travel = $121
    const quote = calculateQuote('regular-cleaning', { hours: 1 });
    expect(quote).toBe(121);
  });

  it('calculates hourly rate for regular cleaning above min fee', () => {
    // 3 hours at $45 = $135, + $15 travel = $150
    const quote = calculateQuote('regular-cleaning', { hours: 3 });
    expect(quote).toBe(150);
  });

  it('calculates fixed rate for end-of-lease cleaning', () => {
    // 2br is $320, + $15 travel = $335
    const quote = calculateQuote('end-of-lease', { propertyType: '2br' });
    expect(quote).toBe(335);
  });

  it('calculates per-item rate for carpet cleaning', () => {
    // 2 bedrooms ($35 each) + 1 living room ($50) = $70 + $50 = $120, + $15 travel = $135
    const quote = calculateQuote('carpet-cleaning', { bedroom: 2, livingRoom: 1 });
    expect(quote).toBe(135);
  });

  it('calculates sqm rate for pressure cleaning', () => {
    // 60 sqm. Tier "100" is $5.5. 60 * 5.5 = $330, + $15 travel = $345
    const quote = calculateQuote('pressure-cleaning', { sqm: 60 });
    expect(quote).toBe(345);
  });

  it('applies regional postcode multipliers (WA/Perth 6000)', () => {
    // 2br end-of-lease is $320. 
    // Postcode 6000 has 1.25 multiplier.
    // Base: 320. Multiplied: 320 * 1.25 = 400.
    // Final: 400 + 15 = 415.
    const quote = calculateQuote('end-of-lease', { propertyType: '2br', postcode: '6000' });
    expect(quote).toBe(415);
  });

  it('applies SLA multipliers (HACCP)', () => {
    // 3 hours regular cleaning = $135.
    // Gold-HACCP: 1.25 multiplier + $50 gap fee.
    // Base: 135. SLA Multiplied: 135 * 1.25 = 168.75. 
    // Add gap fee: 168.75 + 50 = 218.75.
    // Final: 218.75 + 15 = 233.75 -> round to 234.
    const quote = calculateQuote('regular-cleaning', { hours: 3, slaTier: 'gold-haccp' });
    expect(quote).toBe(234);
  });

  it('applies promo codes (SAVE20)', () => {
    // 3 hours regular cleaning = $135, + $15 travel = $150.
    // SAVE20: 150 * 0.8 = 120.
    const quote = calculateQuote('regular-cleaning', { hours: 3, appliedPromo: 'SAVE20' });
    expect(quote).toBe(120);
  });

  it('calculates asset breakout costs for commercial assets', () => {
    // 1 hour regular cleaning = $106 (min fee).
    // 1 meeting room ($45) + 6 working desks (1 desk * $5 = $5).
    // Total assets: 45 + 5 = 50.
    // Base + Assets: 106 + 50 = 156.
    // Final: 156 + 15 = 171.
    const quote = calculateQuote('regular-cleaning', { hours: 1, meetingRooms: 1, workingDesks: 6 });
    expect(quote).toBe(171);
  });
});
