import type { PricingPage as PricingPagePayload } from '../../payload-types';

export type PricingPageData = PricingPagePayload;
export type PricingType = 'hourly' | 'perAcre' | 'dayRate' | 'programme';

export type PricingModel = NonNullable<PricingPagePayload['pricingModels']>[number];
export type ServiceRow = NonNullable<PricingPagePayload['serviceRows']>[number];
export type Factor = NonNullable<PricingPagePayload['factors']>[number];
export type ProcessStep = NonNullable<PricingPagePayload['processSteps']>[number];
